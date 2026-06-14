#!/usr/bin/env python3
"""DocumentationAgent — autonomer Doku-Agent (Kurs-Einheit 9, Orchestrierung).

Ablauf nach Vorlesungsvorlage:  git diff  ->  LLM  ->  Markdown,
autonom in die Projektdoku (logs/actions.md) geschrieben.

Bereitgestellt als Flask-Microservice via JSON-RPC 2.0:
    http://localhost:8010/jsonrpc  ->  DocumentationAgent

Autonomie: Der Agent wählt selbst Range (letzter Commit), Format und Zieldatei
und schreibt den Eintrag eigenständig (write=true). Der Aufrufer muss nichts
nachbearbeiten. Guardrails: schreibt nur innerhalb des Repos, nur anhängend
(kein Überschreiben), nie ohne erkannte Änderung.
"""
import os
import sys
import subprocess
import datetime
from pathlib import Path

from flask import Flask, request, jsonify

import llm


def load_env():
    """Lädt doc-agent/.env (ohne Zusatz-Dependency), falls vorhanden."""
    env_path = Path(__file__).resolve().parent / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip())


def log(msg):
    """Fortschritts-Feedback nach stderr (stört JSON-RPC/stdout nicht)."""
    print(msg, file=sys.stderr, flush=True)


load_env()
app = Flask(__name__)
PORT = int(os.environ.get("DOC_AGENT_PORT", "8010"))

SYSTEM_PROMPT = (
    "Du bist der DocumentationAgent von FormAssist. Du hältst die deutschsprachige "
    "Projektdoku synchron mit dem Code. Du erfindest nichts, sondern beschreibst nur, "
    "was der Diff tatsächlich zeigt. Antworte ausschließlich mit dem Markdown-Eintrag, "
    "ohne einleitenden oder abschließenden Kommentar."
)

ENTRY_TEMPLATE = """Erzeuge einen Eintrag für logs/actions.md in GENAU diesem Format \
(deutsch, knapp, kein Detailspam):

## [{date}] <kurzer, prägnanter Titel>

**Ziel:**
<ein Satz>

**Aktionen:**

1. ...
2. ...

**Ergebnis:**

- ...

Hier der git diff ({range}):

{diff}
"""


def repo_root():
    out = subprocess.run(
        ["git", "rev-parse", "--show-toplevel"],
        capture_output=True, text=True,
        cwd=Path(__file__).resolve().parent,
    )
    if out.returncode != 0:
        raise RuntimeError("Kein Git-Repository gefunden.")
    return Path(out.stdout.strip())


def get_diff(range_spec, root):
    out = subprocess.run(
        ["git", "diff", range_spec],
        capture_output=True, text=True, cwd=root,
    )
    if out.returncode != 0:
        raise RuntimeError(f"git diff fehlgeschlagen: {out.stderr.strip()}")
    return out.stdout


def safe_target(target, root):
    """Stellt sicher, dass autonomes Schreiben das Repo nicht verlässt."""
    p = (root / target).resolve()
    if p != root and root not in p.parents:
        raise ValueError("Zielpfad liegt außerhalb des Repositorys.")
    return p


def document_changes(params):
    range_spec = params.get("range", "HEAD~1..HEAD")
    target = params.get("target", "logs/actions.md")
    write = params.get("write", True)

    root = repo_root()
    log(f">> DocumentationAgent: dokumentiere Aenderungen ({range_spec})")
    diff = get_diff(range_spec, root)
    if not diff.strip():
        log(" - Keine Aenderungen im Bereich gefunden - nichts zu tun.")
        return {"written": None, "content": "",
                "note": f"Keine Änderungen im Bereich {range_spec}."}

    files = diff.count("diff --git ")
    log(f" - Diff gelesen: {files} Datei(en), {len(diff)} Zeichen")

    date = datetime.date.today().isoformat()
    prompt = ENTRY_TEMPLATE.format(date=date, range=range_spec, diff=diff[:14000])
    log(" - Frage LLM um eine Doku-Zusammenfassung ...")
    entry = llm.chat(prompt, system=SYSTEM_PROMPT, max_tokens=900).strip()
    log(f" - Antwort erhalten: {len(entry)} Zeichen")

    written = None
    if write:
        path = safe_target(target, root)
        with open(path, "a", encoding="utf-8") as f:
            f.write("\n\n---\n\n" + entry + "\n")
        written = str(path.relative_to(root)).replace("\\", "/")
        log(f"OK: Eintrag angehaengt an {written}")
    else:
        log(" - Vorschau-Modus: nichts geschrieben (write=false)")

    return {"written": written, "content": entry, "range": range_spec}


def agent_card(params):
    """Selbstbeschreibung (A2A-Agent-Card-Idee aus der Vorlesung)."""
    return {
        "name": "DocumentationAgent",
        "role": "Dokumentation",
        "description": "Autonomer Agent: git diff -> LLM -> Markdown, schreibt die Projektdoku selbst.",
        "methods": list(METHODS.keys()),
        "tools": ["git"],
        "transport": "JSON-RPC 2.0 over HTTP",
        "version": "1.0",
    }


METHODS = {
    "document_changes": document_changes,
    "agent_card": agent_card,
}


@app.post("/jsonrpc")
def jsonrpc():
    req = request.get_json(force=True, silent=True) or {}
    rid = req.get("id")
    method = req.get("method")
    params = req.get("params") or {}
    if method not in METHODS:
        return jsonify({"jsonrpc": "2.0", "id": rid,
                        "error": {"code": -32601, "message": f"Unbekannte Methode: {method}"}})
    try:
        result = METHODS[method](params)
        return jsonify({"jsonrpc": "2.0", "id": rid, "result": result})
    except Exception as e:  # noqa: BLE001 — Fehler als JSON-RPC-Error zurückgeben
        return jsonify({"jsonrpc": "2.0", "id": rid,
                        "error": {"code": -32000, "message": str(e)}})


@app.get("/health")
def health():
    return jsonify({"status": "ok", "agent": "DocumentationAgent"})


def _run_once(argv):
    """Autonomer Einzellauf (ohne Server): dokumentiert den letzten Commit selbst.

    --preview / --no-write: nur erzeugen und anzeigen, nichts schreiben.
    """
    i = argv.index("--once")
    rng = "HEAD~1..HEAD"
    if len(argv) > i + 1 and not argv[i + 1].startswith("-"):
        rng = argv[i + 1]
    write = "--preview" not in argv and "--no-write" not in argv

    res = document_changes({"range": rng, "write": write})
    if res.get("written"):
        print(f"\nOK: Eintrag autonom geschrieben nach {res['written']}")
    elif res.get("content"):
        print("\n(Vorschau - nichts geschrieben)")
    else:
        print("\n" + res.get("note", "Nichts zu dokumentieren."))
    if res.get("content"):
        print("\n--- Inhalt ---\n" + res["content"])


if __name__ == "__main__":
    if "--once" in sys.argv:
        _run_once(sys.argv)
    else:
        print(f"DocumentationAgent läuft auf http://localhost:{PORT}/jsonrpc")
        app.run(host="127.0.0.1", port=PORT)

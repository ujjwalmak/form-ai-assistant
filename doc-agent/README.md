# DocumentationAgent

Autonomer Dokumentations-Agent für FormAssist (Kurs-Einheit 9 — Orchestrierung von Agenten).

Setzt die Vorlesungsvorlage um: **`git diff → LLM → Markdown`**, bereitgestellt als
Flask-Microservice via JSON-RPC 2.0 (`http://localhost:8010/jsonrpc → DocumentationAgent`).
Der Agent ist bewusst getrennt von der Chrome-Extension — er fasst den Extension-Code
nicht an, sondern ist ein Entwickler-Werkzeug, das die Projektdoku synchron hält.

## Was „autonom" hier heißt

Der Agent wählt selbst den Diff-Bereich (letzter Commit), erzeugt einen Eintrag im
Format von `logs/actions.md` und **schreibt ihn eigenständig** in die Datei. Es ist kein
manuelles Copy-Paste nötig.

**Guardrails:** schreibt nur innerhalb des Repos, nur anhängend (kein Überschreiben),
nie ohne erkannte Änderung. Provider wie in der Extension: Groq primär, OpenRouter Fallback.

## Einrichtung

```bash
cd doc-agent
python -m pip install -r requirements.txt
cp .env.example .env          # dann GROQ_API_KEY (oder OPENROUTER_API_KEY) eintragen
```

Der Key wird aus `doc-agent/.env` bzw. der Umgebung gelesen — niemals aus dem Code,
`.env` ist gitignored.

## Nutzung

### A) Autonomer Einzellauf (ohne Server, ideal für Demo)

```bash
python agent.py --once              # dokumentiert den letzten Commit (HEAD~1..HEAD)
python agent.py --once HEAD~3..HEAD # eigener Bereich
```

→ Schreibt den erzeugten Eintrag an `logs/actions.md` und gibt ihn auch aus.

### B) Als Microservice (Vorlesungsvorlage)

```bash
python agent.py                     # lauscht auf http://localhost:8010/jsonrpc
```

```bash
# Änderungen autonom dokumentieren lassen:
curl -X POST http://localhost:8010/jsonrpc \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"document_changes","params":{"range":"HEAD~1..HEAD"}}'

# Nur erzeugen, NICHT schreiben (Vorschau):
#   "params":{"range":"HEAD~1..HEAD","write":false}

# Selbstbeschreibung des Agenten (A2A Agent Card):
curl -X POST http://localhost:8010/jsonrpc \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"agent_card","params":{}}'
```

### C) Automatisch bei jedem Commit (Git-Hook)

Damit sich das Projekt selbst dokumentiert: ein `post-commit`-Hook ruft nach jedem
`git commit` den **laufenden** Server an, der den Commit autonom in `logs/actions.md` schreibt.

**Einrichtung** (aus dem Repo-Wurzelverzeichnis, einmalig):

```bash
cp doc-agent/post-commit .git/hooks/post-commit
chmod +x .git/hooks/post-commit
```

> `.git/hooks/` ist nicht versioniert — deshalb liegt die nachvollziehbare Vorlage als
> `doc-agent/post-commit` im Repo. Nach einem Clone den Copy-Schritt erneut ausführen.

**Täglicher Ablauf:**

1. Server **einmal** starten (Terminal offen lassen) — z. B. über den VS-Code-Run-Button
   „Doc-Agent: Server" (`.vscode/launch.json`).
2. Normal arbeiten und `git commit` — der Hook meldet `[doc-agent] Commit dokumentiert -> logs/actions.md`.
3. Den so entstandenen `logs/actions.md`-Eintrag beim **nächsten** Commit mitnehmen.

Läuft der Server nicht, wird die Doku übersprungen — der Commit selbst gelingt trotzdem.

### VS-Code-Run-Buttons (`.vscode/launch.json`)

| Konfiguration | Wirkung |
|---|---|
| Doc-Agent: Vorschau (testen, schreibt nichts) | Einzellauf mit `--preview` — zeigt Feedback + Ergebnis, schreibt nichts |
| Doc-Agent: Einzellauf | dokumentiert den letzten Commit autonom |
| Doc-Agent: Server | startet den Microservice auf `:8010` |

## JSON-RPC-Methoden

| Methode | Parameter | Wirkung |
|---|---|---|
| `document_changes` | `range` (Default `HEAD~1..HEAD`), `target` (Default `logs/actions.md`), `write` (Default `true`) | Diff → LLM → Markdown, autonom angehängt |
| `agent_card` | — | Name, Rolle, Methoden, Tools, Transport |

Zusätzlich: `GET /health` für einen einfachen Status-Check.

## Architektur-Einordnung (Vorlesung)

- **Tool-Layer:** `git` (liest Code-Historie/Änderungen)
- **LLM-Layer:** Groq / OpenRouter (erzeugt/vereinfacht Doku)
- **Rolle:** `Dokumentation` aus dem Agenten-Lineup (Orchestrator · Planning · Coding · Testing · **Documentation**)

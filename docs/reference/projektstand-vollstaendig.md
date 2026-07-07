# Projektstand — FormAssist

**Fallstudie:** KI-Assistent zur korrekten Eingabe von Daten in komplexe Browser-Formulare
**Modul:** AI-Prototyping, SS2026 — Prof. Dr. Sebastian Dünnebeil (FK07)
**Repository:** github.com/ujjwalmak/form-ai-assistant · **Stand:** 2026-07-05

---

## Auf einen Blick

**Vision:** Ein KI-Agent als Browser-Extension, der jedes Online-Formular **scannt, ausliest,
in einfacher Sprache erklärt und live ausfüllt** — gespeist aus einem persönlichen Profil und
im Dialog, damit auch komplexe Behörden- und Anmeldeformulare fehlerfrei ausgefüllt werden.

| Kennzahl | Stand |
| --- | --- |
| **Pflicht-Einheiten erfüllt** | Alle behandelten erfüllt (E2–E11; E5 erlassen) — keine offene Pflicht; E11 ohne neuen Pflichtpunkt |
| **Größte offene Punkte** | Prototyp-Demo 09.07. (Reflexion 02.07. gehalten) |
| **Nächster Meilenstein** | Prototyp-Demo 09.07.2026 |
| **Deployment** | Mit Prof abgestimmt entfallen (Chrome-Extension-Case) |
| **Neu (05.–07.07., v2.1)** | Dokument-Scan (Vision-OCR), Live-Validierung beim Tippen (IBAN mod-97 u. a.), Pre-Submit-Logik-Check + Robustheits-Paket (Shadow-DOM/iFrame-Labels, Fehl-Match-Schutz, Select-Priorität) + Custom-Widget-Support (ARIA-Combobox/React-Select, contenteditable) + Rückfragen nur bei Pflichtfeldern — 133 Unit-Tests grün |

---

## Status nach Kurseinheiten

**Legende:** ✅ Erfüllt · 🟡 Teilweise · ⬜ Offen · ➖ Entfällt · ⏳ Noch nicht behandelt
*Diese Übersicht listet nur Pflichtanforderungen (Folien-Checkliste „Wo Sie stehen sollten"). Optionale Kür steht in „Nächste Maßnahmen" / „Roadmap".*

**Schnellüberblick:** E2 ✅ · E3 ✅ · E4 ✅ · E5 ➖ · E6 ✅ · E7 ✅ · E8 ✅ · E9 ✅ · E10 ✅ · E11 ✅

### Einheit 2 — Vibe Coding (09.04.2026)

| Anforderung | Status | Beleg / Anmerkung |
| --- | :-: | --- |
| Erstes Repository mit Vibe Coding erstellt | ✅ | — |
| Projektspezifische Regeldateien / Personas | ✅ | Root-`CLAUDE.md` (Regeln fürs Extension-Repo) + `test-site/CLAUDE.md`/`AGENTS.md` (nur Testseite) + wiederverwendbare Persona-Prompts in `personas/` (Architekt, Agent/Prompt, UX, QA, Doku) |

### Einheit 3 — Agentic Coding (16.04.2026)

| Anforderung | Status | Beleg / Anmerkung |
| --- | :-: | --- |
| Generelle Architektur (mit KI) fixiert | ✅ | Chrome MV3 Extension, `README.md`, `memory/long_term.md` |
| GitHub-Repository angelegt | ✅ | github.com/ujjwalmak/form-ai-assistant |
| Agent genutzt, um Features hinzuzufügen | ✅ | Agentic Chat, Field-by-Field, Selbstkorrektur |
| Minimale Version lokal testbar | ✅ | Extension + eigene Test-Website (`test-site/`) |

### Einheit 4 — Datenbanken und RAG (23.04.2026)

| Anforderung | Status | Beleg / Anmerkung |
| --- | :-: | --- |
| Struktur zum Nachvollziehen der Agent-Aktionen | ✅ | `memory/short_term.md`, `long_term.md`, `decisions.md`, `known_issues.md`, `logs/actions.md` |
| Daten persistent in einer Datenbank gespeichert | ✅ | Supabase (`fa-supabase.js`, `supabase_tables.sql`) |

### Einheit 5 — Deployment und CI/CD (30.04.2026)

| Anforderung | Status | Beleg / Anmerkung |
| --- | :-: | --- |
| Prototyp über eine Plattform bereitgestellt | ➖ | Mit Prof abgestimmt: für den Chrome-Extension-Case nicht erforderlich. In der Reflektion als bewusste Architektur-Entscheidung darstellen. Supabase deckt den Managed-Plattform-Aspekt teilweise ab. |

### Einheit 6 — LLM-APIs (07.05.2026)

| Anforderung | Status | Beleg / Anmerkung |
| --- | :-: | --- |
| LLM über eine API eingebunden | ✅ | Groq (primär) + OpenRouter (Backup) mit automatischem Fallback, `background.js` |

### Einheit 7 — Zwischenpräsentation (21.05.2026)

| Anforderung | Status | Beleg / Anmerkung |
| --- | :-: | --- |
| Zwischenpräsentation gehalten | ✅ | gehalten 21.05.; Foliensatz lokal in `vorlesung/` (nicht im Repo) |

### Einheit 8 — Testen und Debuggen mit KI (28.05.2026)

| Anforderung | Status | Beleg / Anmerkung |
| --- | :-: | --- |
| Relevante Tests identifiziert | ✅ | [`testing-plan.md`](testing-plan.md) |
| Tests in die Entwicklung eingebunden | ✅ | Vitest-Suite `tests/unit/` (`fa-utils`, `fa-profile`, `fa-scanner`, `fa-fill`, `background`), **133 Tests grün**, Branch-Coverage ~77 % der Logik-Module (`npm run coverage`) + GitHub-Actions-Workflow (`.github/workflows/test.yml`, Regression bei jedem Push) |

### Einheit 9 — Orchestrierung von Agenten (11.06.2026)

| Anforderung | Status | Beleg / Anmerkung |
| --- | :-: | --- |
| Eigener Agent für die Dokumentation bereitgestellt | ✅ | `doc-agent/` — autonomer `DocumentationAgent` (git diff → LLM → Markdown, schreibt `logs/actions.md` selbst), Flask-Microservice via JSON-RPC (`localhost:8010/jsonrpc`) nach Vorlesungsvorlage; Provider Groq/OpenRouter wie die Extension. Orchestrierung: `post-commit`-Git-Hook ruft den Service nach jedem Commit (Vorlage `doc-agent/post-commit`), VS-Code-Run-Buttons in `.vscode/launch.json` |

### Einheit 10 — Stakeholder Interaktion (18.06.2026)

| Anforderung | Status | Beleg / Anmerkung |
| --- | :-: | --- |
| Projektwebseite für Stakeholder erstellt | ✅ | `docs/` + `mkdocs.yml` (MkDocs Material), Struktur entlang Prof / Nutzer / Arbeitgeber inkl. Kompetenz-Seite + Mermaid-Architekturdiagramm; im Repo, baut strict. Auto-Deploy via `.github/workflows/docs.yml`. **Live** unter [ujjwalmak.github.io/form-ai-assistant](https://ujjwalmak.github.io/form-ai-assistant/) (deckt zugleich den Deployment-Aspekt E5 ab). |

### Einheit 11 — Model Context Protocol / MCP (25.06.2026)

| Anforderung | Status | Beleg / Anmerkung |
| --- | :-: | --- |
| — | ✅ | Behandelt (25.06.). MCP als **Konzept** gelehrt (Host/Client/Server, stdio/SSE, Tools/Resources/Prompts) — die „Meilensteiner der Prototypen" auf der Folie sind unverändert, **kein neuer Pflichtpunkt** für den Prototyp. Optional in Roadmap: MCP-Server für `doc-agent`. |

---

## Nächste Maßnahmen

**Zeithorizont:** Prototyp-Demo 09.07.2026 (Reflexions-Präsentation 02.07. gehalten)
**Legende:** Priorität 🔴 Hoch · 🟡 Optional   |   Aufwand 🟢 Niedrig · 🟡 Mittel · 🔴 Hoch

| # | Maßnahme | Einheit | Prio | Aufwand |
| :-: | --- | :-: | :-: | :-: |
| 1 | Prototyp-Demo (09.07.) — 10–15 Min Live-Demo, Repo bereitstellen, Präsentation auf Moodle hochladen; v2.1-Features gezielt zeigen | 13 | 🔴 | 🟡 |
| 2 | Demo-Skript/Beispielseiten für Dokument-Scan, Live-Validierung und Robustheitsfälle vorbereiten | 13 | 🔴 | 🟢 |
| 3 | Webseite live ✅ ([ujjwalmak.github.io/form-ai-assistant](https://ujjwalmak.github.io/form-ai-assistant/)) — optional noch Screenshots ergänzen | 10 | 🟡 | 🟢 |
| 4 | Unit-Tests für `fa-supabase` ergänzen (chrome-Mocks, [`testing-plan.md`](testing-plan.md) Phase 4) — einziges Logik-Modul noch ohne Tests | 8 | 🟡 | 🟡 |
| 5 | Form-Field-Tipps aus `form_fields` aktiv schalten — kuratierte Hinweise als Badge (keyed Lookup, Daten in Supabase vorhanden) | 4 | 🟡 | 🟢 |

> **Hinweis Abschluss:** Die Reflexion am 02.07. ist gehalten. Offen ist noch die Prototyp-Demo
> am 09.07. (Team-Zuordnung/Upload ggf. im Moodle prüfen).

---

## Roadmap / Backlog (Ausbauideen)

Funktionale Ideen über den aktuellen Stand hinaus. Bereits umgesetzte Features (Auto-Fill,
Guided Mode, Profil-Memory, Dark Mode, Submit-Review, Tastenkürzel, Datums-Intelligenz (DE/EN),
Formular-Erklärung) stehen in der Statusübersicht / `README.md`.

**Umgesetzt am 05.07.2026 (v2.1, ehemals Backlog):** ✅ **Dokument-/Foto-Upload (Vision-OCR)**
(Llama 4 Scout via Groq/OpenRouter, Bestätigungsschritt + Review vor dem Speichern) ·
✅ **Live-Validierung beim Tippen** (deterministisch: IBAN mod-97, BIC, E-Mail, PLZ, Telefon,
Geburtsdatum — bewusst ohne KI-Call, siehe `memory/decisions.md`) · ✅ **Erweiterte
Pre-Submit-Logikprüfung** (Widersprüche zwischen Feldern; lokale Prüfergebnisse als Fakten im
Review-Prompt). Details in `README.md`.

**Legende:** Nutzen 🟢 Hoch · 🟡 Mittel · ⚪ Niedrig   |   Aufwand 🟢 Niedrig · 🟡 Mittel · 🔴 Hoch

| Idee | Beschreibung | Nutzen | Aufwand |
| --- | --- | :-: | :-: |
| **Sprachsteuerung (Voice Input)** | Felder per Mikrofon befüllen (Web Speech API) → LLM mappt auf Felder. Bewusst nicht für die Live-Demo umgesetzt (Mikrofon-Berechtigungen sind demo-riskant). | 🟡 | 🟡 |
| **Echtes RAG über persönliche Dokumente** | CV, Mietvertrag etc. chunked + embedded (pgvector); pro Feld semantische Suche. Das einzige der drei „RAG"-Themen, das wirklich Retrieval ist (`form_fields`-Tipps sind nur ein keyed Lookup, siehe Maßnahme 4). | 🟢 | 🔴 |
| **Supabase Auth (OAuth)** | Geräte-UUID durch echte Accounts ersetzen → geräteübergreifend, RLS pro Nutzer. | 🟡 | 🟡 |
| **Production-Packaging** | Backend-Proxy für Keys, Consent-Flow, Chrome-Web-Store, Firefox-Port. | 🟡 | 🔴 |
| **Team-/Enterprise-Modus** | Geteilte Antwort-Templates via Multi-Tenancy; setzt OAuth voraus. | ⚪ | 🔴 |
| **„Fake Filler"** | Auf Test-/Wegwerf-Seiten plausible Dummy-Daten statt echter Profildaten. | ⚪ | 🟢 |
| **MCP-Server für `doc-agent`** | Den Doku-Agenten zusätzlich als MCP-Server (stdio) anbieten, `document_changes` als MCP-Tool für Claude/Codex CLI — verbindet E9 (Doku-Agent) + E11 (MCP), starker Aufhänger für die 09.07.-Demo. | 🟡 | 🟡 |

# Projektstand — FormAssist

**Fallstudie:** KI-Assistent zur korrekten Eingabe von Daten in komplexe Browser-Formulare
**Modul:** AI-Prototyping, SS2026 — Prof. Dr. Sebastian Dünnebeil (FK07)
**Repository:** github.com/ujjwalmak/form-ai-assistant · **Stand:** 2026-06-14

---

## Auf einen Blick

**Vision:** Ein KI-Agent als Browser-Extension, der jedes Online-Formular **scannt, ausliest,
in einfacher Sprache erklärt und live ausfüllt** — gespeist aus einem persönlichen Profil und
im Dialog, damit auch komplexe Behörden- und Anmeldeformulare fehlerfrei ausgefüllt werden.

| Kennzahl | Stand |
| --- | --- |
| **Pflicht-Einheiten erfüllt** | Alle behandelten erfüllt (E2–E9; E5 entfällt abgestimmt) — keine offene Pflicht |
| **Größte offene Punkte** | Abschlusspräsentation; E10/E11 noch nicht behandelt |
| **Nächster Meilenstein** | Abschlusspräsentation 02. / 09.07.2026 |
| **Deployment** | Mit Prof abgestimmt entfallen (Chrome-Extension-Case) |

---

## Status nach Kurseinheiten

**Legende:** ✅ Erfüllt · 🟡 Teilweise · ⬜ Offen · ➖ Entfällt · ⏳ Noch nicht behandelt
*Diese Übersicht listet nur Pflichtanforderungen (Folien-Checkliste „Wo Sie stehen sollten"). Optionale Kür steht in „Nächste Maßnahmen" / „Roadmap".*

**Schnellüberblick:** E2 ✅ · E3 ✅ · E4 ✅ · E5 ➖ · E6 ✅ · E7 ✅ · E8 ✅ · E9 ✅ · E10 ⏳ · E11 ⏳

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
| Relevante Tests identifiziert | ✅ | `TESTING_PLAN.md` |
| Tests in die Entwicklung eingebunden | ✅ | Vitest-Suite `tests/unit/` (`fa-utils`, `fa-profile`, `fa-scanner`, `fa-fill`, `background`), **69 Tests grün**, Branch-Coverage ~77 % der Logik-Module (`npm run coverage`) + GitHub-Actions-Workflow (`.github/workflows/test.yml`, Regression bei jedem Push) |

### Einheit 9 — Orchestrierung von Agenten (11.06.2026)

| Anforderung | Status | Beleg / Anmerkung |
| --- | :-: | --- |
| Eigener Agent für die Dokumentation bereitgestellt | ✅ | `doc-agent/` — autonomer `DocumentationAgent` (git diff → LLM → Markdown, schreibt `logs/actions.md` selbst), Flask-Microservice via JSON-RPC (`localhost:8010/jsonrpc`) nach Vorlesungsvorlage; Provider Groq/OpenRouter wie die Extension. Orchestrierung: `post-commit`-Git-Hook ruft den Service nach jedem Commit (Vorlage `doc-agent/post-commit`), VS-Code-Run-Buttons in `.vscode/launch.json` |

### Einheit 10 — Stakeholder Interaktion (18.06.2026)

| Anforderung | Status | Beleg / Anmerkung |
| --- | :-: | --- |
| — | ⏳ | Einheit noch nicht behandelt |

### Einheit 11 — Model Context Protocol / MCP (25.06.2026)

| Anforderung | Status | Beleg / Anmerkung |
| --- | :-: | --- |
| — | ⏳ | Einheit noch nicht behandelt |

---

## Nächste Maßnahmen

**Zeithorizont:** Abschlusspräsentation am 02. / 09.07.2026
**Legende:** Priorität 🔴 Hoch · 🟡 Optional   |   Aufwand 🟢 Niedrig · 🟡 Mittel · 🔴 Hoch

| # | Maßnahme | Einheit | Prio | Aufwand |
| :-: | --- | :-: | :-: | :-: |
| 1 | Abschlusspräsentation vorbereiten — inkl. Deployment-Begründung & Reflektion | 12 / 13 | 🔴 | 🟡 |
| 2 | Unit-Tests für `fa-supabase` ergänzen (chrome-Mocks, `TESTING_PLAN.md` Phase 4) — einziges Logik-Modul noch ohne Tests | 8 | 🟡 | 🟡 |
| 3 | Form-Field-Tipps aus `form_fields` aktiv schalten — kuratierte Hinweise als Badge (keyed Lookup, Daten in Supabase vorhanden) | 4 | 🟡 | 🟢 |

> **Noch nicht behandelt:** Einheit 10 (Stakeholder-Interaktion, 18.06.) und Einheit 11 (MCP, 25.06.)
> bringen ggf. neue Pflicht-Anforderungen — folgen erst nach den jeweiligen Vorlesungen.

---

## Roadmap / Backlog (Ausbauideen)

Funktionale Ideen über den aktuellen Stand hinaus. Bereits umgesetzte Features (Auto-Fill,
Guided Mode, Profil-Memory, Dark Mode, Submit-Review, Tastenkürzel, Datums-Intelligenz (DE/EN),
Formular-Erklärung) stehen in der Statusübersicht / `README.md`.

**Legende:** Nutzen 🟢 Hoch · 🟡 Mittel · ⚪ Niedrig   |   Aufwand 🟢 Niedrig · 🟡 Mittel · 🔴 Hoch

| Idee | Beschreibung | Nutzen | Aufwand |
| --- | --- | :-: | :-: |
| **Dokument-/Foto-Upload (Vision-OCR)** | Ausweis o. Ä. als Bild hochladen → Vision-LLM liest Daten und füllt Profil/Formular. | 🟢 | 🟡 |
| **Live-KI-Validierung beim Tippen** | Eingaben in Echtzeit prüfen (PLZ, Datum, IBAN-Prüfsumme). | 🟢 | 🟡 |
| **Erweiterte Pre-Submit-Logikprüfung** | Vor dem Absenden auf logische Widersprüche prüfen (baut auf Submit-Review auf). | 🟡 | 🟢 |
| **Sprachsteuerung (Voice Input)** | Felder per Mikrofon befüllen (Web Speech API) → LLM mappt auf Felder. | 🟡 | 🟡 |
| **Echtes RAG über persönliche Dokumente** | CV, Mietvertrag etc. chunked + embedded (pgvector); pro Feld semantische Suche. Das einzige der drei „RAG"-Themen, das wirklich Retrieval ist (`form_fields`-Tipps sind nur ein keyed Lookup, siehe Maßnahme 4). | 🟢 | 🔴 |
| **Supabase Auth (OAuth)** | Geräte-UUID durch echte Accounts ersetzen → geräteübergreifend, RLS pro Nutzer. | 🟡 | 🟡 |
| **Production-Packaging** | Backend-Proxy für Keys, Consent-Flow, Chrome-Web-Store, Firefox-Port. | 🟡 | 🔴 |
| **Team-/Enterprise-Modus** | Geteilte Antwort-Templates via Multi-Tenancy; setzt OAuth voraus. | ⚪ | 🔴 |
| **„Fake Filler"** | Auf Test-/Wegwerf-Seiten plausible Dummy-Daten statt echter Profildaten. | ⚪ | 🟢 |
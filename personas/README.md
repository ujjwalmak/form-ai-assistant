# Personas — wiederverwendbare Rollen-Prompts

Projektspezifische Persona-Dateien für das KI-gestützte Arbeiten an FormAssist
(Kurs-Einheit 2 „Vibe Coding": *projektspezifische Regeldateien / Personas*).

Jede Datei ist ein **wiederverwendbarer System-/Rollen-Prompt**: Vor einer Aufgabe
den passenden Persona-Text als Kontext/System-Prompt an den Coding-Assistenten geben
(z. B. einfügen oder „Arbeite als `agent-prompt-engineer`"). So bleibt das Verhalten
über Sessions hinweg konsistent und an den realen Projektstand gekoppelt.

| Persona | Wann verwenden |
| --- | --- |
| [extension-architect](extension-architect.md) | MV3-/Shadow-DOM-/Modul-Struktur, Storage, Service Worker, Provider-Transport |
| [agent-prompt-engineer](agent-prompt-engineer.md) | Agent-Logik, Prompts, Field-by-Field/Batch, JSON-Action-Format, Datums-Intelligenz |
| [aurora-ux-designer](aurora-ux-designer.md) | UI/Styling (`fa-styles.js`), Aurora-Glass-Design, Barrierefreiheit |
| [qa-test-engineer](qa-test-engineer.md) | Tests nach `TESTING_PLAN.md` (Vitest/jsdom/Playwright) |
| [docs-agent](docs-agent.md) | `README.md`, `memory/`, `logs/`, `Projektstand.md` synchron halten |

**Gemeinsame Grundregeln (für alle Personas):**

- Quelle der Wahrheit ist der Code + `memory/long_term.md` / `decisions.md` — keine Annahmen erfinden, Behauptungen am Code verifizieren.
- Sprache der Doku: Deutsch (Ausnahme: `TESTING_PLAN.md` ist Englisch).
- Klassennamen und Storage-Keys nicht ohne Grund umbenennen (bricht bestehende Code-Pfade).
- API-Keys gehören in `chrome.storage.sync`, niemals ins Repo.
- Größere Entscheidungen in `memory/decisions.md` festhalten, Sessions in `logs/actions.md`.

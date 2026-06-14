---
name: short-term-snapshot
description: Current runtime state, implemented features, and storage keys — snapshot as of 2026-06-14
metadata:
  type: project
---

# Short-Term Memory — FormAssist

Stand: 2026-06-14

## Aktueller Stand

FormAssist ist eine Chrome Extension (Manifest V3) mit einer Shadow-DOM-Sidebar für Formulare auf `<all_urls>`.

Das Content-Script ist modular (Manifest-Ladereihenfolge: `fa-utils` → `fa-profile` → `fa-scanner` → `fa-fill` → `fa-styles` → `fa-supabase` → `content`).

| Datei | Funktion |
| --- | --- |
| `content.js` | Orchestrierung: Chat, Agent, Field-by-Field, Profil-Panel, Submit-Review, UI |
| `fa-utils.js` | Hilfsfunktionen (Datums-Parsing, Selektoren, Kendo-Erkennung) |
| `fa-profile.js` | `PROFILE_FIELDS` (15 Felder) + `FAKE_DATA` |
| `fa-scanner.js` | Feldanalyse, Label/Hint/Error, `matchProfile`, `buildSystemPrompt` |
| `fa-fill.js` | `fillField` für alle Feldtypen + Datepicker/Temporal-Normalisierung |
| `fa-styles.js` | Aurora-Glass-Stylesheet (`FA_CSS`) |
| `fa-supabase.js` | Optionaler Profil-/History-Sync via Supabase |
| `background.js` | LLM-Transport: Groq + OpenRouter, Retry, Timeout, Streaming, automatischer Fallback |
| `options.js` / `options.html` | Provider, API-Keys (Groq + OpenRouter), Modell, Assistent-Modus, Supabase-Sync |
| `manifest.json` | Commands, Permissions, Content Script, Service Worker |

## Technischer Snapshot

- Single-File-Runtime (`content.js`) mit Shadow DOM
- Provider: Groq (primär) oder OpenRouter, wählbar in Optionen
- API-Keys in `chrome.storage.sync` (`faGroqApiKey`, `faOpenRouterApiKey`, `faProvider`)
- Modell + Assistent-Modus in `chrome.storage.sync` (`faModel`, `faAssistantMode`)
- Profile als Array in `chrome.storage.local` (`faProfiles`, `faActiveProfileId`)
- History der letzten 30 Agent-Sitzungen in `chrome.storage.local` (`faHistory`)
- Agent-Resume-Status in `chrome.storage.session` (`faAgentResume`)
- **15** Standard-Profilfelder (`PROFILE_FIELDS`) + freie `faExtras`
- Automatischer Fallback: Groq 429/5xx → OpenRouter (Toast im Sidebar)
- Unit-Tests: Vitest in `tests/unit/` (69 Tests, ~77 % Branch-Coverage der Logik-Module), CI via GitHub Actions; Icons in `icons/`

## Implementierte Features

### Agent

- **Zwei Modi:** Automatisch (`context`, Standard) und Mit Vorschau (`classic`)
- **Automatisch:** `extras` + `sessionAnswers` zuerst direkt per Label-Match (kein API-Call); unbekannte Felder werden gebatcht (Chunks à 12, 1 JSON-Call, Einzelfeld-Fallback bei Parse-Fehler — Stand 2026-06-11); `ask` nur bei wirklich unbekanntem Wert
- **Mit Vorschau:** Batch-Prompt → Streaming → editierbare Vorschau → User bestätigt
- `applyDeterministicProfileFill()` — starke Profil-Matches werden immer direkt gefüllt (kein API-Call)
- `AGENT_AUTO_SELECT_CONFIDENCE = 0.82` — unter diesem Wert kein Auto-Select in Vorschau
- Automatische Korrekturrunde nach dem Füllen bei Validierungsfehlern (Classic)
- `waitForFields()` — wartet bis zu 4s auf dynamisch geladene Felder
- Mehrschritt-Formulare mit Navigation und Resume über `faAgentResume`

### Field-by-Field (Automatisch-Modus)

- `runFieldByFieldAgent()` ersetzt Batch-Ansatz für Guided/Context-Mode
- Priorität: sessionAnswers → extras → KI (jeweils per normalizedLabel-Match)
- Navigation/Submit-Button automatisch erkannt und nach allen Feldern ausgeführt
- Ask-Aktionen haben `selector` gespeichert → direktes Füllen ohne erneuten Agent-Lauf
- `handleGuidedAnswer()` füllt Feld direkt, `showNextGuidedQuestion()` handhabt Navigation

### Formularerkennung

- Shadow DOM: Web Components und Custom Elements werden gescannt
- Nav-Filter: `nav`, `header`, `footer`, `[role=search]` ausgeschlossen
- Datepicker-Support: Flatpickr, Pikaday, jQuery UI, Bootstrap DateTimePicker
- Radio-Button-Fix: `click()` statt `checked = true` (React/Vue-Kompatibilität)

### Profil & Daten

- Mehrere Profile mit Switcher, Anlegen, Löschen
- Import/Export als JSON
- `faExtras` für gelernte Freitext-Felder (exact-match per normalisiertem Label)
- History-Panel: letzte 30 Agent-Sitzungen, löschbar

### Formularhilfe

- Formular-Zusammenfassung ("Formular erklären")
- Submit-Review vor Absenden mit Status (`OK` / `Warnung` / `Fehlt`)
- Proaktive Fehlerhilfe bei invaliden Feldern

### UI

- Action-Panel-First: großer Primär-Button + Erklären-Chip + aufklappbare Feldliste
- Profil- und Verlauf-Panel blenden Action-Panel aus (volle Höhe für Inhalt)
- Drag/Resize, Dark Mode, Toast-Benachrichtigungen
- Tastenkürzel: `Alt+Shift+F` (öffnen/schließen), `Alt+Shift+S` (Agent starten)

## Derzeit bewusst nicht vorhanden

- Kein Voice-Input (Web Speech)
- Kein Foto-/OCR-Upload für Dokumente
- Kein Reverse-Fallback OpenRouter → Groq

## Nächste sinnvolle Schritte

1. Abschlusspräsentation + Reflektion vorbereiten (inkl. Deployment-Begründung)
2. Optional: Test-Abdeckung erweitern (`fa-supabase` mit chrome-Mocks); RAG über Supabase `form_fields`; Privacy/Consent-Flow vor KI-Analyse

Keine offene Pflicht mehr aus behandelten Einheiten; E10/E11 noch nicht behandelt.

Erledigt (2026-06-14): Ausführbare Tests + CI (Kurs-Einheit 8); autonomer Dokumentations-Agent `doc-agent/` (Kurs-Einheit 9).

Vollständiger Status nach Kurseinheiten: siehe `Projektstand.md`.

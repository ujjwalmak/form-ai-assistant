---
name: short-term-snapshot
description: Current runtime state, implemented features, and storage keys — snapshot as of 2026-07-05
metadata:
  type: project
---

# Short-Term Memory — FormAssist

Stand: 2026-07-05 (v2.1)

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
- Unit-Tests: Vitest in `tests/unit/` (118 Tests, ~79 % Branch-Coverage der Logik-Module), CI via GitHub Actions; Icons in `icons/`

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

- Shadow DOM: Web Components und Custom Elements werden gescannt — seit 2026-07-05 **rekursiv** (verschachtelte Shadow Roots, `collectShadowRoots` mit Tiefenlimit 6)
- Label/Hint/Error/Radio-Lookups laufen über `el.getRootNode()` statt `document` (`byIdInRoot` in `fa-scanner.js`) — korrekt in Shadow DOM und same-origin iFrames; `isVisible` nutzt `ownerDocument.defaultView`
- Tabellen-Layout-Fallback: linke Zelle (`td`/`th`) als Label (Behörden-/Legacy-Formulare)
- **Fehl-Match-Schutz** (2026-07-05): `matchProfile` + `learnAgentFields` matchen Keywords am Wortanfang (`labelHasKeyword`) statt Substring — "Hotelname"≠Telefon, "Sportart"/"Passwort"≠Stadt; Passwortfelder nie; Compound-Keywords ergänzt (`mobil`, `rufnummer`, `wohnort`, `geboren`)
- Nav-Filter: `nav`, `header`, `footer`, `[role=search]` ausgeschlossen
- Datepicker-Support: Flatpickr, Pikaday, jQuery UI, Bootstrap DateTimePicker
- Radio-Button-Fix: `click()` statt `checked = true` (React/Vue-Kompatibilität)
- Robustes Füllen (2026-07-05, `fa-fill.js`): priorisiertes Select-Matching (`findSelectOption`: exakt → Wortanfang → enthält ab 3 Zeichen), `<select multiple>` per Kommaliste, deutsches Dezimalkomma für `type=number` (`normalizeDecimalString`), `maxlength`-Kappung

### Profil & Daten

- Mehrere Profile mit Switcher, Anlegen, Löschen
- Import/Export als JSON
- `faExtras` für gelernte Freitext-Felder (exact-match per normalisiertem Label)
- History-Panel: letzte 30 Agent-Sitzungen, löschbar

### Formularhilfe

- Formular-Zusammenfassung ("Formular erklären")
- Submit-Review vor Absenden mit Status (`OK` / `Warnung` / `Fehlt`) + Logik-Check auf Feld-Widersprüche; deterministische Prüfergebnisse gehen als "Lokale Prüfung" in den Prompt
- Proaktive Fehlerhilfe bei invaliden Feldern
- **Live-Validierung beim Tippen** (seit 2026-07-05, `fa-utils.js`): IBAN mod-97, BIC, E-Mail, PLZ, Telefon, Geburtsdatum — deterministisch ohne API-Call; ✓/⚠-Badge in der Sidebar (`fa-live-check`) + Outline-Flash am Feld; tolerant beim Tippen, streng bei blur

### Dokument-Scan (Vision-OCR, seit 2026-07-05)

- Profil-Panel-Button `fa-pf-scan`: Bild → clientseitig auf 1400 px verkleinert (JPEG q0.85) → Bestätigungsschritt (Privacy) → Vision-LLM → JSON → Profilfelder vorbefüllt (`pf-scanned`-Markierung), Speichern erst durch Nutzer
- Vision-Modelle: Groq `meta-llama/llama-4-scout-17b-16e-instruct`, OpenRouter `meta-llama/llama-4-scout`; eigener Vision-Fallback via `fallbackModel` in der `llm-fetch`-Message (`meta-llama/llama-4-scout:free`), damit der Groq→OpenRouter-Fallback nicht auf das text-only Modell wechselt

### UI

- Action-Panel-First: großer Primär-Button + Erklären-Chip + aufklappbare Feldliste
- Profil- und Verlauf-Panel blenden Action-Panel aus (volle Höhe für Inhalt)
- Drag/Resize, Dark Mode, Toast-Benachrichtigungen
- Tastenkürzel: `Alt+Shift+F` (öffnen/schließen), `Alt+Shift+S` (Agent starten)

## Derzeit bewusst nicht vorhanden

- Kein Voice-Input (Web Speech) — bewusst nicht für die Demo (Mikrofon-Berechtigungen riskant)
- Kein Reverse-Fallback OpenRouter → Groq

## Nächste sinnvolle Schritte

1. Prototyp-Demo (09.07.) vorbereiten — Repo bereitstellen, Präsentation auf Moodle; neue v2.1-Features (Dokument-Scan, Live-Validierung, Logik-Check) in die Demo einbauen
2. Optional: Test-Abdeckung erweitern (`fa-supabase` mit chrome-Mocks); RAG über Supabase `form_fields`

Keine offene Pflicht aus behandelten Einheiten (E2–E11); E5 erlassen; E11 = MCP-Konzept ohne neuen Pflichtpunkt.

Erledigt (2026-06-14): Ausführbare Tests + CI (Kurs-Einheit 8); autonomer Dokumentations-Agent `doc-agent/` (Kurs-Einheit 9).
Erledigt (2026-06-18): Stakeholder-Projektwebseite (`docs/`, MkDocs Material) + GitHub-Pages-Auto-Deploy (Kurs-Einheit 10); doc-agent um `post-commit`-Hook + Self-Exclude erweitert.
Erledigt (2026-06-26): GitHub Pages aktiviert — Webseite live unter ujjwalmak.github.io/form-ai-assistant.

Vollständiger Status nach Kurseinheiten: siehe `docs/reference/projektstand-vollstaendig.md`.

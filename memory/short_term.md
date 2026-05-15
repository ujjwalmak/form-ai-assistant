---
name: short-term-snapshot
description: Current runtime state, implemented features, and storage keys — snapshot as of 2026-05-15
metadata:
  type: project
---

# Short-Term Memory — FormAssist

Stand: 2026-05-15

## Aktueller Stand

FormAssist ist eine Chrome Extension (Manifest V3) mit einer Shadow-DOM-Sidebar für Formulare auf `<all_urls>`.

| Datei | Funktion |
| --- | --- |
| `content.js` | Hauptlogik: Kontext-Extraktion, Chat, Agent, Field-by-Field, Profil, Submit-Review, UI |
| `background.js` | LLM-Transport: Groq + OpenRouter, Retry, Timeout, Streaming, automatischer Fallback |
| `options.js` / `options.html` | Provider, API-Keys (Groq + OpenRouter), Modell, Assistent-Modus |
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

## Implementierte Features

### Agent

- **Zwei Modi:** Automatisch (`context`, Standard) und Mit Vorschau (`classic`)
- **Automatisch:** Feld-für-Feld — pro Feld ein eigener Non-Streaming API-Call (max_tokens 80), `extras` + `sessionAnswers` werden zuerst direkt per Label-Match angewendet (kein API-Call), KI füllt unbekannte Felder, `ask` nur bei wirklich unbekanntem Wert
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

1. Privacy/Consent-Flow vor KI-Analyse von Formularinhalten
2. Real-World-Tests für verschiedene Formularframeworks (Kendo, React, Legacy)
3. Optional: Team-/Cloud-Profile mit explizitem Opt-in

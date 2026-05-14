# Short-Term Memory — FormAssist

_Last updated: 2026-05-14_

## Aktueller Stand

FormAssist ist eine Chrome Extension (Manifest V3) mit einer Shadow-DOM-Sidebar fuer Formulare auf `<all_urls>`.

| Datei | Funktion |
|---|---|
| `content.js` | Hauptlogik: Kontext-Extraktion, Chat, Agent, Profil, Submit-Review, UI |
| `background.js` | Groq-Transport (Retry, Timeout, Streaming) |
| `options.js` / `options.html` | API-Key- und Modell-Einstellungen |
| `manifest.json` | Commands, Permissions, Content Script, Service Worker |

## Technischer Snapshot

- Single-File-Runtime (`content.js`) mit Shadow DOM
- API-Key in `chrome.storage.sync` (`faApiKey`), Modell in `faModel`
- Profil/Extras/Position/Dark-Mode in `chrome.storage.local`
- Agent-Resume-Status in `chrome.storage.session` (`faAgentResume`)
- Aktuell **15** Standard-Profilfelder (`PROFILE_FIELDS`) + freie `faExtras`

## Implementierte Features

- Agent mit Aktionsvorschau (editierbare Werte, einzeln abwaehlbar)
- Umschaltbarer Agent-Modus: Hybrid, Klassisch (Vorschau), Kontextuell (autonom)
- Quellenlogik je Feld: `profile`, `inferred`, `suggestion`
- Automatische Korrekturrunde nach dem Fuellen bei Validierungsfehlern
- Mehrschritt-Formulare mit Navigation und Resume
- Formular-Zusammenfassung ("Formular erklaeren")
- Submit-Review vor Absenden mit Status (`OK` / `Warnung` / `Fehlt`)
- Proaktive Fehlerhilfe bei invaliden Feldern
- Profil-Panel inkl. `faExtras`-Bearbeitung und Loeschfunktion
- Drag/Resize, Dark Mode, Tastenkurzbefehle (`Alt+Shift+F`, `Alt+Shift+S`)

## Derzeit bewusst nicht vorhanden

- Kein Voice-Input (Web Speech)
- Kein Foto-/OCR-Upload fuer Dokumente
- Kein Minimize-Button in der aktuellen UI

## Naechste sinnvolle Schritte

1. Privacy/Consent-Flow vor KI-Analyse von Formularinhalten
2. Real-World-Tests fuer verschiedene Formularframeworks (Kendo, React, Legacy)
3. Optional: Team-/Cloud-Profile mit explizitem Opt-in

# Short-Term Memory — FormAssist

_Last updated: 2026-04-23_

## Aktueller Stand

FormAssist ist eine Chrome-Extension (Manifest V3), die auf jeder Seite mit Formularfeldern eine KI-Sidebar einblendet.  
Das Projekt hat zwei Codelinien, die zuletzt gemergt wurden:

| Datei | Herkunft | Funktion |
|---|---|---|
| `content.js` | Claude (lokal) | Haupt-Logik: Shadow DOM, Kontext-Extraktion, AI-Call, Drag/Resize/Minimize |
| `manifest.json` | Claude (lokal) | MV3, single content-script, host_permissions Groq |
| `state.js`, `ui.js`, `api.js`, `bootstrap.js`, `content.css` | Kollege (GitHub) | Ältere Multifile-Architektur — aktuell NICHT aktiv geladen |
| `api-key.txt` | lokal, gitignored | Groq API-Key (gsk_…) |
| `icon.svg` | Claude | Extension-Icon |

**Aktive Architektur:** Alles läuft über `content.js` (Shadow DOM, Single File).  
Die Dateien `state.js`, `ui.js`, `api.js`, `bootstrap.js`, `content.css` liegen im Repo, werden aber vom aktuellen `manifest.json` NICHT geladen.

## Implementierte Features

- Shadow DOM Sidebar (kein CSS-Konflikt mit Host-Seiten)
- Reichhaltige Formular-Kontext-Extraktion (Labels, aria-*, Hints, Fehler, Optionen, autocomplete, min/max)
- System-Prompt mit Seitentitel, URL, Feldstruktur, Submit-Zweck, Anweisungen
- Groq API (llama-3.1-8b-instant), max_tokens 400
- Konversations-History (letzte 10 Nachrichten)
- API-Key aus `api-key.txt` (via `chrome.runtime.getURL`)
- Clickbare Feldliste im Begrüßungs-Chat (scrollt + highlightet das echte Feld)
- Drag (Header anfassen), Width-Resize (linker Rand), Height-Resize (unterer Rand), Corner-Resize (SW-Ecke)
- Minimize-Button (klappt auf 56px, speichert/stellt Höhe wieder her)
- MutationObserver für SPA-Formulare
- Aktives-Feld-Tracking mit Hint + Fehlermeldung + aktuellem Wert an AI

## Offene Probleme / bekannte Schwächen

- Multifile-Dateien (`state.js`, `ui.js` etc.) sind verwaist im Repo — sollten aufgeräumt oder entfernt werden
- Inline-Resize nach Minimize-Restore kann in bestimmten Zustandskombinationen (docked + minimized) zu falscher Höhe führen
- Extension lädt nicht in Chrome's nativen PDF-Viewer (Browser-Limitation)
- API-Key liegt clientseitig in Extension — kein Produktionssetup
- README.md beschreibt noch die alte Multifile-Architektur (vom Kollegen überschrieben)

## Nächste sinnvolle Schritte

1. Alte Multifile-Dateien aus Repo entfernen oder README korrigieren
2. Feature: Auto-Fill (AI schlägt Feldwert vor, 1-Klick einfügen)
3. Feature: Proaktive Fehlererkennung (bei invalid-Feldern automatisch AI-Hilfe anbieten)
4. Feature: localStorage-Memory für persönliche Daten (Name, Adresse)
5. Feature: Keyboard-Shortcut (Ctrl+Shift+F)
6. Feature: Darkmode (prefers-color-scheme)
7. Feature: Position/Größe in localStorage speichern

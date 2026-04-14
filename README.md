# FormAssist - Chrome Extension

FormAssist ist eine Manifest-V3-Extension, die auf Formularseiten eine KI-Assistenz als Sidebar einblendet.

## Projektstruktur

- manifest.json - Extension-Konfiguration
- state.js - Shared State, Utilities, API-Key-Laden
- ui.js - Panel-UI, Drag/Resize, Feldscan, Nachrichten-Rendering
- api.js - KI-Request-Logik und API-Fehlerbehandlung
- bootstrap.js - Startlogik und Initial-Injection
- content.css - Styling der Sidebar
- api-key.txt - lokale Key-Datei
- icon128.svg - Extension-Icon

## Lokales Setup

1. In api-key.txt den Platzhalter mit deinem Groq API-Key ersetzen.
2. Chrome oeffnen und chrome://extensions aufrufen.
3. Entwicklermodus aktivieren.
4. Entpackte Erweiterung laden und diesen Ordner auswaehlen.

## Nutzung

1. Webseite mit Formular oeffnen.
2. Sidebar erscheint automatisch.
3. Feld auswaehlen oder fokussieren.
4. Frage stellen und Antwort direkt im Chat erhalten.

## Konfigurierbare Stellen

- Prompt und Basistexte in state.js
- Modell und API-Parameter in api.js
- Layout und Design in content.css

## Team-Workflow (wichtig)

- Vor Demo: Extension in chrome://extensions neu laden.
- Bei API-Fehlern: Key in api-key.txt pruefen und Seite hart neu laden.

## Security-Hinweis

Die Key-Datei liegt weiterhin clientseitig in der Extension. Das ist fuer einen Prototyp okay, aber nicht fuer Produktion. Fuer produktive Nutzung sollte ein Backend-Proxy eingesetzt werden.

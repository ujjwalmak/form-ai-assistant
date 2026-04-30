# FormAssist - Chrome Extension

FormAssist ist eine Manifest-V3-Extension, die auf Formularseiten eine KI-Assistenz als Sidebar einblendet. Die aktuelle Implementierung ist bewusst als Single-File-Lösung in `content.js` umgesetzt und rendert die komplette UI im Shadow DOM.

## Aktuelle Architektur

- `manifest.json` - Extension-Konfiguration
- `content.js` - aktive Logik fuer UI, Feldanalyse, Drag/Resize und KI-Interaktionen
- `api-key.txt` - lokale Key-Datei fuer den Groq API-Key
- Die frueheren Multifile-Dateien wurden entfernt; der aktive Code lebt nur noch in `content.js`

## Was die Sidebar jetzt kann

### Intelligente Feldterkennung & Auto-Fill
- Formularfelder semantisch erkennen (Labels, Autocomplete-Attribute, Keywords)
- Profile-Felder automatisch erkennen (Vorname, Email, Adresse, IBAN, etc.)
- Texteingaben, Selects, Checkboxen und Radio-Gruppen richtig unterscheiden
- Schnelles Eintragen über Auto-Fill (Profile-Daten lokal speichern)

### Profilmanagement
- **Profil bearbeiten**: Button im Header öffnet Profil-Editor (16 Standardfelder)
- Profile lokal speichern (Chrome Storage) — bleiben auch nach Browser-Neustart erhalten
- Schneller Zugriff auf gespeicherte Daten beim nächsten Besuch

### Geführter Modus (Step-by-Step)
- **Geführter Modus**: KI fragt nacheinander nur noch leere Felder ab — statt auf Fragen warten
- Du antwortest kurz; die KI trägt automatisch ein
- Mit Fortschrittsanzeige (z.B. "5/12")
- Buttons zum Überspringen oder Beenden einzelner Felder
- Am Ende: Zusammenfassung aller Eingaben

### KI-Assistenz
- Antworten per Button kopieren
- Formular vor dem Absenden zusammenfassen und plausibilisieren
- Bei erkannten Eingabeproblemen proaktiv Hilfestellung geben

### Bedienung & UI
- **Quick-Action Buttons**: "Formular erklären" (Kurzübersicht vor dem Start) + "Geführter Modus" (Step-by-Step)
- **Dark Mode Toggle**: Icon im Header — UI passt sich an dunkle/helle Umgebung an
- Sidebar frei verschieben und an allen Seiten sowie Ecken resizen
- Minimize-Button zum Platzzusparen
- Oberfläche mit modernem Layout und Farb-Design
- Tastenkombination `Ctrl+Shift+F` zum Oeffnen und Schliessen der Sidebar

## Lokales Setup

1. In `api-key.txt` deinen eigenen Groq API-Key eintragen.
2. Chrome oeffnen und `chrome://extensions` aufrufen.
3. Entwicklermodus aktivieren.
4. Entpackte Erweiterung laden und diesen Ordner auswaehlen.

## Nutzung

1. Webseite mit Formular oeffnen.
2. Sidebar erscheint automatisch.
3. Im Chat direkt eine Frage stellen oder eine der Schnellaktionen verwenden.
4. Bei Bedarf gezielt ein Feld auswaehlen, den gefuehrten Modus nutzen oder vor dem Absenden die Pruefung starten.

## Wichtige Hinweise fuer die Entwicklung

- Neue UI- oder Prompt-Aenderungen werden aktuell in `content.js` umgesetzt.
- Die alten Dateien bleiben nur zur Referenz im Repo; sie werden vom aktuellen Manifest nicht geladen.
- Nach groesseren Aenderungen die Extension in `chrome://extensions` neu laden.

## Security-Hinweis

Die Key-Datei liegt weiterhin clientseitig in der Extension. Das ist fuer einen Prototyp okay, aber nicht fuer Produktion. Fuer produktive Nutzung sollte ein Backend-Proxy eingesetzt werden. Den Key nie in Source-Dateien oder Dokumentation eintragen.

# FormAssist Test Site

Lokale Next.js-Testseite mit absichtlich komplexen Formularen für die Chrome-Extension.
Sie dient als manuelle Fixture-Sammlung und als Grundlage für spätere Playwright-E2E-Tests.

## Enthaltene Szenarien

- `registration` — mehrstufige Registrierung mit Autocomplete, Labels, Adresse und Account-Feldern.
- `application` — Bewerbung mit Datei-Upload, Checkboxen, Multi-Select und bedingten Feldern.
- `medical` — deutscher Intake-Flow mit Labels wie Vorname, Geburtsdatum und Postleitzahl.
- `checkout` — Checkout mit Versand, Zahlung, Validierung und Fehlermeldungen.
- `insurance` — Versicherungsformular mit Kendo-artigen Widgets und dynamischen Bereichen.
- `survey` — Survey über viele Input-Typen: Text, Datum/Zeit, Select, Radio, Checkbox, Range, Datei.

## Starten

```bash
cd test-site
npm install
npm run dev
```

Danach `http://localhost:3000` öffnen, FormAssist als entpackte Extension laden und Smart Fill
mit `Alt+Shift+S` testen. Die Formulare haben bewusst Next/Back-Navigation, damit auch
mehrseitiges Füllen und Auto-Advance geprüft werden können.

## Nächster Ausbau

Die Seite ist noch keine automatisierte E2E-Suite. Der nächste sinnvolle Schritt ist eine
Playwright-Suite, die die Extension im persistenten Chromium-Kontext lädt, ein Fixture-Profil
setzt und pro Formular Fill-Accuracy misst.

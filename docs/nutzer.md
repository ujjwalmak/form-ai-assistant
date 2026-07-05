# Für Nutzer

## Was kann FormAssist?

- **⚡ Agent ausfüllen** — analysiert die Formularfelder und füllt sie automatisch aus.
- **Agentischer Chat** — die KI kann Felder direkt aus dem Chat heraus setzen
  („Trag bei E-Mail x@y.de ein"); sie sendet dabei **niemals** ab.
- **Formular erklären** — Zweck, Pflichtfelder und typische Stolperstellen in Kurzform.
- **Live-Validierung** — prüft IBAN, BIC, E-Mail, PLZ, Telefon und Geburtsdatum
  deterministisch beim Tippen; unvollständige Eingaben werden erst beim Verlassen
  des Felds streng bewertet.
- **Submit-Review** — vor dem Absenden prüft die KI auf Fehlendes/Auffälliges
  und logische Widersprüche zwischen Feldern (Status `OK` / `Warnung` / `Fehlt`);
  abgesendet wird nur auf deine Entscheidung.
- **Datums-Intelligenz** — versteht relative Angaben („nächster Monat", „in 2 Wochen", DE+EN)
  und Formate wie `20.02.2000` und normalisiert sie ins Feldformat.
- **Mehrere Profile** — privat/geschäftlich, mit Switcher, Import/Export als JSON.
- **Dokument-Scan** — Foto eines Ausweises, einer Visitenkarte oder Rechnung hochladen;
  ein Vision-Modell extrahiert mögliche Profilwerte, die du vor dem Speichern prüfst.
- **Chat-Gedächtnis pro Domain** — der Agent erinnert sich über Seitenwechsel hinweg.

## Nutzungsszenario

Du öffnest ein längeres Online-Formular (z. B. eine Behörden- oder Anmeldemaske), startest
FormAssist über die Sidebar und drückst **⚡ Agent**. Die Felder werden aus deinem Profil
gefüllt; bei wirklich unbekannten Angaben fragt der Agent gezielt nach. Mehrseitige
Formulare arbeitet er bis zu einer Sicherheitsgrenze selbstständig durch.

## So nutzt du es

1. `chrome://extensions` → Entwicklermodus → **„Entpackte Erweiterung laden"** → Projektordner.
2. In den FormAssist-Einstellungen einen Provider wählen und API-Key eintragen:
    - **Groq** ([console.groq.com](https://console.groq.com)) — `gsk_…`
    - **OpenRouter** ([openrouter.ai/keys](https://openrouter.ai/keys)) — `sk-or-v1-…` (optional als Backup)
3. Auf einer Seite mit Formular die Sidebar öffnen (`Alt+Shift+F`) und den Agent starten
   (`Alt+Shift+S`).

## Wie sicher ist es?

- **API-Keys** liegen in `chrome.storage.sync` — nicht im Code, nicht im Repository.
- **Datenfluss:** Für KI-Funktionen werden relevante Formular- und Profildaten an den
  gewählten Provider (Groq bzw. OpenRouter) übertragen. Das ist bewusst und auf das
  Nötige beschränkt (Datenminimierung).
- **Dokument-Scan mit Bestätigung:** Bilder werden vor dem Senden im Browser auf max.
  1400 px verkleinert. Der Upload startet erst nach expliziter Bestätigung; erkannte
  Werte werden nur vorbefüllt und erst durch **Speichern** übernommen.
- **Kein Auto-Submit:** Der Agent darf Formulare nie selbst absenden — eine fest verdrahtete
  Guardrail im Action-Parser.
- **Isolierte UI:** Die gesamte Oberfläche läuft in einem Shadow DOM, ohne in die Host-Seite
  einzugreifen.

## Einschränkungen (ehrlich)

- **Nativer Chrome-PDF-Viewer:** dort laufen keine Content-Scripts → FormAssist funktioniert
  in PDF-Ansichten nicht.
- **Fremde (cross-origin) iFrames:** deren Felder sind aus Sicherheitsgründen nicht auslesbar.
- **Client-seitiger API-Key:** für lokalen/prototypischen Einsatz gedacht; ein produktiver
  Rollout bräuchte einen Backend-Proxy und einen expliziten Consent-Flow pro Formular.
- **Closed Shadow Roots:** komplett geschlossene Web-Components bleiben technisch
  unzugänglich; offene und verschachtelte Shadow Roots werden unterstützt.

!!! info "Status"
    FormAssist ist ein funktionsfähiger Prototyp für den lokalen Einsatz, kein
    Produktivprodukt. Siehe [Projektstand & Reflexion](projektstand.md).

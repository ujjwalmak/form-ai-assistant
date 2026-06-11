# FormAssist – KI Formular-Assistent

Chrome Extension (Manifest V3), die auf Seiten mit Formularen eine KI-Sidebar einblendet. Der Agent analysiert Felder, schlägt Werte vor und kann Formulare weitgehend automatisiert oder geführt ausfüllen.

## Architektur

| Datei | Zweck |
| --- | --- |
| `content.js` | Gesamte Laufzeitlogik: Shadow-DOM-UI, Feldanalyse, Agent, Guided Mode, Profil, Submit-Review |
| `background.js` | LLM-Transport (Groq + OpenRouter, Retry/Timeout, Streaming + Non-Streaming) via Service Worker |
| `options.js/html` | Einstellungsseite: Provider, API-Keys, Modell, Assistent-Modus |
| `manifest.json` | MV3-Konfiguration, Berechtigungen, Tastenkürzel |

Alle UI-Elemente laufen isoliert in `attachShadow({ mode: 'open' })` (kein CSS-Konflikt mit Host-Seiten).

## Features

### KI-Agent

- **⚡ Agent** analysiert Formularfelder und füllt sie automatisch aus
- **Agentischer Chat**: Die KI kann Felder direkt aus dem Chat heraus ausfüllen ("Trag bei E-Mail x@y.de ein") — Antworten enthalten einen `<<<ACTIONS … ACTIONS>>>`-Block (toleranter Parser: auch ```json-Fences und nackte JSON-Arrays), der validiert und ausgeführt wird: fill/select/**check inkl. Abwählen** ("nein"), Radios per Optionstext, niemals submit
- **Datums-Intelligenz**: `fillField` normalisiert Werte für `date`/`month`/`week`/`time`/`datetime-local` — inkl. relativer Angaben ("nächster Monat", "in 2 Wochen", "ab sofort", DE+EN) und Formaten wie `20.02.2000` oder `02.2027`
- **Antwort-Normalisierung**: Tippt der Nutzer auf eine Agent-Rückfrage etwas, das das Feld ablehnt ("Next month" in ein Datumsfeld), wird die Antwort verifiziert, per Mini-KI-Call ins Feldformat konvertiert und erneut gefüllt; erst nach 2 Fehlversuchen kommt eine Rückfrage
- **Chat-Gedächtnis**: Konversationen werden pro Domain gespeichert (`faChatMem`, max. 24 Nachrichten, 12 Domains LRU) und beim nächsten Seitenaufruf wiederhergestellt — der Agent erinnert sich über Seitenwechsel und Sessions hinweg
- **Live-Kontext**: Vor jeder Chat-Anfrage wird die Seite neu gescannt — die KI sieht aktuelle Feldwerte, Selektoren und Validierungszustand
- **Selbstkorrektur**: Nach dem automatischen Ausfüllen prüft der Agent Validierungsfehler und korrigiert ungültige Felder eigenständig (eine Runde, inkl. Fehlermeldung der Seite im Prompt); erst danach fragt er den Nutzer
- **Automatisch** (Standard): Feld-für-Feld — Profile + gelernte Extras direkt, KI nur für wirklich unbekannte Felder, fragt gezielt nach wenn nötig
- **Mit Vorschau**: editierbare Vorschau vor jeder Ausfuehrung

#### Automatischer Modus (Field-by-Field)

- Pro Feld: zuerst `extras` + `sessionAnswers` per Label-Match (exakt + fuzzy Token-Overlap), dann KI
- Unbekannte Felder werden **gebatcht** (1 API-Call pro 12 Felder statt 1 Call pro Feld); bei Parse-Fehlern fokussierter Einzelprompt als Fallback
- Wirklich unbekannte Felder werden als Chip-Frage gestellt
- Nutzerantworten werden als `sessionAnswers` gespeichert und auf allen Folgeseiten wiederverwendet
- Auto-Navigate-Toggle: Weiter-/Submit-Buttons werden automatisch geklickt
- Agent navigiert selbstständig durch mehrseitige Formulare

#### Agent-Details

- `applyDeterministicProfileFill()` — starke Profil-Matches werden immer zuerst direkt gefuellt (kein API-Call)
- Automatische Korrektur-Runde bei Validierungsfehlern nach dem Fuellen (Vorschau-Modus)
- Weiterfuehrung ueber mehrseitige Formulare (Navigation + Resume mit `faAgentResume`)
- Loop-Schutz: Auto-Navigation stoppt nach max. 12 Seiten (`AGENT_MAX_PAGES`)
- Live-Fortschritt im Agent-Status (`Agent läuft… 4/12`) + Abschluss-Zusammenfassung mit Seitenzahl
- `waitForFields()` — wartet bis zu 4 Sekunden auf dynamisch geladene Felder

### Formularhilfe

- **Formular erklaeren**: Zweck, Pflichtfelder, Stolperstellen in Kurzform
- **Submit-Review vor Absenden** mit Status (`OK`, `Warnung`, `Fehlt`)
- **Proaktive Fehlerhilfe** bei invaliden Feldern (kurze, konkrete Korrekturhinweise)

### Profil & Daten

- **15** Standardfelder (Person, Adresse, Kontakt, Bank, Beruf)
- Zusatzdaten (`faExtras`) fuer gelernte Freitext-Felder, im Profil bearbeitbar/loeschbar
- **Mehrere Profile** — Switcher, Anlegen, Loeschen
- **Import/Export** als JSON
- Speicherung lokal in `chrome.storage.local`

### Formularerkennung

- Shadow DOM: erkennt Felder in Web Components und Custom Elements
- Nav-Filter: ignoriert Felder in `nav`, `header`, `footer`, `[role=search]`
- Datepicker-Support: Flatpickr, Pikaday, jQuery UI Datepicker, Bootstrap DateTimePicker
- Radio-Button-Fix: nutzt `click()` statt `checked = true` fuer React/Vue-Kompatibilitaet

### History

- Agent-Verlaufspanel mit den letzten 30 Sitzungen (Domain, Titel, Feldanzahl, Datum)
- Per Klick loeschbar

### UI

- **Aurora-Glass-Design**: Violett→Fuchsia→Pink-Spektrum auf tiefem Glas (32px Blur + Film-Grain), rotierender Aurora-Leuchtrahmen um die Sidebar, animierte Aurora-Blobs im Action-Panel, Gradient-Wortmarke, KI-Orb-Avatare an jeder Antwort, rechtsbündige Gradient-Bubbles für Nutzer-Nachrichten, glühender Fortschrittsbalken, federnde Micro-Interaktionen (respektiert `prefers-reduced-motion`)
- Schwebende Sidebar mit abgerundeten Ecken, per Drag loesbar und frei positionierbar
- Trigger-Button mit Feldanzahl-Badge
- Resize an allen Seiten und Ecken
- Dark-Mode-Toggle im Header
- Vorschlag-Chips im Startzustand (Formular erklären · Was fehlt noch? · ⚡ Ausfüllen)
- „Neuer Chat"-Button im Header leert Verlauf + Gedächtnis der aktuellen Domain
- Wiederhergestellte Unterhaltungen erscheinen gedimmt unter einem „Gedächtnis aktiv"-Trenner
- Fokusbezogener Auto-Fill-Tipp fuer das aktive Feld
- Toast-Benachrichtigungen (z. B. bei automatischem Provider-Fallback)
- Tastenkurzbefehle: `Alt+Shift+F` (oeffnen/schliessen), `Alt+Shift+S` (Agent starten)

## Setup

1. `chrome://extensions` → Entwicklermodus → "Entpackte Erweiterung laden" → diesen Ordner
2. In den FormAssist-Einstellungen Provider waehlen und API-Key eintragen:
   - Groq: [console.groq.com](https://console.groq.com) — `gsk_...`
   - OpenRouter: [openrouter.ai/keys](https://openrouter.ai/keys) — `sk-or-v1-...`
3. Optional: zweiten Provider als Backup eintragen (Fallback bei Fehler/Rate-Limit)
4. Auf einer Seite mit Formular die Sidebar oeffnen und **⚡ Agent** starten

## API & Provider

| | Groq | OpenRouter |
| --- | --- | --- |
| Endpunkt | `https://api.groq.com/openai/v1/chat/completions` | `https://openrouter.ai/api/v1/chat/completions` |
| Standard-Modell | `llama-3.3-70b-versatile` | `openrouter/auto` |
| Fallback-Modell | — | `meta-llama/llama-3.3-70b-instruct:free` |

**Automatischer Fallback:** Wenn Groq mit 429 (Rate Limit) oder 5xx (Server-Fehler) antwortet und ein OpenRouter-Key gespeichert ist, wird die Anfrage automatisch ueber OpenRouter wiederholt. Der Nutzer sieht einen kurzen Toast.

Alle Requests laufen via `background.js` (Service Worker) als CSP-sicheres Routing. Der Service Worker unterstuetzt sowohl Streaming (`llm-stream` Port) als auch Non-Streaming (`llm-fetch` Message).

## Storage-Keys

| Key | Store | Inhalt |
| --- | --- | --- |
| `faProvider` | sync | `'groq'` oder `'openrouter'` |
| `faGroqApiKey` | sync | Groq API-Key |
| `faOpenRouterApiKey` | sync | OpenRouter API-Key |
| `faModel` | sync | Gewaehltes Modell |
| `faAssistantMode` | sync | `'hybrid'`, `'classic'` oder `'context'` |
| `faProfiles` | local | Array aller Profile `[{id, name, profile, extras}]` |
| `faActiveProfileId` | local | ID des aktiven Profils |
| `faHistory` | local | Array der letzten 30 Agent-Sitzungen |
| `faChatMem` | local | Chat-Gedächtnis pro Domain `{hostname: {messages, updated}}` |
| `faPosition` | local | Sidebar-Position |
| `faDarkMode` | local | Boolean |
| `faAgentResume` | session | Agent-State fuer Weiterführung nach Navigation |

## Sicherheit

- API-Keys liegen in `chrome.storage.sync` (nicht im Repository)
- Profil- und Formularinhalte werden fuer KI-Funktionen an den gewaehlten Provider uebertragen
- Fuer produktiven Einsatz: Backend-Proxy + explizite Consent-/Datenschutz-Mechanik je Formular einplanen

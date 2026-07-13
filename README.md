# FormAssist – KI Formular-Assistent

Chrome Extension (Manifest V3), die auf Seiten mit Formularen eine KI-Sidebar einblendet. Der Agent analysiert Felder, schlägt Werte vor und kann Formulare weitgehend automatisiert oder geführt ausfüllen.

## Architektur

Das Content-Script ist in Module aufgeteilt, die das Manifest in dieser Reihenfolge lädt (`fa-utils` → `fa-providers` → `fa-profile` → `fa-scanner` → `fa-prompts` → `fa-fill` → `fa-format` → `fa-actions` → `fa-styles` → `fa-templates` → `fa-supabase` → `content`):

| Datei | Zweck |
| --- | --- |
| `content.js` | Orchestrierung der Laufzeit: Shadow-DOM-UI, Chat, Agent, Guided/Field-by-Field, Profil-Panel, Submit-Review |
| `fa-utils.js` | Hilfsfunktionen: `clean`, `sleep`, `downscaleImage`, `parseDateToISO`/`parseRelativeDate`, Kendo-Erkennung, `getAgentSelector`, deterministische Validatoren (`isValidIBAN` mod-97, BIC, E-Mail, PLZ, Telefon, Geburtsdatum) |
| `fa-providers.js` | Provider-/Modell-Konfiguration als Single Source of Truth (`PROVIDERS`, `normalizeProvider`, `providerLabel`, `getDefaultModel`, Vision-/Fallback-Modelle) — geteilt von Content-Script, Options-Seite und Service Worker (`importScripts`) |
| `fa-profile.js` | `PROFILE_FIELDS` (15 Standardfelder mit Keywords/Autocomplete) + `FAKE_DATA` |
| `fa-scanner.js` | Feldanalyse: `getLabel`/`getHint`/`getError`, `extractField`, `matchProfile`, `extractRichContext`, Step-Erkennung |
| `fa-prompts.js` | Alle LLM-Kontrakte an einem Ort: `buildSystemPrompt`, `buildAgentPrompt`, `buildScanPrompt`, `buildSubmitReviewPrompt` |
| `fa-fill.js` | `fillField` für alle Feldtypen inkl. Datepicker-Libs und temporaler Normalisierung |
| `fa-format.js` | Pure Text-/HTML-Formatierung für die Chat-UI: `escapeHtml`, `textToHtml`, `renderMarkdown` (XSS-sicher) |
| `fa-actions.js` | Parsen & Härten von LLM-Antworten: `splitActionBlock`, `sanitizeAgentActions` (Aktions-Whitelist), `parseModelJsonArray`, `createSSEDecoder`, `parseScanReply` |
| `fa-styles.js` | Aurora-Glass-Stylesheet (`FA_CSS`), in den Shadow Root injiziert |
| `fa-templates.js` | Statisches Sidebar-Markup (`FA_HTML`), Gegenstück zu `FA_CSS` |
| `fa-supabase.js` | Optionaler Supabase-Sync von Profilen und History (`sbPushProfiles`, `sbFetchProfiles`, …) |
| `background.js` | LLM-Transport (Groq + OpenRouter, Retry/Timeout, Streaming + Non-Streaming) via Service Worker |
| `options.js/html` | Einstellungsseite: Provider, API-Keys, Modell, Assistent-Modus, Supabase-Sync |
| `manifest.json` | MV3-Konfiguration, Berechtigungen, Tastenkürzel |

Alle UI-Elemente laufen isoliert in `attachShadow({ mode: 'open' })` (kein CSS-Konflikt mit Host-Seiten).

## Features

### KI-Agent

- **⚡ Agent** analysiert Formularfelder und füllt sie automatisch aus
- **Agentischer Chat**: Die KI kann Felder direkt aus dem Chat heraus ausfüllen ("Trag bei E-Mail `x@y.de` ein") — Antworten enthalten einen `<<<ACTIONS … ACTIONS>>>`-Block (toleranter Parser: auch ```json-Fences und nackte JSON-Arrays), der validiert und ausgeführt wird: fill/select/**check inkl. Abwählen** ("nein"), Radios per Optionstext, niemals submit
- **Datums-Intelligenz**: `fillField` normalisiert Werte für `date`/`month`/`week`/`time`/`datetime-local` — inkl. relativer Angaben ("nächster Monat", "in 2 Wochen", "ab sofort", DE+EN) und Formaten wie `20.02.2000` oder `02.2027`
- **Antwort-Normalisierung**: Tippt der Nutzer auf eine Agent-Rückfrage etwas, das das Feld ablehnt ("Next month" in ein Datumsfeld), wird die Antwort verifiziert, per Mini-KI-Call ins Feldformat konvertiert und erneut gefüllt; erst nach 2 Fehlversuchen kommt eine Rückfrage
- **Chat-Gedächtnis**: Konversationen werden pro Domain gespeichert (`faChatMem`, max. 24 Nachrichten, 12 Domains LRU) und beim nächsten Seitenaufruf wiederhergestellt — der Agent erinnert sich über Seitenwechsel und Sessions hinweg
- **Live-Kontext**: Vor jeder Chat-Anfrage wird die Seite neu gescannt — die KI sieht aktuelle Feldwerte, Selektoren und Validierungszustand
- **Selbstkorrektur**: Nach dem automatischen Ausfüllen prüft der Agent Validierungsfehler und korrigiert ungültige Felder eigenständig (eine Runde, inkl. Fehlermeldung der Seite im Prompt); erst danach fragt er den Nutzer
- **Mit Vorschau** (Standard): editierbare Vorschau vor jeder Ausfuehrung
- **Automatisch**: Feld-für-Feld — Profile + gelernte Extras direkt, KI nur für wirklich unbekannte Felder, fragt gezielt nach wenn nötig

#### Automatischer Modus (Field-by-Field)

- Pro Feld: zuerst `extras` + `sessionAnswers` per Label-Match (exakt + fuzzy Token-Overlap), dann KI
- Unbekannte Felder werden **gebatcht** (1 API-Call pro 12 Felder statt 1 Call pro Feld); bei Parse-Fehlern fokussierter Einzelprompt als Fallback
- **Rückfragen nur bei Pflichtfeldern**: Unbekannte optionale Felder (z. B. „Middle Name") werden still leer gelassen und am Ende in einer Zeile zusammengefasst („Sag mir einfach, was ich dort eintragen soll") — kein Frage-Spam bei langen Formularen. Pflichtfelder und von der Seite als ungültig markierte Felder fragen weiterhin nach
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
- **Live-Validierung beim Tippen** (deterministisch, ohne API-Call): IBAN-Prüfsumme (ISO 7064 mod-97 + Länder-Sollängen), BIC-, E-Mail-, PLZ-Format, Telefon-Plausibilität, Geburtsdatum (Zukunft/älter als 120 Jahre). Feedback als ✓/⚠-Badge in der Sidebar + dezentes Outline am Feld; beim Tippen tolerant (unvollständige Werte werden nicht angemeckert), bei `blur` streng
- **Submit-Review vor Absenden** mit Status (`OK`, `Warnung`, `Fehlt`) — inkl. **Logik-Check auf Widersprüche zwischen Feldern** (z. B. Enddatum vor Startdatum, PLZ passt nicht zur Stadt); die deterministischen Prüfergebnisse (z. B. IBAN-Prüfsumme) gehen als „Lokale Prüfung"-Fakten in den Review-Prompt ein
- **Proaktive Fehlerhilfe** bei invaliden Feldern (kurze, konkrete Korrekturhinweise)

### Profil & Daten

- **Dokument-Scan (Vision-OCR)**: Foto von Ausweis, Visitenkarte, Rechnung o. Ä. hochladen → Vision-LLM (Groq `meta-llama/llama-4-scout-17b-16e-instruct`, OpenRouter `meta-llama/llama-4-scout`) extrahiert Profilfelder als JSON. Datenminimierung: Bild wird clientseitig auf max. 1400 px verkleinert; expliziter Bestätigungsschritt vor dem Senden; erkannte Werte werden nur **vor**befüllt und markiert — gespeichert wird erst per „Speichern"
- **15** Standardfelder (Person, Adresse, Kontakt, Bank, Beruf)
- Zusatzdaten (`faExtras`) fuer gelernte Freitext-Felder, im Profil bearbeitbar/loeschbar
- **Mehrere Profile** — Switcher, Anlegen, Loeschen
- **Import/Export** als JSON
- Speicherung lokal in `chrome.storage.local`
- **Optionaler Supabase-Sync** (`fa-supabase.js`): Profile und History geräteübergreifend, sobald URL + Anon-Key in den Optionen hinterlegt sind; Geräte-Trennung per `crypto.randomUUID()`

### Formularerkennung

- Shadow DOM: erkennt Felder in Web Components und Custom Elements — **rekursiv** auch in verschachtelten Shadow Roots (Design-Systeme); Label/Hint/Error/Radio-Gruppen werden über `getRootNode()` im richtigen Baum aufgelöst (Shadow DOM **und** same-origin iFrames)
- **Tabellen-Layouts**: bei Legacy-/Behördenformularen dient die linke Tabellenzelle als Label-Fallback
- **Fehl-Match-Schutz**: Profil-Keywords matchen am Wortanfang statt als Substring („Hotelname" ist kein Telefonfeld, „Sportart"/„Passwort" keine Stadt); Passwortfelder bekommen nie Profildaten; deutsche Komposita („Wohnort", „Mobiltelefon", „Geboren am") sind über kuratierte Keywords abgedeckt — gilt auch fürs Lernen neuer Profilwerte nach Agent-Läufen
- **ARIA-Comboboxen** (React-Select, MUI, Headless UI …): `role="combobox"`-Widgets ohne natives `<select>` werden erkannt und ausgefüllt — Wert tippen bzw. Widget öffnen, auf die Options-Liste warten (`aria-controls`/`aria-owns`, auch Portale unter `document.body`), besten Treffer per realistischer Event-Sequenz (pointerdown→mousedown→mouseup→click) anklicken. Bewusst **kein synthetisches Enter** (Submit-Guardrail); ohne Treffer bleibt der getippte Text stehen
- **Rich-Text-Felder** (`contenteditable`, z. B. Anschreiben): Erkennung + Füllen via `execCommand('insertText')` (hält ProseMirror/Slate-State intakt) mit `textContent`-Fallback
- Nav-Filter: ignoriert Felder in `nav`, `header`, `footer`, `[role=search]`
- Datepicker-Support: Flatpickr, Pikaday, jQuery UI Datepicker, Bootstrap DateTimePicker
- Radio-Button-Fix: nutzt `click()` statt `checked = true` fuer React/Vue-Kompatibilitaet
- **Framework-treues Füllen**: Fokus vor dem Setzen, Blur danach (löst on-blur-Validierung aus — die Korrektur-Runde sieht Fehler sofort); der Agent scrollt jedes Feld vor dem Füllen in den Viewport (lazy/virtualisierte Formulare); Event-`view` stammt aus `ownerDocument` (iFrame-korrekt)
- **Robustes Ausfüllen**: priorisiertes `<select>`-Matching (exakter Wert/Label vor Teilstring — „DE" landet nicht in „Niederlande"), `<select multiple>` per Kommaliste, deutsches Dezimalkomma für Zahlenfelder („1.234,56" → `1234.56`), Werte werden auf `maxlength` gekappt

### History

- Agent-Verlaufspanel mit den letzten 30 Sitzungen (Domain, Titel, Feldanzahl, Datum)
- Per Klick loeschbar

### UI

- **Aurora-Glass-Design**: Violett→Fuchsia→Pink-Spektrum auf tiefem Glas (32px Blur + Film-Grain), rotierender Aurora-Leuchtrahmen um die Sidebar, animierte Aurora-Blobs im Action-Panel, Gradient-Wortmarke, KI-Orb-Avatare an jeder Antwort, rechtsbündige Gradient-Bubbles für Nutzer-Nachrichten, glühender Fortschrittsbalken, federnde Micro-Interaktionen (respektiert `prefers-reduced-motion`)
- **Sichtbare Fill-Choreografie**: Beim automatischen Ausfüllen pulst jedes befüllte Feld kurz grün und bekommt ein Häkchen (`✓`) eingeblendet — die Häkchen liegen in einem FX-Layer **im Shadow Root** (kein DOM-Leck auf die Host-Seite); die Deterministik-Vorfüllung staffelt die Häkchen visuell
- **Undo nach dem Agent-Lauf**: Vor jedem Agent-Fill wird der Feldzustand gesichert; nach dem Ausfüllen erscheint ein „N Felder ausgefüllt · Rückgängig"-Toast (6 s), der den gesamten Lauf per Klick zurücksetzt (Text-, Select-, Checkbox-, Radio- und Rich-Text-Felder) — Kontrolle bleibt beim Nutzer
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
| Vision-Modell (Dokument-Scan) | `meta-llama/llama-4-scout-17b-16e-instruct` | `meta-llama/llama-4-scout` (Fallback: `:free`) |

Vision-Requests schicken ihr eigenes Fallback-Modell mit (`fallbackModel` in der `llm-fetch`-Message), damit der automatische Groq→OpenRouter-Fallback nicht auf das text-only Standard-Fallback-Modell wechselt.

**Automatischer Fallback:** Wenn Groq mit 429 (Rate Limit) oder 5xx (Server-Fehler) antwortet und ein OpenRouter-Key gespeichert ist, wird die Anfrage automatisch ueber OpenRouter wiederholt. Der Nutzer sieht einen kurzen Toast.

Alle Requests laufen via `background.js` (Service Worker) als CSP-sicheres Routing. Der Service Worker unterstuetzt sowohl Streaming (`llm-stream` Port) als auch Non-Streaming (`llm-fetch` Message).

## Storage-Keys

| Key | Store | Inhalt |
| --- | --- | --- |
| `faProvider` | sync | `'groq'` oder `'openrouter'` |
| `faGroqApiKey` | sync | Groq API-Key |
| `faOpenRouterApiKey` | sync | OpenRouter API-Key |
| `faModel` | sync | Gewaehltes Modell |
| `faAssistantMode` | sync | `'classic'` (Standard, „Mit Vorschau") oder `'context'` |
| `faAutoNavigate` | sync | Boolean — „Automatisch weiterklicken" (Standard `true`) |
| `faSupabaseUrl` | sync | Supabase Project-URL (optionaler Sync) |
| `faSupabaseKey` | sync | Supabase Anon-Key (optionaler Sync) |
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

## Tests

Unit-Tests mit [Vitest](https://vitest.dev/) (jsdom) fuer die testbare Logik. Voraussetzung: Node.js.

```bash
npm install        # einmalig
npm test           # alle Tests einmal ausfuehren
npm run test:watch # Watch-Modus
npm run coverage   # Tests + Abdeckungsbericht (coverage/index.html)
```

- Tests liegen in `tests/unit/` (`fa-utils`, `fa-providers`, `fa-profile`, `fa-scanner`, `fa-prompts`, `fa-fill`, `fa-format`, `fa-actions`, `background`) — **188 Tests** (inkl. Live-Validierung IBAN/BIC/E-Mail/PLZ/Telefon/Geburtsdatum, Fehl-Match-Schutz, Shadow-DOM-Labels, Select-Priorität, ARIA-Combobox, Rich-Text, Aktions-Sanitizing inkl. Submit-Guardrail, SSE-Chunk-Pufferung, Prompt-Aufbau).
- `tests/setup.js` stellt die Module als Globals bereit (die Extension-Dateien sind klassische Skripte ohne `import`/`export`) und polyfillt jsdom-Luecken (`CSS.escape`, `offsetWidth`).
- Jede getestete Quelldatei hat am Ende einen `module.exports`-Shim, der im Browser (kein `module`) uebersprungen wird — die Extension-Laufzeit bleibt unveraendert.
- CI: `.github/workflows/test.yml` fuehrt die Suite bei jedem Push/PR aus (Regression).
- Bewusst nicht unit-getestet: Netzwerk-I/O, DOM-Orchestrierung in `content.js`, CSS-/HTML-Strings — Kandidaten fuer E2E, siehe `docs/reference/testing-plan.md`.

## Weitere Bestandteile

Neben dem Extension-Code liegen zwei bewusst **getrennte** Tooling-Ordner im Repo (sie fassen den Extension-Code nicht an):

- **`doc-agent/`** — autonomer Dokumentations-Agent (Kurs-Einheit 9). Python/Flask-Microservice via JSON-RPC: `git diff → LLM → Markdown`, schreibt `logs/actions.md` selbst; per `post-commit`-Hook nach jedem Commit ausloesbar. Details in [`doc-agent/README.md`](doc-agent/README.md).
- **`docs/` + `mkdocs.yml`** — Stakeholder-Projektwebseite (Kurs-Einheit 10, MkDocs Material), Auto-Deploy nach GitHub Pages via `.github/workflows/docs.yml`. Lokale Vorschau: `python -m mkdocs serve`.

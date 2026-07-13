# Entscheidungslog — FormAssist

---

## [2026-04-23] Entscheidung: Single-File statt Multifile-Architektur

**Kontext:**
Kollege hatte Multifile-Architektur (state.js, ui.js, api.js, bootstrap.js, content.css). Claude-Version ist ein einzelnes content.js.

**Entscheidung:**
Single-File (`content.js`) mit Shadow DOM wird als aktive Architektur verwendet. Die alten Multifile-Dateien wurden inzwischen entfernt.

**Alternativen:**

- Multifile übernehmen: mehr Trennung, aber kein Shadow DOM, weniger Kontext-Intelligenz
- Multifile + Shadow DOM refactorn: möglich, aber aufwändiger ohne klaren Mehrwert

**Konsequenzen:**

- Multifile-Dateien wurden entfernt
- README beschreibt jetzt den aktiven Stand

---

## [2026-04-23] Entscheidung: Shadow DOM für UI-Isolation

**Kontext:**
Content Scripts die direkt ins DOM injizieren bekommen CSS-Konflikte mit der Host-Seite (Bootstrap, Tailwind, custom CSS).

**Entscheidung:**
Gesamter UI-Code in Shadow DOM (`attachShadow({ mode: 'open' })`). Styles sind vollständig isoliert.

**Alternativen:**

- iFrame: stärkere Isolation, aber Kommunikation mit Host-Page komplizierter
- CSS-Präfix-Namespacing: fehleranfällig, unvollständige Isolation

**Konsequenzen:**

- Google Fonts müssen via `<link>` in den Shadow Root geladen werden (nicht via @import im Stylesheet)
- `document.getElementById` aus Shadow DOM heraus funktioniert nicht — eigenes `$()` helper via `shadow.getElementById`

---

## [2026-04-23] Entscheidung: Groq statt Anthropic/Gemini

**Kontext:**
User lief in Credit Limits mit Anthropic API (claude-opus-4-5, teures Modell). Wechsel zu Gemini (kostenlos), dann zu Groq.

**Entscheidung:**
Groq mit `llama-3.1-8b-instant` — kostenloser Free Tier, sehr schnell, OpenAI-kompatible API.

**Alternativen:**

- Anthropic Haiku: günstiger als Opus, aber nicht kostenlos
- Gemini Flash: kostenlos, aber Groq schneller und simpler API-Format

**Konsequenzen:**

- API-Format ist OpenAI-kompatibel (messages array, choices[0].message.content)
- Free Tier: 14.400 Req/Tag, 500K Tokens/Tag — ausreichend für Prototyp
- Standard-Modell inzwischen auf `llama-3.3-70b-versatile` gewechselt

---

## [2026-04-23] Entscheidung: API-Key nicht hardcoden (historisch)

**Kontext:**
User wollte Key hardcoden. GitHub Push Protection blockierte den Push mit detektiertem Groq-Key in content.js.

**Entscheidung (damals):**
Key wurde aus dem Code ausgelagert, um Push-Protection-Blocker zu umgehen.

**Status heute:**
Abgelöst durch Optionen-Seite + `chrome.storage.sync`.

---

## [2026-04-30] Entscheidung: Profile-System mit strukturierten PROFILE_FIELDS

**Kontext:**
Auto-Fill brauchte eine systematische Felderkennung. PROFILE_FIELDS mit Keywords und autocomplete-Attributen erlauben intelligentes Matching.

**Entscheidung:**
Standard-Profilfelder werden strukturiert mit Keywords, Autocomplete-Werten und Labels definiert. `matchProfile()` matched Formularfelder dagegen. `FAKE_DATA` bleibt für Prototyping.

**Alternativen:**

- Machine Learning/NLP: zu komplex für Prototyp
- Nur Autocomplete-Matching: zu ungenau, viele Felder nutzen es nicht

**Konsequenzen:**

- Auto-Fill funktioniert auf vielen Formularen ohne AI-Hilfe
- Neue Felder können leicht hinzugefügt werden

---

## [2026-05-07] Entscheidung: faExtras als separater Storage-Key

**Kontext:**
Felder wie "Webseite", "Steuernummer", "Fax" passen nicht in PROFILE_FIELDS.

**Entscheidung:**
`faExtras` als separater `chrome.storage.local`-Key. Schema: `{ "Webseite": "https://...", "Fax": "+49 ..." }`.

**Konsequenzen:**

- faExtras ist einfach zu lesen, zu schreiben und anzuzeigen
- `matchExtras()` macht fuzzy-matching damit leicht abweichende Labels trotzdem treffen
- Profil-Panel zeigt beides getrennt — klare UX-Trennung

---

## [2026-05-14] Entscheidung: Action-Panel-First UI (Google-Gemini-Paradigma)

**Kontext:**
Research in Google's Gemini/Workspace AI-Muster zeigte: Action-fokussierte Sidepanels (suggest → interact → insert) übertreffen Chat-Interfaces für Form-Filling-Tools.

**Entscheidung:**
Umbau von Chat-first auf Action-Panel-first. Großer Primär-Button oben, Chat visuell sekundär.

**Konsequenzen:**

- `quick-strip` entfernt, durch Action Panel ersetzt
- `greet()` / `hasGreeted` durch `updateActionPanel()` ersetzt
- Feldliste jetzt im Action Panel (aufklappbar), nicht im Chat

---

## [2026-05-15] Entscheidung: Field-by-Field Agent statt Konfidenz-Schwelle

**Kontext:**
Ursprünglich (2026-05-14): Batch-Prompt mit `GUIDED_MIN_CONFIDENCE = 0.6` — Felder unter der Schwelle wurden zu `ask`-Aktionen. Problem: Beim Batch-Prompt ignorierte das Modell `extras`/gelernte Felder und lieferte ungenaue Vorschläge weil der Kontext zu groß war.

**Entscheidung (2026-05-15, ersetzt den alten Ansatz):**
`GUIDED_MIN_CONFIDENCE` entfernt. Stattdessen `runFieldByFieldAgent()` im Automatisch-Modus (`context`):

1. Pro Feld: zuerst `sessionAnswers` + `extras` per exaktem Label-Match — kein API-Call
2. Nur für wirklich unbekannte Felder: einzelner `groqRequest` (Non-Streaming, max_tokens 80) mit fokussiertem Kontext-Block
3. KI antwortet `?` oder leer → `ask`-Aktion mit `selector` in Queue (kein Batch-Re-Run)
4. Nach allen Feldern: offene Fragen stellen, dann Navigation

**Alternativen:**

- Konfidenz-Schwelle beibehalten: Modell nutzte Extras trotzdem nicht zuverlässig, da Batch-Kontext zu groß
- Immer fragen: zu viele Unterbrechungen
- Nur Profil (kein KI-Fallback): zu viele leere Felder bei unbekannten Formularen

**Konsequenzen:**

- `extras` und gelernte Felder werden jetzt zuverlässig per Label-Match direkt gefüllt
- KI-Prompts pro Feld fokussierter und präziser (kleiner Kontext statt große Feldliste)
- `sessionAnswers` verhindert weiterhin Doppel-Fragen auf Folgeseiten

---

## [2026-05-14] Entscheidung: Mehrere Profile als Array (faProfiles)

**Kontext:**
Single-Profile-System reichte nicht aus für Nutzer mit mehreren Identitäten (privat/geschäftlich, Familienmitglieder).

**Entscheidung:**
`faProfiles` als Array `[{id, name, profile, extras}]`. In-place mutation der aktiven `profile`/`extras`-Objekte damit alle bisherigen Code-Pfade unverändert bleiben.

**Konsequenzen:**

- Migration: erstes Start legt "Hauptprofil" aus Legacy-`faProfile` an
- Switcher-UI mit `+`/`×`-Buttons im Profil-Panel
- Import/Export als JSON pro Profil

---

## [2026-05-15] Entscheidung: OpenRouter als automatischer Fallback

**Kontext:**
Groq hat ein Rate Limit (429) und gelegentliche Backend-Fehler (503 "Provider returned error"). OpenRouter bietet kostenlose Modelle als Backup. User: "open router habe ich nur als backup eingebaut, wenn groq das limit erreicht hat".

**Entscheidung:**
background.js fängt Groq 429 **und** 5xx nach allen Retries ab und wiederholt die Anfrage automatisch via OpenRouter (`meta-llama/llama-3.3-70b-instruct:free`). Toast im Sidebar informiert den Nutzer.

**Alternativen:**

- Nur 429 (Rate Limit): ursprüngliche Anforderung, aber 503 ist ebenso ein Nutzerproblem
- Reverse-Fallback (OpenRouter → Groq): nicht gewünscht, nicht implementiert

**Konsequenzen:**

- Modell-IDs ohne `/` (Groq-spezifisch) werden beim Fallback automatisch ersetzt
- `_onProviderFallback`-Callback verbindet background.js-Signal mit `showToast()` im UI
- `OPENROUTER_MODEL_REMAP` in background.js normalisiert Legacy-IDs (`openrouter/free` → `openrouter/auto`)

---

## [2026-06-11] Entscheidung: Batch-AI-Call + Design-System 2.0

**Kontext:**
Der Field-by-Field-Agent machte 1 API-Call pro unbekanntem Feld (langsam, Rate-Limit-anfällig). UI sah nach Google-Material aus, sollte moderner werden.

**Entscheidung:**

1. **Batch-Agent:** Unbekannte Felder werden in Chunks à 12 mit EINEM JSON-Prompt gefüllt (`{"1":"Wert","2":"?"}`). Bei Parse-Fehler: Einzelfeld-Fallback (alte Logik). Deterministische Phase (Profil/Extras/SessionAnswers) bleibt vorgelagert — damit bleibt die Kernerkenntnis vom 2026-05-15 (Extras zuverlässig per Label-Match) erhalten.
2. **Fuzzy-Label-Match:** `labelsRoughlyMatch()` (exakt → Containment → Token-Overlap ≥ 60 %) für Extras/SessionAnswers — weniger Rückfragen auf Folgeseiten.
3. **Loop-Schutz:** `AGENT_MAX_PAGES = 12`, Seitenzähler wandert durch `faAgentResume.pages`.
4. **Design 2.0:** fa-styles.js komplett neu — Indigo/Violett-Gradient, Inter statt Roboto, schwebende Glas-Sidebar (backdrop-filter, 24px Radius, 14px Inset), Trigger-Badge mit Feldanzahl, Shine-Animation auf Primär-Button. Alle Klassennamen unverändert (kein JS-Bruch). options.html auf gleiche Tokens umgestellt. Version 2.0.

**Konsequenzen:**

- Formular mit 12 unbekannten Feldern: 1 API-Call statt 12 → deutlich schneller
- Agent-Status zeigt Live-Fortschritt (`Agent läuft… 4/12`)
- Abschlussmeldung via `agentDoneMessage()` (Felder + Seitenanzahl)

---

## [2026-06-11] Entscheidung: Aurora-Glass-UI (finales Design)

**Kontext:**
Das am selben Tag eingeführte „Design 2.0" (Indigo/Violett-Gradient) wurde im selben Commit (`d441205`, „Aurora Glass UI") nochmals zu einem ausdrucksstärkeren Glas-Look weiterentwickelt. Diese Iteration ist der aktuell ausgelieferte Stand und löst die Indigo-Beschreibung oben ab.

**Entscheidung:**
`fa-styles.js` auf ein Aurora-Glass-Design umgestellt:

- Violett→Fuchsia→Pink-Spektrum auf geschichtetem, tiefem Glas (`backdrop-filter: blur(32px) saturate(1.7)`)
- Rotierender Aurora-Leuchtrahmen um die Sidebar + Film-Grain-Overlay für „Premium Glass"
- Animierte Aurora-Blobs im Action-Panel (`@keyframes fa-aurora-a/-b`)
- KI-Orb-Avatare an jeder Antwort (`@keyframes fa-orb`), rechtsbündige Gradient-Bubbles für Nutzer-Nachrichten, glühender Fortschrittsbalken
- Alle Klassennamen unverändert (kein JS-Bruch); `@media (prefers-reduced-motion: reduce)` respektiert
- Version bleibt 2.0

**Konsequenzen:**

- README beschreibt das Aurora-Glass-Design als aktuellen UI-Stand
- Die „Indigo/Violett"-Beschreibung im Design-2.0-Eintrag oben ist nur noch der Zwischenstand desselben Tages

---

## [2026-06-14] Entscheidung: Deployment für den Extension-Case erlassen

**Kontext:**
Die Kurs-Anforderung „Prototyp über eine Plattform bereitgestellt" (Einheit 5) zielt auf Web-Apps (Vercel/Render). FormAssist ist eine Chrome-Extension (Client-Code) ohne eigenen Server.

**Entscheidung:**
Mit Prof. Dünnebeil abgestimmt: klassisches PaaS-Deployment ist für diesen Case nicht erforderlich. Supabase deckt den Managed-Plattform-Aspekt teilweise ab. In der Abschlussreflexion als bewusste Architektur-Entscheidung darstellen.

**Konsequenzen:**

- Deployment wird nicht mehr als offene Lücke geführt
- Verbleibende Pflicht-ToDos: ausführbare Tests (Einheit 8), Dokumentations-Agent (Einheit 9)

---

## [2026-06-14] Entscheidung: Projektstand.md als zentrales PM-Dokument

**Kontext:**
Projektmanagement-Inhalte waren über mehrere Dateien verteilt (`Ideas`, `NEXT_STEPS.md`); der Status war nirgends nach Kurseinheiten abgeglichen.

**Entscheidung:**
`Projektstand.md` als einzige PM-Quelle: Vision, Statusübersicht nach Kurseinheiten (gegen „Wo Sie stehen sollten"), Benotung, Roadmap/Backlog. `Ideas` und `NEXT_STEPS.md` darin konsolidiert und entfernt.

**Konsequenzen:**

- README bleibt Produkt-/Technik-Doku, `Projektstand.md` ist der PM-Hub
- `TESTING_PLAN.md` (technisch) bleibt separat; `PPT_BRIEFING.md` wurde in derselben Aufräumrunde entfernt (siehe nächste Entscheidung)

**Nachtrag 2026-07-05 (Doku-Struktur):** Der PM-Hub wurde aus dem Repo-Root nach
`docs/reference/projektstand-vollstaendig.md` verschoben. `docs/projektstand.md` ist nur noch
die kurze Website-Zusammenfassung. Der Testing-Plan liegt jetzt als
`docs/reference/testing-plan.md`.

---

## [2026-06-14] Entscheidung: Ordnerstruktur + Kursfolien aus dem Repo

**Kontext:**
Das Wurzelverzeichnis war mit Doku-, Präsentations- und Kursfoliendateien überladen.

**Entscheidung:**
Kursfolien und der Zwischenpräsentations-PDF liegen in `vorlesung/` (via `.gitignore` ausgeschlossen — nicht im Repo). Präsentations-Quellen (`.pptx`, `.docx`, `PPT_BRIEFING.md`) wurden entfernt; nur der PDF-Foliensatz bleibt lokal. Extension-Quellcode bleibt im Root (MV3 erwartet `manifest.json` im Lade-Ordner). `.venv` (Python-Überbleibsel) entfernt.

**Alternativen:**

- Quellcode nach `src/`: verworfen — Bruch-Risiko an Manifest-Pfaden/Ladereihenfolge, kein Mehrwert

**Konsequenzen:**

- `.gitignore`: Kursfolien-Ordner `vorlesung/` ignoriert, `.venv/`; `memory/` + `logs/` bewusst getrackt (Kurs-Anforderung Agent-Transparenz)

---

## [2026-06-14] Entscheidung: Test-Setup (Vitest + CI) + Icons-Ordner

**Kontext:**
Kurs-Einheit 8 fordert „relevante Tests identifiziert und in die Entwicklung eingebunden". Die Extension-Dateien sind klassische Content-Scripts ohne Modulsystem (globaler Scope, feste Manifest-Ladereihenfolge).

**Entscheidung:**

- Vitest (jsdom) als Test-Runner; Tests in `tests/unit/` für die pure/DOM-nahe Logik (`fa-utils`, `fa-profile`, `fa-scanner`, `fa-fill`, `background`).
- Pro getesteter Quelldatei ein browser-sicherer `module.exports`-Shim am Dateiende statt Umbau auf ES-Module.
- `chrome.*`-Listener in `background.js` gegen fehlendes `chrome` im Node-Kontext gekapselt.
- `tests/setup.js` polyfillt jsdom-Lücken (`CSS.escape`, `offsetWidth`) und stellt Cross-Modul-Globals bereit.
- GitHub Actions (`.github/workflows/test.yml`) führt die Suite bei jedem Push aus.
- Icons von Root nach `icons/` verschoben (entzerrt das Root; nur Manifest-Pfade betroffen).

**Alternativen:**

- Umbau auf ES-Module: verworfen — bricht klassisches Content-Script-Laden + Reihenfolge (vgl. Entscheidung gegen `src/`).
- E2E (Playwright) statt Unit: höherer Aufwand, für die Pflicht nicht nötig (Kür, in `docs/reference/testing-plan.md`).

**Konsequenzen:**

- 60 Tests grün, Branch-Coverage ~77 % der Logik-Module; `npm test` / `npm run coverage`. (Stand 2026-06-14 auf 69 Tests erweitert — `fa-profile`-Suite ergänzt.)
- Neu: `package.json`, `vitest.config.js`, `tests/`, `.github/workflows/test.yml`, `node_modules/` + `coverage/` (gitignored).
- Einheit 8 erfüllt; offen bleibt als Pflicht nur der Dokumentations-Agent (Einheit 9).

---

## [2026-06-14] Entscheidung: DocumentationAgent als separater Python-Service (Einheit 9)

**Kontext:**
Einheit 9 (Orchestrierung) fordert „einen eigenen Agenten für die Dokumentation". Die Vorlesungsfolie zeigt das Rollen-Lineup (Orchestrator/Planning/Coding/Testing/**Documentation**) und schlägt Bereitstellung als Microservice (Flask/FastAPI) via JSON-RPC vor (`http://localhost:8010/jsonrpc → DocumentationAgent`). Vorlagen-Flow: `git diff → LLM → Markdown`.

**Entscheidung:**
Eigener Ordner `doc-agent/` mit einem Flask-Service (`agent.py`), JSON-RPC 2.0, Methoden `document_changes` + `agent_card`, LLM-Transport `llm.py` (Groq primär, OpenRouter Fallback — spiegelt `background.js`). **Autonom:** Default `write=true` — der Agent hängt den erzeugten Eintrag selbst an `logs/actions.md` an (Format der Datei), kein manuelles Copy-Paste. Zusätzlich CLI-Einzellauf `python agent.py --once` für Demo.

**Alternativen:**

- In die Extension integrieren: verworfen — Extension ist Client-Code ohne Server; widerspricht „Microservice"-Vorlage und der Vanilla-JS-Regel.
- Nur Markdown zurückgeben (kein Schreiben): verworfen — „Agent soll autonom sein" (Nutzer), echtes Schreiben gehört zur Rolle.

**Konsequenzen:**

- Python neben der JS-Extension, aber sauber getrennt in `doc-agent/`; Extension-Code unangetastet (CLAUDE.md-Regel gewahrt).
- Key über Umgebung/`doc-agent/.env` (gitignored), nie im Code — gleiche Sicherheitslinie wie die Extension.
- Guardrails: schreibt nur innerhalb des Repos, nur anhängend, nie ohne erkannte Änderung.
- Einheit 9 erfüllt; aus den behandelten Einheiten ist keine Pflicht mehr offen.

**Nachtrag (Orchestrierung):** `post-commit`-Git-Hook ruft den laufenden Server nach jedem Commit → Selbst-Dokumentation. Hook nicht versioniert (`.git/hooks/`), daher Vorlage als `doc-agent/post-commit` im Repo + Installationsschritt in `doc-agent/README.md`. Caveat: Diff wird bei ~14000 Zeichen gekürzt — sehr große Commits werden nur teilweise zusammengefasst.

---

## [2026-06-18] Entscheidung: Stakeholder-Projektwebseite mit MkDocs Material (Einheit 10)

**Kontext:**
Einheit 10 (Stakeholder-Interaktion) fordert eine „Projektwebseite für Stakeholder". Die Folien empfehlen MkDocs + GitHub Pages + PlantUML und geben die drei Stakeholder vor: Professor (Bewertung), Nutzer (Nutzung), Arbeitgeber (Kompetenz/Bewerbungsreferenz).

**Entscheidung:**
`docs/` + `mkdocs.yml` mit **MkDocs Material**, Struktur entlang der drei Stakeholder (Übersicht, Für Nutzer, Technische Architektur, Entwicklung & Qualität, Entscheidungen & Kompetenzen, Projektstand & Reflexion). Inhalte strikt aus dem Repo abgeleitet, Unsicheres mit `TODO: fachlich klären`. **Mermaid statt PlantUML** für das Architekturdiagramm (in Material eingebaut, kein Extra-Binary). **Auto-Deploy via GitHub Actions** (`.github/workflows/docs.yml`, offizielle Pages-Action) statt `gh-deploy`.

**Alternativen:**

- Fork zum eigenen Account + dort deployen: möglich (volle Kontrolle), aber das Team will alles im einen Repo `ujjwalmak/...`.
- PlantUML: vom Prof genannt, aber Mermaid ist leichter und ohne Server/Java nutzbar.

**Konsequenzen:**

- Webseite deckt zugleich den Deployment-Aspekt (E5) als deploytes Artefakt mit ab — stärkt die Reflexion.
- Erledigt (2026-06-26): GitHub Pages aktiviert (Source = „GitHub Actions") — Webseite live unter ujjwalmak.github.io/form-ai-assistant. Offen nur noch optional: Screenshots ergänzen.
- Neue Dateien: `mkdocs.yml`, `docs/`, `requirements-docs.txt`, `.github/workflows/docs.yml`; `site/` gitignored; Run-Button „Webseite: Vorschau".

---

## [2026-07-05] Entscheidung: Demo-Feature-Paket v2.1 — deterministisch vor KI, Vision mit Consent

**Kontext:**
Prototyp-Demo am 09.07. Drei Backlog-Ideen wurden umgesetzt: Live-Validierung beim Tippen, erweiterte Pre-Submit-Logikprüfung, Dokument-Scan (Vision-OCR).

**Entscheidung:**

1. **Live-Validierung ist rein deterministisch** (`fa-utils.js`: IBAN mod-97 + Länder-Sollängen, BIC, E-Mail, PLZ, Telefon, Geburtsdatum) — kein KI-Call beim Tippen. Beim Tippen tolerant (unvollständige Werte → keine Aussage), bei `blur` streng (`final: true`).
2. **Deterministische Ergebnisse füttern die KI**: Der Submit-Review-Prompt bekommt sie als "Lokale Prüfung"-Fakten; die KI prüft zusätzlich Feld-übergreifende Logik (Logik-Check-Überschrift).
3. **Vision-OCR mit Privacy-Gate**: Bild wird clientseitig auf max. 1400 px verkleinert (Datenminimierung), vor dem Senden expliziter Bestätigungsschritt mit Provider-Nennung, erkannte Werte nur vorbefüllt (`pf-scanned`) — gespeichert wird erst per "Speichern".
4. **Vision-Modelle**: Groq `meta-llama/llama-4-scout-17b-16e-instruct`, OpenRouter `meta-llama/llama-4-scout` (IDs am 05.07.2026 gegen Groq-/OpenRouter-Doku verifiziert). Vision-Requests schicken ein eigenes `fallbackModel` (`meta-llama/llama-4-scout:free`) mit, weil der automatische Groq→OpenRouter-Fallback sonst auf das text-only Standard-Modell wechseln würde (`resolveFallbackModel` in `background.js`).
5. **Kein Voice-Input** für die Demo: Mikrofon-Berechtigungen sind in Live-Demos ein vermeidbares Risiko.

**Alternativen:**

- Live-Validierung per KI-Call: teurer, langsamer, halluzinationsanfällig — Prüfsummen sind mathematisch, dafür braucht es kein LLM
- Validatoren als neues Modul `fa-validate.js`: hätte die fixe Manifest-Ladereihenfolge angefasst — Validatoren sind Hilfsfunktionen und passen in `fa-utils.js`
- Vision-Scan ohne Bestätigungsschritt: schnellere UX, aber Ausweisbilder ohne expliziten Consent an einen LLM-Provider zu senden widerspricht der Datenminimierungs-Regel in `CLAUDE.md`

**Konsequenzen:**

- `fa-utils.js` + 29 neue Unit-Tests (Suite: 98 grün, Branch-Coverage ~80 %), `manifest.json` v2.1
- Neue UI-Elemente: `fa-live-check`-Badge (input-area), `fa-pf-scan`-Box (Profil-Panel) — beides im Shadow Root, Styles in `FA_CSS`
- `llm-fetch`-Message unterstützt optionales `fallbackModel`; Storage-Keys unverändert

---

## [2026-07-05] Entscheidung: Robustheits-Paket — Wortanfang-Matching, Root-korrekte Lookups, priorisiertes Select-Matching

**Kontext:**
Ziel "funktioniert auf allen Webseiten, keine Fehl-Befüllungen". Analyse fand fünf Lückenklassen: (1) Label-/Hint-/Error-Suche lief über `document` und scheiterte in Shadow DOM/iFrames, (2) verschachtelte Shadow Roots wurden nicht gescannt, (3) Substring-Keyword-Matching erzeugte Fehl-Matches ("Hotelname"→Telefon, "Sportart"/"Passwort"→Stadt — auch beim dauerhaften **Lernen** ins Profil), (4) Select-Matching nahm den ersten Teilstring-Treffer, (5) Tabellen-Label, Dezimalkomma und maxlength fehlten.

**Entscheidung:**

1. **Root-korrekte DOM-Lookups**: `byIdInRoot(el, id)` + `el.getRootNode()` für label[for], aria-labelledby/-describedby/-errormessage und Radio-Gruppen (fa-scanner, fa-fill, content.js); `isVisible` nutzt `ownerDocument.defaultView`. Shadow-Root-Scan rekursiv (`collectShadowRoots`, Tiefenlimit 6).
2. **Wortanfang- statt Substring-Matching** für Profil-Keywords (`labelHasKeyword`): Keyword muss an Position 0 oder nach einem Nicht-Buchstaben beginnen. Gilt in `matchProfile` UND `learnAgentFields` (dort verhinderte es dauerhafte Profil-Korruption). Passwortfelder sind komplett ausgeschlossen.
3. **Kuratierte Compound-Keywords** statt Substring-Toleranz: `mobil`, `rufnummer` (Telefon), `wohnort` (Stadt), `geboren` (Geburtsdatum) — deckt deutsche Komposita ab, die das strengere Matching sonst verlieren würde.
4. **Priorisiertes Select-Matching** (`findSelectOption`): exaktes Label/Value → Wortanfang → enthält (erst ab 3 Zeichen) → umgekehrtes Enthalten. Plus `<select multiple>` per Kommaliste, deutsches Dezimalkomma für `type=number`, `maxlength`-Kappung, Tabellenzellen-Label-Fallback.

**Alternativen:**

- Fuzzy-/Levenshtein-Matching für Labels: mächtiger, aber schwer erklärbar und mit eigenen False-Positives — Wortanfang + kuratierte Keywords sind deterministisch und testbar
- Substring-Matching behalten und Blocklist pflegen ("hotel", "sport", …): Whack-a-Mole, skaliert nicht
- Closed Shadow Roots / Cross-Origin-iFrames: technisch nicht zugänglich — bleibt dokumentierte Grenze in `known_issues.md`

**Konsequenzen:**

- 20 neue Unit-Tests (Fehl-Match-Schutz, Shadow-Labels, Tabellen-Labels, Select-Priorität, Dezimalkomma, maxlength, Multi-Select, verschachtelte Shadow Roots) — Suite: 118 grün
- `extractRichContext` ist jetzt exportiert und testbar
- Verhalten leicht strenger: Felder, die vorher nur per Substring-Zufall matchten, gehen jetzt an die KI statt ans Profil (gewollt: lieber fragen als falsch füllen)

---

## [2026-07-05] Entscheidung: Rückfragen nur bei Pflichtfeldern ("lieber leer lassen als fragen")

**Kontext:**
Der Field-by-Field-Agent stellte für JEDES Feld ohne ableitbaren Wert eine Chip-Frage ("Was soll ich bei "Middle Name" eintragen?"). Bei langen Formularen mit vielen optionalen Feldern wurde das als nervig empfunden (Nutzer-Feedback 05.07.).

**Entscheidung:**
`ask` wird nur noch erzeugt, wenn das Feld **Pflichtfeld** ist oder die Seite es als **ungültig** markiert (Korrektur-Runde/Manual-Assist unverändert — ungültige Felder blockieren den Submit). Unbekannte optionale Felder werden still leer gelassen (`agentState.skippedOptional`), im Agent-Log mit "·" markiert und in `agentDoneMessage()` als EIN Sammelhinweis genannt ("… leer gelassen: „Middle Name", … — sag mir einfach, was ich dort eintragen soll"). Dieselbe Regel steht jetzt im Vorschau-Modus-Prompt (action="ask" NUR Pflichtfelder).

**Alternativen:**

- Alle Fragen am Ende bündeln, aber trotzdem stellen: weiterhin N Interaktionen, löst das Problem nicht
- Einstellbare Option ("Auch Optionales erfragen"): mehr UI-Komplexität ohne erkennbaren Bedarf; der Sammelhinweis hält den Weg offen (Chat-Antwort füllt das Feld direkt)

**Konsequenzen:**

- Formulare ohne `required`-Markierung: Agent fragt zunächst nichts; blockierende Felder fallen bei der Navigation auf (checkValidity/Seitenfehler → Korrektur-Runde → gezielte Frage). Bewusster Trade-off.
- `getUnresolvedFieldCandidates()` (Manual-Assist) fragte schon immer nur Pflicht/ungültig — Verhalten ist jetzt konsistent.

---

## [2026-07-07] Entscheidung: Custom-Widget-Support — ARIA-Comboboxen & contenteditable, Option-Klick statt Enter

**Kontext:**
Ziel "Agent funktioniert auf jeder Seite / jedem Formular". Größte verbleibende Lücke: moderne Framework-Widgets ohne native Elemente — React-Select/MUI/Headless-UI-Dropdowns (`role="combobox"`) und Rich-Text-Editoren (`contenteditable`) wurden weder erkannt noch befüllt.

**Entscheidung:**

1. **Erkennung in `fa-utils`** (`isAriaCombobox`, `isRichTextField`), damit Scanner UND Fill dieselbe Definition nutzen (Layering: utils → scanner → fill). Scanner erfasst beide Typen (`combobox`/`richtext`) inkl. Wert-Lesen über `textContent`.
2. **Combobox-Füllen** (`fillAriaCombobox`, async): Wert tippen (INPUT) bzw. Widget per Klick öffnen (div), bis 350 ms auf die Options-Liste warten (`aria-controls`/`aria-owns`, sonst Portale unter `document.body`), besten Treffer mit derselben Prioritätslogik wie `findSelectOption` wählen und per realistischer Event-Sequenz (pointerdown→mousedown→mouseup→click) anklicken.
3. **Bewusst KEIN synthetisches Enter** als Fallback: Site-JS könnte Enter als Submit interpretieren — verletzt die "niemals automatisch absenden"-Guardrail. Ohne Treffer: Escape (Liste schließen), getippter Text bleibt stehen, Korrektur-Runde/Rückfrage fängt den Rest.
4. **`fillField` bleibt synchron für native Felder, liefert für Comboboxen ein Promise** — alle Stellen mit Sofort-Verifikation (`isActionApplied`) await'en jetzt (`applyAgentValue`, `fillFieldVerified`, Chat-/Guided-/Agent-Executor, Korrektur-Runde).
5. **Framework-treues Füllen**: focus vor dem Setzen, blur danach (löst on-blur-Validierung aus → Korrektur-Runde sieht Fehler sofort); Agent scrollt jedes Feld vor dem Füllen in den Viewport (lazy/virtualisierte Formulare); Event-`view` aus `el.ownerDocument.defaultView` statt `window` (Bug wäre in iFrames aufgetreten — im jsdom-Test entdeckt). Während Agent-Läufen sind Fokus-Tipp und Einzelfeld-KI-Fehlerhilfe deaktiviert (`agentState.active`-Guards) — die Korrektur-Runde übernimmt.

**Alternativen:**

- Keyboard-Simulation (ArrowDown+Enter) statt Option-Klick: verbreitet, aber Enter-Risiko (Submit) und fragiler bei virtualisierten Listen
- `dispatchEvent(new Event('click'))` statt Maus-Sequenz: React-Select reagiert auf mousedown — einfacher Click reicht nachweislich nicht
- contenteditable nur per `textContent`: zerstört den internen State von ProseMirror/Slate — `execCommand('insertText')` zuerst, `textContent` als Fallback

**Konsequenzen:**

- +15 Unit-Tests (Detektoren, `pickOptionByText`, Combobox-Fill mit/ohne Treffer, MUI-div-Muster, Rich-Text, Scanner-Erfassung) — Suite: 133 grün, Branch-Coverage ~77 %
- `fillField`-Aufrufer ohne Verifikation (z. B. Autofill-Tipp) funktionieren unverändert (Promise wird ignoriert, Wert ist synchron gesetzt)
- Grenzen unverändert dokumentiert: closed Shadow Roots, Cross-Origin-iFrames, nativer PDF-Viewer

---

## [2026-07-13] Entscheidung: Abgabe-Refactoring v2.2 — Modul-Split von content.js

**Kontext:**
`content.js` war auf ~3 800 Zeilen gewachsen; ~97 % des Codes lagen in zwei verschachtelten `chrome.storage`-Callbacks (Mega-Closure). Provider-Konfiguration existierte 3-fach (content/background/options), Prompt-Builder und Parser waren nicht unit-testbar. Vor der Kursabgabe sollte der Code den eigenen Architektur-Regeln („jede Datei ein Zweck") wieder genügen — ohne Build-Step, ohne Verhaltensänderung.

**Entscheidung:**

1. **5 neue Module** im bestehenden Muster (klassische Skripte, globaler Scope, `module.exports`-Shim): `fa-providers` (Provider-/Modell-Konfiguration als Single Source of Truth — via content_scripts, `<script>` in options.html und `importScripts()` im Service Worker geteilt), `fa-prompts` (alle LLM-Kontrakte, mit expliziten Parametern statt Closure-Zugriff), `fa-format` (escapeHtml/renderMarkdown), `fa-actions` (Aktions-Whitelist, tolerante JSON-Parser, SSE-Decoder mit Zeilenpuffer), `fa-templates` (`FA_HTML`, Gegenstück zu `FA_CSS`).
2. **content.js entschachtelt**: IIFE + `async function init()` mit `await chrome.storage.*.get()` (MV3-Promise-API) statt Callback-Pyramide — Logik identisch, Closure bleibt.
3. **Bugfix**: Profil-Import schrieb nur die Legacy-Keys `faProfile`/`faExtras` → Import war nach Reload weg; jetzt über `saveActiveProfileToStore()` (schreibt `faProfiles` + Supabase-Push).
4. **Privacy/Permissions**: Google-Fonts-`<link>` aus dem Content-Script entfernt (Request an Google auf jeder besuchten Seite); `activeTab` aus dem Manifest entfernt (Command-Relay braucht nur `tabs.query`→`tab.id` + `tabs.sendMessage`, beides permissionsfrei).

**Alternativen:**

- Kompletter Umbau auf explizites State-Objekt statt Closure: mehr „Lehrbuch", aber hohes Regressionsrisiko kurz vor Abgabe — verworfen.
- ES-Module + Bundler: verletzt die „kein Build-Step"-Grundregel des Projekts.

**Konsequenzen:**

- Suite von 133 auf **188 Tests** ausgebaut (fa-providers/format/actions/prompts sind jetzt direkt testbar, 4 Module mit 100 % Coverage); Playwright-Smoke-Test mit echter geladener Extension gegen die Test-Site als Abnahme.
- `praesentation/` (Folien, Fonts, Sprecherzettel, ~23 MB) aus der Versionierung entfernt — nicht Teil der bewerteten Codebasis.
- Version einheitlich **2.2.0** (manifest/package/ZIP); `docs/download/formassist-v2.2.zip` neu gebaut.

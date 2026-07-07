# Action Log — FormAssist

---

## [2026-04-23] Session Checkpoint

**Ziel:**
FormAssist von einem hardcodierten Single-Page-HTML-Prototypen zu einer vollwertigen Chrome Extension weiterentwickeln.

**Aktionen:**

1. `form-ai-assistant.html` analysiert — Anthropic-API-basierter Formular-Assistent für Wohnsitzummeldung
2. README.md und requirements.txt erstellt, initialer Git-Commit und Push
3. API-Backend migriert: Anthropic Claude → Gemini 2.0 Flash → Groq llama-3.1-8b-instant
4. Merge der besten Teile beider Codelinien in `content.js` (Shadow DOM + Drag + Resize + Feldliste + History)
5. GitHub Push Protection blockierte hardcodierten Key → Key in `api-key.txt` ausgelagert
6. Minimize-Bug behoben (inline-style-Überschreibung)

**Ergebnis:**

- Chrome Extension (MV3) produktionsbereit für lokalen Einsatz
- KI versteht Formular-Kontext semantisch (nicht nur HTML-Scanner)
- Kein hardcodierter Key im Repository

---

## [2026-04-30] Cleanup + Profil-System

**Ziel:**
Verwaiste Multifile-Dateien entfernen, Profil-System mit strukturierter Felderkennung einbauen.

**Aktionen:**

1. `api.js`, `bootstrap.js`, `content.css`, `state.js`, `ui.js`, `icon128.svg` entfernt
2. `PROFILE_FIELDS` — 15 Standard-Profilfelder mit Keywords und Autocomplete-Werten
3. `matchProfile()` + `matchExtras()` — lokales Matching vor KI-Call
4. `fillField()` — robuste Feldwert-Einfügung (SELECT, Checkbox, Radio, Text)
5. Dark Mode via CSS Custom Properties
6. README und Doku auf bereinigten Stand gebracht

---

## [2026-05-07] Agent Auto-Fill — Live Sequential Mode

**Ziel:**
Semi-autonomen KI-Agenten bauen, der Formulare live ausfüllt.

**Aktionen:**

1. `agentFill()` — KI schickt Aktionsplan als JSON-Array, User sieht Vorschau
2. `faExtras` — neuer Storage-Key für gelernte Freitext-Felder
3. Zwei-Phasen-Matching: Profil → Extras → KI (nur unbekannte Felder)
4. Badge-System in Preview: Profil (grün), KI-Vorschlag (gelb)
5. Extras im Profil-Panel: editierbar und einzeln löschbar

---

## [2026-05-14] Dokumentation-Sync + UI-Redesign

**Ziel:**
Action-Panel-First-UI umsetzen und Doku auf aktuellen Code-Stand bringen.

**Aktionen:**

1. UI-Redesign: Action Panel ersetzt Quick Strip und Greeting-Bubble
2. Drei Agent-Modi: Hybrid (Standard), Klassisch (Vorschau), Automatisch
3. Quellen-Badges mit Konfidenz: `profile`, `inferred`, `suggestion`
4. README, short_term.md, long_term.md, known_issues.md, decisions.md synchronisiert

---

## [2026-05-15] Field-by-Field Agent + Bugfixes + Code Cleanup

**Ziel:**
KI-Vorschläge und Extras-Nutzung verbessern durch Feld-für-Feld-Ansatz; UI-Verbesserungen; Code säubern.

**Aktionen (Field-by-Field Agent):**

1. `runFieldByFieldAgent()` — ersetzt Batch-`runAgentStep()` im Automatisch-Modus
2. Priorität pro Feld: `sessionAnswers` → `extras` (Label-Match) → KI (Non-Streaming, max_tokens 80)
3. Navigation/Submit automatisch am Ende erkannt und ausgeführt
4. `ask`-Aktionen speichern `selector` → `handleGuidedAnswer()` füllt direkt ohne erneuten Agent-Lauf
5. `showNextGuidedQuestion()` handhabt Navigation wenn Queue leer (kein `runAgentStep()`-Rückruf)
6. `startAgent()` und `resumeAgentIfPending()` dispatch auf `runFieldByFieldAgent()` vs. `runAgentStep()`

**Aktionen (UI):**

1. Profil- und Verlauf-Panel blenden `fa-action-panel` beim Öffnen aus (volle Panel-Höhe)
2. `hideProfile()` / `hideHistory()` stellen Action-Panel beim Schließen wieder her
3. 150ms-Delay beim Ausblenden der Messages entfernt — sofortiger Wechsel ohne Flash
4. Blauer Fortschrittsbalken (`profile-progress`) aus Profil-Panel entfernt

**Aktionen (Bugfixes):**

1. `getDefaultModel()` — `'openrouter/free'` → `'openrouter/auto'` (war stale)
2. `directValue`-Check in Field-by-Field — `!directValue` → `=== null` mit `&& v`-Guard
3. `_assistantMode` Initialwert — `'hybrid'` → `'context'` (Hybrid-Modus längst entfernt)

**Aktionen (Code Cleanup):**

1. `@keyframes profile-out` entfernt (nie referenziert)
2. Gesamter `/* Welcome state */`-Block entfernt (11 Regeln, Klassen nie gesetzt)
3. `.messages.fading`-Regel entfernt (`fading` wird nicht mehr auf messages gesetzt)
4. Doppelte `.msg.user { justify-content: flex-end }`-Regel entfernt
5. `/* Profile progress */`-Block entfernt (Element aus HTML entfernt)

**Ergebnis:**

- Extras und gelernte Felder werden jetzt zuverlässig genutzt (direkt per Label-Match, kein Batch-Prompt nötig)
- KI-Vorschläge pro Feld fokussierter und präziser (kleiner Kontext statt große Feldliste)
- UI-Übergänge sauber ohne Flash
- ~60 Zeilen toter CSS-Code entfernt

---

## [2026-05-14–15] Guided Mode + Reliability + Neue Features

**Ziel:**
Vollautonomes geführtes Formular-Ausfüllen mit intelligenter Interaktion, plus diverse Verbesserungen.

**Aktionen (Guided Mode):**

1. `runGuidedStep(actions)` — teilt Aktionen in sicher/unsicher (Schwelle 0.6)
2. `showGuidedQuestion()` / `handleGuidedAnswer()` — Frage-Antwort-Flow mit Chip-Auswahl
3. `agentState.sessionAnswers` — Antworten über Seitennavigation persistent
4. `faAgentResume` erweitert um `guided`, `autoNavigate`, `sessionAnswers`
5. Auto-Navigate-Toggle und geführter Fortschrittsbalken im UI

**Aktionen (Reliability):**

1. Konfidenz-Schwelle `GUIDED_MIN_CONFIDENCE = 0.6` — darunter ask statt fill
2. Radio-Button-Fix: `click()` statt `checked = true` für React/Vue-Kompatibilität
3. `prevFillLines` im Agent-Prompt — bereits gefüllte Felder vorheriger Seiten
4. Streaming-Agent: `runAgentStep` nutzt `groqStream` mit `parseSSEText`
5. `waitForFields(4000)` — wartet auf dynamisch geladene Felder beim Resume
6. Guided-Fortschrittsbalken (`#fa-guided-progress`)

**Aktionen (Neue Features):**

1. Datepicker-Support: `tryDatePickerLib()` für Flatpickr, Pikaday, jQuery, Bootstrap
2. Profil-Import/Export als JSON
3. Mehrere Profile: `faProfiles`-Array, Switcher, Anlegen, Löschen, Migration aus Legacy
4. Agent-History-Panel: letzte 30 Sitzungen, `addHistoryEntry()` + `learnAgentFields()`-Hook
5. Formularerkennung: Shadow DOM scanning + Nav-Filter

**Aktionen (Provider + Fallback):**

1. `background.js` auf Multi-Provider ausgebaut: `PROVIDERS`-Objekt, `llm-fetch`/`llm-stream`
2. OpenRouter-Fallback bei Groq 429 **und** 5xx: `fetchProviderWithRetry` + Fallback-Logik
3. `OPENROUTER_MODEL_REMAP` normalisiert ungültige Modell-IDs (`openrouter/free` → `openrouter/auto`)
4. `_onProviderFallback`-Callback verbindet Background-Signal mit `showToast()` im Sidebar
5. `options.js` Modell-Liste bereinigt: echte OpenRouter-IDs statt Platzhalter

**Ergebnis:**

- Agent kann mehrseitige Formulare vollständig autonom ausfüllen
- Unsichere Felder werden gezielt erfragt, Antworten seitenübergreifend gespeichert
- Groq-Ausfälle und Rate Limits werden transparent über OpenRouter abgefangen
- Mehrere Profile ermöglichen verschiedene Identitäten/Nutzer
- History gibt Überblick über vergangene Agent-Sitzungen

---

## [2026-06-14] Dokumentations-Konsolidierung + Repo-Cleanup

**Ziel:**
Projektmanagement-Doku zusammenführen, Repo-Struktur aufräumen, Stand gegen die Kurs-Checkliste abgleichen.

**Aktionen:**

1. Alle 8 Kurs-PDFs gelesen, Anforderungen je Einheit extrahiert
2. `Projektstand.md` erstellt: Vision · Status nach Kurseinheiten · Benotung · Roadmap/Backlog
3. `Ideas` + `NEXT_STEPS.md` in `Projektstand.md` konsolidiert und entfernt
4. Ordnerstruktur: Kursfolien + Zwischenpräsentations-PDF → `vorlesung/` (gitignored, lokal); `.pptx`/`.docx`/`PPT_BRIEFING.md` entfernt
5. `.venv` gelöscht; `.gitignore` aufgeräumt: `vorlesung/` + `.venv/` ignoriert, `memory/`/`logs/` aus Ignore entfernt (gehören laut Kurs ins Repo)
6. Code-Redundanz-Check: keine doppelten Funktionsdefinitionen über `content.js`/`fa-*.js`; alle Module im Manifest geladen
7. `memory/` (short_term, long_term, decisions) + `logs/` auf Stand 2026-06-14 gebracht

**Ergebnis:**

- Single Source of Truth für den Projektstatus (`Projektstand.md`)
- Repo aufgeräumt, Kursfolien nicht mehr im Repo
- Offene Pflicht-ToDos dokumentiert: Tests (Einheit 8), Dokumentations-Agent (Einheit 9)

---

## [2026-06-14] Doku-Verifikation + Personas

**Ziel:**
Gesamte Dokumentation gegen den Code prüfen und Abweichungen korrigieren; Persona-Lücke (Einheit 2) schließen.

**Aktionen (Doku-Korrekturen):**

1. Modularer Aufbau ergänzt: `README.md`, `short_term.md`, `long_term.md` beschrieben `content.js` als Single-File — tatsächlich 7 Module (`fa-utils/profile/scanner/fill/styles/supabase` + `content`), jetzt als Tabelle/Ladereihenfolge dokumentiert
2. Supabase-Sync in README ergänzt (Architektur, Feature, Storage-Keys `faSupabaseUrl`/`faSupabaseKey`)
3. `faAssistantMode`: veraltetes `'hybrid'` entfernt → nur `'context'`/`'classic'` (Code-Stand)
4. Retry-Inkonsistenz gefixt: `MAX_RETRIES = 2` (bis zu 3 Versuche), `RETRYABLE_STATUS` präzisiert; `known_issues.md` + `long_term.md` vereinheitlicht
5. Interner Widerspruch in `decisions.md` zu `PPT_BRIEFING.md` korrigiert
6. Neuer Entscheidungseintrag [2026-06-11] Aurora-Glass-UI (finales Design) ergänzt
7. `long_term.md` Token-/Kontext-Werte gegen Code korrigiert: Chat `max_tokens` 400 → 500 (Default) + Zusammenfassung 650; Chat-History „letzte 6" → `slice(-12)`; Batch-Chunk `min(60·n+120, 1600)` und Normalisierung (40) ergänzt

**Aktionen (Personas):**

1. `personas/` angelegt mit 5 wiederverwendbaren Rollen-Prompts: `extension-architect`, `agent-prompt-engineer`, `aurora-ux-designer`, `qa-test-engineer`, `docs-agent` + `README.md` (Index + Grundregeln)
2. `Projektstand.md` Einheit 2 (Vibe Coding) 🟡 → ✅

**Ergebnis:**

- Doku deckt sich mit dem Code (Module, Provider/Retry, Modi, Storage-Keys verifiziert)
- Persona-Anforderung aus Einheit 2 erfüllt

---

## [2026-06-14] Test-Suite (Einheit 8) + Repo-Struktur

**Ziel:**
Pflicht „Tests eingebunden" (Einheit 8) umsetzen und verifizieren; Root entzerren; Doku synchronisieren.

**Aktionen:**

1. Vitest + jsdom eingerichtet: `package.json`, `vitest.config.js`, `tests/setup.js`
2. 60 Unit-Tests in `tests/unit/` (`fa-utils`, `fa-profile`, `fa-scanner`, `fa-fill`, `background`)
3. Browser-sichere `module.exports`-Shims an alle getesteten Quelldateien; `chrome.*`-Listener in `background.js` gekapselt
4. jsdom-Polyfills (`CSS.escape`, `offsetWidth`) + Cross-Modul-Globals in `tests/setup.js`
5. GitHub-Actions-Workflow `.github/workflows/test.yml` (Regression bei jedem Push)
6. Coverage-Setup (`@vitest/coverage-v8`, `npm run coverage`) — Branch ~77 % der Logik-Module
7. Node v24 lokal via winget installiert, Suite ausgeführt: 60/60 grün
8. Icons nach `icons/` verschoben, Manifest-Pfade angepasst
9. README (Tests-Sektion), `short_term.md`, `long_term.md`, `decisions.md`, `Projektstand.md` synchronisiert

**Ergebnis:**

- Einheit 8 erfüllt und verifiziert (60 Tests grün, CI aktiv)
- Offen als Pflicht: nur noch Dokumentations-Agent (Einheit 9)

---

## [2026-06-14] Doku-Verifikation + fa-profile-Test ergänzt

**Ziel:**
Gesamte Doku gegen den aktuellen Code prüfen; gefundene Abweichung schließen.

**Aktionen:**

1. Zentrale Doku-Behauptungen am Code verifiziert: Manifest-Ladereihenfolge/Version 2.0, `MAX_RETRIES=2` + `RETRYABLE_STATUS` + Timeouts (25s/40s), Fallback-Modell, 15 Profilfelder, `AGENT_MAX_PAGES=12`, `AGENT_AUTO_SELECT_CONFIDENCE=0.82`, Modi `context`/`classic`, Chat-Tokens 500/650, `slice(-12)` — alle korrekt.
2. **Abweichung gefunden:** Doku nannte `fa-profile` als getestetes Modul, es existierte aber keine `fa-profile.test.js` (nur 4 Testdateien, 60 Tests).
3. `tests/unit/fa-profile.test.js` ergänzt (9 Tests): `PROFILE_FIELDS`-Struktur/Count/Keys, matchProfile-Vertrag (kw/ac lowercase), deutsche Keywords, `FAKE_DATA`-Vollständigkeit. `fa-profile.js` jetzt 100 % Coverage.
4. Suite: **69 Tests grün** (5 Dateien); Branch-Coverage 76,75 % ≈ 77 % unverändert.
5. Testzahl in den aktiven Doku-Dateien `60 → 69` angeglichen (README, Projektstand, short_term, long_term, decisions).

**Ergebnis:**

- Doku und Code wieder deckungsgleich; „5 getestete Module" stimmt jetzt faktisch.

**Nachgelagert (Projektstand-Review):**

- Prof-Checkliste gegen die aktuellste Folie (`vorlesung/08_Orchestrating_Agents`) abgeglichen: alle 10 Punkte erfasst, offen nur der Doku-Agent (E9), Deployment (E5) erlassen — Projektstand korrekt.
- `Projektstand.md` „Nächste Maßnahmen"/Backlog korrigiert: Maßnahme 3 von `fa-scanner`/`fa-fill` (bereits getestet) auf `fa-supabase` (einziges Logik-Modul ohne Tests) umgestellt; Maßnahme 4 als `form_fields`-Lookup statt „RAG" benannt; „Sprach-Erkennung" (kein reales Feature) durch „Datums-Intelligenz (DE/EN)" ersetzt; RAG-Begriffe entwirrt (echtes RAG = pgvector über persönliche Dokumente); Hinweis auf noch nicht behandelte E10/E11 ergänzt.

---

## [2026-06-14] DocumentationAgent gebaut (Einheit 9)

**Ziel:**
Letzten offenen Pflichtpunkt umsetzen: eigener Agent für die Dokumentation (Orchestrierung, Einheit 9).

**Aktionen:**

1. Vorlesungsvorlage geprüft (`vorlesung/08_Orchestrating_Agents`): Rolle „Documentation" im Agenten-Lineup, Microservice via JSON-RPC, Flow `git diff → LLM → Markdown`.
2. `doc-agent/` angelegt: `agent.py` (Flask + JSON-RPC 2.0, Methoden `document_changes`/`agent_card`, CLI `--once`), `llm.py` (Groq + OpenRouter-Fallback), `requirements.txt`, `.env.example`, `README.md`.
3. **Autonom:** `document_changes` schreibt den erzeugten Eintrag per Default selbst an `logs/actions.md` (Guardrails: nur im Repo, nur anhängend, nie ohne Diff). Key aus `doc-agent/.env`/Umgebung, nie im Code.
4. `.gitignore`: `doc-agent/.env`, `__pycache__/`, `*.pyc` ergänzt.
5. Smoke-Tests (Python 3.12.10): leerer Diff → „keine Änderungen" (Git/Pfadlogik ok), `/health` ok, `agent_card` ok, unbekannte Methode → JSON-RPC -32601, fehlender Key → sauberer -32000-Error. Live-LLM-Lauf braucht den Groq-Key des Nutzers (wie die Extension).
6. Doku nachgezogen: `Projektstand.md` (E9 ⬜→✅, Kennzahlen, Schnellüberblick, Maßnahmen), `short_term.md`, `decisions.md`.

**Ergebnis:**

- Einheit 9 erfüllt; aus den behandelten Einheiten (E2–E9) ist keine Pflicht mehr offen (E5 erlassen).
- Offen nur noch: Abschlusspräsentation sowie die noch nicht behandelten Einheiten E10/E11.


---

## [2026-06-14] Aktualisierung Projektstand

**Ziel:**
Die Projektstand-Dokumentation auf den neuesten Stand bringen.

**Aktionen:**

1. Entfernen von unnötigen Zeilen im Projektstand-Dokument.
2. Korrigieren von Formatierungsfehlern.

**Ergebnis:**

- Projektstand-Dokument ist nun aktuell und konsistent formatiert.


---

## [2026-06-14] Automatisierte Dokumentation mit Git-Hook

**Ziel:**
Automatisierte Dokumentation von Commits mit Hilfe eines Git-Hooks.

**Aktionen:**

1. Einrichtung eines `post-commit`-Git-Hooks, der nach jedem Commit den laufenden DocumentationAgent-Server anruft.
2. Implementierung des Servers, der den Commit autonom in `logs/actions.md` schreibt.

**Ergebnis:**

- Automatisierte Dokumentation von Commits in `logs/actions.md` nach jedem Commit, wenn der Server läuft.


---

## [2026-06-14] Automatisierte Dokumentation mit Git-Hook

**Ziel:**
Automatisierte Dokumentation von Commits mit Hilfe eines Git-Hooks.

**Aktionen:**

1. Einrichtung eines `post-commit`-Git-Hooks, der nach jedem Commit den laufenden DocumentationAgent-Server anruft.
2. Implementierung des Servers, der den Commit autonom in `logs/actions.md` schreibt.

**Ergebnis:**

- Automatisierte Dokumentation von Commits in `logs/actions.md` nach jedem Commit, wenn der Server läuft.


---

## [2026-06-14] Selbstreferenz-Vermeidung im DocumentationAgent

**Ziel:**
Vermeidung von Selbstreferenzen im DocumentationAgent durch Ausschluss eigener Dateien.

**Aktionen:**

1. Hinzufügen von `SELF_EXCLUDES` in `agent.py`, um eigene Dateien aus dem Diff auszuschließen.
2. Anpassung des `git diff`-Befehls, um die ausgeschlossenen Dateien zu berücksichtigen.

**Ergebnis:**

- Der DocumentationAgent dokumentiert sich nicht selbst und vermeidet Selbstreferenzen in der Dokumentation.


---

## [2026-06-14] Selbstreferenz-Vermeidung im DocumentationAgent

**Ziel:**
Vermeidung von Selbstreferenzen im DocumentationAgent durch Ausschluss eigener Dateien.

**Aktionen:**

1. Hinzufügen von `SELF_EXCLUDES` in `agent.py`, um eigene Dateien aus dem Diff auszuschließen.
2. Anpassung des `git diff`-Befehls, um die ausgeschlossenen Dateien zu berücksichtigen.

**Ergebnis:**

- Der DocumentationAgent dokumentiert sich nicht selbst und vermeidet Selbstreferenzen in der Dokumentation.


---

## [2026-06-14] Selbstreferenz-Vermeidung im DocumentationAgent

**Ziel:**
Vermeidung von Selbstreferenzen im DocumentationAgent durch Ausschluss eigener Dateien.

**Aktionen:**

1. Hinzufügen von `SELF_EXCLUDES` in `agent.py`, um eigene Dateien aus dem Diff auszuschließen.
2. Anpassung des `git diff`-Befehls, um die ausgeschlossenen Dateien zu berücksichtigen.

**Ergebnis:**

- Der DocumentationAgent dokumentiert sich nicht selbst und vermeidet Selbstreferenzen in der Dokumentation.


---

## [2026-06-14] Aktualisierung Projektstand

**Ziel:**
Die Projektstand-Dokumentation wurde aktualisiert.

**Aktionen:**

1. Hinzufügen einer Testzeile zur Projektstand-Dokumentation.
2. Überprüfung der Formatierung und Konsistenz der Dokumentation.

**Ergebnis:**

- Die Projektstand-Dokumentation wurde erfolgreich aktualisiert.


---

## [2026-06-14] Entfernung von unnötigem Text in Projektstand.md

**Ziel:**
Entfernen von überflüssigen Zeilen im Projektstand-Dokument.

**Aktionen:**

1. Entfernen des Textes "das ist ein test" am Ende der Datei.
2. Korrigieren des Datei-Endes, um sicherzustellen, dass es mit einer neuen Zeile endet.

**Ergebnis:**

- Projektstand.md ist nun frei von unnötigem Text und hat eine korrekte Datei-Struktur.

---

## [2026-06-18] Einheit 10: Stakeholder-Projektwebseite + doc-agent-Orchestrierung

**Ziel:**
Den neuen Pflichtpunkt aus Einheit 10 (Projektwebseite für Stakeholder) umsetzen und den Doku-Agenten produktiv orchestrieren.

**Aktionen (doc-agent):**

1. `post-commit`-Git-Hook eingerichtet (ruft den laufenden Server nach jedem Commit); versionierte Vorlage `doc-agent/post-commit` + Anleitung in der README.
2. Fortschritts-Feedback (`stderr`) im Agenten + `--preview`/`--no-write`-Schalter und VS-Code-Run-Buttons.
3. **Self-Exclude** (`SELF_EXCLUDES = ["doc-agent", "logs/actions.md"]`) — der Agent dokumentiert sich nicht mehr selbst.

**Aktionen (Webseite, Einheit 10):**

1. Neue Vorlesung (`09_Stakeholder_Interaction`) ausgewertet: neuer Pflichtpunkt „Projektwebseite für Stakeholder".
2. `docs/` + `mkdocs.yml` (MkDocs Material) entlang der drei Stakeholder; Architektur als Mermaid-Diagramm; Seite „Entscheidungen & Kompetenzen" aus `decisions.md`.
3. Auto-Deploy `.github/workflows/docs.yml` (GitHub Pages), `requirements-docs.txt`, `site/` gitignored, Logo/Favicon aus dem Extension-Icon, CI-Badges, Autoren (Plitzko · Makkar).
4. Projektstand nachgezogen (E10 ⬜, neue Maßnahme); committet + auf `main` gepusht.

**Aktionen (Doku-Sync):**

1. `short_term.md`, `long_term.md`, `decisions.md` auf Stand 2026-06-18 gebracht (doc-agent-Tooling + Webseite ergänzt).

**Ergebnis:**

- Einheit 10 umgesetzt; Webseite im Team-Repo, Build grün. Offen extern: GitHub Pages aktivieren (Repo-Admin), Screenshots ergänzen.
- E11 (MCP) noch nicht behandelt; Abschlusspräsentation steht aus.

---

## [2026-06-25] Einheit 11 (MCP) ausgewertet + Doku nachgezogen

**Ziel:**
Neue Vorlesung (MCP) gegen die Pflicht abgleichen und den Projektstatus aktualisieren.

**Aktionen:**

1. `vorlesung/10_Model_Context_Protocol_AIPT26` ausgewertet: MCP wird als **Konzept** gelehrt (Host/Client/Server, stdio/SSE, Tools/Resources/Prompts) — die „Meilensteiner der Prototypen" sind unverändert, **kein neuer Pflichtpunkt**.
2. Abschluss-Termine geklärt: **02.07. Reflexions-Präsentation** (Interview-Stil) **und 09.07. Prototyp-Demo** (10–15 Min, Repo, Moodle) — beide vorzubereiten.
3. `Projektstand.md` aktualisiert: Stand 2026-06-25; E10 ✅ (Webseite, Veröffentlichung wartet auf Pages-Admin), E11 ✅ (Konzept, kein Pflichtpunkt); „Auf einen Blick" + Schnellüberblick; Maßnahmen auf die zwei Präsentationen + Webseite-Live umgestellt; Backlog um „MCP-Server für doc-agent" ergänzt.
4. `memory/short_term.md` auf Stand 2026-06-25 gebracht.

**Ergebnis:**

- Alle behandelten Pflicht-Einheiten (E2–E11) erfüllt bzw. erlassen (E5); E11 ohne neuen Pflichtpunkt.
- Offen: Webseite live-schalten (Repo-Admin), zwei Abschlusspräsentationen (02./09.07.), optional Screenshots/MCP-Feature.

---

## [2026-07-05] Demo-Feature-Paket v2.1: Live-Validierung, Logik-Check, Dokument-Scan

**Ziel:**
Extension für die Prototyp-Demo (09.07.) mit drei Backlog-Features schärfen — ohne Risiko für die Live-Demo.

**Aktionen:**

1. **Live-Validierung beim Tippen** (`fa-utils.js` + Wiring in `content.js`): deterministische Prüfungen (IBAN ISO-7064-mod-97 inkl. Länder-Sollängen, BIC, E-Mail, PLZ, Telefon, Geburtsdatum-Plausibilität), ✓/⚠-Badge in der Sidebar + Outline-Flash am Feld; tolerant beim Tippen, streng bei blur.
2. **Pre-Submit-Logikprüfung**: Submit-Review-Prompt prüft jetzt Widersprüche zwischen Feldern (Logik-Check) und bekommt die deterministischen Ergebnisse als "Lokale Prüfung"-Fakten.
3. **Dokument-Scan (Vision-OCR)** im Profil-Panel: Bild → Downscale 1400 px → Privacy-Bestätigung → Llama 4 Scout (Groq, verifizierte Modell-ID) → JSON → Profilfelder vorbefüllt mit Review-Pflicht. `background.js` unterstützt dafür ein request-eigenes `fallbackModel`.
4. **Tests**: +29 Unit-Tests (Validatoren, Feld-Klassifizierung, Fallback-Model-Resolver) — Suite 98/98 grün, Branch-Coverage ~80 %.
5. Doku nachgezogen: `README.md`, `Projektstand.md` (Backlog → umgesetzt), `memory/short_term.md`, `memory/decisions.md`; `manifest.json` auf v2.1.

**Ergebnis:**

- Drei sichtbare Demo-Features, alle offline-robust bzw. mit Fallback; keine Storage-Key- oder Architektur-Brüche.
- Guardrails intakt: kein Auto-Submit, UI im Shadow Root, Netzwerk nur via `background.js`.

---

## [2026-07-05] Robustheits-Paket: Feld-Erkennung/-Befüllung auf breiter Webseiten-Basis gehärtet

**Ziel:**
Zuverlässigkeit auf möglichst allen Webseiten: alle Felder korrekt erkennen und befüllen, Fehl-Befüllungen ausschließen.

**Aktionen:**

1. **Shadow DOM/iFrames korrekt**: Label-/Hint-/Error-/Radio-Lookups über `getRootNode()` statt `document` (`byIdInRoot`); rekursiver Scan verschachtelter Shadow Roots; `isVisible` über `ownerDocument.defaultView`.
2. **Fehl-Match-Schutz**: Profil-Keyword-Matching am Wortanfang statt Substring — behebt "Hotelname"→Telefon und "Sportart"/"Passwort"→Stadt, auch in `learnAgentFields` (dort drohte dauerhafte Profil-Korruption); Passwortfelder grundsätzlich ausgeschlossen; Compound-Keywords (`mobil`, `rufnummer`, `wohnort`, `geboren`) ergänzt.
3. **Befüllung gehärtet** (`fa-fill.js`): priorisiertes Select-Matching (exakt vor Teilstring — "DE" greift nicht in "Niederlande"), `<select multiple>`, deutsches Dezimalkomma für Zahlenfelder, `maxlength`-Kappung.
4. **Tabellen-Layouts**: linke Zelle als Label-Fallback (Behörden-/Legacy-Formulare).
5. **Tests**: +20 Unit-Tests für alle Fixes — Suite 118/118 grün, Branch-Coverage ~79 %; `extractRichContext` exportiert.
6. Doku nachgezogen: `README.md`, `Projektstand.md`, `memory/short_term.md`, `memory/decisions.md`.

**Ergebnis:**

- Erkennungs- und Befüllungspfad funktionieren jetzt auch in Web-Component-/iFrame-/Tabellen-Layouts; Fehl-Befüllungs-Klassen sind per Test abgesichert.
- Bekannte, technisch bedingte Grenzen bleiben dokumentiert (Cross-Origin-iFrames, closed Shadow Roots, nativer PDF-Viewer — `memory/known_issues.md`).

---

## [2026-07-07] Projektwebseite: Startseite als Startup-Landing-Page ausgebaut

**Ziel:**
Die GitHub-Pages-Startseite soll wie die Landing-Page eines echten Startups wirken — innerhalb der bestehenden „Aurora Glass"-Designphilosophie (Violett→Fuchsia→Pink auf dunklem Glas).

**Aktionen:**

1. **Hero erweitert** (`docs/index.md`): Tagline-Headline statt reinem Produktnamen, plus reines CSS-Produkt-Mockup (Browserfenster mit Beispiel-Formular + FormAssist-Sidebar inkl. animiertem Tipp-Cursor und Fortschrittsbalken, `aria-hidden`).
2. **Neue Sektionen**: Feature-Ticker (Marquee mit echten Fähigkeiten), „So funktioniert's" (3 nummerierte Schritte), Trust-Band „Sicherheit ist Architektur" (Kein Auto-Submit / Profil lokal / Datenminimierung), FAQ (5 Glas-Accordions), Abschluss-CTA-Panel; Sektions-Kicker + zentrierte Section-Heads.
3. **CSS** (`docs/stylesheets/extra.css`): ~330 Zeilen neue Komponenten im bestehenden Token-System (`--fa-grad` etc.); alle neuen Animationen unter `prefers-reduced-motion` deaktiviert; Icons als SVG (Material-Shortcodes), keine Emojis.
4. **Inhaltstreue**: keine erfundenen Zahlen/Testimonials — nur belegbare Aussagen (118 Tests, ~79 % Coverage, Submit-Guardrail, optionaler Supabase-Sync).

**Ergebnis:**

- `mkdocs build --strict` grün; Rendering per Headless-Chrome-Screenshots (Hero, Features, Trust, FAQ, CTA) visuell verifiziert; ein Markdown-Einrückungs-Bug im Mockup und ein harter Gradient-Rand im CTA wurden dabei gefunden und behoben.

---

## [2026-07-07] Custom-Widget-Support: ARIA-Comboboxen, Rich-Text, framework-treues Füllen

**Ziel:**
"Agent funktioniert auf jeder Seite": moderne Framework-Widgets (React-Select, MUI, contenteditable) erkennen und zuverlässig befüllen.

**Aktionen:**

1. Detektoren `isAriaCombobox`/`isRichTextField` in `fa-utils.js`; Scanner erfasst beide Typen (`combobox`/`richtext`) in Formularen und als lose Felder, Wert-Lesen via `textContent`.
2. `fillAriaCombobox` (async) in `fa-fill.js`: tippen/öffnen → Options-Liste via `aria-controls`/`aria-owns`/Portale → bester Treffer per pointerdown→mousedown→mouseup→click. Kein synthetisches Enter (Submit-Guardrail). `fillRichText` mit execCommand + Fallback.
3. `fillField` liefert für Comboboxen ein Promise; alle Verifikations-Stellen in `content.js` await'en jetzt. Fokus vor/Blur nach dem Setzen (on-blur-Validierung), Agent scrollt Felder in den Viewport, Guards gegen Tipp-/Fehlerhilfe-Spam während Agent-Läufen.
4. Bugfix aus dem Test heraus: `MouseEvent`-`view` muss `el.ownerDocument.defaultView` sein, nicht `window` — wäre in same-origin iFrames fehlgeschlagen.
5. +15 Unit-Tests → Suite **133/133 grün**, Branch-Coverage ~77 %. Doku nachgezogen (README, docs/-Webseite inkl. Stat-Kacheln, projektstand-vollstaendig, memory/, Persona QA).

**Ergebnis:**

- Erkennungs-/Füll-Pfad deckt jetzt native Felder, Kendo, Datepicker-Libs, ARIA-Comboboxen und contenteditable ab — über Shadow DOM, same-origin iFrames und Tabellen-Layouts hinweg.
- Harte Grenzen bleiben dokumentiert (closed Shadow Roots, Cross-Origin-iFrames, nativer PDF-Viewer).

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

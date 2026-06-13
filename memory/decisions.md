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

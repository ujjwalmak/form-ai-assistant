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

## [2026-04-23] Entscheidung: API-Key nicht hardcoden (historisch)

**Kontext:**
User wollte Key hardcoden. GitHub Push Protection blockierte den Push mit detektiertem Groq-Key in content.js.

**Entscheidung (damals):**
Key wurde aus dem Code ausgelagert, um Push-Protection-Blocker zu umgehen.

**Alternativen:**

- GitHub-Secret bypassen via Link (erlaubt für diesen Key): abgelehnt, schlechte Praxis
- Key im User weiterhin im Chat teilen: bereits passiert, Key ist als kompromittiert zu betrachten

**Status heute:**
Abgeloest durch Optionen-Seite + `chrome.storage.sync` (`faApiKey`).

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

---

## [2026-04-23] Entscheidung: Minimize-Fix via inline style statt CSS-Klasse allein (historisch)

**Kontext:**
Minimize-Button funktionierte nicht wenn Panel im free-Modus war (gedraggt), weil `sidebar.style.height` (inline) die CSS-Klasse `.minimized { height: 56px }` überschreibt.

**Entscheidung:**
Minimize-Handler setzt `sidebar.style.height = '56px'` direkt in JS und speichert vorherige Höhe in `savedHeight`. CSS-Klasse bleibt für `overflow: hidden` und andere visuelle Effekte.

**Alternativen:**

- `!important` in CSS: funktioniert nicht gegen inline styles
- Transition zu reiner JS-Höhensteuerung ohne CSS-Klasse: möglich, aber mehr Code

**Status heute:**
Der Minimize-Button ist in der aktuellen UI nicht mehr Teil des aktiven Feature-Sets.

---

## [2026-04-30] Entscheidung: Profile-System mit structuring PROFILE_FIELDS

**Kontext:**
Auto-Fill brauchte eine systematische Feldterkennung. PROFILE_FIELDS mit Keywords und autocomplete-Attributen erlauben intelligentes Matching.

**Entscheidung:**
Standard-Profilfelder werden strukturiert mit Keywords, Autocomplete-Werten und Labels definiert. `matchProfile()` matched Formularfelder dagegen. `FAKE_DATA` bleibt fuer Prototyping.

**Alternativen:**

- Machine Learning/NLP: zu komplex für Prototyp
- Nur Autocomplete-Matching: zu ungenau, viele Felder nutzen es nicht

**Konsequenzen:**

- Auto-Fill funktioniert auf vielen Formularen ohne AI-Hilfe
- Neue Felder können leicht hinzugefügt werden
- Storage speichert Profile für Wiederverwendung

---

## [2026-05-07] Entscheidung: Ein API-Call pro Feld statt ein Batch-Call (historisch)

**Kontext:**
Agent Auto-Fill brauchte KI-Vorschläge für alle Formularfelder. Zwei Optionen: ein Batch-Call mit JSON-Antwort, oder ein Call pro Feld.

**Entscheidung:**
Ein API-Call pro Feld (max_tokens: 80). Nutzer sieht live wie jedes Feld befüllt wird.

**Alternativen:**

- Batch-Call mit JSON: schneller, aber keine visuelle Progression, KI-Antwort muss geparst werden
- Streaming: komplexer, kein Mehrwert für kurze Feldwerte

**Status heute:**
Der aktive Agent erzeugt pro Schritt einen strukturierten Aktionsplan (JSON-Array) und fuehrt ihn nach User-Preview aus.

---

## [2026-05-07] Entscheidung: faExtras als separater Storage-Key

**Kontext:**
Felder wie "Webseite", "Steuernummer", "Fax" passen nicht in PROFILE_FIELDS. Optionen: PROFILE_FIELDS dynamisch erweitern, oder separates Key-Value-Store.

**Entscheidung:**
`faExtras` als separater `chrome.storage.local`-Key. Schema: `{ "Webseite": "https://...", "Fax": "+49 ..." }`.

**Alternativen:**

- PROFILE_FIELDS dynamisch erweitern: komplexer, bricht die statische Struktur
- IndexedDB: zu viel Overhead für einfache Key-Value-Paare
- faProfile mit beliebigen Keys erweitern: vermischt Schema mit freien Einträgen

**Konsequenzen:**

- faExtras ist einfach zu lesen, zu schreiben und anzuzeigen
- matchExtras() macht fuzzy-matching damit leicht abweichende Labels trotzdem treffen
- Profil-Panel zeigt beides getrennt — klare UX-Trennung

---

## [2026-05-07] Entscheidung: Lokales Matching vor KI-Call

**Kontext:**
Frühere Version schickte alle Felder an die KI und hoffte, dass sie faExtras aus dem System-Prompt nutzt. Das hat nicht zuverlässig funktioniert (KI gab trotzdem null zurück).

**Entscheidung:**
Zwei-Phasen-Matching: erst lokal (matchProfile + matchExtras), dann KI nur für wirklich unbekannte Felder.

**Alternativen:**

- Alles an KI schicken: unzuverlässig, KI ignoriert manchmal gespeicherte Daten
- Nur lokales Matching: zu begrenzt, KI kann aus Kontext sinnvolle Werte ableiten

**Konsequenzen:**

- Gespeicherte Daten werden garantiert verwendet — kein Verlassen auf KI-Interpretation
- Kürzere KI-Anfragen (nur unbekannte Felder)
- Klare Trennung von Verantwortlichkeiten

---

## [2026-04-30] Entscheidung: Dark Mode als Preference speichern

**Kontext:**
UI musste für verschiedene Webseiten-Designs arbeiten. Chrome Storage erlaubt Nutzerpräferenzen zu speichern.

**Entscheidung:**
Dark Mode wird in chrome.storage.local gepuffert. CSS Custom Properties (@host.dark) steuern die Farben.

**Alternativen:**

- prefers-color-scheme Media Query: nicht ideal, User kann nicht override
- Browser Extension Settings UI: aufwändiger

**Konsequenzen:**

- User Preference bleibt über Sessions bestehen
- Design bleibt auf allen Webseiten konsistent

---

## [2026-04-30] Entscheidung: Extension-Icons in manifest statt als SVG

**Kontext:**
manifest.json brauchte Icons für verschiedene Chrome UI-Positionen (Toolbar, Popup, Extension Management).

**Entscheidung:**
PNG Icons (16, 32, 48, 128px) werden im manifest definiert und sollten im Root des Extension-Ordners liegen.

**Konsequenzen:**

- Professionelleres Erscheinungsbild
- Chrome zeigt Icons in verschiedenen Größen an

---

## [2026-05-14] Entscheidung: API-Key-Verwaltung via Optionen + storage.sync

**Kontext:**
Die dokumentierte `api-key.txt`-Loesung war nicht mehr der aktive Stand.

**Entscheidung:**
API-Key wird in der Optionen-Seite gepflegt und in `chrome.storage.sync` als `faApiKey` gespeichert.

**Konsequenzen:**

- Kein Key im Repository
- Einheitlicher Setup-Flow fuer Nutzer
- Fuer Produktion weiterhin Backend-Proxy erforderlich

---

## [2026-05-14] Entscheidung: Doku auf aktiven Feature-Stand synchronisieren

**Kontext:**
Mehrere Dokumente enthielten veraltete Aussagen (u.a. Guided Mode, Minimize, `api-key.txt`, falsche Feldanzahl).

**Entscheidung:**
README, Short-/Long-Term-Memory und Known-Issues wurden auf den aktuellen Code-Stand gebracht.

**Konsequenzen:**

- Weniger Onboarding-Reibung
- Klarere Erwartung, was wirklich implementiert ist

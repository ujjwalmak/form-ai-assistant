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

## [2026-04-23] Entscheidung: API-Key in api-key.txt statt hardcoded

**Kontext:**
User wollte Key hardcoden. GitHub Push Protection blockierte den Push mit detektiertem Groq-Key in content.js.

**Entscheidung:**
Key wird aus `api-key.txt` via `chrome.runtime.getURL` geladen. Datei ist in `.gitignore`. Lokal vorhanden, nie committed.

**Alternativen:**

- GitHub-Secret bypassen via Link (erlaubt für diesen Key): abgelehnt, schlechte Praxis
- Key im User weiterhin im Chat teilen: bereits passiert, Key ist als kompromittiert zu betrachten

**Konsequenzen:**

- Extension braucht `api-key.txt` im Extension-Ordner
- Bei neuem Entwickler: Datei muss manuell erstellt werden (in README dokumentieren)

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

## [2026-04-23] Entscheidung: Minimize-Fix via inline style statt CSS-Klasse allein

**Kontext:**
Minimize-Button funktionierte nicht wenn Panel im free-Modus war (gedraggt), weil `sidebar.style.height` (inline) die CSS-Klasse `.minimized { height: 56px }` überschreibt.

**Entscheidung:**
Minimize-Handler setzt `sidebar.style.height = '56px'` direkt in JS und speichert vorherige Höhe in `savedHeight`. CSS-Klasse bleibt für `overflow: hidden` und andere visuelle Effekte.

**Alternativen:**

- `!important` in CSS: funktioniert nicht gegen inline styles
- Transition zu reiner JS-Höhensteuerung ohne CSS-Klasse: möglich, aber mehr Code

**Konsequenzen:**

- Konsistentes Verhalten in docked und free Modus

---

## [2026-04-30] Entscheidung: Profile-System mit structuring PROFILE_FIELDS

**Kontext:**
Auto-Fill brauchte eine systematische Feldterkennung. PROFILE_FIELDS mit Keywords und autocomplete-Attributen erlauben intelligentes Matching.

**Entscheidung:**
16 Standard-Profilfelder werden strukturiert definiert mit Keywords, Autocomplete-Werten und Labels. matchProfile() matched Formularfelder dagegen. FAKE_DATA für Prototyping.

**Alternativen:**

- Machine Learning/NLP: zu komplex für Prototyp
- Nur Autocomplete-Matching: zu ungenau, viele Felder nutzen es nicht

**Konsequenzen:**

- Auto-Fill funktioniert auf vielen Formularen ohne AI-Hilfe
- Neue Felder können leicht hinzugefügt werden
- Storage speichert Profile für Wiederverwendung

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

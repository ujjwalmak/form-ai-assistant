# Long-Term Memory — FormAssist

## Architektur (Stand 2026-04-30)

### Extension-Typ
Chrome Extension, Manifest V3. Single content-script (`content.js`), läuft auf `<all_urls>` bei `document_idle`.

### Shadow DOM Isolation
Der gesamte UI-Code wird in ein `attachShadow({ mode: 'open' })` injiziert, das an einem `position:fixed; inset:0` Host-Element hängt. Das verhindert CSS-Konflikte mit jeder beliebigen Host-Seite.

### Kontext-Extraktion (Hierarchie)
Label-Extraktion in dieser Priorität:
1. `aria-label`
2. `aria-labelledby` (mehrere IDs, joined)
3. `<label for="id">`
4. Wrapping `<label>` (clone ohne inputs)
5. `title` attribute
6. `placeholder`
7. `name`/`id` (humanized: camelCase → spaces, `-_` → spaces)

### Profile-System (neu 2026-04-30)

**PROFILE_FIELDS — 16 Standard-Profilfelder:**
- Persönliche Daten: firstName, lastName, email, phone, birthdate, birthplace, nationality
- Adresse: street, zip, city, country
- Bank/Finanz: iban, bic
- Business: company, jobTitle

**Feldterkennung-Strategie:**
1. `matchProfile()` prüft für jedes input/select/textarea ob es zu einem Profilfeld passt
2. Priorität: autocomplete-Attribut-Match > Keywords-Match
3. Keywords sind mehrsprachig (z.B. 'plz', 'postleitzahl', 'zip', 'postal')
4. Fuzzy-Matching: Label + Autocomplete-Wert werden downcase verglichen

**Auto-Fill (fillField):**
- SELECT: Text/Label/Value Fuzzy-Match, fallback zu Value-setzen
- Checkbox: Boolean-Logik (regex /^(ja|yes|true|1|x|ok|checked|ausgewählt)$/i)
- Radio: ganze Radio-Gruppe durchsuchen, Matching gegen Labels + Values
- Text/Textarea: Property Descriptor API für robustes Value-Setting

**Storage (chrome.storage.local):**
- `faProfile` — Nutzerprofil (Vorname, Email, etc.)
- `faPosition` — Sidebar Position (left, top, width, height)
- `faDarkMode` — Boolean für Dark Mode Preference

### System-Prompt Struktur
```
=== SEITE ===
Titel / URL / H1 / Meta-Description

=== FORMULAR ===
Aktion/Submit: "..."
Anweisungen: "..."

=== NUTZERPROFIL ===
(nur wenn Profile-Felder gefüllt sind)

[Sektion]
• Feldname ✱ (type) [autocomplete: ...] [range: ...] [max N Zeichen] → "Hint"
  Optionen: a, b, c

✱ = Pflichtfeld
```

### API
- Endpunkt: `https://api.groq.com/openai/v1/chat/completions`
- Modell: `llama-3.1-8b-instant`
- max_tokens: 400
- History: letzte 10 Nachrichten (user + assistant)
- Key: `api-key.txt` via `chrome.runtime.getURL`, gecacht in `_apiKey`

### UI & Styling (2026-04-30)

**Shadow DOM:**
- Sidebar sitzt in Shadow Root, vollständig CSS-isoliert
- Host-Element: `position: fixed; inset: 0; z-index: 2147483647; pointer-events: none`
- Fonts: Roboto via Google Fonts im Shadow Root (`<link rel="stylesheet">`)

**Color System (CSS Custom Properties):**
- Light Mode: `--bg`, `--surface`, `--border`, `--text`, `--accent` (#0b57d0 — Google Blue)
- Dark Mode: Warme Grau-Töne, dunkle Backgrounds (#131314), Accent bleibt erkennbar
- Togglebar: `:host(.dark)` überschreibt alle Farb-Variablen

**Drag/Resize State Machine:**
- `isDocked = true`: Sidebar rechts, `right: 0`, transform-Animation für open/close
- `isDocked = false`: Sidebar frei, `left/top` inline, `right: auto`, `no-animate`-Klasse
- Undock: bei erstem Drag auf Header oder erstem Resize
- Minimize: speichert `sidebar.style.height` und setzt `56px` (inline-style überschreibt CSS)

### Bedienung & Modes

**Geführter Modus (Step-by-Step):**
- `guidedMode` State-Object mit `{ active, fields[], index }`
- `getGuidedFields()` — filtert alle leeren, sichtbaren Felder (außer password/file), sortiert Pflichtfelder oben
- `askGuidedQuestion()` — fragt nacheinander nach einem Feld mit Fortschritt "n/total" + Beschreibung (Hint, Optionen, Pflichtfeld)
- `handleGuidedAnswer()` — übernimmt User-Eingabe und füllt Feld automatisch via `fillField()`
- Buttons: "Überspringen" (nächstes Feld), "Beenden" (Modus beenden)
- Am Ende: Nachricht dass Modus abgeschlossen ist

**Profil-Editor UI:**
- `showProfile()` / `hideProfile()` — toggles zwischen Chat und Profil-Editor
- 16 Input-Felder (firstName, lastName, email, phone, etc.)
- "Speichern" Button speichert in `chrome.storage.local` unter Key `faProfile`
- Profil wird beim Start geladen und kann überall Auto-Fill verwenden

**Weitere Modes:**
- Formular-Zusammenfassung: `askFormSummary()` — zeigt Zweck, Pflichtangaben, Stolperstellen
- Review-Modus: Alle ausgefüllten Felder vor dem Submit prüfen
- Dark Mode Toggle im Header: `$('fa-dark-icon')` speichert Pref in `chrome.storage.local`

## Bekannte Browser-Limitierungen
- Chrome Native PDF Viewer: Content Scripts können nicht injiziert werden (isolierter Extension-Context)
- Formulare in Cross-Origin iFrames: werden explizit übersprungen (`window !== window.top`)

## Sicherheitshinweis
API-Key liegt clientseitig in `api-key.txt` innerhalb der Extension. Für Produktion: Backend-Proxy.
`api-key.txt` ist in `.gitignore`, wird nie committed.
GitHub Push Protection blockiert hardcodierte Keys in JS-Dateien (wurde einmal ausgelöst, daher file-basierter Ansatz).

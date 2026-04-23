# Long-Term Memory — FormAssist

## Architektur

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

Hint-Extraktion:
1. `aria-describedby`
2. Klassennamen `[class*="hint"]`, `[class*="help"]`, `small`, `.form-text`
3. Nächstes Sibling-Element (< 200 Zeichen)
4. `pattern` + `title`

### System-Prompt Struktur
```
=== SEITE ===
Titel / URL / H1 / Meta-Description

=== FORMULAR ===
Aktion/Submit: "..."
Anweisungen: "..."

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

### Drag/Resize State Machine
- `isDocked = true`: Sidebar sitzt rechts, `right:0`, transform-Animation für open/close
- `isDocked = false`: Sidebar frei, `left/top` inline, `right:auto`, `no-animate`-Klasse
- Undock wird ausgelöst bei: erstem Drag auf Header, erstem Resize (W/S/SW)
- Minimize speichert `sidebar.style.height` und setzt `56px` direkt (CSS-Klasse allein reicht nicht wegen inline-style-Überschreibung)

## Bekannte Browser-Limitierungen
- Chrome Native PDF Viewer: Content Scripts können nicht injiziert werden (isolierter Extension-Context)
- Formulare in Cross-Origin iFrames: werden explizit übersprungen (`window !== window.top`)

## Sicherheitshinweis
API-Key liegt clientseitig in `api-key.txt` innerhalb der Extension. Für Produktion: Backend-Proxy.
`api-key.txt` ist in `.gitignore`, wird nie committed.
GitHub Push Protection blockiert hardcodierte Keys in JS-Dateien (wurde einmal ausgelöst, daher file-basierter Ansatz).

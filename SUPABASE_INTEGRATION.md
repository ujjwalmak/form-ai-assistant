# Supabase DB Integration — FormAssist

## Credentials
Configure these in the FormAssist options page (not in code).
```
SUPABASE_URL = https://<your-project>.supabase.co
SUPABASE_KEY = <your-anon-key>
```

## Supabase Table (already exists + has data)

```sql
CREATE TABLE form_fields (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  domain     TEXT NOT NULL,       -- e.g. 'www.roboform.com'
  label_de   TEXT NOT NULL,       -- field label to match (any language, named label_de historically)
  tip_de     TEXT,
  tip_en     TEXT,
  tip_fr     TEXT,
  tip_es     TEXT,
  tip_tr     TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE form_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read" ON form_fields FOR SELECT USING (true);
```

## Test data already inserted

### domain: service.berlin.de
- vorname, nachname, geburtsdatum, e-mail, straße (DE/EN/FR/TR tips)

### domain: www.roboform.com
- first name, last name, email, phone, address, city, zip (DE/EN/FR/TR tips)

## How matching works
- On load: fetch all rows for `location.hostname` from Supabase
- Store in `dbTips` map: `{ labelLower → tipString }`
- Tip language: `row[tip_${USER_LANG}] || row.tip_en || row.tip_de`
- `USER_LANG = navigator.language.split('-')[0]`
- On field focus: match `normalizedFieldLabel.includes(key) || key.includes(normalizedFieldLabel)`
- Show green badge in input area if match found; hide on focusout

## Code to add to content.js

### 1. After `const FULL_WIDTH_KEYS` line, before `const AGENT_SELECTOR_ATTR`
```js
  // ── Supabase form knowledge DB ────────────────────────────────────────
  const SUPABASE_URL = 'https://<your-project>.supabase.co';
  const SUPABASE_KEY = '<your-anon-key>';
  const USER_LANG    = (navigator.language || 'de').split('-')[0];

  async function fetchFormTips(domain) {
    if (SUPABASE_URL.includes('YOUR_PROJECT')) return {};
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/form_fields?domain=eq.${encodeURIComponent(domain)}&select=label_de,tip_de,tip_en,tip_fr,tip_es,tip_tr`,
        { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
      );
      if (!res.ok) return {};
      const rows = await res.json();
      const map = {};
      for (const row of rows) {
        const tip = row[`tip_${USER_LANG}`] || row.tip_en || row.tip_de;
        if (tip) map[row.label_de.toLowerCase()] = tip;
      }
      return map;
    } catch { return {}; }
  }
```

### 2. Right after `let SYSTEM = buildSystemPrompt(ctx, profile, extras);`
```js
    let dbTips  = {};
    fetchFormTips(location.hostname).then(tips => { dbTips = tips; });
```

### 3. CSS — after `.autofill-tip strong { ... }` line
```css
      .db-tip { display: none; align-items: flex-start; gap: 7px; margin-bottom: 8px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 7px 9px; font-size: 11.5px; color: #166534; font-family: var(--font); line-height: 1.4; }
      .db-tip.visible { display: flex; }
      .db-tip svg { flex-shrink: 0; margin-top: 1px; }
      :host(.dark) .db-tip { background: #052e1a; border-color: #166534; color: #86efac; }
```

### 4. HTML — after the `<div class="autofill-tip" ...>` block, before `<div class="field-tag" ...>`
```html
          <div class="db-tip" id="fa-db-tip">
            <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
            <span id="fa-db-tip-text"></span>
          </div>
```

### 5. Element refs — after `const autofillValue = $('fa-autofill-value');`
```js
    const dbTipEl        = $('fa-db-tip');
    const dbTipText      = $('fa-db-tip-text');
```

### 6. focusin handler — append inside the `document.addEventListener('focusin', ...)` callback, after the autofillTip block
```js
      const normalizedLabel = label.toLowerCase();
      let matchedTip = null;
      if (normalizedLabel) {
        for (const [key, tip] of Object.entries(dbTips)) {
          if (normalizedLabel.includes(key) || key.includes(normalizedLabel)) { matchedTip = tip; break; }
        }
      }
      if (matchedTip) { dbTipText.textContent = matchedTip; dbTipEl.classList.add('visible'); }
      else dbTipEl.classList.remove('visible');
```

### 7. focusout handler — append `dbTipEl.classList.remove('visible');` alongside `autofillTip.classList.remove('visible');`

## manifest.json — add to host_permissions
```json
"https://*.supabase.co/*"
```

(function () {
  'use strict';

  const MODEL = 'llama-3.1-8b-instant';
  let _apiKey = '';
  let _keyPromise = null;
  function loadKey() {
    if (_apiKey) return Promise.resolve(_apiKey);
    if (_keyPromise) return _keyPromise;
    _keyPromise = fetch(chrome.runtime.getURL('api-key.txt'), { cache: 'no-store' })
      .then(r => { if (!r.ok) throw new Error(); return r.text(); })
      .then(t => { _apiKey = t.trim(); return _apiKey; })
      .catch(() => '')
      .finally(() => { _keyPromise = null; });
    return _keyPromise;
  }

  if (window !== window.top) return;
  if (document.getElementById('formassist-host')) return;

  // ═══════════════════════════════════════════════════════════════════════
  // PROFILE FIELDS + FAKE DATA
  // ═══════════════════════════════════════════════════════════════════════

  const PROFILE_FIELDS = [
    { key: 'firstName',   label: 'Vorname',          ac: ['given-name'],                     kw: ['vorname','first name','given name','firstname'] },
    { key: 'lastName',    label: 'Nachname',          ac: ['family-name'],                    kw: ['nachname','familienname','last name','surname','lastname'] },
    { key: 'email',       label: 'E-Mail',            ac: ['email'],                          kw: ['email','e-mail','mail'] },
    { key: 'phone',       label: 'Telefon',           ac: ['tel'],                            kw: ['telefon','handy','mobile','phone','tel'] },
    { key: 'birthdate',   label: 'Geburtsdatum',      ac: ['bday'],                           kw: ['geburtstag','geburtsdatum','birthdate','birthday','birth date'] },
    { key: 'birthplace',  label: 'Geburtsort',        ac: [],                                 kw: ['geburtsort','birthplace','birth city','birth place'] },
    { key: 'nationality', label: 'Nationalität',      ac: [],                                 kw: ['nationalität','staatsangehörigkeit','nationality','citizenship'] },
    { key: 'street',      label: 'Straße + Nr.',      ac: ['street-address','address-line1'], kw: ['straße','adresse','street','address'] },
    { key: 'zip',         label: 'Postleitzahl',      ac: ['postal-code'],                    kw: ['plz','postleitzahl','zip','postal'] },
    { key: 'city',        label: 'Stadt',             ac: ['address-level2'],                 kw: ['stadt','ort','city','town'] },
    { key: 'country',     label: 'Land',              ac: ['country','country-name'],         kw: ['land','country'] },
    { key: 'iban',        label: 'IBAN',              ac: [],                                 kw: ['iban'] },
    { key: 'bic',         label: 'BIC',               ac: [],                                 kw: ['bic','swift'] },
    { key: 'company',     label: 'Unternehmen',       ac: ['organization'],                   kw: ['firma','unternehmen','company','organization','organisation'] },
    { key: 'jobTitle',    label: 'Berufsbezeichnung', ac: ['organization-title'],             kw: ['beruf','position','job title','berufsbezeichnung'] },
  ];

  const FAKE_DATA = {
    firstName: 'Max', lastName: 'Mustermann', email: 'max.mustermann@example.com',
    phone: '+49 170 1234567', birthdate: '01.01.1990', birthplace: 'Berlin',
    nationality: 'Deutsch', street: 'Musterstraße 42', zip: '10115',
    city: 'Berlin', country: 'Deutschland', iban: 'DE89370400440532013000',
    bic: 'COBADEFFXXX', company: 'Muster GmbH', jobTitle: 'Software-Entwickler',
  };

  const FULL_WIDTH_KEYS = new Set(['email', 'street', 'iban']);

  function matchProfile(el, profile) {
    if (!el) return null;
    const ac = (el.getAttribute('autocomplete') || '').toLowerCase();
    const label = getLabel(el).toLowerCase();
    for (const pf of PROFILE_FIELDS) {
      if (!profile[pf.key]) continue;
      if (ac && ac !== 'on' && ac !== 'off' && pf.ac.some(a => ac.includes(a))) return pf;
      if (pf.kw.some(k => label.includes(k))) return pf;
    }
    return null;
  }

  function fillField(el, value) {
    try {
      const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      if (setter) setter.call(el, value);
      else el.value = value;
    } catch { el.value = value; }
    el.dispatchEvent(new Event('input',  { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // ═══════════════════════════════════════════════════════════════════════
  // RICH CONTEXT EXTRACTION
  // ═══════════════════════════════════════════════════════════════════════

  const SKIP_TYPES = new Set(['hidden', 'submit', 'button', 'reset', 'image']);

  function clean(s) { return (s || '').replace(/\s+/g, ' ').trim(); }

  function isVisible(el) {
    if (el.disabled) return false;
    const s = window.getComputedStyle(el);
    return s.display !== 'none' && s.visibility !== 'hidden' && el.offsetWidth > 0;
  }

  function getLabel(el) {
    let v = clean(el.getAttribute('aria-label'));
    if (v) return v;
    const lblBy = el.getAttribute('aria-labelledby');
    if (lblBy) {
      v = clean(lblBy.split(' ').map(id => document.getElementById(id)?.textContent).filter(Boolean).join(' '));
      if (v) return v;
    }
    if (el.id) {
      const lbl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (lbl) return clean(lbl.textContent).replace(/\s*[*†‡]\s*$/, '');
    }
    const wl = el.closest('label');
    if (wl) {
      const clone = wl.cloneNode(true);
      clone.querySelectorAll('input,select,textarea,button').forEach(e => e.remove());
      v = clean(clone.textContent).replace(/\s*[*†‡]\s*$/, '');
      if (v) return v;
    }
    if (el.title)       return clean(el.title);
    if (el.placeholder) return clean(el.placeholder);
    const raw = el.name || el.id || '';
    if (raw) return raw.replace(/[-_[\]]/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').trim();
    return '';
  }

  function getHint(el) {
    const descBy = el.getAttribute('aria-describedby');
    if (descBy) {
      const v = clean(descBy.split(' ').map(id => document.getElementById(id)?.textContent).filter(Boolean).join(' '));
      if (v) return v;
    }
    const container = el.closest(
      '.field,.form-group,.form-field,.form-item,.form-row,.input-wrapper,.field-wrapper,[class*="field"],[class*="form-group"]'
    ) || el.parentElement;
    if (container) {
      for (const sel of ['[class*="hint"]','[class*="help"]','[class*="description"]','[class*="note"]','small','.form-text','[id*="hint"]','[id*="desc"]']) {
        const found = container.querySelector(sel);
        if (found && found !== el) { const v = clean(found.textContent); if (v && v.length < 300) return v; }
      }
    }
    let sib = el.nextElementSibling;
    while (sib) {
      if (['INPUT','SELECT','TEXTAREA','BUTTON','H1','H2','H3','H4'].includes(sib.tagName)) break;
      const v = clean(sib.textContent);
      if (v && v.length > 3 && v.length < 200) return v;
      sib = sib.nextElementSibling;
    }
    if (el.pattern && el.title) return clean(el.title);
    return '';
  }

  function getError(el) {
    const errId = el.getAttribute('aria-errormessage');
    if (errId) { const v = clean(document.getElementById(errId)?.textContent); if (v) return v; }
    const container = el.closest('.field,.form-group,.form-field,.form-item,[class*="field"]') || el.parentElement;
    if (container) {
      for (const sel of ['[class*="error"]','[class*="invalid"]','[class*="validation"]','[role="alert"]','.help-block','.field-error']) {
        const found = container.querySelector(sel);
        if (found) { const v = clean(found.textContent); if (v && v.length < 200) return v; }
      }
    }
    return '';
  }

  function extractField(el) {
    if (SKIP_TYPES.has(el.type) || !isVisible(el)) return null;
    const label = getLabel(el);
    if (!label) return null;
    const info = {
      label,
      type:         el.tagName === 'SELECT' ? 'select' : el.tagName === 'TEXTAREA' ? 'textarea' : (el.type || 'text'),
      required:     el.required || el.getAttribute('aria-required') === 'true',
      autocomplete: (el.getAttribute('autocomplete') || '').replace(/^(on|off)$/, ''),
      hint:         getHint(el),
      options:      [],
      el,
    };
    if (el.tagName === 'SELECT') info.options = Array.from(el.options).filter(o => o.value && clean(o.text)).slice(0, 10).map(o => clean(o.text));
    if (el.min)                  info.min = el.min;
    if (el.max)                  info.max = el.max;
    if (el.maxLength > 0 && el.maxLength < 9999) info.maxLength = el.maxLength;
    return info;
  }

  function groupIntoSections(formEl) {
    const sections = [];
    let current = { title: '', fields: [] };
    const HEADS = new Set(['H1','H2','H3','H4','H5','LEGEND']);
    const INPUTS = new Set(['INPUT','SELECT','TEXTAREA']);
    function walk(node) {
      if (node.nodeType !== 1) return;
      if (HEADS.has(node.tagName)) {
        if (current.fields.length) { sections.push(current); current = { title: '', fields: [] }; }
        current.title = clean(node.textContent); return;
      }
      if (node.tagName === 'FIELDSET') {
        const legend = node.querySelector(':scope > legend');
        if (legend) { if (current.fields.length) { sections.push(current); current = { title: '', fields: [] }; } current.title = clean(legend.textContent); }
        Array.from(node.children).forEach(walk); return;
      }
      if (INPUTS.has(node.tagName)) {
        const info = extractField(node); if (info) current.fields.push(info); return;
      }
      Array.from(node.children).forEach(walk);
    }
    Array.from(formEl.children).forEach(walk);
    if (current.fields.length) sections.push(current);
    return sections;
  }

  function getFormIntro(formEl) {
    const bits = [];
    const firstInput = formEl.querySelector('input,select,textarea');
    if (firstInput) {
      let node = firstInput.parentElement;
      while (node && node !== formEl) {
        let sib = node.previousElementSibling;
        while (sib && bits.length < 3) {
          if (!sib.querySelector('input,select,textarea')) { const v = clean(sib.textContent); if (v && v.length > 15 && v.length < 500) bits.unshift(v); }
          sib = sib.previousElementSibling;
        }
        node = node.parentElement;
      }
    }
    if (formEl.tagName === 'FORM') {
      const prev = formEl.previousElementSibling;
      if (prev && !prev.querySelector('input,select,textarea')) { const v = clean(prev.textContent); if (v && v.length > 15 && v.length < 500) bits.unshift(v); }
    }
    return [...new Set(bits)].slice(0, 3).join(' | ');
  }

  function getSubmitText(formEl) {
    return Array.from(formEl.querySelectorAll('button[type="submit"],input[type="submit"],button:not([type="button"]):not([type="reset"])'))
      .map(b => clean(b.textContent || b.value)).filter(Boolean).slice(0, 3).join(' / ');
  }

  function extractRichContext() {
    const og = name => document.querySelector(`meta[property="og:${name}"]`)?.content;
    const page = {
      title:    document.title,
      hostname: location.hostname,
      pathname: location.pathname,
      h1:       clean(document.querySelector('h1')?.textContent || ''),
      metaDesc: clean(document.querySelector('meta[name="description"]')?.content || og('description') || ''),
    };
    let formEls = Array.from(document.querySelectorAll('form'));
    if (formEls.length === 0) {
      const loose = document.querySelectorAll('input:not([type=hidden]),select,textarea');
      if (loose.length > 0) formEls = [document.body];
    }
    const forms = formEls.map((formEl, i) => {
      const sections  = groupIntoSections(formEl);
      const allFields = sections.flatMap(s => s.fields);
      if (allFields.length === 0) return null;
      return { index: i + 1, submitText: getSubmitText(formEl), intro: getFormIntro(formEl), sections, allFields };
    }).filter(Boolean);
    return { page, forms };
  }

  function buildSystemPrompt(ctx, profile) {
    const { page, forms } = ctx;
    const lines = [
      'Du bist ein intelligenter KI-Formularassistent. Du hilfst Nutzern dabei, Online-Formulare korrekt, vollständig und fehlerfrei auszufüllen.',
      'Antworte immer auf Deutsch. Sei präzise, freundlich und konkret hilfreich.',
      'Antworte in max. 3 Sätzen, außer wenn eine ausführlichere Erklärung wirklich nötig ist.',
      '',
      '=== SEITE ===',
      `Titel: "${page.title}"`,
      `URL: ${page.hostname}${page.pathname}`,
    ];
    if (page.h1 && page.h1 !== page.title) lines.push(`Hauptüberschrift: "${page.h1}"`);
    if (page.metaDesc) lines.push(`Seitenbeschreibung: ${page.metaDesc}`);
    const filledFields = PROFILE_FIELDS.filter(pf => profile?.[pf.key]);
    if (filledFields.length) {
      lines.push('', '=== NUTZERPROFIL ===');
      filledFields.forEach(pf => lines.push(`${pf.label}: ${profile[pf.key]}`));
    }
    lines.push('');
    forms.forEach(form => {
      lines.push(forms.length > 1 ? `=== FORMULAR ${form.index} ===` : '=== FORMULAR ===');
      if (form.submitText) lines.push(`Aktion/Submit: "${form.submitText}"`);
      if (form.intro)      lines.push(`Anweisungen: "${form.intro}"`);
      lines.push('');
      form.sections.forEach(sec => {
        if (sec.title) lines.push(`[${sec.title}]`);
        sec.fields.forEach(f => {
          let line = `• ${f.label}`;
          if (f.required)     line += ' ✱';
          line += ` (${f.type})`;
          if (f.autocomplete) line += ` [autocomplete: ${f.autocomplete}]`;
          if (f.min || f.max) line += ` [range: ${f.min ?? ''}–${f.max ?? ''}]`;
          if (f.maxLength)    line += ` [max ${f.maxLength} Zeichen]`;
          if (f.hint)         line += ` → "${f.hint}"`;
          if (f.options.length) line += `\n  Optionen: ${f.options.join(', ')}`;
          lines.push(line);
        });
        lines.push('');
      });
    });
    lines.push('✱ = Pflichtfeld');
    return lines.join('\n');
  }

  function getActiveFieldContext(el) {
    if (!el) return '';
    const parts = [];
    const label = getLabel(el);
    if (label) parts.push(`Aktuell fokussiertes Feld: "${label}"`);
    const hint = getHint(el);  if (hint)  parts.push(`Feldhinweis: "${hint}"`);
    const err  = getError(el); if (err)   parts.push(`Aktuelle Fehlermeldung: "${err}"`);
    if (el.required) parts.push('(Pflichtfeld)');
    const val = el.value?.trim();
    if (val && val.length < 100) parts.push(`Aktueller Wert: "${val}"`);
    return parts.length ? '\n\n' + parts.join('\n') : '';
  }

  // ── Run extraction ──────────────────────────────────────────────────
  const ctx = extractRichContext();
  if (ctx.forms.length === 0) return;
  const allFields   = ctx.forms.flatMap(f => f.allFields);
  const submitLabel = ctx.forms[0]?.submitText;

  // ═══════════════════════════════════════════════════════════════════════
  // INIT — load storage before building UI
  // ═══════════════════════════════════════════════════════════════════════

  chrome.storage.local.get(['faProfile', 'faPosition', 'faDarkMode'], stored => {
    const profile  = stored.faProfile  || {};
    const savedPos = stored.faPosition || null;
    let   darkMode = stored.faDarkMode || false;

    const SYSTEM = buildSystemPrompt(ctx, profile);

    // ── Shadow DOM ────────────────────────────────────────────────────
    const hostEl = document.createElement('div');
    hostEl.id = 'formassist-host';
    Object.assign(hostEl.style, { position: 'fixed', inset: '0', zIndex: '2147483647', pointerEvents: 'none' });
    document.body.appendChild(hostEl);
    const shadow = hostEl.attachShadow({ mode: 'open' });

    const fontLink = document.createElement('link');
    fontLink.rel = 'stylesheet';
    fontLink.href = 'https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap';
    shadow.appendChild(fontLink);

    // ── Styles ────────────────────────────────────────────────────────
    const style = document.createElement('style');
    style.textContent = `
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      :host {
        --bg:       #f4f2ee; --surface: #ffffff; --border:  #e2dfd8; --border2: #ccc9c0;
        --text:     #1a1917; --text2:   #5c5a55; --text3:   #9b9890;
        --accent:   #2d5be3; --accent-l: #eef2fd; --accent-b: #b8c9f8;
        --danger:   #c0392b;
        --shadow:   0 8px 40px rgba(0,0,0,0.16), 0 2px 8px rgba(0,0,0,0.08);
        --font:     'DM Sans', system-ui, -apple-system, sans-serif;
        --ease:     cubic-bezier(0.4, 0, 0.2, 1);
      }
      :host(.dark) {
        --bg:       #1c1b19; --surface: #252320; --border:  #3a3835; --border2: #4e4b46;
        --text:     #f0ede8; --text2:   #a8a49e; --text3:   #6b6860;
        --accent:   #5578f0; --accent-l: #1c2545; --accent-b: #2d4080;
        --shadow:   0 8px 40px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.3);
      }

      /* ── Trigger ── */
      .trigger {
        position: fixed; bottom: 24px; right: 24px; width: 54px; height: 54px;
        background: var(--accent); border: none; border-radius: 50%; cursor: pointer;
        display: flex; align-items: center; justify-content: center; pointer-events: all; z-index: 2;
        box-shadow: 0 4px 20px rgba(45,91,227,0.45), 0 1px 4px rgba(0,0,0,0.12);
        transition: transform 0.2s var(--ease), box-shadow 0.2s var(--ease), opacity 0.2s;
      }
      .trigger:hover  { transform: scale(1.1); box-shadow: 0 6px 28px rgba(45,91,227,0.55); }
      .trigger:active { transform: scale(0.95); }
      .trigger svg    { width: 22px; height: 22px; stroke: #fff; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; fill: none; }
      .trigger::after { content: ''; position: absolute; inset: -4px; border-radius: 50%; border: 2px solid rgba(45,91,227,0.4); animation: pulse 2s ease-out 0.6s 3; }
      @keyframes pulse { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(1.55); opacity: 0; } }

      /* ── Sidebar ── */
      .sidebar {
        position: fixed; top: 0; right: 0; bottom: 0; width: 380px; min-width: 300px;
        background: var(--surface); border-left: 1px solid var(--border);
        box-shadow: var(--shadow); display: flex; flex-direction: column;
        font-family: var(--font); pointer-events: all; z-index: 2;
        transform: translateX(calc(100% + 4px));
        transition: transform 0.28s var(--ease);
        user-select: none;
      }
      .sidebar.open       { transform: translateX(0); }
      .sidebar.no-animate { transition: none !important; }
      .sidebar.minimized  { overflow: hidden; }
      .sidebar.minimized .resize-s, .sidebar.minimized .resize-sw { display: none; }

      /* ── Resize handles ── */
      .resize-w { position: absolute; left: 0; top: 0; bottom: 0; width: 8px; cursor: ew-resize; z-index: 10; }
      .resize-w::after {
        content: ''; position: absolute; left: 2px; top: 50%; transform: translateY(-50%);
        width: 3px; height: 40px; border-radius: 3px;
        background: var(--border2); opacity: 0; transition: opacity 0.2s;
      }
      .resize-w:hover::after, .sidebar:hover .resize-w::after { opacity: 1; }
      .resize-s { position: absolute; bottom: 0; left: 0; right: 0; height: 8px; cursor: ns-resize; z-index: 10; }
      .resize-s::after {
        content: ''; position: absolute; top: 2px; left: 50%; transform: translateX(-50%);
        height: 3px; width: 40px; border-radius: 3px;
        background: var(--border2); opacity: 0; transition: opacity 0.2s;
      }
      .resize-s:hover::after, .sidebar:hover .resize-s::after { opacity: 1; }
      .resize-sw { position: absolute; bottom: 0; left: 0; width: 16px; height: 16px; cursor: sw-resize; z-index: 11; }

      /* ── Header ── */
      .header {
        padding: 0 14px; height: 56px; border-bottom: 1px solid var(--border);
        display: flex; align-items: center; justify-content: space-between;
        background: var(--surface); flex-shrink: 0; cursor: grab; touch-action: none;
      }
      .header:active { cursor: grabbing; }
      .sidebar.minimized .header { border-bottom: none; }
      .logo      { display: flex; align-items: center; gap: 9px; pointer-events: none; }
      .logo-icon { width: 30px; height: 30px; background: var(--accent); border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
      .logo-icon svg { width: 16px; height: 16px; stroke: #fff; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; fill: none; }
      .logo-name  { font-size: 15px; font-weight: 600; color: var(--text); letter-spacing: -0.3px; }
      .logo-badge { font-size: 10px; font-weight: 500; background: var(--accent-l); color: var(--accent); border: 1px solid var(--accent-b); padding: 2px 7px; border-radius: 20px; }
      .header-btns { display: flex; gap: 4px; }
      .icon-btn { width: 28px; height: 28px; border: none; background: none; cursor: pointer; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: var(--text3); transition: background 0.15s, color 0.15s; }
      .icon-btn:hover  { background: var(--bg); color: var(--text); }
      .icon-btn.active { background: var(--accent-l); color: var(--accent); }
      .icon-btn svg { width: 14px; height: 14px; stroke: currentColor; stroke-width: 2.2; stroke-linecap: round; fill: none; }

      /* ── Context banner ── */
      .ctx-banner { padding: 9px 18px; background: var(--bg); border-bottom: 1px solid var(--border); flex-shrink: 0; }
      .ctx-title  { font-size: 12px; font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .ctx-sub    { font-size: 11px; color: var(--text3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 1px; }

      /* ── Messages ── */
      .messages { flex: 1; overflow-y: auto; padding: 16px 18px; display: flex; flex-direction: column; gap: 14px; scroll-behavior: smooth; }
      .messages::-webkit-scrollbar { width: 4px; }
      .messages::-webkit-scrollbar-track { background: transparent; }
      .messages::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 4px; }
      .msg { display: flex; gap: 9px; align-items: flex-end; animation: msg-in 0.2s var(--ease); }
      @keyframes msg-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      .msg.user { flex-direction: row-reverse; }
      .avatar { width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 700; flex-shrink: 0; font-family: var(--font); }
      .msg.ai   .avatar { background: var(--accent); color: #fff; }
      .msg.user .avatar { background: var(--border); color: var(--text2); }
      .bubble { max-width: 290px; padding: 10px 13px; font-size: 13.5px; line-height: 1.55; color: var(--text); font-family: var(--font); }
      .msg.ai   .bubble { background: var(--bg); border: 1px solid var(--border); border-radius: 14px 14px 14px 4px; }
      .msg.user .bubble { background: var(--accent); color: #fff; border-radius: 14px 14px 4px 14px; }

      /* ── Field list ── */
      .field-list { display: flex; flex-direction: column; gap: 5px; margin-top: 10px; max-height: 180px; overflow-y: auto; padding-right: 2px; }
      .field-list::-webkit-scrollbar { width: 3px; }
      .field-list::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 3px; }
      .field-btn {
        background: var(--surface); border: 1px solid var(--border2); color: var(--text2);
        padding: 6px 10px; border-radius: 8px; font-size: 12px; cursor: pointer;
        text-align: left; font-family: var(--font); display: flex; align-items: center; gap: 7px;
        transition: background 0.15s, color 0.15s, border-color 0.15s;
      }
      .field-btn:hover { background: var(--accent-l); color: var(--accent); border-color: var(--accent-b); }
      .field-btn .req { color: #e05; font-size: 10px; margin-left: auto; flex-shrink: 0; }
      .field-type-tag { font-size: 10px; color: var(--text3); background: var(--bg); border: 1px solid var(--border); padding: 1px 5px; border-radius: 4px; flex-shrink: 0; }

      /* ── Chips ── */
      .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
      .chip  { background: var(--surface); border: 1px solid var(--border2); color: var(--text2); padding: 4px 10px; border-radius: 12px; font-size: 11.5px; cursor: pointer; font-family: var(--font); transition: background 0.15s, border-color 0.15s, color 0.15s; white-space: nowrap; }
      .chip:hover { background: var(--accent-l); border-color: var(--accent-b); color: var(--accent); }

      /* ── Typing ── */
      .typing-row    { display: flex; gap: 9px; align-items: flex-end; }
      .typing-bubble { background: var(--bg); border: 1px solid var(--border); border-radius: 14px 14px 14px 4px; padding: 12px 16px; display: flex; gap: 5px; align-items: center; }
      .dot { width: 6px; height: 6px; background: var(--text3); border-radius: 50%; animation: bounce 1.2s ease-in-out infinite; }
      .dot:nth-child(2) { animation-delay: 0.18s; }
      .dot:nth-child(3) { animation-delay: 0.36s; }
      @keyframes bounce { 0%,60%,100% { transform: translateY(0); } 30% { transform: translateY(-7px); } }

      /* ── Input area ── */
      .input-area  { padding: 12px 16px 14px; border-top: 1px solid var(--border); background: var(--surface); flex-shrink: 0; }
      .field-tag   { font-size: 11px; color: var(--text3); margin-bottom: 6px; display: none; align-items: center; gap: 5px; }
      .field-tag.visible { display: flex; }
      .field-tag .dot-ind { width: 6px; height: 6px; background: var(--accent); border-radius: 50%; flex-shrink: 0; animation: blink 2s ease-in-out infinite; }
      @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
      .field-tag span { font-weight: 500; color: var(--accent); }
      .input-row  { display: flex; gap: 8px; align-items: flex-end; }
      .input-box  { flex: 1; font-family: var(--font); font-size: 13.5px; padding: 9px 12px; border: 1px solid var(--border2); border-radius: 10px; background: var(--bg); color: var(--text); resize: none; outline: none; min-height: 38px; max-height: 100px; line-height: 1.45; transition: border-color 0.15s, box-shadow 0.15s, background 0.15s; }
      .input-box:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(45,91,227,0.1); background: var(--surface); }
      .input-box::placeholder { color: var(--text3); }
      .send-btn { width: 38px; height: 38px; background: var(--accent); border: none; border-radius: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: background 0.15s, transform 0.1s; }
      .send-btn:hover  { background: #1f46b8; }
      .send-btn:active { transform: scale(0.93); }
      .send-btn svg { width: 15px; height: 15px; stroke: #fff; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; fill: none; }
      .footer-note { font-size: 10px; color: var(--text3); text-align: center; margin-top: 9px; font-family: var(--font); }

      /* ── Autofill tip ── */
      .autofill-tip { display: none; align-items: center; gap: 8px; margin-bottom: 6px; background: var(--accent-l); border: 1px solid var(--accent-b); border-radius: 8px; padding: 6px 10px; font-size: 11.5px; color: var(--text2); font-family: var(--font); }
      .autofill-tip.visible { display: flex; }
      .autofill-tip strong { color: var(--text); font-weight: 500; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .autofill-btn { background: var(--accent); color: #fff; border: none; border-radius: 6px; padding: 3px 9px; font-size: 11px; cursor: pointer; font-family: var(--font); white-space: nowrap; flex-shrink: 0; transition: background 0.15s; }
      .autofill-btn:hover { background: #1f46b8; }

      /* ── Profile panel ── */
      .profile-panel { display: none; flex-direction: column; flex: 1; overflow: hidden; }
      .profile-panel.visible { display: flex; }
      .profile-hdr { padding: 10px 18px; border-bottom: 1px solid var(--border); font-size: 11.5px; font-weight: 600; color: var(--text2); flex-shrink: 0; display: flex; justify-content: space-between; align-items: center; }
      .profile-hdr span:last-child { font-weight: 400; color: var(--text3); font-size: 10.5px; }
      .profile-grid { flex: 1; overflow-y: auto; padding: 14px 18px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      .profile-grid::-webkit-scrollbar { width: 4px; }
      .profile-grid::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 4px; }
      .pf { display: flex; flex-direction: column; gap: 4px; }
      .pf.full { grid-column: 1 / -1; }
      .pf label { font-size: 10.5px; color: var(--text3); font-weight: 500; font-family: var(--font); }
      .pf input { font-family: var(--font); font-size: 12.5px; padding: 6px 9px; border: 1px solid var(--border2); border-radius: 7px; background: var(--bg); color: var(--text); outline: none; transition: border-color 0.15s, box-shadow 0.15s; }
      .pf input:focus { border-color: var(--accent); box-shadow: 0 0 0 2px rgba(45,91,227,0.1); background: var(--surface); }
      .profile-actions { padding: 10px 18px; border-top: 1px solid var(--border); display: flex; gap: 6px; flex-shrink: 0; flex-wrap: wrap; }
      .profile-actions button { flex: 1; min-width: 0; padding: 7px 8px; border-radius: 8px; font-size: 11.5px; font-family: var(--font); cursor: pointer; border: 1px solid var(--border2); background: var(--surface); color: var(--text2); transition: background 0.15s, color 0.15s; white-space: nowrap; }
      .profile-actions button:hover { background: var(--bg); color: var(--text); }
      .profile-actions .btn-primary { background: var(--accent); color: #fff; border-color: transparent; }
      .profile-actions .btn-primary:hover { background: #1f46b8; }
      .profile-actions .btn-danger { color: var(--danger); border-color: var(--danger); }
      .profile-actions .btn-danger:hover { background: rgba(192,57,43,0.08); }

      /* ── Toast ── */
      .toast { position: absolute; top: 66px; left: 50%; transform: translateX(-50%) translateY(-6px); background: var(--text); color: var(--surface); font-family: var(--font); font-size: 12px; padding: 6px 14px; border-radius: 20px; opacity: 0; transition: opacity 0.2s, transform 0.2s; pointer-events: none; white-space: nowrap; z-index: 20; }
      .toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
    `;
    shadow.appendChild(style);

    // ── DOM ───────────────────────────────────────────────────────────
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <button class="trigger" id="fa-trigger" title="FormAssist öffnen">
        <svg viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
      </button>
      <div class="sidebar" id="fa-sidebar">
        <div class="toast" id="fa-toast"></div>
        <div class="resize-w"  id="fa-resize-w"></div>
        <div class="resize-s"  id="fa-resize-s"></div>
        <div class="resize-sw" id="fa-resize-sw"></div>
        <div class="header" id="fa-header">
          <div class="logo">
            <div class="logo-icon"><svg viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/><path d="M9 12h6M9 16h4"/></svg></div>
            <span class="logo-name">FormAssist</span>
            <span class="logo-badge">KI</span>
          </div>
          <div class="header-btns">
            <button class="icon-btn" id="fa-profile-btn" title="Profil"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" stroke-width="2"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg></button>
            <button class="icon-btn" id="fa-dark-btn" title="Dark Mode"><svg viewBox="0 0 24 24" id="fa-dark-icon"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg></button>
            <button class="icon-btn" id="fa-minimize" title="Minimieren"><svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg></button>
            <button class="icon-btn" id="fa-close"    title="Schließen"><svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
        </div>
        <div class="ctx-banner">
          <div class="ctx-title" id="fa-ctx-title"></div>
          <div class="ctx-sub"   id="fa-ctx-sub"></div>
        </div>
        <div class="messages" id="fa-messages"></div>
        <div class="profile-panel" id="fa-profile-panel">
          <div class="profile-hdr"><span>Mein Profil</span><span>Lokal gespeichert · nie übertragen</span></div>
          <div class="profile-grid" id="fa-profile-grid"></div>
          <div class="profile-actions">
            <button class="btn-primary" id="fa-pf-save">Speichern</button>
            <button id="fa-pf-fake">Fake-Daten</button>
            <button id="fa-pf-fill">Formular ausfüllen</button>
            <button class="btn-danger" id="fa-pf-clear">Löschen</button>
          </div>
        </div>
        <div class="input-area">
          <div class="autofill-tip" id="fa-autofill-tip">
            <strong id="fa-autofill-value"></strong>
            <button class="autofill-btn" id="fa-autofill-btn">Ausfüllen</button>
          </div>
          <div class="field-tag" id="fa-field-tag">
            <div class="dot-ind"></div>Aktives Feld: <span id="fa-field-name"></span>
          </div>
          <div class="input-row">
            <textarea class="input-box" id="fa-input" placeholder="Frage zum Formular stellen…" rows="1"></textarea>
            <button class="send-btn" id="fa-send"><svg viewBox="0 0 24 24"><path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/></svg></button>
          </div>
          <div class="footer-note">Powered by Groq · llama-3.1-8b-instant</div>
        </div>
      </div>`;
    shadow.appendChild(wrap);

    // ── Element refs ──────────────────────────────────────────────────
    const $          = id => shadow.getElementById(id);
    const triggerBtn  = $('fa-trigger');
    const sidebar     = $('fa-sidebar');
    const header      = $('fa-header');
    const resizeW     = $('fa-resize-w');
    const resizeS     = $('fa-resize-s');
    const resizeSW    = $('fa-resize-sw');
    const messagesEl  = $('fa-messages');
    const inputEl     = $('fa-input');
    const fieldTag    = $('fa-field-tag');
    const fieldNameEl = $('fa-field-name');
    const profilePanel   = $('fa-profile-panel');
    const profileGrid    = $('fa-profile-grid');
    const autofillTip    = $('fa-autofill-tip');
    const autofillValue  = $('fa-autofill-value');
    const toastEl        = $('fa-toast');

    $('fa-ctx-title').textContent = ctx.page.h1 || ctx.page.title || ctx.page.hostname;
    $('fa-ctx-sub').textContent   = [submitLabel ? `"${submitLabel}"` : null, `${allFields.length} Felder`, ctx.page.hostname].filter(Boolean).join(' · ');

    // ── Apply dark mode ───────────────────────────────────────────────
    if (darkMode) hostEl.classList.add('dark');

    // ── Toast ─────────────────────────────────────────────────────────
    let toastTimer;
    function showToast(msg) {
      toastEl.textContent = msg;
      toastEl.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2400);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PROFILE PANEL
    // ═══════════════════════════════════════════════════════════════════════

    PROFILE_FIELDS.forEach(pf => {
      const div = document.createElement('div');
      div.className = 'pf' + (FULL_WIDTH_KEYS.has(pf.key) ? ' full' : '');
      const lbl = document.createElement('label');
      lbl.textContent = pf.label;
      const inp = document.createElement('input');
      inp.type = 'text';
      inp.id = `fa-pf-${pf.key}`;
      inp.value = profile[pf.key] || '';
      inp.placeholder = pf.label;
      div.appendChild(lbl);
      div.appendChild(inp);
      profileGrid.appendChild(div);
    });

    function getProfileFromInputs() {
      const p = {};
      PROFILE_FIELDS.forEach(pf => {
        const v = shadow.getElementById(`fa-pf-${pf.key}`)?.value.trim();
        if (v) p[pf.key] = v;
      });
      return p;
    }

    function loadProfileIntoInputs(p) {
      PROFILE_FIELDS.forEach(pf => {
        const inp = shadow.getElementById(`fa-pf-${pf.key}`);
        if (inp) inp.value = p[pf.key] || '';
      });
    }

    let profileVisible = false;
    function showProfile() {
      profileVisible = true;
      profilePanel.classList.add('visible');
      messagesEl.style.display = 'none';
      $('fa-profile-btn').classList.add('active');
    }
    function hideProfile() {
      profileVisible = false;
      profilePanel.classList.remove('visible');
      messagesEl.style.display = '';
      $('fa-profile-btn').classList.remove('active');
    }

    $('fa-profile-btn').addEventListener('click', () => { if (profileVisible) hideProfile(); else showProfile(); });

    $('fa-pf-save').addEventListener('click', () => {
      const p = getProfileFromInputs();
      PROFILE_FIELDS.forEach(pf => { if (p[pf.key]) profile[pf.key] = p[pf.key]; else delete profile[pf.key]; });
      chrome.storage.local.set({ faProfile: profile }, () => showToast('Profil gespeichert'));
    });

    $('fa-pf-fake').addEventListener('click', () => loadProfileIntoInputs(FAKE_DATA));

    $('fa-pf-fill').addEventListener('click', () => {
      let filled = 0;
      allFields.forEach(f => {
        if (!f.el) return;
        const pf = matchProfile(f.el, profile);
        if (pf) { fillField(f.el, profile[pf.key]); filled++; }
      });
      hideProfile();
      showToast(filled > 0 ? `${filled} Felder ausgefüllt` : 'Keine passenden Felder gefunden');
    });

    $('fa-pf-clear').addEventListener('click', () => {
      PROFILE_FIELDS.forEach(pf => delete profile[pf.key]);
      loadProfileIntoInputs({});
      chrome.storage.local.remove('faProfile', () => showToast('Profil gelöscht'));
    });

    // ── Autofill tip ──────────────────────────────────────────────────
    $('fa-autofill-btn').addEventListener('click', () => {
      if (!activeFieldEl) return;
      const pf = matchProfile(activeFieldEl, profile);
      if (pf) { fillField(activeFieldEl, profile[pf.key]); autofillTip.classList.remove('visible'); showToast('Feld ausgefüllt'); }
    });

    // ═══════════════════════════════════════════════════════════════════════
    // POSITION MEMORY
    // ═══════════════════════════════════════════════════════════════════════

    function savePosition() {
      chrome.storage.local.set({ faPosition: {
        left: sidebar.style.left, top: sidebar.style.top,
        width: sidebar.style.width, height: sidebar.style.height,
        isDocked: false,
      }});
    }

    // ═══════════════════════════════════════════════════════════════════════
    // DRAG
    // ═══════════════════════════════════════════════════════════════════════

    let isDocked  = true;
    let dragStart = null;

    header.addEventListener('pointerdown', e => {
      if (e.target.closest('button') || isMinimized) return;
      undock();
      dragStart = { x: e.clientX, y: e.clientY, left: parseFloat(sidebar.style.left), top: parseFloat(sidebar.style.top), w: sidebar.offsetWidth, h: sidebar.offsetHeight };
      header.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    header.addEventListener('pointermove', e => {
      if (!dragStart) return;
      sidebar.style.left = Math.max(0, Math.min(window.innerWidth  - dragStart.w, dragStart.left + e.clientX - dragStart.x)) + 'px';
      sidebar.style.top  = Math.max(0, Math.min(window.innerHeight - dragStart.h, dragStart.top  + e.clientY - dragStart.y)) + 'px';
    });
    header.addEventListener('pointerup',     () => { if (dragStart) { dragStart = null; savePosition(); } });
    header.addEventListener('pointercancel', () => { dragStart = null; });

    // ═══════════════════════════════════════════════════════════════════════
    // RESIZE
    // ═══════════════════════════════════════════════════════════════════════

    function undock() {
      if (isDocked) {
        isDocked = false;
        const rect = sidebar.getBoundingClientRect();
        sidebar.classList.add('no-animate');
        sidebar.style.right     = 'auto';
        sidebar.style.left      = rect.left   + 'px';
        sidebar.style.top       = rect.top    + 'px';
        sidebar.style.bottom    = 'auto';
        sidebar.style.height    = rect.height + 'px';
        sidebar.style.transform = 'none';
      }
    }

    function bindResize(el, mode) {
      let start = null;
      el.addEventListener('pointerdown', e => {
        if (isMinimized) return;
        undock();
        const rect = sidebar.getBoundingClientRect();
        start = { x: e.clientX, y: e.clientY, left: rect.left, top: rect.top, right: rect.right, w: rect.width, h: rect.height };
        el.setPointerCapture(e.pointerId);
        e.preventDefault(); e.stopPropagation();
      });
      el.addEventListener('pointermove', e => {
        if (!start) return;
        const dx = e.clientX - start.x;
        const dy = e.clientY - start.y;
        if (mode === 'w' || mode === 'sw') {
          const newLeft = Math.max(20, Math.min(start.right - 300, start.left + dx));
          sidebar.style.left  = newLeft + 'px';
          sidebar.style.width = (start.right - newLeft) + 'px';
        }
        if (mode === 's' || mode === 'sw') {
          sidebar.style.height = Math.max(300, Math.min(window.innerHeight - start.top - 20, start.h + dy)) + 'px';
        }
      });
      el.addEventListener('pointerup',     () => { if (start) { start = null; savePosition(); } });
      el.addEventListener('pointercancel', () => { start = null; });
    }

    bindResize(resizeW,  'w');
    bindResize(resizeS,  's');
    bindResize(resizeSW, 'sw');

    // ═══════════════════════════════════════════════════════════════════════
    // MINIMIZE
    // ═══════════════════════════════════════════════════════════════════════

    let isMinimized = false;
    let savedHeight = null;
    const minBtn = $('fa-minimize');

    minBtn.addEventListener('click', () => {
      isMinimized = !isMinimized;
      sidebar.classList.toggle('minimized', isMinimized);
      if (isMinimized) {
        savedHeight = sidebar.style.height || null;
        sidebar.style.height = '56px';
        sidebar.style.bottom = 'auto';
      } else {
        sidebar.style.height = savedHeight || '';
        if (isDocked) sidebar.style.bottom = '0';
      }
      minBtn.querySelector('svg path').setAttribute('d',
        isMinimized ? 'M5 12h14M12 5l7 7-7 7' : 'M5 12h14'
      );
    });

    // ═══════════════════════════════════════════════════════════════════════
    // DARK MODE
    // ═══════════════════════════════════════════════════════════════════════

    function updateDarkIcon() {
      $('fa-dark-icon').innerHTML = darkMode
        ? '<circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>'
        : '<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>';
    }
    updateDarkIcon();

    $('fa-dark-btn').addEventListener('click', () => {
      darkMode = !darkMode;
      if (darkMode) hostEl.classList.add('dark'); else hostEl.classList.remove('dark');
      updateDarkIcon();
      chrome.storage.local.set({ faDarkMode: darkMode });
    });

    // ═══════════════════════════════════════════════════════════════════════
    // OPEN / CLOSE
    // ═══════════════════════════════════════════════════════════════════════

    let isOpen = false;

    function open() {
      isOpen = true;
      if (isDocked) sidebar.classList.add('open');
      else          sidebar.style.display = 'flex';
      triggerBtn.style.opacity       = '0';
      triggerBtn.style.pointerEvents = 'none';
      if (history.length === 0) greet();
      setTimeout(() => inputEl.focus(), 320);
    }

    function close() {
      isOpen = false;
      if (isDocked) sidebar.classList.remove('open');
      else          sidebar.style.display = 'none';
      triggerBtn.style.opacity       = '';
      triggerBtn.style.pointerEvents = '';
    }

    triggerBtn.addEventListener('click', open);
    $('fa-close').addEventListener('click', close);
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && isOpen) close(); });

    // ═══════════════════════════════════════════════════════════════════════
    // MESSAGES
    // ═══════════════════════════════════════════════════════════════════════

    function addMsg(role, html, chips) {
      const div = document.createElement('div');
      div.className = 'msg ' + role;
      const bubble = document.createElement('div');
      bubble.className = 'bubble';
      bubble.innerHTML = html;
      if (chips?.length) {
        const cd = document.createElement('div');
        cd.className = 'chips';
        chips.forEach(c => {
          const b = document.createElement('button');
          b.className = 'chip'; b.textContent = c;
          b.addEventListener('click', () => send(c));
          cd.appendChild(b);
        });
        bubble.appendChild(cd);
      }
      div.innerHTML = `<div class="avatar">${role === 'ai' ? 'KI' : 'Sie'}</div>`;
      div.appendChild(bubble);
      messagesEl.appendChild(div);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function showTyping() {
      const div = document.createElement('div');
      div.id = 'fa-typing'; div.className = 'typing-row';
      div.innerHTML = `<div class="avatar" style="width:26px;height:26px;border-radius:50%;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;font-family:var(--font);flex-shrink:0">KI</div><div class="typing-bubble"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>`;
      messagesEl.appendChild(div);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
    function removeTyping() { $('fa-typing')?.remove(); }

    // ═══════════════════════════════════════════════════════════════════════
    // GREETING + FIELD LIST
    // ═══════════════════════════════════════════════════════════════════════

    function greet() {
      const purpose = submitLabel
        ? `Ich sehe das Formular <strong>"${submitLabel}"</strong>`
        : `Ich habe <strong>${allFields.length} Felder</strong> erkannt`;

      const div = document.createElement('div');
      div.className = 'msg ai';
      div.innerHTML = `<div class="avatar">KI</div>`;
      const bubble = document.createElement('div');
      bubble.className = 'bubble';
      bubble.innerHTML = `${purpose} auf <em>${ctx.page.hostname}</em>. Klicke auf ein Feld für gezielte Hilfe, oder stell mir direkt eine Frage.`;

      const list = document.createElement('div');
      list.className = 'field-list';
      allFields.slice(0, 15).forEach(f => {
        const btn = document.createElement('button');
        btn.className = 'field-btn';
        btn.innerHTML = `<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${f.label}</span><span class="field-type-tag">${f.type}</span>${f.required ? '<span class="req">Pflicht</span>' : ''}`;
        btn.addEventListener('click', () => {
          if (f.el) {
            f.el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const prev = f.el.style.outline;
            f.el.style.outline = '2px solid #2d5be3';
            f.el.style.outlineOffset = '3px';
            setTimeout(() => { f.el.style.outline = prev; f.el.style.outlineOffset = ''; }, 1800);
            activeFieldEl = f.el;
            fieldNameEl.textContent = f.label;
            fieldTag.classList.add('visible');
          }
          send(`Erkläre mir das Feld "${f.label}" — was soll ich eintragen?`);
        });
        list.appendChild(btn);
      });
      if (allFields.length > 15) {
        const more = document.createElement('div');
        more.style.cssText = 'font-size:11px;color:var(--text3);text-align:center;padding:4px 0';
        more.textContent = `+ ${allFields.length - 15} weitere Felder`;
        list.appendChild(more);
      }
      bubble.appendChild(list);
      div.appendChild(bubble);
      messagesEl.appendChild(div);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // AI
    // ═══════════════════════════════════════════════════════════════════════

    let history       = [];
    let activeFieldEl = null;

    async function askAI(userText) {
      const key = await loadKey();
      if (!key) { addMsg('ai', 'API-Schlüssel nicht gefunden. Bitte <code>api-key.txt</code> mit deinem Groq API-Key befüllen.'); return; }
      const content = userText + getActiveFieldContext(activeFieldEl);
      history.push({ role: 'user', content });
      showTyping();
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
          body: JSON.stringify({ model: MODEL, max_tokens: 400, messages: [{ role: 'system', content: SYSTEM }, ...history.slice(-10)] }),
        });
        const data = await res.json();
        removeTyping();
        if (!res.ok) { addMsg('ai', 'Fehler: ' + (data.error?.message || `HTTP ${res.status}`)); history.pop(); return; }
        const reply = data.choices?.[0]?.message?.content?.trim();
        if (reply) { history.push({ role: 'assistant', content: reply }); addMsg('ai', reply.replace(/\n/g, '<br>')); }
        else       { addMsg('ai', 'Unbekannter Fehler.'); history.pop(); }
      } catch {
        removeTyping();
        addMsg('ai', 'Verbindungsfehler. Bitte Internetverbindung prüfen.');
        history.pop();
      }
    }

    function send(text) {
      const t = (text !== undefined ? text : inputEl.value).trim();
      if (!t) return;
      addMsg('user', t);
      inputEl.value = ''; inputEl.style.height = 'auto';
      askAI(t);
    }

    $('fa-send').addEventListener('click', () => send());
    inputEl.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
    inputEl.addEventListener('input',   () => { inputEl.style.height = 'auto'; inputEl.style.height = Math.min(inputEl.scrollHeight, 100) + 'px'; });

    // ═══════════════════════════════════════════════════════════════════════
    // FIELD FOCUS TRACKING + AUTOFILL TIP
    // ═══════════════════════════════════════════════════════════════════════

    document.addEventListener('focusin', e => {
      const el = e.target;
      if (!['INPUT','SELECT','TEXTAREA'].includes(el.tagName) || el.type === 'hidden' || !isVisible(el)) return;
      activeFieldEl = el;
      const label = getLabel(el);
      if (label) { fieldNameEl.textContent = label; fieldTag.classList.add('visible'); }
      const pf = matchProfile(el, profile);
      if (pf && profile[pf.key]) {
        autofillValue.textContent = `${pf.label}: ${profile[pf.key]}`;
        autofillTip.classList.add('visible');
      } else {
        autofillTip.classList.remove('visible');
      }
    });

    // ═══════════════════════════════════════════════════════════════════════
    // SPA — dynamic form detection
    // ═══════════════════════════════════════════════════════════════════════

    let debounce;
    new MutationObserver(() => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        const fresh = extractRichContext();
        const n = fresh.forms.flatMap(f => f.allFields).length;
        if (n !== allFields.length)
          $('fa-ctx-sub').textContent = [fresh.forms[0]?.submitText ? `"${fresh.forms[0].submitText}"` : null, `${n} Felder`, ctx.page.hostname].filter(Boolean).join(' · ');
      }, 800);
    }).observe(document.body, { childList: true, subtree: true });

    // ── Restore saved position ────────────────────────────────────────
    if (savedPos && !savedPos.isDocked) {
      isDocked = false;
      sidebar.classList.add('no-animate');
      sidebar.style.display   = 'none';
      sidebar.style.right     = 'auto';
      sidebar.style.left      = savedPos.left   || '20px';
      sidebar.style.top       = savedPos.top    || '20px';
      sidebar.style.bottom    = 'auto';
      sidebar.style.width     = savedPos.width  || '380px';
      sidebar.style.height    = savedPos.height || '';
      sidebar.style.transform = 'none';
      requestAnimationFrame(() => requestAnimationFrame(() => sidebar.classList.remove('no-animate')));
    }

  }); // end chrome.storage.local.get

})();

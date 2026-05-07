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
    const text = String(value ?? '').trim();
    const type = (el.type || '').toLowerCase();

    if (el.tagName === 'SELECT') {
      const wanted = text.toLowerCase();
      const option = text ? Array.from(el.options).find(o => {
        const label = clean(o.text || o.label || o.value).toLowerCase();
        const val = clean(o.value).toLowerCase();
        return label === wanted || val === wanted || label.includes(wanted) || wanted.includes(label);
      }) : null;
      if (option) el.value = option.value;
      else if (text) el.value = text;
    } else if (type === 'checkbox') {
      el.checked = /^(ja|yes|true|1|x|ok|checked|ausgewählt)$/i.test(text);
    } else if (type === 'radio') {
      const root = el.form || document;
      const options = el.name ? Array.from(root.querySelectorAll(`input[type="radio"][name="${CSS.escape(el.name)}"]`)) : [el];
      const wanted = text.toLowerCase();
      const match = options.find(opt => {
        const label = getLabel(opt).toLowerCase();
        const val = String(opt.value || '').toLowerCase();
        return label === wanted || val === wanted || label.includes(wanted) || wanted.includes(label);
      }) || options[0];
      if (match) match.checked = true;
      el = match || el;
    } else {
      try {
        const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        if (setter) setter.call(el, text);
        else el.value = text;
      } catch { el.value = text; }
    }
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

  function buildSystemPrompt(ctx, profile, extras = {}) {
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
    const extraEntries = Object.entries(extras).filter(([, v]) => v);
    if (extraEntries.length) {
      lines.push('', '=== WEITERE GESPEICHERTE DATEN ===');
      extraEntries.forEach(([k, v]) => lines.push(`${k}: ${v}`));
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

  chrome.storage.local.get(['faProfile', 'faPosition', 'faDarkMode', 'faExtras'], stored => {
    const profile  = stored.faProfile  || {};
    const savedPos = stored.faPosition || null;
    let   darkMode = stored.faDarkMode || false;
    const extras   = stored.faExtras   || {};

    const SYSTEM = buildSystemPrompt(ctx, profile, extras);

    // ── Shadow DOM ────────────────────────────────────────────────────
    const hostEl = document.createElement('div');
    hostEl.id = 'formassist-host';
    Object.assign(hostEl.style, { position: 'fixed', inset: '0', zIndex: '2147483647', pointerEvents: 'none' });
    document.body.appendChild(hostEl);
    const shadow = hostEl.attachShadow({ mode: 'open' });

    const fontLink = document.createElement('link');
    fontLink.rel = 'stylesheet';
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;600;700&display=swap';
    shadow.appendChild(fontLink);

    // ── Styles ────────────────────────────────────────────────────────
    const style = document.createElement('style');
    style.textContent = `
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      :host {
        --bg:       #f8fafd;
        --surface:  #ffffff;
        --surface2: #f1f4f9;
        --surface3: #e8f0fe;
        --border:   #dfe3eb;
        --border2:  #c7cedb;
        --text:     #1f1f1f;
        --text2:    #444746;
        --text3:    #6f7377;
        --accent:   #0b57d0;
        --accent-h: #0842a0;
        --accent-l: #e8f0fe;
        --accent-b: #c2d7ff;
        --danger:   #b42318;
        --danger-l: #fef3f2;
        --focus:    0 0 0 3px rgba(11, 87, 208, 0.18);
        --shadow:   0 18px 44px rgba(60, 64, 67, 0.18), 0 2px 8px rgba(60, 64, 67, 0.10);
        --font:     'Google Sans Text', 'Google Sans', Roboto, 'DM Sans', system-ui, -apple-system, sans-serif;
        --ease:     cubic-bezier(0.4, 0, 0.2, 1);
      }
      :host(.dark) {
        --bg:       #131314;
        --surface:  #1f1f1f;
        --surface2: #282a2d;
        --surface3: #1d2b45;
        --border:   #3c4043;
        --border2:  #5f6368;
        --text:     #e8eaed;
        --text2:    #c4c7c5;
        --text3:    #9aa0a6;
        --accent:   #a8c7fa;
        --accent-h: #d3e3fd;
        --accent-l: #1d2b45;
        --accent-b: #35558a;
        --danger:   #f97066;
        --danger-l: #451a1a;
        --focus:    0 0 0 3px rgba(168, 199, 250, 0.22);
        --shadow:   0 24px 56px rgba(0,0,0,0.50), 0 2px 10px rgba(0,0,0,0.38);
      }

      /* ── Trigger ── */
      .trigger {
        position: fixed; bottom: 24px; right: 24px; width: 52px; height: 52px;
        background: var(--accent); border: 1px solid rgba(255,255,255,0.18); border-radius: 14px; cursor: pointer;
        display: flex; align-items: center; justify-content: center; pointer-events: all; z-index: 2;
        box-shadow: 0 10px 26px rgba(37,99,235,0.26), 0 1px 4px rgba(15,23,42,0.12);
        transition: transform 0.16s var(--ease), box-shadow 0.16s var(--ease), background 0.16s, opacity 0.2s;
      }
      .trigger:hover  { transform: translateY(-1px); background: var(--accent-h); box-shadow: 0 14px 32px rgba(37,99,235,0.32), 0 2px 8px rgba(15,23,42,0.12); }
      .trigger:active { transform: translateY(0) scale(0.98); }
      .trigger:focus-visible { outline: none; box-shadow: var(--focus), 0 10px 26px rgba(37,99,235,0.26); }
      .trigger svg    { width: 21px; height: 21px; stroke: #fff; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; fill: none; }

      /* ── Sidebar ── */
      .sidebar {
        position: fixed; top: 0; right: 0; bottom: 0; width: 400px; min-width: 320px;
        background: var(--surface); border-left: 1px solid var(--border);
        box-shadow: var(--shadow); display: flex; flex-direction: column;
        font-family: var(--font); pointer-events: all; z-index: 2;
        transform: translateX(calc(100% + 4px));
        transition: transform 0.24s var(--ease);
        user-select: none;
      }
      .sidebar.open       { transform: translateX(0); }
      .sidebar.floating   { border: 1px solid var(--border); border-radius: 20px; overflow: hidden; }
      .sidebar.no-animate { transition: none !important; }

      /* ── Resize handles ── */
      .resize-handle { position: absolute; z-index: 10; }
      .resize-n, .resize-s { left: 16px; right: 16px; height: 8px; cursor: ns-resize; }
      .resize-n { top: 0; }
      .resize-s { bottom: 0; }
      .resize-e, .resize-w { top: 16px; bottom: 16px; width: 8px; cursor: ew-resize; }
      .resize-e { right: 0; }
      .resize-w { left: 0; }
      .resize-ne, .resize-nw, .resize-se, .resize-sw { width: 18px; height: 18px; z-index: 11; }
      .resize-ne { top: 0; right: 0; cursor: nesw-resize; }
      .resize-nw { top: 0; left: 0; cursor: nwse-resize; }
      .resize-se { bottom: 0; right: 0; cursor: nwse-resize; }
      .resize-sw { bottom: 0; left: 0; cursor: nesw-resize; }
      .resize-n::after, .resize-s::after, .resize-e::after, .resize-w::after {
        content: ''; position: absolute; border-radius: 999px; background: var(--border2);
        opacity: 0; transition: opacity 0.16s, background 0.16s;
      }
      .resize-n::after, .resize-s::after { left: 50%; transform: translateX(-50%); width: 44px; height: 3px; }
      .resize-n::after { top: 2px; }
      .resize-s::after { bottom: 2px; }
      .resize-e::after, .resize-w::after { top: 50%; transform: translateY(-50%); width: 3px; height: 44px; }
      .resize-e::after { right: 2px; }
      .resize-w::after { left: 2px; }
      .sidebar:hover .resize-n::after, .sidebar:hover .resize-s::after,
      .sidebar:hover .resize-e::after, .sidebar:hover .resize-w::after,
      .resize-handle:hover::after { opacity: 0.8; }

      /* ── Header ── */
      .header {
        padding: 0 14px 0 16px; height: 58px; border-bottom: 1px solid var(--border);
        display: flex; align-items: center; justify-content: space-between;
        gap: 12px; background: linear-gradient(180deg, var(--surface), var(--surface2)); flex-shrink: 0; cursor: grab; touch-action: none;
      }
      .header:active { cursor: grabbing; }
      .logo      { display: flex; align-items: center; gap: 9px; pointer-events: none; min-width: 0; }
      .logo-icon { width: 32px; height: 32px; background: var(--accent-l); color: var(--accent); border: 1px solid var(--accent-b); border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
      .logo-icon svg { width: 17px; height: 17px; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; fill: none; }
      .logo-name  { font-size: 15px; font-weight: 650; color: var(--text); letter-spacing: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .header-btns { display: flex; gap: 4px; flex-shrink: 0; }
      .icon-btn { width: 30px; height: 30px; border: 1px solid transparent; background: transparent; cursor: pointer; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: var(--text3); transition: background 0.14s, color 0.14s, border-color 0.14s; }
      .icon-btn:hover  { background: var(--bg); color: var(--text); }
      .icon-btn:focus-visible { outline: none; box-shadow: var(--focus); color: var(--accent); }
      .icon-btn.active { background: var(--accent-l); color: var(--accent); border-color: var(--accent-b); }
      .icon-btn svg { width: 14px; height: 14px; stroke: currentColor; stroke-width: 2.2; stroke-linecap: round; fill: none; }

      /* ── Context banner ── */
      .ctx-banner { padding: 10px 18px; background: var(--surface); border-bottom: 1px solid var(--border); flex-shrink: 0; }
      .ctx-title  { font-size: 12.5px; font-weight: 650; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .ctx-sub    { font-size: 11px; color: var(--text3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }

      /* ── Messages ── */
      .messages { flex: 1; overflow-y: auto; padding: 18px; display: flex; flex-direction: column; gap: 12px; scroll-behavior: smooth; background: var(--bg); }
      .messages::-webkit-scrollbar { width: 5px; }
      .messages::-webkit-scrollbar-track { background: transparent; }
      .messages::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 999px; }
      .msg { display: flex; align-items: flex-end; animation: msg-in 0.2s var(--ease); }
      @keyframes msg-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      .msg.ai { justify-content: flex-start; }
      .msg.user { justify-content: flex-end; }
      .bubble { max-width: min(330px, 88%); padding: 11px 13px; font-size: 13.5px; line-height: 1.52; color: var(--text); font-family: var(--font); overflow-wrap: anywhere; box-shadow: 0 1px 2px rgba(60,64,67,0.08); }
      .msg.ai   .bubble { background: var(--surface); border: 1px solid var(--border); border-radius: 18px 18px 18px 6px; }
      .msg.user .bubble { background: var(--accent); color: #fff; border-radius: 18px 18px 6px 18px; border: 1px solid transparent; }
      .bubble code { background: rgba(100,116,139,0.14); border-radius: 5px; padding: 1px 4px; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 0.92em; }
      .bubble.copyable { padding-right: 38px; position: relative; }
      .copy-btn {
        position: absolute; top: 6px; right: 6px; width: 26px; height: 26px;
        border: 1px solid transparent; border-radius: 7px; background: transparent; color: var(--text3);
        display: flex; align-items: center; justify-content: center; cursor: pointer;
        transition: background 0.14s, color 0.14s, border-color 0.14s, box-shadow 0.14s;
      }
      .copy-btn:hover { background: var(--surface); color: var(--text); border-color: var(--border); }
      .copy-btn:focus-visible { outline: none; box-shadow: var(--focus); }
      .copy-btn svg { width: 13px; height: 13px; stroke: currentColor; stroke-width: 2; fill: none; stroke-linecap: round; stroke-linejoin: round; }

      .quick-actions { display: flex; flex-wrap: wrap; gap: 7px; margin: 10px 0 2px; }
      .quick-action {
        border: 1px solid var(--border); background: var(--surface); color: var(--text2);
        border-radius: 8px; padding: 6px 9px; font-size: 11.5px; font-family: var(--font);
        cursor: pointer; transition: background 0.14s, color 0.14s, border-color 0.14s, box-shadow 0.14s;
      }
      .quick-action:hover { background: var(--accent-l); color: var(--accent); border-color: var(--accent-b); }
      .quick-action:focus-visible { outline: none; box-shadow: var(--focus); }

      /* ── Field list ── */
      .field-list { display: flex; flex-direction: column; gap: 6px; margin-top: 10px; max-height: 190px; overflow-y: auto; padding-right: 2px; }
      .field-list::-webkit-scrollbar { width: 4px; }
      .field-list::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 999px; }
      .field-btn {
        width: 100%; min-height: 32px; background: var(--surface); border: 1px solid var(--border); color: var(--text2);
        padding: 6px 9px; border-radius: 8px; font-size: 12px; cursor: pointer;
        text-align: left; font-family: var(--font); display: flex; align-items: center; gap: 7px;
        transition: background 0.14s, color 0.14s, border-color 0.14s, box-shadow 0.14s;
      }
      .field-btn:hover { background: var(--accent-l); color: var(--accent); border-color: var(--accent-b); }
      .field-btn:focus-visible { outline: none; box-shadow: var(--focus); border-color: var(--accent-b); }
      .field-btn-label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
      .field-btn .req { color: var(--danger); background: var(--danger-l); border: 1px solid rgba(180,35,24,0.2); border-radius: 5px; font-size: 10px; line-height: 1; padding: 3px 5px; margin-left: auto; flex-shrink: 0; }
      .field-type-tag { font-size: 10px; color: var(--text3); background: var(--bg); border: 1px solid var(--border); padding: 2px 5px; border-radius: 5px; flex-shrink: 0; max-width: 78px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

      /* ── Chips ── */
      .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
      .chip  { max-width: 100%; background: var(--surface); border: 1px solid var(--border); color: var(--text2); padding: 5px 9px; border-radius: 8px; font-size: 11.5px; cursor: pointer; font-family: var(--font); transition: background 0.14s, border-color 0.14s, color 0.14s, box-shadow 0.14s; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .chip:hover { background: var(--accent-l); border-color: var(--accent-b); color: var(--accent); }
      .chip:focus-visible { outline: none; box-shadow: var(--focus); border-color: var(--accent-b); }

      /* ── Typing ── */
      .typing-row    { display: flex; gap: 9px; align-items: flex-end; }
      .typing-bubble { background: var(--surface2); border: 1px solid var(--border); border-radius: 10px 10px 10px 4px; padding: 11px 14px; display: flex; gap: 5px; align-items: center; }
      .dot { width: 6px; height: 6px; background: var(--text3); border-radius: 50%; animation: bounce 1.2s ease-in-out infinite; }
      .dot:nth-child(2) { animation-delay: 0.18s; }
      .dot:nth-child(3) { animation-delay: 0.36s; }
      @keyframes bounce { 0%,60%,100% { transform: translateY(0); } 30% { transform: translateY(-7px); } }

      /* ── Input area ── */
      .input-area  { padding: 12px 16px 14px; border-top: 1px solid var(--border); background: var(--surface); flex-shrink: 0; }
      .field-tag   { font-size: 11.5px; color: var(--text3); margin-bottom: 7px; display: none; align-items: center; gap: 6px; min-width: 0; }
      .field-tag.visible { display: flex; }
      .field-tag .dot-ind { width: 6px; height: 6px; background: var(--accent); border-radius: 50%; flex-shrink: 0; animation: blink 2s ease-in-out infinite; }
      @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
      .field-tag span { font-weight: 600; color: var(--accent); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
      .input-row  { display: flex; gap: 8px; align-items: flex-end; }
      .input-box  { flex: 1; min-width: 0; font-family: var(--font); font-size: 13.5px; padding: 10px 12px; border: 1px solid var(--border); border-radius: 18px; background: var(--bg); color: var(--text); resize: none; outline: none; min-height: 40px; max-height: 112px; line-height: 1.45; transition: border-color 0.14s, box-shadow 0.14s, background 0.14s; }
      .input-box:focus { border-color: var(--accent); box-shadow: var(--focus); background: var(--surface); }
      .input-box::placeholder { color: var(--text3); }
      .send-btn { width: 40px; height: 40px; background: var(--accent); border: 1px solid transparent; border-radius: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: background 0.14s, transform 0.1s, box-shadow 0.14s; }
      .send-btn:hover  { background: var(--accent-h); }
      .send-btn:focus-visible { outline: none; box-shadow: var(--focus); }
      .send-btn:active { transform: scale(0.96); }
      .send-btn svg { width: 15px; height: 15px; stroke: #fff; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; fill: none; }
      .footer-note { font-size: 10px; color: var(--text3); text-align: center; margin-top: 9px; font-family: var(--font); }

      /* ── Autofill tip ── */
      .autofill-tip { display: none; align-items: center; gap: 8px; margin-bottom: 8px; background: var(--accent-l); border: 1px solid var(--accent-b); border-radius: 8px; padding: 7px 9px; font-size: 11.5px; color: var(--text2); font-family: var(--font); min-width: 0; }
      .autofill-tip.visible { display: flex; }
      .autofill-tip strong { color: var(--text); font-weight: 500; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .autofill-btn { background: var(--accent); color: #fff; border: none; border-radius: 7px; padding: 4px 9px; font-size: 11px; cursor: pointer; font-family: var(--font); white-space: nowrap; flex-shrink: 0; transition: background 0.14s, box-shadow 0.14s; }
      .autofill-btn:hover { background: var(--accent-h); }
      .autofill-btn:focus-visible { outline: none; box-shadow: var(--focus); }

      /* ── Profile panel ── */
      .profile-panel { display: none; flex-direction: column; flex: 1; overflow: hidden; background: var(--surface); }
      .profile-panel.visible { display: flex; }
      .profile-hdr { padding: 11px 18px; border-bottom: 1px solid var(--border); font-size: 12px; font-weight: 650; color: var(--text); flex-shrink: 0; display: flex; justify-content: space-between; align-items: center; gap: 10px; min-width: 0; background: var(--surface2); }
      .profile-hdr span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .profile-hdr span:last-child { font-weight: 400; color: var(--text3); font-size: 10.5px; flex-shrink: 0; max-width: 52%; }
      .profile-grid { flex: 1; overflow-y: auto; padding: 14px 18px; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 10px; background: var(--surface); }
      .profile-grid::-webkit-scrollbar { width: 5px; }
      .profile-grid::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 999px; }
      .pf { display: flex; flex-direction: column; gap: 4px; }
      .pf.full { grid-column: 1 / -1; }
      .pf label { font-size: 10.5px; color: var(--text3); font-weight: 600; font-family: var(--font); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .pf input { width: 100%; min-width: 0; font-family: var(--font); font-size: 12.5px; padding: 7px 8px; border: 1px solid var(--border2); border-radius: 8px; background: var(--surface2); color: var(--text); outline: none; transition: border-color 0.14s, box-shadow 0.14s, background 0.14s; }
      .pf input:focus { border-color: var(--accent); box-shadow: var(--focus); background: var(--surface); }
      .profile-actions { padding: 10px 18px; border-top: 1px solid var(--border); display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px; flex-shrink: 0; background: var(--surface2); }
      .profile-actions button { min-width: 0; padding: 7px 8px; border-radius: 8px; font-size: 11.5px; font-family: var(--font); cursor: pointer; border: 1px solid var(--border2); background: var(--surface); color: var(--text2); transition: background 0.14s, color 0.14s, border-color 0.14s, box-shadow 0.14s; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .profile-actions button:hover { background: var(--bg); color: var(--text); }
      .profile-actions button:focus-visible { outline: none; box-shadow: var(--focus); border-color: var(--accent-b); }
      .profile-actions .btn-primary { background: var(--accent); color: #fff; border-color: transparent; }
      .profile-actions .btn-primary:hover { background: var(--accent-h); }
      .profile-actions .btn-danger { color: var(--danger); border-color: var(--danger); }
      .profile-actions .btn-danger:hover { background: var(--danger-l); }

      .pf-extras-hdr { grid-column: 1 / -1; font-size: 10px; font-weight: 700; color: var(--text3); text-transform: uppercase; letter-spacing: 0.6px; padding-top: 8px; margin-top: 2px; border-top: 1px solid var(--border); }
      .pf-extras-empty { grid-column: 1 / -1; font-size: 11.5px; color: var(--text3); font-style: italic; }
      .pf-extra-row { display: flex; gap: 6px; align-items: center; }
      .pf-extra-row input { flex: 1; min-width: 0; font-family: var(--font); font-size: 12.5px; padding: 7px 8px; border: 1px solid var(--border2); border-radius: 8px; background: var(--surface2); color: var(--text); outline: none; transition: border-color 0.14s, box-shadow 0.14s; }
      .pf-extra-row input:focus { border-color: var(--accent); box-shadow: var(--focus); background: var(--surface); }
      .pf-del { background: transparent; border: 1px solid transparent; color: var(--text3); cursor: pointer; padding: 4px 7px; border-radius: 6px; font-size: 14px; line-height: 1; flex-shrink: 0; transition: color 0.14s, background 0.14s, border-color 0.14s; }
      .pf-del:hover { color: var(--danger); background: var(--danger-l); border-color: rgba(180,35,24,0.2); }

      .review-status { display: inline-flex; align-items: center; gap: 5px; margin-bottom: 8px; padding: 3px 7px; border-radius: 7px; font-size: 10.5px; font-weight: 650; border: 1px solid var(--border); color: var(--text2); background: var(--surface); }
      .review-status.ok { color: #047857; background: #ecfdf5; border-color: #a7f3d0; }
      .review-status.warn { color: #a16207; background: #fffbeb; border-color: #fde68a; }
      .review-status.missing { color: var(--danger); background: var(--danger-l); border-color: rgba(180,35,24,0.22); }
      :host(.dark) .review-status.ok { color: #86efac; background: #052e1a; border-color: #166534; }
      :host(.dark) .review-status.warn { color: #fde68a; background: #422006; border-color: #854d0e; }
      .review-actions { display: flex; gap: 7px; margin-top: 10px; flex-wrap: wrap; }
      .review-continue, .review-secondary {
        border: 1px solid var(--accent-b); background: var(--accent); color: #fff;
        border-radius: 8px; padding: 7px 10px; font-size: 11.5px; font-family: var(--font);
        cursor: pointer; transition: background 0.14s, box-shadow 0.14s, transform 0.1s;
      }
      .review-continue:hover { background: var(--accent-h); }
      .review-secondary { background: var(--surface); color: var(--text2); border-color: var(--border2); }
      .review-secondary:hover { background: var(--bg); color: var(--text); }
      .review-continue:focus-visible, .review-secondary:focus-visible { outline: none; box-shadow: var(--focus); }
      .review-continue:active, .review-secondary:active { transform: scale(0.98); }
      .review-note { color: var(--text3); font-size: 11px; line-height: 1.4; margin-top: 8px; }

      /* ── Toast ── */
      .toast { position: absolute; top: 66px; left: 50%; max-width: calc(100% - 32px); transform: translateX(-50%) translateY(-6px); background: var(--text); color: var(--surface); font-family: var(--font); font-size: 12px; padding: 7px 12px; border-radius: 8px; opacity: 0; transition: opacity 0.18s, transform 0.18s; pointer-events: none; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; z-index: 20; box-shadow: 0 10px 24px rgba(15,23,42,0.18); }
      .toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }

      /* ── Agent preview ── */
      .agent-preview { display: flex; flex-direction: column; gap: 6px; margin-top: 10px; }
      .agent-field-row { display: flex; align-items: center; gap: 9px; padding: 7px 9px; background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; cursor: pointer; transition: border-color 0.14s, background 0.14s; }
      .agent-field-row:has(input:checked) { border-color: var(--accent-b); background: var(--accent-l); }
      .agent-field-row input[type="checkbox"] { flex-shrink: 0; width: 15px; height: 15px; accent-color: var(--accent); cursor: pointer; }
      .agent-field-row label { flex: 1; display: flex; flex-direction: column; gap: 2px; cursor: pointer; min-width: 0; }
      .agent-field-label { font-size: 10.5px; color: var(--text3); font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .agent-field-value { font-size: 12.5px; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .agent-actions { display: flex; gap: 7px; margin-top: 6px; flex-wrap: wrap; }
      .agent-confirm { background: var(--accent); color: #fff; border: none; border-radius: 8px; padding: 7px 13px; font-size: 12px; font-family: var(--font); cursor: pointer; transition: background 0.14s, box-shadow 0.14s; }
      .agent-confirm:hover { background: var(--accent-h); }
      .agent-confirm:focus-visible { outline: none; box-shadow: var(--focus); }
      .agent-cancel { background: var(--surface); color: var(--text2); border: 1px solid var(--border2); border-radius: 8px; padding: 7px 13px; font-size: 12px; font-family: var(--font); cursor: pointer; transition: background 0.14s; }
      .agent-cancel:hover { background: var(--bg); color: var(--text); }
      .agent-cancel:focus-visible { outline: none; box-shadow: var(--focus); }
      .agent-select-all { background: transparent; color: var(--accent); border: none; font-size: 11px; font-family: var(--font); cursor: pointer; padding: 0; margin-left: auto; text-decoration: underline; }
      @keyframes fa-spin { to { transform: rotate(360deg); } }
      .fa-spinner { display: inline-block; width: 10px; height: 10px; border: 2px solid var(--border2); border-top-color: var(--accent); border-radius: 50%; animation: fa-spin 0.65s linear infinite; flex-shrink: 0; }
      .live-row { display: flex; align-items: center; gap: 8px; font-size: 12.5px; min-width: 0; }
      .live-row-icon { flex-shrink: 0; width: 16px; text-align: center; font-style: normal; }
      .live-row-label { flex: 1; color: var(--text2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
      .live-row-value { color: var(--text); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 110px; flex-shrink: 0; }
      .live-summary { margin-top: 10px; padding-top: 8px; border-top: 1px solid var(--border); font-size: 11.5px; color: var(--text3); }
      .badge { display: inline-flex; align-items: center; font-size: 9.5px; font-weight: 700; letter-spacing: 0.3px; padding: 2px 6px; border-radius: 5px; flex-shrink: 0; }
      .badge-profile { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
      .badge-ai      { background: #fffbeb; color: #a16207; border: 1px solid #fde68a; }
      :host(.dark) .badge-profile { background: #052e1a; color: #86efac; border-color: #166534; }
      :host(.dark) .badge-ai      { background: #422006; color: #fde68a; border-color: #854d0e; }

      @media (max-width: 420px) {
        .trigger { right: 16px; bottom: 16px; }
        .sidebar { width: min(100vw, 380px); min-width: 0; }
        .header { padding-left: 12px; padding-right: 10px; gap: 8px; }
        .logo-icon { width: 28px; height: 28px; }
        .header-btns { gap: 2px; }
        .icon-btn { width: 28px; height: 28px; }
        .ctx-banner, .messages, .profile-grid { padding-left: 14px; padding-right: 14px; }
        .input-area, .profile-actions { padding-left: 14px; padding-right: 14px; }
        .profile-hdr { padding-left: 14px; padding-right: 14px; }
        .profile-actions { grid-template-columns: 1fr; }
      }
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
        <div class="resize-handle resize-n"  data-resize="n"></div>
        <div class="resize-handle resize-e"  data-resize="e"></div>
        <div class="resize-handle resize-s"  data-resize="s"></div>
        <div class="resize-handle resize-w"  data-resize="w"></div>
        <div class="resize-handle resize-ne" data-resize="ne"></div>
        <div class="resize-handle resize-nw" data-resize="nw"></div>
        <div class="resize-handle resize-se" data-resize="se"></div>
        <div class="resize-handle resize-sw" data-resize="sw"></div>
        <div class="header" id="fa-header">
          <div class="logo">
            <div class="logo-icon"><svg viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/><path d="M9 12h6M9 16h4"/></svg></div>
            <span class="logo-name">FormAssist</span>
          </div>
          <div class="header-btns">
            <button class="icon-btn" id="fa-profile-btn" title="Profil"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" stroke-width="2"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg></button>
            <button class="icon-btn" id="fa-dark-btn" title="Dark Mode"><svg viewBox="0 0 24 24" id="fa-dark-icon"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg></button>
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
    const resizeHandles = Array.from(shadow.querySelectorAll('[data-resize]'));
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

    function renderExtrasInProfile() {
      profileGrid.querySelectorAll('.pf-extras-hdr, .pf-extras-empty, .pf-extra').forEach(e => e.remove());

      const hdr = document.createElement('div');
      hdr.className = 'pf-extras-hdr';
      hdr.textContent = 'Weitere gespeicherte Daten';
      profileGrid.appendChild(hdr);

      const extraEntries = Object.entries(extras);
      if (!extraEntries.length) {
        const empty = document.createElement('div');
        empty.className = 'pf-extras-empty';
        empty.textContent = 'Noch keine weiteren Daten — werden automatisch beim Ausfüllen gespeichert.';
        profileGrid.appendChild(empty);
        return;
      }

      extraEntries.forEach(([key, value]) => {
        const div = document.createElement('div');
        div.className = 'pf pf-extra full';
        div.dataset.extraKey = key;
        const lbl = document.createElement('label');
        lbl.textContent = key;
        const row = document.createElement('div');
        row.className = 'pf-extra-row';
        const inp = document.createElement('input');
        inp.type = 'text';
        inp.value = value;
        inp.placeholder = key;
        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'pf-del';
        delBtn.title = `"${key}" löschen`;
        delBtn.textContent = '×';
        delBtn.addEventListener('click', () => {
          delete extras[key];
          chrome.storage.local.set({ faExtras: extras });
          div.remove();
          showToast(`"${key}" gelöscht`);
        });
        row.append(inp, delBtn);
        div.append(lbl, row);
        profileGrid.appendChild(div);
      });
    }

    let profileVisible = false;
    function showProfile() {
      profileVisible = true;
      renderExtrasInProfile();
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
<<<<<<< HEAD
      chrome.storage.local.set({ faProfile: profile }, () => {
        SYSTEM = buildSystemPrompt(ctx, profile);
        showToast('Profil gespeichert');
      });
=======
      chrome.storage.local.set({ faProfile: profile });

      profileGrid.querySelectorAll('.pf-extra').forEach(div => {
        const key = div.dataset.extraKey;
        const val = div.querySelector('input')?.value.trim();
        if (key) { if (val) extras[key] = val; else delete extras[key]; }
      });
      chrome.storage.local.set({ faExtras: extras }, () => showToast('Profil gespeichert'));
>>>>>>> 9f1dbf9 (Update project files)
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
      if (e.target.closest('button')) return;
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
        sidebar.classList.add('floating');
      }
    }

    function bindResize(el, mode) {
      let start = null;
      el.addEventListener('pointerdown', e => {
        undock();
        const rect = sidebar.getBoundingClientRect();
        const style = window.getComputedStyle(sidebar);
        start = {
          x: e.clientX,
          y: e.clientY,
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          w: rect.width,
          h: rect.height,
          minW: parseFloat(style.minWidth) || 320,
          minH: parseFloat(style.minHeight) || 300,
        };
        el.setPointerCapture(e.pointerId);
        e.preventDefault(); e.stopPropagation();
      });
      el.addEventListener('pointermove', e => {
        if (!start) return;
        const dx = e.clientX - start.x;
        const dy = e.clientY - start.y;
        let left = start.left;
        let top = start.top;
        let width = start.w;
        let height = start.h;

        if (mode.includes('w')) {
          left = Math.max(20, Math.min(start.right - start.minW, start.left + dx));
          width = start.right - left;
        }
        if (mode.includes('e')) {
          width = Math.max(start.minW, Math.min(window.innerWidth - start.left - 20, start.w + dx));
        }
        if (mode.includes('n')) {
          top = Math.max(20, Math.min(start.bottom - start.minH, start.top + dy));
          height = start.bottom - top;
        }
        if (mode.includes('s')) {
          height = Math.max(start.minH, Math.min(window.innerHeight - start.top - 20, start.h + dy));
        }
        sidebar.style.left = left + 'px';
        sidebar.style.top = top + 'px';
        sidebar.style.width = width + 'px';
        sidebar.style.height = height + 'px';
      });
      el.addEventListener('pointerup',     () => { if (start) { start = null; savePosition(); } });
      el.addEventListener('pointercancel', () => { start = null; });
    }

    resizeHandles.forEach(handle => bindResize(handle, handle.dataset.resize));

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
    let hasGreeted = false;

    function open() {
      isOpen = true;
      if (isDocked) sidebar.classList.add('open');
      else          sidebar.style.display = 'flex';
      triggerBtn.style.opacity       = '0';
      triggerBtn.style.pointerEvents = 'none';
      if (!hasGreeted) greet();
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
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && isOpen) {
        close();
        return;
      }
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        if (isOpen) close();
        else open();
      }
    });

    // ═══════════════════════════════════════════════════════════════════════
    // MESSAGES
    // ═══════════════════════════════════════════════════════════════════════

    function htmlToPlainText(html) {
      const tmp = document.createElement('div');
      tmp.innerHTML = html || '';
      return clean(tmp.textContent || '');
    }

    function escapeHtml(text) {
      return String(text ?? '').replace(/[&<>"']/g, ch => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
      }[ch]));
    }

    function textToHtml(text) {
      return escapeHtml(text).replace(/\n/g, '<br>');
    }

    function renderMarkdown(raw) {
      function fmt(s) {
        s = escapeHtml(s);
        s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        s = s.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
        s = s.replace(/`([^`\n]+)`/g, '<code>$1</code>');
        return s;
      }
      const parts = [];
      let listItems = [];
      function flushList() {
        if (!listItems.length) return;
        parts.push(`<ul style="margin:5px 0 5px 14px;padding:0;list-style:disc">${listItems.map(li => `<li style="margin:2px 0">${li}</li>`).join('')}</ul>`);
        listItems = [];
      }
      for (const line of raw.split('\n')) {
        const li = line.match(/^[\-\*•] (.+)/) || line.match(/^\d+\. (.+)/);
        if (li) { listItems.push(fmt(li[1])); continue; }
        flushList();
        parts.push(line.trim() === '' ? '<br>' : fmt(line));
      }
      flushList();
      return parts.join('<br>');
    }

    function copyText(text) {
      const value = String(text || '').trim();
      if (!value) return;
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(value).then(() => showToast('Antwort kopiert')).catch(() => fallbackCopy(value));
      } else {
        fallbackCopy(value);
      }
    }

    function fallbackCopy(text) {
      const ta = document.createElement('textarea');
      ta.value = text;
      Object.assign(ta.style, { position: 'fixed', top: '-1000px', left: '-1000px' });
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); showToast('Antwort kopiert'); }
      catch { showToast('Kopieren nicht möglich'); }
      ta.remove();
    }

    function addCopyButton(bubble, text) {
      bubble.classList.add('copyable');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'copy-btn';
      btn.title = 'Antwort kopieren';
      btn.innerHTML = '<svg viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>';
      btn.addEventListener('click', () => copyText(text));
      bubble.appendChild(btn);
    }

    function addMsg(role, html, chips, opts = {}) {
      const div = document.createElement('div');
      div.className = 'msg ' + role;
      const bubble = document.createElement('div');
      bubble.className = 'bubble';
      const renderedHtml = role === 'user' && !opts.trustedHtml ? textToHtml(html) : html;
      bubble.innerHTML = renderedHtml;
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
      if (role === 'ai' && opts.copy !== false) addCopyButton(bubble, opts.copyText || htmlToPlainText(renderedHtml));
      div.appendChild(bubble);
      messagesEl.appendChild(div);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function showTyping() {
      const div = document.createElement('div');
      div.id = 'fa-typing'; div.className = 'typing-row';
      div.innerHTML = `<div class="typing-bubble"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>`;
      messagesEl.appendChild(div);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
    function removeTyping() { $('fa-typing')?.remove(); }

    // ═══════════════════════════════════════════════════════════════════════
    // GREETING + FIELD LIST
    // ═══════════════════════════════════════════════════════════════════════

    function greet() {
      hasGreeted = true;
      const purpose = submitLabel
        ? `Ich sehe das Formular <strong>"${submitLabel}"</strong>`
        : `Ich habe <strong>${allFields.length} Felder</strong> erkannt`;

      const div = document.createElement('div');
      div.className = 'msg ai';
      const bubble = document.createElement('div');
      bubble.className = 'bubble';
      const greetingHtml = `${purpose} auf <em>${ctx.page.hostname}</em>. Klicke auf ein Feld für gezielte Hilfe, oder stell mir direkt eine Frage.`;
      bubble.innerHTML = greetingHtml;

      const quickActions = document.createElement('div');
      quickActions.className = 'quick-actions';
      const summaryBtn = document.createElement('button');
      summaryBtn.type = 'button';
      summaryBtn.className = 'quick-action';
      summaryBtn.textContent = 'Formular erklären';
      summaryBtn.addEventListener('click', askFormSummary);
      const guidedBtn = document.createElement('button');
      guidedBtn.type = 'button';
      guidedBtn.className = 'quick-action';
      guidedBtn.textContent = 'Geführter Modus';
      guidedBtn.addEventListener('click', startGuidedMode);
      const agentBtn = document.createElement('button');
      agentBtn.type = 'button';
      agentBtn.className = 'quick-action';
      agentBtn.textContent = '✦ KI Auto-Fill';
      agentBtn.addEventListener('click', agentFill);
      quickActions.append(summaryBtn, guidedBtn, agentBtn);
      bubble.appendChild(quickActions);

      const list = document.createElement('div');
      list.className = 'field-list';
      allFields.slice(0, 15).forEach(f => {
        const btn = document.createElement('button');
        btn.className = 'field-btn';
        btn.innerHTML = `<span class="field-btn-label">${f.label}</span><span class="field-type-tag">${f.type}</span>${f.required ? '<span class="req">Pflicht</span>' : ''}`;
        btn.addEventListener('click', () => {
          if (f.el) {
            f.el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            highlightField(f.el);
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
      addCopyButton(bubble, htmlToPlainText(greetingHtml));
      div.appendChild(bubble);
      messagesEl.appendChild(div);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // AI
    // ═══════════════════════════════════════════════════════════════════════

    let history       = [];
    let activeFieldEl = null;
    const guidedMode = { active: false, fields: [], index: 0 };
    const agentMode  = { active: false, unknowns: [], idx: 0, knownMatches: [] };

    function createStreamBubble() {
      const div = document.createElement('div');
      div.className = 'msg ai';
      const bubble = document.createElement('div');
      bubble.className = 'bubble';
      div.appendChild(bubble);
      messagesEl.appendChild(div);
      return { div, bubble };
    }

    async function askAI(userText, opts = {}) {
      const key = await loadKey();
      if (!key) { addMsg('ai', 'API-Schlüssel nicht gefunden. Bitte <code>api-key.txt</code> mit deinem Groq API-Key befüllen.'); return ''; }
      const content = userText + (opts.includeActive === false ? '' : getActiveFieldContext(activeFieldEl));
      history.push({ role: 'user', content });
      showTyping();

      const useStream = opts.render !== false;

      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
          body: JSON.stringify({
            model: MODEL, max_tokens: opts.maxTokens || 400, stream: useStream,
            messages: [{ role: 'system', content: SYSTEM }, ...history.slice(-10)],
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          removeTyping();
          addMsg('ai', 'Fehler: ' + (data.error?.message || `HTTP ${res.status}`));
          history.pop(); return '';
        }

        // ── Non-streaming path (submit review) ───────────────────────
        if (!useStream) {
          const data = await res.json();
          removeTyping();
          const reply = data.choices?.[0]?.message?.content?.trim();
          if (reply) { history.push({ role: 'assistant', content: reply }); return reply; }
          addMsg('ai', 'Unbekannter Fehler.'); history.pop(); return '';
        }

        // ── Streaming path ────────────────────────────────────────────
        removeTyping();
        const { div: msgDiv, bubble: streamBubble } = createStreamBubble();
        let rawText = '';
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';

        outer: while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split('\n');
          buf = lines.pop() || '';
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const payload = line.slice(6).trim();
            if (payload === '[DONE]') break outer;
            try {
              const delta = JSON.parse(payload).choices?.[0]?.delta?.content;
              if (delta) {
                rawText += delta;
                streamBubble.innerHTML = renderMarkdown(rawText);
                messagesEl.scrollTop = messagesEl.scrollHeight;
              }
            } catch { /* malformed chunk */ }
          }
        }

        const fullText = rawText.trim();
        if (fullText) {
          history.push({ role: 'assistant', content: fullText });
          streamBubble.innerHTML = renderMarkdown(fullText);
          streamBubble.classList.add('copyable');
          addCopyButton(streamBubble, fullText);
        } else {
          msgDiv.remove();
          addMsg('ai', 'Unbekannter Fehler.'); history.pop();
        }
        messagesEl.scrollTop = messagesEl.scrollHeight;
        return fullText;

      } catch {
        removeTyping();
        addMsg('ai', 'Verbindungsfehler. Bitte Internetverbindung prüfen.');
        history.pop(); return '';
      }
    }

    function send(text) {
      const t = (text !== undefined ? text : inputEl.value).trim();
      if (!t) return;
      addMsg('user', t);
      inputEl.value = ''; inputEl.style.height = 'auto';
      if (guidedMode.active) { handleGuidedAnswer(t); return; }
      if (agentMode.active)  { handleAgentAnswer(t);  return; }
      askAI(t);
    }

    $('fa-send').addEventListener('click', () => send());
    inputEl.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
    inputEl.addEventListener('input',   () => { inputEl.style.height = 'auto'; inputEl.style.height = Math.min(inputEl.scrollHeight, 100) + 'px'; });

    function highlightField(el) {
      if (!el) return;
      const prevOutline = el.style.outline;
      const prevOffset = el.style.outlineOffset;
      el.style.outline = '2px solid #2563eb';
      el.style.outlineOffset = '3px';
      setTimeout(() => {
        el.style.outline = prevOutline;
        el.style.outlineOffset = prevOffset;
      }, 1800);
    }

    function askFormSummary() {
      if (profileVisible) hideProfile();
      open();
      addMsg('user', 'Erkläre mir dieses Formular kurz, bevor ich starte.');
      askAI(
        'Fasse dieses Formular in einfacher Sprache zusammen: Zweck, wichtigste Pflichtangaben, benötigte Unterlagen/Daten und typische Stolperstellen. Antworte mit kurzen Abschnitten.',
        { maxTokens: 650, includeActive: false }
      );
    }

    function getGuidedFields() {
      const seenRadios = new Set();
      return allFields
        .filter(f => f.el && isVisible(f.el) && !SKIP_TYPES.has(f.el.type))
        .filter(f => {
          const type = (f.el.type || '').toLowerCase();
          if (type === 'password' || type === 'file') return false;
          if (type === 'radio' && f.el.name) {
            const key = `${f.el.form ? Array.from(document.forms).indexOf(f.el.form) : 'page'}:${f.el.name}`;
            if (seenRadios.has(key)) return false;
            seenRadios.add(key);
          }
          return !getFieldValueForReview(f.el);
        })
        .sort((a, b) => Number(b.required) - Number(a.required));
    }

    function focusGuidedField(field) {
      const el = field?.el;
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      try { el.focus({ preventScroll: true }); } catch { el.focus(); }
      highlightField(el);
      activeFieldEl = el;
      fieldNameEl.textContent = field.label;
      fieldTag.classList.add('visible');
    }

    function describeGuidedField(field) {
      const bits = [];
      if (field.required) bits.push('Pflichtfeld');
      if (field.hint) bits.push(field.hint);
      if (field.options?.length) bits.push(`Optionen: ${field.options.join(', ')}`);
      return bits.length ? `<br><span class="review-note">${escapeHtml(bits.join(' · '))}</span>` : '';
    }

    function askGuidedQuestion() {
      const field = guidedMode.fields[guidedMode.index];
      if (!field) {
        guidedMode.active = false;
        addMsg('ai', 'Geführter Modus abgeschlossen. Du kannst das Formular jetzt noch einmal prüfen oder absenden.');
        return;
      }
      focusGuidedField(field);
      const progress = `${guidedMode.index + 1}/${guidedMode.fields.length}`;
      addMsg(
        'ai',
        `Geführter Modus ${progress}: Was soll ich bei <strong>${escapeHtml(field.label)}</strong> eintragen?${describeGuidedField(field)}`,
        ['Überspringen', 'Beenden'],
        {}
      );
    }

    function startGuidedMode() {
      if (profileVisible) hideProfile();
      open();
      guidedMode.fields = getGuidedFields();
      guidedMode.index = 0;
      if (!guidedMode.fields.length) {
        addMsg('ai', 'Ich finde gerade keine leeren, passenden Felder für den geführten Modus.');
        return;
      }
      guidedMode.active = true;
      addMsg('ai', 'Ich führe dich jetzt Feld für Feld durch das Formular. Antworte kurz; ich trage deine Antwort direkt ein.');
      askGuidedQuestion();
    }

    function handleGuidedAnswer(text) {
      const normalized = text.toLowerCase();
      if (['beenden', 'abbrechen', 'stop', 'stopp'].includes(normalized)) {
        guidedMode.active = false;
        addMsg('ai', 'Geführter Modus beendet. Du kannst jederzeit wieder starten.');
        return;
      }
      const field = guidedMode.fields[guidedMode.index];
      if (!field) {
        guidedMode.active = false;
        return;
      }
      if (!['überspringen', 'ueberspringen', 'skip'].includes(normalized)) {
        fillField(field.el, text);
        showToast(`${field.label} ausgefüllt`);
      }
      guidedMode.index += 1;
      askGuidedQuestion();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // AGENT AUTO-FILL — live sequential fill, one AI call per field
    // ═══════════════════════════════════════════════════════════════════════

    function matchExtras(field) {
      const fl = field.label.toLowerCase().trim();
      const key = Object.keys(extras).find(k => {
        const kl = k.toLowerCase().trim();
        return kl === fl || fl.includes(kl) || kl.includes(fl);
      });
      return key ? extras[key] : null;
    }

    function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

    async function agentFill() {
      if (profileVisible) hideProfile();
      open();

      const candidateFields = allFields.filter(f => {
        if (!f.el || !isVisible(f.el)) return false;
        const type = (f.el.type || '').toLowerCase();
        return !SKIP_TYPES.has(type) && type !== 'password' && type !== 'file';
      });

      if (!candidateFields.length) {
        addMsg('ai', 'Keine ausfüllbaren Felder gefunden.');
        return;
      }

      const key = await loadKey();
      if (!key) {
        addMsg('ai', 'API-Schlüssel nicht gefunden. Bitte <code>api-key.txt</code> befüllen.');
        return;
      }

      addMsg('user', '✦ KI Auto-Fill');

      // Live status bubble
      const statusDiv = document.createElement('div');
      statusDiv.className = 'msg ai';
      const statusBubble = document.createElement('div');
      statusBubble.className = 'bubble';
      const statusList = document.createElement('div');
      statusList.style.cssText = 'display:flex;flex-direction:column;gap:5px;';
      statusBubble.appendChild(statusList);
      statusDiv.appendChild(statusBubble);
      messagesEl.appendChild(statusDiv);

      function makeRow(label) {
        const row = document.createElement('div');
        row.className = 'live-row';
        const icon = document.createElement('span');
        icon.className = 'live-row-icon';
        icon.innerHTML = '<div class="fa-spinner"></div>';
        const lbl = document.createElement('span');
        lbl.className = 'live-row-label';
        lbl.textContent = label;
        row.append(icon, lbl);
        statusList.appendChild(row);
        messagesEl.scrollTop = messagesEl.scrollHeight;
        return {
          done(value, source) {
            icon.innerHTML = '✓';
            icon.style.color = 'var(--accent)';
            if (value) {
              const val = document.createElement('span');
              val.className = 'live-row-value';
              val.textContent = value;
              row.appendChild(val);
            }
            if (source) {
              const badge = document.createElement('span');
              badge.className = `badge badge-${source === 'profile' ? 'profile' : 'ai'}`;
              badge.textContent = source === 'profile' ? 'Profil' : 'KI';
              row.appendChild(badge);
            }
            messagesEl.scrollTop = messagesEl.scrollHeight;
          },
          ask() {
            icon.innerHTML = '?';
            icon.style.color = 'var(--text3)';
            messagesEl.scrollTop = messagesEl.scrollHeight;
          },
        };
      }

      const unknownFields = [];
      let filledCount = 0;

      for (const field of candidateFields) {
        if (field.el) {
          field.el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          highlightField(field.el);
          activeFieldEl = field.el;
          fieldNameEl.textContent = field.label;
          fieldTag.classList.add('visible');
        }

        const row = makeRow(field.label);

        // 1. Profile match (instant, no API)
        const pf = matchProfile(field.el, profile);
        if (pf && profile[pf.key]) {
          await sleep(120);
          fillField(field.el, profile[pf.key]);
          row.done(profile[pf.key], 'profile');
          filledCount++;
          continue;
        }

        // 2. Extras match (instant, no API)
        const extrasVal = matchExtras(field);
        if (extrasVal) {
          await sleep(120);
          fillField(field.el, extrasVal);
          row.done(extrasVal, 'profile');
          filledCount++;
          continue;
        }

        // 3. Ask AI for this specific field
        const fieldPrompt = [
          `Feld: "${field.label}" (${field.type})${field.required ? ' [Pflichtfeld]' : ''}`,
          field.hint            ? `Hinweis: ${field.hint}` : '',
          field.options?.length ? `Optionen: ${field.options.join(', ')}` : '',
          '',
          'Gib NUR den einzutragenden Wert zurück — kein JSON, kein Erklärtext.',
          'Wenn du keinen sicheren Wert kennst: antworte exakt mit NULL',
        ].filter(Boolean).join('\n');

        try {
          const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
            body: JSON.stringify({
              model: MODEL,
              max_tokens: 80,
              messages: [
                { role: 'system', content: SYSTEM },
                { role: 'user',   content: fieldPrompt },
              ],
            }),
          });
          const data = await res.json();
          const reply = (data.choices?.[0]?.message?.content || '').trim();

          if (!reply || reply.toUpperCase() === 'NULL') {
            row.ask();
            unknownFields.push(field);
          } else {
            fillField(field.el, reply);
            row.done(reply, 'ai');
            filledCount++;
          }
        } catch {
          row.ask();
          unknownFields.push(field);
        }
      }

      const summary = document.createElement('div');
      summary.className = 'live-summary';
      summary.textContent = `${filledCount} von ${candidateFields.length} Feldern ausgefüllt${unknownFields.length ? ` · ${unknownFields.length} unbekannt` : ''}`;
      statusBubble.appendChild(summary);
      messagesEl.scrollTop = messagesEl.scrollHeight;

      if (unknownFields.length) {
        await sleep(300);
        addMsg('ai', `Für ${unknownFields.length} Feld${unknownFields.length !== 1 ? 'er' : ''} brauche ich deine Hilfe:`);
        agentMode.active = true;
        agentMode.unknowns = unknownFields;
        agentMode.idx = 0;
        agentMode.knownMatches = [];
        agentModeAskNext();
      } else {
        showToast(`${filledCount} Felder ausgefüllt`);
      }
    }

    function agentModeAskNext() {
      if (agentMode.idx >= agentMode.unknowns.length) {
        agentMode.active = false;
        addMsg('ai', 'Alle Felder wurden ausgefüllt.');
        return;
      }

      const field = agentMode.unknowns[agentMode.idx];
      const parts = [];
      if (field.hint)            parts.push(field.hint);
      if (field.options?.length) parts.push(`Optionen: ${field.options.join(', ')}`);

      const progress = `${agentMode.idx + 1}/${agentMode.unknowns.length}`;
      addMsg(
        'ai',
        `(${progress}) Was soll ich bei <strong>${escapeHtml(field.label)}</strong> eintragen?${field.required ? ' <span class="review-note">(Pflichtfeld)</span>' : ''}${parts.length ? `<br><span class="review-note">${escapeHtml(parts.join(' · '))}</span>` : ''}`,
        ['Überspringen', 'Beenden'],
        {}
      );

      if (field.el) {
        field.el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        highlightField(field.el);
        activeFieldEl = field.el;
        fieldNameEl.textContent = field.label;
        fieldTag.classList.add('visible');
      }
    }

    function handleAgentAnswer(text) {
      const normalized = text.toLowerCase().trim();
      if (['beenden', 'abbrechen', 'stop', 'stopp'].includes(normalized)) {
        agentMode.active = false;
        if (agentMode.knownMatches.length) {
          addMsg('ai', 'Beendet. Hier sind die Vorschläge für die bekannten Felder:');
          addAgentPreview(agentMode.knownMatches);
        } else {
          addMsg('ai', 'Auto-Fill beendet.');
        }
        return;
      }

      const field = agentMode.unknowns[agentMode.idx];
      if (!field) { agentMode.active = false; return; }

      if (!['überspringen', 'ueberspringen', 'skip'].includes(normalized)) {
        fillField(field.el, text);
        showToast(`${field.label} ausgefüllt`);

        const pf = matchProfile(field.el, profile);
        if (pf) {
          profile[pf.key] = text;
          chrome.storage.local.set({ faProfile: profile });
          addMsg('ai', `In deinem Profil als <strong>${escapeHtml(pf.label)}</strong> gespeichert.`, null, {});
        } else {
          extras[field.label] = text;
          chrome.storage.local.set({ faExtras: extras });
          addMsg('ai', `<strong>${escapeHtml(field.label)}</strong> gespeichert — wird auf zukünftigen Formularen automatisch vorgeschlagen.`, null, {});
        }

        agentMode.knownMatches.push({ field, label: field.label, value: text, source: 'profile' });
      }

      agentMode.idx++;
      agentModeAskNext();
    }

    function addAgentPreview(matches) {
      const div = document.createElement('div');
      div.className = 'msg ai';
      const bubble = document.createElement('div');
      bubble.className = 'bubble';

      const header = document.createElement('div');
      header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px;';
      header.innerHTML = `<strong>KI-Vorschläge (${matches.length} Felder)</strong>`;
      const selectAllBtn = document.createElement('button');
      selectAllBtn.className = 'agent-select-all';
      selectAllBtn.textContent = 'Alle ab-/auswählen';
      header.appendChild(selectAllBtn);

      const note = document.createElement('div');
      note.className = 'review-note';
      note.textContent = 'Wähle die Felder aus, die übernommen werden sollen, und bestätige.';

      const preview = document.createElement('div');
      preview.className = 'agent-preview';

      const checkboxes = [];
      matches.forEach((m, i) => {
        const row = document.createElement('div');
        row.className = 'agent-field-row';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.id = `fa-agent-cb-${i}`;
        cb.checked = true;
        const lbl = document.createElement('label');
        lbl.htmlFor = `fa-agent-cb-${i}`;
        const badge = m.source === 'profile'
          ? `<span class="badge badge-profile">Profil</span>`
          : `<span class="badge badge-ai">KI</span>`;
        lbl.innerHTML = `<span class="agent-field-label">${escapeHtml(m.label)}</span><span class="agent-field-value">${escapeHtml(m.value)}</span>`;
        row.append(cb, lbl);
        const badgeEl = document.createElement('div');
        badgeEl.innerHTML = badge;
        row.appendChild(badgeEl.firstChild);
        preview.appendChild(row);
        checkboxes.push({ cb, match: m });
      });

      let allChecked = true;
      selectAllBtn.addEventListener('click', () => {
        allChecked = !allChecked;
        checkboxes.forEach(({ cb }) => { cb.checked = allChecked; });
      });

      const actions = document.createElement('div');
      actions.className = 'agent-actions';

      const confirmBtn = document.createElement('button');
      confirmBtn.className = 'agent-confirm';
      confirmBtn.textContent = 'Ausfüllen';

      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'agent-cancel';
      cancelBtn.textContent = 'Abbrechen';

      confirmBtn.addEventListener('click', () => {
        let filled = 0;
        checkboxes.forEach(({ cb, match }) => {
          if (cb.checked && match.field?.el) {
            fillField(match.field.el, match.value);
            filled++;
          }
        });
        confirmBtn.disabled = true;
        cancelBtn.disabled = true;
        actions.innerHTML = `<span class="review-note">${filled} Felder wurden ausgefüllt.</span>`;
        showToast(`${filled} Felder automatisch ausgefüllt`);
      });

      cancelBtn.addEventListener('click', () => {
        bubble.style.opacity = '0.55';
        actions.innerHTML = '<span class="review-note">Abgebrochen.</span>';
      });

      actions.append(confirmBtn, cancelBtn);
      preview.appendChild(actions);

      bubble.append(header, note, preview);
      div.appendChild(bubble);
      messagesEl.appendChild(div);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SUBMIT REVIEW — intercept once, let the user continue consciously
    // ═══════════════════════════════════════════════════════════════════════

    const approvedSubmits = new WeakSet();
    const reviewingSubmits = new WeakSet();

    function getFieldValueForReview(el) {
      if (!el) return '';
      const type = (el.type || '').toLowerCase();
      if (type === 'password') return '[Passwortfeld nicht ausgelesen]';
      if (type === 'file') return el.files?.length ? `${el.files.length} Datei(en) ausgewählt` : '';
      if (type === 'checkbox') return el.checked ? (el.value && el.value !== 'on' ? el.value : 'ausgewählt') : '';
      if (type === 'radio') {
        const root = el.form || document;
        const checked = el.name ? root.querySelector(`input[type="radio"][name="${CSS.escape(el.name)}"]:checked`) : (el.checked ? el : null);
        return checked ? (checked.value || getLabel(checked) || 'ausgewählt') : '';
      }
      if (el.tagName === 'SELECT') {
        const selected = Array.from(el.selectedOptions || []).map(o => clean(o.text || o.value)).filter(Boolean);
        return selected.join(', ');
      }
      return clean(el.value || '').slice(0, 240);
    }

    function buildSubmitReviewPrompt(formEl) {
      const sections = formEl && formEl.tagName === 'FORM' ? groupIntoSections(formEl) : ctx.forms.flatMap(f => f.sections);
      const fields = sections.flatMap(s => s.fields);
      const seenRadioGroups = new Set();
      const lines = [
        'Prüfe dieses Formular direkt vor dem Absenden auf fehlende Angaben, Browser-Validierungsfehler und logische Auffälligkeiten.',
        'Antworte strukturiert und knapp auf Deutsch mit diesen Überschriften:',
        'Status, Fehlende Pflichtfelder, Auffälligkeiten, Nächste Schritte.',
        'Beginne die Antwort exakt mit "Status: OK", "Status: Warnung" oder "Status: Fehlt".',
        'Wenn alles plausibel wirkt, sage klar: "Ich sehe keine offensichtlichen Probleme."',
        '',
        `Seite: ${ctx.page.title || ctx.page.hostname}`,
        `URL: ${ctx.page.hostname}${ctx.page.pathname}`,
      ];
      const submitText = formEl && formEl.tagName === 'FORM' ? getSubmitText(formEl) : submitLabel;
      if (submitText) lines.push(`Absende-Aktion: ${submitText}`);
      lines.push('', 'Feldwerte:');

      fields.forEach(f => {
        const el = f.el;
        if (!el) return;
        const type = (el.type || '').toLowerCase();
        if (type === 'radio' && el.name) {
          const groupKey = `${el.form ? Array.from(document.forms).indexOf(el.form) : 'page'}:${el.name}`;
          if (seenRadioGroups.has(groupKey)) return;
          seenRadioGroups.add(groupKey);
        }
        const value = getFieldValueForReview(el);
        let line = `- ${f.label}${f.required ? ' (Pflichtfeld)' : ''} [${f.type}]: ${value ? `"${value}"` : '[leer]'}`;
        const err = getError(el);
        if (err) line += ` | Seitenfehler: "${err}"`;
        if (el.willValidate && !el.checkValidity()) line += ` | Browserfehler: "${el.validationMessage}"`;
        if (f.hint) line += ` | Hinweis: "${f.hint}"`;
        lines.push(line);
      });

      return lines.join('\n');
    }

    function getReviewStatus(reply) {
      const text = String(reply || '').toLowerCase();
      if (/status:\s*ok|keine offensichtlichen probleme|alles plausibel|keine auffälligkeiten/.test(text)) {
        return { cls: 'ok', label: 'OK' };
      }
      if (/status:\s*fehlt|fehlende|pflichtfeld|browserfehler|required|\[leer\]/.test(text)) {
        return { cls: 'missing', label: 'Fehlt' };
      }
      return { cls: 'warn', label: 'Warnung' };
    }

    function submitFormAfterReview(formEl, submitter) {
      approvedSubmits.add(formEl);
      showToast('Absenden freigegeben');
      if (formEl.requestSubmit) {
        try { formEl.requestSubmit(submitter && submitter.form === formEl ? submitter : undefined); }
        catch { formEl.requestSubmit(); }
      } else {
        HTMLFormElement.prototype.submit.call(formEl);
      }
    }

    function addSubmitReviewResult(reply, formEl, submitter) {
      const status = getReviewStatus(reply);
      const div = document.createElement('div');
      div.className = 'msg ai';
      const bubble = document.createElement('div');
      bubble.className = 'bubble';
      bubble.innerHTML = `<div class="review-status ${status.cls}">${status.label}</div>${renderMarkdown(reply)}<div class="review-actions"></div><div class="review-note">FormAssist prüft nur Plausibilität und ersetzt keine verbindliche Rechts- oder Fachprüfung.</div>`;
      const actions = bubble.querySelector('.review-actions');
      const recheck = document.createElement('button');
      recheck.type = 'button';
      recheck.className = 'review-secondary';
      recheck.textContent = 'Erneut prüfen';
      recheck.addEventListener('click', () => startSubmitReview(formEl, submitter));
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'review-continue';
      btn.textContent = 'Trotzdem absenden';
      btn.addEventListener('click', () => submitFormAfterReview(formEl, submitter));
      actions.append(recheck, btn);
      addCopyButton(bubble, reply);
      div.appendChild(bubble);
      messagesEl.appendChild(div);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function getClickedSubmitter(target) {
      const el = target?.closest?.('button,input');
      if (!el || !el.form) return null;
      if (el.tagName === 'BUTTON') {
        const type = (el.getAttribute('type') || 'submit').toLowerCase();
        return type === 'submit' ? el : null;
      }
      const type = (el.getAttribute('type') || '').toLowerCase();
      return type === 'submit' || type === 'image' ? el : null;
    }

    async function startSubmitReview(formEl, submitter, sourceEvent) {
      if (!(formEl instanceof HTMLFormElement)) return;
      if (approvedSubmits.has(formEl)) {
        approvedSubmits.delete(formEl);
        return;
      }

      sourceEvent?.preventDefault();
      sourceEvent?.stopPropagation();
      if (reviewingSubmits.has(formEl)) return;
      reviewingSubmits.add(formEl);

      if (profileVisible) hideProfile();
      open();
      addMsg('user', 'Bitte prüfe das Formular vor dem Absenden.');
      const prompt = buildSubmitReviewPrompt(formEl);
      const reply = await askAI(prompt, { maxTokens: 700, includeActive: false, render: false });
      addSubmitReviewResult(
        reply || 'Status: Warnung\nDie KI-Prüfung konnte gerade nicht abgeschlossen werden. Prüfe die Angaben manuell oder versuche es erneut.',
        formEl,
        submitter
      );
      reviewingSubmits.delete(formEl);
    }

    document.addEventListener('click', e => {
      const submitter = getClickedSubmitter(e.target);
      if (!submitter) return;
      const formEl = submitter.form;
      const bypassNativeValidation = formEl.noValidate || submitter.formNoValidate;
      if (!bypassNativeValidation && formEl.checkValidity()) return;
      startSubmitReview(formEl, submitter, e);
    }, true);

    document.addEventListener('submit', e => {
      startSubmitReview(e.target, e.submitter, e);
    }, true);

    document.addEventListener('invalid', e => {
      const formEl = e.target?.form;
      if (formEl) startSubmitReview(formEl, null, e);
    }, true);

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
    // PROACTIVE FIELD ERROR HELP
    // ═══════════════════════════════════════════════════════════════════════

    const errorHelpTimers = new WeakMap();
    const lastErrorHelp = new WeakMap();
    const lastErrorHelpAt = new WeakMap();

    function getFieldProblem(el) {
      if (!el || !['INPUT','SELECT','TEXTAREA'].includes(el.tagName) || el.type === 'hidden' || !isVisible(el)) return '';
      if (el.willValidate && !el.checkValidity()) return el.validationMessage || 'Das Feld ist ungültig.';
      if (el.getAttribute('aria-invalid') === 'true') return getError(el) || 'Die Seite markiert dieses Feld als ungültig.';
      return getError(el);
    }

    function scheduleFieldErrorHelp(el, delay = 700) {
      if (!el || guidedMode.active) return;
      const problem = getFieldProblem(el);
      if (!problem) return;
      if (reviewingSubmits.has(el.form)) return;
      clearTimeout(errorHelpTimers.get(el));
      errorHelpTimers.set(el, setTimeout(() => showFieldErrorHelp(el), delay));
    }

    function showFieldErrorHelp(el) {
      const problem = getFieldProblem(el);
      if (!problem || reviewingSubmits.has(el.form)) return;
      const label = getLabel(el) || 'diesem Feld';
      const value = getFieldValueForReview(el);
      const key = `${label}|${problem}|${value}`;
      if (lastErrorHelp.get(el) === key) return;
      const lastAt = lastErrorHelpAt.get(el) || 0;
      if (Date.now() - lastAt < 20000) return;
      lastErrorHelp.set(el, key);
      lastErrorHelpAt.set(el, Date.now());
      activeFieldEl = el;
      if (profileVisible) hideProfile();
      open();
      addMsg('user', `Hilf mir beim Feld "${label}".`);
      askAI(
        `Das Feld "${label}" wirkt ungültig. Fehler/Hinweis der Seite: "${problem}". Aktueller Wert: "${value || '[leer]'}". Erkläre in 1-2 Sätzen, was vermutlich falsch ist, und gib eine konkrete Korrekturidee.`,
        { maxTokens: 240, includeActive: false }
      );
    }

    document.addEventListener('blur', e => scheduleFieldErrorHelp(e.target), true);
    document.addEventListener('change', e => scheduleFieldErrorHelp(e.target), true);
    document.addEventListener('input', e => {
      const el = e.target;
      if (!el?.value || !el.willValidate || el.checkValidity()) return;
      scheduleFieldErrorHelp(el, 900);
    }, true);

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
      sidebar.classList.add('no-animate', 'floating');
      sidebar.style.display   = 'none';
      sidebar.style.right     = 'auto';
      sidebar.style.left      = savedPos.left   || '20px';
      sidebar.style.top       = savedPos.top    || '20px';
      sidebar.style.bottom    = 'auto';
      sidebar.style.width     = savedPos.width  || '400px';
      sidebar.style.height    = savedPos.height || '';
      sidebar.style.transform = 'none';
      requestAnimationFrame(() => requestAnimationFrame(() => sidebar.classList.remove('no-animate')));
    }

  }); // end chrome.storage.local.get

})();

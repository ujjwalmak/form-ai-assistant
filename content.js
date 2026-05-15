(function () {
  'use strict';

  let _model    = 'llama-3.3-70b-versatile';
  let _apiKey   = '';
  let _provider = 'groq';
  let _assistantMode = 'context';
  let _keyPromise = null;
  let _onProviderFallback = null;
  function normalizeProvider(value) {
    return String(value || '').toLowerCase() === 'openrouter' ? 'openrouter' : 'groq';
  }
  function providerLabel(provider = _provider) {
    return normalizeProvider(provider) === 'openrouter' ? 'OpenRouter' : 'Groq';
  }
  function getDefaultModel(provider = _provider) {
    return normalizeProvider(provider) === 'openrouter' ? 'openrouter/auto' : 'llama-3.3-70b-versatile';
  }
  function normalizeAssistantMode(value) {
    const v = String(value || '').toLowerCase();
    if (v === 'classic') return 'classic';
    return 'context';
  }
  function loadKey() {
    if (_apiKey) return Promise.resolve(_apiKey);
    if (_keyPromise) return _keyPromise;
    _keyPromise = new Promise(resolve => {
      chrome.storage.sync.get(['faProvider', 'faApiKey', 'faGroqApiKey', 'faOpenRouterApiKey'], stored => {
        _provider = normalizeProvider(stored.faProvider);
        const key = _provider === 'openrouter'
          ? (stored.faOpenRouterApiKey || stored.faApiKey || '')
          : (stored.faGroqApiKey || stored.faApiKey || '');
        _apiKey = String(key || '').trim();
        resolve(_apiKey);
      });
    }).finally(() => { _keyPromise = null; });
    return _keyPromise;
  }

  // ── CSP-safe API helpers (routed via background service worker) ──────
  function groqRequest(key, body) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type: 'llm-fetch', provider: _provider, key, body }, resp => {
        if (chrome.runtime.lastError) { reject(new Error(chrome.runtime.lastError.message)); return; }
        if (!resp?.ok) reject(new Error(resp?.error || 'Unbekannter Fehler'));
        else {
          if (resp.usedFallback) _onProviderFallback?.();
          resolve(resp.data);
        }
      });
    });
  }

  function groqStream(key, body, onChunk) {
    return new Promise((resolve, reject) => {
      const port = chrome.runtime.connect({ name: 'llm-stream' });
      port.postMessage({ provider: _provider, key, body });
      port.onMessage.addListener(msg => {
        if (msg.type === 'chunk')    onChunk(msg.chunk);
        else if (msg.type === 'fallback') _onProviderFallback?.();
        else if (msg.type === 'done')    { port.disconnect(); resolve(); }
        else if (msg.type === 'error')   { port.disconnect(); reject(new Error(msg.error)); }
      });
      port.onDisconnect.addListener(() => resolve());
    });
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
  const AGENT_SELECTOR_ATTR = 'data-fa-selector-id';
  const AGENT_AUTO_SELECT_CONFIDENCE = 0.82;
  let selectorSeq = 0;

  function getAgentSelector(el) {
    if (!el) return '';
    if (el.id) return `[id="${CSS.escape(el.id)}"]`;
    const name = el.getAttribute('name');
    if (name) return `[name="${CSS.escape(name)}"]`;
    let selectorId = el.getAttribute(AGENT_SELECTOR_ATTR);
    if (!selectorId) {
      selectorId = `fa-${(++selectorSeq).toString(36)}`;
      el.setAttribute(AGENT_SELECTOR_ATTR, selectorId);
    }
    return `[${AGENT_SELECTOR_ATTR}="${CSS.escape(selectorId)}"]`;
  }

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

  function parseDateToISO(text) {
    // DD.MM.YYYY → YYYY-MM-DD
    const m1 = text.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (m1) return `${m1[3]}-${m1[2].padStart(2,'0')}-${m1[1].padStart(2,'0')}`;
    // MM/DD/YYYY → YYYY-MM-DD
    const m2 = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m2) return `${m2[3]}-${m2[1].padStart(2,'0')}-${m2[2].padStart(2,'0')}`;
    // YYYY-MM-DD — already correct
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
    return null;
  }

  function isKendoWidget(el) {
    if (!el) return null;
    const rawRole = (el.getAttribute('data-role') || '').toLowerCase();
    if (!rawRole) return null;
    const role = rawRole === 'dropdown' ? 'dropdownlist' : rawRole;
    const valid = new Set(['datepicker', 'autocomplete', 'combobox', 'multiselect', 'dropdownlist']);
    return valid.has(role) ? role : null;
  }

  function getKendoWidget(el, role) {
    if (!el || !role) return null;
    const jq = window.kendo?.jQuery?.(el);
    if (!jq?.data) return null;
    const map = {
      datepicker: 'kendoDatePicker',
      autocomplete: 'kendoAutoComplete',
      combobox: 'kendoComboBox',
      multiselect: 'kendoMultiSelect',
      dropdownlist: 'kendoDropDownList',
    };
    const key = map[role];
    return key ? jq.data(key) : null;
  }

  function getElementTextValue(el) {
    return clean(el?.textContent || el?.value || el?.getAttribute?.('aria-label') || '');
  }

  function findButtonByText(root, selector, texts) {
    const els = root ? Array.from(root.querySelectorAll(selector)) : [];
    return els.find(b => {
      if (b.disabled) return false;
      const txt = getElementTextValue(b).toLowerCase();
      return texts.some(t => txt.includes(t.toLowerCase()));
    });
  }

  function setKendoValue(el, value) {
    const role = isKendoWidget(el);
    if (!role) return false;
    try {
      const widget = getKendoWidget(el, role);
      if (!widget) return false;
      if (role === 'datepicker') {
        const iso = parseDateToISO(String(value));
        if (!iso) return false;
        widget.value(new Date(`${iso}T00:00:00`));
      } else {
        widget.value(String(value));
      }
      widget.trigger?.('change');
      return true;
    } catch { return false; }
  }

  function tryDatePickerLib(el, text) {
    // Flatpickr
    if (el._flatpickr) {
      try { el._flatpickr.setDate(text, true); return true; } catch {}
    }
    // Pikaday
    if (el._pikaday) {
      try {
        const iso = parseDateToISO(text);
        const d = iso ? new Date(iso) : new Date(text);
        if (!isNaN(d)) { el._pikaday.setDate(d, true); return true; }
      } catch {}
    }
    // jQuery-based pickers (Bootstrap Datepicker, jQuery UI)
    try {
      const $ = window.jQuery || window.$;
      if (typeof $ === 'function') {
        const $el = $(el);
        if ($el.data('datepicker') || $el.data('ui-datepicker')) { $el.datepicker('setDate', text); return true; }
        if ($el.data('DateTimePicker'))                           { $el.data('DateTimePicker').date(text); return true; }
        if ($el.data('datetimepicker'))                          { $el.data('datetimepicker').setDate(new Date(text)); return true; }
      }
    } catch {}
    // Air Datepicker / custom widgets that expose an API on the element
    if (el.datepicker && typeof el.datepicker.setDate === 'function') {
      try { el.datepicker.setDate(text); return true; } catch {}
    }
    return false;
  }

  function fillField(el, value) {
    let text = String(value ?? '').trim();
    const kendoRole = isKendoWidget(el);
    if (kendoRole) {
      if (setKendoValue(el, text)) {
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return;
      }
    }
    const elType = (el.type || '').toLowerCase();
    if ((elType !== 'date' && elType !== 'time' && el.getAttribute('data-datepicker') !== null) || el._flatpickr || el._pikaday) {
      if (tryDatePickerLib(el, text)) {
        el.dispatchEvent(new Event('input',  { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return;
      }
    }

    if (el.tagName === 'SELECT') {
      const wanted = text.toLowerCase();
      const option = text ? Array.from(el.options).find(o => {
        const label = clean(o.text || o.label || o.value).toLowerCase();
        const val = clean(o.value).toLowerCase();
        return label === wanted || val === wanted || label.includes(wanted) || wanted.includes(label);
      }) : null;
      if (option) el.value = option.value;
      else if (text) el.value = text;
    } else if (elType === 'checkbox') {
      el.checked = /^(ja|yes|true|1|x|ok|checked|ausgewählt)$/i.test(text);
    } else if (elType === 'radio') {
      const root = el.form || document;
      const radios = el.name ? Array.from(root.querySelectorAll(`input[type="radio"][name="${CSS.escape(el.name)}"]`)) : [el];
      const wanted = text.toLowerCase();
      const match = radios.find(opt => {
        const label = getLabel(opt).toLowerCase();
        const val = String(opt.value || '').toLowerCase();
        return label === wanted || val === wanted || label.includes(wanted) || wanted.includes(label);
      }) || radios[0];
      if (match && !match.checked) match.click();
      el = match || el;
    } else {
      if (elType === 'date') { const iso = parseDateToISO(text); if (iso) text = iso; }
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
  function formatBytes(bytes) {
    const n = Number(bytes);
    if (!Number.isFinite(n) || n <= 0) return '';
    const mb = Math.round(n / (1024 * 1024));
    return mb > 0 ? `${mb} MB` : `${n} B`;
  }

  function isVisible(el) {
    if (el.disabled) return false;
    const s = window.getComputedStyle(el);
    return s.display !== 'none' && s.visibility !== 'hidden' && el.offsetWidth > 0;
  }

  function textFromEl(el) {
    if (!el) return '';
    const clone = el.cloneNode(true);
    clone.querySelectorAll('input,select,textarea,button').forEach(e => e.remove());
    clone.querySelectorAll('.accessibility,.required-mark,[aria-hidden="true"]').forEach(e => e.remove());
    return clean(clone.textContent).replace(/\s*[*†‡]\s*$/, '');
  }

  function getLabel(el) {
    let v = clean(el.getAttribute('aria-label'));
    if (v) return v;
    const lblBy = el.getAttribute('aria-labelledby');
    if (lblBy) {
      v = clean(lblBy.split(' ').map(id => textFromEl(document.getElementById(id))).filter(Boolean).join(' '));
      if (v) return v;
    }
    if (el.id) {
      const lbl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (lbl) return textFromEl(lbl);
    }
    const wl = el.closest('label');
    if (wl) {
      v = textFromEl(wl);
      if (v) return v;
    }
    if (el.title)       return clean(el.title);
    if (el.placeholder) return clean(el.placeholder);
    const raw = el.name || el.id || '';
    if (raw) return raw.replace(/[-_[\]]/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').trim();
    return '';
  }

  function getGroupLabel(el) {
    const group = el?.closest?.('[role="group"]');
    const lblBy = group?.getAttribute('aria-labelledby');
    if (lblBy) {
      const v = clean(lblBy.split(' ').map(id => textFromEl(document.getElementById(id))).filter(Boolean).join(' '));
      if (v) return v;
    }
    const formline = el?.closest?.('.formline');
    if (formline) {
      const pseudo = formline.querySelector('.pseudoLabel, label');
      const v = textFromEl(pseudo);
      if (v) return v;
    }
    return '';
  }

  function isFileWidget(el) {
    if (!el || el.tagName !== 'INPUT') return false;
    const type = (el.type || '').toLowerCase();
    if (type !== 'submit' && type !== 'button') return false;
    return !!(el.closest('.inputFile') || el.dataset.postUrl || el.dataset.allowedTypes || el.getAttribute('data-allowed-types'));
  }

  function getHint(el) {
    const descBy = el.getAttribute('aria-describedby');
    if (descBy) {
      const v = clean(descBy.split(' ').map(id => document.getElementById(id)?.textContent).filter(Boolean).join(' '));
      if (v) return v;
    }
    const block = el.closest('.block');
    if (block) {
      const intro = block.querySelector('.field-intro');
      const v = clean(intro?.textContent);
      if (v && v.length < 500) return v;
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
    const fileWidget = isFileWidget(el);
    if (!isVisible(el)) return null;
    if (!fileWidget && SKIP_TYPES.has(el.type)) return null;
    
    const kendoRole = isKendoWidget(el);
    let label = getLabel(el);
    if (!kendoRole && (el.type || '').toLowerCase() === 'radio') {
      const groupLabel = getGroupLabel(el);
      if (groupLabel) label = groupLabel;
    }
    if (!label) return null;
    
    const info = {
      label,
      type:         fileWidget ? 'file' : kendoRole ? kendoRole : el.tagName === 'SELECT' ? 'select' : el.tagName === 'TEXTAREA' ? 'textarea' : (el.type || 'text'),
      required:     el.required || el.getAttribute('aria-required') === 'true' || !!el.closest('.required') || !!el.closest('.formline')?.querySelector('.required-mark'),
      autocomplete: (el.getAttribute('autocomplete') || '').replace(/^(on|off)$/, ''),
      hint:         getHint(el),
      selector:     getAgentSelector(el),
      options:      [],
      el,
    };
    
    if (!kendoRole && info.type === 'radio' && el.name) {
      const root = el.form || document;
      info.options = Array.from(root.querySelectorAll(`input[type="radio"][name="${CSS.escape(el.name)}"]`))
        .map(opt => getLabel(opt)).filter(Boolean);
    }
    if (el.tagName === 'SELECT') info.options = Array.from(el.options).filter(o => o.value && clean(o.text)).slice(0, 10).map(o => clean(o.text));
    
    if (kendoRole === 'combobox' || kendoRole === 'dropdownlist' || kendoRole === 'multiselect') {
      try {
        const widget = getKendoWidget(el, kendoRole);
        if (widget?.dataSource?.data) {
          const items = widget.dataSource.data();
          info.options = (Array.isArray(items) ? items : [])
            .map(item => item?.text || item?.label || String(item))
            .filter(Boolean)
            .slice(0, 10);
        }
      } catch {}
    }
    
    if (el.min)                  info.min = el.min;
    if (el.max)                  info.max = el.max;
    if (el.maxLength > 0 && el.maxLength < 9999) info.maxLength = el.maxLength;
    if (fileWidget) {
      const allowed = el.dataset.allowedTypes || el.getAttribute('data-allowed-types');
      const totalLimit = el.dataset.overallAttachmentSizeLimit || el.getAttribute('data-overall-attachment-size-limit');
      const bits = [];
      if (allowed) bits.push(`Dateiformate: ${allowed}`);
      if (totalLimit) {
        const formatted = formatBytes(totalLimit);
        if (formatted) bits.push(`Max. Gesamtgröße: ${formatted}`);
      }
      if (bits.length) info.hint = info.hint ? `${info.hint} (${bits.join(' · ')})` : bits.join(' · ');
    }
    return info;
  }

  function groupIntoSections(formEl) {
    const sections = [];
    let current = { title: '', fields: [] };
    const HEADS = new Set(['H1','H2','H3','H4','H5','LEGEND']);
    const INPUTS = new Set(['INPUT','SELECT','TEXTAREA']);
    const seenRadio = new Set();
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
        if ((node.type || '').toLowerCase() === 'radio' && node.name) {
          if (seenRadio.has(node.name)) return;
          seenRadio.add(node.name);
        }
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

  function getFormStepInfo() {
    const roadmap = document.querySelector('[class*="roadmap"],[role="progressbar"],[class*="wizard"],[class*="stepper"],[class*="steps"]');
    if (!roadmap) return null;
    
    const steps = roadmap.querySelectorAll('[class*="step"],[role="tab"]');
    if (steps.length === 0) return null;
    
    let currentIdx = -1;
    steps.forEach((s, i) => {
      if (s.classList.contains('active') || s.getAttribute('aria-selected') === 'true' || s.getAttribute('aria-current') === 'step') {
        currentIdx = i;
      }
    });
    
    if (currentIdx === -1) currentIdx = 0;
    
    const nextBtn = findButtonByText(document, 'button[type="submit"], input[type="submit"]', ['Weiter', 'Next', 'Fortschritt']);
    const form = nextBtn?.form || document.querySelector('form') || document.body;
    
    return {
      current: currentIdx + 1,
      total: steps.length,
      isMultiStep: steps.length > 1,
      nextButton: nextBtn,
      form: form,
    };
  }

  function advanceToNextStep(formEl) {
    if (!formEl) return false;
    if (typeof formEl.checkValidity === 'function' && !formEl.checkValidity()) return false;

    const nextBtn = findButtonByText(formEl, 'button[type="submit"], input[type="submit"]', ['Weiter', 'Next', 'Fortschritt']);

    const hidden = formEl?.querySelector('input[name*="submit"][type="hidden"]');
    if (hidden) {
      const submitValue = nextBtn?.getAttribute?.('data-submit-value') || nextBtn?.value || hidden.getAttribute('value') || 'next';
      hidden.value = submitValue;
    }
    if (nextBtn) {
      if (typeof formEl.requestSubmit === 'function') formEl.requestSubmit(nextBtn.form === formEl ? nextBtn : undefined);
      else nextBtn.click();
      return true;
    }
    const submitBtn = formEl?.querySelector('button[type="submit"]');
    if (submitBtn) {
      if (typeof formEl.requestSubmit === 'function') formEl.requestSubmit(submitBtn);
      else submitBtn.click();
      return true;
    }
    return false;
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
      // Only treat body as virtual form if inputs are not inside nav/header/footer
      const loose = Array.from(document.querySelectorAll('input:not([type=hidden]),select,textarea'))
        .filter(el => !el.closest('nav,header,footer,[role=search],[role=navigation]'));
      if (loose.length > 0) formEls = [document.body];
    }
    const forms = formEls.map((formEl, i) => {
      const sections  = groupIntoSections(formEl);
      const allFields = sections.flatMap(s => s.fields);
      if (allFields.length === 0) return null;
      return { index: i + 1, formEl, submitText: getSubmitText(formEl), intro: getFormIntro(formEl), sections, allFields };
    }).filter(Boolean);

    // Scan same-origin iframes (cross-origin access throws → caught silently)
    Array.from(document.querySelectorAll('iframe')).forEach(iframe => {
      try {
        const doc = iframe.contentDocument;
        if (!doc || doc === document) return;
        let iframeFormEls = Array.from(doc.querySelectorAll('form'));
        if (iframeFormEls.length === 0) {
          const loose = doc.querySelectorAll('input:not([type=hidden]),select,textarea');
          if (loose.length > 0) iframeFormEls = [doc.body];
        }
        iframeFormEls.forEach(formEl => {
          const sections  = groupIntoSections(formEl);
          const fields    = sections.flatMap(s => s.fields);
          if (fields.length === 0) return;
          forms.push({ index: forms.length + 1, formEl, submitText: getSubmitText(formEl), intro: getFormIntro(formEl), sections, allFields: fields });
        });
      } catch { /* cross-origin, skip */ }
    });

    // Scan open shadow roots in host page (Web Components, custom elements)
    try {
      document.querySelectorAll('*').forEach(el => {
        if (!el.shadowRoot || el.id === 'formassist-host') return;
        try {
          let srForms = Array.from(el.shadowRoot.querySelectorAll('form'));
          if (!srForms.length) {
            const loose = el.shadowRoot.querySelectorAll('input:not([type=hidden]),select,textarea');
            if (loose.length > 0) srForms = [el.shadowRoot];
          }
          srForms.forEach(formEl => {
            const sections = groupIntoSections(formEl);
            const fields   = sections.flatMap(s => s.fields);
            if (!fields.length) return;
            forms.push({ index: forms.length + 1, formEl, submitText: getSubmitText(formEl), intro: '', sections, allFields: fields });
          });
        } catch {}
      });
    } catch {}

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
          if (f.options.length) line += `\n  Optionen: ${f.options.slice(0, 8).join(', ')}${f.options.length > 8 ? ', …' : ''}`;
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
    const label = ((el.type || '').toLowerCase() === 'radio' ? getGroupLabel(el) : '') || getLabel(el);
    if (label) parts.push(`Aktuell fokussiertes Feld: "${label}"`);
    const hint = getHint(el);  if (hint)  parts.push(`Feldhinweis: "${hint}"`);
    const err  = getError(el); if (err)   parts.push(`Aktuelle Fehlermeldung: "${err}"`);
    if (el.required) parts.push('(Pflichtfeld)');
    if (!isFileWidget(el)) {
      const val = el.value?.trim();
      if (val && val.length < 100) parts.push(`Aktueller Wert: "${val}"`);
    }
    return parts.length ? '\n\n' + parts.join('\n') : '';
  }

  // ── Run extraction ──────────────────────────────────────────────────
  let ctx = extractRichContext();
  let allFields   = ctx.forms.flatMap(f => f.allFields);
  let submitLabel = ctx.forms[0]?.submitText;
  
  // Multi-step form state
  let stepInfo = getFormStepInfo();
  let autoAdvanceEnabled = false;
  let advanceCount = 0;

  // ═══════════════════════════════════════════════════════════════════════
  // INIT — load storage before building UI
  // ═══════════════════════════════════════════════════════════════════════

  chrome.storage.sync.get(['faModel', 'faAssistantMode', 'faProvider'], syncStored => {
    _provider = normalizeProvider(syncStored.faProvider);
    _model = syncStored.faModel || getDefaultModel(_provider);
    _assistantMode = normalizeAssistantMode(syncStored.faAssistantMode);

  chrome.storage.local.get(['faProfile', 'faPosition', 'faDarkMode', 'faExtras', 'faProfiles', 'faActiveProfileId', 'faHistory'], stored => {
    // ── Profile state ────────────────────────────────────────────────────
    let profiles        = stored.faProfiles || [];
    let activeProfileId = stored.faActiveProfileId || null;

    // Migrate legacy single-profile to multi-profile on first run
    if (!profiles.length) {
      const legacyProfile = stored.faProfile || {};
      const legacyExtras  = stored.faExtras  || {};
      activeProfileId = 'default';
      profiles = [{ id: 'default', name: 'Hauptprofil', profile: legacyProfile, extras: legacyExtras }];
      chrome.storage.local.set({ faProfiles: profiles, faActiveProfileId: activeProfileId });
    }
    if (!activeProfileId || !profiles.find(p => p.id === activeProfileId)) {
      activeProfileId = profiles[0].id;
    }

    function getActiveEntry() { return profiles.find(p => p.id === activeProfileId) || profiles[0]; }

    const activeEntry = getActiveEntry();
    const profile  = activeEntry.profile;
    const extras   = activeEntry.extras;
    const savedPos = stored.faPosition || null;
    let   darkMode = stored.faDarkMode || false;
    let   faHistory = stored.faHistory || [];

    let SYSTEM = buildSystemPrompt(ctx, profile, extras);

    // ── Shadow DOM ────────────────────────────────────────────────────
    const hostEl = document.createElement('div');
    hostEl.id = 'formassist-host';
    Object.assign(hostEl.style, { position: 'fixed', inset: '0', zIndex: '2147483647', pointerEvents: 'none' });
    document.body.appendChild(hostEl);
    const shadow = hostEl.attachShadow({ mode: 'open' });

    const fontLink = document.createElement('link');
    fontLink.rel = 'stylesheet';
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap';
    shadow.appendChild(fontLink);

    // ── Styles ────────────────────────────────────────────────────────
    const style = document.createElement('style');
    style.textContent = `
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      :host {
        --bg:       #f8fafd;
        --surface:  #ffffff;
        --surface2: #f2f6fc;
        --surface3: #dfe9fb;
        --border:   #c4c7c5;
        --border2:  #9aa0a6;
        --text:     #202124;
        --text2:    #3c4043;
        --text3:    #5f6368;
        --accent:   #0b57d0;
        --accent-h: #0842a0;
        --accent-l: #d3e3fd;
        --accent-b: #a8c7fa;
        --grad:     linear-gradient(135deg, #0b57d0, #0a4cb5);
        --danger:   #b42318;
        --danger-l: #fef3f2;
        --focus:    0 0 0 3px rgba(11, 87, 208, 0.24);
        --shadow:   0 14px 34px rgba(60,64,67,0.2), 0 4px 12px rgba(60,64,67,0.14);
        --state:    rgba(11, 87, 208, 0.10);
        --state-strong: rgba(11, 87, 208, 0.16);
        --state-on-primary: rgba(255, 255, 255, 0.18);
        --ok:       #047857;
        --ok-l:     #ecfdf5;
        --warn:     #a16207;
        --warn-l:   #fffbeb;
        --font:     'Roboto', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        --ease:     cubic-bezier(0.4, 0, 0.2, 1);
      }
      :host(.dark) {
        --bg:       #131314;
        --surface:  #1f1f1f;
        --surface2: #2b2f36;
        --surface3: #253246;
        --border:   #3c4043;
        --border2:  #5f6368;
        --text:     #e8eaed;
        --text2:    #c7c9cc;
        --text3:    #9aa0a6;
        --accent:   #a8c7fa;
        --accent-h: #d3e3fd;
        --accent-l: #2f3a4d;
        --accent-b: #4d648f;
        --grad:     linear-gradient(135deg, #a8c7fa, #8fb2f5);
        --danger:   #f97066;
        --danger-l: #451a1a;
        --focus:    0 0 0 3px rgba(168, 199, 250, 0.3);
        --shadow:   0 18px 48px rgba(0,0,0,0.48), 0 3px 12px rgba(0,0,0,0.36);
        --state:    rgba(168, 199, 250, 0.14);
        --state-strong: rgba(168, 199, 250, 0.22);
        --state-on-primary: rgba(32, 33, 36, 0.18);
        --ok:       #86efac;
        --ok-l:     #052e1a;
        --warn:     #fde68a;
        --warn-l:   #422006;
      }

      button {
        -webkit-tap-highlight-color: transparent;
      }
      button:not(:disabled) {
        position: relative;
        overflow: hidden;
      }
      button:not(:disabled)::before {
        content: '';
        position: absolute;
        inset: 0;
        background: var(--state);
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.14s var(--ease);
      }
      button:not(:disabled):hover::before { opacity: 1; }
      button:not(:disabled):focus-visible::before { opacity: 1; }
      button:not(:disabled):active::before { opacity: 1; background: var(--state-strong); }
      button > * { position: relative; z-index: 1; }

      /* ── Trigger ── */
      @keyframes trigger-pulse {
        0%, 100% { box-shadow: 0 8px 22px rgba(11,87,208,0.3), 0 0 0 0 rgba(11,87,208,0); }
        50%       { box-shadow: 0 10px 28px rgba(11,87,208,0.36), 0 0 0 8px rgba(11,87,208,0); }
      }
      button.trigger {
        position: fixed; bottom: 24px; right: 24px; width: 52px; height: 52px;
        background: var(--accent); border: 1px solid transparent; border-radius: 20px; cursor: pointer;
        display: flex; align-items: center; justify-content: center; pointer-events: all; z-index: 2;
        animation: trigger-pulse 2.8s ease-in-out infinite;
        transition: transform 0.16s var(--ease), opacity 0.2s;
      }
      .trigger::before, .send-btn::before, .qs-btn.qs-accent::before,
      .profile-actions .btn-primary::before, .agent-confirm::before,
      .review-continue::before, .autofill-btn::before { background: var(--state-on-primary); }
      .trigger:hover  { transform: translateY(-2px) scale(1.04); animation: none; box-shadow: 0 12px 28px rgba(11,87,208,0.34), 0 0 0 6px rgba(11,87,208,0.12); }
      .trigger:active { transform: translateY(0) scale(0.97); animation: none; }
      .trigger:focus-visible { outline: none; box-shadow: var(--focus), 0 10px 24px rgba(11,87,208,0.3); animation: none; }
      .trigger svg    { width: 21px; height: 21px; stroke: #fff; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; fill: none; }

      /* ── Sidebar ── */
      .sidebar {
        position: fixed; top: 0; right: 0; bottom: 0; width: 400px; min-width: 320px;
        background: var(--surface);
        backdrop-filter: none;
        -webkit-backdrop-filter: none;
        border-left: 1px solid var(--border);
        box-shadow: var(--shadow); display: flex; flex-direction: column;
        font-family: var(--font); pointer-events: all; z-index: 2;
        transform: translateX(calc(100% + 4px));
        transition: transform 0.28s cubic-bezier(0.32, 0.72, 0, 1);
        user-select: none;
      }
      .sidebar::before {
        content: '';
        position: absolute;
        top: 8px;
        left: 50%;
        width: 36px;
        height: 4px;
        border-radius: 999px;
        background: var(--border2);
        opacity: 0.72;
        transform: translateX(-50%);
        z-index: 12;
      }
      :host(.dark) .sidebar { background: var(--surface); }
      .sidebar.open       { transform: translateX(0); }
      .sidebar.floating   { border: 1px solid var(--border); border-radius: 18px; overflow: hidden; }
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
        padding: 8px 14px 0 16px; height: 64px; border-bottom: 1px solid var(--border);
        display: flex; align-items: center; justify-content: space-between;
        gap: 12px;
        background: var(--surface);
        flex-shrink: 0; cursor: grab; touch-action: none;
        box-shadow: 0 1px 0 rgba(60,64,67,0.04);
        z-index: 4;
      }
      .header:active { cursor: grabbing; }
      .logo      { display: flex; align-items: center; gap: 9px; pointer-events: none; min-width: 0; }
      .logo-icon { width: 32px; height: 32px; background: var(--accent-l); color: var(--accent); border: 1px solid var(--accent-b); border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
      .logo-icon svg { width: 17px; height: 17px; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; fill: none; }
      .logo-name  { font-size: 15px; font-weight: 650; color: var(--text); letter-spacing: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .logo-text  { display: flex; flex-direction: column; gap: 1px; min-width: 0; overflow: hidden; }
      .logo-sub   { font-size: 10.5px; color: var(--text3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .header-btns { display: flex; gap: 4px; flex-shrink: 0; }
      .icon-btn { width: 32px; height: 32px; border: 1px solid transparent; background: transparent; cursor: pointer; border-radius: 999px; display: flex; align-items: center; justify-content: center; color: var(--text3); transition: color 0.14s, border-color 0.14s; }
      .icon-btn:hover  { color: var(--text); }
      .icon-btn:focus-visible { outline: none; box-shadow: var(--focus); color: var(--accent); }
      .icon-btn.active { background: var(--accent-l); color: var(--accent); border-color: var(--accent-b); }
      .icon-btn svg { width: 14px; height: 14px; stroke: currentColor; stroke-width: 2.2; stroke-linecap: round; fill: none; }

      /* ── Messages ── */
      .messages { flex: 1; overflow-y: auto; padding: 18px; display: flex; flex-direction: column; gap: 12px; scroll-behavior: smooth; background: var(--bg); transition: opacity 0.15s, transform 0.15s; }
      .results-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px 28px; text-align: center; pointer-events: none; }
      .re-icon { width: 52px; height: 52px; border-radius: 16px; background: var(--accent-l); border: 1.5px solid var(--accent-b); display: flex; align-items: center; justify-content: center; margin-bottom: 18px; }
      .re-icon svg { width: 26px; height: 26px; stroke: var(--accent); stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; fill: none; }
      .re-title { font-size: 14.5px; font-weight: 700; color: var(--text); margin-bottom: 5px; line-height: 1.3; }
      .re-sub { font-size: 11px; color: var(--text3); margin-bottom: 14px; font-family: var(--font); }
      .re-hint { font-size: 12px; color: var(--text2); line-height: 1.6; max-width: 230px; }
      .messages::-webkit-scrollbar { width: 5px; }
      .messages::-webkit-scrollbar-track { background: transparent; }
      .messages::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 999px; }
      .msg { display: flex; align-items: flex-end; animation: msg-in 0.22s cubic-bezier(0.34, 1.3, 0.64, 1); }
      @keyframes msg-in { from { opacity: 0; transform: translateY(10px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
      .msg.ai { justify-content: flex-start; }
      .bubble { max-width: 100%; padding: 11px 14px; font-size: 13.5px; line-height: 1.52; color: var(--text); font-family: var(--font); overflow-wrap: anywhere; box-shadow: 0 1px 2px rgba(60,64,67,0.08); }
      .msg.ai   .bubble { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; }
      .msg.user { justify-content: flex-start; }
      .msg.user .bubble { background: var(--surface2); border: 1px solid var(--border); border-radius: 999px; padding: 5px 14px; color: var(--text2); font-size: 12px; line-height: 1.4; box-shadow: none; max-width: calc(100% - 0px); }
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


      /* ── Field list ── */
      .field-list { display: flex; flex-direction: column; gap: 6px; margin-top: 10px; max-height: 190px; overflow-y: auto; padding-right: 2px; }
      .field-list::-webkit-scrollbar { width: 4px; }
      .field-list::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 999px; }
      .field-btn {
        width: 100%; min-height: 32px; background: var(--surface); border: 1px solid var(--border); color: var(--text2);
        padding: 6px 9px; border-radius: 12px; font-size: 12px; cursor: pointer;
        text-align: left; font-family: var(--font); display: flex; align-items: center; gap: 7px;
        transition: background 0.14s, color 0.14s, border-color 0.14s, box-shadow 0.14s;
      }
      .field-btn:hover { color: var(--accent); border-color: var(--accent-b); }
      .field-btn:focus-visible { outline: none; box-shadow: var(--focus); border-color: var(--accent-b); }
      .field-btn-label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
      .field-btn .req { color: var(--danger); background: var(--danger-l); border: 1px solid rgba(180,35,24,0.2); border-radius: 5px; font-size: 10px; line-height: 1; padding: 3px 5px; margin-left: auto; flex-shrink: 0; }
      .field-type-tag { font-size: 10px; color: var(--text3); background: var(--bg); border: 1px solid var(--border); padding: 2px 5px; border-radius: 5px; flex-shrink: 0; max-width: 78px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

      /* ── Chips ── */
      .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
      .chip  { max-width: 100%; background: var(--surface); border: 1px solid var(--border); color: var(--text2); padding: 5px 9px; border-radius: 8px; font-size: 11.5px; cursor: pointer; font-family: var(--font); transition: background 0.14s, border-color 0.14s, color 0.14s, box-shadow 0.14s; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .chip:hover { border-color: var(--accent-b); color: var(--accent); }
      .chip:focus-visible { outline: none; box-shadow: var(--focus); border-color: var(--accent-b); }

      /* ── Typing ── */
      .typing-row    { display: flex; gap: 9px; align-items: flex-end; }
      .typing-bubble { background: var(--surface); border: 1px solid var(--border); border-radius: 16px 16px 16px 6px; padding: 13px 16px; display: flex; align-items: center; box-shadow: 0 1px 2px rgba(60,64,67,0.08); }
      .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--accent); animation: fa-pulse 1.3s ease-in-out infinite; }
      @keyframes fa-pulse { 0%,100% { opacity: 0.35; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.2); } }

      /* ── Input area ── */
      .input-area  { padding: 12px 16px 14px; border-top: 1px solid var(--border); background: var(--surface); flex-shrink: 0; }
      .field-tag   { font-size: 11.5px; color: var(--text3); margin-bottom: 7px; display: none; align-items: center; gap: 6px; min-width: 0; }
      .field-tag.visible { display: flex; }
      .field-tag .dot-ind { width: 6px; height: 6px; background: var(--accent); border-radius: 50%; flex-shrink: 0; animation: blink 2s ease-in-out infinite; }
      @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
      .field-tag span { font-weight: 600; color: var(--accent); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
      .input-row  { display: flex; gap: 8px; align-items: flex-end; }
      .input-box  { flex: 1; min-width: 0; font-family: var(--font); font-size: 13.5px; padding: 10px 14px; border: 1.5px solid transparent; border-radius: 20px; background: var(--surface2); color: var(--text); resize: none; outline: none; min-height: 40px; max-height: 112px; line-height: 1.45; transition: border-color 0.14s, box-shadow 0.14s, background 0.14s; }
      .input-box:focus { border-color: var(--accent); box-shadow: var(--focus); background: var(--surface); }
      .input-box::placeholder { color: var(--text3); }
      .send-btn { width: 40px; height: 40px; background: var(--accent); border: none; border-radius: 999px; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: transform 0.12s, box-shadow 0.14s, opacity 0.14s; box-shadow: 0 2px 6px rgba(11,87,208,0.28); }
      .send-btn:hover  { transform: scale(1.04); box-shadow: 0 4px 12px rgba(11,87,208,0.34); }
      .send-btn:focus-visible { outline: none; box-shadow: var(--focus), 0 2px 6px rgba(11,87,208,0.28); }
      .send-btn:active { transform: scale(0.95); }
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
      @keyframes profile-in  { from { opacity: 0; transform: translateX(18px); } to   { opacity: 1; transform: translateX(0); } }
      .profile-panel { display: none; flex-direction: column; flex: 1; overflow: hidden; background: var(--surface); }
      .profile-panel.visible { display: flex; animation: profile-in 0.22s var(--ease) forwards; }
      .profile-hdr { padding: 11px 18px; border-bottom: 1px solid var(--border); font-size: 12px; font-weight: 650; color: var(--text); flex-shrink: 0; display: flex; justify-content: space-between; align-items: center; gap: 10px; min-width: 0; background: var(--surface2); }
      .profile-hdr span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .profile-hdr span:last-child { font-weight: 400; color: var(--text3); font-size: 10.5px; flex-shrink: 0; max-width: 52%; }
      .profile-grid { flex: 1; overflow-y: auto; padding: 14px 18px; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 10px; background: var(--surface); }
      .profile-grid::-webkit-scrollbar { width: 5px; }
      .profile-grid::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 999px; }
      .pf { display: flex; flex-direction: column; gap: 4px; }
      .pf.full { grid-column: 1 / -1; }
      .pf label { font-size: 10.5px; color: var(--text3); font-weight: 600; font-family: var(--font); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .pf input { width: 100%; min-width: 0; font-family: var(--font); font-size: 12.5px; padding: 8px 10px; border: 1px solid transparent; border-radius: 8px; background: var(--surface2); color: var(--text); outline: none; transition: border-color 0.14s, box-shadow 0.14s, background 0.14s; }
      .pf input:focus { border-color: var(--accent); box-shadow: var(--focus); background: var(--surface); }
      .profile-actions { padding: 10px 18px; border-top: 1px solid var(--border); display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px; flex-shrink: 0; background: var(--surface2); }
      .profile-actions button { min-width: 0; padding: 7px 8px; border-radius: 8px; font-size: 11.5px; font-family: var(--font); cursor: pointer; border: 1px solid var(--border2); background: var(--surface); color: var(--text2); transition: background 0.14s, color 0.14s, border-color 0.14s, box-shadow 0.14s; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .profile-actions button:hover { color: var(--text); }
      .profile-actions button:focus-visible { outline: none; box-shadow: var(--focus); border-color: var(--accent-b); }
      .profile-actions .btn-primary { background: var(--accent); color: #fff; border-color: transparent; }
      .profile-actions .btn-primary:hover { background: var(--accent-h); }
      .profile-actions .btn-danger { color: var(--danger); border-color: var(--danger); }
      .profile-actions .btn-danger:hover { background: var(--danger-l); }
      .profile-actions .btn-io { color: var(--accent); border-color: var(--accent-b); background: var(--accent-l); }
      .profile-actions .btn-io:hover { background: var(--accent-b); }
      /* ── History panel ── */
      .history-panel { display: none; flex-direction: column; flex: 1; overflow: hidden; }
      .history-panel.visible { display: flex; }
      .history-list { flex: 1; overflow-y: auto; padding: 10px 18px; display: flex; flex-direction: column; gap: 8px; }
      .history-entry { display: flex; align-items: flex-start; gap: 10px; padding: 10px 12px; border: 1px solid var(--border); border-radius: 10px; background: var(--surface); cursor: pointer; transition: border-color 0.14s, background 0.14s; }
      .history-entry:hover { border-color: var(--accent-b); background: var(--accent-l); }
      .history-icon { width: 32px; height: 32px; border-radius: 8px; background: var(--accent-l); border: 1px solid var(--accent-b); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
      .history-icon svg { width: 16px; height: 16px; stroke: var(--accent); stroke-width: 2; fill: none; stroke-linecap: round; stroke-linejoin: round; }
      .history-info { flex: 1; min-width: 0; }
      .history-domain { font-size: 12.5px; font-weight: 600; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .history-meta { font-size: 11px; color: var(--text3); margin-top: 2px; }
      .history-empty { padding: 40px 20px; text-align: center; color: var(--text3); font-size: 12.5px; }
      .history-clear { font-size: 11px; color: var(--danger); background: none; border: none; cursor: pointer; font-family: var(--font); padding: 0; }
      .history-clear:hover { text-decoration: underline; }

      /* ── Profile switcher ── */
      .pf-switcher { display: flex; align-items: center; gap: 6px; padding: 8px 18px 0; flex-shrink: 0; }
      .pf-select { flex: 1; min-width: 0; height: 30px; border: 1.5px solid var(--border2); border-radius: 8px; background: var(--surface); color: var(--text); font: 500 12px/1 var(--font); padding: 0 6px; cursor: pointer; appearance: auto; }
      .pf-select:focus { outline: none; border-color: var(--accent-b); }
      .pf-sw-btn { width: 26px; height: 26px; border-radius: 7px; border: 1.5px solid var(--border2); background: var(--surface); color: var(--text2); font-size: 15px; line-height: 1; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: color 0.12s, border-color 0.12s, background 0.12s; }
      .pf-sw-btn:hover { color: var(--accent); border-color: var(--accent-b); background: var(--accent-l); }
      .pf-sw-btn.danger:hover { color: var(--danger); border-color: var(--danger); background: var(--danger-l); }

      .pf-extras-hdr { grid-column: 1 / -1; font-size: 10px; font-weight: 700; color: var(--text3); text-transform: uppercase; letter-spacing: 0.6px; padding-top: 8px; margin-top: 2px; border-top: 1px solid var(--border); }
      .pf-extras-empty { grid-column: 1 / -1; font-size: 11.5px; color: var(--text3); font-style: italic; }
      .pf-extra-row { display: flex; gap: 6px; align-items: center; }
      .pf-extra-row input { flex: 1; min-width: 0; font-family: var(--font); font-size: 12.5px; padding: 8px 10px; border: 1px solid transparent; border-radius: 8px; background: var(--surface2); color: var(--text); outline: none; transition: border-color 0.14s, box-shadow 0.14s; }
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

      /* ── Action panel ── */
      .action-panel { padding: 16px 16px 14px; background: var(--surface); border-bottom: 1px solid var(--border); flex-shrink: 0; }
      .ap-primary {
        width: 100%; height: 50px;
        background: linear-gradient(175deg, #1b67db 0%, #0b51c5 100%);
        color: #fff; border: none; border-radius: 14px; font: 600 14px/1 var(--font); cursor: pointer;
        display: flex; align-items: center; justify-content: center; gap: 8px;
        box-shadow: 0 1px 2px rgba(11,87,208,0.15), 0 4px 14px rgba(11,87,208,0.32), inset 0 1px 0 rgba(255,255,255,0.14);
        transition: opacity 0.14s, box-shadow 0.15s, transform 0.1s;
      }
      .ap-primary svg { width: 16px; height: 16px; stroke: #fff; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; fill: none; }
      .ap-primary:hover { opacity: 0.88; box-shadow: 0 2px 4px rgba(11,87,208,0.2), 0 8px 22px rgba(11,87,208,0.4), inset 0 1px 0 rgba(255,255,255,0.14); }
      .ap-primary:active { transform: scale(0.985); opacity: 0.95; }
      .ap-primary:focus-visible { outline: none; box-shadow: var(--focus); }
      .ap-primary:disabled { opacity: 0.42; cursor: not-allowed; transform: none; box-shadow: none; }
      .ap-chips { display: flex; gap: 8px; margin-top: 10px; }
      .ap-chip {
        flex: 1; height: 34px;
        border: 1.5px solid var(--accent-b); background: var(--accent-l);
        color: var(--accent); border-radius: 999px;
        font: 500 12px/1 var(--font); cursor: pointer;
        display: flex; align-items: center; justify-content: center; gap: 5px;
        transition: color 0.14s, border-color 0.14s, background 0.14s, box-shadow 0.14s;
        white-space: nowrap; flex-shrink: 0;
      }
      .ap-chip svg { width: 13px; height: 13px; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; fill: none; flex-shrink: 0; }
      .ap-chip:hover { border-color: var(--accent); box-shadow: 0 1px 6px rgba(11,87,208,0.18); }
      .ap-chip:active { transform: scale(0.97); }
      .ap-chip:focus-visible { outline: none; box-shadow: var(--focus); }
      .ap-chip.open { border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent-b); }
      .ap-field-list { overflow: hidden; max-height: 0; transition: max-height 0.28s cubic-bezier(0.4,0,0.2,1), padding-top 0.2s; }
      .ap-field-list.open { max-height: 220px; padding-top: 10px; }
      .ap-field-list .field-list { max-height: 210px; margin-top: 0; }
      .ap-mode-select-row { display: flex; flex-direction: column; gap: 6px; margin-top: 10px; }
      .ap-select {
        width: 100%;
        height: 34px;
        border: 1.5px solid var(--border2);
        border-radius: 10px;
        background: var(--surface2);
        color: var(--text2);
        font: 500 12px/1 var(--font);
        padding: 0 10px;
        outline: none;
      }
      .ap-select:focus-visible {
        border-color: var(--accent);
        box-shadow: var(--focus);
      }

      /* ── Toast ── */
      .toast { position: absolute; top: 66px; left: 50%; max-width: calc(100% - 32px); transform: translateX(-50%) translateY(-6px); background: var(--text); color: var(--surface); font-family: var(--font); font-size: 12px; padding: 7px 12px; border-radius: 8px; opacity: 0; transition: opacity 0.18s, transform 0.18s; pointer-events: none; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; z-index: 20; box-shadow: 0 10px 24px rgba(15,23,42,0.18); }
      .toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }

      /* ── Smart Fill Preview ── */
      .sf-preview { display: flex; flex-direction: column; gap: 5px; margin-top: 8px; }
      .sf-section-title { font-size: 10px; font-weight: 700; color: var(--text3); text-transform: uppercase; letter-spacing: 0.5px; padding: 8px 0 4px; border-top: 1px solid var(--border); margin-top: 4px; }
      .sf-section-title:first-child { border-top: none; margin-top: 0; padding-top: 0; }
      .sf-row { display: flex; align-items: center; gap: 7px; padding: 7px 9px; border: 1.5px solid var(--border); border-radius: 10px; background: var(--surface2); transition: border-color 0.14s, background 0.14s; }
      .sf-row:has(.sf-cb:checked) { border-color: var(--accent-b); background: var(--accent-l); }
      .sf-cb { width: 14px; height: 14px; accent-color: var(--accent); flex-shrink: 0; cursor: pointer; }
      .sf-label { font-size: 10.5px; color: var(--text3); font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 90px; flex-shrink: 0; }
      .sf-input { flex: 1; min-width: 0; font-size: 12.5px; font-family: var(--font); border: none; background: transparent; color: var(--text); outline: none; padding: 0; cursor: text; }
      .sf-input:focus { color: var(--accent); }
      .sf-input::placeholder { color: var(--text3); font-style: italic; font-size: 11.5px; }

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

      /* ── Preview row source colors ── */
      .sf-row[data-source="profile"]    { border-left: 3px solid #22c55e; }
      .sf-row[data-source="inferred"]   { border-left: 3px solid #3b82f6; }
      .sf-row[data-source="suggestion"] { border-left: 3px solid #f59e0b; }
      :host(.dark) .sf-row[data-source="profile"]    { border-left-color: #16a34a; }
      :host(.dark) .sf-row[data-source="inferred"]   { border-left-color: #2563eb; }
      :host(.dark) .sf-row[data-source="suggestion"] { border-left-color: #d97706; }

      /* ── Preview source summary chips ── */
      .preview-source-row { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 6px; }
      .psr-chip { display: inline-flex; align-items: center; gap: 3px; padding: 2px 8px; border-radius: 999px; font-size: 10.5px; font-weight: 600; border: 1px solid transparent; }
      .psr-profile    { background: #dcfce7; color: #15803d; border-color: #bbf7d0; }
      .psr-inferred   { background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; }
      .psr-suggestion { background: #fffbeb; color: #a16207; border-color: #fde68a; }
      :host(.dark) .psr-profile    { background: #052e16; color: #86efac; border-color: #166534; }
      :host(.dark) .psr-inferred   { background: #0f172a; color: #93c5fd; border-color: #1e40af; }
      :host(.dark) .psr-suggestion { background: #1c1400; color: #fde68a; border-color: #854d0e; }

      /* ── Guided progress strip ── */
      .guided-progress { margin-top: 10px; }
      .gp-bar-wrap { height: 4px; background: var(--border); border-radius: 999px; overflow: hidden; margin-bottom: 5px; }
      .gp-bar { height: 100%; background: linear-gradient(90deg, #1b67db, #22c55e); border-radius: 999px; transition: width 0.4s cubic-bezier(0.4,0,0.2,1); }
      .gp-label { font-size: 11px; color: var(--text2); font-weight: 500; }

      /* ── Auto-nav toggle ── */
      .ap-mode-row { display: flex; align-items: center; justify-content: space-between; margin-top: 10px; padding: 0 2px; }
      .ap-mode-label { font-size: 11.5px; color: var(--text2); font-weight: 500; }
      .ap-toggle { position: relative; display: inline-flex; align-items: center; width: 36px; height: 20px; flex-shrink: 0; cursor: pointer; }
      .ap-toggle input { opacity: 0; width: 0; height: 0; position: absolute; }
      .ap-toggle-track { position: absolute; inset: 0; border-radius: 999px; background: var(--border2); transition: background 0.18s; }
      .ap-toggle input:checked ~ .ap-toggle-track { background: var(--accent); }
      .ap-toggle-thumb { position: absolute; top: 3px; left: 3px; width: 14px; height: 14px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.22); transition: transform 0.18s; }
      .ap-toggle input:checked ~ .ap-toggle-thumb { transform: translateX(16px); }

      /* ── Guided question bubble ── */
      .guided-q { padding: 2px 0; }
      .gq-eyebrow { font-size: 10px; font-weight: 700; color: var(--accent); text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 7px; display: flex; align-items: center; gap: 5px; }
      .gq-eyebrow::before { content: ''; display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: var(--accent); flex-shrink: 0; }
      .gq-text { font-size: 13.5px; color: var(--text); font-weight: 500; line-height: 1.45; margin-bottom: 11px; }
      .gq-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 9px; }
      .gq-chip { padding: 6px 13px; border-radius: 999px; border: 1.5px solid var(--accent-b); background: var(--accent-l); color: var(--accent); font: 500 12px/1 var(--font); cursor: pointer; transition: background 0.12s, border-color 0.12s, color 0.12s; }
      .gq-chip:hover { background: var(--accent-b); border-color: var(--accent); }
      .gq-chip:active { transform: scale(0.96); }
      .gq-chip.gq-selected { background: var(--accent); color: #fff; border-color: var(--accent); cursor: default; }
      .gq-hint { font-size: 10.5px; color: var(--text3); line-height: 1.4; }



      /* ── Professional polish pass ── */
      .sidebar {
        width: 420px;
        background: var(--surface);
      }
      .sidebar::before { display: none; }
      .header {
        height: 66px;
        padding: 12px 14px 11px 16px;
        border-bottom-color: var(--border);
        box-shadow: none;
      }
      .logo-icon {
        width: 34px;
        height: 34px;
        border-radius: 9px;
        background: var(--surface2);
        border-color: var(--border);
      }
      .logo-name { font-size: 14.5px; font-weight: 700; }
      .logo-sub { font-size: 11px; }
      .icon-btn {
        width: 30px;
        height: 30px;
        border-radius: 8px;
      }
      .icon-btn:hover {
        background: var(--surface2);
        border-color: var(--border);
      }
      .action-panel {
        padding: 14px 16px 12px;
        background: var(--surface);
      }
      .ap-primary {
        height: 44px;
        border-radius: 9px;
        background: var(--accent);
        box-shadow: none;
        font-size: 13.5px;
      }
      .ap-primary:hover {
        opacity: 1;
        background: var(--accent-h);
        box-shadow: none;
      }
      .ap-chips { gap: 7px; margin-top: 9px; }
      .ap-chip {
        height: 32px;
        border-radius: 8px;
        border-color: var(--border);
        background: var(--surface);
        color: var(--text2);
        font-weight: 600;
      }
      .ap-chip:hover,
      .ap-chip.open {
        border-color: var(--accent-b);
        background: var(--accent-l);
        color: var(--accent);
        box-shadow: none;
      }
      .ap-mode-select-row { margin-top: 10px; }
      .ap-select {
        height: 34px;
        border-radius: 8px;
        background: var(--surface);
        border-color: var(--border);
      }
      .ap-mode-row {
        margin-top: 9px;
        padding: 8px 10px;
        border: 1px solid var(--border);
        border-radius: 8px;
        background: var(--bg);
      }
      .trust-row {
        display: flex;
        align-items: center;
        gap: 7px;
        margin-top: 10px;
        padding: 8px 10px;
        border-radius: 8px;
        background: var(--bg);
        color: var(--text3);
        font: 500 11px/1.35 var(--font);
      }
      .trust-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: var(--ok);
        box-shadow: 0 0 0 3px var(--ok-l);
        flex-shrink: 0;
      }
      .messages {
        padding: 16px;
        background: var(--bg);
        gap: 10px;
      }
      .bubble {
        border-radius: 10px;
        box-shadow: none;
      }
      .msg.ai .bubble { border-radius: 10px; }
      .msg.user .bubble {
        border-radius: 10px;
        background: var(--surface);
      }
      .input-area { padding: 11px 16px 12px; }
      .input-box {
        border-radius: 10px;
        background: var(--surface);
        border-color: var(--border);
      }
      .send-btn {
        border-radius: 10px;
        box-shadow: none;
      }
      .send-btn:hover { box-shadow: none; }
      .footer-note {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        flex-wrap: wrap;
        margin-top: 9px;
        text-align: center;
      }
      .footer-provider {
        color: var(--text2);
        font-weight: 700;
      }
      .footer-model {
        max-width: 210px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .footer-sep { color: var(--border2); }
      .sf-preview { gap: 0; border: 1px solid var(--border); border-radius: 10px; overflow: hidden; background: var(--surface); }
      .sf-row {
        border: none;
        border-top: 1px solid var(--border);
        border-radius: 0;
        background: var(--surface);
        padding: 9px 10px;
      }
      .sf-section-title + .sf-row,
      .sf-preview > .sf-row:first-child { border-top: none; }
      .sf-row:has(.sf-cb:checked) {
        border-color: var(--border);
        background: var(--bg);
      }
      .sf-label { max-width: 104px; font-size: 11px; }
      .source-badge {
        border: 1px solid var(--border);
        border-radius: 999px;
        padding: 2px 7px;
        font-size: 10px;
        font-weight: 700;
        line-height: 1.2;
        white-space: nowrap;
        flex-shrink: 0;
      }
      .source-badge.inferred {
        background: #eff6ff;
        border-color: #bfdbfe;
        color: #1d4ed8;
      }
      .source-badge.suggestion {
        background: var(--warn-l);
        border-color: #fde68a;
        color: var(--warn);
      }
      :host(.dark) .source-badge.inferred {
        background: #0f172a;
        border-color: #1e40af;
        color: #93c5fd;
      }
      .psr-chip {
        border-radius: 6px;
        padding: 3px 7px;
        font-size: 10px;
      }

      @media (max-width: 420px) {
        .trigger { right: 16px; bottom: 16px; }
        .sidebar { width: min(100vw, 380px); min-width: 0; }
        .header { padding-left: 12px; padding-right: 10px; gap: 8px; }
        .logo-icon { width: 28px; height: 28px; }
        .header-btns { gap: 2px; }
        .icon-btn { width: 28px; height: 28px; }
        .action-panel { padding-left: 14px; padding-right: 14px; }
        .messages, .profile-grid { padding-left: 14px; padding-right: 14px; }
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
            <div class="logo-text"><span class="logo-name">FormAssist</span><span class="logo-sub" id="fa-ctx-title"></span></div>
          </div>
          <div class="header-btns">
            <button class="icon-btn" id="fa-history-btn" title="Verlauf"><svg viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></button>
            <button class="icon-btn" id="fa-profile-btn" title="Profil"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" stroke-width="2"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg></button>
            <button class="icon-btn" id="fa-dark-btn" title="Dark Mode"><svg viewBox="0 0 24 24" id="fa-dark-icon"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg></button>
            <button class="icon-btn" id="fa-close"    title="Schließen"><svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
        </div>
        <div class="action-panel" id="fa-action-panel">
          <button class="ap-primary" id="fa-ap-agent" disabled>
            <svg viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            Formular ausfüllen
          </button>
          <div class="ap-chips">
            <button class="ap-chip" id="fa-ap-explain">
              <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
              Erklären
            </button>
            <button class="ap-chip" id="fa-ap-fields">
              <svg viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/><path d="M9 12h6M9 16h4"/></svg>
              <span id="fa-ap-field-count">0 Felder</span>
            </button>
          </div>
          <div class="ap-field-list" id="fa-ap-field-list">
            <div class="field-list" id="fa-ap-field-inner"></div>
          </div>
          <div class="ap-mode-select-row">
            <label class="ap-mode-label" for="fa-assistant-mode">Assistent-Modus</label>
            <select class="ap-select" id="fa-assistant-mode">
              <option value="context">Automatisch (empfohlen)</option>
              <option value="classic">Mit Vorschau</option>
            </select>
          </div>
          <div class="ap-mode-row">
            <span class="ap-mode-label">Automatisch weiterklicken</span>
            <label class="ap-toggle">
              <input type="checkbox" id="fa-auto-nav" checked>
              <span class="ap-toggle-track"></span>
              <span class="ap-toggle-thumb"></span>
            </label>
          </div>
          <div class="guided-progress" id="fa-guided-progress" style="display:none">
            <div class="gp-bar-wrap"><div class="gp-bar" id="fa-gp-bar"></div></div>
            <div class="gp-label" id="fa-gp-label"></div>
          </div>
          <div class="trust-row">
            <span class="trust-dot"></span>
            <span>Profil lokal gespeichert · KI nur bei Aktionen</span>
          </div>
        </div>
        <div class="messages" id="fa-messages">
          <div class="results-empty" id="fa-results-empty">Starte den Agenten oder stelle eine Frage unten.</div>
        </div>
        <div class="history-panel" id="fa-history-panel">
          <div class="profile-hdr">
            <span>Verlauf</span>
            <button class="history-clear" id="fa-history-clear">Alles löschen</button>
          </div>
          <div class="history-list" id="fa-history-list"></div>
        </div>
        <div class="profile-panel" id="fa-profile-panel">
          <div class="profile-hdr"><span>Mein Profil</span><span id="fa-pf-fill-count">Lokal gespeichert</span></div>
          <div class="pf-switcher">
            <select class="pf-select" id="fa-profile-select"></select>
            <button class="pf-sw-btn" id="fa-pf-new" title="Neues Profil">+</button>
            <button class="pf-sw-btn danger" id="fa-pf-del-profile" title="Profil löschen">×</button>
          </div>
          <div class="profile-grid" id="fa-profile-grid"></div>
          <div class="profile-actions">
            <button class="btn-primary" id="fa-pf-save">Speichern</button>
            <button id="fa-pf-fake">Fake-Daten</button>
            <button id="fa-pf-fill">Formular ausfüllen</button>
            <button class="btn-danger" id="fa-pf-clear">Löschen</button>
            <button class="btn-io" id="fa-pf-export">↓ Export</button>
            <button class="btn-io" id="fa-pf-import">↑ Import</button>
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
          <div class="footer-note" id="fa-footer-note"></div>
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

    const KBD_STYLE = 'font-family:var(--font);font-size:9px;background:var(--surface2);border:1px solid var(--border2);border-radius:4px;padding:1px 4px;color:var(--text3)';
    function updateFooterNote() {
      $('fa-footer-note').innerHTML = `<span class="footer-provider">${providerLabel()}</span><span class="footer-sep">·</span><span class="footer-model">${escapeHtml(_model)}</span><span class="footer-sep">·</span><kbd style="${KBD_STYLE}">Alt+Shift+F</kbd>`;
    }
    updateFooterNote();

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
    _onProviderFallback = () => showToast('Groq nicht erreichbar – OpenRouter als Backup');

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

    function saveActiveProfileToStore(cb) {
      const entry = getActiveEntry();
      entry.profile = { ...profile };
      entry.extras  = { ...extras };
      chrome.storage.local.set({ faProfiles: profiles, faProfile: profile, faExtras: extras }, cb);
    }

    function renderProfileSelect() {
      const sel = $('fa-profile-select');
      if (!sel) return;
      sel.innerHTML = '';
      profiles.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id; opt.textContent = p.name;
        if (p.id === activeProfileId) opt.selected = true;
        sel.appendChild(opt);
      });
      const delBtn = $('fa-pf-del-profile');
      if (delBtn) delBtn.disabled = profiles.length <= 1;
    }

    function switchProfile(id) {
      if (id === activeProfileId) return;
      saveActiveProfileToStore(() => {
        activeProfileId = id;
        const entry = getActiveEntry();
        // Swap profile + extras in-place
        Object.keys(profile).forEach(k => delete profile[k]);
        Object.assign(profile, entry.profile);
        Object.keys(extras).forEach(k => delete extras[k]);
        Object.assign(extras, entry.extras);
        chrome.storage.local.set({ faActiveProfileId: activeProfileId });
        loadProfileIntoInputs(profile);
        renderExtrasInProfile();
        updateProfileProgress();
        SYSTEM = buildSystemPrompt(ctx, profile, extras);
        showToast(`Profil „${entry.name}" geladen`);
      });
    }

    renderProfileSelect();

    $('fa-profile-select').addEventListener('change', e => switchProfile(e.target.value));

    $('fa-pf-new').addEventListener('click', () => {
      const name = prompt('Profilname:');
      if (!name?.trim()) return;
      const id = 'p_' + Date.now();
      profiles.push({ id, name: name.trim(), profile: {}, extras: {} });
      chrome.storage.local.set({ faProfiles: profiles });
      renderProfileSelect();
      switchProfile(id);
    });

    $('fa-pf-del-profile').addEventListener('click', () => {
      if (profiles.length <= 1) return;
      const entry = getActiveEntry();
      if (!confirm(`Profil „${entry.name}" löschen?`)) return;
      profiles = profiles.filter(p => p.id !== activeProfileId);
      activeProfileId = profiles[0].id;
      chrome.storage.local.set({ faProfiles: profiles, faActiveProfileId: activeProfileId });
      renderProfileSelect();
      switchProfile(activeProfileId);
    });

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
    let historyVisible = false;
    const historyPanel = shadow.getElementById('fa-history-panel');

    function showProfile() {
      if (historyVisible) hideHistory();
      profileVisible = true;
      renderExtrasInProfile();
      updateProfileProgress();
      messagesEl.style.display = 'none';
      $('fa-action-panel').style.display = 'none';
      profilePanel.classList.add('visible');
      $('fa-profile-btn').classList.add('active');
    }
    function hideProfile() {
      profileVisible = false;
      messagesEl.style.display = '';
      $('fa-action-panel').style.display = '';
      profilePanel.classList.remove('visible');
      $('fa-profile-btn').classList.remove('active');
    }

    function renderHistoryList() {
      const listEl = $('fa-history-list');
      if (!listEl) return;
      listEl.innerHTML = '';
      if (!faHistory.length) {
        listEl.innerHTML = '<div class="history-empty">Noch keine ausgefüllten Formulare. Starte den Agent, um den Verlauf zu befüllen.</div>';
        return;
      }
      [...faHistory].reverse().forEach(entry => {
        const div = document.createElement('div');
        div.className = 'history-entry';
        div.title = entry.url || '';
        div.innerHTML = `
          <div class="history-icon"><svg viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/><path d="M9 12h6M9 16h4"/></svg></div>
          <div class="history-info">
            <div class="history-domain">${escapeHtml(entry.title || entry.domain || '—')}</div>
            <div class="history-meta">${escapeHtml(entry.domain)} · ${entry.fieldCount} Felder · ${new Date(entry.ts).toLocaleDateString('de-DE', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit' })}</div>
          </div>`;
        if (entry.url) div.addEventListener('click', () => { window.location.href = entry.url; });
        listEl.appendChild(div);
      });
    }

    function showHistory() {
      if (profileVisible) hideProfile();
      historyVisible = true;
      renderHistoryList();
      messagesEl.style.display = 'none';
      $('fa-action-panel').style.display = 'none';
      historyPanel.classList.add('visible');
      $('fa-history-btn').classList.add('active');
    }
    function hideHistory() {
      historyVisible = false;
      messagesEl.style.display = '';
      $('fa-action-panel').style.display = '';
      historyPanel.classList.remove('visible');
      $('fa-history-btn').classList.remove('active');
    }

    function addHistoryEntry(entry) {
      faHistory.push(entry);
      if (faHistory.length > 30) faHistory = faHistory.slice(-30);
      chrome.storage.local.set({ faHistory });
    }

    $('fa-history-btn').addEventListener('click', () => { if (historyVisible) hideHistory(); else showHistory(); });
    $('fa-history-clear').addEventListener('click', () => {
      faHistory = [];
      chrome.storage.local.set({ faHistory });
      renderHistoryList();
      showToast('Verlauf gelöscht');
    });

    function updateProfileProgress() {
      const filled = PROFILE_FIELDS.filter(pf => {
        const inp = shadow.getElementById(`fa-pf-${pf.key}`);
        return inp && inp.value.trim();
      }).length;
      const pct = Math.round(filled / PROFILE_FIELDS.length * 100);
      const fill = $('fa-pf-progress');
      const label = $('fa-pf-fill-count');
      if (fill)  fill.style.width = pct + '%';
      if (label) label.textContent = `${filled}/${PROFILE_FIELDS.length} Felder`;
    }

    profileGrid.addEventListener('input', updateProfileProgress);

    $('fa-profile-btn').addEventListener('click', () => { if (profileVisible) hideProfile(); else showProfile(); });

    $('fa-pf-save').addEventListener('click', () => {
      const p = getProfileFromInputs();
      PROFILE_FIELDS.forEach(pf => { if (p[pf.key]) profile[pf.key] = p[pf.key]; else delete profile[pf.key]; });
      profileGrid.querySelectorAll('.pf-extra').forEach(div => {
        const key = div.dataset.extraKey;
        const val = div.querySelector('input')?.value.trim();
        if (key) { if (val) extras[key] = val; else delete extras[key]; }
      });
      saveActiveProfileToStore(() => {
        SYSTEM = buildSystemPrompt(ctx, profile, extras);
        showToast('Profil gespeichert');
        updateProfileProgress();
      });
    });

    $('fa-pf-fake').addEventListener('click', () => {
      Object.keys(profile).forEach(k => delete profile[k]);
      Object.assign(profile, FAKE_DATA);
      loadProfileIntoInputs(profile);
      SYSTEM = buildSystemPrompt(ctx, profile, extras);
      showToast('Fake-Daten geladen');
      updateProfileProgress();
    });

    $('fa-pf-fill').addEventListener('click', () => { hideProfile(); startAgent(); });

    $('fa-pf-clear').addEventListener('click', () => {
      PROFILE_FIELDS.forEach(pf => delete profile[pf.key]);
      loadProfileIntoInputs({});
      SYSTEM = buildSystemPrompt(ctx, profile, extras);
      saveActiveProfileToStore(() => showToast('Profil gelöscht'));
      updateProfileProgress();
    });

    $('fa-pf-export').addEventListener('click', () => {
      const data = { profile: { ...profile }, extras: { ...extras } };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = 'formassist-profil.json';
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
      showToast('Profil exportiert');
    });

    $('fa-pf-import').addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = '.json';
      input.addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
          try {
            const data = JSON.parse(ev.target.result);
            if (data.profile && typeof data.profile === 'object') {
              Object.keys(profile).forEach(k => delete profile[k]);
              Object.assign(profile, data.profile);
              if (data.extras && typeof data.extras === 'object') {
                Object.keys(extras).forEach(k => delete extras[k]);
                Object.assign(extras, data.extras);
              }
              chrome.storage.local.set({ faProfile: profile, faExtras: extras });
              loadProfileIntoInputs(profile);
              renderExtrasInProfile();
              updateProfileProgress();
              SYSTEM = buildSystemPrompt(ctx, profile, extras);
              showToast('Profil importiert ✓');
            } else { showToast('Ungültiges Format'); }
          } catch { showToast('Fehler beim Lesen der Datei'); }
        };
        reader.readAsText(file);
      });
      input.click();
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

    function open() {
      isOpen = true;
      if (isDocked) sidebar.classList.add('open');
      else          sidebar.style.display = 'flex';
      triggerBtn.style.opacity       = '0';
      triggerBtn.style.pointerEvents = 'none';
      setTimeout(() => inputEl.focus(), 320);
    }

    function close() {
      isOpen = false;
      if (isDocked) sidebar.classList.remove('open');
      else          sidebar.style.display = 'none';
      triggerBtn.style.opacity       = '';
      triggerBtn.style.pointerEvents = '';
    }

    triggerBtn.addEventListener('click', () => {
      if (isOpen) { close(); return; }
      open();
    });
    $('fa-close').addEventListener('click', close);
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && isOpen) {
        close();
        return;
      }
      if ((e.ctrlKey || e.altKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        if (isOpen) { close(); return; }
        open();
      }
    });

    let ctxSignature = null;

    function getContextSignature(c) {
      const counts = c.forms.map(f => f.allFields.length).join(',');
      const submits = c.forms.map(f => f.submitText || '').join('|');
      const labels = c.forms.flatMap(f => f.allFields.map(x => x.label)).join('|');
      return `${c.page.hostname}|${c.page.pathname}|${c.page.title}|${counts}|${submits}|${labels}`;
    }

    function updateActionPanel() {
      const hasFields = allFields.length > 0;
      const agentBtn  = $('fa-ap-agent');
      const countEl   = $('fa-ap-field-count');
      const emptyEl   = $('fa-results-empty');
      if (agentBtn) agentBtn.disabled = !hasFields;
      if (countEl) {
        const stepNote = stepInfo && stepInfo.isMultiStep ? ` · S.${stepInfo.current}/${stepInfo.total}` : '';
        countEl.textContent = hasFields ? `${allFields.length} Felder${stepNote}` : 'Kein Formular';
      }
      if (emptyEl) {
        const formIcon = `<svg viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/><path d="M9 12h6M9 16h4"/></svg>`;
        const eyeIcon  = `<svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
        const hostname = ctx && ctx.page && ctx.page.hostname ? ctx.page.hostname : '';
        if (hasFields) {
          const stepNote = stepInfo && stepInfo.isMultiStep ? ` · Seite ${stepInfo.current}/${stepInfo.total}` : '';
          emptyEl.innerHTML = `
            <div class="re-icon">${formIcon}</div>
            <div class="re-title">${allFields.length} Felder erkannt${stepNote}</div>
            ${hostname ? `<div class="re-sub">${hostname}</div>` : ''}
            <div class="re-hint">Starte den Agent zum automatischen Ausfüllen — oder stelle unten eine Frage.</div>`;
        } else {
          emptyEl.innerHTML = `
            <div class="re-icon">${eyeIcon}</div>
            <div class="re-title">Kein Formular erkannt</div>
            ${hostname ? `<div class="re-sub">${hostname}</div>` : ''}
            <div class="re-hint">Ich beobachte die Seite weiter.</div>`;
        }
      }
      renderActionFieldList();
    }

    function renderActionFieldList() {
      const listEl = $('fa-ap-field-inner');
      if (!listEl) return;
      listEl.innerHTML = '';
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
        listEl.appendChild(btn);
      });
      if (allFields.length > 15) {
        const more = document.createElement('div');
        more.style.cssText = 'font-size:11px;color:var(--text3);text-align:center;padding:4px 0';
        more.textContent = `+ ${allFields.length - 15} weitere Felder`;
        listEl.appendChild(more);
      }
    }

    function applyContext(freshCtx) {
      ctx = freshCtx;
      allFields = ctx.forms.flatMap(f => f.allFields);
      submitLabel = ctx.forms[0]?.submitText;
      ctxSignature = getContextSignature(ctx);
      stepInfo = getFormStepInfo();
      SYSTEM = buildSystemPrompt(ctx, profile, extras);
      $('fa-ctx-title').textContent = ctx.page.h1 || ctx.page.title || ctx.page.hostname;
      updateActionPanel();
    }

    function refreshContext(freshCtx) {
      const sig = getContextSignature(freshCtx);
      if (sig === ctxSignature) return;
      applyContext(freshCtx);
    }

    function getAssistantMode() {
      return normalizeAssistantMode($('fa-assistant-mode')?.value || _assistantMode);
    }

    function isContextualAssistantMode() {
      return getAssistantMode() !== 'classic';
    }

    function updateAssistantModeUi() {
      const select = $('fa-assistant-mode');
      if (select) select.value = normalizeAssistantMode(_assistantMode);
      const mode = getAssistantMode();
      if (mode === 'classic') {
        inputEl.placeholder = 'Frage zum Formular stellen…';
      } else if (mode === 'context') {
        inputEl.placeholder = 'Frage zum aktiven Feld stellen…';
      } else {
        inputEl.placeholder = 'Frage stellen… (nutzt Feldkontext)';
      }
    }

    applyContext(ctx);
    updateAssistantModeUi();

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

    function dismissEmpty() {
      $('fa-results-empty')?.remove();
    }

    function addMsg(role, html, chips, opts = {}) {
      dismissEmpty();
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
      dismissEmpty();
      const div = document.createElement('div');
      div.id = 'fa-typing'; div.className = 'typing-row';
      div.innerHTML = `<div class="typing-bubble"><div class="dot"></div></div>`;
      messagesEl.appendChild(div);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
    function removeTyping() { $('fa-typing')?.remove(); }

    // ═══════════════════════════════════════════════════════════════════════
    // AI
    // ═══════════════════════════════════════════════════════════════════════

    let history       = [];
    let activeFieldEl = null;

    function createStreamBubble() {
      const div = document.createElement('div');
      div.className = 'msg ai';
      const bubble = document.createElement('div');
      bubble.className = 'bubble';
      div.appendChild(bubble);
      messagesEl.appendChild(div);
      return { div, bubble };
    }

    function parseModelJsonArray(raw) {
      const text = String(raw || '').trim();
      if (!text) return [];

      function tryParse(s) {
        const candidates = [s, s.replace(/,\s*([\]}])/g, '$1')];
        for (const c of candidates) {
          try {
            const parsed = JSON.parse(c);
            if (Array.isArray(parsed)) return parsed;
            if (parsed && typeof parsed === 'object') {
              // Unwrap common wrappers: {actions:[...]}, {items:[...]}, {result:[...]}
              for (const key of ['actions', 'items', 'result', 'data', 'fields']) {
                if (Array.isArray(parsed[key])) return parsed[key];
              }
              return [parsed];
            }
          } catch {}
        }
        return null;
      }

      const direct = tryParse(text);
      if (direct) return direct;

      const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      if (fenced?.[1]) { const r = tryParse(fenced[1].trim()); if (r) return r; }

      // Find outermost array
      const arrMatch = text.match(/\[[\s\S]*\]/);
      if (arrMatch) { const r = tryParse(arrMatch[0]); if (r) return r; }

      // Last resort: extract individual objects that contain "action"
      const objects = [];
      const objRe = /\{[^{}]*"action"\s*:[^{}]*\}/g;
      for (const m of text.matchAll(objRe)) {
        try { const o = JSON.parse(m[0]); if (o) objects.push(o); } catch {}
      }
      if (objects.length) return objects;

      return [];
    }

    function toSafeText(value, maxLen = 280) {
      if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') return '';
      return String(value).replace(/\s+/g, ' ').trim().slice(0, maxLen);
    }

    function sanitizeAgentActions(parsed) {
      if (!Array.isArray(parsed)) return [];
      const allowedActions = new Set(['fill', 'select', 'check', 'click', 'submit', 'ask', 'done']);
      const allowedSources = new Set(['profile', 'inferred', 'suggestion']);
      const cleaned = [];
      for (const item of parsed) {
        if (!item || typeof item !== 'object') continue;
        const action = toSafeText(item.action, 24).toLowerCase();
        if (!allowedActions.has(action)) continue;
        if (action === 'done') { cleaned.push({ action: 'done' }); break; }
        if (action === 'ask') {
          const label    = toSafeText(item.label,    120);
          const question = toSafeText(item.question, 320);
          if (!label && !question) continue;
          const options = Array.isArray(item.options)
            ? item.options.map(o => toSafeText(o, 120)).filter(Boolean).slice(0, 4)
            : [];
          cleaned.push({ action: 'ask', label, question, options });
          continue;
        }
        const selector = toSafeText(item.selector, 320);
        if (!selector) continue;
        const label = toSafeText(item.label, 120);
        const normalized = { action, selector, label };
        const src = toSafeText(item.source, 24).toLowerCase();
        if (allowedSources.has(src)) normalized.source = src;
        const conf = Number(item.confidence);
        if (Number.isFinite(conf)) normalized.confidence = Math.max(0, Math.min(1, conf));
        if (action === 'fill' || action === 'select') {
          const value = toSafeText(item.value, 280);
          if (!value) continue;
          normalized.value = value;
        }
        if (action === 'click') normalized.isNavigation = !!item.isNavigation;
        cleaned.push(normalized);
        if (cleaned.length >= 150) break;
      }
      return cleaned;
    }

    async function askAI(userText, opts = {}) {
      const key = await loadKey();
      if (!key) { addMsg('ai', `API-Schlüssel für ${providerLabel()} nicht gefunden. Bitte in den FormAssist-Einstellungen hinterlegen.`); return ''; }
      const includeActive = opts.includeActive === false
        ? false
        : (opts.includeActive === true ? true : isContextualAssistantMode());
      const content = userText + (includeActive ? getActiveFieldContext(activeFieldEl) : '');
      history.push({ role: 'user', content });
      showTyping();

      const useStream = opts.render !== false;

      try {
        const reqBody = {
          model: _model, max_tokens: opts.maxTokens || 400, stream: useStream,
          messages: [{ role: 'system', content: SYSTEM }, ...history.slice(-6)],
        };

        // ── Non-streaming path ────────────────────────────────────────
        if (!useStream) {
          const data = await groqRequest(key, reqBody);
          removeTyping();
          const reply = data.choices?.[0]?.message?.content?.trim();
          if (reply) { history.push({ role: 'assistant', content: reply }); return reply; }
          addMsg('ai', 'Unbekannter Fehler.'); history.pop(); return '';
        }

        // ── Streaming path (via background port) ──────────────────────
        removeTyping();
        const { div: msgDiv, bubble: streamBubble } = createStreamBubble();
        let rawText = '';
        let buf = '';

        await groqStream(key, reqBody, chunk => {
          buf += chunk;
          const lines = buf.split('\n');
          buf = lines.pop() || '';
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const payload = line.slice(6).trim();
            if (payload === '[DONE]') return;
            try {
              const delta = JSON.parse(payload).choices?.[0]?.delta?.content;
              if (delta) {
                rawText += delta;
                streamBubble.innerHTML = renderMarkdown(rawText);
                messagesEl.scrollTop = messagesEl.scrollHeight;
              }
            } catch {}
          }
        });

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

      } catch (err) {
        removeTyping();
        addMsg('ai', 'Verbindungsfehler: ' + (err?.message || 'Bitte Internetverbindung prüfen.'));
        history.pop(); return '';
      }
    }

    async function send(text) {
      const t = (text !== undefined ? text : inputEl.value).trim();
      if (!t) return;
      inputEl.value = ''; inputEl.style.height = 'auto';
      addMsg('user', t);
      if (guidedAskState.active && agentState.guided) {
        await handleGuidedAnswer(t);
        return;
      }
      if (manualAssistState.pending && agentState.active) {
        await handleManualAssistAnswer(t);
        return;
      }
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

    // ═══════════════════════════════════════════════════════════════════════
    // AGENT MODE — vollautomatischer Formular-Agent
    // ═══════════════════════════════════════════════════════════════════════

    function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

    function normalizeForCompare(value) {
      return clean(String(value ?? '')).toLowerCase();
    }

    function getActionConfidence(action) {
      if (Number.isFinite(action?.confidence)) return action.confidence;
      if (!action?.source || action.source === 'profile') return 0.95;
      if (action.source === 'inferred') return 0.78;
      if (action.source === 'suggestion') return 0.52;
      return 0.6;
    }

    function getCurrentFieldValue(el) {
      if (!el) return '';
      const type = (el.type || '').toLowerCase();
      if (type === 'checkbox') return el.checked ? 'true' : 'false';
      if (type === 'radio') {
        const root = el.form || document;
        const checked = el.name ? root.querySelector(`input[type="radio"][name="${CSS.escape(el.name)}"]:checked`) : (el.checked ? el : null);
        if (!checked) return '';
        return clean(getLabel(checked) || checked.value || 'true');
      }
      if (el.tagName === 'SELECT') {
        const selected = Array.from(el.selectedOptions || []);
        if (!selected.length) return '';
        const first = selected[0];
        return clean(first.text || first.label || first.value);
      }
      return clean(el.value || '');
    }

    function isActionApplied(el, action, expectedValue = '') {
      if (!el) return false;
      const type = (el.type || '').toLowerCase();
      if (action === 'check') return !!el.checked;
      const expected = normalizeForCompare(expectedValue);
      if (!expected) return normalizeForCompare(getCurrentFieldValue(el)) !== '';

      if (type === 'checkbox') {
        const truthy = /^(ja|yes|true|1|x|ok|checked|ausgewählt)$/i.test(expectedValue);
        return el.checked === truthy;
      }

      const current = normalizeForCompare(getCurrentFieldValue(el));
      if (!current) return false;

      if (el.tagName === 'SELECT') {
        const rawValue = normalizeForCompare(el.value);
        return current === expected || rawValue === expected || current.includes(expected) || expected.includes(current);
      }

      if (type === 'date') {
        const expectedIso = parseDateToISO(expectedValue) || expected;
        const currentIso = parseDateToISO(current) || current;
        return currentIso === expectedIso;
      }

      return current === expected || current.includes(expected) || expected.includes(current);
    }

    function resolveActionElement(act) {
      if (!act) return null;
      let el = null;
      if (act.selector) {
        try { el = document.querySelector(act.selector); } catch {}
      }
      if (el) return el;
      const wanted = normalizeForCompare(act.label);
      if (!wanted) return null;
      return allFields.find(f => f?.el && isVisible(f.el) && normalizeForCompare(f.label) === wanted)?.el || null;
    }

    function applyDeterministicProfileFill() {
      const freshFields = extractRichContext().forms.flatMap(f => f.allFields);
      const seenRadioGroups = new Set();
      let filled = 0;

      for (const f of freshFields) {
        const el = f?.el;
        if (!el || !isVisible(el)) continue;
        const type = (el.type || '').toLowerCase();
        if (type === 'radio' && el.name) {
          if (seenRadioGroups.has(el.name)) continue;
          seenRadioGroups.add(el.name);
        }

        const pf = matchProfile(el, profile);
        if (!pf || !profile[pf.key]) continue;
        const ac = (el.getAttribute('autocomplete') || '').toLowerCase();
        const hasStrongAutocomplete = ac && ac !== 'on' && ac !== 'off' && pf.ac.some(a => ac.includes(a));
        const labelNorm = normalizeForCompare(getLabel(el));
        const pfLabelNorm = normalizeForCompare(pf.label);
        const hasStrongLabel = labelNorm === pfLabelNorm || labelNorm.startsWith(pfLabelNorm + ' ') || labelNorm.includes(` ${pfLabelNorm}`);
        if (!hasStrongAutocomplete && !hasStrongLabel) continue;

        const hasError = !!getError(el) || (el.willValidate && !el.checkValidity());
        const current = normalizeForCompare(getCurrentFieldValue(el));
        if (current && !hasError) continue;

        const value = profile[pf.key];
        fillField(el, value);
        if (isActionApplied(el, 'fill', value)) {
          filled++;
          agentState.filledFields.push({ label: f.label || pf.label, value, url: location.href });
        }
      }

      return filled;
    }

    function getUnresolvedFieldCandidates() {
      const freshCtx = extractRichContext();
      const unresolved = [];
      const seenRadioGroups = new Set();

      freshCtx.forms.forEach(form => {
        form.sections.forEach(sec => {
          sec.fields.forEach(f => {
            const el = f?.el;
            if (!el || !isVisible(el)) return;
            const type = (el.type || '').toLowerCase();

            if (type === 'radio' && el.name) {
              const key = `${form.index}:${el.name}`;
              if (seenRadioGroups.has(key)) return;
              seenRadioGroups.add(key);
            }

            const invalid = !!getError(el) || (el.willValidate && !el.checkValidity());
            let missing = false;

            if (type === 'radio' && el.name) {
              const root = el.form || document;
              const checked = root.querySelector(`input[type="radio"][name="${CSS.escape(el.name)}"]:checked`);
              missing = !!f.required && !checked;
            } else if (type === 'checkbox') {
              missing = !!f.required && !el.checked;
            } else if (el.tagName === 'SELECT') {
              missing = !!f.required && !clean(el.value);
            } else {
              missing = !!f.required && !clean(el.value || '');
            }

            if (!missing && !invalid) return;

            unresolved.push({
              selector: f.selector || getAgentSelector(el),
              label: f.label || getLabel(el) || 'dieses Feld',
              hint: f.hint || getHint(el) || '',
              options: Array.isArray(f.options) ? f.options : [],
              invalid,
            });
          });
        });
      });

      unresolved.sort((a, b) => Number(b.invalid) - Number(a.invalid));
      return unresolved;
    }

    function showManualAssistQuestion(next) {
      const div = document.createElement('div');
      div.className = 'msg ai';
      const bubble = document.createElement('div');
      bubble.className = 'bubble guided-q';

      const eyebrow = document.createElement('div');
      eyebrow.className = 'gq-eyebrow';
      eyebrow.textContent = next.label || 'Frage';

      const reason = next.invalid ? 'Das Feld ist noch ungültig.' : 'Ich brauche noch eine Pflichtangabe.';
      const text = document.createElement('div');
      text.className = 'gq-text';
      text.textContent = `${reason} Was soll ich bei "${next.label}" eintragen?`;
      bubble.append(eyebrow, text);

      if (next.options.length) {
        const chipsEl = document.createElement('div');
        chipsEl.className = 'gq-chips';
        next.options.slice(0, 10).forEach(opt => {
          const btn = document.createElement('button');
          btn.className = 'gq-chip';
          btn.textContent = opt;
          btn.addEventListener('click', () => {
            chipsEl.querySelectorAll('.gq-chip').forEach(chip => { chip.disabled = true; });
            btn.classList.add('gq-selected');
            handleManualAssistAnswer(opt);
          });
          chipsEl.appendChild(btn);
        });
        bubble.appendChild(chipsEl);
      }

      if (next.hint) {
        const hint = document.createElement('div');
        hint.className = 'gq-hint';
        hint.textContent = `Hinweis: ${next.hint}`;
        bubble.appendChild(hint);
      }

      const entryHint = document.createElement('div');
      entryHint.className = 'gq-hint';
      entryHint.textContent = 'Oder tippe unten deine Antwort ein.';
      bubble.appendChild(entryHint);

      div.appendChild(bubble);
      messagesEl.appendChild(div);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function askUserForMissingField() {
      const next = getUnresolvedFieldCandidates()[0];
      if (!next) return false;

      manualAssistState.pending = next;
      if (isContextualAssistantMode()) {
        showManualAssistQuestion(next);
      } else {
        const reason = next.invalid ? 'Das Feld ist noch ungültig.' : 'Ich brauche noch eine Pflichtangabe.';
        const optionText = next.options.length ? `\nOptionen: ${next.options.slice(0, 10).join(', ')}` : '';
        const hintText = next.hint ? `\nHinweis: ${next.hint}` : '';
        addMsg('ai', `${reason}\nBitte gib einen Wert fuer **${next.label}** ein.${optionText}${hintText}`, null, { copy: false });
      }

      const target = resolveActionElement(next);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        highlightField(target);
      }
      return true;
    }

    function clickNextButtonIfReady(formEl) {
      if (!formEl) return false;
      if (typeof formEl.checkValidity === 'function' && !formEl.checkValidity()) return false;
      const nextBtn = Array.from(formEl.querySelectorAll('button[type="submit"], input[type="submit"]')).find(btn => {
        if (btn.disabled) return false;
        const txt = getElementTextValue(btn).toLowerCase();
        return /(weiter|next|fortschritt|fortfahren|continue)/.test(txt);
      });
      if (!nextBtn) return false;
      const hidden = formEl.querySelector('input[name*="submit"][type="hidden"]');
      if (hidden) {
        const submitValue = nextBtn.getAttribute?.('data-submit-value') || nextBtn.value || hidden.getAttribute('value') || 'next';
        hidden.value = submitValue;
      }
      if (typeof formEl.requestSubmit === 'function') formEl.requestSubmit(nextBtn.form === formEl ? nextBtn : undefined);
      else nextBtn.click();
      return true;
    }

    async function handleManualAssistAnswer(answer) {
      const pending = manualAssistState.pending;
      if (!pending) return;

      const el = resolveActionElement(pending);
      if (!el) {
        manualAssistState.pending = null;
        if (!askUserForMissingField()) {
          addMsg('ai', 'Ich finde das Feld gerade nicht mehr. Bitte Agent neu starten.', null, { copy: false });
          agentState.active = false;
        }
        return;
      }

      fillField(el, answer);
      if (!isActionApplied(el, 'fill', answer)) {
        const optionText = pending.options?.length ? ` Mögliche Optionen: ${pending.options.slice(0, 6).join(', ')}.` : '';
        addMsg('ai', `Der Wert passt noch nicht zu **${pending.label}**.${optionText} Bitte antworte präziser.`, null, { copy: false });
        return;
      }

      agentState.filledFields.push({ label: pending.label, value: answer, url: location.href });
      manualAssistState.pending = null;
      await sleep(200);

      const formEl = el.form || stepInfo?.form || document.querySelector('form');
      if (clickNextButtonIfReady(formEl)) {
        try {
          chrome.storage.session?.set?.({
            faAgentResume: { filledFields: agentState.filledFields, startUrl: agentState.startUrl, guided: agentState.guided, autoNavigate: agentState.autoNavigate, sessionAnswers: agentState.sessionAnswers },
          });
        } catch {}
        addMsg('ai', 'Danke — ich mache weiter und klicke auf "Weiter".', null, { copy: false });
        return;
      }

      await runAgentStep();
    }

    function buildAgentPrompt() {
      const freshCtx = extractRichContext();
      const profileLines = PROFILE_FIELDS.filter(pf => profile[pf.key])
        .map(pf => `${pf.label}: "${profile[pf.key]}"`).join('\n');
      const extrasLines = Object.entries(extras)
        .map(([k, v]) => `${k}: "${v}"`).join('\n');
      const sessionAnswerLines = Object.entries(agentState.sessionAnswers || {})
        .map(([k, v]) => `${k}: "${v}"`).join('\n');
      const prevFillLines = (agentState.filledFields || [])
        .filter(f => f.url && f.url !== location.href)
        .slice(-24)
        .map(f => `${f.label}: "${f.value}"`)
        .join('\n');

      const fieldLines = freshCtx.forms.flatMap(form => {
        const rows = [];
        if (form.submitText) rows.push(`[submit] "${form.submitText}"`);
        form.sections.forEach(sec => {
          if (sec.title) rows.push(`# ${sec.title}`);
          sec.fields.forEach(f => {
            if (!f.el || !isVisible(f.el)) return;
            const el = f.el;
            const sel = f.selector || getAgentSelector(el);
            if (!sel) return;
            let line = `${sel} ${f.type}${f.required ? ' ✱' : ''} "${f.label}"`;
            if (f.options?.length) line += ` (${f.options.slice(0, 10).join(' | ')})`;
            if (f.hint) line += ` → ${f.hint}`;
            const curVal = el.tagName === 'SELECT'
              ? (el.selectedIndex > 0 ? clean(el.options[el.selectedIndex].text) : '')
              : clean(el.value || '');
            if (curVal) line += ` [Wert="${curVal}"]`;
            const err = getError(el);
            if (err) line += ` ❌"${err}"`;
            rows.push(line);
          });
        });
        // navigation buttons
        const navButtons = Array.from(form.formEl?.querySelectorAll?.('button, input[type="button"], input[type="submit"]') || [])
          .filter(btn => isVisible(btn) && !btn.disabled);
        navButtons.forEach(btn => {
          const sel = getAgentSelector(btn);
          const label = getElementTextValue(btn) || 'Button';
          if (sel && label) rows.push(`${sel} button "${label}"`);
        });
        return rows;
      }).join('\n');

      const today = new Date();
      const birthdate = profile.birthdate ? new Date(profile.birthdate) : null;
      const age = birthdate ? Math.floor((today - birthdate) / (365.25 * 24 * 3600 * 1000)) : null;

      return [
        'Du bist ein Formular-Ausfüll-Agent. Gib einen JSON-Array mit Aktionen zurück — kein Markdown, keine Erklärung.',
        '',
        'NUTZERPROFIL:',
        profileLines || '(leer)',
        extrasLines ? '\nEXTRAS:\n' + extrasLines : '',
        sessionAnswerLines ? '\nNUTZER-ANTWORTEN (direkt verwenden, nicht erneut fragen):\n' + sessionAnswerLines : '',
        prevFillLines ? '\nBEREITS AUSGEFÜLLT (vorherige Seiten — konsistent halten):\n' + prevFillLines : '',
        age != null ? `\n[Berechnetes Alter: ${age}]` : '',
        '',
        `SEITE: ${document.title} | ${location.hostname}`,
        '',
        'FELDER:',
        fieldLines || '(keine Felder erkannt)',
        '',
        'FORMAT (ein Objekt pro Feld):',
        '[{"action":"fill"|"select"|"check"|"click"|"submit"|"ask"|"done","selector":"[name=\\"x\\"]","value":"...","label":"...","source":"profile"|"inferred"|"suggestion","confidence":0.0-1.0,"isNavigation":true,"question":"...","options":["A","B"]}]',
        '',
        'action="ask": Wert nicht ableitbar → Frage an Nutzer. Felder: "label" (Feldname), "question" (verständliche Frage auf Deutsch), "options" (max. 4 wahrscheinliche Antworten als String-Array, leer wenn Freitext). Nur verwenden wenn wirklich kein Wert aus Profil/Kontext ableitbar ist.',
        '',
        'AUSFÜLL-STRATEGIE — versuche JEDES Feld zu befüllen:',
        '',
        'source="profile"  → Wert 1:1 aus Profil',
        '  Beispiele: Vorname→firstName, Nachname→lastName, Email, Telefon, IBAN, Straße, PLZ, Stadt, Land, Firma, Berufsbezeichnung',
        '',
        'source="inferred"  → logisch aus Profil herleitbar (IMMER versuchen!):',
        '  Anrede/Titel: "Herr"/"Frau" aus Vorname (gängige deutsche Namen)',
        '  Geschlecht: "männlich"/"weiblich"/"m"/"w" aus Vorname',
        '  Vollständiger Name: firstName + " " + lastName',
        '  Geburtsjahr/Monat/Tag: einzeln aus birthdate aufteilen',
        '  Alter: berechnet aus birthdate (heute=' + today.toISOString().split('T')[0] + ')',
        '  Altersgruppe: z.B. "25-34" aus Alter berechnen',
        '  Nationalität/Staatsangehörigkeit: aus nationality oder birthplace ableiten',
        '  Ländervorwahl: "+49" aus Deutschland, "+43" aus Österreich, "+41" aus Schweiz etc.',
        '  Land: aus nationality (z.B. "deutsch" → "Deutschland")',
        '  Bundesland: aus Stadt oder PLZ wenn eindeutig (München→Bayern, Berlin→Berlin etc.)',
        '  Hausnummer: aus street trennen falls Format "Straße HNr"',
        '  Straßenname: aus street trennen falls nötig',
        '  Berufsfeld/Branche: aus jobTitle ableiten',
        '  Akademischer Grad: aus jobTitle/Kontext',
        '  Sprache: aus nationality (deutsch→Deutsch)',
        '',
        'source="suggestion"  → kein Profilwert, aber aus Kontext sinnvoll:',
        '  Formularsprache/Land wenn offensichtlich (deutsches Formular → Deutschland, Deutsch)',
        '  Standardwerte die fast immer zutreffen (z.B. "Nein" bei unbekannten Ja/Nein-Feldern)',
        '',
        'PFLICHTREGELN:',
        '- Felder mit [Wert="..."] und ohne ❌ sind bereits korrekt ausgefüllt — überspringen',
        '- Felder mit ❌ haben einen Validierungsfehler — korrigierten Wert liefern',
        '- Alle anderen leeren Felder MÜSSEN befüllt werden wenn ein Wert ableitbar ist',
        '- SELECT: value muss exakt einer der angegebenen Optionen entsprechen — wähle die am besten passende',
        '- isNavigation:true für alle Weiter/Nächste/Fortfahren-Buttons',
        '- action="submit" NUR für die finale Abgabe des Formulars',
        '- confidence angeben: 0.0 (sehr unsicher) bis 1.0 (sehr sicher)',
        '- Felder ohne jeden möglichen Wert weglassen',
        '',
        agentState.lastFailures?.length
          ? 'LETZTE FEHLSCHLÄGE:\n' + agentState.lastFailures.map(f => `- ${f.label || f.selector}: ${f.reason || 'nicht angewendet'}`).join('\n')
          : '',
      ].join('\n');
    }

    let agentState = { active: false, guided: false, autoNavigate: true, sessionAnswers: {}, filledFields: [], startUrl: '', lastFailures: [] };
    let guidedAskState = { active: false, queue: [], navAction: null };
    let manualAssistState = { pending: null };
    let agentStatusBubble = null;

    async function runFieldByFieldAgent() {
      const key = await loadKey();
      if (!key) {
        addMsg('ai', `API-Schlüssel für ${providerLabel()} fehlt. Bitte in den FormAssist-Einstellungen hinterlegen.`);
        agentState.active = false;
        return;
      }

      const freshCtx = extractRichContext();
      const seenRadioGroups = new Set();
      const fields = [];

      for (const form of freshCtx.forms) {
        for (const sec of form.sections) {
          for (const f of sec.fields) {
            const el = f?.el;
            if (!el || !isVisible(el)) continue;
            const type = (el.type || '').toLowerCase();
            if (SKIP_TYPES.has(type)) continue;
            if (type === 'radio' && el.name) {
              const rk = `${form.index}:${el.name}`;
              if (seenRadioGroups.has(rk)) continue;
              seenRadioGroups.add(rk);
            }
            const curVal = getCurrentFieldValue(el);
            const hasError = !!getError(el) || (el.willValidate && !el.checkValidity());
            if (curVal && !hasError) continue;
            fields.push({
              el,
              selector: f.selector || getAgentSelector(el),
              label: f.label || getLabel(el) || 'Feld',
              type: f.type || type || 'text',
              options: Array.isArray(f.options) ? f.options : [],
              hint: f.hint || '',
              required: !!f.required,
            });
          }
        }
      }

      // Detect navigation / submit button
      let navAction = null;
      for (const form of freshCtx.forms) {
        const btns = Array.from(form.formEl?.querySelectorAll?.('button, input[type="button"], input[type="submit"]') || [])
          .filter(btn => isVisible(btn) && !btn.disabled);
        for (const btn of btns) {
          const lbl = getElementTextValue(btn);
          if (!lbl) continue;
          const isSubmit = /(absenden|senden|submit|abschicken|fertig stellen|fertigstellen)/i.test(lbl);
          const isNext   = /(weiter|next|fortfahren|continue|nächste|naechste)/i.test(lbl);
          if (isSubmit || isNext) {
            navAction = { action: isSubmit ? 'submit' : 'click', selector: getAgentSelector(btn), label: lbl, isNavigation: true };
            break;
          }
        }
        if (navAction) break;
      }

      // Shared context block sent with every AI call
      const profileLines = PROFILE_FIELDS.filter(pf => profile[pf.key])
        .map(pf => `${pf.label}: "${profile[pf.key]}"`).join('\n');
      const extrasLines = Object.entries(extras).map(([k, v]) => `${k}: "${v}"`).join('\n');
      const sessionLines = Object.entries(agentState.sessionAnswers || {}).map(([k, v]) => `${k}: "${v}"`).join('\n');
      const prevLines = (agentState.filledFields || [])
        .filter(f => f.url && f.url !== location.href).slice(-24)
        .map(f => `${f.label}: "${f.value}"`).join('\n');
      const today = new Date();
      const birthdate = profile.birthdate ? new Date(profile.birthdate) : null;
      const age = birthdate ? Math.floor((today - birthdate) / (365.25 * 24 * 3600 * 1000)) : null;

      const contextBlock = [
        profileLines    ? 'NUTZERPROFIL:\n' + profileLines : '',
        extrasLines     ? 'EXTRAS (gelernte Felder):\n' + extrasLines : '',
        sessionLines    ? 'NUTZER-ANTWORTEN (immer verwenden, nicht erneut fragen):\n' + sessionLines : '',
        prevLines       ? 'BEREITS AUSGEFÜLLT (vorherige Seiten):\n' + prevLines : '',
        age != null     ? `Alter: ${age}` : '',
      ].filter(Boolean).join('\n\n');

      if (fields.length === 0) {
        // No unfilled fields — handle navigation directly
        if (navAction) {
          updateGuidedProgress('Weiterklicken …');
          await handleGuidedNavigation(navAction);
        } else {
          updateGuidedProgress('Fertig ✓');
          addMsg('ai', '✅ Alle Felder ausgefüllt.', null, { copy: false });
          agentState.active = false;
        }
        return;
      }

      agentStatusBubble = createAgentBubble();
      let filled = 0;
      const asks = [];

      for (const f of fields) {
        if (!agentState.active) break;

        // Check session answers and extras for exact label match first (no AI call needed)
        const labelNorm = normalizeForCompare(f.label);
        let directValue = null;
        for (const [k, v] of Object.entries(agentState.sessionAnswers || {})) {
          if (normalizeForCompare(k) === labelNorm && v) { directValue = v; break; }
        }
        if (directValue === null) {
          for (const [k, v] of Object.entries(extras)) {
            if (normalizeForCompare(k) === labelNorm && v) { directValue = v; break; }
          }
        }

        if (directValue !== null) {
          fillField(f.el, directValue);
          if (isActionApplied(f.el, 'fill', directValue)) {
            appendAgentRow('✓', f.label, directValue);
            agentState.filledFields.push({ label: f.label, value: directValue, url: location.href });
            filled++;
          } else {
            appendAgentRow('✗', f.label, 'nicht angewendet');
          }
          await sleep(40);
          continue;
        }

        // Ask AI for this single field
        try {
          const optStr  = f.options.length ? `\nOptionen: ${f.options.slice(0, 12).join(' | ')}` : '';
          const hintStr = f.hint ? `\nHinweis: ${f.hint}` : '';
          const instrStr = f.options.length
            ? 'Antworte NUR mit einer der Optionen EXAKT wie angegeben, oder "?" wenn keine passt.'
            : 'Antworte NUR mit dem Wert (max. eine kurze Zeile), oder "?" wenn wirklich kein Wert ableitbar ist.';

          const prompt = [
            contextBlock,
            '',
            `FORMULARFELD: "${f.label}" (${f.type})${f.required ? ' [Pflichtfeld]' : ''}${optStr}${hintStr}`,
            '',
            instrStr,
          ].join('\n');

          const data = await groqRequest(key, {
            model: _model,
            max_tokens: 80,
            messages: [{ role: 'user', content: prompt }],
          });

          const rawVal = String(data?.choices?.[0]?.message?.content || '').trim();

          if (!rawVal || rawVal === '?' || /^unbekannt$/i.test(rawVal)) {
            asks.push({
              action: 'ask',
              label: f.label,
              question: `Was soll ich bei "${f.label}" eintragen?`,
              options: f.options.slice(0, 4),
              selector: f.selector,
            });
          } else {
            const value = rawVal.split('\n')[0].replace(/^["']|["']$/g, '').trim().slice(0, 200);
            fillField(f.el, value);
            if (isActionApplied(f.el, 'fill', value)) {
              appendAgentRow('✓', f.label, value);
              agentState.filledFields.push({ label: f.label, value, url: location.href });
              filled++;
            } else {
              appendAgentRow('✗', f.label, 'nicht angewendet');
            }
          }
        } catch (err) {
          appendAgentRow('✗', f.label, `Fehler: ${(err.message || '').slice(0, 40)}`);
        }

        await sleep(50);
      }

      finalizeAgentBubble(filled);
      learnAgentFields();
      updateGuidedProgress();

      if (!agentState.active) return;

      if (asks.length) {
        updateGuidedProgress(`${asks.length} Rückfrage${asks.length > 1 ? 'n' : ''} …`);
        guidedAskState.active   = true;
        guidedAskState.queue    = [...asks];
        guidedAskState.navAction = navAction;
        showNextGuidedQuestion();
      } else if (navAction) {
        updateGuidedProgress('Weiterklicken …');
        await handleGuidedNavigation(navAction);
      } else {
        updateGuidedProgress('Fertig ✓');
        setTimeout(() => { const w = $('fa-guided-progress'); if (w) w.style.display = 'none'; }, 3000);
        addMsg('ai', '✅ Formular vollständig ausgefüllt.', null, { copy: false });
        agentState.active = false;
      }
    }

    function startAgent() {
      if (profileVisible) hideProfile();
      open();
      const autoNav = $('fa-auto-nav')?.checked !== false;
      const mode = getAssistantMode();
      const guided = mode !== 'classic';
      agentState = { active: true, guided, autoNavigate: autoNav, sessionAnswers: {}, filledFields: [], startUrl: location.href, correctionRound: 0, lastFailures: [] };
      guidedAskState = { active: false, queue: [], navAction: null };
      manualAssistState.pending = null;
      if (guided) {
        const gpWrap = $('fa-guided-progress'); const gpBar = $('fa-gp-bar'); const gpLabel = $('fa-gp-label');
        if (gpWrap) gpWrap.style.display = 'block';
        if (gpBar)  gpBar.style.width = '0%';
        if (gpLabel) gpLabel.textContent = 'Analysiere…';
      }
      addMsg('user', '⚡ Formular ausfüllen');
      if (!guided) {
        addMsg('ai', 'Klassischer Modus aktiv: Ich zeige zuerst eine Vorschau und führe danach aus.', null, { copy: false });
      }
      const prefilled = applyDeterministicProfileFill();
      if (prefilled > 0) {
        addMsg('ai', `Direkt aus Profil: ${prefilled} Feld${prefilled !== 1 ? 'er' : ''} ausgefüllt.`, null, { copy: false });
      }
      if (guided) {
        runFieldByFieldAgent();
      } else {
        runAgentStep();
      }
    }

    function parseSSEText(chunk) {
      let text = '';
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;
        try { text += JSON.parse(data)?.choices?.[0]?.delta?.content || ''; } catch {}
      }
      return text;
    }

    async function runAgentStep(retry = false) {
      const key = await loadKey();
      if (!key) { addMsg('ai', `API-Schlüssel für ${providerLabel()} fehlt. Bitte in den FormAssist-Einstellungen hinterlegen.`); agentState.active = false; return; }
      showTyping();
      const prompt = buildAgentPrompt();
      const messages = retry
        ? [{ role: 'user', content: prompt },
           { role: 'assistant', content: 'Entschuldigung, ich habe die Ausgabe nicht korrekt formatiert.' },
           { role: 'user', content: 'Antworte NUR mit dem JSON-Array, ohne Erklärung, ohne Markdown.' }]
        : [{ role: 'user', content: prompt }];
      try {
        let raw = '';
        await groqStream(key, { model: _model, max_tokens: 2048, stream: true, messages },
          chunk => { raw += parseSSEText(chunk); });
        removeTyping();
        raw = raw.trim();
        const actions = sanitizeAgentActions(parseModelJsonArray(raw));
        if (!Array.isArray(actions) || !actions.length) {
          console.warn('[FormAssist] Agent parse failed. raw response:', raw);
          if (!retry) { await runAgentStep(true); return; }
          if (askUserForMissingField()) { agentState.active = true; return; }
          const preview = raw ? `„${raw.slice(0, 120).replace(/\n/g, ' ')}…"` : '(leer)';
          addMsg('ai', `KI-Antwort konnte nicht verarbeitet werden. Modell-Output: ${preview}`, null, { copy: false });
          agentState.active = false; return;
        }
        if (agentState.guided) {
          runGuidedStep(actions);
        } else {
          showAgentPreview(actions);
        }
      } catch (err) {
        removeTyping();
        addMsg('ai', `Agent-Fehler: ${err?.message || 'Verbindungsproblem'}`);
        agentState.active = false;
      }
    }

    function showAgentPreview(actions) {
      dismissEmpty();
      const fillTypes = new Set(['fill', 'select', 'check']);
      const fillActions = actions.filter(a => fillTypes.has(a.action));
      const otherActions = actions.filter(a => !fillTypes.has(a.action));

      if (!fillActions.length) { executeAgentActions(actions); return; }

      const div = document.createElement('div');
      div.className = 'msg ai';
      const bubble = document.createElement('div');
      bubble.className = 'bubble';

      const hdr = document.createElement('div');
      hdr.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;';
      const title = document.createElement('strong');
      title.textContent = `Agent-Vorschau — ${fillActions.length} Feld${fillActions.length !== 1 ? 'er' : ''}`;
      const selectAllBtn = document.createElement('button');
      selectAllBtn.className = 'agent-select-all';
      selectAllBtn.textContent = 'Alle ab-/auswählen';
      hdr.append(title, selectAllBtn);

      const profileCount    = fillActions.filter(a => !a.source || a.source === 'profile').length;
      const inferredCount   = fillActions.filter(a => a.source === 'inferred').length;
      const suggestionCount = fillActions.filter(a => a.source === 'suggestion').length;
      const sourceRow = document.createElement('div');
      sourceRow.className = 'preview-source-row';
      if (profileCount)    sourceRow.innerHTML += `<span class="psr-chip psr-profile">● ${profileCount} aus Profil</span>`;
      if (inferredCount)   sourceRow.innerHTML += `<span class="psr-chip psr-inferred">● ${inferredCount} abgeleitet</span>`;
      if (suggestionCount) sourceRow.innerHTML += `<span class="psr-chip psr-suggestion">● ${suggestionCount} Vorschlag${suggestionCount > 1 ? 'e' : ''}</span>`;

      const note = document.createElement('div');
      note.className = 'review-note';
      note.style.marginBottom = '8px';
      note.textContent = 'Werte prüfen und anpassen — dann Ausführen.';

      const preview = document.createElement('div');
      preview.className = 'sf-preview';
      const rows = [];

      fillActions.forEach(action => {
        const row = document.createElement('div');
        row.className = 'sf-row';
        row.dataset.source = action.source || 'profile';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.className = 'sf-cb';
        const confidence = getActionConfidence(action);
        cb.checked = action.source === 'suggestion'
          ? confidence >= AGENT_AUTO_SELECT_CONFIDENCE
          : confidence >= 0.45;

        const lbl = document.createElement('span');
        lbl.className = 'sf-label';
        lbl.textContent = action.label || action.selector || '?';
        lbl.title = `${lbl.textContent} · Confidence ${Math.round(confidence * 100)}%`;

        const inp = document.createElement('input');
        inp.type = 'text';
        inp.className = 'sf-input';
        inp.value = action.value != null ? String(action.value) : '';
        inp.placeholder = 'Wert…';
        inp.addEventListener('input', () => { cb.checked = !!inp.value.trim(); });
        inp.addEventListener('click', e => e.stopPropagation());
        row.addEventListener('click', e => { if (e.target.tagName !== 'INPUT') cb.checked = !cb.checked; });

        if (action.source === 'inferred' || action.source === 'suggestion') {
          const badge = document.createElement('span');
          if (action.source === 'inferred') {
            badge.textContent = 'Abgeleitet';
            badge.className = 'source-badge inferred';
          } else {
            badge.textContent = 'Vorschlag';
            badge.className = 'source-badge suggestion';
          }
          row.append(cb, lbl, inp, badge);
        } else {
          row.append(cb, lbl, inp);
        }
        preview.appendChild(row);
        rows.push({ cb, inp, action });
      });

      if (otherActions.length) {
        const sec = document.createElement('div');
        sec.className = 'sf-section-title';
        sec.textContent = 'Weitere Aktionen';
        preview.appendChild(sec);
        otherActions.forEach(action => {
          const row = document.createElement('div');
          row.className = 'sf-row';
          row.style.cssText = 'opacity:0.65;pointer-events:none;';
          const lbl = document.createElement('span');
          lbl.style.fontSize = '12px';
          const typeLabel = action.action === 'submit' ? '⚠ Absenden'
            : action.isNavigation ? '→ Weiter'
            : action.action === 'done' ? '✓ Fertig'
            : '• ' + action.action;
          lbl.textContent = typeLabel + (action.selector ? ` (${action.selector})` : '');
          row.appendChild(lbl);
          preview.appendChild(row);
        });
      }

      let allChecked = true;
      selectAllBtn.addEventListener('click', () => {
        allChecked = !allChecked;
        rows.forEach(({ cb }) => { cb.checked = allChecked; });
      });

      const actionsEl = document.createElement('div');
      actionsEl.className = 'agent-actions';
      actionsEl.style.marginTop = '10px';
      const confirmBtn = document.createElement('button');
      confirmBtn.className = 'agent-confirm';
      confirmBtn.textContent = 'Ausführen';
      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'agent-cancel';
      cancelBtn.textContent = 'Abbrechen';

      confirmBtn.addEventListener('click', () => {
        confirmBtn.disabled = cancelBtn.disabled = true;
        rows.forEach(({ cb, inp, action }) => {
          if (cb.checked) action.value = inp.value.trim() || action.value;
        });
        const finalActions = [...rows.filter(r => r.cb.checked).map(r => r.action), ...otherActions];
        actionsEl.innerHTML = '';
        executeAgentActions(finalActions);
      });

      cancelBtn.addEventListener('click', () => {
        agentState.active = false;
        manualAssistState.pending = null;
        bubble.style.opacity = '0.55';
        actionsEl.innerHTML = '<span class="review-note">Abgebrochen.</span>';
      });

      actionsEl.append(confirmBtn, cancelBtn);
      bubble.append(hdr, sourceRow, note, preview, actionsEl);
      div.appendChild(bubble);
      messagesEl.appendChild(div);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // GUIDED MODE — autonomous fill + ask-when-stuck
    // ═══════════════════════════════════════════════════════════════════════

    function updateGuidedProgress(statusText) {
      const wrap  = $('fa-guided-progress');
      const bar   = $('fa-gp-bar');
      const label = $('fa-gp-label');
      if (!wrap) return;
      if (!agentState.guided || !agentState.active) {
        wrap.style.display = 'none';
        return;
      }
      wrap.style.display = 'block';
      const totalFields = allFields.length || 1;
      const filled = agentState.filledFields.filter(f => f.url === location.href).length;
      const pct = Math.min(100, Math.round(filled / totalFields * 100));
      if (bar) bar.style.width = pct + '%';
      if (label) {
        const stepNote = stepInfo?.isMultiStep ? ` · Schritt ${stepInfo.current}/${stepInfo.total}` : '';
        label.textContent = statusText || `${agentState.filledFields.length} Felder ausgefüllt${stepNote}`;
      }
    }

    async function runGuidedStep(actions) {
      dismissEmpty();
      const fillActions  = actions.filter(a => ['fill','select','check'].includes(a.action));
      const askActions   = actions.filter(a => a.action === 'ask');
      const clickActions = actions.filter(a => a.action === 'click' && !a.isNavigation);
      const navActions  = actions.filter(a => a.isNavigation || a.action === 'submit');
      const isDone      = actions.some(a => a.action === 'done');

      // Execute fill + non-nav clicks immediately
      if (fillActions.length || clickActions.length) {
        await executeGuidedFillActions([...fillActions, ...clickActions]);
      }

      if (isDone && !askActions.length && !navActions.length) {
        updateGuidedProgress('Fertig ✓');
        setTimeout(() => { const w = $('fa-guided-progress'); if (w) w.style.display = 'none'; }, 3000);
        addMsg('ai', '✅ Formular vollständig ausgefüllt.', null, { copy: false });
        agentState.active = false;
        learnAgentFields();
        return;
      }

      if (askActions.length) {
        updateGuidedProgress(`${askActions.length} Rückfrage${askActions.length > 1 ? 'n' : ''} …`);
        guidedAskState.active   = true;
        guidedAskState.queue    = [...askActions];
        guidedAskState.navAction = navActions[0] || null;
        showNextGuidedQuestion();
      } else if (navActions.length) {
        updateGuidedProgress('Weiterklicken …');
        await handleGuidedNavigation(navActions[0]);
      } else if (!fillActions.length && !clickActions.length) {
        if (askUserForMissingField()) { agentState.active = true; } else { agentState.active = false; updateGuidedProgress('Fertig'); }
      }
    }

    async function executeGuidedFillActions(fillActions) {
      agentStatusBubble = createAgentBubble();
      let filled = 0;
      const failed = [];
      for (const act of fillActions) {
        if (!agentState.active) break;
        const el = resolveActionElement(act);
        if ((act.action === 'fill' || act.action === 'select') && el) {
          fillField(el, act.value || '');
          if (isActionApplied(el, act.action, act.value || '')) {
            appendAgentRow('✓', act.label || act.selector, act.value);
            agentState.filledFields.push({ label: act.label, value: act.value, url: location.href });
            filled++;
          } else {
            appendAgentRow('✗', act.label || act.selector, 'nicht angewendet');
            failed.push(act);
          }
          await sleep(80);
        } else if (act.action === 'check' && el) {
          if (!el.checked) { el.click(); el.dispatchEvent(new Event('change', { bubbles: true })); }
          appendAgentRow('✓', act.label || act.selector, '');
          agentState.filledFields.push({ label: act.label, value: act.value, url: location.href });
          filled++;
          await sleep(80);
        } else if (act.action === 'click' && el) {
          el.click();
          appendAgentRow('→', act.label || act.selector, '');
          await sleep(300);
        } else if (el === null && act.selector) {
          appendAgentRow('✗', act.label || act.selector, 'nicht gefunden');
          failed.push(act);
        }
      }
      finalizeAgentBubble(filled);
      if (failed.length) agentState.lastFailures = failed.map(a => ({ selector: a.selector, label: a.label, reason: 'nicht angewendet' }));
      learnAgentFields();
      updateGuidedProgress();
    }

    function showNextGuidedQuestion() {
      if (!guidedAskState.queue.length) {
        guidedAskState.active = false;
        if (guidedAskState.navAction) {
          addMsg('ai', 'Danke! Ich mache weiter…', null, { copy: false });
          handleGuidedNavigation(guidedAskState.navAction);
        } else {
          updateGuidedProgress('Fertig ✓');
          setTimeout(() => { const w = $('fa-guided-progress'); if (w) w.style.display = 'none'; }, 3000);
          addMsg('ai', '✅ Formular vollständig ausgefüllt.', null, { copy: false });
          agentState.active = false;
        }
        return;
      }
      showGuidedQuestion(guidedAskState.queue[0]);
    }

    function showGuidedQuestion(ask) {
      const div = document.createElement('div');
      div.className = 'msg ai';
      const bubble = document.createElement('div');
      bubble.className = 'bubble guided-q';

      const eyebrow = document.createElement('div');
      eyebrow.className = 'gq-eyebrow';
      eyebrow.textContent = ask.label || 'Frage';

      const text = document.createElement('div');
      text.className = 'gq-text';
      text.textContent = ask.question || `Was soll ich in "${ask.label}" eintragen?`;

      bubble.append(eyebrow, text);

      const options = Array.isArray(ask.options) ? ask.options.filter(Boolean) : [];
      if (options.length) {
        const chipsEl = document.createElement('div');
        chipsEl.className = 'gq-chips';
        options.forEach(opt => {
          const btn = document.createElement('button');
          btn.className = 'gq-chip';
          btn.textContent = opt;
          btn.addEventListener('click', () => {
            btn.classList.add('gq-selected');
            chipsEl.querySelectorAll('.gq-chip:not(.gq-selected)').forEach(b => b.disabled = true);
            handleGuidedAnswer(opt);
          });
          chipsEl.appendChild(btn);
        });
        const hint = document.createElement('div');
        hint.className = 'gq-hint';
        hint.textContent = 'oder tippe unten deine Antwort';
        bubble.append(chipsEl, hint);
      } else {
        const hint = document.createElement('div');
        hint.className = 'gq-hint';
        hint.textContent = 'Tippe deine Antwort unten';
        bubble.appendChild(hint);
      }

      div.appendChild(bubble);
      messagesEl.appendChild(div);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    async function handleGuidedAnswer(text) {
      const ask = guidedAskState.queue.shift();
      if (!ask) return;

      agentState.sessionAnswers[ask.label] = text;

      // Field-by-field: fill the stored element directly
      if (ask.selector) {
        const el = resolveActionElement(ask);
        if (el) {
          fillField(el, text);
          agentState.filledFields.push({ label: ask.label, value: text, url: location.href });
        }
      }

      await sleep(150);
      showNextGuidedQuestion();
    }

    async function handleGuidedNavigation(navAction) {
      if (!navAction) return;

      if (navAction.action === 'submit') {
        finalizeAgentBubble(agentState.filledFields.length);
        learnAgentFields();
        const ok = await agentAskSubmit(navAction.label);
        if (ok) {
          const el = resolveActionElement(navAction);
          if (el) { const formEl = el.form || el.closest('form'); if (formEl) approvedSubmits.add(formEl); el.click(); }
        } else {
          addMsg('ai', 'Absenden abgebrochen.', null, { copy: false });
        }
        agentState.active = false;
        return;
      }

      const resumeData = {
        filledFields: agentState.filledFields,
        startUrl: agentState.startUrl,
        guided: true,
        autoNavigate: agentState.autoNavigate,
        sessionAnswers: agentState.sessionAnswers,
      };

      if (agentState.autoNavigate) {
        const el = resolveActionElement(navAction);
        if (!el) { addMsg('ai', 'Weiter-Button nicht gefunden. Bitte manuell klicken.', null, { copy: false }); agentState.active = false; return; }
        addMsg('ai', `→ Klicke auf „${navAction.label || 'Weiter'}"…`, null, { copy: false });
        try { chrome.storage.session?.set?.({ faAgentResume: resumeData }); } catch {}
        await sleep(350);
        el.click();
      } else {
        // Show manual confirm button
        const div = document.createElement('div');
        div.className = 'msg ai';
        const bubble = document.createElement('div');
        bubble.className = 'bubble';
        bubble.innerHTML = `<div style="margin-bottom:8px;font-size:13px;">Seite ausgefüllt — bereit für den nächsten Schritt.</div>`;
        const btn = document.createElement('button');
        btn.className = 'ap-primary';
        btn.style.cssText = 'height:38px;font-size:12.5px;margin-top:4px;';
        btn.innerHTML = `<svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:#fff;stroke-width:2.2;fill:none;stroke-linecap:round;stroke-linejoin:round"><path d="M5 12h14M12 5l7 7-7 7"/></svg> ${escapeHtml(navAction.label || 'Weiter')}`;
        btn.addEventListener('click', async () => {
          btn.disabled = true;
          const el = resolveActionElement(navAction);
          if (el) {
            try { chrome.storage.session?.set?.({ faAgentResume: resumeData }); } catch {}
            el.click();
          }
        });
        bubble.appendChild(btn);
        div.appendChild(bubble);
        messagesEl.appendChild(div);
        messagesEl.scrollTop = messagesEl.scrollHeight;
      }
    }

    async function executeAgentActions(actions) {
      agentStatusBubble = createAgentBubble();
      let filled = 0;
      const failedActions = [];

      for (const act of actions) {
        if (!agentState.active) break;

        if (act.action === 'done') {
          finalizeAgentBubble(filled);
          agentState.active = false;
          learnAgentFields();
          return;
        }

        if (act.action === 'submit') {
          finalizeAgentBubble(filled);
          learnAgentFields();
          const ok = await agentAskSubmit(act.label);
          if (ok) {
            const el = resolveActionElement(act);
            if (el) {
              const formEl = el.form || el.closest('form');
              if (formEl) approvedSubmits.add(formEl);
              el.click();
            }
          } else {
            addMsg('ai', 'Absenden abgebrochen.');
          }
          agentState.active = false;
          return;
        }

        const el = resolveActionElement(act);

        if ((act.action === 'fill' || act.action === 'select') && el) {
          fillField(el, act.value || '');
          if (isActionApplied(el, act.action, act.value || '')) {
            appendAgentRow('✓', act.label || act.selector, act.value);
            agentState.filledFields.push({ label: act.label, value: act.value, url: location.href });
            filled++;
          } else {
            appendAgentRow('✗', act.label || act.selector, 'Wert nicht übernommen');
            failedActions.push({ selector: act.selector, label: act.label, reason: 'Wert nicht übernommen' });
          }
          await sleep(100);
        } else if (act.action === 'check' && el) {
          if (!el.checked) { el.click(); el.dispatchEvent(new Event('change', { bubbles: true })); }
          if (isActionApplied(el, act.action)) appendAgentRow('✓', act.label || act.selector, '');
          else {
            appendAgentRow('✗', act.label || act.selector, 'nicht gesetzt');
            failedActions.push({ selector: act.selector, label: act.label, reason: 'Checkbox/Option nicht gesetzt' });
          }
          await sleep(100);
        } else if (act.action === 'click' && el) {
          appendAgentRow('→', act.label || act.selector, '');
          if (act.isNavigation) {
            try {
              chrome.storage.session?.set?.({
                faAgentResume: { filledFields: agentState.filledFields, startUrl: agentState.startUrl, guided: agentState.guided, autoNavigate: agentState.autoNavigate, sessionAnswers: agentState.sessionAnswers },
              });
            } catch {}
            await sleep(200);
            el.click();
            return;
          } else {
            el.click();
            await sleep(500);
          }
        } else if (!el && act.selector) {
          appendAgentRow('✗', act.label || act.selector, 'nicht gefunden');
          failedActions.push({ selector: act.selector, label: act.label, reason: 'Element nicht gefunden' });
        }
      }

      finalizeAgentBubble(filled);
      learnAgentFields();
      if (!failedActions.length) agentState.lastFailures = [];

      // Auto-correction: one extra round if validation errors found
      if ((filled > 0 || failedActions.length > 0) && !agentState.correctionRound) {
        await sleep(700);
        const errFields = extractRichContext().forms.flatMap(f => f.allFields)
          .filter(f => f.el && isVisible(f.el) && getError(f.el));
        if (errFields.length || failedActions.length) {
          agentState.correctionRound = 1;
          agentState.active = true;
          agentState.lastFailures = failedActions.slice(0, 12);
          if (failedActions.length) {
            addMsg('ai', `⚠ ${failedActions.length} Aktion${failedActions.length !== 1 ? 'en konnten' : ' konnte'} nicht sicher ausgeführt werden — versuche Korrektur…`);
          } else {
            addMsg('ai', `⚠ ${errFields.length} Feld${errFields.length > 1 ? 'er haben' : ' hat'} einen Fehler — korrigiere…`);
          }
          await runAgentStep();
          return;
        }
      }

      if (askUserForMissingField()) {
        agentState.active = true;
        return;
      }

      agentState.active = false;
    }

    function createAgentBubble() {
      const div = document.createElement('div');
      div.className = 'msg ai';
      const bubble = document.createElement('div');
      bubble.className = 'bubble';
      const hdrRow = document.createElement('div');
      hdrRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;';
      const hdr = document.createElement('strong');
      hdr.className = 'fa-agent-hdr';
      hdr.textContent = 'Agent läuft…';
      const stopBtn = document.createElement('button');
      stopBtn.className = 'agent-cancel fa-agent-stop';
      stopBtn.style.cssText = 'font-size:10.5px;padding:3px 8px;';
      stopBtn.textContent = 'Stopp';
      stopBtn.addEventListener('click', () => {
        agentState.active = false;
        stopBtn.disabled = true;
        stopBtn.textContent = 'Gestoppt';
        const h = agentStatusBubble?.querySelector('.fa-agent-hdr');
        if (h) h.textContent = 'Agent gestoppt.';
      });
      hdrRow.append(hdr, stopBtn);
      const list = document.createElement('div');
      list.className = 'fa-agent-list';
      list.style.cssText = 'display:flex;flex-direction:column;gap:3px;margin-top:7px;';
      bubble.append(hdrRow, list);
      div.appendChild(bubble);
      messagesEl.appendChild(div);
      messagesEl.scrollTop = messagesEl.scrollHeight;
      return bubble;
    }

    function appendAgentRow(icon, label, value) {
      const list = agentStatusBubble?.querySelector('.fa-agent-list');
      if (!list) return;
      const row = document.createElement('div');
      row.className = 'live-row';
      row.innerHTML = `<span class="live-row-icon">${escapeHtml(icon)}</span><span class="live-row-label">${escapeHtml(label || '')}</span>${value ? `<span class="live-row-value">${escapeHtml(String(value).slice(0, 30))}</span>` : ''}`;
      list.appendChild(row);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function finalizeAgentBubble(filled) {
      const hdr = agentStatusBubble?.querySelector('.fa-agent-hdr');
      if (hdr) hdr.textContent = `Agent: ${filled} Feld${filled !== 1 ? 'er' : ''} ausgefüllt`;
      agentStatusBubble?.querySelector('.fa-agent-stop')?.remove();
    }

    function agentAskSubmit(label) {
      return new Promise(resolve => {
        const div = document.createElement('div');
        div.className = 'msg ai';
        const bubble = document.createElement('div');
        bubble.className = 'bubble';
        bubble.innerHTML = `<strong>Formular absenden?</strong><p style="margin-top:6px;font-size:13px;color:var(--text2)">Der Agent möchte auf <strong>"${escapeHtml(label || 'Absenden')}"</strong> klicken. Bitte alle Einträge kurz prüfen.</p>`;
        const row = document.createElement('div');
        row.className = 'agent-actions';
        row.style.marginTop = '10px';
        const yes = document.createElement('button');
        yes.className = 'agent-confirm';
        yes.textContent = 'Absenden bestätigen';
        yes.addEventListener('click', () => { div.remove(); resolve(true); });
        const no = document.createElement('button');
        no.className = 'agent-cancel';
        no.textContent = 'Abbrechen';
        no.addEventListener('click', () => { resolve(false); });
        row.append(yes, no);
        bubble.appendChild(row);
        div.appendChild(bubble);
        messagesEl.appendChild(div);
        messagesEl.scrollTop = messagesEl.scrollHeight;
      });
    }

    function learnAgentFields() {
      let changed = false;
      agentState.filledFields.forEach(({ label, value }) => {
        if (!label || !value) return;
        const pf = PROFILE_FIELDS.find(p => p.kw.some(k => label.toLowerCase().includes(k)));
        if (pf && !profile[pf.key]) { profile[pf.key] = value; changed = true; }
        else if (!pf && !extras[label]) { extras[label] = value; changed = true; }
      });
      if (changed) {
        saveActiveProfileToStore();
        SYSTEM = buildSystemPrompt(ctx, profile, extras);
      }
      const filled = agentState.filledFields.filter(f => f.url === location.href).length;
      if (filled > 0) {
        addHistoryEntry({
          ts: Date.now(),
          domain: location.hostname,
          title: document.title || location.hostname,
          fieldCount: agentState.filledFields.length,
          url: location.href,
          profileId: activeProfileId,
        });
      }
    }

    async function resumeAgentIfPending() {
      try {
        const res = await new Promise(r => chrome.storage.session?.get?.('faAgentResume', r) ?? r({}));
        if (!res?.faAgentResume) return;
        chrome.storage.session.remove('faAgentResume');
        manualAssistState.pending = null;
        guidedAskState = { active: false, queue: [], navAction: null };
        const resume = res.faAgentResume;
        agentState = {
          active: true,
          guided: resume.guided !== false,
          autoNavigate: resume.autoNavigate !== false,
          sessionAnswers: resume.sessionAnswers || {},
          filledFields: resume.filledFields || [],
          startUrl: resume.startUrl || '',
          correctionRound: 0,
          lastFailures: [],
        };
        open();
        const gpWrap = $('fa-guided-progress'); const gpBar = $('fa-gp-bar'); const gpLabel = $('fa-gp-label');
        if (agentState.guided && gpWrap) { gpWrap.style.display = 'block'; if (gpBar) gpBar.style.width = '0%'; if (gpLabel) gpLabel.textContent = 'Warte auf Felder…'; }
        addMsg('ai', `Agent fortgesetzt (${agentState.filledFields.length} Felder bisher). Warte auf Felder…`);
        await waitForFields(4000);
        applyContext(extractRichContext());
        addMsg('ai', allFields.length
          ? `${allFields.length} Felder erkannt — analysiere…`
          : 'Keine Felder gefunden — versuche trotzdem…', null, { copy: false });
        if (agentState.guided) {
          await runFieldByFieldAgent();
        } else {
          await runAgentStep();
        }
      } catch {}
    }

    async function waitForFields(maxMs = 4000) {
      const step = 250;
      for (let elapsed = 0; elapsed < maxMs; elapsed += step) {
        const fields = extractRichContext().forms.flatMap(f => f.allFields);
        if (fields.length > 0) return;
        await sleep(step);
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SUBMIT REVIEW — intercept once, let the user continue consciously
    // ═══════════════════════════════════════════════════════════════════════

    const approvedSubmits = new WeakSet();
    const reviewingSubmits = new WeakSet();

    function getFieldValueForReview(el) {
      if (!el) return '';
      if (isFileWidget(el)) return '';
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

    function hasEnoughFields(formEl) {
      return Array.from(formEl.querySelectorAll(
        'input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=reset]):not([type=image]),select,textarea'
      )).filter(isVisible).length >= 3;
    }

    document.addEventListener('click', e => {
      const submitter = getClickedSubmitter(e.target);
      if (!submitter || !hasEnoughFields(submitter.form)) return;
      startSubmitReview(submitter.form, submitter, e);
    }, true);

    document.addEventListener('submit', e => {
      const formEl = e.target;
      if (!(formEl instanceof HTMLFormElement) || !hasEnoughFields(formEl)) return;
      startSubmitReview(formEl, e.submitter, e);
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

    document.addEventListener('focusout', e => {
      const next = e.relatedTarget;
      if (next && ['INPUT','SELECT','TEXTAREA'].includes(next.tagName)) return;
      autofillTip.classList.remove('visible');
    }, true);

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
      if (!el) return;
      const problem = getFieldProblem(el);
      if (!problem) return;
      if (reviewingSubmits.has(el.form)) return;
      clearTimeout(errorHelpTimers.get(el));
      errorHelpTimers.set(el, setTimeout(() => showFieldErrorHelp(el), delay));
    }

    function showFieldErrorHelp(el) {
      const problem = getFieldProblem(el);
      if (!problem || reviewingSubmits.has(el.form)) return;
      const label = ((el.type || '').toLowerCase() === 'radio' ? getGroupLabel(el) : '') || getLabel(el) || 'diesem Feld';
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

    let domObserveTimer;
    new MutationObserver(() => {
      clearTimeout(domObserveTimer);
      domObserveTimer = setTimeout(() => {
        const fresh = extractRichContext();
        refreshContext(fresh);
      }, 800);
    }).observe(document.body, { childList: true, subtree: true });

    resumeAgentIfPending();

    // ── Action panel ─────────────────────────────────────────────────
    $('fa-ap-agent').addEventListener('click', () => { if (profileVisible) hideProfile(); startAgent(); });
    $('fa-ap-explain').addEventListener('click', () => {
      if (profileVisible) hideProfile();
      askFormSummary();
    });
    $('fa-ap-fields').addEventListener('click', () => {
      const list = $('fa-ap-field-list');
      const btn  = $('fa-ap-fields');
      if (!list) return;
      const isOpen = list.classList.toggle('open');
      btn.classList.toggle('open', isOpen);
      if (isOpen) renderActionFieldList();
    });
    $('fa-assistant-mode').addEventListener('change', e => {
      _assistantMode = normalizeAssistantMode(e.target.value);
      updateAssistantModeUi();
      chrome.storage.sync.set({ faAssistantMode: _assistantMode });
      const modeLabel = _assistantMode === 'classic' ? 'Mit Vorschau' : 'Automatisch';
      showToast(`Modus: ${modeLabel}`);
    });

    // ── Keyboard shortcut relay from background ───────────────────────
    chrome.runtime.onMessage.addListener(msg => {
      if (msg.type === 'toggle-assistant') {
        if (isOpen) { close(); return; }
        open();
      } else if (msg.type === 'smart-fill') {
        startAgent();
      }
    });

    // ── Sync storage → live config updates ───────────────────────────
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'sync') return;
      if (changes.faProvider) {
        _provider = normalizeProvider(changes.faProvider.newValue);
      }
      if (changes.faApiKey || changes.faGroqApiKey || changes.faOpenRouterApiKey || changes.faProvider) {
        _apiKey = '';
        _keyPromise = null;
      }
      if (changes.faModel) {
        _model = changes.faModel.newValue || getDefaultModel(_provider);
      } else if (changes.faProvider) {
        _model = getDefaultModel(_provider);
      }
      updateFooterNote();
      if (changes.faAssistantMode) {
        _assistantMode = normalizeAssistantMode(changes.faAssistantMode.newValue);
        updateAssistantModeUi();
      }
    });

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
  }); // end chrome.storage.sync.get

})();

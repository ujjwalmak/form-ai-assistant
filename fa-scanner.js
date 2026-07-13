'use strict';
// Depends on: fa-utils.js, fa-profile.js

const SKIP_TYPES = new Set(['hidden', 'submit', 'button', 'reset', 'image']);

// ID-Lookup im richtigen Baum: Felder in ShadowRoots/iFrames finden ihre
// Label-/Hint-/Error-Elemente über getRootNode(), nicht über `document`
function byIdInRoot(el, id) {
  const root = el.getRootNode?.() || document;
  if (typeof root.getElementById === 'function') return root.getElementById(id);
  return root.querySelector?.(`#${CSS.escape(id)}`) || null;
}

function getLabel(el) {
  let v = clean(el.getAttribute('aria-label'));
  if (v) return v;
  const lblBy = el.getAttribute('aria-labelledby');
  if (lblBy) {
    v = clean(lblBy.split(' ').map(id => textFromEl(byIdInRoot(el, id))).filter(Boolean).join(' '));
    if (v) return v;
  }
  if (el.id) {
    const root = el.getRootNode?.() || document;
    const lbl = root.querySelector?.(`label[for="${CSS.escape(el.id)}"]`);
    if (lbl) return textFromEl(lbl);
  }
  const wl = el.closest('label');
  if (wl) {
    v = textFromEl(wl);
    if (v) return v;
  }
  if (el.title)       return clean(el.title);
  if (el.placeholder) return clean(el.placeholder);
  // Tabellen-Layouts (Behörden-/Legacy-Formulare): Label steht in der Zelle davor
  const cell = el.closest('td,th');
  const prevCell = cell?.previousElementSibling;
  if (prevCell && !prevCell.querySelector('input,select,textarea')) {
    v = textFromEl(prevCell);
    if (v && v.length < 120) return v;
  }
  const raw = el.name || el.id || '';
  if (raw) return raw.replace(/[-_[\]]/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').trim();
  return '';
}

function getGroupLabel(el) {
  const group = el?.closest?.('[role="group"]');
  const lblBy = group?.getAttribute('aria-labelledby');
  if (lblBy) {
    const v = clean(lblBy.split(' ').map(id => textFromEl(byIdInRoot(el, id))).filter(Boolean).join(' '));
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
    const v = clean(descBy.split(' ').map(id => byIdInRoot(el, id)?.textContent).filter(Boolean).join(' '));
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
  if (errId) { const v = clean(byIdInRoot(el, errId)?.textContent); if (v) return v; }
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

  // Custom-Widgets ohne native Elemente (React-Select/MUI-Dropdowns, Rich-Text)
  const customCombobox = !kendoRole && el.tagName !== 'INPUT' && isAriaCombobox(el);
  const richText = isRichTextField(el);

  const info = {
    label,
    type:         fileWidget ? 'file' : kendoRole ? kendoRole : customCombobox ? 'combobox' : richText ? 'richtext' : el.tagName === 'SELECT' ? 'select' : el.tagName === 'TEXTAREA' ? 'textarea' : (el.type || 'text'),
    required:     el.required || el.getAttribute('aria-required') === 'true' || !!el.closest('.required') || !!el.closest('.formline')?.querySelector('.required-mark'),
    autocomplete: (el.getAttribute('autocomplete') || '').replace(/^(on|off)$/, ''),
    hint:         getHint(el),
    selector:     getAgentSelector(el),
    options:      [],
    el,
  };

  if (!kendoRole && info.type === 'radio' && el.name) {
    const root = el.form || el.getRootNode?.() || document;
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
    // Custom-Widgets (div[role=combobox], contenteditable) sind selbst das Feld
    if (isAriaCombobox(node) || isRichTextField(node)) {
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
    const loose = Array.from(document.querySelectorAll('input:not([type=hidden]),select,textarea,[role="combobox"],[contenteditable="true"]'))
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
        const loose = doc.querySelectorAll('input:not([type=hidden]),select,textarea,[role="combobox"],[contenteditable="true"]');
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

  // Scan open shadow roots in host page (Web Components, custom elements) —
  // rekursiv, weil Design-Systeme Komponenten oft verschachteln (Form-Komponente
  // enthält Input-Komponenten mit eigenem Shadow Root)
  function collectShadowRoots(rootNode, acc, depth = 0) {
    if (depth > 6) return acc;
    try {
      rootNode.querySelectorAll('*').forEach(el => {
        if (!el.shadowRoot || el.id === 'formassist-host') return;
        acc.push(el.shadowRoot);
        collectShadowRoots(el.shadowRoot, acc, depth + 1);
      });
    } catch {}
    return acc;
  }
  try {
    collectShadowRoots(document, []).forEach(shadowRoot => {
      try {
        let srForms = Array.from(shadowRoot.querySelectorAll('form'));
        if (!srForms.length) {
          const loose = shadowRoot.querySelectorAll('input:not([type=hidden]),select,textarea,[role="combobox"],[contenteditable="true"]');
          if (loose.length > 0) srForms = [shadowRoot];
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

// Compact current value of a field for the system prompt (max 60 chars)
function getFieldValueBrief(el) {
  if (!el) return '';
  const type = (el.type || '').toLowerCase();
  if (type === 'checkbox') return el.checked ? 'angekreuzt' : '';
  if (type === 'radio' && el.name) {
    const root = el.form || el.getRootNode?.() || document;
    const checked = root.querySelector(`input[type="radio"][name="${CSS.escape(el.name)}"]:checked`);
    return checked ? clean(getLabel(checked) || checked.value) : '';
  }
  if (el.tagName === 'SELECT') {
    const opt = el.selectedOptions?.[0];
    return opt && el.value ? clean(opt.text) : '';
  }
  if (type === 'password' || type === 'file') return '';
  // Custom-Widgets tragen ihren Wert im Textinhalt, nicht in .value
  if (isRichTextField(el) || (isAriaCombobox(el) && el.tagName !== 'INPUT')) {
    return clean(el.textContent || '').slice(0, 60);
  }
  return clean(String(el.value || '')).slice(0, 60);
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

function matchProfile(el, profile) {
  if (!el) return null;
  // Niemals Profildaten in Passwortfelder vorschlagen/füllen
  if ((el.type || '').toLowerCase() === 'password') return null;
  const ac = (el.getAttribute('autocomplete') || '').toLowerCase();
  const label = getLabel(el).toLowerCase();
  for (const pf of PROFILE_FIELDS) {
    if (!profile[pf.key]) continue;
    if (ac && ac !== 'on' && ac !== 'off' && pf.ac.some(a => ac.includes(a))) return pf;
    // Wortanfang-Matching statt Substring — verhindert Fehl-Befüllungen wie
    // "Hotelname" → Telefon ("tel") oder "Passwort"/"Sportart" → Stadt ("ort")
    if (pf.kw.some(k => labelHasKeyword(label, k))) return pf;
  }
  return null;
}

// ── Test export (Node/Vitest only; `module` is undefined in the browser) ──────
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getLabel, getGroupLabel, isFileWidget, getHint, getError, extractField,
    groupIntoSections, getFormIntro, getSubmitText, getFieldValueBrief,
    getActiveFieldContext, matchProfile, extractRichContext,
  };
}

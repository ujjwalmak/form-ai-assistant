'use strict';
// Depends on: fa-utils.js, fa-scanner.js

const FULL_WIDTH_KEYS = new Set(['email', 'street', 'iban']);

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

// Priorisierte Options-Suche: exaktes Label/Value → Wortanfang → enthält.
// "Enthält" erst ab 3 Zeichen, damit Kürzel wie "DE" nicht zufällig in
// längeren Optionstexten hängen bleiben, sondern nur exakt matchen.
function findSelectOption(options, text) {
  const wanted = clean(String(text ?? '')).toLowerCase();
  if (!wanted) return null;
  const opts  = Array.from(options);
  const label = o => clean(o.text || o.label || '').toLowerCase();
  const value = o => clean(o.value).toLowerCase();
  return opts.find(o => label(o) === wanted || value(o) === wanted)
      || (wanted.length >= 3 ? opts.find(o => label(o).startsWith(wanted)) : null)
      || (wanted.length >= 3 ? opts.find(o => label(o).includes(wanted)) : null)
      || opts.find(o => label(o).length >= 3 && wanted.includes(label(o)))
      || null;
}

// "1.234,56" / "3,5" → "1234.56" / "3.5" — deutsche Dezimalschreibweise
// für type=number (der Browser lehnt Kommawerte sonst still ab)
function normalizeDecimalString(text) {
  const t = String(text ?? '').trim();
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) return t.replace(/\./g, '').replace(',', '.');
  if (/^-?\d+,\d+$/.test(t)) return t.replace(',', '.');
  return null;
}

// Convert free-form value into the exact string a temporal input accepts.
// Returns null if the type is not temporal or the value cannot be resolved.
function normalizeTemporalValue(type, text) {
  if (!['date', 'month', 'week', 'time', 'datetime-local'].includes(type)) return null;
  const t = String(text).trim();
  if (type === 'time') {
    const m = t.match(/^(\d{1,2})[:.](\d{2})/);
    return m ? `${m[1].padStart(2, '0')}:${m[2]}` : null;
  }
  if (type === 'month') {
    const ym = t.match(/^(\d{4})-(\d{1,2})$/);                 // YYYY-M(M)
    if (ym) return `${ym[1]}-${ym[2].padStart(2, '0')}`;
    const my = t.match(/^(\d{1,2})[./-](\d{4})$/);             // MM.YYYY
    if (my) return `${my[2]}-${my[1].padStart(2, '0')}`;
  }
  let iso = parseDateToISO(t);
  if (!iso) {
    const rel = parseRelativeDate(t);
    if (rel) iso = toISODate(rel);
  }
  if (!iso) return null;
  if (type === 'date')           return iso;
  if (type === 'month')          return iso.slice(0, 7);
  if (type === 'datetime-local') return `${iso}T00:00`;
  if (type === 'week') {
    const d = new Date(`${iso}T00:00:00`);
    const target = new Date(d.valueOf());
    target.setDate(target.getDate() - ((d.getDay() + 6) % 7) + 3);
    const firstThursday = new Date(target.getFullYear(), 0, 4);
    const week = 1 + Math.round(((target - firstThursday) / 86400000 - 3 + ((firstThursday.getDay() + 6) % 7)) / 7);
    return `${target.getFullYear()}-W${String(week).padStart(2, '0')}`;
  }
  return iso;
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
    if (el.multiple && /[,;]/.test(text)) {
      // Mehrfachauswahl: "Deutsch, Englisch" → beide Optionen selektieren
      const matched = text.split(/[,;]/).map(p => findSelectOption(el.options, p)).filter(Boolean);
      if (matched.length) Array.from(el.options).forEach(o => { o.selected = matched.includes(o); });
    } else {
      const option = text ? findSelectOption(el.options, text) : null;
      if (option) el.value = option.value;
      else if (text) el.value = text;
    }
  } else if (elType === 'checkbox') {
    // click() instead of .checked = … so React/Vue state updates too
    const desired = /^(ja|yes|true|1|x|ok|checked|ausgewählt|an|on)$/i.test(text);
    if (el.checked !== desired) el.click();
  } else if (elType === 'radio') {
    const root = el.form || el.getRootNode?.() || document;
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
    const temporal = normalizeTemporalValue(elType, text);
    if (temporal) text = temporal;
    if (elType === 'number') {
      const decimal = normalizeDecimalString(text);
      if (decimal !== null) text = decimal;
    }
    // Programmatisches Setzen umgeht maxlength — clientseitig kappen,
    // sonst scheitert die Server-Validierung
    if (el.maxLength > 0 && el.maxLength < 9999 && text.length > el.maxLength) {
      text = text.slice(0, el.maxLength);
    }
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

// ── Test export (Node/Vitest only; `module` is undefined in the browser) ──────
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { setKendoValue, tryDatePickerLib, normalizeTemporalValue, fillField, findSelectOption, normalizeDecimalString };
}

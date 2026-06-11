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
    const wanted = text.toLowerCase();
    const option = text ? Array.from(el.options).find(o => {
      const label = clean(o.text || o.label || o.value).toLowerCase();
      const val = clean(o.value).toLowerCase();
      return label === wanted || val === wanted || label.includes(wanted) || wanted.includes(label);
    }) : null;
    if (option) el.value = option.value;
    else if (text) el.value = text;
  } else if (elType === 'checkbox') {
    // click() instead of .checked = … so React/Vue state updates too
    const desired = /^(ja|yes|true|1|x|ok|checked|ausgewählt|an|on)$/i.test(text);
    if (el.checked !== desired) el.click();
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
    const temporal = normalizeTemporalValue(elType, text);
    if (temporal) text = temporal;
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

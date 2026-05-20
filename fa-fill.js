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

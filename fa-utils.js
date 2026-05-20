'use strict';

// ── String / byte utilities ──────────────────────────────────────────────────
function clean(s) { return (s || '').replace(/\s+/g, ' ').trim(); }

function formatBytes(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return '';
  const mb = Math.round(n / (1024 * 1024));
  return mb > 0 ? `${mb} MB` : `${n} B`;
}

// ── DOM visibility ───────────────────────────────────────────────────────────
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

// ── Date parsing ─────────────────────────────────────────────────────────────
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

// ── Kendo widget detection ───────────────────────────────────────────────────
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
    datepicker:   'kendoDatePicker',
    autocomplete: 'kendoAutoComplete',
    combobox:     'kendoComboBox',
    multiselect:  'kendoMultiSelect',
    dropdownlist: 'kendoDropDownList',
  };
  const key = map[role];
  return key ? jq.data(key) : null;
}

// ── Agent element selectors ──────────────────────────────────────────────────
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

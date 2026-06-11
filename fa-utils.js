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
  // DD-MM-YYYY → YYYY-MM-DD
  const m3 = text.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (m3) return `${m3[3]}-${m3[2].padStart(2,'0')}-${m3[1].padStart(2,'0')}`;
  // YYYY/MM/DD → YYYY-MM-DD
  const m4 = text.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (m4) return `${m4[1]}-${m4[2].padStart(2,'0')}-${m4[3].padStart(2,'0')}`;
  // YYYY-M-D → zero-padded
  const m5 = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m5) return `${m5[1]}-${m5[2].padStart(2,'0')}-${m5[3].padStart(2,'0')}`;
  return null;
}

function toISODate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Resolve relative phrases ("nächster Monat", "next week", "in 3 Tagen") to a Date
function parseRelativeDate(text) {
  const t = clean(String(text || '')).toLowerCase().replace(/^(am|ab|zum|on|by|from)\s+/, '');
  if (!t) return null;
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (/^(heute|today|sofort|ab sofort|asap|jetzt|now)$/.test(t)) return d;
  if (/^(morgen|tomorrow)$/.test(t)) { d.setDate(d.getDate() + 1); return d; }
  if (/^übermorgen$/.test(t)) { d.setDate(d.getDate() + 2); return d; }
  if (/(nächste|naechste|kommende)[rn]? woche|next week/.test(t)) { d.setDate(d.getDate() + 7); return d; }
  if (/(nächste|naechste|kommende)[rn]? monat|next month/.test(t)) { d.setMonth(d.getMonth() + 1); return d; }
  if (/(nächste|naechste|kommende)s? jahr|next year/.test(t)) { d.setFullYear(d.getFullYear() + 1); return d; }
  const m = t.match(/^in (\d+) (tag(?:en|e)?|day(?:s)?|woche(?:n)?|week(?:s)?|monat(?:en|e)?|month(?:s)?|jahr(?:en|e)?|year(?:s)?)$/);
  if (m) {
    const n = parseInt(m[1], 10);
    if (/^(tag|day)/.test(m[2]))         d.setDate(d.getDate() + n);
    else if (/^(woche|week)/.test(m[2])) d.setDate(d.getDate() + 7 * n);
    else if (/^(monat|month)/.test(m[2])) d.setMonth(d.getMonth() + n);
    else                                  d.setFullYear(d.getFullYear() + n);
    return d;
  }
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

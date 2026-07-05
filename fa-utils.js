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
  // getComputedStyle über das eigene Fenster des Elements — für Felder in
  // same-origin iFrames liefert das Top-Window sonst falsche Ergebnisse
  const win = el.ownerDocument?.defaultView || window;
  const s = win.getComputedStyle(el);
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

// ── Live field validation (deterministic, no API calls) ─────────────────────
// IBAN-Sollängen der häufigsten Länder (Rest wird nur per mod-97 geprüft)
const IBAN_LENGTHS = {
  DE: 22, AT: 20, CH: 21, FR: 27, GB: 22, IT: 27, ES: 24, NL: 18, BE: 16,
  LU: 20, PL: 28, DK: 18, SE: 24, NO: 15, FI: 18, PT: 25, IE: 22,
};

// ISO 7064 mod-97: erste 4 Zeichen ans Ende, Buchstaben → Zahlen (A=10 … Z=35)
function isValidIBAN(value) {
  const iban = String(value || '').replace(/\s+/g, '').toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
  const expected = IBAN_LENGTHS[iban.slice(0, 2)];
  if (expected && iban.length !== expected) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let remainder = 0;
  for (const ch of rearranged) {
    const code = ch >= 'A' ? String(ch.charCodeAt(0) - 55) : ch;
    for (const digit of code) remainder = (remainder * 10 + (digit.charCodeAt(0) - 48)) % 97;
  }
  return remainder === 1;
}

function isValidBIC(value) {
  return /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(String(value || '').replace(/\s+/g, '').toUpperCase());
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(String(value || '').trim());
}

function isValidGermanZip(value) {
  return /^\d{5}$/.test(String(value || '').trim());
}

function isValidPhone(value) {
  const v = String(value || '').trim();
  if (!/^[+\d][\d\s\-/().]*$/.test(v)) return false;
  const digits = v.replace(/\D/g, '');
  return digits.length >= 6 && digits.length <= 15;
}

// '' = plausibel, sonst deutsche Fehlermeldung; null = Wert (noch) nicht parsebar
function getBirthdateIssue(value) {
  const iso = parseDateToISO(String(value || '').trim());
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`);
  if (isNaN(d)) return null;
  const now = new Date();
  if (d > now) return 'Das Geburtsdatum liegt in der Zukunft.';
  const age = (now - d) / (365.25 * 24 * 3600 * 1000);
  if (age > 120) return 'Das Geburtsdatum liegt über 120 Jahre zurück.';
  return '';
}

// Keyword am Wortanfang (Position 0 oder nach Nicht-Buchstabe), damit z. B.
// "tel" nicht in "Stelle" oder "Hotel" matcht
function labelHasKeyword(label, kw) {
  const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-zäöüß])${escaped}`, 'i').test(String(label || ''));
}

const LIVE_CHECK_KINDS = [
  { kind: 'iban',      kw: ['iban'] },
  { kind: 'bic',       kw: ['bic', 'swift'] },
  { kind: 'email',     kw: ['e-mail', 'email', 'mail'] },
  { kind: 'zip-de',    kw: ['plz', 'postleitzahl'] },
  { kind: 'birthdate', kw: ['geburtsdatum', 'geburtstag', 'birthdate', 'birthday', 'birth date', 'date of birth'] },
  { kind: 'phone',     kw: ['telefon', 'handy', 'mobile', 'phone', 'tel'] },
];

// Feld-Typ/Autocomplete zuerst (verlässlich), dann Label-Keywords
function detectLiveCheckKind(label, type, autocomplete) {
  const t  = String(type || '').toLowerCase();
  const ac = String(autocomplete || '').toLowerCase();
  if (t === 'email' || ac === 'email') return 'email';
  if (t === 'tel'   || ac === 'tel')   return 'phone';
  if (ac === 'bday') return 'birthdate';
  for (const { kind, kw } of LIVE_CHECK_KINDS) {
    if (kw.some(k => labelHasKeyword(label, k))) return kind;
  }
  return '';
}

// null = keine Aussage (leer / noch beim Tippen), sonst { ok, msg }.
// final=true (z. B. bei blur): auch unvollständige Werte streng bewerten.
function getLiveCheckResult(kind, value, { final = false } = {}) {
  const v = String(value || '').trim();
  if (!kind || !v) return null;
  const compact = v.replace(/\s+/g, '');

  if (kind === 'iban') {
    if (!final && compact.length < 15) return null;
    return isValidIBAN(v)
      ? { ok: true,  msg: 'IBAN-Prüfsumme korrekt' }
      : { ok: false, msg: 'IBAN ungültig – Prüfsumme oder Länge stimmt nicht' };
  }
  if (kind === 'bic') {
    if (!final && compact.length < 8) return null;
    return isValidBIC(v)
      ? { ok: true,  msg: 'BIC-Format korrekt' }
      : { ok: false, msg: 'BIC ungültig – 8 oder 11 Stellen (z. B. COBADEFFXXX)' };
  }
  if (kind === 'email') {
    if (!final && !/@.+\./.test(v)) return null;
    return isValidEmail(v)
      ? { ok: true,  msg: 'E-Mail-Format korrekt' }
      : { ok: false, msg: 'E-Mail-Format ungültig (name@domain.tld)' };
  }
  if (kind === 'zip-de') {
    if (!final && compact.length < 5) return null;
    return isValidGermanZip(v)
      ? { ok: true,  msg: 'PLZ-Format korrekt' }
      : { ok: false, msg: 'PLZ muss aus genau 5 Ziffern bestehen' };
  }
  if (kind === 'phone') {
    if (!final && compact.replace(/\D/g, '').length < 6) return null;
    return isValidPhone(v)
      ? { ok: true,  msg: 'Telefonnummer plausibel' }
      : { ok: false, msg: 'Telefonnummer wirkt ungültig' };
  }
  if (kind === 'birthdate') {
    const issue = getBirthdateIssue(v);
    if (issue === null) return final ? { ok: false, msg: 'Datum nicht lesbar (TT.MM.JJJJ)' } : null;
    return issue ? { ok: false, msg: issue } : { ok: true, msg: 'Geburtsdatum plausibel' };
  }
  return null;
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

// ── Test export (Node/Vitest only; `module` is undefined in the browser) ──────
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    clean, formatBytes, isVisible, textFromEl, getElementTextValue, findButtonByText,
    parseDateToISO, toISODate, parseRelativeDate, isKendoWidget, getKendoWidget,
    getAgentSelector,
    isValidIBAN, isValidBIC, isValidEmail, isValidGermanZip, isValidPhone,
    getBirthdateIssue, labelHasKeyword, detectLiveCheckKind, getLiveCheckResult,
  };
}

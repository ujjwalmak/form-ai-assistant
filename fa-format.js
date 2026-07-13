'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// Text-/HTML-Formatierung für die Chat-UI. Alle Funktionen sind pur:
// Roh-Text rein, escaptes/gerendertes HTML raus. Jede Ausgabe, die per
// innerHTML in den Shadow Root gelangt, läuft über escapeHtml (XSS-Schutz).
// Benötigt zur Laufzeit: clean (fa-utils.js).
// ─────────────────────────────────────────────────────────────────────────────

function escapeHtml(text) {
  return String(text ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

function textToHtml(text) {
  return escapeHtml(text).replace(/\n/g, '<br>');
}

function htmlToPlainText(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html || '';
  return clean(tmp.textContent || '');
}

// Bewusst minimales Markdown (fett/kursiv/Code/Listen) statt einer Library —
// mehr braucht die Chat-Bubble nicht, und der Input bleibt vollständig escaped.
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

// ── Test export (Node/Vitest only; `module` is undefined in the browser) ──────
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { escapeHtml, textToHtml, htmlToPlainText, renderMarkdown };
}

'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// Parsen & Härten von LLM-Antworten: Aktionsblöcke, JSON-Arrays, SSE-Streams,
// Dokument-Scan-Ergebnisse. Alles pure String-/JSON-Verarbeitung ohne DOM —
// die Ausführung der Aktionen bleibt in content.js.
// Benötigt zur Laufzeit: clean (fa-utils.js), PROFILE_FIELDS (fa-profile.js).
// ─────────────────────────────────────────────────────────────────────────────

// Werte aus Modell-Output nie ungeprüft übernehmen: nur primitive Typen,
// Whitespace normalisiert, Länge gedeckelt
function toSafeText(value, maxLen = 280) {
  if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') return '';
  return String(value).replace(/\s+/g, ' ').trim().slice(0, maxLen);
}

// Toleranter JSON-Array-Parser für Modell-Output: direkte Arrays, Objekt-Wrapper
// ({actions:[…]} u. ä.), ```json-Fences, eingebettete Arrays — bis hin zum
// Einsammeln einzelner {"action":…}-Objekte als letzter Ausweg.
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
          // Gängige Wrapper auspacken: {actions:[...]}, {items:[...]}, {result:[...]}
          for (const key of ['actions', 'items', 'result', 'data', 'fields']) {
            if (Array.isArray(parsed[key])) return parsed[key];
          }
          return [parsed];
        }
      } catch { /* Kandidat unbrauchbar — nächsten versuchen */ }
    }
    return null;
  }

  const direct = tryParse(text);
  if (direct) return direct;

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) { const r = tryParse(fenced[1].trim()); if (r) return r; }

  // Äußerstes Array suchen
  const arrMatch = text.match(/\[[\s\S]*\]/);
  if (arrMatch) { const r = tryParse(arrMatch[0]); if (r) return r; }

  // Letzter Ausweg: einzelne Objekte mit "action"-Schlüssel extrahieren
  const objects = [];
  const objRe = /\{[^{}]*"action"\s*:[^{}]*\}/g;
  for (const m of text.matchAll(objRe)) {
    try { const o = JSON.parse(m[0]); if (o) objects.push(o); } catch { /* kein valides Objekt */ }
  }
  if (objects.length) return objects;

  return [];
}

// Whitelist-Validierung der Agent-Aktionen: nur bekannte action-Typen,
// alle Felder längenbegrenzt, confidence auf [0,1] geklemmt.
// Harte Guardrail: es gibt bewusst KEINEN Pfad, der ein Formular absendet —
// "submit" wird nur als Vorschlag durchgereicht und in content.js dem Nutzer
// zur Bestätigung vorgelegt, nie automatisch ausgeführt.
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
    if (action === 'check') {
      const value = toSafeText(item.value, 60);
      if (value) normalized.value = value; // erlaubt "nein"/"false" → abwählen
    }
    if (action === 'click') normalized.isNavigation = !!item.isNavigation;
    cleaned.push(normalized);
    if (cleaned.length >= 150) break;
  }
  return cleaned;
}

// Chat-Antwort in sichtbaren Text + Aktionsliste trennen.
// Tolerantes Parsing: offizieller <<<ACTIONS … ACTIONS>>>-Marker (auch
// ungeschlossen), ```json-Fences oder ein nacktes JSON-Array mit "action"-
// Schlüsseln am Ende — kleinere Modelle halten das Markerformat nicht immer ein.
function splitActionBlock(raw) {
  const text = String(raw || '');
  let payload = null;
  let stripped = text;

  const marker = text.match(/<<<ACTIONS([\s\S]*?)(?:ACTIONS>>>|$)/);
  if (marker) {
    payload = marker[1];
    stripped = text.replace(marker[0], '');
  } else {
    const fence = text.match(/```(?:json|actions)?\s*(\[[\s\S]*?\])\s*```/i);
    if (fence && /"action"/.test(fence[1])) {
      payload = fence[1];
      stripped = text.replace(fence[0], '');
    } else {
      const bare = text.match(/\[\s*\{[\s\S]*?"action"[\s\S]*?\}\s*\]\s*$/);
      if (bare) {
        payload = bare[0];
        stripped = text.replace(bare[0], '');
      }
    }
  }

  if (!payload) return { text: text.trim(), actions: [] };
  const actions = sanitizeAgentActions(parseModelJsonArray(payload))
    .filter(a => ['fill', 'select', 'check'].includes(a.action));
  return { text: stripped.trim(), actions };
}

// SSE-Decoder mit Zeilenpuffer: Chunks können mitten in einer "data:"-Zeile
// enden — unvollständige Zeilen werden bis zum nächsten Chunk aufgehoben.
// Pro Aufruf kommt der reine Text-Zuwachs (delta.content) zurück.
function createSSEDecoder() {
  let buf = '';
  return function decode(chunk) {
    buf += chunk;
    const lines = buf.split('\n');
    buf = lines.pop() || '';
    let text = '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6).trim();
      if (payload === '[DONE]') continue;
      try { text += JSON.parse(payload)?.choices?.[0]?.delta?.content || ''; }
      catch { /* Fremd-/Kommentarzeile im Stream — überspringen */ }
    }
    return text;
  };
}

// Antwort des Vision-Modells (Dokument-Scan) → Profilfelder-Objekt.
// Nur bekannte PROFILE_FIELDS-Schlüssel, Platzhalter-Werte ("null", "n/a" …)
// und überlange Werte werden verworfen.
function parseScanReply(text) {
  let t = String(text || '').trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const start = t.indexOf('{');
  const end   = t.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  let obj;
  try { obj = JSON.parse(t.slice(start, end + 1)); } catch { return null; }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;
  const values = {};
  PROFILE_FIELDS.forEach(pf => {
    const v = obj[pf.key];
    if (v == null) return;
    const s = clean(String(v));
    if (s && s.length <= 120 && !/^(null|undefined|n\/a|unbekannt|-)$/i.test(s)) values[pf.key] = s;
  });
  return values;
}

// ── Test export (Node/Vitest only; `module` is undefined in the browser) ──────
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    toSafeText, parseModelJsonArray, sanitizeAgentActions, splitActionBlock,
    createSSEDecoder, parseScanReply,
  };
}

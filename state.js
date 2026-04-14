// Shared state and utility helpers.
let apiKey = '';
let apiKeyLoadPromise = null;
let apiKeyLoadError = '';
let activeField = null;
let panelInjected = false;

const SYSTEM_PROMPT = `Du bist ein freundlicher KI-Assistent, der Nutzern hilft, Formulare auf Webseiten auszufuellen. Gib kurze, praezise Antworten auf Deutsch. Erklaere Felder verstaendlich, gib Tipps zu haeufigen Fehlern und schlage vor, was eingetragen werden koennte. Antworte in max. 3 Saetzen, es sei denn es ist mehr noetig.`;

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatPlainTextAsHtml(text) {
  return escapeHtml(text).replace(/\n/g, '<br/>');
}

async function loadApiKey() {
  if (apiKey) return apiKey;
  if (apiKeyLoadPromise) return apiKeyLoadPromise;

  apiKeyLoadPromise = fetch(chrome.runtime.getURL('api-key.txt'), { cache: 'no-store' })
    .then((res) => {
      if (!res.ok) {
        throw new Error(`api-key.txt konnte nicht geladen werden (HTTP ${res.status}).`);
      }
      return res.text();
    })
    .then((text) => {
      const key = text.trim();
      if (!key || key === 'PASTE_YOUR_GROQ_API_KEY_HERE') {
        throw new Error('api-key.txt ist leer oder enthaelt noch den Platzhalter.');
      }
      apiKey = key;
      apiKeyLoadError = '';
      return apiKey;
    })
    .catch((error) => {
      apiKey = '';
      apiKeyLoadError = error?.message || 'Unbekannter Fehler beim Laden von api-key.txt.';
      return '';
    })
    .finally(() => {
      // Allow re-tries if loading failed once or the file changed.
      apiKeyLoadPromise = null;
    });

  return apiKeyLoadPromise;
}
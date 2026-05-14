'use strict';

const PROVIDERS = Object.freeze({
  groq: {
    chatCompletionsUrl: 'https://api.groq.com/openai/v1/chat/completions',
    extraHeaders: {},
  },
  openrouter: {
    chatCompletionsUrl: 'https://openrouter.ai/api/v1/chat/completions',
    extraHeaders: {
      'HTTP-Referer': 'https://github.com/ujjwalmak/form-ai-assistant',
      'X-Title': 'FormAssist',
    },
  },
});

const REQUEST_TIMEOUT_MS = 25000;
const STREAM_TIMEOUT_MS = 40000;
const MAX_RETRIES = 2;
const RETRYABLE_STATUS = new Set([408, 409, 425, 429, 500, 502, 503, 504]);

// Fallback model used when Groq is rate-limited and we switch to OpenRouter
const OPENROUTER_FALLBACK_MODEL = 'meta-llama/llama-3.3-70b-instruct:free';

// Map legacy/invalid OpenRouter model IDs to real ones
const OPENROUTER_MODEL_REMAP = {
  'openrouter/free': 'openrouter/auto',
  'openrouter/owl-alpha': 'meta-llama/llama-3.3-70b-instruct:free',
};

function normalizeModelForProvider(model, provider) {
  if (normalizeProvider(provider) !== 'openrouter') return model;
  return OPENROUTER_MODEL_REMAP[model] || model;
}

function normalizeProvider(value) {
  return String(value || '').toLowerCase() === 'openrouter' ? 'openrouter' : 'groq';
}

function getStoredSync(keys) {
  return new Promise(resolve => chrome.storage.sync.get(keys, resolve));
}

async function resolveProviderKey(provider, messageKey) {
  const key = String(messageKey || '').trim();
  if (key) return key;

  const activeProvider = normalizeProvider(provider);
  const stored = await getStoredSync(['faApiKey', 'faGroqApiKey', 'faOpenRouterApiKey']);
  const storedKey = activeProvider === 'openrouter'
    ? stored.faOpenRouterApiKey
    : (stored.faGroqApiKey || stored.faApiKey);
  return String(storedKey || '').trim();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function backoffDelay(attempt, retryAfterHeader) {
  const retryAfterSeconds = Number(retryAfterHeader);
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    return Math.min(retryAfterSeconds * 1000, 12000);
  }
  return Math.min(500 * (2 ** attempt), 12000);
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchProviderWithRetry(provider, key, body, { stream = false } = {}) {
  const activeProvider = normalizeProvider(provider);
  const cfg = PROVIDERS[activeProvider];
  const resolvedKey = String(key || '').trim();
  if (!resolvedKey) {
    throw new Error(`API-Schlüssel für ${activeProvider === 'openrouter' ? 'OpenRouter' : 'Groq'} fehlt.`);
  }
  let lastError = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetchWithTimeout(
        cfg.chatCompletionsUrl,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resolvedKey}`,
            ...cfg.extraHeaders,
          },
          body: JSON.stringify(body),
        },
        stream ? STREAM_TIMEOUT_MS : REQUEST_TIMEOUT_MS
      );
      if (res.ok || !RETRYABLE_STATUS.has(res.status) || attempt === MAX_RETRIES) return res;
      await sleep(backoffDelay(attempt, res.headers.get('Retry-After')));
    } catch (err) {
      const isAbort = err?.name === 'AbortError';
      lastError = new Error(isAbort ? 'Zeitüberschreitung bei der API-Anfrage.' : (err?.message || 'Netzwerkfehler'));
      if (attempt === MAX_RETRIES) throw lastError;
      await sleep(backoffDelay(attempt));
    }
  }

  throw lastError || new Error('API-Anfrage fehlgeschlagen.');
}

async function readApiError(res) {
  const err = await res.json().catch(() => ({}));
  return err?.error?.message || `HTTP ${res.status}`;
}

// ── Keyboard command relay ────────────────────────────────────────────
chrome.commands.onCommand.addListener(async (command) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    chrome.tabs.sendMessage(tab.id, { type: command }).catch(() => {});
  }
});

// ── Non-streaming provider requests (Smart Fill, post-fill, etc.) ────
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  const isLegacyGroq = msg.type === 'groq-fetch';
  if (msg.type !== 'llm-fetch' && !isLegacyGroq) return false;

  const provider = isLegacyGroq ? 'groq' : msg.provider;

  (async () => {
    const key = await resolveProviderKey(provider, msg.key);
    const body = { ...msg.body, model: normalizeModelForProvider(msg.body?.model, provider) };
    let res = await fetchProviderWithRetry(provider, key, body);
    let usedFallback = false;

    if ((res.status === 429 || res.status >= 500) && normalizeProvider(provider) === 'groq') {
      const stored = await getStoredSync(['faOpenRouterApiKey']);
      const fbKey = String(stored.faOpenRouterApiKey || '').trim();
      if (fbKey) {
        const fbBody = { ...body, model: OPENROUTER_FALLBACK_MODEL };
        res = await fetchProviderWithRetry('openrouter', fbKey, fbBody);
        usedFallback = true;
      }
    }

    if (!res.ok) {
      sendResponse({ ok: false, error: await readApiError(res) });
    } else {
      const data = await res.json();
      sendResponse({ ok: true, data, usedFallback });
    }
  })().catch(err => sendResponse({ ok: false, error: err.message }));

  return true; // keep channel open for async response
});

// ── Streaming provider requests (chat with typing animation) ─────────
chrome.runtime.onConnect.addListener(port => {
  const isLegacyGroqPort = port.name === 'groq-stream';
  if (port.name !== 'llm-stream' && !isLegacyGroqPort) return;

  port.onMessage.addListener(async ({ key, body, provider }) => {
    try {
      const activeProvider = isLegacyGroqPort ? 'groq' : provider;
      const resolvedKey = await resolveProviderKey(activeProvider, key);
      const normBody = { ...body, model: normalizeModelForProvider(body?.model, activeProvider) };
      let res = await fetchProviderWithRetry(activeProvider, resolvedKey, normBody, { stream: true });

      if ((res.status === 429 || res.status >= 500) && normalizeProvider(activeProvider) === 'groq') {
        const stored = await getStoredSync(['faOpenRouterApiKey']);
        const fbKey = String(stored.faOpenRouterApiKey || '').trim();
        if (fbKey) {
          port.postMessage({ type: 'fallback' });
          const fbBody = { ...normBody, model: OPENROUTER_FALLBACK_MODEL };
          res = await fetchProviderWithRetry('openrouter', fbKey, fbBody, { stream: true });
        }
      }

      if (!res.ok) {
        port.postMessage({ type: 'error', error: await readApiError(res) });
        return;
      }
      if (!res.body) {
        port.postMessage({ type: 'error', error: 'Streaming-Antwort ohne Datenstrom.' });
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        port.postMessage({ type: 'chunk', chunk: decoder.decode(value, { stream: true }) });
      }
      port.postMessage({ type: 'done' });
    } catch (err) {
      port.postMessage({ type: 'error', error: err.message });
    }
  });
});

'use strict';

const $ = id => document.getElementById(id);

const PROVIDERS = Object.freeze({
  groq: {
    label: 'Groq',
    keyField: 'faGroqApiKey',
    keyPlaceholder: 'gsk_...',
    helpHtml: 'Groq API-Key unter <a href="https://console.groq.com" target="_blank">console.groq.com</a> erstellen.',
    modelsUrl: 'https://api.groq.com/openai/v1/models',
    defaultModel: 'llama-3.3-70b-versatile',
    models: [
      ['llama-3.3-70b-versatile', 'Llama 3.3 70B - Standard (empfohlen)'],
      ['llama-3.1-8b-instant', 'Llama 3.1 8B - Schnell & guenstig'],
      ['mixtral-8x7b-32768', 'Mixtral 8x7B - Langer Kontext'],
    ],
  },
  openrouter: {
    label: 'OpenRouter',
    keyField: 'faOpenRouterApiKey',
    keyPlaceholder: 'sk-or-v1-...',
    helpHtml: 'OpenRouter API-Key unter <a href="https://openrouter.ai/keys" target="_blank">openrouter.ai/keys</a> erstellen.',
    modelsUrl: 'https://openrouter.ai/api/v1/models',
    defaultModel: 'openrouter/auto',
    models: [
      ['openrouter/auto', 'Auto-Routing – bestes freies Modell (empfohlen)'],
      ['meta-llama/llama-3.3-70b-instruct:free', 'Llama 3.3 70B – kostenlos'],
      ['inclusionai/ring-2.6-1t:free', 'Ring 2.6 1T – kostenlos'],
      ['nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free', 'Nemotron 3 Nano Omni – kostenlos'],
      ['poolside/laguna-m.1:free', 'Laguna M.1 – kostenlos'],
    ],
  },
});

const normalizeProvider = value => String(value || '').toLowerCase() === 'openrouter' ? 'openrouter' : 'groq';
const normalizeAssistantMode = value => {
  const v = String(value || '').toLowerCase();
  if (v === 'classic') return 'classic';
  return 'context';
};

let savedKeys = {
  faApiKey: '',
  faGroqApiKey: '',
  faOpenRouterApiKey: '',
};
let savedModel = '';
let selectedProvider = 'groq';

function activeProvider() {
  return normalizeProvider($('provider').value);
}

function providerConfig(provider = activeProvider()) {
  return PROVIDERS[normalizeProvider(provider)];
}

function keyForProvider(provider = activeProvider()) {
  const cfg = providerConfig(provider);
  return savedKeys[cfg.keyField] || (provider === 'groq' ? savedKeys.faApiKey : '');
}

function updateModelOptions(provider = activeProvider(), preferredModel = savedModel) {
  const cfg = providerConfig(provider);
  $('model').replaceChildren(...cfg.models.map(([value, label]) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    return option;
  }));
  $('model').value = cfg.models.some(([value]) => value === preferredModel)
    ? preferredModel
    : cfg.defaultModel;
}

function updateProviderUi(provider = activeProvider(), { keepTypedKey = true } = {}) {
  const cfg = providerConfig(provider);
  if (keepTypedKey) {
    const previousCfg = providerConfig(selectedProvider);
    savedKeys[previousCfg.keyField] = $('apiKey').value.trim();
  }

  selectedProvider = provider;
  $('provider').value = provider;
  $('apiKeyLabel').textContent = `${cfg.label} API-Key`;
  $('apiKey').placeholder = cfg.keyPlaceholder;
  $('apiKey').value = keyForProvider(provider);
  $('providerHelp').innerHTML = cfg.helpHtml;
  $('keyStatus').textContent = '';
  $('keyStatus').className = 'status';
  updateModelOptions(provider);
}

async function validateKey() {
  const provider = activeProvider();
  const cfg = providerConfig(provider);
  const key = $('apiKey').value.trim();
  if (!key) return;

  $('keyStatus').textContent = 'Teste...';
  $('keyStatus').className = 'status';

  try {
    const res = await fetch(cfg.modelsUrl, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (res.ok) {
      $('keyStatus').textContent = 'API-Schluessel gueltig';
      $('keyStatus').className = 'status ok';
    } else {
      $('keyStatus').textContent = 'Ungueltiger API-Schluessel';
      $('keyStatus').className = 'status error';
    }
  } catch {
    $('keyStatus').textContent = 'Verbindungsfehler';
    $('keyStatus').className = 'status error';
  }
}

chrome.storage.sync.get(
  ['faProvider', 'faApiKey', 'faGroqApiKey', 'faOpenRouterApiKey', 'faModel', 'faAssistantMode'],
  ({ faProvider, faApiKey, faGroqApiKey, faOpenRouterApiKey, faModel, faAssistantMode }) => {
    savedKeys = {
      faApiKey: faApiKey || '',
      faGroqApiKey: faGroqApiKey || faApiKey || '',
      faOpenRouterApiKey: faOpenRouterApiKey || '',
    };
    savedModel = faModel || '';

    const provider = normalizeProvider(faProvider);
    selectedProvider = provider;
    $('provider').value = provider;
    $('assistantMode').value = normalizeAssistantMode(faAssistantMode);
    updateProviderUi(provider, { keepTypedKey: false });
  }
);

$('provider').addEventListener('change', e => {
  updateProviderUi(normalizeProvider(e.target.value));
});

$('toggleKey').addEventListener('click', () => {
  const inp = $('apiKey');
  const hidden = inp.type === 'password';
  inp.type = hidden ? 'text' : 'password';
  $('toggleKey').textContent = hidden ? 'Verbergen' : 'Anzeigen';
});

let validateTimer;
$('apiKey').addEventListener('input', () => {
  const cfg = providerConfig();
  savedKeys[cfg.keyField] = $('apiKey').value.trim();
  clearTimeout(validateTimer);
  $('keyStatus').textContent = '';
  $('keyStatus').className = 'status';
  if (!$('apiKey').value.trim()) return;
  validateTimer = setTimeout(validateKey, 600);
});

$('save').addEventListener('click', () => {
  const provider = activeProvider();
  const cfg = providerConfig(provider);
  const key = $('apiKey').value.trim();
  savedKeys[cfg.keyField] = key;

  const data = {
    faProvider: provider,
    faGroqApiKey: savedKeys.faGroqApiKey || '',
    faOpenRouterApiKey: savedKeys.faOpenRouterApiKey || '',
    faApiKey: provider === 'groq' ? key : (savedKeys.faGroqApiKey || ''),
    faModel: $('model').value || cfg.defaultModel,
    faAssistantMode: normalizeAssistantMode($('assistantMode').value),
  };

  chrome.storage.sync.set(data, () => {
    $('saveStatus').textContent = 'Gespeichert';
    $('saveStatus').className = 'save-status ok';
    setTimeout(() => {
      $('saveStatus').textContent = '';
      $('saveStatus').className = 'save-status';
    }, 2500);
  });
});

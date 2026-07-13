'use strict';

// PROVIDERS, normalizeProvider und normalizeAssistantMode kommen aus
// fa-providers.js (per <script> vor dieser Datei in options.html geladen)

const $ = id => document.getElementById(id);

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

  $('keyStatus').textContent = 'Teste…';
  $('keyStatus').className = 'status';

  try {
    const res = await fetch(cfg.modelsUrl, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (res.ok) {
      $('keyStatus').textContent = 'API-Schlüssel gültig';
      $('keyStatus').className = 'status ok';
    } else {
      $('keyStatus').textContent = 'Ungültiger API-Schlüssel';
      $('keyStatus').className = 'status error';
    }
  } catch {
    $('keyStatus').textContent = 'Verbindungsfehler';
    $('keyStatus').className = 'status error';
  }
}

chrome.storage.sync.get(
  ['faProvider', 'faApiKey', 'faGroqApiKey', 'faOpenRouterApiKey', 'faModel', 'faAssistantMode', 'faSupabaseUrl', 'faSupabaseKey'],
  ({ faProvider, faApiKey, faGroqApiKey, faOpenRouterApiKey, faModel, faAssistantMode, faSupabaseUrl, faSupabaseKey }) => {
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

    if (faSupabaseUrl) $('supabaseUrl').value = faSupabaseUrl;
    if (faSupabaseKey) $('supabaseKey').value = faSupabaseKey;
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

$('toggleSbKey').addEventListener('click', () => {
  const inp = $('supabaseKey');
  const hidden = inp.type === 'password';
  inp.type = hidden ? 'text' : 'password';
  $('toggleSbKey').textContent = hidden ? 'Verbergen' : 'Anzeigen';
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
    faSupabaseUrl: $('supabaseUrl').value.trim(),
    faSupabaseKey: $('supabaseKey').value.trim(),
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

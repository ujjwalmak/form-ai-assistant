'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// Provider-/Modell-Konfiguration — Single Source of Truth.
// Wird in drei Kontexten geladen: als Content-Script (manifest.json),
// in der Options-Seite (<script> in options.html) und im Service Worker
// (importScripts in background.js). Deshalb: keine DOM-/chrome-Zugriffe hier.
// ─────────────────────────────────────────────────────────────────────────────

const PROVIDERS = Object.freeze({
  groq: Object.freeze({
    label: 'Groq',
    chatCompletionsUrl: 'https://api.groq.com/openai/v1/chat/completions',
    modelsUrl: 'https://api.groq.com/openai/v1/models',
    extraHeaders: Object.freeze({}),
    keyField: 'faGroqApiKey',
    keyPlaceholder: 'gsk_...',
    helpHtml: 'Groq API-Key unter <a href="https://console.groq.com" target="_blank">console.groq.com</a> erstellen.',
    defaultModel: 'llama-3.3-70b-versatile',
    // Vision-Modell für den Dokument-Scan (Bild → Profilfelder)
    visionModel: 'meta-llama/llama-4-scout-17b-16e-instruct',
    models: Object.freeze([
      ['llama-3.3-70b-versatile', 'Llama 3.3 70B - Standard (empfohlen)'],
      ['llama-3.1-8b-instant', 'Llama 3.1 8B - Schnell & günstig'],
      ['mixtral-8x7b-32768', 'Mixtral 8x7B - Langer Kontext'],
    ]),
  }),
  openrouter: Object.freeze({
    label: 'OpenRouter',
    chatCompletionsUrl: 'https://openrouter.ai/api/v1/chat/completions',
    modelsUrl: 'https://openrouter.ai/api/v1/models',
    extraHeaders: Object.freeze({
      'HTTP-Referer': 'https://github.com/ujjwalmak/form-ai-assistant',
      'X-Title': 'FormAssist',
    }),
    keyField: 'faOpenRouterApiKey',
    keyPlaceholder: 'sk-or-v1-...',
    helpHtml: 'OpenRouter API-Key unter <a href="https://openrouter.ai/keys" target="_blank">openrouter.ai/keys</a> erstellen.',
    defaultModel: 'openrouter/auto',
    visionModel: 'meta-llama/llama-4-scout',
    models: Object.freeze([
      ['openrouter/auto', 'Auto-Routing – bestes freies Modell (empfohlen)'],
      ['meta-llama/llama-3.3-70b-instruct:free', 'Llama 3.3 70B – kostenlos'],
      ['inclusionai/ring-2.6-1t:free', 'Ring 2.6 1T – kostenlos'],
      ['nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free', 'Nemotron 3 Nano Omni – kostenlos'],
      ['poolside/laguna-m.1:free', 'Laguna M.1 – kostenlos'],
    ]),
  }),
});

// Fallback-Modell, wenn Groq ausfällt und automatisch auf OpenRouter gewechselt wird
const OPENROUTER_FALLBACK_MODEL = 'meta-llama/llama-3.3-70b-instruct:free';

// Vision-Requests dürfen beim Fallback nicht auf das text-only Standardmodell
// wechseln — sie schicken dieses Modell als eigenes fallbackModel mit
const VISION_FALLBACK_MODEL = 'meta-llama/llama-4-scout:free';

// Veraltete/ungültige OpenRouter-Modell-IDs auf reale mappen
const OPENROUTER_MODEL_REMAP = Object.freeze({
  'openrouter/free': 'openrouter/auto',
  'openrouter/owl-alpha': 'meta-llama/llama-3.3-70b-instruct:free',
});

function normalizeProvider(value) {
  return String(value || '').toLowerCase() === 'openrouter' ? 'openrouter' : 'groq';
}

function providerLabel(provider) {
  return PROVIDERS[normalizeProvider(provider)].label;
}

function getDefaultModel(provider) {
  return PROVIDERS[normalizeProvider(provider)].defaultModel;
}

function getVisionModel(provider) {
  return PROVIDERS[normalizeProvider(provider)].visionModel;
}

function normalizeModelForProvider(model, provider) {
  if (normalizeProvider(provider) !== 'openrouter') return model;
  return OPENROUTER_MODEL_REMAP[model] || model;
}

function normalizeAssistantMode(value) {
  const v = String(value || '').toLowerCase();
  if (v === 'context') return 'context';
  return 'classic'; // Default: „Mit Vorschau"
}

// ── Test export (Node/Vitest only; `module` is undefined in the browser) ──────
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    PROVIDERS, OPENROUTER_FALLBACK_MODEL, VISION_FALLBACK_MODEL, OPENROUTER_MODEL_REMAP,
    normalizeProvider, providerLabel, getDefaultModel, getVisionModel,
    normalizeModelForProvider, normalizeAssistantMode,
  };
}

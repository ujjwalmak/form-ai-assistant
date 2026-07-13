const {
  PROVIDERS,
  OPENROUTER_FALLBACK_MODEL,
  VISION_FALLBACK_MODEL,
  normalizeProvider,
  providerLabel,
  getDefaultModel,
  getVisionModel,
  normalizeModelForProvider,
  normalizeAssistantMode,
} = require('../../fa-providers.js');

describe('normalizeProvider', () => {
  it('liefert "openrouter" nur für den exakten (case-insensitiven) String', () => {
    expect(normalizeProvider('openrouter')).toBe('openrouter');
    expect(normalizeProvider('OPENROUTER')).toBe('openrouter');
  });

  it('fällt für alles andere auf "groq" zurück', () => {
    expect(normalizeProvider('groq')).toBe('groq');
    expect(normalizeProvider('')).toBe('groq');
    expect(normalizeProvider(null)).toBe('groq');
    expect(normalizeProvider(undefined)).toBe('groq');
    expect(normalizeProvider('irgendwas')).toBe('groq');
  });
});

describe('providerLabel / getDefaultModel / getVisionModel', () => {
  it('liefern die Werte aus der PROVIDERS-Konfiguration', () => {
    expect(providerLabel('groq')).toBe('Groq');
    expect(providerLabel('openrouter')).toBe('OpenRouter');
    expect(getDefaultModel('groq')).toBe(PROVIDERS.groq.defaultModel);
    expect(getDefaultModel('openrouter')).toBe(PROVIDERS.openrouter.defaultModel);
    expect(getVisionModel('groq')).toBe(PROVIDERS.groq.visionModel);
    expect(getVisionModel('openrouter')).toBe(PROVIDERS.openrouter.visionModel);
  });

  it('normalisieren unbekannte Provider auf groq', () => {
    expect(providerLabel('quatsch')).toBe('Groq');
    expect(getDefaultModel(undefined)).toBe(PROVIDERS.groq.defaultModel);
    expect(getVisionModel('')).toBe(PROVIDERS.groq.visionModel);
  });
});

describe('normalizeModelForProvider', () => {
  it('remappt veraltete OpenRouter-Modell-IDs', () => {
    expect(normalizeModelForProvider('openrouter/free', 'openrouter')).toBe('openrouter/auto');
    expect(normalizeModelForProvider('openrouter/owl-alpha', 'openrouter')).toBe(
      'meta-llama/llama-3.3-70b-instruct:free'
    );
  });

  it('reicht unbekannte Modelle für OpenRouter unverändert durch', () => {
    expect(
      normalizeModelForProvider('meta-llama/llama-3.3-70b-instruct:free', 'openrouter')
    ).toBe('meta-llama/llama-3.3-70b-instruct:free');
  });

  it('remappt NICHT, wenn der Provider groq ist', () => {
    expect(normalizeModelForProvider('openrouter/free', 'groq')).toBe('openrouter/free');
  });
});

describe('normalizeAssistantMode', () => {
  it('kennt nur "context" und fällt sonst auf "classic" zurück', () => {
    expect(normalizeAssistantMode('context')).toBe('context');
    expect(normalizeAssistantMode('CONTEXT')).toBe('context');
    expect(normalizeAssistantMode('classic')).toBe('classic');
    expect(normalizeAssistantMode('')).toBe('classic');
    expect(normalizeAssistantMode(null)).toBe('classic');
    expect(normalizeAssistantMode('foo')).toBe('classic');
  });
});

describe('PROVIDERS-Konfiguration', () => {
  it('enthält für jeden Provider die vollständigen Pflichtfelder', () => {
    for (const [id, cfg] of Object.entries(PROVIDERS)) {
      expect(cfg.label, id).toBeTruthy();
      expect(cfg.chatCompletionsUrl, id).toMatch(/^https:\/\//);
      expect(cfg.modelsUrl, id).toMatch(/^https:\/\//);
      expect(cfg.keyField, id).toMatch(/^fa/);
      expect(cfg.defaultModel, id).toBeTruthy();
      expect(cfg.visionModel, id).toBeTruthy();
      expect(Array.isArray(cfg.models), id).toBe(true);
      expect(cfg.models.length, id).toBeGreaterThan(0);
    }
  });

  it('listet das Default-Modell jeweils in der Modell-Auswahl', () => {
    for (const [id, cfg] of Object.entries(PROVIDERS)) {
      expect(cfg.models.map(([value]) => value), id).toContain(cfg.defaultModel);
    }
  });

  it('Fallback-Modelle sind nicht-leere Strings', () => {
    expect(typeof OPENROUTER_FALLBACK_MODEL).toBe('string');
    expect(OPENROUTER_FALLBACK_MODEL).not.toBe('');
    expect(typeof VISION_FALLBACK_MODEL).toBe('string');
    expect(VISION_FALLBACK_MODEL).not.toBe('');
  });

  it('ist eingefroren (Object.freeze) — Konfiguration ist unveränderlich', () => {
    expect(Object.isFrozen(PROVIDERS)).toBe(true);
    expect(Object.isFrozen(PROVIDERS.groq)).toBe(true);
    expect(Object.isFrozen(PROVIDERS.openrouter.extraHeaders)).toBe(true);
  });
});

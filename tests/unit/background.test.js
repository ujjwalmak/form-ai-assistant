const {
  normalizeProvider,
  normalizeModelForProvider,
  backoffDelay,
  resolveFallbackModel,
  OPENROUTER_FALLBACK_MODEL,
} = require('../../background.js');

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

describe('resolveFallbackModel', () => {
  it('nutzt das mitgeschickte Fallback-Modell (z. B. Vision-Requests)', () => {
    expect(resolveFallbackModel('meta-llama/llama-4-scout:free')).toBe('meta-llama/llama-4-scout:free');
    expect(resolveFallbackModel('  x  ')).toBe('x');
  });

  it('fällt ohne Angabe auf das Standard-Fallback-Modell zurück', () => {
    expect(resolveFallbackModel('')).toBe(OPENROUTER_FALLBACK_MODEL);
    expect(resolveFallbackModel(null)).toBe(OPENROUTER_FALLBACK_MODEL);
    expect(resolveFallbackModel(undefined)).toBe(OPENROUTER_FALLBACK_MODEL);
  });
});

describe('backoffDelay', () => {
  it('nutzt exponentielles Backoff, gedeckelt bei 12s', () => {
    expect(backoffDelay(0)).toBe(500);
    expect(backoffDelay(1)).toBe(1000);
    expect(backoffDelay(2)).toBe(2000);
    expect(backoffDelay(10)).toBe(12000); // Deckel
  });

  it('berücksichtigt einen gültigen Retry-After-Header (Sekunden)', () => {
    expect(backoffDelay(0, '5')).toBe(5000);
    expect(backoffDelay(0, 5)).toBe(5000);
  });

  it('deckelt Retry-After bei 12s', () => {
    expect(backoffDelay(0, '100')).toBe(12000);
  });

  it('fällt bei ungültigem/null Retry-After auf Exponential zurück', () => {
    expect(backoffDelay(3, 'abc')).toBe(4000);
    expect(backoffDelay(0, '0')).toBe(500);
    expect(backoffDelay(0, '-5')).toBe(500);
  });
});

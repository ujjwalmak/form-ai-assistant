// normalizeProvider/normalizeModelForProvider liegen seit dem Modul-Split in
// fa-providers.js (siehe fa-providers.test.js) — hier nur noch der Transport
const {
  backoffDelay,
  resolveFallbackModel,
} = require('../../background.js');
const { OPENROUTER_FALLBACK_MODEL } = require('../../fa-providers.js');

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

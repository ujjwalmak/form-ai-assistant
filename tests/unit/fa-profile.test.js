const { PROFILE_FIELDS, FAKE_DATA } = require('../../fa-profile.js');

// Die erwarteten 15 Standard-Profilfelder (Person, Adresse, Bank, Beruf).
const EXPECTED_KEYS = [
  'firstName', 'lastName', 'email', 'phone', 'birthdate', 'birthplace',
  'nationality', 'street', 'zip', 'city', 'country', 'iban', 'bic',
  'company', 'jobTitle',
];

describe('PROFILE_FIELDS — Struktur', () => {
  it('enthält genau 15 Felder', () => {
    expect(PROFILE_FIELDS).toHaveLength(15);
  });

  it('hat die erwarteten Keys in fester Reihenfolge', () => {
    expect(PROFILE_FIELDS.map(f => f.key)).toEqual(EXPECTED_KEYS);
  });

  it('hat ausschließlich eindeutige Keys', () => {
    const keys = PROFILE_FIELDS.map(f => f.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('jedes Feld hat key, nicht-leeres label, ac-Array und nicht-leeres kw-Array', () => {
    for (const f of PROFILE_FIELDS) {
      expect(typeof f.key).toBe('string');
      expect(f.key.length).toBeGreaterThan(0);
      expect(typeof f.label).toBe('string');
      expect(f.label.length).toBeGreaterThan(0);
      expect(Array.isArray(f.ac)).toBe(true);
      expect(Array.isArray(f.kw)).toBe(true);
      expect(f.kw.length).toBeGreaterThan(0);
    }
  });
});

describe('PROFILE_FIELDS — matchProfile-Vertrag', () => {
  // matchProfile() lowercased Label und autocomplete vor dem includes-Vergleich
  // (fa-scanner.js). Großgeschriebene Keywords/ac-Werte könnten nie matchen.
  it('alle Keywords sind lowercase', () => {
    for (const f of PROFILE_FIELDS) {
      for (const k of f.kw) {
        expect(k).toBe(k.toLowerCase());
      }
    }
  });

  it('alle autocomplete-Werte sind lowercase', () => {
    for (const f of PROFILE_FIELDS) {
      for (const a of f.ac) {
        expect(a).toBe(a.toLowerCase());
      }
    }
  });

  it('jedes Feld trägt ein deutsches Keyword (Behörden-Fokus)', () => {
    // Mindestens ein Keyword je Feld enthält einen Umlaut/ß oder ist ein
    // gängiges deutsches Formularwort — Stichprobe gegen versehentliche
    // Reduktion auf reines Englisch.
    const germanSamples = {
      firstName: 'vorname', lastName: 'nachname', zip: 'postleitzahl',
      city: 'stadt', country: 'land', nationality: 'staatsangehörigkeit',
    };
    for (const [key, word] of Object.entries(germanSamples)) {
      const field = PROFILE_FIELDS.find(f => f.key === key);
      expect(field.kw).toContain(word);
    }
  });
});

describe('FAKE_DATA', () => {
  it('liefert für jedes Profilfeld einen nicht-leeren Wert', () => {
    for (const f of PROFILE_FIELDS) {
      expect(typeof FAKE_DATA[f.key]).toBe('string');
      expect(FAKE_DATA[f.key].length).toBeGreaterThan(0);
    }
  });

  it('enthält keine Keys außerhalb von PROFILE_FIELDS', () => {
    const profileKeys = new Set(PROFILE_FIELDS.map(f => f.key));
    for (const key of Object.keys(FAKE_DATA)) {
      expect(profileKeys.has(key)).toBe(true);
    }
  });
});

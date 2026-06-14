const {
  clean,
  formatBytes,
  parseDateToISO,
  parseRelativeDate,
  isKendoWidget,
  getAgentSelector,
} = require('../../fa-utils.js');

describe('clean', () => {
  it('gibt "" für null/undefined zurück', () => {
    expect(clean(null)).toBe('');
    expect(clean(undefined)).toBe('');
    expect(clean('')).toBe('');
  });

  it('reduziert internen Whitespace und trimmt', () => {
    expect(clean('  a   b\tc\n d ')).toBe('a b c d');
    expect(clean('hallo')).toBe('hallo');
  });
});

describe('formatBytes', () => {
  it('gibt "" für nicht-positive / ungültige Werte zurück', () => {
    expect(formatBytes(0)).toBe('');
    expect(formatBytes(-5)).toBe('');
    expect(formatBytes(NaN)).toBe('');
    expect(formatBytes('abc')).toBe('');
  });

  it('formatiert >= 1 MB gerundet in MB', () => {
    expect(formatBytes(1024 * 1024)).toBe('1 MB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5 MB');
  });

  it('gibt Bytes für Sub-MB-Werte zurück', () => {
    expect(formatBytes(500)).toBe('500 B');
  });
});

describe('parseDateToISO', () => {
  it('DD.MM.YYYY → ISO inkl. Zero-Padding', () => {
    expect(parseDateToISO('1.2.2000')).toBe('2000-02-01');
    expect(parseDateToISO('20.02.2000')).toBe('2000-02-20');
  });

  it('MM/DD/YYYY → ISO', () => {
    expect(parseDateToISO('02/20/2000')).toBe('2000-02-20');
  });

  it('DD-MM-YYYY → ISO', () => {
    expect(parseDateToISO('20-02-2000')).toBe('2000-02-20');
  });

  it('YYYY/MM/DD → ISO', () => {
    expect(parseDateToISO('2000/2/5')).toBe('2000-02-05');
  });

  it('YYYY-M-D → zero-padded ISO', () => {
    expect(parseDateToISO('2000-2-5')).toBe('2000-02-05');
  });

  it('gibt null für nicht parsebare Eingaben zurück', () => {
    expect(parseDateToISO('kein datum')).toBeNull();
    expect(parseDateToISO('2000')).toBeNull();
    expect(parseDateToISO('')).toBeNull();
  });
});

describe('parseRelativeDate', () => {
  const iso = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-14T12:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('gibt null für leere Eingaben zurück', () => {
    expect(parseRelativeDate('')).toBeNull();
    expect(parseRelativeDate(null)).toBeNull();
  });

  it('heute / today / ab sofort', () => {
    expect(iso(parseRelativeDate('heute'))).toBe('2026-06-14');
    expect(iso(parseRelativeDate('today'))).toBe('2026-06-14');
    expect(iso(parseRelativeDate('ab sofort'))).toBe('2026-06-14');
  });

  it('morgen / tomorrow / übermorgen', () => {
    expect(iso(parseRelativeDate('morgen'))).toBe('2026-06-15');
    expect(iso(parseRelativeDate('tomorrow'))).toBe('2026-06-15');
    expect(iso(parseRelativeDate('übermorgen'))).toBe('2026-06-16');
  });

  it('nächste Woche / next week', () => {
    expect(iso(parseRelativeDate('nächste woche'))).toBe('2026-06-21');
    expect(iso(parseRelativeDate('next week'))).toBe('2026-06-21');
  });

  it('nächster Monat / nächstes Jahr', () => {
    expect(iso(parseRelativeDate('nächster monat'))).toBe('2026-07-14');
    expect(iso(parseRelativeDate('nächstes jahr'))).toBe('2027-06-14');
  });

  it('in N Einheiten (DE + EN)', () => {
    expect(iso(parseRelativeDate('in 3 tagen'))).toBe('2026-06-17');
    expect(iso(parseRelativeDate('in 2 wochen'))).toBe('2026-06-28');
    expect(iso(parseRelativeDate('in 2 weeks'))).toBe('2026-06-28');
    expect(iso(parseRelativeDate('in 1 monat'))).toBe('2026-07-14');
  });

  it('entfernt führende Präpositionen (am/ab/on/by)', () => {
    expect(iso(parseRelativeDate('ab morgen'))).toBe('2026-06-15');
  });

  it('gibt null für absolute / unbekannte Texte zurück', () => {
    expect(parseRelativeDate('20.02.2000')).toBeNull();
  });
});

describe('isKendoWidget', () => {
  const elWith = (role) => ({ getAttribute: (a) => (a === 'data-role' ? role : null) });

  it('mappt "dropdown" → "dropdownlist"', () => {
    expect(isKendoWidget(elWith('dropdown'))).toBe('dropdownlist');
  });

  it('erkennt gültige Rollen (case-insensitive)', () => {
    expect(isKendoWidget(elWith('datepicker'))).toBe('datepicker');
    expect(isKendoWidget(elWith('DatePicker'))).toBe('datepicker');
    expect(isKendoWidget(elWith('multiselect'))).toBe('multiselect');
  });

  it('gibt null für unbekannte Rolle zurück', () => {
    expect(isKendoWidget(elWith('banana'))).toBeNull();
  });

  it('gibt null ohne data-role oder ohne Element zurück', () => {
    expect(isKendoWidget(elWith(null))).toBeNull();
    expect(isKendoWidget(null)).toBeNull();
  });
});

describe('getAgentSelector', () => {
  it('bevorzugt die id', () => {
    const el = document.createElement('input');
    el.id = 'foo';
    expect(getAgentSelector(el)).toBe('[id="foo"]');
  });

  it('fällt auf name zurück', () => {
    const el = document.createElement('input');
    el.setAttribute('name', 'bar');
    expect(getAgentSelector(el)).toBe('[name="bar"]');
  });

  it('vergibt einen stabilen data-fa-selector-id, wenn weder id noch name existieren', () => {
    const el = document.createElement('input');
    const sel = getAgentSelector(el);
    expect(sel).toMatch(/^\[data-fa-selector-id="fa-[0-9a-z]+"\]$/);
    // zweiter Aufruf liefert denselben Selektor
    expect(getAgentSelector(el)).toBe(sel);
  });

  it('gibt "" für null zurück', () => {
    expect(getAgentSelector(null)).toBe('');
  });
});

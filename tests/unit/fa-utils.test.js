const {
  clean,
  formatBytes,
  parseDateToISO,
  parseRelativeDate,
  isKendoWidget,
  getAgentSelector,
  isValidIBAN,
  isValidBIC,
  isValidEmail,
  isValidGermanZip,
  isValidPhone,
  getBirthdateIssue,
  labelHasKeyword,
  detectLiveCheckKind,
  getLiveCheckResult,
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

// ── Live-Validierung (deterministisch) ───────────────────────────────────────

describe('isValidIBAN', () => {
  it('akzeptiert gültige IBANs (mod-97-Prüfsumme)', () => {
    expect(isValidIBAN('DE89370400440532013000')).toBe(true);
    expect(isValidIBAN('AT611904300234573201')).toBe(true);
    expect(isValidIBAN('GB29NWBK60161331926819')).toBe(true);
  });

  it('toleriert Leerzeichen und Kleinschreibung', () => {
    expect(isValidIBAN('de89 3704 0044 0532 0130 00')).toBe(true);
  });

  it('erkennt kaputte Prüfsummen', () => {
    expect(isValidIBAN('DE89370400440532013001')).toBe(false);
    expect(isValidIBAN('DE00370400440532013000')).toBe(false);
  });

  it('erkennt falsche Länge für bekannte Länder', () => {
    expect(isValidIBAN('DE893704004405320130')).toBe(false); // 20 statt 22
  });

  it('lehnt Format-Müll ab', () => {
    expect(isValidIBAN('')).toBe(false);
    expect(isValidIBAN('1234')).toBe(false);
    expect(isValidIBAN('XXDE89370400440532013000')).toBe(false);
  });
});

describe('isValidBIC', () => {
  it('akzeptiert 8- und 11-stellige BICs', () => {
    expect(isValidBIC('COBADEFF')).toBe(true);
    expect(isValidBIC('COBADEFFXXX')).toBe(true);
    expect(isValidBIC('MARKDEF1100')).toBe(true);
  });

  it('lehnt falsche Längen und Ziffern im Bankcode ab', () => {
    expect(isValidBIC('COBADEFFXX')).toBe(false);  // 10 Stellen
    expect(isValidBIC('C0BADEFF')).toBe(false);    // Ziffer im Bankcode
    expect(isValidBIC('')).toBe(false);
  });
});

describe('isValidEmail', () => {
  it('akzeptiert übliche Adressen', () => {
    expect(isValidEmail('max@web.de')).toBe(true);
    expect(isValidEmail('max.mustermann+tag@sub.example.co.uk')).toBe(true);
  });

  it('lehnt kaputte Adressen ab', () => {
    expect(isValidEmail('max@web')).toBe(false);
    expect(isValidEmail('max mustermann@web.de')).toBe(false);
    expect(isValidEmail('@web.de')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });
});

describe('isValidGermanZip', () => {
  it('akzeptiert genau 5 Ziffern', () => {
    expect(isValidGermanZip('80331')).toBe(true);
    expect(isValidGermanZip(' 80331 ')).toBe(true);
  });

  it('lehnt alles andere ab', () => {
    expect(isValidGermanZip('8033')).toBe(false);
    expect(isValidGermanZip('803311')).toBe(false);
    expect(isValidGermanZip('ABCDE')).toBe(false);
  });
});

describe('isValidPhone', () => {
  it('akzeptiert übliche Schreibweisen', () => {
    expect(isValidPhone('+49 170 1234567')).toBe(true);
    expect(isValidPhone('089/123456')).toBe(true);
    expect(isValidPhone('+49 (0)89 123-456')).toBe(true);
  });

  it('lehnt zu kurze/zu lange Nummern und Buchstaben ab', () => {
    expect(isValidPhone('12345')).toBe(false);
    expect(isValidPhone('123456789012345678')).toBe(false);
    expect(isValidPhone('ruf mich an')).toBe(false);
  });
});

describe('getBirthdateIssue', () => {
  it('liefert "" für plausible Geburtsdaten (DE- und ISO-Format)', () => {
    expect(getBirthdateIssue('01.01.1990')).toBe('');
    expect(getBirthdateIssue('1990-01-01')).toBe('');
  });

  it('meldet Zukunftsdaten', () => {
    expect(getBirthdateIssue('01.01.2050')).toMatch(/Zukunft/);
  });

  it('meldet unrealistisch alte Daten (> 120 Jahre)', () => {
    expect(getBirthdateIssue('01.01.1890')).toMatch(/120/);
  });

  it('liefert null für nicht parsebare Werte', () => {
    expect(getBirthdateIssue('kein datum')).toBe(null);
  });
});

describe('labelHasKeyword', () => {
  it('matcht Keywords am Wortanfang', () => {
    expect(labelHasKeyword('Telefonnummer', 'tel')).toBe(true);
    expect(labelHasKeyword('E-Mail-Adresse', 'mail')).toBe(true);
  });

  it('matcht NICHT mitten im Wort ("Stelle", "Hotel")', () => {
    expect(labelHasKeyword('Stellenbezeichnung', 'tel')).toBe(false);
    expect(labelHasKeyword('Hotel', 'tel')).toBe(false);
  });
});

describe('detectLiveCheckKind', () => {
  it('nutzt Input-Typ und autocomplete vor dem Label', () => {
    expect(detectLiveCheckKind('Kontakt', 'email', '')).toBe('email');
    expect(detectLiveCheckKind('Rückruf unter', 'tel', '')).toBe('phone');
    expect(detectLiveCheckKind('Wann geboren?', 'text', 'bday')).toBe('birthdate');
  });

  it('erkennt Felder am Label', () => {
    expect(detectLiveCheckKind('IBAN', 'text', '')).toBe('iban');
    expect(detectLiveCheckKind('BIC / SWIFT', 'text', '')).toBe('bic');
    expect(detectLiveCheckKind('Postleitzahl', 'text', '')).toBe('zip-de');
    expect(detectLiveCheckKind('Geburtsdatum', 'date', '')).toBe('birthdate');
  });

  it('liefert "" für Felder ohne Prüfregel', () => {
    expect(detectLiveCheckKind('Nachname', 'text', '')).toBe('');
    expect(detectLiveCheckKind('Stellenbezeichnung', 'text', '')).toBe('');
  });
});

describe('getLiveCheckResult', () => {
  it('hält sich beim Tippen zurück (unvollständige Werte → null)', () => {
    expect(getLiveCheckResult('iban', 'DE89')).toBe(null);
    expect(getLiveCheckResult('email', 'max@')).toBe(null);
    expect(getLiveCheckResult('zip-de', '8033')).toBe(null);
    expect(getLiveCheckResult('birthdate', '01.01.')).toBe(null);
  });

  it('bewertet unvollständige Werte bei final=true streng', () => {
    expect(getLiveCheckResult('iban', 'DE89', { final: true })).toEqual(
      expect.objectContaining({ ok: false })
    );
    expect(getLiveCheckResult('email', 'max@web', { final: true })).toEqual(
      expect.objectContaining({ ok: false })
    );
    expect(getLiveCheckResult('birthdate', 'bald', { final: true })).toEqual(
      expect.objectContaining({ ok: false })
    );
  });

  it('bestätigt gültige Werte positiv', () => {
    expect(getLiveCheckResult('iban', 'DE89 3704 0044 0532 0130 00').ok).toBe(true);
    expect(getLiveCheckResult('email', 'max@web.de').ok).toBe(true);
    expect(getLiveCheckResult('zip-de', '80331').ok).toBe(true);
    expect(getLiveCheckResult('birthdate', '01.01.1990').ok).toBe(true);
  });

  it('meldet ungültige komplette Werte mit deutscher Meldung', () => {
    const res = getLiveCheckResult('iban', 'DE89370400440532013001');
    expect(res.ok).toBe(false);
    expect(res.msg).toMatch(/IBAN/);
  });

  it('liefert null ohne kind oder ohne Wert', () => {
    expect(getLiveCheckResult('', 'x')).toBe(null);
    expect(getLiveCheckResult('iban', '')).toBe(null);
    expect(getLiveCheckResult('iban', '   ')).toBe(null);
  });
});

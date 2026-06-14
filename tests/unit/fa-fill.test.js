const { fillField, normalizeTemporalValue } = require('../../fa-fill.js');

afterEach(() => { document.body.innerHTML = ''; });

describe('normalizeTemporalValue', () => {
  it('date: DD.MM.YYYY → ISO', () => {
    expect(normalizeTemporalValue('date', '01.01.1990')).toBe('1990-01-01');
  });

  it('month: MM.YYYY → YYYY-MM', () => {
    expect(normalizeTemporalValue('month', '02.2027')).toBe('2027-02');
  });

  it('month: bereits YYYY-M → zero-padded', () => {
    expect(normalizeTemporalValue('month', '2027-2')).toBe('2027-02');
  });

  it('time: H:MM → HH:MM', () => {
    expect(normalizeTemporalValue('time', '9:05')).toBe('09:05');
  });

  it('gibt null für nicht-temporale Typen zurück', () => {
    expect(normalizeTemporalValue('text', '01.01.1990')).toBeNull();
  });
});

describe('fillField', () => {
  it('Textfeld: setzt den Wert und feuert input + change', () => {
    document.body.innerHTML = `<input id="x" type="text">`;
    const el = document.getElementById('x');
    const events = [];
    el.addEventListener('input', () => events.push('input'));
    el.addEventListener('change', () => events.push('change'));

    fillField(el, 'hallo welt');

    expect(el.value).toBe('hallo welt');
    expect(events).toEqual(['input', 'change']);
  });

  it('Datumsfeld: DD.MM.YYYY wird zu ISO normalisiert', () => {
    document.body.innerHTML = `<input id="x" type="date">`;
    const el = document.getElementById('x');
    fillField(el, '01.01.1990');
    expect(el.value).toBe('1990-01-01');
  });

  it('Select: matcht die Option per Text (case-insensitive)', () => {
    document.body.innerHTML =
      `<select id="s"><option value="de">Deutschland</option><option value="at">Österreich</option></select>`;
    const el = document.getElementById('s');
    fillField(el, 'deutschland');
    expect(el.value).toBe('de');
  });

  it('Checkbox: "ja" kreuzt an, "nein" wählt ab', () => {
    document.body.innerHTML = `<input id="c" type="checkbox">`;
    const el = document.getElementById('c');
    fillField(el, 'ja');
    expect(el.checked).toBe(true);
    fillField(el, 'nein');
    expect(el.checked).toBe(false);
  });

  it('Radio: wählt die richtige Option anhand des Labels', () => {
    document.body.innerHTML =
      `<label><input type="radio" name="g" value="m"> Männlich</label>` +
      `<label><input type="radio" name="g" value="w"> Weiblich</label>`;
    const first = document.querySelector('input[value="m"]');

    fillField(first, 'Weiblich');

    expect(document.querySelector('input[value="w"]').checked).toBe(true);
    expect(document.querySelector('input[value="m"]').checked).toBe(false);
  });
});

const { fillField, normalizeTemporalValue, findSelectOption, normalizeDecimalString } = require('../../fa-fill.js');

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

// ── Robustheit: Select-Priorität, Multi-Select, Zahlen, maxlength ────────────

describe('findSelectOption — priorisierte Suche', () => {
  function makeSelect(pairs, attrs = '') {
    document.body.innerHTML = `<select ${attrs}>` +
      pairs.map(([text, value]) => `<option value="${value}">${text}</option>`).join('') +
      `</select>`;
    return document.querySelector('select');
  }

  it('exakter Wert schlägt Teilstring — "DE" greift nicht in "Niederlande"', () => {
    const sel = makeSelect([['Niederlande', 'NL'], ['Deutschland', 'DE']]);
    expect(findSelectOption(sel.options, 'DE').value).toBe('DE');
  });

  it('exaktes Label schlägt Wortanfang', () => {
    const sel = makeSelect([['Deutschland (alt)', 'x'], ['Deutschland', 'de']]);
    expect(findSelectOption(sel.options, 'Deutschland').value).toBe('de');
  });

  it('Kürzel unter 3 Zeichen matchen nur exakt (kein Zufallstreffer)', () => {
    const sel = makeSelect([['Niederlande', 'NL'], ['Belgien', 'BE']]);
    expect(findSelectOption(sel.options, 'de')).toBeNull();
  });

  it('umgekehrtes Enthalten: "Herr Dr." findet Option "Herr"', () => {
    const sel = makeSelect([['Frau', 'f'], ['Herr', 'm']]);
    expect(findSelectOption(sel.options, 'Herr Dr.').value).toBe('m');
  });

  it('gibt null für leere Eingaben zurück', () => {
    const sel = makeSelect([['Frau', 'f']]);
    expect(findSelectOption(sel.options, '')).toBeNull();
    expect(findSelectOption(sel.options, null)).toBeNull();
  });
});

describe('normalizeDecimalString', () => {
  it('wandelt deutsche Schreibweisen um', () => {
    expect(normalizeDecimalString('1.234,56')).toBe('1234.56');
    expect(normalizeDecimalString('3,5')).toBe('3.5');
    expect(normalizeDecimalString('10.000')).toBe('10000');
    expect(normalizeDecimalString('-1.234,5')).toBe('-1234.5');
  });

  it('lässt US-/ISO-Schreibweise und Nicht-Zahlen unangetastet (null)', () => {
    expect(normalizeDecimalString('1234.56')).toBe(null);
    expect(normalizeDecimalString('42')).toBe(null);
    expect(normalizeDecimalString('abc')).toBe(null);
  });
});

describe('fillField — Multi-Select, Zahlen, maxlength', () => {
  it('wählt bei <select multiple> alle genannten Optionen', () => {
    document.body.innerHTML =
      `<select multiple>` +
      `<option value="de">Deutsch</option><option value="en">Englisch</option><option value="fr">Französisch</option>` +
      `</select>`;
    const sel = document.querySelector('select');
    fillField(sel, 'Deutsch, Englisch');
    const selected = Array.from(sel.selectedOptions).map(o => o.value);
    expect(selected).toEqual(['de', 'en']);
  });

  it('füllt type=number mit deutschem Dezimalkomma korrekt', () => {
    document.body.innerHTML = `<input type="number" step="0.01" id="x">`;
    const el = document.getElementById('x');
    fillField(el, '1.234,56');
    expect(el.value).toBe('1234.56');
  });

  it('kappt Text auf maxlength (programmatisches Setzen umgeht die Browser-Grenze)', () => {
    document.body.innerHTML = `<input id="x" maxlength="5">`;
    const el = document.getElementById('x');
    fillField(el, 'München');
    expect(el.value).toBe('Münch');
  });
});

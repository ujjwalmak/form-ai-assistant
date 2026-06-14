const { getLabel, matchProfile, extractField } = require('../../fa-scanner.js');

afterEach(() => { document.body.innerHTML = ''; });

describe('getLabel — Prioritätsreihenfolge', () => {
  it('aria-label hat Vorrang vor placeholder', () => {
    document.body.innerHTML = `<input id="x" aria-label="E-Mail-Adresse" placeholder="ignoriert">`;
    expect(getLabel(document.getElementById('x'))).toBe('E-Mail-Adresse');
  });

  it('findet label[for=…]', () => {
    document.body.innerHTML = `<label for="x">Vorname</label><input id="x">`;
    expect(getLabel(document.getElementById('x'))).toBe('Vorname');
  });

  it('findet ein umschließendes <label>', () => {
    document.body.innerHTML = `<label>Nachname <input id="x"></label>`;
    expect(getLabel(document.getElementById('x'))).toBe('Nachname');
  });

  it('fällt auf placeholder zurück', () => {
    document.body.innerHTML = `<input id="x" placeholder="Stadt">`;
    expect(getLabel(document.getElementById('x'))).toBe('Stadt');
  });

  it('macht aus name/id einen lesbaren Text (camelCase → Wörter)', () => {
    document.body.innerHTML = `<input id="ignored" name="firstName">`;
    expect(getLabel(document.querySelector('input'))).toBe('first Name');
  });

  it('gibt "" zurück, wenn nichts identifizierbar ist', () => {
    document.body.innerHTML = `<input>`;
    expect(getLabel(document.querySelector('input'))).toBe('');
  });
});

describe('matchProfile', () => {
  const profile = { firstName: 'Max', email: 'a@b.de', zip: '10115' };

  it('matcht per autocomplete-Attribut', () => {
    document.body.innerHTML = `<input id="x" autocomplete="email">`;
    expect(matchProfile(document.getElementById('x'), profile)?.key).toBe('email');
  });

  it('matcht per Keyword im Label', () => {
    document.body.innerHTML = `<label for="x">Postleitzahl</label><input id="x">`;
    expect(matchProfile(document.getElementById('x'), profile)?.key).toBe('zip');
  });

  it('ignoriert Felder, deren Profilwert leer/nicht gesetzt ist', () => {
    document.body.innerHTML = `<label for="x">Nachname</label><input id="x">`;
    expect(matchProfile(document.getElementById('x'), profile)).toBeNull();
  });

  it('gibt null ohne Element zurück', () => {
    expect(matchProfile(null, profile)).toBeNull();
  });
});

describe('extractField', () => {
  it('ignoriert hidden- und submit-Inputs', () => {
    document.body.innerHTML = `<input type="hidden" id="h" value="x"><input type="submit" id="s">`;
    expect(extractField(document.getElementById('h'))).toBeNull();
    expect(extractField(document.getElementById('s'))).toBeNull();
  });

  it('liefert ein vollständiges Feldobjekt für ein normales Textfeld', () => {
    document.body.innerHTML = `<label for="x">E-Mail</label><input id="x" type="email" required>`;
    const f = extractField(document.getElementById('x'));
    expect(f).not.toBeNull();
    expect(f.label).toBe('E-Mail');
    expect(f.type).toBe('email');
    expect(f.required).toBe(true);
    expect(f.selector).toBe('[id="x"]');
  });

  it('sammelt die Optionen eines <select> (ohne leere)', () => {
    document.body.innerHTML =
      `<label for="c">Land</label><select id="c">` +
      `<option value="">--</option><option value="de">Deutschland</option><option value="at">Österreich</option>` +
      `</select>`;
    const f = extractField(document.getElementById('c'));
    expect(f.type).toBe('select');
    expect(f.options).toEqual(['Deutschland', 'Österreich']);
  });

  it('gibt null für nicht sichtbare Felder zurück (display:none)', () => {
    document.body.innerHTML = `<label for="x">Name</label><input id="x" style="display:none">`;
    expect(extractField(document.getElementById('x'))).toBeNull();
  });
});

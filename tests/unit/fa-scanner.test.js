const { getLabel, getHint, matchProfile, extractField, extractRichContext } = require('../../fa-scanner.js');

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

// ── Robustheit: Shadow DOM, Tabellen-Layouts, Fehl-Match-Schutz ──────────────

describe('getLabel — Shadow DOM & Tabellen-Layouts', () => {
  it('findet label[for=…] innerhalb eines ShadowRoot', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const sr = host.attachShadow({ mode: 'open' });
    sr.innerHTML = `<label for="x">Kundennummer</label><input id="x">`;
    expect(getLabel(sr.querySelector('input'))).toBe('Kundennummer');
  });

  it('löst aria-describedby innerhalb eines ShadowRoot auf (getHint)', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const sr = host.attachShadow({ mode: 'open' });
    sr.innerHTML = `<input id="x" aria-describedby="h"><span id="h">Format: TT.MM.JJJJ</span>`;
    expect(getHint(sr.querySelector('input'))).toBe('Format: TT.MM.JJJJ');
  });

  it('nutzt die linke Tabellenzelle als Label (Legacy-/Behörden-Layouts)', () => {
    document.body.innerHTML =
      `<table><tbody><tr><td>Steuernummer</td><td><input id="x"></td></tr></tbody></table>`;
    expect(getLabel(document.getElementById('x'))).toBe('Steuernummer');
  });

  it('Tabellenzelle greift nicht, wenn die Vorzelle selbst ein Feld enthält', () => {
    document.body.innerHTML =
      `<table><tbody><tr><td><input id="a" name="street"></td><td><input id="b" name="zipCode"></td></tr></tbody></table>`;
    expect(getLabel(document.getElementById('b'))).toBe('zip Code');
  });
});

describe('matchProfile — Fehl-Match-Schutz (Wortanfang statt Substring)', () => {
  it('"Hotelname" ist KEIN Telefonfeld ("tel" mitten im Wort)', () => {
    document.body.innerHTML = `<label for="x">Hotelname</label><input id="x">`;
    expect(matchProfile(document.getElementById('x'), { phone: '+49 170 1234567' })).toBeNull();
  });

  it('"Sportart" ist KEIN Stadtfeld ("ort" mitten im Wort)', () => {
    document.body.innerHTML = `<label for="x">Sportart</label><input id="x">`;
    expect(matchProfile(document.getElementById('x'), { city: 'Berlin' })).toBeNull();
  });

  it('schlägt in Passwortfeldern NIE Profildaten vor', () => {
    document.body.innerHTML = `<input id="x" type="password" aria-label="E-Mail">`;
    expect(matchProfile(document.getElementById('x'), { email: 'a@b.de' })).toBeNull();
  });

  it('deutsche Komposita matchen weiterhin: Wohnort → city, Mobiltelefon → phone', () => {
    document.body.innerHTML = `<label for="a">Wohnort</label><input id="a"><label for="b">Mobiltelefon</label><input id="b">`;
    expect(matchProfile(document.getElementById('a'), { city: 'Berlin' })?.key).toBe('city');
    expect(matchProfile(document.getElementById('b'), { phone: '0170' })?.key).toBe('phone');
  });

  it('"Geboren am" matcht birthdate', () => {
    document.body.innerHTML = `<label for="x">Geboren am</label><input id="x">`;
    expect(matchProfile(document.getElementById('x'), { birthdate: '01.01.1990' })?.key).toBe('birthdate');
  });
});

describe('extractRichContext — verschachtelte Shadow Roots', () => {
  it('findet Felder in Shadow-in-Shadow-Komponenten (Design-Systeme)', () => {
    document.body.innerHTML = '';
    const host = document.createElement('div');
    document.body.appendChild(host);
    const outer = host.attachShadow({ mode: 'open' });
    const innerHost = document.createElement('div');
    outer.appendChild(innerHost);
    const inner = innerHost.attachShadow({ mode: 'open' });
    inner.innerHTML = `<label for="e">E-Mail</label><input id="e" type="email">`;

    const ctx = extractRichContext();
    const labels = ctx.forms.flatMap(f => f.allFields).map(f => f.label);
    expect(labels).toContain('E-Mail');
  });
});

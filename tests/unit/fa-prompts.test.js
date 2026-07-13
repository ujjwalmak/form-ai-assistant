const {
  buildSystemPrompt,
  buildScanPrompt,
  buildAgentPrompt,
  getFieldValueForReview,
  buildSubmitReviewPrompt,
} = require('../../fa-prompts.js');

afterEach(() => { document.body.innerHTML = ''; });

function fakeCtx() {
  return {
    page: { title: 'Bestellung', hostname: 'shop.example', pathname: '/kasse', h1: 'Kasse', metaDesc: '' },
    forms: [{
      index: 1,
      submitText: 'Jetzt bestellen',
      intro: '',
      sections: [{
        title: 'Kontakt',
        fields: [{
          label: 'E-Mail', required: true, type: 'email',
          selector: '[name="email"]', el: null, options: [], autocomplete: 'email',
        }],
      }],
    }],
  };
}

describe('buildSystemPrompt', () => {
  it('enthält Seite, Profil, Felder und den ACTIONS-Kontrakt', () => {
    const prompt = buildSystemPrompt(fakeCtx(), { firstName: 'Max' }, { Kundennummer: 'K-1' });
    expect(prompt).toContain('Titel: "Bestellung"');
    expect(prompt).toContain('=== NUTZERPROFIL ===');
    expect(prompt).toContain('Vorname: Max');
    expect(prompt).toContain('Kundennummer: K-1');
    expect(prompt).toContain('• E-Mail ✱ (email) [sel: [name="email"]]');
    expect(prompt).toContain('<<<ACTIONS');
    expect(prompt).toContain('Niemals action für Submit/Absenden verwenden.');
  });

  it('lässt Profil-/Extras-Blöcke weg, wenn leer', () => {
    const prompt = buildSystemPrompt(fakeCtx(), {}, {});
    expect(prompt).not.toContain('=== NUTZERPROFIL ===');
    expect(prompt).not.toContain('=== WEITERE GESPEICHERTE DATEN ===');
  });
});

describe('buildScanPrompt', () => {
  it('listet alle Profil-Schlüssel und verbietet Kreditkartendaten', () => {
    const prompt = buildScanPrompt();
    expect(prompt).toContain('"firstName" = Vorname');
    expect(prompt).toContain('"iban"');
    expect(prompt).toContain('NICHT übernehmen');
    expect(prompt).toContain('NUR mit einem JSON-Objekt');
  });
});

describe('buildAgentPrompt', () => {
  it('scannt die Seite frisch und baut Profil + Feldliste + Regeln zusammen', () => {
    document.body.innerHTML = `
      <form>
        <label for="em">E-Mail</label><input id="em" name="email" type="email" required>
        <button type="submit">Weiter</button>
      </form>`;
    const prompt = buildAgentPrompt(
      { firstName: 'Max', birthdate: '1990-05-10' },
      { Kundennummer: 'K-1' },
      {
        sessionAnswers: { Lieferart: 'Express' },
        filledFields: [{ label: 'Name', value: 'Max', url: 'https://andere.seite/1' }],
        lastFailures: [{ label: 'PLZ', reason: 'ungültig' }],
      }
    );
    expect(prompt).toContain('NUTZERPROFIL:');
    expect(prompt).toContain('Vorname: "Max"');
    expect(prompt).toContain('[Berechnetes Alter:');
    expect(prompt).toContain('NUTZER-ANTWORTEN');
    expect(prompt).toContain('Lieferart: "Express"');
    expect(prompt).toContain('BEREITS AUSGEFÜLLT');
    expect(prompt).toContain('LETZTE FEHLSCHLÄGE:');
    expect(prompt).toContain('- PLZ: ungültig');
    expect(prompt).toContain('"E-Mail"');
    expect(prompt).toContain('button "Weiter"');
    expect(prompt).toContain('action="submit" NUR für die finale Abgabe');
  });

  it('funktioniert ohne Agent-Laufzustand (Default-Parameter)', () => {
    document.body.innerHTML = '<form><input name="x" aria-label="X"></form>';
    const prompt = buildAgentPrompt({}, {});
    expect(prompt).toContain('NUTZERPROFIL:\n(leer)');
    expect(prompt).not.toContain('LETZTE FEHLSCHLÄGE');
  });
});

describe('getFieldValueForReview', () => {
  it('liest Passwörter NIE aus', () => {
    document.body.innerHTML = '<input type="password" id="pw" value="geheim123">';
    expect(getFieldValueForReview(document.getElementById('pw'))).toBe('[Passwortfeld nicht ausgelesen]');
  });

  it('beschreibt Checkboxen und Mehrfach-Selects lesbar', () => {
    document.body.innerHTML = `
      <input type="checkbox" id="cb" checked>
      <select id="sel" multiple>
        <option selected>Rot</option><option selected>Blau</option><option>Grün</option>
      </select>`;
    expect(getFieldValueForReview(document.getElementById('cb'))).toBe('ausgewählt');
    expect(getFieldValueForReview(document.getElementById('sel'))).toBe('Rot, Blau');
  });

  it('löst Radio-Gruppen über den gemeinsamen name auf', () => {
    document.body.innerHTML = `
      <form>
        <input type="radio" name="anrede" value="Herr" id="r1">
        <input type="radio" name="anrede" value="Frau" id="r2" checked>
      </form>`;
    expect(getFieldValueForReview(document.getElementById('r1'))).toBe('Frau');
  });
});

describe('buildSubmitReviewPrompt', () => {
  it('listet Feldwerte, markiert Pflichtfelder und leere Felder', () => {
    document.body.innerHTML = `
      <form id="f">
        <label for="a">E-Mail</label><input id="a" name="email" type="email" value="max@example.org" required>
        <label for="b">Telefon</label><input id="b" name="tel" type="text">
        <button type="submit">Absenden</button>
      </form>`;
    const prompt = buildSubmitReviewPrompt(document.getElementById('f'), fakeCtx(), 'Fallback');
    expect(prompt).toContain('Beginne die Antwort exakt mit "Status: OK"');
    expect(prompt).toContain('E-Mail (Pflichtfeld)');
    expect(prompt).toContain('"max@example.org"');
    expect(prompt).toContain('[leer]');
    expect(prompt).toContain('Absende-Aktion: Absenden');
  });

  it('fällt ohne <form> auf den Seiten-Scan und das Fallback-Submit-Label zurück', () => {
    const prompt = buildSubmitReviewPrompt(null, fakeCtx(), 'Jetzt bestellen');
    expect(prompt).toContain('Absende-Aktion: Jetzt bestellen');
    expect(prompt).toContain('Seite: Bestellung');
  });
});

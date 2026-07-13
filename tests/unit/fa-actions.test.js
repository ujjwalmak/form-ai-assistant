const {
  toSafeText,
  parseModelJsonArray,
  sanitizeAgentActions,
  splitActionBlock,
  createSSEDecoder,
  parseScanReply,
} = require('../../fa-actions.js');

describe('toSafeText', () => {
  it('akzeptiert nur String/Number/Boolean', () => {
    expect(toSafeText('  a  b ')).toBe('a b');
    expect(toSafeText(42)).toBe('42');
    expect(toSafeText(true)).toBe('true');
    expect(toSafeText({ evil: 1 })).toBe('');
    expect(toSafeText(['x'])).toBe('');
    expect(toSafeText(null)).toBe('');
  });

  it('normalisiert Whitespace und kappt auf maxLen', () => {
    expect(toSafeText('a\n\t b', 10)).toBe('a b');
    expect(toSafeText('x'.repeat(500))).toHaveLength(280);
    expect(toSafeText('abcdef', 3)).toBe('abc');
  });
});

describe('parseModelJsonArray', () => {
  it('parst ein direktes JSON-Array', () => {
    expect(parseModelJsonArray('[{"action":"fill"}]')).toEqual([{ action: 'fill' }]);
  });

  it('toleriert trailing commas', () => {
    expect(parseModelJsonArray('[{"action":"fill",},]')).toEqual([{ action: 'fill' }]);
  });

  it('packt gängige Objekt-Wrapper aus ({actions:[…]}, {result:[…]})', () => {
    expect(parseModelJsonArray('{"actions":[{"action":"done"}]}')).toEqual([{ action: 'done' }]);
    expect(parseModelJsonArray('{"result":[1,2]}')).toEqual([1, 2]);
  });

  it('liest ```json-Fences', () => {
    expect(parseModelJsonArray('Hier:\n```json\n[{"action":"fill"}]\n```')).toEqual([{ action: 'fill' }]);
  });

  it('findet ein eingebettetes Array in Fließtext', () => {
    expect(parseModelJsonArray('Klar! [{"action":"done"}] Fertig.')).toEqual([{ action: 'done' }]);
  });

  it('sammelt als letzten Ausweg einzelne {"action":…}-Objekte ein', () => {
    const raw = 'kaputt { "action": "fill", "selector": "#a" } dazwischen { "action": "done" } ende';
    expect(parseModelJsonArray(raw)).toEqual([
      { action: 'fill', selector: '#a' },
      { action: 'done' },
    ]);
  });

  it('liefert [] für Müll und leeren Input', () => {
    expect(parseModelJsonArray('')).toEqual([]);
    expect(parseModelJsonArray('keine Aktionen enthalten')).toEqual([]);
  });
});

describe('sanitizeAgentActions', () => {
  it('lässt nur bekannte action-Typen durch', () => {
    const out = sanitizeAgentActions([
      { action: 'fill', selector: '#a', value: 'x' },
      { action: 'hack', selector: '#a', value: 'x' },
      { action: 'eval', selector: '#a' },
    ]);
    expect(out).toEqual([{ action: 'fill', selector: '#a', label: '', value: 'x' }]);
  });

  it('verwirft fill/select ohne value und alles ohne selector', () => {
    expect(sanitizeAgentActions([{ action: 'fill', selector: '#a' }])).toEqual([]);
    expect(sanitizeAgentActions([{ action: 'fill', value: 'x' }])).toEqual([]);
  });

  it('check darf ohne value kommen (ankreuzen) oder mit "nein" (abwählen)', () => {
    const out = sanitizeAgentActions([
      { action: 'check', selector: '#a' },
      { action: 'check', selector: '#b', value: 'nein' },
    ]);
    expect(out[0]).toEqual({ action: 'check', selector: '#a', label: '' });
    expect(out[1].value).toBe('nein');
  });

  it('klemmt confidence auf [0,1] und übernimmt nur bekannte sources', () => {
    const out = sanitizeAgentActions([
      { action: 'fill', selector: '#a', value: 'x', confidence: 7, source: 'profile' },
      { action: 'fill', selector: '#b', value: 'x', confidence: -3, source: 'geraten' },
    ]);
    expect(out[0].confidence).toBe(1);
    expect(out[0].source).toBe('profile');
    expect(out[1].confidence).toBe(0);
    expect(out[1].source).toBeUndefined();
  });

  it('bricht bei "done" ab und ignoriert alles danach', () => {
    const out = sanitizeAgentActions([
      { action: 'done' },
      { action: 'fill', selector: '#a', value: 'x' },
    ]);
    expect(out).toEqual([{ action: 'done' }]);
  });

  it('ask: kappt Fragen/Optionen und braucht label oder question', () => {
    const out = sanitizeAgentActions([
      { action: 'ask', label: 'Feld', question: 'Was?', options: ['a', 'b', 'c', 'd', 'e'] },
      { action: 'ask' },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].options).toEqual(['a', 'b', 'c', 'd']);
  });

  it('deckelt die Aktionsliste (kein 10.000-Aktionen-Output)', () => {
    const many = Array.from({ length: 500 }, (_, i) => ({ action: 'fill', selector: `#f${i}`, value: 'x' }));
    expect(sanitizeAgentActions(many).length).toBeLessThanOrEqual(150);
  });

  it('liefert [] für Nicht-Arrays', () => {
    expect(sanitizeAgentActions(null)).toEqual([]);
    expect(sanitizeAgentActions({ action: 'fill' })).toEqual([]);
  });
});

describe('splitActionBlock', () => {
  it('trennt Text und <<<ACTIONS-Block', () => {
    const { text, actions } = splitActionBlock(
      'Ich fülle das aus.\n<<<ACTIONS\n[{"action":"fill","selector":"#a","value":"x"}]\nACTIONS>>>'
    );
    expect(text).toBe('Ich fülle das aus.');
    expect(actions).toEqual([{ action: 'fill', selector: '#a', label: '', value: 'x' }]);
  });

  it('toleriert einen ungeschlossenen Marker (Stream-Abbruch)', () => {
    const { actions } = splitActionBlock('Ok.\n<<<ACTIONS\n[{"action":"fill","selector":"#a","value":"x"}]');
    expect(actions).toHaveLength(1);
  });

  it('akzeptiert ```json-Fences und nackte Arrays am Ende', () => {
    expect(splitActionBlock('Text ```json\n[{"action":"fill","selector":"#a","value":"1"}]\n```').actions).toHaveLength(1);
    expect(splitActionBlock('Text [{"action":"check","selector":"#b"}]').actions).toHaveLength(1);
  });

  it('lässt im Chat nur fill/select/check zu — niemals submit/click', () => {
    const { actions } = splitActionBlock(
      '<<<ACTIONS [{"action":"submit","selector":"#f"},{"action":"click","selector":"#b"},{"action":"fill","selector":"#a","value":"x"}] ACTIONS>>>'
    );
    expect(actions.map(a => a.action)).toEqual(['fill']);
  });

  it('liefert reinen Text unverändert ohne Aktionen', () => {
    expect(splitActionBlock('Nur eine Antwort.')).toEqual({ text: 'Nur eine Antwort.', actions: [] });
  });
});

describe('createSSEDecoder', () => {
  const sse = obj => `data: ${JSON.stringify(obj)}\n`;
  const delta = content => ({ choices: [{ delta: { content } }] });

  it('dekodiert data:-Zeilen zu Text', () => {
    const decode = createSSEDecoder();
    expect(decode(sse(delta('Hallo ')) + sse(delta('Welt')))).toBe('Hallo Welt');
  });

  it('puffert Zeilen über Chunk-Grenzen hinweg (kein Datenverlust)', () => {
    const decode = createSSEDecoder();
    const line = sse(delta('zusammenhängend'));
    const cut = 15; // mitten in der data:-Zeile
    expect(decode(line.slice(0, cut))).toBe('');
    expect(decode(line.slice(cut))).toBe('zusammenhängend');
  });

  it('ignoriert [DONE], Fremdzeilen und kaputtes JSON', () => {
    const decode = createSSEDecoder();
    expect(decode('data: [DONE]\n: comment\ndata: {kaputt\n' + sse(delta('ok')))).toBe('ok');
  });
});

describe('parseScanReply', () => {
  it('liest Profilwerte aus (auch in ```json-Fences)', () => {
    const values = parseScanReply('```json\n{"firstName":"Max","iban":"DE02120300000000202051"}\n```');
    expect(values).toEqual({ firstName: 'Max', iban: 'DE02120300000000202051' });
  });

  it('verwirft Platzhalter, Überlängen und unbekannte Schlüssel', () => {
    const values = parseScanReply(JSON.stringify({
      firstName: 'null',
      lastName: 'x'.repeat(200),
      kreditkarte: '4111111111111111',
      email: 'max@example.org',
    }));
    expect(values).toEqual({ email: 'max@example.org' });
  });

  it('liefert null für Nicht-Objekte', () => {
    expect(parseScanReply('[]')).toBeNull();
    expect(parseScanReply('kein json')).toBeNull();
    expect(parseScanReply('')).toBeNull();
  });
});

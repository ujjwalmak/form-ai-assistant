const { escapeHtml, textToHtml, htmlToPlainText, renderMarkdown } = require('../../fa-format.js');

describe('escapeHtml', () => {
  it('escapt alle HTML-Sonderzeichen', () => {
    expect(escapeHtml(`<script>alert("x&'y")</script>`)).toBe(
      '&lt;script&gt;alert(&quot;x&amp;&#39;y&quot;)&lt;/script&gt;'
    );
  });

  it('wandelt null/undefined in einen leeren String', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });

  it('lässt harmlosen Text unverändert', () => {
    expect(escapeHtml('Straße 12, München')).toBe('Straße 12, München');
  });
});

describe('textToHtml', () => {
  it('escapt und wandelt Zeilenumbrüche in <br>', () => {
    expect(textToHtml('a<b\nc')).toBe('a&lt;b<br>c');
  });
});

describe('htmlToPlainText', () => {
  it('entfernt Markup und normalisiert Whitespace', () => {
    expect(htmlToPlainText('<strong>Hallo</strong>   Welt<br>')).toBe('Hallo Welt');
  });

  it('führt eingebettete Scripts nicht aus und liefert nur Text', () => {
    expect(htmlToPlainText('<img src=x onerror="window.__pwned = true">Text')).toBe('Text');
    expect(window.__pwned).toBeUndefined();
  });
});

describe('renderMarkdown', () => {
  it('rendert fett, kursiv und Code', () => {
    const html = renderMarkdown('**fett** und *kursiv* und `code`');
    expect(html).toContain('<strong>fett</strong>');
    expect(html).toContain('<em>kursiv</em>');
    expect(html).toContain('<code>code</code>');
  });

  it('rendert Aufzählungen (-, *, •, nummeriert) als <ul>', () => {
    const html = renderMarkdown('Intro\n- eins\n* zwei\n• drei\n1. vier');
    expect(html.match(/<li[^>]*>/g)).toHaveLength(4);
    expect(html).toContain('<ul');
  });

  it('escapt HTML im Markdown-Input (kein XSS über Chat-Antworten)', () => {
    const html = renderMarkdown('**<script>alert(1)</script>**');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('behandelt Leerzeilen als Absätze', () => {
    expect(renderMarkdown('a\n\nb')).toBe('a<br><br><br>b');
  });
});

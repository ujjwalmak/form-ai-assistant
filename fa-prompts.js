'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// Prompt-Builder — alle LLM-Kontrakte (System-Prompt, Agent, Dokument-Scan,
// Submit-Review) an einem Ort. Die Funktionen bekommen ihren Zustand explizit
// als Parameter (ctx, profile, …) und bauen daraus reine Strings.
// Benötigt zur Laufzeit: fa-utils.js, fa-profile.js, fa-scanner.js.
// ─────────────────────────────────────────────────────────────────────────────

// System-Prompt für den Chat: Seitenkontext, Profil, Formularstruktur und der
// <<<ACTIONS>>>-Kontrakt, über den die KI Felder direkt ausfüllen darf
function buildSystemPrompt(ctx, profile, extras = {}) {
  const { page, forms } = ctx;
  const lines = [
    'Du bist ein intelligenter KI-Formularassistent. Du hilfst Nutzern dabei, Online-Formulare korrekt, vollständig und fehlerfrei auszufüllen.',
    'Antworte immer auf Deutsch. Sei präzise, freundlich und konkret hilfreich.',
    'Antworte in max. 3 Sätzen, außer wenn eine ausführlichere Erklärung wirklich nötig ist.',
    '',
    '=== SEITE ===',
    `Titel: "${page.title}"`,
    `URL: ${page.hostname}${page.pathname}`,
  ];
  if (page.h1 && page.h1 !== page.title) lines.push(`Hauptüberschrift: "${page.h1}"`);
  if (page.metaDesc) lines.push(`Seitenbeschreibung: ${page.metaDesc}`);
  const filledFields = PROFILE_FIELDS.filter(pf => profile?.[pf.key]);
  if (filledFields.length) {
    lines.push('', '=== NUTZERPROFIL ===');
    filledFields.forEach(pf => lines.push(`${pf.label}: ${profile[pf.key]}`));
  }
  const extraEntries = Object.entries(extras).filter(([, v]) => v);
  if (extraEntries.length) {
    lines.push('', '=== WEITERE GESPEICHERTE DATEN ===');
    extraEntries.forEach(([k, v]) => lines.push(`${k}: ${v}`));
  }
  lines.push('');
  forms.forEach(form => {
    lines.push(forms.length > 1 ? `=== FORMULAR ${form.index} ===` : '=== FORMULAR ===');
    if (form.submitText) lines.push(`Aktion/Submit: "${form.submitText}"`);
    if (form.intro)      lines.push(`Anweisungen: "${form.intro}"`);
    lines.push('');
    form.sections.forEach(sec => {
      if (sec.title) lines.push(`[${sec.title}]`);
      sec.fields.forEach(f => {
        let line = `• ${f.label}`;
        if (f.required)     line += ' ✱';
        line += ` (${f.type})`;
        if (f.selector)     line += ` [sel: ${f.selector}]`;
        const cur = getFieldValueBrief(f.el);
        if (cur)            line += ` [aktuell: "${cur}"]`;
        if (f.autocomplete) line += ` [autocomplete: ${f.autocomplete}]`;
        if (f.min || f.max) line += ` [range: ${f.min ?? ''}–${f.max ?? ''}]`;
        if (f.maxLength)    line += ` [max ${f.maxLength} Zeichen]`;
        if (f.hint)         line += ` → "${f.hint}"`;
        if (f.options.length) line += `\n  Optionen: ${f.options.slice(0, 8).join(', ')}${f.options.length > 8 ? ', …' : ''}`;
        lines.push(line);
      });
      lines.push('');
    });
  });
  lines.push('✱ = Pflichtfeld');
  lines.push(
    '',
    '=== AKTIONEN (du kannst Felder direkt ausfüllen) — WICHTIGSTE REGEL ===',
    'Sobald der Nutzer in IRGENDEINER Form will, dass etwas eingetragen, geändert, ausgewählt, an- oder abgehakt wird',
    '(z. B. "trag ein", "fülle", "schreib", "setz", "ändere", "wähle", "mach ein Häkchen", "entferne", oder er nennt einfach einen Wert für ein Feld),',
    'MUSST du ans ENDE deiner Antwort einen Aktionsblock in EXAKT diesem Format anhängen:',
    '<<<ACTIONS',
    '[{"action":"fill","selector":"[name=\\"email\\"]","value":"max@web.de","label":"E-Mail"}]',
    'ACTIONS>>>',
    '',
    'Erlaubte actions:',
    '- "fill"   → Text-, Zahlen- und Datumsfelder. Datum IMMER als ISO: date→YYYY-MM-DD, month→YYYY-MM, time→HH:MM. Relative Angaben ("nächster Monat") selbst in konkrete Daten umrechnen.',
    '- "select" → Dropdowns. value muss EXAKT einer der angegebenen Optionen entsprechen.',
    '- "check"  → Checkboxen/Radios. value "ja" zum Ankreuzen, "nein" zum Abwählen, bei Radios der Optionstext.',
    '',
    'Nutze NUR [sel: …]-Selektoren, die oben bei den FELDERN stehen (exakt kopieren). Schreibe davor 1 kurzen Satz, was du tust.',
    'Ohne Aktionsblock passiert NICHTS auf der Seite — reiner Text füllt keine Felder aus.',
    'KEINE Aktionen, wenn der Nutzer nur eine Frage stellt. Niemals action für Submit/Absenden verwenden.',
    '',
    '=== GEDÄCHTNIS ===',
    'Der bisherige Gesprächsverlauf (auch von früheren Seiten dieser Website) ist Teil des Kontexts. Nutze frühere Antworten des Nutzers aktiv und frage nichts doppelt.'
  );
  return lines.join('\n');
}

// Prompt für den Dokument-Scan (Vision-OCR): erklärt dem Modell die erlaubten
// Profil-Schlüssel und verbietet das Übernehmen von Kreditkartendaten
function buildScanPrompt() {
  const fieldList = PROFILE_FIELDS.map(pf => {
    const syn = (pf.kw || []).slice(0, 5).join(', ');
    return `- "${pf.key}" = ${pf.label}${syn ? ` (auch: ${syn})` : ''}`;
  }).join('\n');
  return [
    'Du bist ein präziser Dokument-Extraktor. Lies das Bild (z. B. Ausweis, Führerschein, Visitenkarte, Rechnung, Vertrag, Bank-/Girocard) und extrahiere ALLE sichtbaren Personen- und Bankdaten.',
    'Gehe JEDEN dieser Schlüssel einzeln durch und trage ihn ein, wenn der Wert irgendwo im Bild steht — Vorder- ODER Rückseite, jede Sprache, auch klein gedruckt:',
    fieldList,
    'Antworte NUR mit einem JSON-Objekt ohne weiteren Text und nutze exakt diese Schlüssel.',
    'Nimm nur Schlüssel auf, deren Wert du sicher im Dokument liest — nichts raten, nichts erfinden. Nicht vorhandene Felder einfach weglassen.',
    'Auf Bank-/Girocards ist die IBAN die lange Nummer mit Ländercode am Anfang (z. B. „DE" + 20 Ziffern) → "iban" ohne Leerzeichen; der aufgedruckte Name ist der Karteninhaber. Eine 16-stellige Kreditkartennummer, das Ablaufdatum und die Prüfziffer (CVV/CVC) NICHT übernehmen.',
    'Datumsangaben im Format TT.MM.JJJJ. IBAN ohne Leerzeichen. Namen ohne Titel.',
  ].join('\n');
}

// Prompt für den Agent-Lauf: aktueller Feldbestand (frischer Scan), Profil,
// bisherige Antworten/Füllungen des Laufs und die Ausfüll-Strategie.
// agentRun = { sessionAnswers, filledFields, lastFailures } (Agent-Laufzustand)
function buildAgentPrompt(profile, extras, agentRun = {}) {
  const freshCtx = extractRichContext();
  const profileLines = PROFILE_FIELDS.filter(pf => profile[pf.key])
    .map(pf => `${pf.label}: "${profile[pf.key]}"`).join('\n');
  const extrasLines = Object.entries(extras)
    .map(([k, v]) => `${k}: "${v}"`).join('\n');
  const sessionAnswerLines = Object.entries(agentRun.sessionAnswers || {})
    .map(([k, v]) => `${k}: "${v}"`).join('\n');
  const prevFillLines = (agentRun.filledFields || [])
    .filter(f => f.url && f.url !== location.href)
    .slice(-24)
    .map(f => `${f.label}: "${f.value}"`)
    .join('\n');

  const fieldLines = freshCtx.forms.flatMap(form => {
    const rows = [];
    if (form.submitText) rows.push(`[submit] "${form.submitText}"`);
    form.sections.forEach(sec => {
      if (sec.title) rows.push(`# ${sec.title}`);
      sec.fields.forEach(f => {
        if (!f.el || !isVisible(f.el)) return;
        const el = f.el;
        const sel = f.selector || getAgentSelector(el);
        if (!sel) return;
        let line = `${sel} ${f.type}${f.required ? ' ✱' : ''} "${f.label}"`;
        if (f.options?.length) line += ` (${f.options.slice(0, 10).join(' | ')})`;
        if (f.hint) line += ` → ${f.hint}`;
        const curVal = el.tagName === 'SELECT'
          ? (el.selectedIndex > 0 ? clean(el.options[el.selectedIndex].text) : '')
          : clean(el.value || '');
        if (curVal) line += ` [Wert="${curVal}"]`;
        const err = getError(el);
        if (err) line += ` ❌"${err}"`;
        rows.push(line);
      });
    });
    // Navigations-Buttons des Formulars mit anbieten (Weiter/Absenden)
    const navButtons = Array.from(form.formEl?.querySelectorAll?.('button, input[type="button"], input[type="submit"]') || [])
      .filter(btn => isVisible(btn) && !btn.disabled);
    navButtons.forEach(btn => {
      const sel = getAgentSelector(btn);
      const label = getElementTextValue(btn) || 'Button';
      if (sel && label) rows.push(`${sel} button "${label}"`);
    });
    return rows;
  }).join('\n');

  const today = new Date();
  const birthdate = profile.birthdate ? new Date(profile.birthdate) : null;
  const age = birthdate ? Math.floor((today - birthdate) / (365.25 * 24 * 3600 * 1000)) : null;

  return [
    'Du bist ein Formular-Ausfüll-Agent. Gib einen JSON-Array mit Aktionen zurück — kein Markdown, keine Erklärung.',
    '',
    'NUTZERPROFIL:',
    profileLines || '(leer)',
    extrasLines ? '\nEXTRAS:\n' + extrasLines : '',
    sessionAnswerLines ? '\nNUTZER-ANTWORTEN (direkt verwenden, nicht erneut fragen):\n' + sessionAnswerLines : '',
    prevFillLines ? '\nBEREITS AUSGEFÜLLT (vorherige Seiten — konsistent halten):\n' + prevFillLines : '',
    age != null ? `\n[Berechnetes Alter: ${age}]` : '',
    '',
    `SEITE: ${document.title} | ${location.hostname}`,
    '',
    'FELDER:',
    fieldLines || '(keine Felder erkannt)',
    '',
    'FORMAT (ein Objekt pro Feld):',
    '[{"action":"fill"|"select"|"check"|"click"|"submit"|"ask"|"done","selector":"[name=\\"x\\"]","value":"...","label":"...","source":"profile"|"inferred"|"suggestion","confidence":0.0-1.0,"isNavigation":true,"question":"...","options":["A","B"]}]',
    '',
    'action="ask": Wert nicht ableitbar → Frage an Nutzer. Felder: "label" (Feldname), "question" (verständliche Frage auf Deutsch), "options" (max. 4 wahrscheinliche Antworten als String-Array, leer wenn Freitext). NUR für Pflichtfelder verwenden, wenn wirklich kein Wert aus Profil/Kontext ableitbar ist — OPTIONALE Felder ohne ableitbaren Wert bekommen KEINE Aktion (einfach leer lassen, nicht nachfragen).',
    '',
    'AUSFÜLL-STRATEGIE — versuche JEDES Feld zu befüllen:',
    '',
    'source="profile"  → Wert 1:1 aus Profil',
    '  Beispiele: Vorname→firstName, Nachname→lastName, Email, Telefon, IBAN, Straße, PLZ, Stadt, Land, Firma, Berufsbezeichnung',
    '',
    'source="inferred"  → logisch aus Profil herleitbar (IMMER versuchen!):',
    '  Anrede/Titel: "Herr"/"Frau" aus Vorname (gängige deutsche Namen)',
    '  Geschlecht: "männlich"/"weiblich"/"m"/"w" aus Vorname',
    '  Vollständiger Name: firstName + " " + lastName',
    '  Geburtsjahr/Monat/Tag: einzeln aus birthdate aufteilen',
    '  Alter: berechnet aus birthdate (heute=' + today.toISOString().split('T')[0] + ')',
    '  Altersgruppe: z.B. "25-34" aus Alter berechnen',
    '  Nationalität/Staatsangehörigkeit: aus nationality oder birthplace ableiten',
    '  Ländervorwahl: "+49" aus Deutschland, "+43" aus Österreich, "+41" aus Schweiz etc.',
    '  Land: aus nationality (z.B. "deutsch" → "Deutschland")',
    '  Bundesland: aus Stadt oder PLZ wenn eindeutig (München→Bayern, Berlin→Berlin etc.)',
    '  Hausnummer: aus street trennen falls Format "Straße HNr"',
    '  Straßenname: aus street trennen falls nötig',
    '  Berufsfeld/Branche: aus jobTitle ableiten',
    '  Akademischer Grad: aus jobTitle/Kontext',
    '  Sprache: aus nationality (deutsch→Deutsch)',
    '',
    'source="suggestion"  → kein Profilwert, aber aus Kontext sinnvoll:',
    '  Formularsprache/Land wenn offensichtlich (deutsches Formular → Deutschland, Deutsch)',
    '  Standardwerte die fast immer zutreffen (z.B. "Nein" bei unbekannten Ja/Nein-Feldern)',
    '',
    'PFLICHTREGELN:',
    '- Felder mit [Wert="..."] und ohne ❌ sind bereits korrekt ausgefüllt — überspringen',
    '- Felder mit ❌ haben einen Validierungsfehler — korrigierten Wert liefern',
    '- Alle anderen leeren Felder MÜSSEN befüllt werden wenn ein Wert ableitbar ist',
    '- SELECT: value muss exakt einer der angegebenen Optionen entsprechen — wähle die am besten passende',
    '- Datumsfelder IMMER als ISO: date→YYYY-MM-DD, month→YYYY-MM, time→HH:MM',
    '- isNavigation:true für alle Weiter/Nächste/Fortfahren-Buttons',
    '- action="submit" NUR für die finale Abgabe des Formulars',
    '- confidence angeben: 0.0 (sehr unsicher) bis 1.0 (sehr sicher)',
    '- Felder ohne jeden möglichen Wert weglassen',
    '',
    agentRun.lastFailures?.length
      ? 'LETZTE FEHLSCHLÄGE:\n' + agentRun.lastFailures.map(f => `- ${f.label || f.selector}: ${f.reason || 'nicht angewendet'}`).join('\n')
      : '',
  ].join('\n');
}

// Feldwert für die Submit-Review-Zusammenfassung auslesen — bewusst defensiv:
// Passwörter nie ausgeben, Dateifelder nur als Anzahl, Custom-Widgets über Text
function getFieldValueForReview(el) {
  if (!el) return '';
  if (isFileWidget(el)) return '';
  const type = (el.type || '').toLowerCase();
  if (type === 'password') return '[Passwortfeld nicht ausgelesen]';
  if (type === 'file') return el.files?.length ? `${el.files.length} Datei(en) ausgewählt` : '';
  if (type === 'checkbox') return el.checked ? (el.value && el.value !== 'on' ? el.value : 'ausgewählt') : '';
  if (type === 'radio') {
    const root = el.form || el.getRootNode?.() || document;
    const checked = el.name ? root.querySelector(`input[type="radio"][name="${CSS.escape(el.name)}"]:checked`) : (el.checked ? el : null);
    return checked ? (checked.value || getLabel(checked) || 'ausgewählt') : '';
  }
  if (el.tagName === 'SELECT') {
    const selected = Array.from(el.selectedOptions || []).map(o => clean(o.text || o.value)).filter(Boolean);
    return selected.join(', ');
  }
  if (isRichTextField(el) || (isAriaCombobox(el) && el.tagName !== 'INPUT')) {
    return clean(el.textContent || '').slice(0, 240);
  }
  return clean(el.value || '').slice(0, 240);
}

// Prompt für die Prüfung vor dem Absenden: alle Feldwerte, Browser-/Seiten-
// Fehler und die deterministischen Prüfergebnisse (fa-utils) als Fakten.
// ctx/fallbackSubmitLabel stammen aus dem Seiten-Scan von content.js.
function buildSubmitReviewPrompt(formEl, ctx, fallbackSubmitLabel) {
  const sections = formEl && formEl.tagName === 'FORM' ? groupIntoSections(formEl) : ctx.forms.flatMap(f => f.sections);
  const fields = sections.flatMap(s => s.fields);
  const seenRadioGroups = new Set();
  const lines = [
    'Prüfe dieses Formular direkt vor dem Absenden auf fehlende Angaben, Browser-Validierungsfehler und logische Auffälligkeiten.',
    'Prüfe AUSSERDEM auf logische Widersprüche ZWISCHEN Feldern, z. B.: Enddatum vor Startdatum,',
    'Geburtsdatum passt nicht zu Alter/Anrede, PLZ passt nicht zu Stadt oder Land, E-Mail-Wiederholung weicht ab,',
    'Kontodaten (IBAN/BIC) passen nicht zum angegebenen Land.',
    'Zeilen mit "Lokale Prüfung" sind deterministische Prüfergebnisse (z. B. IBAN-Prüfsumme mod-97) — übernimm sie als Fakten.',
    'Antworte strukturiert und knapp auf Deutsch mit diesen Überschriften:',
    'Status, Fehlende Pflichtfelder, Logik-Check, Auffälligkeiten, Nächste Schritte.',
    'Beginne die Antwort exakt mit "Status: OK", "Status: Warnung" oder "Status: Fehlt".',
    'Wenn alles plausibel wirkt, sage klar: "Ich sehe keine offensichtlichen Probleme."',
    '',
    `Seite: ${ctx.page.title || ctx.page.hostname}`,
    `URL: ${ctx.page.hostname}${ctx.page.pathname}`,
  ];
  const submitText = formEl && formEl.tagName === 'FORM' ? getSubmitText(formEl) : fallbackSubmitLabel;
  if (submitText) lines.push(`Absende-Aktion: ${submitText}`);
  lines.push('', 'Feldwerte:');

  fields.forEach(f => {
    const el = f.el;
    if (!el) return;
    const type = (el.type || '').toLowerCase();
    if (type === 'radio' && el.name) {
      const groupKey = `${el.form ? Array.from(document.forms).indexOf(el.form) : 'page'}:${el.name}`;
      if (seenRadioGroups.has(groupKey)) return;
      seenRadioGroups.add(groupKey);
    }
    const value = getFieldValueForReview(el);
    let line = `- ${f.label}${f.required ? ' (Pflichtfeld)' : ''} [${f.type}]: ${value ? `"${value}"` : '[leer]'}`;
    const err = getError(el);
    if (err) line += ` | Seitenfehler: "${err}"`;
    if (el.willValidate && !el.checkValidity()) line += ` | Browserfehler: "${el.validationMessage}"`;
    if (f.hint) line += ` | Hinweis: "${f.hint}"`;
    // Deterministische Validierung (fa-utils) als harten Fakt mitgeben
    if (value && ['INPUT', 'TEXTAREA'].includes(el.tagName) && !['radio', 'checkbox', 'password', 'file'].includes(type)) {
      const kind = detectLiveCheckKind(f.label, el.type, f.autocomplete);
      const check = kind ? getLiveCheckResult(kind, el.value, { final: true }) : null;
      if (check) line += ` | Lokale Prüfung: "${check.msg}"`;
    }
    lines.push(line);
  });

  return lines.join('\n');
}

// ── Test export (Node/Vitest only; `module` is undefined in the browser) ──────
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    buildSystemPrompt, buildScanPrompt, buildAgentPrompt,
    getFieldValueForReview, buildSubmitReviewPrompt,
  };
}

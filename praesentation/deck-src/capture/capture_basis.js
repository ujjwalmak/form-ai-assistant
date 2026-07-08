/* Captures FormAssist prototype screenshots for the demo deck.
   Loads the extension into Playwright Chromium against the local test-site.
   LLM calls are intercepted and answered with canned responses (documented as mock). */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const EXT = '/Users/a91836/Documents/repos/ai_prototyping';
const SHOTS = path.join(__dirname, 'shots');
const PROFILE_DIR = path.join(__dirname, 'chrome-profile');
const BASE = 'http://localhost:3000';

const MOCK = { mode: 'auto' };

const EXPLAIN_TEXT = [
  '**Zweck:** Registrierung eines Nutzerkontos in 5 Schritten (Persönliches → Kontakt → Adresse → Beruf → Konto).',
  '',
  '**Pflichtfelder:** Vor- & Nachname, Geburtsdatum, Geschlecht — auf den Folgeseiten E-Mail, Adresse und Benutzername.',
  '',
  '**Stolperstellen:**',
  '- *Date of Birth* erwartet das Format des Datums-Widgets — ich normalisiere das automatisch.',
  '- *Middle Name* ist optional — leer lassen ist völlig okay.',
  '- Die Sprach- und Nationalitäts-Auswahl akzeptiert nur die vorgegebenen Optionen.',
].join('\n');

const REVIEW_TEXT = [
  'Status: OK',
  'Alle Pflichtfelder sind ausgefüllt und plausibel: Empfänger, Adresse und Kontakt passen zusammen. ' +
  'Wirf noch einen kurzen Blick auf die E-Mail-Adresse für die Bestellbestätigung — danach kannst du bedenkenlos absenden.',
].join('\n');

function chatAction(userMsg) {
  // find an email-ish selector in the live page context the extension sent
  let sel = '#ship-email';
  const line = userMsg.split('\n').find(l => /mail/i.test(l) && /#[\w-]+/.test(l));
  if (line) { const m = line.match(/#[\w->\s.[\]="']*mail[\w-]*/i); if (m) sel = m[0]; }
  return 'Erledigt — ich habe **demo@formassist.de** als E-Mail-Adresse eingetragen. Sag Bescheid, wenn ich noch etwas anpassen soll!\n' +
    '<<<ACTIONS [{"action":"fill","selector":"' + sel + '","value":"demo@formassist.de"}] ACTIONS>>>';
}

function valueFor(label) {
  const l = label.toLowerCase();
  if (/gender|geschlecht/.test(l)) return 'Male';
  if (/language|sprache/.test(l)) return 'German';
  if (/national/.test(l)) return 'Germany';
  if (/country|land/.test(l)) return 'Germany';
  if (/username|benutzer/.test(l)) return 'max.mustermann';
  if (/job|beruf|occupation|profession/.test(l)) return 'Software Developer';
  if (/company|firma|employer/.test(l)) return 'Muster GmbH';
  return '?';
}

function batchAnswer(prompt) {
  const map = {};
  let inFields = false;
  for (const ln of prompt.split('\n')) {
    if (ln.startsWith('FORMULARFELDER')) { inFields = true; continue; }
    if (!inFields) continue;
    const m = ln.match(/^\s*(\d+)[.):]?\s+(.*)$/);
    if (m) map[m[1]] = valueFor(m[2]);
  }
  return JSON.stringify(map);
}

function sse(text) {
  let out = '';
  for (const piece of text.split(/(?<=\s)/)) {
    out += 'data: ' + JSON.stringify({ choices: [{ delta: { content: piece } }] }) + '\n\n';
  }
  return out + 'data: [DONE]\n\n';
}

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  fs.rmSync(PROFILE_DIR, { recursive: true, force: true });

  process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = '1';
  const ctx = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    viewport: { width: 1600, height: 900 },
    deviceScaleFactor: 2,
    args: [
      `--disable-extensions-except=${EXT}`,
      `--load-extension=${EXT}`,
      '--hide-crash-restore-bubble',
      '--no-first-run',
    ],
  });

  await ctx.route(/api\.groq\.com|openrouter\.ai/, async route => {
    let body = {};
    try { body = JSON.parse(route.request().postData() || '{}'); } catch {}
    const userMsg = (body.messages || []).map(m => (typeof m.content === 'string' ? m.content : '')).join('\n');
    let content;
    if (/FORMULARFELDER:/.test(userMsg) && /Feldnummer/.test(userMsg)) content = batchAnswer(userMsg);
    else if (/Beginne die Antwort exakt mit/.test(userMsg)) content = REVIEW_TEXT;
    else if (MOCK.mode === 'explain') content = EXPLAIN_TEXT;
    else if (MOCK.mode === 'chat') content = chatAction(userMsg);
    else content = '?';
    console.log(`[mock] mode=${MOCK.mode} stream=${!!body.stream} -> ${content.slice(0, 60).replace(/\n/g, ' ')}`);
    if (body.stream) {
      await route.fulfill({ status: 200, contentType: 'text/event-stream', body: sse(content) });
    } else {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ choices: [{ message: { content } }] }),
      });
    }
  });

  // wait for the extension service worker -> extension id
  let sw = ctx.serviceWorkers()[0];
  if (!sw) sw = await ctx.waitForEvent('serviceworker', { timeout: 15000 });
  const extId = sw.url().split('/')[2];
  console.log('extension id:', extId);

  // seed settings + demo profile via the options page context
  const opt = await ctx.newPage();
  await opt.goto(`chrome-extension://${extId}/options.html`);
  await opt.evaluate(() => new Promise(resolve => {
    chrome.storage.sync.set({
      faProvider: 'groq',
      faGroqApiKey: 'gsk_DEMO_MOCK_KEY_local_only',
      faModel: 'llama-3.3-70b-versatile',
      faAssistantMode: 'context',
    }, () => chrome.storage.local.set({
      faDarkMode: true,
      faActiveProfileId: 'demo',
      faProfiles: [{
        id: 'demo', name: 'Demo-Profil',
        profile: {
          firstName: 'Max', lastName: 'Mustermann', email: 'max.mustermann@example.com',
          phone: '+49 170 1234567', birthdate: '01.01.1990', birthplace: 'Berlin',
          nationality: 'Deutsch', street: 'Musterstraße 42', zip: '10115',
          city: 'Berlin', country: 'Deutschland', iban: 'DE89370400440532013000',
          bic: 'COBADEFFXXX', company: 'Muster GmbH', jobTitle: 'Software-Entwickler',
        },
        extras: { 'Webseite': 'https://formassist.example.de' },
      }],
    }, resolve));
  }));
  await opt.close();

  const page = await ctx.newPage();
  const shot = async name => {
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SHOTS, name) });
    console.log('shot:', name);
  };

  // ---- Scene A: registration wizard -------------------------------------
  await page.goto(`${BASE}/registration`, { waitUntil: 'networkidle' });
  const trigger = page.locator('#fa-trigger');
  await trigger.waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(1200); // badge scan
  await shot('01_trigger.png');

  await trigger.click();
  await page.waitForTimeout(900);
  await page.locator('#fa-ap-fields').click(); // expand field list
  await page.waitForTimeout(600);
  await shot('02_sidebar.png');
  await page.locator('#fa-ap-fields').click(); // collapse again
  await page.waitForTimeout(400);

  MOCK.mode = 'explain';
  await page.locator('#fa-ap-explain').click();
  await page.locator('#fa-messages').getByText('Zweck', { exact: false }).first()
    .waitFor({ timeout: 20000 });
  await page.waitForTimeout(800);
  await shot('03_explain.png');

  await page.locator('#fa-profile-btn').click();
  await page.waitForTimeout(800);
  await shot('04_profile.png');
  await page.locator('#fa-profile-btn').click();
  await page.waitForTimeout(500);

  // ---- Agent run (multi-step, auto-navigate on) --------------------------
  MOCK.mode = 'auto';
  await page.locator('#fa-ap-agent').click();
  // let it fill step 1 + navigate; grab the richest moment we can find
  await page.waitForTimeout(9000);
  await shot('05_agent.png');
  await page.waitForTimeout(8000);
  await shot('05b_agent_later.png');

  // ---- Scene B: checkout — chat command + submit review -------------------
  await page.goto(`${BASE}/checkout`, { waitUntil: 'networkidle' });
  await page.locator('#fa-trigger').waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(1200);
  await page.locator('#fa-trigger').click();
  await page.waitForTimeout(900);

  MOCK.mode = 'chat';
  await page.locator('#fa-input').fill('Trag bei E-Mail demo@formassist.de ein');
  await page.locator('#fa-send').click();
  await page.locator('#fa-messages').getByText('Erledigt', { exact: false }).first()
    .waitFor({ timeout: 20000 });
  await page.waitForTimeout(800);
  await shot('06_chat.png');

  // fill the form deterministically from the profile, then trigger submit review
  MOCK.mode = 'review';
  await page.locator('#fa-profile-btn').click();
  await page.waitForTimeout(400);
  await page.locator('#fa-pf-fill').click();
  await page.waitForTimeout(1500);
  await page.locator('#fa-profile-btn').click();
  await page.waitForTimeout(400);
  const submitBtn = page.locator('form button[type="submit"]').last();
  await submitBtn.scrollIntoViewIfNeeded();
  await submitBtn.click();
  await page.locator('#fa-messages, #fa-sidebar').getByText('Status', { exact: false }).first()
    .waitFor({ timeout: 20000 }).catch(() => console.log('review text not found — shooting anyway'));
  await page.waitForTimeout(1000);
  await shot('07_review.png');

  await ctx.close();
  console.log('done');
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });

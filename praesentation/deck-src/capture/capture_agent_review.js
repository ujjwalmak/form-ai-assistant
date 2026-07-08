/* Round 2: better agent shot (options answered) + submit-review shot. */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const EXT = '/Users/a91836/Documents/repos/ai_prototyping';
const SHOTS = path.join(__dirname, 'shots');
const PROFILE_DIR = path.join(__dirname, 'chrome-profile3');
const BASE = 'http://localhost:3000';

const REVIEW_TEXT = [
  'Status: OK',
  'Alle Pflichtfelder sind vollständig und in sich stimmig: Name, Adresse und Kontaktdaten passen zusammen. ' +
  'Wirf noch einen kurzen Blick auf die E-Mail-Adresse für die Bestätigung — danach kannst du bedenkenlos absenden.',
].join('\n');

function pickValue(label, options) {
  const l = label.toLowerCase();
  if (/gender|geschlecht/.test(l)) return 'Male';
  if (/language|sprache/.test(l)) return options.find(o => /deutsch|german/i.test(o)) || 'Deutsch';
  if (/national|country|land/.test(l)) return options.find(o => /german/i.test(o)) || 'Germany';
  if (/middle/.test(l)) return '?';
  if (/username|benutzer/.test(l)) return 'max.mustermann';
  if (/job|beruf|occupation|position/.test(l)) return 'Software Developer';
  if (/company|firma|employer/.test(l)) return 'Muster GmbH';
  if (options.length) return options[0];
  return '?';
}

function parseFieldLine(ln) {
  const m = ln.match(/^\s*(\d+)\.\s*"([^"]+)"[^]*$/);
  if (!m) return null;
  const opts = ln.includes('Optionen:')
    ? ln.split('Optionen:')[1].split('Hinweis:')[0].split('|').map(s => s.trim()).filter(Boolean)
    : [];
  return { n: m[1], label: m[2], opts };
}

function batchAnswer(prompt) {
  const map = {};
  let inFields = false;
  for (const ln of prompt.split('\n')) {
    if (ln.startsWith('FORMULARFELDER')) { inFields = true; continue; }
    if (!inFields) continue;
    const f = parseFieldLine(ln);
    if (f) map[f.n] = pickValue(f.label, f.opts);
  }
  return JSON.stringify(map);
}

function singleAnswer(prompt) {
  // focused single-field prompt: find the field description line
  for (const ln of prompt.split('\n')) {
    const f = parseFieldLine(ln.replace(/^FELD:\s*/i, '1. '));
    if (f) return pickValue(f.label, f.opts);
  }
  const lbl = (prompt.match(/"([^"]+)"/) || [])[1] || '';
  return pickValue(lbl, []);
}

function sse(text) {
  let out = '';
  for (const piece of text.split(/(?<=\s)/)) {
    out += 'data: ' + JSON.stringify({ choices: [{ delta: { content: piece } }] }) + '\n\n';
  }
  return out + 'data: [DONE]\n\n';
}

(async () => {
  fs.rmSync(PROFILE_DIR, { recursive: true, force: true });
  process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = '1';
  const ctx = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    viewport: { width: 1600, height: 900 },
    deviceScaleFactor: 2,
    args: [
      `--disable-extensions-except=${EXT}`,
      `--load-extension=${EXT}`,
      '--hide-crash-restore-bubble', '--no-first-run',
    ],
  });

  await ctx.route(/api\.groq\.com|openrouter\.ai/, async route => {
    let body = {};
    try { body = JSON.parse(route.request().postData() || '{}'); } catch {}
    const userMsg = (body.messages || []).map(m => (typeof m.content === 'string' ? m.content : '')).join('\n');
    let content;
    if (/FORMULARFELDER:/.test(userMsg) && /Feldnummer/.test(userMsg)) content = batchAnswer(userMsg);
    else if (/Beginne die Antwort exakt mit/.test(userMsg)) content = REVIEW_TEXT;
    else if (/Nutzer-Antwort:/.test(userMsg)) {
      const raw = (userMsg.match(/Nutzer-Antwort:\s*"([^"]+)"/) || [])[1] || '?';
      content = raw;
    }
    else if (/Antworte NUR mit/.test(userMsg)) content = singleAnswer(userMsg);
    else content = 'Alles klar!';
    console.log(`[mock] stream=${!!body.stream} -> ${content.slice(0, 70).replace(/\n/g, ' ')}`);
    if (body.stream) await route.fulfill({ status: 200, contentType: 'text/event-stream', body: sse(content) });
    else await route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ choices: [{ message: { content } }] }) });
  });

  let sw = ctx.serviceWorkers()[0];
  if (!sw) sw = await ctx.waitForEvent('serviceworker', { timeout: 15000 });
  const extId = sw.url().split('/')[2];

  const opt = await ctx.newPage();
  await opt.goto(`chrome-extension://${extId}/options.html`);
  await opt.evaluate(() => new Promise(resolve => {
    chrome.storage.sync.set({
      faProvider: 'groq', faGroqApiKey: 'gsk_DEMO_MOCK_KEY_local_only',
      faModel: 'llama-3.3-70b-versatile', faAssistantMode: 'context',
    }, () => chrome.storage.local.set({
      faDarkMode: true, faActiveProfileId: 'demo',
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
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SHOTS, name) });
    console.log('shot:', name);
  };

  // ---- improved agent run on the registration wizard ----------------------
  await page.goto(`${BASE}/registration`, { waitUntil: 'networkidle' });
  await page.locator('#fa-trigger').waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(1200);
  await page.locator('#fa-trigger').click();
  await page.waitForTimeout(900);
  await page.locator('#fa-ap-agent').click();
  await page.waitForTimeout(8000);
  await shot('05_agent.png');
  // answer the agent's targeted question -> it continues + navigates
  await page.locator('#fa-input').fill('Alexander');
  await page.locator('#fa-send').click();
  await page.waitForTimeout(6000);
  await shot('05b_agent_step2.png');
  await page.waitForTimeout(8000);
  await shot('05c_agent_step3.png');

  // ---- submit review on checkout step 2 (wrap fields in a real <form>) ----
  await page.goto(`${BASE}/checkout`, { waitUntil: 'networkidle' });
  await page.locator('#fa-trigger').waitFor({ state: 'visible', timeout: 15000 });
  await page.locator('#form-next-btn').click();  // -> Shipping Info
  await page.waitForTimeout(1000);
  await page.locator('#fa-trigger').click();
  await page.waitForTimeout(900);
  // fill deterministically from the profile
  await page.locator('#fa-profile-btn').click();
  await page.waitForTimeout(400);
  await page.locator('#fa-pf-fill').click();
  await page.waitForTimeout(1800);
  await page.locator('#fa-profile-btn').click();
  await page.waitForTimeout(600);
  await shot('08_profilfill.png');
  // wrap the step content in a real form and request submission
  await page.evaluate(() => {
    const anchor = document.querySelector('#ship-email');
    let container = anchor.closest('section, main, div.rounded-2xl, div');
    for (let up = container; up && up !== document.body; up = up.parentElement) {
      if (up.querySelectorAll('input, select, textarea').length >= 6) { container = up; break; }
    }
    const form = document.createElement('form');
    container.parentElement.insertBefore(form, container);
    form.appendChild(container);
    form.requestSubmit();
  });
  await page.locator('#fa-sidebar').getByText('Status', { exact: false }).first()
    .waitFor({ timeout: 20000 }).catch(() => console.log('no Status text — shooting anyway'));
  await page.waitForTimeout(1200);
  await shot('07_review.png');

  await ctx.close();
  console.log('done');
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });

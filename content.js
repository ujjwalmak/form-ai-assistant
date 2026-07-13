(function () {
  'use strict';

  let _model    = 'llama-3.3-70b-versatile';
  let _apiKey   = '';
  let _provider = 'groq';
  let _assistantMode = 'classic';
  let _autoNavigate = true;
  let _keyPromise = null;
  let _onProviderFallback = null;

  // Anzeigename des gerade aktiven Providers (Konfiguration: fa-providers.js)
  function currentProviderLabel() {
    return providerLabel(_provider);
  }

  function loadKey() {
    if (_apiKey) return Promise.resolve(_apiKey);
    if (_keyPromise) return _keyPromise;
    _keyPromise = new Promise(resolve => {
      chrome.storage.sync.get(['faProvider', 'faApiKey', 'faGroqApiKey', 'faOpenRouterApiKey'], stored => {
        _provider = normalizeProvider(stored.faProvider);
        const key = _provider === 'openrouter'
          ? (stored.faOpenRouterApiKey || stored.faApiKey || '')
          : (stored.faGroqApiKey || stored.faApiKey || '');
        _apiKey = String(key || '').trim();
        resolve(_apiKey);
      });
    }).finally(() => { _keyPromise = null; });
    return _keyPromise;
  }

  // ── CSP-sichere API-Helfer (geroutet über den Background Service Worker) ──
  // fallbackModel: optionales Modell für den OpenRouter-Fallback (z. B. Vision-
  // Requests, die nicht auf das textbasierte Standard-Fallback-Modell dürfen)
  function groqRequest(key, body, fallbackModel) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type: 'llm-fetch', provider: _provider, key, body, fallbackModel }, resp => {
        if (chrome.runtime.lastError) { reject(new Error(chrome.runtime.lastError.message)); return; }
        if (!resp?.ok) reject(new Error(resp?.error || 'Unbekannter Fehler'));
        else {
          if (resp.usedFallback) _onProviderFallback?.();
          resolve(resp.data);
        }
      });
    });
  }

  function groqStream(key, body, onChunk) {
    return new Promise((resolve, reject) => {
      const port = chrome.runtime.connect({ name: 'llm-stream' });
      port.postMessage({ provider: _provider, key, body });
      port.onMessage.addListener(msg => {
        if (msg.type === 'chunk')    onChunk(msg.chunk);
        else if (msg.type === 'fallback') _onProviderFallback?.();
        else if (msg.type === 'done')    { port.disconnect(); resolve(); }
        else if (msg.type === 'error')   { port.disconnect(); reject(new Error(msg.error)); }
      });
      port.onDisconnect.addListener(() => resolve());
    });
  }

  if (window !== window.top) return;
  if (document.getElementById('formassist-host')) return;

  // ── Module aus manifest.json (laufen vor dieser Datei, globaler Scope): ──
  // fa-utils.js     → clean, isVisible, parseDateToISO, getAgentSelector,
  //                   downscaleImage, sleep, deterministische Validatoren, …
  // fa-providers.js → PROVIDERS, normalizeProvider, providerLabel,
  //                   getDefaultModel, getVisionModel, normalizeAssistantMode
  // fa-profile.js   → PROFILE_FIELDS, FAKE_DATA
  // fa-scanner.js   → SKIP_TYPES, getLabel, extractField, extractRichContext,
  //                   getActiveFieldContext, matchProfile, getFormStepInfo, …
  // fa-prompts.js   → buildSystemPrompt, buildAgentPrompt, buildScanPrompt,
  //                   buildSubmitReviewPrompt
  // fa-fill.js      → FULL_WIDTH_KEYS, fillField, setKendoValue, tryDatePickerLib
  // fa-format.js    → escapeHtml, textToHtml, htmlToPlainText, renderMarkdown
  // fa-actions.js   → splitActionBlock, sanitizeAgentActions, parseModelJsonArray,
  //                   createSSEDecoder, parseScanReply
  // fa-styles.js    → FA_CSS
  // fa-templates.js → FA_HTML

  // ── Erst-Scan der Seite ──────────────────────────────────────────────
  let ctx = extractRichContext();
  let allFields   = ctx.forms.flatMap(f => f.allFields);
  let submitLabel = ctx.forms[0]?.submitText;

  // Zustand mehrseitiger Formulare (Step-Erkennung)
  let stepInfo = getFormStepInfo();

  // Loop-Schutz: maximale Seitenzahl, die der Agent in einer Sitzung
  // selbstständig weiter navigieren darf
  const AGENT_MAX_PAGES = 12;

  // Unbekannte Felder pro KI-Anfrage bündeln (1 API-Call statt 1 Call/Feld)
  const AGENT_BATCH_SIZE = 12;

  // Wie viele der letzten Chat-Nachrichten als Kontext mitgeschickt werden
  const CHAT_HISTORY_WINDOW = 12;

  // ═══════════════════════════════════════════════════════════════════════
  // INIT — Einstellungen & Profil laden, dann UI aufbauen
  // ═══════════════════════════════════════════════════════════════════════

  async function init() {
    const syncStored = await chrome.storage.sync.get(['faModel', 'faAssistantMode', 'faProvider', 'faAutoNavigate']);
    _provider = normalizeProvider(syncStored.faProvider);
    _model = syncStored.faModel || getDefaultModel(_provider);
    _assistantMode = normalizeAssistantMode(syncStored.faAssistantMode);
    _autoNavigate = syncStored.faAutoNavigate !== false; // Default an, sonst gespeicherter Wert

    const stored = await chrome.storage.local.get(['faProfile', 'faPosition', 'faDarkMode', 'faExtras', 'faProfiles', 'faActiveProfileId', 'faHistory']);

    // ── Profile state ────────────────────────────────────────────────────
    let profiles        = stored.faProfiles || [];
    let activeProfileId = stored.faActiveProfileId || null;

    // Migrate legacy single-profile to multi-profile on first run
    if (!profiles.length) {
      const legacyProfile = stored.faProfile || {};
      const legacyExtras  = stored.faExtras  || {};
      activeProfileId = 'default';
      profiles = [{ id: 'default', name: 'Hauptprofil', profile: legacyProfile, extras: legacyExtras }];
      chrome.storage.local.set({ faProfiles: profiles, faActiveProfileId: activeProfileId });
    }
    if (!activeProfileId || !profiles.find(p => p.id === activeProfileId)) {
      activeProfileId = profiles[0].id;
    }

    function getActiveEntry() { return profiles.find(p => p.id === activeProfileId) || profiles[0]; }

    const activeEntry = getActiveEntry();
    const profile  = activeEntry.profile;
    const extras   = activeEntry.extras;
    const savedPos = stored.faPosition || null;
    let   darkMode = stored.faDarkMode || false;
    let   faHistory = stored.faHistory || [];

    let SYSTEM = buildSystemPrompt(ctx, profile, extras);

    // ── Shadow DOM ────────────────────────────────────────────────────
    const hostEl = document.createElement('div');
    hostEl.id = 'formassist-host';
    Object.assign(hostEl.style, { position: 'fixed', inset: '0', zIndex: '2147483647', pointerEvents: 'none' });
    document.body.appendChild(hostEl);
    const shadow = hostEl.attachShadow({ mode: 'open' });

    // Bewusst kein Webfont-Load: ein <link> auf Google Fonts würde auf jeder
    // besuchten Seite einen Request an Google auslösen (Privacy). FA_CSS
    // definiert einen System-Font-Stack als Fallback.

    // ── Styles ────────────────────────────────────────────────────────
    const style = document.createElement('style');
    style.textContent = FA_CSS;
    shadow.appendChild(style);

    // ── DOM ───────────────────────────────────────────────────────────
    const wrap = document.createElement('div');
    wrap.innerHTML = FA_HTML; // statisches Sidebar-Markup aus fa-templates.js
    shadow.appendChild(wrap);

    // ── Element-Referenzen ────────────────────────────────────────────
    const $          = id => shadow.getElementById(id);
    const triggerBtn  = $('fa-trigger');
    const sidebar     = $('fa-sidebar');
    const header      = $('fa-header');
    const resizeHandles = Array.from(shadow.querySelectorAll('[data-resize]'));
    const messagesEl  = $('fa-messages');
    const inputEl     = $('fa-input');
    const fieldTag    = $('fa-field-tag');
    const fieldNameEl = $('fa-field-name');
    const profilePanel   = $('fa-profile-panel');
    const profileGrid    = $('fa-profile-grid');
    const autofillTip    = $('fa-autofill-tip');
    const autofillValue  = $('fa-autofill-value');
    const toastEl        = $('fa-toast');

    const KBD_STYLE = 'font-family:var(--font);font-size:9px;background:var(--surface2);border:1px solid var(--border2);border-radius:4px;padding:1px 4px;color:var(--text3)';
    function updateFooterNote() {
      $('fa-footer-note').innerHTML = `<span class="footer-provider">${currentProviderLabel()}</span><span class="footer-sep">·</span><span class="footer-model">${escapeHtml(_model)}</span><span class="footer-sep">·</span><kbd style="${KBD_STYLE}">Alt+Shift+F</kbd>`;
    }
    updateFooterNote();

    // ── Dark Mode anwenden ────────────────────────────────────────────
    if (darkMode) hostEl.classList.add('dark');

    // ── Toast ─────────────────────────────────────────────────────────
    let toastTimer;
    function showToast(msg) {
      toastEl.textContent = msg;
      toastEl.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2400);
    }
    _onProviderFallback = () => showToast('Groq nicht erreichbar – OpenRouter als Backup');

    // ── Undo-Toast: Sicherheitsnetz nach einem Agent-Lauf ──────────────
    const undoToastEl = $('fa-undo-toast');
    let undoToastTimer;
    function showUndoToast(n) {
      const msgEl = $('fa-undo-toast-msg');
      if (msgEl) msgEl.textContent = `${n} Feld${n !== 1 ? 'er' : ''} ausgefüllt`;
      undoToastEl.classList.add('show');
      clearTimeout(undoToastTimer);
      undoToastTimer = setTimeout(() => undoToastEl.classList.remove('show'), 6000);
    }
    function hideUndoToast() {
      undoToastEl?.classList.remove('show');
      clearTimeout(undoToastTimer);
    }
    function maybeShowUndoToast() {
      const n = agentState?.undo?.length || 0;
      if (n > 0) showUndoToast(n);
    }
    $('fa-undo-toast-btn')?.addEventListener('click', () => undoAgentFill());

    // ═══════════════════════════════════════════════════════════════════════
    // PROFILE PANEL
    // ═══════════════════════════════════════════════════════════════════════

    // Felder in scannbare Abschnitte gruppieren (Reihenfolge = PF_GROUPS).
    // group-Zuordnung steht in fa-profile.js; unbekannte Gruppen landen unter „Person".
    const PF_GROUPS = [
      ['person',  'Person'],
      ['address', 'Adresse'],
      ['contact', 'Kontakt'],
      ['bank',    'Bank'],
      ['job',     'Beruf'],
    ];
    PF_GROUPS.forEach(([groupKey, groupLabel]) => {
      const groupFields = PROFILE_FIELDS.filter(pf => (pf.group || 'person') === groupKey);
      if (!groupFields.length) return;
      const hdr = document.createElement('div');
      hdr.className = 'pf-group-hdr';
      hdr.textContent = groupLabel;
      profileGrid.appendChild(hdr);
      groupFields.forEach(pf => {
        const div = document.createElement('div');
        div.className = 'pf' + (FULL_WIDTH_KEYS.has(pf.key) ? ' full' : '');
        const lbl = document.createElement('label');
        lbl.textContent = pf.label;
        const inp = document.createElement('input');
        inp.type = 'text';
        inp.id = `fa-pf-${pf.key}`;
        inp.value = profile[pf.key] || '';
        inp.placeholder = pf.label;
        div.appendChild(lbl);
        div.appendChild(inp);
        profileGrid.appendChild(div);
      });
    });

    function getProfileFromInputs() {
      const p = {};
      PROFILE_FIELDS.forEach(pf => {
        const v = shadow.getElementById(`fa-pf-${pf.key}`)?.value.trim();
        if (v) p[pf.key] = v;
      });
      return p;
    }

    function saveActiveProfileToStore(cb) {
      const entry = getActiveEntry();
      entry.profile = { ...profile };
      entry.extras  = { ...extras };
      chrome.storage.local.set({ faProfiles: profiles, faProfile: profile, faExtras: extras }, cb);
      sbPushProfiles(profiles, activeProfileId);
    }

    function renderProfileSelect() {
      const sel = $('fa-profile-select');
      if (!sel) return;
      sel.innerHTML = '';
      profiles.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id; opt.textContent = p.name;
        if (p.id === activeProfileId) opt.selected = true;
        sel.appendChild(opt);
      });
      const delBtn = $('fa-pf-del-profile');
      if (delBtn) delBtn.disabled = profiles.length <= 1;
    }

    function switchProfile(id) {
      if (id === activeProfileId) return;
      saveActiveProfileToStore(() => {
        activeProfileId = id;
        const entry = getActiveEntry();
        // Swap profile + extras in-place
        Object.keys(profile).forEach(k => delete profile[k]);
        Object.assign(profile, entry.profile);
        Object.keys(extras).forEach(k => delete extras[k]);
        Object.assign(extras, entry.extras);
        chrome.storage.local.set({ faActiveProfileId: activeProfileId });
        loadProfileIntoInputs(profile);
        renderExtrasInProfile();
        updateProfileProgress();
        SYSTEM = buildSystemPrompt(ctx, profile, extras);
        showToast(`Profil „${entry.name}" geladen`);
      });
    }

    renderProfileSelect();

    $('fa-profile-select').addEventListener('change', e => switchProfile(e.target.value));

    $('fa-pf-new').addEventListener('click', () => {
      const name = prompt('Profilname:');
      if (!name?.trim()) return;
      const id = 'p_' + Date.now();
      profiles.push({ id, name: name.trim(), profile: {}, extras: {} });
      chrome.storage.local.set({ faProfiles: profiles });
      sbPushProfiles(profiles, activeProfileId);
      renderProfileSelect();
      switchProfile(id);
    });

    $('fa-pf-del-profile').addEventListener('click', () => {
      if (profiles.length <= 1) return;
      const entry = getActiveEntry();
      if (!confirm(`Profil „${entry.name}" löschen?`)) return;
      const deletedId = activeProfileId;
      profiles = profiles.filter(p => p.id !== activeProfileId);
      activeProfileId = profiles[0].id;
      chrome.storage.local.set({ faProfiles: profiles, faActiveProfileId: activeProfileId });
      sbDeleteProfile(deletedId);
      sbPushProfiles(profiles, activeProfileId);
      renderProfileSelect();
      switchProfile(activeProfileId);
    });

    function loadProfileIntoInputs(p) {
      PROFILE_FIELDS.forEach(pf => {
        const inp = shadow.getElementById(`fa-pf-${pf.key}`);
        if (inp) inp.value = p[pf.key] || '';
      });
    }

    function renderExtrasInProfile() {
      profileGrid.querySelectorAll('.pf-extras-hdr, .pf-extras-empty, .pf-extra').forEach(e => e.remove());

      const hdr = document.createElement('div');
      hdr.className = 'pf-extras-hdr';
      hdr.textContent = 'Weitere gespeicherte Daten';
      profileGrid.appendChild(hdr);

      const extraEntries = Object.entries(extras);
      if (!extraEntries.length) {
        const empty = document.createElement('div');
        empty.className = 'pf-extras-empty';
        empty.textContent = 'Noch keine weiteren Daten — werden automatisch beim Ausfüllen gespeichert.';
        profileGrid.appendChild(empty);
        return;
      }

      extraEntries.forEach(([key, value]) => {
        const div = document.createElement('div');
        div.className = 'pf pf-extra full';
        div.dataset.extraKey = key;
        const lbl = document.createElement('label');
        lbl.textContent = key;
        const row = document.createElement('div');
        row.className = 'pf-extra-row';
        const inp = document.createElement('input');
        inp.type = 'text';
        inp.value = value;
        inp.placeholder = key;
        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'pf-del';
        delBtn.title = `"${key}" löschen`;
        delBtn.textContent = '×';
        delBtn.addEventListener('click', () => {
          delete extras[key];
          chrome.storage.local.set({ faExtras: extras });
          div.remove();
          showToast(`"${key}" gelöscht`);
        });
        row.append(inp, delBtn);
        div.append(lbl, row);
        profileGrid.appendChild(div);
      });
    }

    let profileVisible = false;
    let historyVisible = false;
    const historyPanel = shadow.getElementById('fa-history-panel');

    function showProfile() {
      if (historyVisible) hideHistory();
      profileVisible = true;
      renderExtrasInProfile();
      updateProfileProgress();
      messagesEl.style.display = 'none';
      $('fa-action-panel').style.display = 'none';
      profilePanel.classList.add('visible');
      $('fa-profile-btn').classList.add('active');
    }
    function hideProfile() {
      profileVisible = false;
      messagesEl.style.display = '';
      $('fa-action-panel').style.display = '';
      profilePanel.classList.remove('visible');
      $('fa-profile-btn').classList.remove('active');
    }

    function renderHistoryList() {
      const listEl = $('fa-history-list');
      if (!listEl) return;
      listEl.innerHTML = '';
      if (!faHistory.length) {
        listEl.innerHTML = '<div class="history-empty">Noch keine ausgefüllten Formulare. Starte den Agent, um den Verlauf zu befüllen.</div>';
        return;
      }
      [...faHistory].reverse().forEach(entry => {
        const div = document.createElement('div');
        div.className = 'history-entry';
        div.title = entry.url || '';
        div.innerHTML = `
          <div class="history-icon"><svg viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/><path d="M9 12h6M9 16h4"/></svg></div>
          <div class="history-info">
            <div class="history-domain">${escapeHtml(entry.title || entry.domain || '—')}</div>
            <div class="history-meta">${escapeHtml(entry.domain)} · ${entry.fieldCount} Felder · ${new Date(entry.ts).toLocaleDateString('de-DE', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit' })}</div>
          </div>`;
        if (entry.url) div.addEventListener('click', () => { window.location.href = entry.url; });
        listEl.appendChild(div);
      });
    }

    function showHistory() {
      if (profileVisible) hideProfile();
      historyVisible = true;
      renderHistoryList();
      messagesEl.style.display = 'none';
      $('fa-action-panel').style.display = 'none';
      historyPanel.classList.add('visible');
      $('fa-history-btn').classList.add('active');
    }
    function hideHistory() {
      historyVisible = false;
      messagesEl.style.display = '';
      $('fa-action-panel').style.display = '';
      historyPanel.classList.remove('visible');
      $('fa-history-btn').classList.remove('active');
    }

    function addHistoryEntry(entry) {
      faHistory.push(entry);
      if (faHistory.length > 30) faHistory = faHistory.slice(-30);
      chrome.storage.local.set({ faHistory });
      sbPushHistoryEntry(entry);
    }

    $('fa-history-btn').addEventListener('click', () => { if (historyVisible) hideHistory(); else showHistory(); });
    $('fa-new-chat').addEventListener('click', () => {
      if (profileVisible) hideProfile();
      if (historyVisible) hideHistory();
      clearChat();
    });
    $('fa-history-clear').addEventListener('click', () => {
      faHistory = [];
      chrome.storage.local.set({ faHistory });
      sbClearHistory();
      renderHistoryList();
      showToast('Verlauf gelöscht');
    });

    function updateProfileProgress() {
      const filled = PROFILE_FIELDS.filter(pf => {
        const inp = shadow.getElementById(`fa-pf-${pf.key}`);
        return inp && inp.value.trim();
      }).length;
      const pct = Math.round(filled / PROFILE_FIELDS.length * 100);
      const fill = $('fa-pf-progress');
      const label = $('fa-pf-fill-count');
      if (fill)  fill.style.width = pct + '%';
      if (label) label.textContent = `${filled}/${PROFILE_FIELDS.length} Felder`;
    }

    profileGrid.addEventListener('input', updateProfileProgress);

    $('fa-profile-btn').addEventListener('click', () => { if (profileVisible) hideProfile(); else showProfile(); });

    $('fa-pf-save').addEventListener('click', () => {
      const p = getProfileFromInputs();
      PROFILE_FIELDS.forEach(pf => { if (p[pf.key]) profile[pf.key] = p[pf.key]; else delete profile[pf.key]; });
      profileGrid.querySelectorAll('.pf-extra').forEach(div => {
        const key = div.dataset.extraKey;
        const val = div.querySelector('input')?.value.trim();
        if (key) { if (val) extras[key] = val; else delete extras[key]; }
      });
      saveActiveProfileToStore(() => {
        SYSTEM = buildSystemPrompt(ctx, profile, extras);
        profileGrid.querySelectorAll('.pf-scanned').forEach(inp => inp.classList.remove('pf-scanned'));
        showToast('Profil gespeichert');
        updateProfileProgress();
      });
    });

    $('fa-pf-fake').addEventListener('click', () => {
      Object.keys(profile).forEach(k => delete profile[k]);
      Object.assign(profile, FAKE_DATA);
      loadProfileIntoInputs(profile);
      SYSTEM = buildSystemPrompt(ctx, profile, extras);
      showToast('Fake-Daten geladen');
      updateProfileProgress();
    });

    $('fa-pf-export').addEventListener('click', () => {
      const data = { profile: { ...profile }, extras: { ...extras } };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = 'formassist-profil.json';
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
      showToast('Profil exportiert');
    });

    $('fa-pf-import').addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = '.json';
      input.addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
          try {
            const data = JSON.parse(ev.target.result);
            if (data.profile && typeof data.profile === 'object') {
              Object.keys(profile).forEach(k => delete profile[k]);
              Object.assign(profile, data.profile);
              if (data.extras && typeof data.extras === 'object') {
                Object.keys(extras).forEach(k => delete extras[k]);
                Object.assign(extras, data.extras);
              }
              // Über saveActiveProfileToStore statt roher Legacy-Keys — sonst
              // fehlt der Import in faProfiles und ist nach dem Reload weg
              saveActiveProfileToStore();
              loadProfileIntoInputs(profile);
              renderExtrasInProfile();
              updateProfileProgress();
              SYSTEM = buildSystemPrompt(ctx, profile, extras);
              showToast('Profil importiert ✓');
            } else { showToast('Ungültiges Format'); }
          } catch { showToast('Fehler beim Lesen der Datei'); }
        };
        reader.readAsText(file);
      });
      input.click();
    });

    // ── Dokument-Scan (Vision-OCR): Bild → Vision-LLM → Profilfelder ──
    // Ablauf: Bild wählen → verkleinern (Datenminimierung) → expliziter
    // Bestätigungsschritt (Privacy) → Analyse → Felder nur VORbefüllen,
    // gespeichert wird erst durch den Nutzer über "Speichern".
    // Prompt: fa-prompts.js · Parsing: fa-actions.js · Modelle: fa-providers.js
    const SCAN_MAX_DIM = 1400; // längste Bildkante in px vor dem Upload (Datenminimierung)
    let scanDataUrl = null;

    const scanBtn     = $('fa-pf-scan');
    const scanConfirm = $('fa-pf-scan-confirm');
    const scanPreview = $('fa-pf-scan-preview');

    function resetScanBox() {
      scanDataUrl = null;
      scanConfirm.classList.remove('visible');
      scanPreview.removeAttribute('src');
    }

    scanBtn.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.addEventListener('change', async e => {
        const file = e.target.files[0];
        if (!file) return;
        try {
          scanDataUrl = await downscaleImage(file, SCAN_MAX_DIM);
          scanPreview.src = scanDataUrl;
          $('fa-pf-scan-note').textContent =
            `Das Bild wird verkleinert und einmalig zur Analyse an ${currentProviderLabel()} gesendet, nicht gespeichert. ` +
            'Erkannte Daten landen nur in den Profilfeldern unten — gespeichert wird erst mit "Speichern".';
          scanConfirm.classList.add('visible');
        } catch (err) {
          showToast(err.message || 'Bild konnte nicht verarbeitet werden');
        }
      });
      input.click();
    });

    $('fa-pf-scan-cancel').addEventListener('click', resetScanBox);

    $('fa-pf-scan-go').addEventListener('click', async () => {
      if (!scanDataUrl) return;
      const goBtn = $('fa-pf-scan-go');
      goBtn.disabled = true;
      scanBtn.disabled = true;
      goBtn.textContent = 'Analysiere…';
      try {
        const key = await loadKey();
        if (!key) throw new Error(`Kein ${currentProviderLabel()}-API-Key hinterlegt — siehe Einstellungen.`);
        const body = {
          model: getVisionModel(_provider),
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: buildScanPrompt() },
              { type: 'image_url', image_url: { url: scanDataUrl } },
            ],
          }],
          temperature: 0.1,
          max_tokens: 600,
        };
        const data   = await groqRequest(key, body, VISION_FALLBACK_MODEL);
        const reply  = data?.choices?.[0]?.message?.content || '';
        const values = parseScanReply(reply);
        if (!values || !Object.keys(values).length) throw new Error('Keine Profildaten im Dokument erkannt.');
        let applied = 0;
        Object.entries(values).forEach(([k, v]) => {
          const inp = shadow.getElementById(`fa-pf-${k}`);
          if (!inp) return;
          inp.value = v;
          inp.classList.add('pf-scanned');
          applied++;
        });
        updateProfileProgress();
        resetScanBox();
        showToast(`${applied} Feld${applied === 1 ? '' : 'er'} aus dem Dokument übernommen — bitte prüfen & speichern`);
      } catch (err) {
        showToast(err.message || 'Dokument-Analyse fehlgeschlagen');
      } finally {
        goBtn.disabled = false;
        goBtn.textContent = 'Analysieren';
        scanBtn.disabled = false;
      }
    });

    // Scan-Markierung verschwindet, sobald der Nutzer das Feld selbst anfasst
    profileGrid.addEventListener('input', e => e.target?.classList?.remove('pf-scanned'));

    // ── Autofill tip ──────────────────────────────────────────────────
    $('fa-autofill-btn').addEventListener('click', () => {
      if (!activeFieldEl) return;
      const pf = matchProfile(activeFieldEl, profile);
      if (pf) { fillField(activeFieldEl, profile[pf.key]); autofillTip.classList.remove('visible'); showToast('Feld ausgefüllt'); }
    });

    // ═══════════════════════════════════════════════════════════════════════
    // POSITIONS-GEDÄCHTNIS
    // ═══════════════════════════════════════════════════════════════════════

    function savePosition() {
      chrome.storage.local.set({ faPosition: {
        left: sidebar.style.left, top: sidebar.style.top,
        width: sidebar.style.width, height: sidebar.style.height,
        isDocked: false,
      }});
    }

    // ═══════════════════════════════════════════════════════════════════════
    // DRAG
    // ═══════════════════════════════════════════════════════════════════════

    let isDocked   = true;
    let dragStart  = null;
    let isDragging = false;

    header.addEventListener('pointerdown', e => {
      if (e.target.closest('button')) return;
      dragStart = { x: e.clientX, y: e.clientY, left: 0, top: 0, w: sidebar.offsetWidth, h: sidebar.offsetHeight };
      isDragging = false;
      header.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    header.addEventListener('pointermove', e => {
      if (!dragStart) return;
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      if (!isDragging) {
        if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
        undock();
        dragStart.left = parseFloat(sidebar.style.left);
        dragStart.top  = parseFloat(sidebar.style.top);
        isDragging = true;
      }
      sidebar.style.left = Math.max(0, Math.min(window.innerWidth  - dragStart.w, dragStart.left + dx)) + 'px';
      sidebar.style.top  = Math.max(0, Math.min(window.innerHeight - dragStart.h, dragStart.top  + dy)) + 'px';
    });
    header.addEventListener('pointerup', () => {
      if (dragStart) {
        if (isDragging) savePosition();
        dragStart  = null;
        isDragging = false;
      }
    });
    header.addEventListener('pointercancel', () => { dragStart = null; isDragging = false; });

    // ═══════════════════════════════════════════════════════════════════════
    // RESIZE
    // ═══════════════════════════════════════════════════════════════════════

    function undock() {
      if (isDocked) {
        isDocked = false;
        const w = sidebar.offsetWidth;
        sidebar.classList.add('no-animate');
        sidebar.style.right     = 'auto';
        sidebar.style.left      = (window.innerWidth - w) + 'px';
        sidebar.style.top       = '0px';
        sidebar.style.bottom    = 'auto';
        sidebar.style.height    = window.innerHeight + 'px';
        sidebar.style.transform = 'none';
        sidebar.classList.add('floating');
        requestAnimationFrame(() => sidebar.classList.remove('no-animate'));
      }
    }

    function bindResize(el, mode) {
      let start = null;
      el.addEventListener('pointerdown', e => {
        undock();
        const rect = sidebar.getBoundingClientRect();
        const style = window.getComputedStyle(sidebar);
        start = {
          x: e.clientX,
          y: e.clientY,
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          w: rect.width,
          h: rect.height,
          minW: parseFloat(style.minWidth) || 320,
          minH: parseFloat(style.minHeight) || 300,
        };
        el.setPointerCapture(e.pointerId);
        e.preventDefault(); e.stopPropagation();
      });
      el.addEventListener('pointermove', e => {
        if (!start) return;
        const dx = e.clientX - start.x;
        const dy = e.clientY - start.y;
        let left = start.left;
        let top = start.top;
        let width = start.w;
        let height = start.h;

        if (mode.includes('w')) {
          left = Math.max(20, Math.min(start.right - start.minW, start.left + dx));
          width = start.right - left;
        }
        if (mode.includes('e')) {
          width = Math.max(start.minW, Math.min(window.innerWidth - start.left - 20, start.w + dx));
        }
        if (mode.includes('n')) {
          top = Math.max(20, Math.min(start.bottom - start.minH, start.top + dy));
          height = start.bottom - top;
        }
        if (mode.includes('s')) {
          height = Math.max(start.minH, Math.min(window.innerHeight - start.top - 20, start.h + dy));
        }
        sidebar.style.left = left + 'px';
        sidebar.style.top = top + 'px';
        sidebar.style.width = width + 'px';
        sidebar.style.height = height + 'px';
      });
      el.addEventListener('pointerup',     () => { if (start) { start = null; savePosition(); } });
      el.addEventListener('pointercancel', () => { start = null; });
    }

    resizeHandles.forEach(handle => bindResize(handle, handle.dataset.resize));

    // ═══════════════════════════════════════════════════════════════════════
    // DARK MODE
    // ═══════════════════════════════════════════════════════════════════════

    function updateDarkIcon() {
      $('fa-dark-icon').innerHTML = darkMode
        ? '<circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>'
        : '<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>';
    }
    updateDarkIcon();

    $('fa-dark-btn').addEventListener('click', () => {
      darkMode = !darkMode;
      if (darkMode) hostEl.classList.add('dark'); else hostEl.classList.remove('dark');
      updateDarkIcon();
      chrome.storage.local.set({ faDarkMode: darkMode });
    });

    // ═══════════════════════════════════════════════════════════════════════
    // ÖFFNEN / SCHLIESSEN
    // ═══════════════════════════════════════════════════════════════════════

    let isOpen = false;

    function open() {
      isOpen = true;
      if (isDocked) sidebar.classList.add('open');
      else          sidebar.style.display = 'flex';
      triggerBtn.style.opacity       = '0';
      triggerBtn.style.pointerEvents = 'none';
      setTimeout(() => inputEl.focus(), 320);
    }

    function close() {
      isOpen = false;
      if (isDocked) sidebar.classList.remove('open');
      else          sidebar.style.display = 'none';
      triggerBtn.style.opacity       = '';
      triggerBtn.style.pointerEvents = '';
    }

    triggerBtn.addEventListener('click', () => {
      if (isOpen) { close(); return; }
      open();
    });
    $('fa-close').addEventListener('click', close);
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && isOpen) {
        close();
        return;
      }
      if ((e.ctrlKey || e.altKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        if (isOpen) { close(); return; }
        open();
      }
    });

    let ctxSignature = null;

    function getContextSignature(c) {
      const counts = c.forms.map(f => f.allFields.length).join(',');
      const submits = c.forms.map(f => f.submitText || '').join('|');
      const labels = c.forms.flatMap(f => f.allFields.map(x => x.label)).join('|');
      return `${c.page.hostname}|${c.page.pathname}|${c.page.title}|${counts}|${submits}|${labels}`;
    }

    function updateActionPanel() {
      const hasFields = allFields.length > 0;
      const agentBtn  = $('fa-ap-agent');
      const countEl   = $('fa-ap-field-count');
      const emptyEl   = $('fa-results-empty');
      if (agentBtn) agentBtn.disabled = !hasFields;
      if (countEl) {
        const stepNote = stepInfo && stepInfo.isMultiStep ? ` · S.${stepInfo.current}/${stepInfo.total}` : '';
        countEl.textContent = hasFields ? `${allFields.length} Felder${stepNote}` : 'Kein Formular';
      }
      const badge = $('fa-trigger-badge');
      if (badge) {
        badge.textContent = String(allFields.length);
        badge.style.display = hasFields ? 'flex' : 'none';
      }
      if (emptyEl) {
        const formIcon = `<svg viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/><path d="M9 12h6M9 16h4"/></svg>`;
        const eyeIcon  = `<svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
        const hostname = ctx && ctx.page && ctx.page.hostname ? ctx.page.hostname : '';
        if (hasFields) {
          const stepNote = stepInfo && stepInfo.isMultiStep ? ` · Seite ${stepInfo.current}/${stepInfo.total}` : '';
          emptyEl.innerHTML = `
            <div class="re-icon">${formIcon}</div>
            <div class="re-title">${allFields.length} Felder erkannt${stepNote}</div>
            ${hostname ? `<div class="re-sub">${hostname}</div>` : ''}
            <div class="re-hint">Starte den Agent zum automatischen Ausfüllen — oder stelle unten eine Frage.</div>
            <div class="re-chips">
              <button class="re-chip" data-suggest="explain">Formular erklären</button>
              <button class="re-chip" data-suggest="missing">Was fehlt noch?</button>
              <button class="re-chip primary" data-suggest="agent">⚡ Ausfüllen</button>
            </div>`;
          emptyEl.querySelector('[data-suggest="explain"]')?.addEventListener('click', () => askFormSummary());
          emptyEl.querySelector('[data-suggest="missing"]')?.addEventListener('click', () => send('Welche Pflichtfelder sind noch leer oder ungültig? Liste sie kurz auf.'));
          emptyEl.querySelector('[data-suggest="agent"]')?.addEventListener('click', () => startAgent());
        } else {
          emptyEl.innerHTML = `
            <div class="re-icon">${eyeIcon}</div>
            <div class="re-title">Kein Formular erkannt</div>
            ${hostname ? `<div class="re-sub">${hostname}</div>` : ''}
            <div class="re-hint">Ich beobachte die Seite weiter.</div>`;
        }
      }
      renderActionFieldList();
    }

    function renderActionFieldList() {
      const listEl = $('fa-ap-field-inner');
      if (!listEl) return;
      listEl.innerHTML = '';
      allFields.slice(0, 15).forEach(f => {
        const btn = document.createElement('button');
        btn.className = 'field-btn';
        btn.innerHTML = `<span class="field-btn-label">${f.label}</span><span class="field-type-tag">${f.type}</span>${f.required ? '<span class="req">Pflicht</span>' : ''}`;
        btn.addEventListener('click', () => {
          if (f.el) {
            f.el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            highlightField(f.el);
            activeFieldEl = f.el;
            fieldNameEl.textContent = f.label;
            fieldTag.classList.add('visible');
          }
          send(`Erkläre mir das Feld "${f.label}" — was soll ich eintragen?`);
        });
        listEl.appendChild(btn);
      });
      if (allFields.length > 15) {
        const more = document.createElement('div');
        more.style.cssText = 'font-size:11px;color:var(--text3);text-align:center;padding:4px 0';
        more.textContent = `+ ${allFields.length - 15} weitere Felder`;
        listEl.appendChild(more);
      }
    }

    function applyContext(freshCtx) {
      ctx = freshCtx;
      allFields = ctx.forms.flatMap(f => f.allFields);
      submitLabel = ctx.forms[0]?.submitText;
      ctxSignature = getContextSignature(ctx);
      stepInfo = getFormStepInfo();
      SYSTEM = buildSystemPrompt(ctx, profile, extras);
      $('fa-ctx-title').textContent = ctx.page.h1 || ctx.page.title || ctx.page.hostname;
      updateActionPanel();
    }

    function refreshContext(freshCtx) {
      const sig = getContextSignature(freshCtx);
      if (sig === ctxSignature) return;
      applyContext(freshCtx);
    }

    function getAssistantMode() {
      return normalizeAssistantMode($('fa-assistant-mode')?.value || _assistantMode);
    }

    function isContextualAssistantMode() {
      return getAssistantMode() !== 'classic';
    }

    function updateAssistantModeUi() {
      const select = $('fa-assistant-mode');
      if (select) select.value = normalizeAssistantMode(_assistantMode);
      const mode = getAssistantMode();
      if (mode === 'classic') {
        inputEl.placeholder = 'Frage zum Formular stellen…';
      } else if (mode === 'context') {
        inputEl.placeholder = 'Frage zum aktiven Feld stellen…';
      } else {
        inputEl.placeholder = 'Frage stellen… (nutzt Feldkontext)';
      }
    }

    applyContext(ctx);
    updateAssistantModeUi();

    // ═══════════════════════════════════════════════════════════════════════
    // MESSAGES
    // ═══════════════════════════════════════════════════════════════════════

    // Text-/HTML-Formatierung (escapeHtml, renderMarkdown, …): fa-format.js

    function copyText(text) {
      const value = String(text || '').trim();
      if (!value) return;
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(value).then(() => showToast('Antwort kopiert')).catch(() => fallbackCopy(value));
      } else {
        fallbackCopy(value);
      }
    }

    function fallbackCopy(text) {
      const ta = document.createElement('textarea');
      ta.value = text;
      Object.assign(ta.style, { position: 'fixed', top: '-1000px', left: '-1000px' });
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); showToast('Antwort kopiert'); }
      catch { showToast('Kopieren nicht möglich'); }
      ta.remove();
    }

    function addCopyButton(bubble, text) {
      bubble.classList.add('copyable');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'copy-btn';
      btn.title = 'Antwort kopieren';
      btn.innerHTML = '<svg viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>';
      btn.addEventListener('click', () => copyText(text));
      bubble.appendChild(btn);
    }

    function dismissEmpty() {
      $('fa-results-empty')?.remove();
    }

    function addMsg(role, html, chips, opts = {}) {
      dismissEmpty();
      const div = document.createElement('div');
      div.className = 'msg ' + role;
      const bubble = document.createElement('div');
      bubble.className = 'bubble';
      const renderedHtml = role === 'user' && !opts.trustedHtml ? textToHtml(html) : html;
      bubble.innerHTML = renderedHtml;
      if (chips?.length) {
        const cd = document.createElement('div');
        cd.className = 'chips';
        chips.forEach(c => {
          const b = document.createElement('button');
          b.className = 'chip'; b.textContent = c;
          b.addEventListener('click', () => send(c));
          cd.appendChild(b);
        });
        bubble.appendChild(cd);
      }
      if (role === 'ai' && opts.copy !== false) addCopyButton(bubble, opts.copyText || htmlToPlainText(renderedHtml));
      div.appendChild(bubble);
      messagesEl.appendChild(div);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function showTyping() {
      dismissEmpty();
      const div = document.createElement('div');
      div.id = 'fa-typing'; div.className = 'typing-row';
      div.innerHTML = `<div class="typing-bubble"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>`;
      messagesEl.appendChild(div);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
    function removeTyping() { $('fa-typing')?.remove(); }

    // ═══════════════════════════════════════════════════════════════════════
    // AI
    // ═══════════════════════════════════════════════════════════════════════

    let history       = [];
    let activeFieldEl = null;

    // ── Persistent chat memory (per domain, survives page loads) ─────────
    const CHAT_MEM_KEY = 'faChatMem';
    const CHAT_MEM_MAX_MSGS = 24;
    const CHAT_MEM_MAX_DOMAINS = 12;

    function saveChatMemory() {
      const trimmed = history.slice(-CHAT_MEM_MAX_MSGS)
        .map(m => ({ role: m.role, content: String(m.content).slice(0, 2000) }));
      chrome.storage.local.get([CHAT_MEM_KEY], stored => {
        const mem = stored[CHAT_MEM_KEY] || {};
        mem[location.hostname] = { messages: trimmed, updated: Date.now() };
        const pruned = Object.fromEntries(
          Object.entries(mem)
            .sort((a, b) => (b[1].updated || 0) - (a[1].updated || 0))
            .slice(0, CHAT_MEM_MAX_DOMAINS)
        );
        chrome.storage.local.set({ [CHAT_MEM_KEY]: pruned });
      });
    }

    function restoreChatMemory() {
      chrome.storage.local.get([CHAT_MEM_KEY], stored => {
        const entry = stored[CHAT_MEM_KEY]?.[location.hostname];
        if (!entry?.messages?.length) return;
        history = entry.messages.map(m => ({ role: m.role, content: m.content }));
        dismissEmpty();
        const divider = document.createElement('div');
        divider.className = 'chat-divider';
        divider.innerHTML = '<span>Frühere Unterhaltung · Gedächtnis aktiv</span>';
        messagesEl.appendChild(divider);
        entry.messages.slice(-6).forEach(m => {
          const div = document.createElement('div');
          div.className = `msg ${m.role === 'user' ? 'user' : 'ai'} restored`;
          const bubble = document.createElement('div');
          bubble.className = 'bubble';
          if (m.role === 'user') {
            bubble.innerHTML = textToHtml(String(m.content).split('\n')[0].slice(0, 220));
          } else {
            bubble.innerHTML = renderMarkdown(splitActionBlock(m.content).text.slice(0, 600));
          }
          div.appendChild(bubble);
          messagesEl.appendChild(div);
        });
        messagesEl.scrollTop = messagesEl.scrollHeight;
      });
    }

    function clearChat() {
      history = [];
      messagesEl.innerHTML = '<div class="results-empty" id="fa-results-empty"></div>';
      chrome.storage.local.get([CHAT_MEM_KEY], stored => {
        const mem = stored[CHAT_MEM_KEY] || {};
        delete mem[location.hostname];
        chrome.storage.local.set({ [CHAT_MEM_KEY]: mem });
      });
      updateActionPanel();
      showToast('Neuer Chat — Gedächtnis für diese Seite geleert');
    }

    // ── Chat-Aktionen: die KI kann Felder direkt aus der Antwort füllen ──
    // Parsing/Härtung (splitActionBlock, sanitizeAgentActions): fa-actions.js
    async function executeChatActions(actions) {
      if (!actions.length) return;
      let applied = 0;
      const rows = [];
      for (const act of actions.slice(0, 20)) {
        const el = resolveActionElement(act);
        if (!el) { rows.push({ ok: false, label: act.label || act.selector, note: 'nicht gefunden' }); continue; }
        let ok = false;
        let note = act.value || '';
        const type = (el.type || '').toLowerCase();

        if (act.action === 'check') {
          const wantOff = /^(nein|no|false|0|aus|off|uncheck(?:ed)?)$/i.test(String(act.value || '').trim());
          if (type === 'radio') {
            await fillField(el, act.value || act.label || '');
            ok = isActionApplied(el, 'check');
          } else {
            if (el.checked === wantOff) { el.click(); el.dispatchEvent(new Event('change', { bubbles: true })); }
            ok = el.checked === !wantOff;
            note = wantOff ? 'abgewählt' : 'angekreuzt';
          }
        } else {
          await fillField(el, act.value || '');
          ok = isActionApplied(el, act.action, act.value || '');
        }

        if (ok) { applied++; highlightField(el); }
        rows.push({ ok, label: act.label || act.selector, note: ok ? note : 'nicht übernommen' });
        await sleep(60);
      }
      const div = document.createElement('div');
      div.className = 'msg ai';
      const bubble = document.createElement('div');
      bubble.className = 'bubble action-result';
      bubble.innerHTML = `<div class="ar-hdr">${applied ? '✓' : '✗'} ${applied} Feld${applied === 1 ? '' : 'er'} ausgefüllt</div>`
        + rows.map(r => `<div class="ar-row ${r.ok ? 'ok' : 'fail'}"><span class="ar-icon">${r.ok ? '✓' : '✗'}</span><span class="ar-label">${escapeHtml(r.label || '')}</span>${r.note ? `<span class="ar-value">${escapeHtml(String(r.note).slice(0, 40))}</span>` : ''}</div>`).join('');
      div.appendChild(bubble);
      messagesEl.appendChild(div);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function createStreamBubble() {
      const div = document.createElement('div');
      div.className = 'msg ai';
      const bubble = document.createElement('div');
      bubble.className = 'bubble';
      div.appendChild(bubble);
      messagesEl.appendChild(div);
      return { div, bubble };
    }

    async function askAI(userText, opts = {}) {
      const key = await loadKey();
      if (!key) { addMsg('ai', `API-Schlüssel für ${currentProviderLabel()} nicht gefunden. Bitte in den FormAssist-Einstellungen hinterlegen.`); return ''; }
      const includeActive = opts.includeActive === false
        ? false
        : (opts.includeActive === true ? true : isContextualAssistantMode());
      const content = userText + (includeActive ? getActiveFieldContext(activeFieldEl) : '');
      history.push({ role: 'user', content });
      showTyping();

      const useStream = opts.render !== false;

      try {
        // Seite neu scannen, damit das Modell live Feldwerte sieht (nicht den
        // Snapshot vom Seitenaufruf) — nötig für präzise Chat-Aktionen.
        let liveSystem = SYSTEM;
        try { liveSystem = buildSystemPrompt(extractRichContext(), profile, extras); }
        catch (err) { console.warn('[FormAssist] Live-Rescan fehlgeschlagen — nutze letzten Kontext:', err); }

        const reqBody = {
          model: _model, max_tokens: opts.maxTokens || 500, stream: useStream,
          messages: [{ role: 'system', content: liveSystem }, ...history.slice(-CHAT_HISTORY_WINDOW)],
        };

        // ── Nicht-Streaming-Pfad ──────────────────────────────────────
        if (!useStream) {
          const data = await groqRequest(key, reqBody);
          removeTyping();
          const reply = data.choices?.[0]?.message?.content?.trim();
          if (reply) { history.push({ role: 'assistant', content: reply }); saveChatMemory(); return reply; }
          addMsg('ai', 'Unbekannter Fehler.'); history.pop(); return '';
        }

        // ── Streaming-Pfad (via Background-Port) ──────────────────────
        removeTyping();
        const { div: msgDiv, bubble: streamBubble } = createStreamBubble();
        let rawText = '';
        const decodeSSE = createSSEDecoder();

        await groqStream(key, reqBody, chunk => {
          const delta = decodeSSE(chunk);
          if (!delta) return;
          rawText += delta;
          // Einen (evtl. unvollständigen) Aktionsblock beim Streamen ausblenden
          streamBubble.innerHTML = renderMarkdown(rawText.split('<<<ACTIONS')[0]);
          messagesEl.scrollTop = messagesEl.scrollHeight;
        });

        const fullText = rawText.trim();
        if (fullText) {
          history.push({ role: 'assistant', content: fullText });
          saveChatMemory();
          const { text: visibleText, actions } = splitActionBlock(fullText);
          if (visibleText) {
            streamBubble.innerHTML = renderMarkdown(visibleText);
            streamBubble.classList.add('copyable');
            addCopyButton(streamBubble, visibleText);
          } else {
            msgDiv.remove();
          }
          if (actions.length) await executeChatActions(actions);
        } else {
          msgDiv.remove();
          addMsg('ai', 'Unbekannter Fehler.'); history.pop();
        }
        messagesEl.scrollTop = messagesEl.scrollHeight;
        return fullText;

      } catch (err) {
        removeTyping();
        addMsg('ai', 'Verbindungsfehler: ' + (err?.message || 'Bitte Internetverbindung prüfen.'));
        history.pop(); return '';
      }
    }

    async function send(text) {
      const t = (text !== undefined ? text : inputEl.value).trim();
      if (!t) return;
      inputEl.value = ''; inputEl.style.height = 'auto';
      addMsg('user', t);
      if (guidedAskState.active && agentState.guided) {
        await handleGuidedAnswer(t);
        return;
      }
      if (manualAssistState.pending && agentState.active) {
        await handleManualAssistAnswer(t);
        return;
      }
      askAI(t);
    }

    $('fa-send').addEventListener('click', () => send());
    inputEl.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
    inputEl.addEventListener('input',   () => { inputEl.style.height = 'auto'; inputEl.style.height = Math.min(inputEl.scrollHeight, 100) + 'px'; });

    function highlightField(el) {
      if (!el) return;
      const prevOutline = el.style.outline;
      const prevOffset = el.style.outlineOffset;
      el.style.outline = '2px solid #2563eb';
      el.style.outlineOffset = '3px';
      setTimeout(() => {
        el.style.outline = prevOutline;
        el.style.outlineOffset = prevOffset;
      }, 1800);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // FILL-CHOREOGRAFIE + UNDO — sichtbares Ausfüllen, ein Klick zurück
    // ═══════════════════════════════════════════════════════════════════════

    // Grüner Puls am Feld.
    // `delay` staffelt rein visuell (z. B. für die synchrone Deterministik-Runde).
    function flashFilled(el, delay = 0) {
      if (!el || typeof el.getBoundingClientRect !== 'function') return;
      const run = () => {
        let rect;
        try { rect = el.getBoundingClientRect(); } catch { return; }
        if (!rect || (rect.width === 0 && rect.height === 0)) return;
        // Transienter grüner Outline-Puls (gleiche Technik wie highlightField)
        const prevOutline = el.style.outline;
        const prevOffset  = el.style.outlineOffset;
        el.style.outline = '2px solid #22c55e';
        el.style.outlineOffset = '2px';
        setTimeout(() => { el.style.outline = prevOutline; el.style.outlineOffset = prevOffset; }, 1100);
      };
      if (delay > 0) setTimeout(run, delay); else run();
    }

    function setNativeValue(el, val) {
      try {
        const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        if (setter) setter.call(el, val); else el.value = val;
      } catch { el.value = val; }
    }

    // Restaurierbaren Zustand eines Feldes erfassen (vor dem Füllen).
    function fieldUndoState(el) {
      if (!el) return null;
      const t = (el.type || '').toLowerCase();
      if (t === 'radio') {
        const root = el.form || el.getRootNode?.() || document;
        const els = el.name
          ? Array.from(root.querySelectorAll(`input[type="radio"][name="${CSS.escape(el.name)}"]`))
          : [el];
        return { kind: 'radio', els, checked: els.map(r => r.checked) };
      }
      if (t === 'checkbox') return { kind: 'checkbox', el, checked: el.checked };
      if (el.tagName === 'SELECT') return { kind: 'select', el, selected: Array.from(el.options).map(o => o.selected) };
      if (el.isContentEditable) return { kind: 'html', el, html: el.innerHTML };
      return { kind: 'value', el, value: el.value };
    }

    // Snapshot in den Undo-Stack des laufenden Agent-Runs (nur der erste je Feld).
    function pushUndo(el) {
      if (!el || !agentState) return;
      agentState.undo = agentState.undo || [];
      const already = agentState.undo.some(s => s.el === el || (s.els && s.els.includes(el)));
      if (already) return;
      const snap = fieldUndoState(el);
      if (snap) agentState.undo.push(snap);
    }

    function restoreUndoState(s) {
      try {
        if (s.kind === 'radio') {
          s.els.forEach((r, i) => { r.checked = s.checked[i]; });
          (s.els.find((r, i) => s.checked[i]) || s.els[0])?.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (s.kind === 'checkbox') {
          s.el.checked = s.checked;
          s.el.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (s.kind === 'select') {
          Array.from(s.el.options).forEach((o, i) => { o.selected = !!s.selected[i]; });
          s.el.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (s.kind === 'html') {
          s.el.innerHTML = s.html;
          s.el.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
          setNativeValue(s.el, s.value);
          s.el.dispatchEvent(new Event('input',  { bubbles: true }));
          s.el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      } catch {}
    }

    function undoAgentFill() {
      const stack = agentState?.undo || [];
      if (!stack.length) return;
      for (let i = stack.length - 1; i >= 0; i--) restoreUndoState(stack[i]);
      const n = stack.length;
      agentState.undo = [];
      agentState.filledFields = [];
      hideUndoToast();
      showToast(`Ausfüllen rückgängig gemacht (${n} Feld${n !== 1 ? 'er' : ''})`);
    }

    function askFormSummary() {
      if (profileVisible) hideProfile();
      open();
      addMsg('user', 'Erkläre mir dieses Formular kurz, bevor ich starte.');
      askAI(
        'Fasse dieses Formular in einfacher Sprache zusammen: Zweck, wichtigste Pflichtangaben, benötigte Unterlagen/Daten und typische Stolperstellen. Antworte mit kurzen Abschnitten.',
        { maxTokens: 650, includeActive: false }
      );
    }

    // ═══════════════════════════════════════════════════════════════════════
    // AGENT MODE — vollautomatischer Formular-Agent
    // ═══════════════════════════════════════════════════════════════════════

    function normalizeForCompare(value) {
      return clean(String(value ?? '')).toLowerCase();
    }

    // Fuzzy-Label-Vergleich: exakt → enthalten → Token-Überlappung (≥ 60 %).
    // So matcht eine gelernte Antwort wie „Telefonnummer" auch „Telefon (mobil)".
    function labelsRoughlyMatch(a, b) {
      const na = normalizeForCompare(a);
      const nb = normalizeForCompare(b);
      if (!na || !nb) return false;
      if (na === nb) return true;
      if (na.length > 3 && nb.length > 3 && (na.includes(nb) || nb.includes(na))) return true;
      const tokenize = s => new Set(s.split(/[^a-z0-9äöüß]+/i).filter(w => w.length > 2));
      const ta = tokenize(na);
      const tb = tokenize(nb);
      if (!ta.size || !tb.size) return false;
      let common = 0;
      for (const t of ta) if (tb.has(t)) common++;
      return common / Math.min(ta.size, tb.size) >= 0.6;
    }

    // Gespeicherten Wert zu einem Feld-Label suchen: erst Session-Antworten,
    // dann gelernte Extras — exakter Match vor Fuzzy-Match.
    function findStoredAnswer(label) {
      const sources = [agentState.sessionAnswers || {}, extras];
      const labelNorm = normalizeForCompare(label);
      for (const src of sources) {
        for (const [k, v] of Object.entries(src)) {
          if (v && normalizeForCompare(k) === labelNorm) return v;
        }
      }
      for (const src of sources) {
        for (const [k, v] of Object.entries(src)) {
          if (v && labelsRoughlyMatch(k, label)) return v;
        }
      }
      return null;
    }

    // Freitext-Antwort des Nutzers ("nächster Monat", "zwanzigster Februar") in
    // den exakten Wert wandeln, den das Feld akzeptiert — ein kleiner KI-Call.
    async function aiNormalizeFieldValue(el, label, raw) {
      try {
        const key = await loadKey();
        if (!key) return null;
        const type = el.tagName === 'SELECT' ? 'select' : ((el.type || 'text').toLowerCase());
        const options = el.tagName === 'SELECT'
          ? Array.from(el.options).map(o => clean(o.text)).filter(Boolean).slice(0, 15)
          : [];
        const fmt = {
          date: 'YYYY-MM-DD', month: 'YYYY-MM', week: 'YYYY-Www',
          time: 'HH:MM', 'datetime-local': 'YYYY-MM-DDTHH:MM', number: 'nur Ziffern',
        }[type];
        const prompt = [
          `Heute ist ${new Date().toISOString().split('T')[0]}.`,
          `Formularfeld: "${label}" (Typ: ${type})${fmt ? ` — erwartetes Format: ${fmt}` : ''}`,
          options.length ? `Optionen: ${options.join(' | ')}` : '',
          `Nutzer-Antwort: "${raw}"`,
          '',
          options.length
            ? 'Wähle die am besten passende Option. Antworte NUR mit der Option EXAKT wie angegeben, oder "?" wenn keine passt.'
            : 'Wandle die Antwort in den exakten Feldwert um (relative Angaben wie "nächster Monat" anhand des heutigen Datums umrechnen). Antworte NUR mit dem Wert, oder "?".',
        ].filter(Boolean).join('\n');
        const data = await groqRequest(key, { model: _model, max_tokens: 40, messages: [{ role: 'user', content: prompt }] });
        const v = String(data?.choices?.[0]?.message?.content || '')
          .split('\n')[0].replace(/^["']|["']$/g, '').trim();
        if (!v || v === '?' || /^unbekannt$/i.test(v)) return null;
        return v.slice(0, 200);
      } catch { return null; }
    }

    // Füllen + verifizieren; lehnt das Feld den Rohwert ab, wird er per KI
    // normalisiert und einmal erneut versucht. Gibt den übernommenen Wert oder null.
    async function fillFieldVerified(el, label, raw) {
      await fillField(el, raw);
      if (isActionApplied(el, 'fill', raw)) return raw;
      const norm = await aiNormalizeFieldValue(el, label, raw);
      if (norm && normalizeForCompare(norm) !== normalizeForCompare(raw)) {
        await fillField(el, norm);
        if (isActionApplied(el, 'fill', norm)) return norm;
      }
      return null;
    }

    function agentDoneMessage() {
      const total = agentState.filledFields.length;
      const pages = (agentState.pages || 0) + 1;
      const pageNote = pages > 1 ? ` über ${pages} Seiten` : '';
      let msg = `✅ Fertig — ${total} Feld${total === 1 ? '' : 'er'} ausgefüllt${pageNote}.`;
      const skipped = agentState.skippedOptional || [];
      if (skipped.length) {
        const shown = skipped.slice(0, 4).map(l => `„${l}"`).join(', ');
        const more  = skipped.length > 4 ? ` und ${skipped.length - 4} weitere` : '';
        msg += `\n${skipped.length} optionale${skipped.length === 1 ? 's' : ''} Feld${skipped.length === 1 ? '' : 'er'} ohne passende Daten leer gelassen: ${shown}${more}. Sag mir einfach, was ich dort eintragen soll.`;
      }
      return msg;
    }

    function getActionConfidence(action) {
      if (Number.isFinite(action?.confidence)) return action.confidence;
      if (!action?.source || action.source === 'profile') return 0.95;
      if (action.source === 'inferred') return 0.78;
      if (action.source === 'suggestion') return 0.52;
      return 0.6;
    }

    function getCurrentFieldValue(el) {
      if (!el) return '';
      const type = (el.type || '').toLowerCase();
      if (type === 'checkbox') return el.checked ? 'true' : 'false';
      if (type === 'radio') {
        const root = el.form || el.getRootNode?.() || document;
        const checked = el.name ? root.querySelector(`input[type="radio"][name="${CSS.escape(el.name)}"]:checked`) : (el.checked ? el : null);
        if (!checked) return '';
        return clean(getLabel(checked) || checked.value || 'true');
      }
      // Custom-Widgets (div-Combobox, contenteditable) tragen den Wert im Text
      if (isRichTextField(el) || (isAriaCombobox(el) && el.tagName !== 'INPUT')) {
        return clean(el.textContent || '');
      }
      if (el.tagName === 'SELECT') {
        const selected = Array.from(el.selectedOptions || []);
        if (!selected.length) return '';
        const first = selected[0];
        return clean(first.text || first.label || first.value);
      }
      return clean(el.value || '');
    }

    function isActionApplied(el, action, expectedValue = '') {
      if (!el) return false;
      const type = (el.type || '').toLowerCase();
      if (action === 'check') return !!el.checked;
      const expected = normalizeForCompare(expectedValue);
      if (!expected) return normalizeForCompare(getCurrentFieldValue(el)) !== '';

      if (type === 'checkbox') {
        const truthy = /^(ja|yes|true|1|x|ok|checked|ausgewählt)$/i.test(expectedValue);
        return el.checked === truthy;
      }

      const current = normalizeForCompare(getCurrentFieldValue(el));
      if (!current) return false;

      if (el.tagName === 'SELECT') {
        const rawValue = normalizeForCompare(el.value);
        return current === expected || rawValue === expected || current.includes(expected) || expected.includes(current);
      }

      if (['date', 'month', 'week', 'time', 'datetime-local'].includes(type)) {
        const expectedNorm = normalizeTemporalValue(type, expectedValue) || parseDateToISO(expectedValue) || expected;
        const currentNorm  = normalizeTemporalValue(type, current) || current;
        return normalizeForCompare(currentNorm) === normalizeForCompare(expectedNorm);
      }

      return current === expected || current.includes(expected) || expected.includes(current);
    }

    function resolveActionElement(act) {
      if (!act) return null;
      let el = null;
      if (act.selector) {
        try { el = document.querySelector(act.selector); } catch {}
      }
      if (el) return el;
      const wanted = normalizeForCompare(act.label);
      if (!wanted) return null;
      const exact = allFields.find(f => f?.el && isVisible(f.el) && normalizeForCompare(f.label) === wanted)?.el;
      if (exact) return exact;
      // Fuzzy-Fallback über einen frischen Scan — Modell-Labels matchen selten
      // 1:1, und SPA-Re-Renders können die ursprünglich gescannten Elemente lösen.
      const fresh = extractRichContext().forms.flatMap(f => f.allFields);
      return fresh.find(f => f?.el && isVisible(f.el) && labelsRoughlyMatch(f.label, act.label))?.el || null;
    }

    function applyDeterministicProfileFill() {
      const freshFields = extractRichContext().forms.flatMap(f => f.allFields);
      const seenRadioGroups = new Set();
      let filled = 0;

      for (const f of freshFields) {
        const el = f?.el;
        if (!el || !isVisible(el)) continue;
        const type = (el.type || '').toLowerCase();
        if (type === 'radio' && el.name) {
          if (seenRadioGroups.has(el.name)) continue;
          seenRadioGroups.add(el.name);
        }

        const pf = matchProfile(el, profile);
        if (!pf || !profile[pf.key]) continue;
        const ac = (el.getAttribute('autocomplete') || '').toLowerCase();
        const hasStrongAutocomplete = ac && ac !== 'on' && ac !== 'off' && pf.ac.some(a => ac.includes(a));
        const labelNorm = normalizeForCompare(getLabel(el));
        const pfLabelNorm = normalizeForCompare(pf.label);
        const hasStrongLabel = labelNorm === pfLabelNorm || labelNorm.startsWith(pfLabelNorm + ' ') || labelNorm.includes(` ${pfLabelNorm}`);
        if (!hasStrongAutocomplete && !hasStrongLabel) continue;

        const hasError = !!getError(el) || (el.willValidate && !el.checkValidity());
        const current = normalizeForCompare(getCurrentFieldValue(el));
        if (current && !hasError) continue;

        const value = profile[pf.key];
        pushUndo(el);
        fillField(el, value);
        if (isActionApplied(el, 'fill', value)) {
          flashFilled(el, filled * 90);
          filled++;
          agentState.filledFields.push({ label: f.label || pf.label, value, url: location.href });
        }
      }

      return filled;
    }

    function getUnresolvedFieldCandidates() {
      const freshCtx = extractRichContext();
      const unresolved = [];
      const seenRadioGroups = new Set();

      freshCtx.forms.forEach(form => {
        form.sections.forEach(sec => {
          sec.fields.forEach(f => {
            const el = f?.el;
            if (!el || !isVisible(el)) return;
            const type = (el.type || '').toLowerCase();

            if (type === 'radio' && el.name) {
              const key = `${form.index}:${el.name}`;
              if (seenRadioGroups.has(key)) return;
              seenRadioGroups.add(key);
            }

            const invalid = !!getError(el) || (el.willValidate && !el.checkValidity());
            let missing = false;

            if (type === 'radio' && el.name) {
              const root = el.form || el.getRootNode?.() || document;
              const checked = root.querySelector(`input[type="radio"][name="${CSS.escape(el.name)}"]:checked`);
              missing = !!f.required && !checked;
            } else if (type === 'checkbox') {
              missing = !!f.required && !el.checked;
            } else if (el.tagName === 'SELECT') {
              missing = !!f.required && !clean(el.value);
            } else {
              missing = !!f.required && !clean(el.value || '');
            }

            if (!missing && !invalid) return;

            unresolved.push({
              selector: f.selector || getAgentSelector(el),
              label: f.label || getLabel(el) || 'dieses Feld',
              hint: f.hint || getHint(el) || '',
              options: Array.isArray(f.options) ? f.options : [],
              invalid,
            });
          });
        });
      });

      unresolved.sort((a, b) => Number(b.invalid) - Number(a.invalid));
      return unresolved;
    }

    function showManualAssistQuestion(next) {
      const div = document.createElement('div');
      div.className = 'msg ai';
      const bubble = document.createElement('div');
      bubble.className = 'bubble guided-q';

      const eyebrow = document.createElement('div');
      eyebrow.className = 'gq-eyebrow';
      eyebrow.textContent = next.label || 'Frage';

      const reason = next.invalid ? 'Das Feld ist noch ungültig.' : 'Ich brauche noch eine Pflichtangabe.';
      const text = document.createElement('div');
      text.className = 'gq-text';
      text.textContent = `${reason} Was soll ich bei "${next.label}" eintragen?`;
      bubble.append(eyebrow, text);

      if (next.options.length) {
        const chipsEl = document.createElement('div');
        chipsEl.className = 'gq-chips';
        next.options.slice(0, 10).forEach(opt => {
          const btn = document.createElement('button');
          btn.className = 'gq-chip';
          btn.textContent = opt;
          btn.addEventListener('click', () => {
            chipsEl.querySelectorAll('.gq-chip').forEach(chip => { chip.disabled = true; });
            btn.classList.add('gq-selected');
            handleManualAssistAnswer(opt);
          });
          chipsEl.appendChild(btn);
        });
        bubble.appendChild(chipsEl);
      }

      if (next.hint) {
        const hint = document.createElement('div');
        hint.className = 'gq-hint';
        hint.textContent = `Hinweis: ${next.hint}`;
        bubble.appendChild(hint);
      }

      const entryHint = document.createElement('div');
      entryHint.className = 'gq-hint';
      entryHint.textContent = 'Oder tippe unten deine Antwort ein.';
      bubble.appendChild(entryHint);

      div.appendChild(bubble);
      messagesEl.appendChild(div);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function askUserForMissingField() {
      const next = getUnresolvedFieldCandidates()[0];
      if (!next) return false;

      manualAssistState.pending = next;
      if (isContextualAssistantMode()) {
        showManualAssistQuestion(next);
      } else {
        const reason = next.invalid ? 'Das Feld ist noch ungültig.' : 'Ich brauche noch eine Pflichtangabe.';
        const optionText = next.options.length ? `\nOptionen: ${next.options.slice(0, 10).join(', ')}` : '';
        const hintText = next.hint ? `\nHinweis: ${next.hint}` : '';
        addMsg('ai', `${reason}\nBitte gib einen Wert fuer **${next.label}** ein.${optionText}${hintText}`, null, { copy: false });
      }

      const target = resolveActionElement(next);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        highlightField(target);
      }
      return true;
    }

    function clickNextButtonIfReady(formEl) {
      if (!formEl) return false;
      if (typeof formEl.checkValidity === 'function' && !formEl.checkValidity()) return false;
      const nextBtn = Array.from(formEl.querySelectorAll('button[type="submit"], input[type="submit"]')).find(btn => {
        if (btn.disabled) return false;
        const txt = getElementTextValue(btn).toLowerCase();
        return /(weiter|next|fortschritt|fortfahren|continue)/.test(txt);
      });
      if (!nextBtn) return false;
      const hidden = formEl.querySelector('input[name*="submit"][type="hidden"]');
      if (hidden) {
        const submitValue = nextBtn.getAttribute?.('data-submit-value') || nextBtn.value || hidden.getAttribute('value') || 'next';
        hidden.value = submitValue;
      }
      if (typeof formEl.requestSubmit === 'function') formEl.requestSubmit(nextBtn.form === formEl ? nextBtn : undefined);
      else nextBtn.click();
      return true;
    }

    async function handleManualAssistAnswer(answer) {
      const pending = manualAssistState.pending;
      if (!pending) return;

      const el = resolveActionElement(pending);
      if (!el) {
        manualAssistState.pending = null;
        if (!askUserForMissingField()) {
          addMsg('ai', 'Ich finde das Feld gerade nicht mehr. Bitte Agent neu starten.', null, { copy: false });
          agentState.active = false;
        }
        return;
      }

      const appliedValue = await fillFieldVerified(el, pending.label, answer);
      if (appliedValue === null) {
        const optionText = pending.options?.length ? ` Mögliche Optionen: ${pending.options.slice(0, 6).join(', ')}.` : '';
        addMsg('ai', renderMarkdown(`Der Wert passt noch nicht zu **${pending.label}**.${optionText} Bitte antworte präziser.`), null, { copy: false });
        return;
      }
      if (appliedValue !== answer) {
        addMsg('ai', renderMarkdown(`Verstanden — ich habe **${appliedValue}** eingetragen.`), null, { copy: false });
      }

      agentState.filledFields.push({ label: pending.label, value: appliedValue, url: location.href });
      manualAssistState.pending = null;
      await sleep(200);

      // Auto-Weiter nur wenn der Toggle „Automatisch weiterklicken" an ist.
      // Sonst fällt es auf runAgentStep() zurück, das den Nav-Schritt über
      // handleGuidedNavigation routet und dort den manuellen „Weiter"-Button zeigt.
      const formEl = el.form || stepInfo?.form || document.querySelector('form');
      if (agentState.autoNavigate && clickNextButtonIfReady(formEl)) {
        persistAgentResume({
          filledFields: agentState.filledFields,
          startUrl: agentState.startUrl,
          guided: agentState.guided,
          autoNavigate: agentState.autoNavigate,
          sessionAnswers: agentState.sessionAnswers,
          pages: (agentState.pages || 0) + 1,
        });
        addMsg('ai', 'Danke — ich mache weiter und klicke auf "Weiter".', null, { copy: false });
        return;
      }

      await runAgentStep();
    }

    // Agent-Prompt (Feldbestand + Strategie): buildAgentPrompt in fa-prompts.js

    let agentState = { active: false, guided: false, autoNavigate: true, sessionAnswers: {}, filledFields: [], startUrl: '', lastFailures: [], pages: 0 };

    // Agent-Zustand für die Fortsetzung nach einer Seiten-Navigation sichern.
    // chrome.storage.session kann fehlen (ältere Chrome-Versionen) — dann läuft
    // der Agent ohne Resume weiter, alles andere bleibt funktionsfähig.
    function persistAgentResume(resumeData) {
      try { chrome.storage.session?.set?.({ faAgentResume: resumeData }); }
      catch (err) { console.warn('[FormAssist] Agent-Resume konnte nicht gesichert werden:', err); }
    }
    let guidedAskState = { active: false, queue: [], navAction: null };
    let manualAssistState = { pending: null };
    let agentStatusBubble = null;

    async function runFieldByFieldAgent() {
      const key = await loadKey();
      if (!key) {
        addMsg('ai', `API-Schlüssel für ${currentProviderLabel()} fehlt. Bitte in den FormAssist-Einstellungen hinterlegen.`);
        agentState.active = false;
        return;
      }

      const freshCtx = extractRichContext();
      const seenRadioGroups = new Set();
      const fields = [];

      for (const form of freshCtx.forms) {
        for (const sec of form.sections) {
          for (const f of sec.fields) {
            const el = f?.el;
            if (!el || !isVisible(el)) continue;
            const type = (el.type || '').toLowerCase();
            if (SKIP_TYPES.has(type)) continue;
            if (type === 'radio' && el.name) {
              const rk = `${form.index}:${el.name}`;
              if (seenRadioGroups.has(rk)) continue;
              seenRadioGroups.add(rk);
            }
            const curVal = getCurrentFieldValue(el);
            const hasError = !!getError(el) || (el.willValidate && !el.checkValidity());
            if (curVal && !hasError) continue;
            fields.push({
              el,
              selector: f.selector || getAgentSelector(el),
              label: f.label || getLabel(el) || 'Feld',
              type: f.type || type || 'text',
              options: Array.isArray(f.options) ? f.options : [],
              hint: f.hint || '',
              required: !!f.required,
            });
          }
        }
      }

      // Navigations-/Submit-Button erkennen
      let navAction = null;
      for (const form of freshCtx.forms) {
        const btns = Array.from(form.formEl?.querySelectorAll?.('button, input[type="button"], input[type="submit"]') || [])
          .filter(btn => isVisible(btn) && !btn.disabled);
        for (const btn of btns) {
          const lbl = getElementTextValue(btn);
          if (!lbl) continue;
          const isSubmit = /(absenden|senden|submit|abschicken|fertig stellen|fertigstellen)/i.test(lbl);
          const isNext   = /(weiter|next|fortfahren|continue|nächste|naechste)/i.test(lbl);
          if (isSubmit || isNext) {
            navAction = { action: isSubmit ? 'submit' : 'click', selector: getAgentSelector(btn), label: lbl, isNavigation: true };
            break;
          }
        }
        if (navAction) break;
      }

      // Gemeinsamer Kontextblock für jeden KI-Aufruf
      const profileLines = PROFILE_FIELDS.filter(pf => profile[pf.key])
        .map(pf => `${pf.label}: "${profile[pf.key]}"`).join('\n');
      const extrasLines = Object.entries(extras).map(([k, v]) => `${k}: "${v}"`).join('\n');
      const sessionLines = Object.entries(agentState.sessionAnswers || {}).map(([k, v]) => `${k}: "${v}"`).join('\n');
      const prevLines = (agentState.filledFields || [])
        .filter(f => f.url && f.url !== location.href).slice(-24)
        .map(f => `${f.label}: "${f.value}"`).join('\n');
      const today = new Date();
      const birthdate = profile.birthdate ? new Date(profile.birthdate) : null;
      const age = birthdate ? Math.floor((today - birthdate) / (365.25 * 24 * 3600 * 1000)) : null;

      const contextBlock = [
        profileLines    ? 'NUTZERPROFIL:\n' + profileLines : '',
        extrasLines     ? 'EXTRAS (gelernte Felder):\n' + extrasLines : '',
        sessionLines    ? 'NUTZER-ANTWORTEN (immer verwenden, nicht erneut fragen):\n' + sessionLines : '',
        prevLines       ? 'BEREITS AUSGEFÜLLT (vorherige Seiten):\n' + prevLines : '',
        age != null     ? `Alter: ${age}` : '',
      ].filter(Boolean).join('\n\n');

      if (fields.length === 0) {
        // Keine offenen Felder — direkt zur Navigation übergehen
        if (navAction) {
          updateGuidedProgress('Weiterklicken …');
          await handleGuidedNavigation(navAction);
        } else {
          updateGuidedProgress('Fertig ✓');
          addMsg('ai', agentDoneMessage(), null, { copy: false });
          agentState.active = false;
        }
        return;
      }

      agentStatusBubble = createAgentBubble();
      let filled = 0;
      let done = 0;
      const asks = [];
      const aiFields = [];

      const setAgentProgress = status => {
        const hdr = agentStatusBubble?.querySelector('.fa-agent-hdr');
        if (hdr) hdr.textContent = status;
      };

      const applyAgentValue = async (f, value) => {
        // Sichtbar machen: lazy/virtualisierte Formulare rendern erst beim Scrollen
        try { f.el.scrollIntoView({ block: 'center' }); } catch {}
        pushUndo(f.el);
        await fillField(f.el, value);
        if (isActionApplied(f.el, 'fill', value)) {
          appendAgentRow('✓', f.label, value);
          flashFilled(f.el);
          agentState.filledFields.push({ label: f.label, value, url: location.href });
          filled++;
        } else {
          appendAgentRow('✗', f.label, 'nicht angewendet');
        }
      };

      const queueAsk = f => asks.push({
        action: 'ask',
        label: f.label,
        question: `Was soll ich bei "${f.label}" eintragen?`,
        options: f.options.slice(0, 4),
        selector: f.selector,
      });

      // Phase 1: deterministic — session answers + learned extras (fuzzy match, no API call)
      for (const f of fields) {
        if (!agentState.active) break;
        const directValue = findStoredAnswer(f.label);
        if (directValue !== null) {
          await applyAgentValue(f, directValue);
          done++;
          setAgentProgress(`Agent läuft… ${done}/${fields.length}`);
          await sleep(40);
        } else {
          aiFields.push(f);
        }
      }

      // Phase 2: EIN gebündelter KI-Call pro Batch unbekannter Felder statt ein
      // Call pro Feld. Lässt sich die Batch-Antwort nicht parsen, folgt ein
      // fokussierter Einzel-Prompt pro Feld.
      const describeField = (f, i) => {
        const opt  = f.options.length ? ` Optionen: ${f.options.slice(0, 12).join(' | ')}` : '';
        const hint = f.hint ? ` Hinweis: ${f.hint}` : '';
        return `${i}. "${f.label}" (${f.type})${f.required ? ' [Pflichtfeld]' : ''}${opt}${hint}`;
      };

      async function requestBatchValues(chunk) {
        const prompt = [
          contextBlock,
          '',
          'FORMULARFELDER:',
          ...chunk.map((f, i) => describeField(f, i + 1)),
          '',
          'Gib für jedes Feld den Wert an. Antworte NUR mit einem JSON-Objekt, Schlüssel = Feldnummer:',
          '{"1":"Wert","2":"?"}',
          'Regeln: "?" wenn kein Wert aus Profil/Kontext ableitbar ist. Bei Feldern mit Optionen EXAKT eine der Optionen wählen. Datumsfelder IMMER als ISO (date→YYYY-MM-DD, month→YYYY-MM, time→HH:MM). Keine Erklärung, kein Markdown.',
        ].join('\n');
        const data = await groqRequest(key, {
          model: _model,
          max_tokens: Math.min(60 * chunk.length + 120, 1600),
          messages: [{ role: 'user', content: prompt }],
        });
        const raw = String(data?.choices?.[0]?.message?.content || '').trim();
        const objMatch = raw.replace(/```(?:json)?/gi, '').match(/\{[\s\S]*\}/);
        if (!objMatch) return null;
        try {
          const parsed = JSON.parse(objMatch[0]);
          return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
        } catch { return null; }
      }

      async function askSingleFieldValue(f) {
        const optStr  = f.options.length ? `\nOptionen: ${f.options.slice(0, 12).join(' | ')}` : '';
        const hintStr = f.hint ? `\nHinweis: ${f.hint}` : '';
        const instrStr = f.options.length
          ? 'Antworte NUR mit einer der Optionen EXAKT wie angegeben, oder "?" wenn keine passt.'
          : 'Antworte NUR mit dem Wert (max. eine kurze Zeile), oder "?" wenn wirklich kein Wert ableitbar ist. Datumsfelder als ISO (date→YYYY-MM-DD, month→YYYY-MM).';
        const prompt = [
          contextBlock,
          '',
          `FORMULARFELD: "${f.label}" (${f.type})${f.required ? ' [Pflichtfeld]' : ''}${optStr}${hintStr}`,
          '',
          instrStr,
        ].join('\n');
        const data = await groqRequest(key, { model: _model, max_tokens: 80, messages: [{ role: 'user', content: prompt }] });
        return String(data?.choices?.[0]?.message?.content || '').trim();
      }

      const sanitizeValue = raw => String(raw).split('\n')[0].replace(/^["']|["']$/g, '').trim().slice(0, 200);
      const isUnknown = v => !v || v === '?' || /^unbekannt$/i.test(v);

      for (let start = 0; start < aiFields.length && agentState.active; start += AGENT_BATCH_SIZE) {
        const chunk = aiFields.slice(start, start + AGENT_BATCH_SIZE);
        setAgentProgress(`Agent läuft… ${done}/${fields.length} · KI analysiert ${chunk.length} Felder`);
        let answers = null;
        // Bei Fehlschlag bleibt answers null → die Felder laufen einzeln in
        // den fokussierten Fallback-Prompt weiter unten
        try { answers = await requestBatchValues(chunk); }
        catch (err) { console.warn('[FormAssist] Batch-Anfrage fehlgeschlagen:', err); }

        for (let i = 0; i < chunk.length; i++) {
          if (!agentState.active) break;
          const f = chunk[i];
          let rawVal = answers !== null ? String(answers[String(i + 1)] ?? answers[f.label] ?? '').trim() : null;
          if (rawVal === null) {
            try { rawVal = await askSingleFieldValue(f); }
            catch (err) {
              appendAgentRow('✗', f.label, `Fehler: ${(err.message || '').slice(0, 40)}`);
              done++;
              continue;
            }
          }
          if (isUnknown(rawVal)) {
            if (f.required) {
              queueAsk(f);
            } else {
              // Optionale Felder ohne Datenbasis NICHT erfragen — leer lassen
              // und am Ende gesammelt erwähnen (verhindert Rückfragen-Spam
              // bei Feldern wie "Middle Name")
              (agentState.skippedOptional = agentState.skippedOptional || []).push(f.label);
              appendAgentRow('·', f.label, 'leer gelassen (optional)');
            }
          } else {
            await applyAgentValue(f, sanitizeValue(rawVal));
          }
          done++;
          setAgentProgress(`Agent läuft… ${done}/${fields.length}`);
          await sleep(50);
        }
      }

      finalizeAgentBubble(filled);
      learnAgentFields();
      updateGuidedProgress();

      if (!agentState.active) return;

      // Autonome Korrektur-Runde: KI erneut fragen für Felder, die die Seite als
      // ungültig markiert — inkl. Fehlermeldung der Seite, ohne Nutzereingriff.
      if (!agentState.correctionRound) {
        await sleep(400);
        const errFields = fields.filter(f =>
          f.el && isVisible(f.el) && (getError(f.el) || (f.el.willValidate && !f.el.checkValidity()))
        );
        if (errFields.length) {
          agentState.correctionRound = 1;
          const corrBubble = createAgentBubble();
          const corrHdr = corrBubble.querySelector('.fa-agent-hdr');
          if (corrHdr) corrHdr.textContent = `Korrigiere ${errFields.length} ungültige${errFields.length === 1 ? 's' : ''} Feld${errFields.length === 1 ? '' : 'er'}…`;
          agentStatusBubble = corrBubble;
          let corrected = 0;
          for (const f of errFields.slice(0, 8)) {
            if (!agentState.active) break;
            const errMsg = getError(f.el) || f.el.validationMessage || '';
            const curVal = getCurrentFieldValue(f.el);
            try {
              const raw = await askSingleFieldValue({
                ...f,
                hint: [f.hint, errMsg ? `Validierungsfehler: "${errMsg}"` : '', curVal ? `Abgelehnter Wert: "${curVal}"` : '']
                  .filter(Boolean).join(' · '),
              });
              const v = sanitizeValue(raw);
              if (!isUnknown(v) && normalizeForCompare(v) !== normalizeForCompare(curVal)) {
                pushUndo(f.el);
                await fillField(f.el, v);
                if (isActionApplied(f.el, 'fill', v)) {
                  corrected++;
                  appendAgentRow('✓', f.label, v);
                  flashFilled(f.el);
                  agentState.filledFields.push({ label: f.label, value: v, url: location.href });
                  continue;
                }
              }
              appendAgentRow('✗', f.label, errMsg.slice(0, 40) || 'weiter ungültig');
              queueAsk(f);
            } catch {
              appendAgentRow('✗', f.label, 'Fehler');
            }
          }
          finalizeAgentBubble(corrected);
          if (!agentState.active) return;
        }
      }

      if (asks.length) {
        updateGuidedProgress(`${asks.length} Rückfrage${asks.length > 1 ? 'n' : ''} …`);
        guidedAskState.active   = true;
        guidedAskState.queue    = [...asks];
        guidedAskState.navAction = navAction;
        showNextGuidedQuestion();
      } else if (navAction) {
        updateGuidedProgress('Weiterklicken …');
        await handleGuidedNavigation(navAction);
      } else {
        updateGuidedProgress('Fertig ✓');
        setTimeout(() => { const w = $('fa-guided-progress'); if (w) w.style.display = 'none'; }, 3000);
        addMsg('ai', agentDoneMessage(), null, { copy: false });
        agentState.active = false;
      }
    }

    function startAgent() {
      if (profileVisible) hideProfile();
      open();
      const autoNav = $('fa-auto-nav')?.checked !== false;
      const mode = getAssistantMode();
      const guided = mode !== 'classic';
      hideUndoToast();
      agentState = { active: true, guided, autoNavigate: autoNav, sessionAnswers: {}, filledFields: [], skippedOptional: [], startUrl: location.href, correctionRound: 0, lastFailures: [], pages: 0, undo: [] };
      guidedAskState = { active: false, queue: [], navAction: null };
      manualAssistState.pending = null;
      if (guided) {
        const gpWrap = $('fa-guided-progress'); const gpBar = $('fa-gp-bar'); const gpLabel = $('fa-gp-label');
        if (gpWrap) gpWrap.style.display = 'block';
        if (gpBar)  gpBar.style.width = '0%';
        if (gpLabel) gpLabel.textContent = 'Analysiere…';
      }
      addMsg('user', '⚡ Formular ausfüllen');
      if (!guided) {
        addMsg('ai', 'Klassischer Modus aktiv: Ich zeige zuerst eine Vorschau und führe danach aus.', null, { copy: false });
      }
      const prefilled = applyDeterministicProfileFill();
      if (prefilled > 0) {
        addMsg('ai', `Direkt aus Profil: ${prefilled} Feld${prefilled !== 1 ? 'er' : ''} ausgefüllt.`, null, { copy: false });
      }
      if (guided) {
        runFieldByFieldAgent();
      } else {
        runAgentStep();
      }
    }

    async function runAgentStep(retry = false) {
      const key = await loadKey();
      if (!key) { addMsg('ai', `API-Schlüssel für ${currentProviderLabel()} fehlt. Bitte in den FormAssist-Einstellungen hinterlegen.`); agentState.active = false; return; }
      showTyping();
      const prompt = buildAgentPrompt(profile, extras, agentState);
      const messages = retry
        ? [{ role: 'user', content: prompt },
           { role: 'assistant', content: 'Entschuldigung, ich habe die Ausgabe nicht korrekt formatiert.' },
           { role: 'user', content: 'Antworte NUR mit dem JSON-Array, ohne Erklärung, ohne Markdown.' }]
        : [{ role: 'user', content: prompt }];
      try {
        let raw = '';
        const decodeSSE = createSSEDecoder();
        await groqStream(key, { model: _model, max_tokens: 2048, stream: true, messages },
          chunk => { raw += decodeSSE(chunk); });
        removeTyping();
        raw = raw.trim();
        const actions = sanitizeAgentActions(parseModelJsonArray(raw));
        if (!Array.isArray(actions) || !actions.length) {
          console.warn('[FormAssist] Agent parse failed. raw response:', raw);
          if (!retry) { await runAgentStep(true); return; }
          if (askUserForMissingField()) { agentState.active = true; return; }
          const preview = raw ? `„${raw.slice(0, 120).replace(/\n/g, ' ')}…"` : '(leer)';
          addMsg('ai', `KI-Antwort konnte nicht verarbeitet werden. Modell-Output: ${preview}`, null, { copy: false });
          agentState.active = false; return;
        }
        if (agentState.guided) {
          runGuidedStep(actions);
        } else {
          showAgentPreview(actions);
        }
      } catch (err) {
        removeTyping();
        addMsg('ai', `Agent-Fehler: ${err?.message || 'Verbindungsproblem'}`);
        agentState.active = false;
      }
    }

    function showAgentPreview(actions) {
      dismissEmpty();
      const fillTypes = new Set(['fill', 'select', 'check']);
      const fillActions = actions.filter(a => fillTypes.has(a.action));
      const otherActions = actions.filter(a => !fillTypes.has(a.action));

      if (!fillActions.length) { executeAgentActions(actions); return; }

      const div = document.createElement('div');
      div.className = 'msg ai';
      const bubble = document.createElement('div');
      bubble.className = 'bubble';

      const hdr = document.createElement('div');
      hdr.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;';
      const title = document.createElement('strong');
      title.textContent = `Agent-Vorschau — ${fillActions.length} Feld${fillActions.length !== 1 ? 'er' : ''}`;
      const selectAllBtn = document.createElement('button');
      selectAllBtn.className = 'agent-select-all';
      selectAllBtn.textContent = 'Alle ab-/auswählen';
      hdr.append(title, selectAllBtn);

      const profileCount    = fillActions.filter(a => !a.source || a.source === 'profile').length;
      const inferredCount   = fillActions.filter(a => a.source === 'inferred').length;
      const suggestionCount = fillActions.filter(a => a.source === 'suggestion').length;
      const sourceRow = document.createElement('div');
      sourceRow.className = 'preview-source-row';
      if (profileCount)    sourceRow.innerHTML += `<span class="psr-chip psr-profile">● ${profileCount} aus Profil</span>`;
      if (inferredCount)   sourceRow.innerHTML += `<span class="psr-chip psr-inferred">● ${inferredCount} abgeleitet</span>`;
      if (suggestionCount) sourceRow.innerHTML += `<span class="psr-chip psr-suggestion">● ${suggestionCount} Vorschlag${suggestionCount > 1 ? 'e' : ''}</span>`;

      const note = document.createElement('div');
      note.className = 'review-note';
      note.style.marginBottom = '8px';
      note.textContent = 'Werte prüfen und anpassen — dann Ausführen.';

      const preview = document.createElement('div');
      preview.className = 'sf-preview';
      const rows = [];

      fillActions.forEach(action => {
        const row = document.createElement('div');
        row.className = 'sf-row';
        row.dataset.source = action.source || 'profile';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.className = 'sf-cb';
        const confidence = getActionConfidence(action);
        cb.checked = action.source === 'suggestion'
          ? confidence >= AGENT_AUTO_SELECT_CONFIDENCE
          : confidence >= 0.45;

        const lbl = document.createElement('span');
        lbl.className = 'sf-label';
        lbl.textContent = action.label || action.selector || '?';
        lbl.title = `${lbl.textContent} · Confidence ${Math.round(confidence * 100)}%`;

        const inp = document.createElement('input');
        inp.type = 'text';
        inp.className = 'sf-input';
        inp.value = action.value != null ? String(action.value) : '';
        inp.placeholder = 'Wert…';
        inp.addEventListener('input', () => { cb.checked = !!inp.value.trim(); });
        inp.addEventListener('click', e => e.stopPropagation());
        row.addEventListener('click', e => { if (e.target.tagName !== 'INPUT') cb.checked = !cb.checked; });

        if (action.source === 'inferred' || action.source === 'suggestion') {
          const badge = document.createElement('span');
          if (action.source === 'inferred') {
            badge.textContent = 'Abgeleitet';
            badge.className = 'source-badge inferred';
          } else {
            badge.textContent = 'Vorschlag';
            badge.className = 'source-badge suggestion';
          }
          row.append(cb, lbl, inp, badge);
        } else {
          row.append(cb, lbl, inp);
        }
        preview.appendChild(row);
        rows.push({ cb, inp, action });
      });

      if (otherActions.length) {
        const sec = document.createElement('div');
        sec.className = 'sf-section-title';
        sec.textContent = 'Weitere Aktionen';
        preview.appendChild(sec);
        otherActions.forEach(action => {
          const row = document.createElement('div');
          row.className = 'sf-row';
          row.style.cssText = 'opacity:0.65;pointer-events:none;';
          const lbl = document.createElement('span');
          lbl.style.fontSize = '12px';
          const typeLabel = action.action === 'submit' ? '⚠ Absenden'
            : action.isNavigation ? '→ Weiter'
            : action.action === 'done' ? '✓ Fertig'
            : '• ' + action.action;
          lbl.textContent = typeLabel + (action.selector ? ` (${action.selector})` : '');
          row.appendChild(lbl);
          preview.appendChild(row);
        });
      }

      let allChecked = true;
      selectAllBtn.addEventListener('click', () => {
        allChecked = !allChecked;
        rows.forEach(({ cb }) => { cb.checked = allChecked; });
      });

      const actionsEl = document.createElement('div');
      actionsEl.className = 'agent-actions';
      actionsEl.style.marginTop = '10px';
      const confirmBtn = document.createElement('button');
      confirmBtn.className = 'agent-confirm';
      confirmBtn.textContent = 'Ausführen';
      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'agent-cancel';
      cancelBtn.textContent = 'Abbrechen';

      confirmBtn.addEventListener('click', () => {
        confirmBtn.disabled = cancelBtn.disabled = true;
        rows.forEach(({ cb, inp, action }) => {
          if (cb.checked) action.value = inp.value.trim() || action.value;
        });
        const finalActions = [...rows.filter(r => r.cb.checked).map(r => r.action), ...otherActions];
        actionsEl.innerHTML = '';
        executeAgentActions(finalActions);
      });

      cancelBtn.addEventListener('click', () => {
        agentState.active = false;
        manualAssistState.pending = null;
        bubble.style.opacity = '0.55';
        actionsEl.innerHTML = '<span class="review-note">Abgebrochen.</span>';
      });

      actionsEl.append(confirmBtn, cancelBtn);
      bubble.append(hdr, sourceRow, note, preview, actionsEl);
      div.appendChild(bubble);
      messagesEl.appendChild(div);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // GUIDED MODE — autonomous fill + ask-when-stuck
    // ═══════════════════════════════════════════════════════════════════════

    function updateGuidedProgress(statusText) {
      const wrap  = $('fa-guided-progress');
      const bar   = $('fa-gp-bar');
      const label = $('fa-gp-label');
      if (!wrap) return;
      if (!agentState.guided || !agentState.active) {
        wrap.style.display = 'none';
        return;
      }
      wrap.style.display = 'block';
      const totalFields = allFields.length || 1;
      const filled = agentState.filledFields.filter(f => f.url === location.href).length;
      const pct = Math.min(100, Math.round(filled / totalFields * 100));
      if (bar) bar.style.width = pct + '%';
      if (label) {
        const stepNote = stepInfo?.isMultiStep ? ` · Schritt ${stepInfo.current}/${stepInfo.total}` : '';
        label.textContent = statusText || `${agentState.filledFields.length} Felder ausgefüllt${stepNote}`;
      }
    }

    async function runGuidedStep(actions) {
      dismissEmpty();
      const fillActions  = actions.filter(a => ['fill','select','check'].includes(a.action));
      const askActions   = actions.filter(a => a.action === 'ask');
      const clickActions = actions.filter(a => a.action === 'click' && !a.isNavigation);
      const navActions  = actions.filter(a => a.isNavigation || a.action === 'submit');
      const isDone      = actions.some(a => a.action === 'done');

      // Fill- und Nicht-Navigations-Klicks sofort ausführen
      if (fillActions.length || clickActions.length) {
        await executeGuidedFillActions([...fillActions, ...clickActions]);
      }

      if (isDone && !askActions.length && !navActions.length) {
        updateGuidedProgress('Fertig ✓');
        setTimeout(() => { const w = $('fa-guided-progress'); if (w) w.style.display = 'none'; }, 3000);
        addMsg('ai', agentDoneMessage(), null, { copy: false });
        agentState.active = false;
        learnAgentFields();
        return;
      }

      if (askActions.length) {
        updateGuidedProgress(`${askActions.length} Rückfrage${askActions.length > 1 ? 'n' : ''} …`);
        guidedAskState.active   = true;
        guidedAskState.queue    = [...askActions];
        guidedAskState.navAction = navActions[0] || null;
        showNextGuidedQuestion();
      } else if (navActions.length) {
        updateGuidedProgress('Weiterklicken …');
        await handleGuidedNavigation(navActions[0]);
      } else if (!fillActions.length && !clickActions.length) {
        if (askUserForMissingField()) { agentState.active = true; } else { agentState.active = false; updateGuidedProgress('Fertig'); }
      }
    }

    async function executeGuidedFillActions(fillActions) {
      agentStatusBubble = createAgentBubble();
      let filled = 0;
      const failed = [];
      for (const act of fillActions) {
        if (!agentState.active) break;
        const el = resolveActionElement(act);
        if ((act.action === 'fill' || act.action === 'select') && el) {
          pushUndo(el);
          await fillField(el, act.value || '');
          if (isActionApplied(el, act.action, act.value || '')) {
            appendAgentRow('✓', act.label || act.selector, act.value);
            flashFilled(el);
            agentState.filledFields.push({ label: act.label, value: act.value, url: location.href });
            filled++;
          } else {
            appendAgentRow('✗', act.label || act.selector, 'nicht angewendet');
            failed.push(act);
          }
          await sleep(80);
        } else if (act.action === 'check' && el) {
          pushUndo(el);
          if (!el.checked) { el.click(); el.dispatchEvent(new Event('change', { bubbles: true })); }
          appendAgentRow('✓', act.label || act.selector, '');
          flashFilled(el);
          agentState.filledFields.push({ label: act.label, value: act.value, url: location.href });
          filled++;
          await sleep(80);
        } else if (act.action === 'click' && el) {
          el.click();
          appendAgentRow('→', act.label || act.selector, '');
          await sleep(300);
        } else if (el === null && act.selector) {
          appendAgentRow('✗', act.label || act.selector, 'nicht gefunden');
          failed.push(act);
        }
      }
      finalizeAgentBubble(filled);
      if (failed.length) agentState.lastFailures = failed.map(a => ({ selector: a.selector, label: a.label, reason: 'nicht angewendet' }));
      learnAgentFields();
      updateGuidedProgress();
    }

    function showNextGuidedQuestion() {
      if (!guidedAskState.queue.length) {
        guidedAskState.active = false;
        if (guidedAskState.navAction) {
          addMsg('ai', 'Danke! Ich mache weiter…', null, { copy: false });
          handleGuidedNavigation(guidedAskState.navAction);
        } else {
          updateGuidedProgress('Fertig ✓');
          setTimeout(() => { const w = $('fa-guided-progress'); if (w) w.style.display = 'none'; }, 3000);
          addMsg('ai', agentDoneMessage(), null, { copy: false });
          agentState.active = false;
        }
        return;
      }
      showGuidedQuestion(guidedAskState.queue[0]);
    }

    function showGuidedQuestion(ask) {
      const div = document.createElement('div');
      div.className = 'msg ai';
      const bubble = document.createElement('div');
      bubble.className = 'bubble guided-q';

      const eyebrow = document.createElement('div');
      eyebrow.className = 'gq-eyebrow';
      eyebrow.textContent = ask.label || 'Frage';

      const text = document.createElement('div');
      text.className = 'gq-text';
      text.textContent = ask.question || `Was soll ich in "${ask.label}" eintragen?`;

      bubble.append(eyebrow, text);

      const options = Array.isArray(ask.options) ? ask.options.filter(Boolean) : [];
      if (options.length) {
        const chipsEl = document.createElement('div');
        chipsEl.className = 'gq-chips';
        options.forEach(opt => {
          const btn = document.createElement('button');
          btn.className = 'gq-chip';
          btn.textContent = opt;
          btn.addEventListener('click', () => {
            btn.classList.add('gq-selected');
            chipsEl.querySelectorAll('.gq-chip:not(.gq-selected)').forEach(b => b.disabled = true);
            handleGuidedAnswer(opt);
          });
          chipsEl.appendChild(btn);
        });
        const hint = document.createElement('div');
        hint.className = 'gq-hint';
        hint.textContent = 'oder tippe unten deine Antwort';
        bubble.append(chipsEl, hint);
      } else {
        const hint = document.createElement('div');
        hint.className = 'gq-hint';
        hint.textContent = 'Tippe deine Antwort unten';
        bubble.appendChild(hint);
      }

      div.appendChild(bubble);
      messagesEl.appendChild(div);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    async function handleGuidedAnswer(text) {
      const ask = guidedAskState.queue.shift();
      if (!ask) return;

      let storedValue = text;

      // Feld für Feld: gespeichertes Element füllen, verifizieren, bei Ablehnung per KI normalisieren
      if (ask.selector) {
        const el = resolveActionElement(ask);
        if (el) {
          const appliedValue = await fillFieldVerified(el, ask.label, text);
          if (appliedValue !== null) {
            storedValue = appliedValue;
            agentState.filledFields.push({ label: ask.label, value: appliedValue, url: location.href });
            if (appliedValue !== text) {
              addMsg('ai', renderMarkdown(`Verstanden — ich habe **${appliedValue}** eingetragen.`), null, { copy: false });
            }
          } else {
            ask._attempts = (ask._attempts || 0) + 1;
            if (ask._attempts < 2) {
              guidedAskState.queue.unshift(ask);
              addMsg('ai', renderMarkdown(`"${text}" passt leider nicht zum Format von **${ask.label}**. Versuch es bitte konkreter (z. B. ein genaues Datum oder eine der Optionen).`), null, { copy: false });
              return;
            }
            addMsg('ai', renderMarkdown(`**${ask.label}** konnte ich nicht automatisch übernehmen — bitte trag den Wert manuell ein.`), null, { copy: false });
            const target = resolveActionElement(ask);
            if (target) { target.scrollIntoView({ behavior: 'smooth', block: 'center' }); highlightField(target); }
          }
        }
      }

      agentState.sessionAnswers[ask.label] = storedValue;
      await sleep(150);
      showNextGuidedQuestion();
    }

    async function handleGuidedNavigation(navAction) {
      if (!navAction) return;

      if (navAction.action === 'submit') {
        finalizeAgentBubble(agentState.filledFields.length);
        learnAgentFields();
        const ok = await agentAskSubmit(navAction.label);
        if (ok) {
          const el = resolveActionElement(navAction);
          if (el) { const formEl = el.form || el.closest('form'); if (formEl) approvedSubmits.add(formEl); el.click(); }
        } else {
          addMsg('ai', 'Absenden abgebrochen.', null, { copy: false });
        }
        agentState.active = false;
        return;
      }

      const resumeData = {
        filledFields: agentState.filledFields,
        startUrl: agentState.startUrl,
        guided: true,
        autoNavigate: agentState.autoNavigate,
        sessionAnswers: agentState.sessionAnswers,
        pages: (agentState.pages || 0) + 1,
      };

      if (agentState.autoNavigate) {
        const el = resolveActionElement(navAction);
        if (!el) { addMsg('ai', 'Weiter-Button nicht gefunden. Bitte manuell klicken.', null, { copy: false }); agentState.active = false; return; }
        addMsg('ai', `→ Klicke auf „${navAction.label || 'Weiter'}"…`, null, { copy: false });
        persistAgentResume(resumeData);
        await sleep(350);
        el.click();
      } else {
        // Toggle „Automatisch weiterklicken" ist aus → manuellen Weiter-Button zeigen
        showManualContinueButton(navAction, resumeData);
      }
    }

    // Manueller „Weiter"-Button (statt Auto-Klick), wenn der Toggle
    // „Automatisch weiterklicken" aus ist. Von beiden Agent-Pfaden genutzt.
    function showManualContinueButton(navAction, resumeData) {
      const div = document.createElement('div');
      div.className = 'msg ai';
      const bubble = document.createElement('div');
      bubble.className = 'bubble';
      bubble.innerHTML = `<div style="margin-bottom:8px;font-size:13px;">Seite ausgefüllt — bereit für den nächsten Schritt.</div>`;
      const btn = document.createElement('button');
      btn.className = 'ap-primary';
      btn.style.cssText = 'height:38px;font-size:12.5px;margin-top:4px;';
      btn.innerHTML = `<svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:#fff;stroke-width:2.2;fill:none;stroke-linecap:round;stroke-linejoin:round"><path d="M5 12h14M12 5l7 7-7 7"/></svg> ${escapeHtml(navAction.label || 'Weiter')}`;
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        const el = resolveActionElement(navAction);
        if (el) {
          persistAgentResume(resumeData);
          el.click();
        }
      });
      bubble.appendChild(btn);
      div.appendChild(bubble);
      messagesEl.appendChild(div);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    async function executeAgentActions(actions) {
      agentStatusBubble = createAgentBubble();
      let filled = 0;
      const failedActions = [];

      for (const act of actions) {
        if (!agentState.active) break;

        if (act.action === 'done') {
          finalizeAgentBubble(filled);
          agentState.active = false;
          learnAgentFields();
          return;
        }

        if (act.action === 'submit') {
          finalizeAgentBubble(filled);
          learnAgentFields();
          const ok = await agentAskSubmit(act.label);
          if (ok) {
            const el = resolveActionElement(act);
            if (el) {
              const formEl = el.form || el.closest('form');
              if (formEl) approvedSubmits.add(formEl);
              el.click();
            }
          } else {
            addMsg('ai', 'Absenden abgebrochen.');
          }
          agentState.active = false;
          return;
        }

        const el = resolveActionElement(act);

        if ((act.action === 'fill' || act.action === 'select') && el) {
          pushUndo(el);
          await fillField(el, act.value || '');
          if (isActionApplied(el, act.action, act.value || '')) {
            appendAgentRow('✓', act.label || act.selector, act.value);
            flashFilled(el);
            agentState.filledFields.push({ label: act.label, value: act.value, url: location.href });
            filled++;
          } else {
            appendAgentRow('✗', act.label || act.selector, 'Wert nicht übernommen');
            failedActions.push({ selector: act.selector, label: act.label, reason: 'Wert nicht übernommen' });
          }
          await sleep(100);
        } else if (act.action === 'check' && el) {
          pushUndo(el);
          if (!el.checked) { el.click(); el.dispatchEvent(new Event('change', { bubbles: true })); }
          if (isActionApplied(el, act.action)) { appendAgentRow('✓', act.label || act.selector, ''); flashFilled(el); }
          else {
            appendAgentRow('✗', act.label || act.selector, 'nicht gesetzt');
            failedActions.push({ selector: act.selector, label: act.label, reason: 'Checkbox/Option nicht gesetzt' });
          }
          await sleep(100);
        } else if (act.action === 'click' && el) {
          appendAgentRow('→', act.label || act.selector, '');
          if (act.isNavigation) {
            const resumeData = { filledFields: agentState.filledFields, startUrl: agentState.startUrl, guided: agentState.guided, autoNavigate: agentState.autoNavigate, sessionAnswers: agentState.sessionAnswers, pages: (agentState.pages || 0) + 1 };
            persistAgentResume(resumeData);
            // „Automatisch weiterklicken" respektieren: nur bei aktivem Toggle
            // selbst klicken, sonst manuellen „Weiter"-Button anbieten.
            if (agentState.autoNavigate) {
              await sleep(200);
              el.click();
            } else {
              finalizeAgentBubble(filled);
              showManualContinueButton(act, resumeData);
            }
            return;
          } else {
            el.click();
            await sleep(500);
          }
        } else if (!el && act.selector) {
          appendAgentRow('✗', act.label || act.selector, 'nicht gefunden');
          failedActions.push({ selector: act.selector, label: act.label, reason: 'Element nicht gefunden' });
        }
      }

      finalizeAgentBubble(filled);
      learnAgentFields();
      if (!failedActions.length) agentState.lastFailures = [];

      // Auto-Korrektur: eine Extra-Runde, falls Validierungsfehler gefunden wurden
      if ((filled > 0 || failedActions.length > 0) && !agentState.correctionRound) {
        await sleep(700);
        const errFields = extractRichContext().forms.flatMap(f => f.allFields)
          .filter(f => f.el && isVisible(f.el) && getError(f.el));
        if (errFields.length || failedActions.length) {
          agentState.correctionRound = 1;
          agentState.active = true;
          agentState.lastFailures = failedActions.slice(0, 12);
          if (failedActions.length) {
            addMsg('ai', `⚠ ${failedActions.length} Aktion${failedActions.length !== 1 ? 'en konnten' : ' konnte'} nicht sicher ausgeführt werden — versuche Korrektur…`);
          } else {
            addMsg('ai', `⚠ ${errFields.length} Feld${errFields.length > 1 ? 'er haben' : ' hat'} einen Fehler — korrigiere…`);
          }
          await runAgentStep();
          return;
        }
      }

      if (askUserForMissingField()) {
        agentState.active = true;
        return;
      }

      agentState.active = false;
    }

    function createAgentBubble() {
      const div = document.createElement('div');
      div.className = 'msg ai';
      const bubble = document.createElement('div');
      bubble.className = 'bubble';
      const hdrRow = document.createElement('div');
      hdrRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;';
      const hdr = document.createElement('strong');
      hdr.className = 'fa-agent-hdr';
      hdr.textContent = 'Agent läuft…';
      const stopBtn = document.createElement('button');
      stopBtn.className = 'agent-cancel fa-agent-stop';
      stopBtn.style.cssText = 'font-size:10.5px;padding:3px 8px;';
      stopBtn.textContent = 'Stopp';
      stopBtn.addEventListener('click', () => {
        agentState.active = false;
        stopBtn.disabled = true;
        stopBtn.textContent = 'Gestoppt';
        const h = agentStatusBubble?.querySelector('.fa-agent-hdr');
        if (h) h.textContent = 'Agent gestoppt.';
      });
      hdrRow.append(hdr, stopBtn);
      const list = document.createElement('div');
      list.className = 'fa-agent-list';
      list.style.cssText = 'display:flex;flex-direction:column;gap:3px;margin-top:7px;';
      bubble.append(hdrRow, list);
      div.appendChild(bubble);
      messagesEl.appendChild(div);
      messagesEl.scrollTop = messagesEl.scrollHeight;
      return bubble;
    }

    function appendAgentRow(icon, label, value) {
      const list = agentStatusBubble?.querySelector('.fa-agent-list');
      if (!list) return;
      const row = document.createElement('div');
      row.className = 'live-row';
      row.innerHTML = `<span class="live-row-icon">${escapeHtml(icon)}</span><span class="live-row-label">${escapeHtml(label || '')}</span>${value ? `<span class="live-row-value">${escapeHtml(String(value).slice(0, 30))}</span>` : ''}`;
      list.appendChild(row);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function finalizeAgentBubble(filled) {
      const hdr = agentStatusBubble?.querySelector('.fa-agent-hdr');
      if (hdr) hdr.textContent = `Agent: ${filled} Feld${filled !== 1 ? 'er' : ''} ausgefüllt`;
      agentStatusBubble?.querySelector('.fa-agent-stop')?.remove();
      maybeShowUndoToast();
    }

    function agentAskSubmit(label) {
      return new Promise(resolve => {
        const div = document.createElement('div');
        div.className = 'msg ai';
        const bubble = document.createElement('div');
        bubble.className = 'bubble';
        bubble.innerHTML = `<strong>Formular absenden?</strong><p style="margin-top:6px;font-size:13px;color:var(--text2)">Der Agent möchte auf <strong>"${escapeHtml(label || 'Absenden')}"</strong> klicken. Bitte alle Einträge kurz prüfen.</p>`;
        const row = document.createElement('div');
        row.className = 'agent-actions';
        row.style.marginTop = '10px';
        const yes = document.createElement('button');
        yes.className = 'agent-confirm';
        yes.textContent = 'Absenden bestätigen';
        yes.addEventListener('click', () => { div.remove(); resolve(true); });
        const no = document.createElement('button');
        no.className = 'agent-cancel';
        no.textContent = 'Abbrechen';
        no.addEventListener('click', () => { resolve(false); });
        row.append(yes, no);
        bubble.appendChild(row);
        div.appendChild(bubble);
        messagesEl.appendChild(div);
        messagesEl.scrollTop = messagesEl.scrollHeight;
      });
    }

    function learnAgentFields() {
      let changed = false;
      agentState.filledFields.forEach(({ label, value }) => {
        if (!label || !value) return;
        // Wortanfang-Matching wie matchProfile — sonst lernt z. B. "Hotelname"
        // ("tel") einen falschen Wert dauerhaft ins Telefon-Profilfeld
        const pf = PROFILE_FIELDS.find(p => p.kw.some(k => labelHasKeyword(label.toLowerCase(), k)));
        if (pf && !profile[pf.key]) { profile[pf.key] = value; changed = true; }
        else if (!pf && !extras[label]) { extras[label] = value; changed = true; }
      });
      if (changed) {
        saveActiveProfileToStore();
        SYSTEM = buildSystemPrompt(ctx, profile, extras);
      }
      const filled = agentState.filledFields.filter(f => f.url === location.href).length;
      if (filled > 0) {
        addHistoryEntry({
          ts: Date.now(),
          domain: location.hostname,
          title: document.title || location.hostname,
          fieldCount: agentState.filledFields.length,
          url: location.href,
          profileId: activeProfileId,
        });
      }
    }

    async function resumeAgentIfPending() {
      try {
        const res = await new Promise(r => chrome.storage.session?.get?.('faAgentResume', r) ?? r({}));
        if (!res?.faAgentResume) return;
        chrome.storage.session.remove('faAgentResume');
        manualAssistState.pending = null;
        guidedAskState = { active: false, queue: [], navAction: null };
        const resume = res.faAgentResume;
        if ((resume.pages || 0) >= AGENT_MAX_PAGES) {
          open();
          addMsg('ai', `⚠ Agent gestoppt: Maximum von ${AGENT_MAX_PAGES} Seiten erreicht (Schutz vor Endlosschleifen). Bei Bedarf einfach neu starten.`, null, { copy: false });
          return;
        }
        agentState = {
          active: true,
          guided: resume.guided !== false,
          autoNavigate: resume.autoNavigate !== false,
          sessionAnswers: resume.sessionAnswers || {},
          filledFields: resume.filledFields || [],
          startUrl: resume.startUrl || '',
          correctionRound: 0,
          lastFailures: [],
          pages: resume.pages || 1,
        };
        open();
        const gpWrap = $('fa-guided-progress'); const gpBar = $('fa-gp-bar'); const gpLabel = $('fa-gp-label');
        if (agentState.guided && gpWrap) { gpWrap.style.display = 'block'; if (gpBar) gpBar.style.width = '0%'; if (gpLabel) gpLabel.textContent = 'Warte auf Felder…'; }
        addMsg('ai', `Agent fortgesetzt (${agentState.filledFields.length} Felder bisher). Warte auf Felder…`);
        await waitForFields(4000);
        applyContext(extractRichContext());
        addMsg('ai', allFields.length
          ? `${allFields.length} Felder erkannt — analysiere…`
          : 'Keine Felder gefunden — versuche trotzdem…', null, { copy: false });
        if (agentState.guided) {
          await runFieldByFieldAgent();
        } else {
          await runAgentStep();
        }
      } catch (err) {
        console.warn('[FormAssist] Agent-Fortsetzung nach Navigation fehlgeschlagen:', err);
      }
    }

    async function waitForFields(maxMs = 4000) {
      const step = 250;
      for (let elapsed = 0; elapsed < maxMs; elapsed += step) {
        const fields = extractRichContext().forms.flatMap(f => f.allFields);
        if (fields.length > 0) return;
        await sleep(step);
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SUBMIT REVIEW — einmal abfangen, der Nutzer entscheidet bewusst weiter
    // ═══════════════════════════════════════════════════════════════════════

    const approvedSubmits = new WeakSet();
    const reviewingSubmits = new WeakSet();

    // Feldwert-Auslese + Review-Prompt: getFieldValueForReview /
    // buildSubmitReviewPrompt in fa-prompts.js

    function getReviewStatus(reply) {
      const text = String(reply || '').toLowerCase();
      if (/status:\s*ok|keine offensichtlichen probleme|alles plausibel|keine auffälligkeiten/.test(text)) {
        return { cls: 'ok', label: 'OK' };
      }
      if (/status:\s*fehlt|fehlende|pflichtfeld|browserfehler|required|\[leer\]/.test(text)) {
        return { cls: 'missing', label: 'Fehlt' };
      }
      return { cls: 'warn', label: 'Warnung' };
    }

    function submitFormAfterReview(formEl, submitter) {
      approvedSubmits.add(formEl);
      showToast('Absenden freigegeben');
      if (formEl.requestSubmit) {
        try { formEl.requestSubmit(submitter && submitter.form === formEl ? submitter : undefined); }
        catch { formEl.requestSubmit(); }
      } else {
        HTMLFormElement.prototype.submit.call(formEl);
      }
    }

    function addSubmitReviewResult(reply, formEl, submitter) {
      const status = getReviewStatus(reply);
      const div = document.createElement('div');
      div.className = 'msg ai';
      const bubble = document.createElement('div');
      bubble.className = 'bubble';
      bubble.innerHTML = `<div class="review-status ${status.cls}">${status.label}</div>${renderMarkdown(reply)}<div class="review-actions"></div><div class="review-note">FormAssist prüft nur Plausibilität und ersetzt keine verbindliche Rechts- oder Fachprüfung.</div>`;
      const actions = bubble.querySelector('.review-actions');
      const recheck = document.createElement('button');
      recheck.type = 'button';
      recheck.className = 'review-secondary';
      recheck.textContent = 'Erneut prüfen';
      recheck.addEventListener('click', () => startSubmitReview(formEl, submitter));
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'review-continue';
      btn.textContent = 'Trotzdem absenden';
      btn.addEventListener('click', () => submitFormAfterReview(formEl, submitter));
      actions.append(recheck, btn);
      addCopyButton(bubble, reply);
      div.appendChild(bubble);
      messagesEl.appendChild(div);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function getClickedSubmitter(target) {
      const el = target?.closest?.('button,input');
      if (!el || !el.form) return null;
      if (el.tagName === 'BUTTON') {
        const type = (el.getAttribute('type') || 'submit').toLowerCase();
        return type === 'submit' ? el : null;
      }
      const type = (el.getAttribute('type') || '').toLowerCase();
      return type === 'submit' || type === 'image' ? el : null;
    }

    async function startSubmitReview(formEl, submitter, sourceEvent) {
      if (!(formEl instanceof HTMLFormElement)) return;
      if (approvedSubmits.has(formEl)) {
        approvedSubmits.delete(formEl);
        return;
      }

      sourceEvent?.preventDefault();
      sourceEvent?.stopPropagation();
      if (reviewingSubmits.has(formEl)) return;
      reviewingSubmits.add(formEl);

      if (profileVisible) hideProfile();
      open();
      addMsg('user', 'Bitte prüfe das Formular vor dem Absenden.');
      const prompt = buildSubmitReviewPrompt(formEl, ctx, submitLabel);
      const reply = await askAI(prompt, { maxTokens: 700, includeActive: false, render: false });
      addSubmitReviewResult(
        reply || 'Status: Warnung\nDie KI-Prüfung konnte gerade nicht abgeschlossen werden. Prüfe die Angaben manuell oder versuche es erneut.',
        formEl,
        submitter
      );
      reviewingSubmits.delete(formEl);
    }

    function hasEnoughFields(formEl) {
      return Array.from(formEl.querySelectorAll(
        'input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=reset]):not([type=image]),select,textarea'
      )).filter(isVisible).length >= 3;
    }

    document.addEventListener('click', e => {
      const submitter = getClickedSubmitter(e.target);
      if (!submitter || !hasEnoughFields(submitter.form)) return;
      startSubmitReview(submitter.form, submitter, e);
    }, true);

    document.addEventListener('submit', e => {
      const formEl = e.target;
      if (!(formEl instanceof HTMLFormElement) || !hasEnoughFields(formEl)) return;
      startSubmitReview(formEl, e.submitter, e);
    }, true);

    // ═══════════════════════════════════════════════════════════════════════
    // FIELD FOCUS TRACKING + AUTOFILL TIP
    // ═══════════════════════════════════════════════════════════════════════

    document.addEventListener('focusin', e => {
      if (agentState.active) return; // Agent füllt gerade selbst — kein Tipp-Flackern
      const el = e.target;
      if (!['INPUT','SELECT','TEXTAREA'].includes(el.tagName) || el.type === 'hidden' || !isVisible(el)) return;
      activeFieldEl = el;
      const label = getLabel(el);
      if (label) { fieldNameEl.textContent = label; fieldTag.classList.add('visible'); }
      const pf = matchProfile(el, profile);
      if (pf && profile[pf.key]) {
        autofillValue.textContent = `${pf.label}: ${profile[pf.key]}`;
        autofillTip.classList.add('visible');
      } else {
        autofillTip.classList.remove('visible');
      }
    });

    document.addEventListener('focusout', e => {
      const next = e.relatedTarget;
      if (next && ['INPUT','SELECT','TEXTAREA'].includes(next.tagName)) return;
      autofillTip.classList.remove('visible');
      hideLiveCheck();
    }, true);

    // ═══════════════════════════════════════════════════════════════════════
    // PROACTIVE FIELD ERROR HELP
    // ═══════════════════════════════════════════════════════════════════════

    const errorHelpTimers = new WeakMap();
    const lastErrorHelp = new WeakMap();
    const lastErrorHelpAt = new WeakMap();

    function getFieldProblem(el) {
      if (!el || !['INPUT','SELECT','TEXTAREA'].includes(el.tagName) || el.type === 'hidden' || !isVisible(el)) return '';
      if (el.willValidate && !el.checkValidity()) return el.validationMessage || 'Das Feld ist ungültig.';
      if (el.getAttribute('aria-invalid') === 'true') return getError(el) || 'Die Seite markiert dieses Feld als ungültig.';
      return getError(el);
    }

    function scheduleFieldErrorHelp(el, delay = 700) {
      if (!el) return;
      // Während der Agent läuft, übernimmt seine Korrektur-Runde die Fehler —
      // keine parallele Einzelfeld-KI-Hilfe starten
      if (agentState.active) return;
      const problem = getFieldProblem(el);
      if (!problem) return;
      if (reviewingSubmits.has(el.form)) return;
      clearTimeout(errorHelpTimers.get(el));
      errorHelpTimers.set(el, setTimeout(() => showFieldErrorHelp(el), delay));
    }

    function showFieldErrorHelp(el) {
      const problem = getFieldProblem(el);
      if (!problem || reviewingSubmits.has(el.form)) return;
      const label = ((el.type || '').toLowerCase() === 'radio' ? getGroupLabel(el) : '') || getLabel(el) || 'diesem Feld';
      const value = getFieldValueForReview(el);
      const key = `${label}|${problem}|${value}`;
      if (lastErrorHelp.get(el) === key) return;
      const lastAt = lastErrorHelpAt.get(el) || 0;
      if (Date.now() - lastAt < 20000) return;
      lastErrorHelp.set(el, key);
      lastErrorHelpAt.set(el, Date.now());
      activeFieldEl = el;
      if (profileVisible) hideProfile();
      open();
      addMsg('user', `Hilf mir beim Feld "${label}".`);
      askAI(
        `Das Feld "${label}" wirkt ungültig. Fehler/Hinweis der Seite: "${problem}". Aktueller Wert: "${value || '[leer]'}". Erkläre in 1-2 Sätzen, was vermutlich falsch ist, und gib eine konkrete Korrekturidee.`,
        { maxTokens: 240, includeActive: false }
      );
    }

    document.addEventListener('blur', e => scheduleFieldErrorHelp(e.target), true);
    document.addEventListener('change', e => scheduleFieldErrorHelp(e.target), true);
    document.addEventListener('input', e => {
      const el = e.target;
      if (!el?.value || !el.willValidate || el.checkValidity()) return;
      scheduleFieldErrorHelp(el, 900);
    }, true);

    // ═══════════════════════════════════════════════════════════════════════
    // LIVE VALIDATION — deterministische Prüfung beim Tippen (kein API-Call)
    // IBAN-Prüfsumme (mod-97), BIC-, E-Mail-, PLZ-Format, Telefon,
    // Geburtsdatum-Plausibilität — Logik in fa-utils.js
    // ═══════════════════════════════════════════════════════════════════════

    const liveCheckEl     = $('fa-live-check');
    const liveCheckIcon   = $('fa-live-check-icon');
    const liveCheckText   = $('fa-live-check-text');
    const LIVE_CHECK_DEBOUNCE_MS = 550;
    let liveCheckTimer;

    function hideLiveCheck() {
      liveCheckEl.classList.remove('visible', 'ok', 'warn');
    }

    // Dezentes Outline-Feedback direkt am Feld (Inline-Style wie highlightField,
    // kein CSS-Leck in die Host-Seite). Originalzustand wird nur beim ersten
    // Flash gemerkt, damit schnelle Folge-Checks ihn nicht überschreiben.
    const outlineFlashState = new WeakMap();
    function flashValidationOutline(el, ok) {
      let state = outlineFlashState.get(el);
      if (!state) {
        state = { prevOutline: el.style.outline, prevOffset: el.style.outlineOffset, timer: null };
        outlineFlashState.set(el, state);
      }
      clearTimeout(state.timer);
      el.style.outline = `2px solid ${ok ? '#059669' : '#d97706'}`;
      el.style.outlineOffset = '2px';
      state.timer = setTimeout(() => {
        el.style.outline = state.prevOutline;
        el.style.outlineOffset = state.prevOffset;
        outlineFlashState.delete(el);
      }, ok ? 1200 : 1800);
    }

    // Nur textartige Felder prüfen — Checkbox/Radio & Co. feuern zwar auch
    // input-Events, tragen aber keine prüfbaren Textwerte ("on")
    const LIVE_CHECK_SKIP_TYPES = new Set([
      'checkbox', 'radio', 'file', 'button', 'submit', 'reset', 'image', 'range', 'color', 'hidden', 'password',
    ]);

    function runLiveCheck(el, { final = false } = {}) {
      if (!el || !['INPUT', 'TEXTAREA'].includes(el.tagName)) return;
      if (LIVE_CHECK_SKIP_TYPES.has((el.type || '').toLowerCase()) || !isVisible(el)) return;
      const kind = detectLiveCheckKind(getLabel(el), el.type, el.getAttribute('autocomplete'));
      if (!kind) { hideLiveCheck(); return; }
      const result = getLiveCheckResult(kind, el.value, { final });
      if (!result) { hideLiveCheck(); return; }
      liveCheckIcon.textContent = result.ok ? '✓' : '⚠';
      liveCheckText.textContent = result.msg;
      liveCheckEl.classList.toggle('ok', result.ok);
      liveCheckEl.classList.toggle('warn', !result.ok);
      liveCheckEl.classList.add('visible');
      flashValidationOutline(el, result.ok);
    }

    document.addEventListener('input', e => {
      const el = e.target;
      if (!el || !['INPUT', 'TEXTAREA'].includes(el.tagName)) return;
      clearTimeout(liveCheckTimer);
      liveCheckTimer = setTimeout(() => runLiveCheck(el), LIVE_CHECK_DEBOUNCE_MS);
    }, true);

    document.addEventListener('blur', e => {
      const el = e.target;
      if (!el || !['INPUT', 'TEXTAREA'].includes(el.tagName)) return;
      clearTimeout(liveCheckTimer);
      runLiveCheck(el, { final: true });
    }, true);

    // ═══════════════════════════════════════════════════════════════════════
    // SPA — dynamische Formular-Erkennung
    // ═══════════════════════════════════════════════════════════════════════

    let domObserveTimer;
    new MutationObserver(() => {
      clearTimeout(domObserveTimer);
      domObserveTimer = setTimeout(() => {
        const fresh = extractRichContext();
        refreshContext(fresh);
      }, 800);
    }).observe(document.body, { childList: true, subtree: true });

    // Aktuelle Daten aus Supabase ziehen und in die laufende UI mergen.
    // Profile: nur ersetzen, wenn lokal leer (geräteübergreifender Erststart).
    // History: immer mergen (geräteübergreifende Aggregation).
    async function syncFromSupabase() {
      const [sbProfiles, sbHistory] = await Promise.all([
        sbFetchProfiles(),
        sbFetchHistory(),
      ]);

      if (sbProfiles?.profiles?.length) {
        const hasLocalData = profiles.some(p => Object.keys(p.profile || {}).length > 0);
        if (!hasLocalData) {
          profiles       = sbProfiles.profiles;
          activeProfileId = sbProfiles.activeProfileId || profiles[0]?.id;
          if (!profiles.find(p => p.id === activeProfileId)) activeProfileId = profiles[0].id;
          const freshEntry = getActiveEntry();
          Object.keys(profile).forEach(k => delete profile[k]);
          Object.assign(profile, freshEntry.profile || {});
          Object.keys(extras).forEach(k => delete extras[k]);
          Object.assign(extras, freshEntry.extras || {});
          chrome.storage.local.set({ faProfiles: profiles, faActiveProfileId: activeProfileId });
          renderProfileSelect();
          loadProfileIntoInputs(profile);
          renderExtrasInProfile();
          updateProfileProgress();
          SYSTEM = buildSystemPrompt(ctx, profile, extras);
          showToast('Profildaten synchronisiert ✓');
        }
      }

      if (sbHistory?.length) {
        const merged = [...faHistory];
        for (const entry of sbHistory) {
          if (!merged.some(e => e.ts === entry.ts && e.domain === entry.domain)) {
            merged.push(entry);
          }
        }
        merged.sort((a, b) => b.ts - a.ts);
        faHistory = merged.slice(0, 30);
        chrome.storage.local.set({ faHistory });
      }
    }

    syncFromSupabase();
    restoreChatMemory();
    resumeAgentIfPending();

    // ── Action panel ─────────────────────────────────────────────────
    $('fa-ap-agent').addEventListener('click', () => { if (profileVisible) hideProfile(); startAgent(); });
    $('fa-ap-explain').addEventListener('click', () => {
      if (profileVisible) hideProfile();
      askFormSummary();
    });
    $('fa-ap-fields').addEventListener('click', () => {
      const list = $('fa-ap-field-list');
      const btn  = $('fa-ap-fields');
      if (!list) return;
      // Bewusst eigener Name — `isOpen` gehört dem Sidebar-Zustand
      const listOpen = list.classList.toggle('open');
      btn.classList.toggle('open', listOpen);
      if (listOpen) renderActionFieldList();
    });
    $('fa-ap-options-toggle')?.addEventListener('click', () => {
      const box = $('fa-ap-options');
      const btn = $('fa-ap-options-toggle');
      if (!box) return;
      const open = box.classList.toggle('open');
      btn.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    $('fa-assistant-mode').addEventListener('change', e => {
      _assistantMode = normalizeAssistantMode(e.target.value);
      updateAssistantModeUi();
      chrome.storage.sync.set({ faAssistantMode: _assistantMode });
      const modeLabel = _assistantMode === 'classic' ? 'Mit Vorschau' : 'Automatisch';
      showToast(`Modus: ${modeLabel}`);
    });
    // Auto-Nav-Toggle: gespeicherten Zustand anwenden + Änderungen persistieren
    const autoNavCb = $('fa-auto-nav');
    if (autoNavCb) {
      autoNavCb.checked = _autoNavigate;
      autoNavCb.addEventListener('change', e => {
        _autoNavigate = e.target.checked;
        chrome.storage.sync.set({ faAutoNavigate: _autoNavigate });
      });
    }

    // ── Keyboard shortcut relay from background ───────────────────────
    chrome.runtime.onMessage.addListener(msg => {
      if (msg.type === 'toggle-assistant') {
        if (isOpen) { close(); return; }
        open();
      } else if (msg.type === 'smart-fill') {
        startAgent();
      }
    });

    // ── Sync storage → live config updates ───────────────────────────
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'sync') return;
      if (changes.faProvider) {
        _provider = normalizeProvider(changes.faProvider.newValue);
      }
      if (changes.faApiKey || changes.faGroqApiKey || changes.faOpenRouterApiKey || changes.faProvider) {
        _apiKey = '';
        _keyPromise = null;
      }
      if (changes.faModel) {
        _model = changes.faModel.newValue || getDefaultModel(_provider);
      } else if (changes.faProvider) {
        _model = getDefaultModel(_provider);
      }
      updateFooterNote();
      if (changes.faAssistantMode) {
        _assistantMode = normalizeAssistantMode(changes.faAssistantMode.newValue);
        updateAssistantModeUi();
      }
      if (changes.faAutoNavigate) {
        _autoNavigate = changes.faAutoNavigate.newValue !== false;
        const cb = $('fa-auto-nav');
        if (cb) cb.checked = _autoNavigate;
      }
    });

    // ── Restore saved position ────────────────────────────────────────
    if (savedPos && !savedPos.isDocked) {
      const restoredW = parseFloat(savedPos.width)  || 420;
      const restoredH = parseFloat(savedPos.height) || 0;
      const maxLeft   = Math.max(0, window.innerWidth  - restoredW);
      const maxTop    = Math.max(0, window.innerHeight - 200);
      const clampedLeft = Math.max(0, Math.min(maxLeft, parseFloat(savedPos.left) || 20));
      const clampedTop  = Math.max(0, Math.min(maxTop,  parseFloat(savedPos.top)  || 20));
      isDocked = false;
      sidebar.classList.add('no-animate', 'floating');
      sidebar.style.display   = 'none';
      sidebar.style.right     = 'auto';
      sidebar.style.left      = clampedLeft + 'px';
      sidebar.style.top       = clampedTop  + 'px';
      sidebar.style.bottom    = 'auto';
      sidebar.style.width     = restoredW   + 'px';
      sidebar.style.height    = restoredH ? restoredH + 'px' : '';
      sidebar.style.transform = 'none';
      requestAnimationFrame(() => requestAnimationFrame(() => sidebar.classList.remove('no-animate')));
    }

  } // end init()

  init();

})();

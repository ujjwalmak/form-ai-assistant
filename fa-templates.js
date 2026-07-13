'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// Statisches Sidebar-Markup (Gegenstück zu FA_CSS in fa-styles.js).
// Wird von content.js per innerHTML in den Shadow Root gesetzt — bewusst ein
// reiner String ohne Interpolation; alle dynamischen Inhalte setzt content.js
// über die fa-*-IDs nach.
// ─────────────────────────────────────────────────────────────────────────────

const FA_HTML = `
      <button class="trigger" id="fa-trigger" title="FormAssist öffnen">
        <svg viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
        <span class="trigger-badge" id="fa-trigger-badge" style="display:none"></span>
      </button>
      <div class="sidebar" id="fa-sidebar">
        <div class="toast" id="fa-toast"></div>
        <div class="undo-toast" id="fa-undo-toast">
          <span class="undo-toast-msg" id="fa-undo-toast-msg"></span>
          <button class="undo-toast-btn" id="fa-undo-toast-btn" type="button">Rückgängig</button>
        </div>
        <div class="resize-handle resize-n"  data-resize="n"></div>
        <div class="resize-handle resize-e"  data-resize="e"></div>
        <div class="resize-handle resize-s"  data-resize="s"></div>
        <div class="resize-handle resize-w"  data-resize="w"></div>
        <div class="resize-handle resize-ne" data-resize="ne"></div>
        <div class="resize-handle resize-nw" data-resize="nw"></div>
        <div class="resize-handle resize-se" data-resize="se"></div>
        <div class="resize-handle resize-sw" data-resize="sw"></div>
        <div class="header" id="fa-header">
          <div class="logo">
            <div class="logo-icon"><svg viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/><path d="M9 12h6M9 16h4"/></svg></div>
            <div class="logo-text"><span class="logo-name">FormAssist</span><span class="logo-sub" id="fa-ctx-title"></span></div>
          </div>
          <div class="header-btns">
            <button class="icon-btn" id="fa-new-chat" title="Neuer Chat"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></button>
            <button class="icon-btn" id="fa-history-btn" title="Verlauf"><svg viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></button>
            <button class="icon-btn" id="fa-profile-btn" title="Profil"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" stroke-width="2"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg></button>
            <button class="icon-btn" id="fa-dark-btn" title="Dark Mode"><svg viewBox="0 0 24 24" id="fa-dark-icon"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg></button>
            <button class="icon-btn" id="fa-close"    title="Schließen"><svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
        </div>
        <div class="action-panel" id="fa-action-panel">
          <button class="ap-primary" id="fa-ap-agent" disabled>
            <svg viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            Formular ausfüllen
          </button>
          <div class="ap-chips">
            <button class="ap-chip" id="fa-ap-explain">
              <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
              Erklären
            </button>
            <button class="ap-chip" id="fa-ap-fields">
              <svg viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/><path d="M9 12h6M9 16h4"/></svg>
              <span id="fa-ap-field-count">0 Felder</span>
            </button>
          </div>
          <div class="ap-field-list" id="fa-ap-field-list">
            <div class="field-list" id="fa-ap-field-inner"></div>
          </div>
          <button class="ap-options-toggle" id="fa-ap-options-toggle" type="button" aria-expanded="false" aria-controls="fa-ap-options">
            <svg class="ap-options-gear" viewBox="0 0 24 24"><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/></svg>
            <span>Optionen</span>
            <svg class="ap-options-caret" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>
          </button>
          <div class="ap-options" id="fa-ap-options">
            <div class="ap-mode-select-row">
              <label class="ap-mode-label" for="fa-assistant-mode">Assistent-Modus</label>
              <select class="ap-select" id="fa-assistant-mode">
                <option value="classic">Mit Vorschau (empfohlen)</option>
                <option value="context">Automatisch</option>
              </select>
            </div>
            <div class="ap-mode-row">
              <span class="ap-mode-label">Automatisch weiterklicken</span>
              <label class="ap-toggle">
                <input type="checkbox" id="fa-auto-nav" checked>
                <span class="ap-toggle-track"></span>
                <span class="ap-toggle-thumb"></span>
              </label>
            </div>
          </div>
          <div class="guided-progress" id="fa-guided-progress" style="display:none">
            <div class="gp-bar-wrap"><div class="gp-bar" id="fa-gp-bar"></div></div>
            <div class="gp-label" id="fa-gp-label"></div>
          </div>
          <div class="trust-row">
            <span class="trust-dot"></span>
            <span>Profil lokal gespeichert · KI nur bei Aktionen</span>
          </div>
        </div>
        <div class="messages" id="fa-messages">
          <div class="results-empty" id="fa-results-empty">Starte den Agenten oder stelle eine Frage unten.</div>
        </div>
        <div class="history-panel" id="fa-history-panel">
          <div class="profile-hdr">
            <span>Verlauf</span>
            <button class="history-clear" id="fa-history-clear">Alles löschen</button>
          </div>
          <div class="history-list" id="fa-history-list"></div>
        </div>
        <div class="profile-panel" id="fa-profile-panel">
          <div class="profile-hdr"><span>Mein Profil</span><span id="fa-pf-fill-count">Lokal gespeichert</span></div>
          <div class="pf-switcher">
            <select class="pf-select" id="fa-profile-select"></select>
            <button class="pf-sw-btn" id="fa-pf-new" title="Neues Profil">+</button>
            <button class="pf-sw-btn danger" id="fa-pf-del-profile" title="Profil löschen">×</button>
          </div>
          <div class="pf-scan">
            <button class="pf-scan-btn" id="fa-pf-scan" type="button">
              <svg viewBox="0 0 24 24"><path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2"/><circle cx="12" cy="12" r="3.5"/></svg>
              Dokument scannen (KI liest Ausweis, Vertrag …)
            </button>
            <div class="pf-scan-confirm" id="fa-pf-scan-confirm">
              <img id="fa-pf-scan-preview" alt="Dokument-Vorschau">
              <div class="pf-scan-note" id="fa-pf-scan-note"></div>
              <div class="pf-scan-actions">
                <button class="pf-scan-go" id="fa-pf-scan-go" type="button">Analysieren</button>
                <button class="pf-scan-cancel" id="fa-pf-scan-cancel" type="button">Abbrechen</button>
              </div>
            </div>
          </div>
          <div class="profile-grid" id="fa-profile-grid"></div>
          <div class="profile-actions">
            <button class="btn-primary" id="fa-pf-save">Speichern</button>
            <div class="pf-actions-util">
              <button id="fa-pf-fake">Fake-Daten</button>
              <button class="btn-io" id="fa-pf-export">↓ Export</button>
              <button class="btn-io" id="fa-pf-import">↑ Import</button>
            </div>
          </div>
        </div>
        <div class="input-area">
          <div class="autofill-tip" id="fa-autofill-tip">
            <strong id="fa-autofill-value"></strong>
            <button class="autofill-btn" id="fa-autofill-btn">Ausfüllen</button>
          </div>
          <div class="live-check" id="fa-live-check">
            <i class="lc-icon" id="fa-live-check-icon"></i>
            <span class="lc-text" id="fa-live-check-text"></span>
          </div>
          <div class="field-tag" id="fa-field-tag">
            <div class="dot-ind"></div>Aktives Feld: <span id="fa-field-name"></span>
          </div>
          <div class="input-row">
            <textarea class="input-box" id="fa-input" placeholder="Frage zum Formular stellen…" rows="1"></textarea>
            <button class="send-btn" id="fa-send"><svg viewBox="0 0 24 24"><path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/></svg></button>
          </div>
          <div class="footer-note" id="fa-footer-note"></div>
        </div>
      </div>`;

// ── Test export (Node/Vitest only; `module` is undefined in the browser) ──────
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FA_HTML };
}

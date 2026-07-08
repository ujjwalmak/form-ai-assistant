'use strict';
const FA_CSS = `
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

      /* ════════════════════════════════════════════════════════════════
         AURORA GLASS — design tokens
         Violet → Fuchsia → Pink spectrum on layered glass
         ════════════════════════════════════════════════════════════════ */
      @property --fa-spin {
        syntax: '<angle>';
        inherits: false;
        initial-value: 0deg;
      }
      :host {
        --bg:        #f6f5ff;
        --surface:   #ffffff;
        --surface2:  #f4f3fb;
        --surface3:  #eae8f8;
        --glass:     rgba(252, 252, 255, 0.74);
        --border:    rgba(86, 63, 205, 0.10);
        --border2:   rgba(86, 63, 205, 0.22);
        --text:      #14121f;
        --text2:     #3f3b54;
        --text3:     #767093;
        --accent:    #7c5cff;
        --accent-h:  #6a48f5;
        --accent-l:  #f1edff;
        --accent-b:  #d6c9ff;
        --grad:      linear-gradient(135deg, #6d5dfc 0%, #a855f7 48%, #ec4899 100%);
        --grad-soft: linear-gradient(135deg, rgba(109,93,252,0.12), rgba(168,85,247,0.09) 50%, rgba(236,72,153,0.08));
        --danger:    #e11d48;
        --danger-l:  #fff1f2;
        --ok:        #059669;
        --ok-l:      #ecfdf5;
        --warn:      #b45309;
        --warn-l:    #fffbeb;
        --focus:     0 0 0 3px rgba(124, 92, 255, 0.30);
        --glow:      0 10px 32px -6px rgba(124, 92, 255, 0.55);
        --glow-pink: 0 10px 32px -8px rgba(236, 72, 153, 0.45);
        --shadow:    0 40px 90px -24px rgba(38, 24, 94, 0.32), 0 10px 28px -10px rgba(38, 24, 94, 0.16);
        --shadow-sm: 0 1px 2px rgba(38, 24, 94, 0.05), 0 5px 14px -5px rgba(38, 24, 94, 0.10);
        --state:     rgba(124, 92, 255, 0.09);
        --state-strong: rgba(124, 92, 255, 0.17);
        --state-on-primary: rgba(255, 255, 255, 0.20);
        --ring-opacity: 0.85;
        --noise-opacity: 0.022;
        --font:      'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        --ease:      cubic-bezier(0.4, 0, 0.2, 1);
        --spring:    cubic-bezier(0.32, 0.72, 0, 1);
      }
      :host(.dark) {
        --bg:        #08070f;
        --surface:   #13111d;
        --surface2:  #1a1828;
        --surface3:  #242138;
        --glass:     rgba(15, 13, 25, 0.82);
        --border:    rgba(167, 139, 250, 0.13);
        --border2:   rgba(167, 139, 250, 0.30);
        --text:      #f4f2ff;
        --text2:     #cac5e6;
        --text3:     #8d86ad;
        --accent:    #9d7bff;
        --accent-h:  #b69cff;
        --accent-l:  rgba(124, 92, 255, 0.16);
        --accent-b:  rgba(157, 123, 255, 0.45);
        --grad:      linear-gradient(135deg, #6d5dfc 0%, #a855f7 48%, #ec4899 100%);
        --grad-soft: linear-gradient(135deg, rgba(109,93,252,0.22), rgba(168,85,247,0.14) 50%, rgba(236,72,153,0.12));
        --danger:    #fb7185;
        --danger-l:  rgba(225, 29, 72, 0.15);
        --ok:        #34d399;
        --ok-l:      rgba(5, 150, 105, 0.16);
        --warn:      #fbbf24;
        --warn-l:    rgba(180, 83, 9, 0.16);
        --focus:     0 0 0 3px rgba(157, 123, 255, 0.38);
        --glow:      0 10px 36px -6px rgba(124, 92, 255, 0.65);
        --glow-pink: 0 10px 36px -8px rgba(236, 72, 153, 0.5);
        --shadow:    0 40px 90px -16px rgba(0, 0, 0, 0.72), 0 10px 28px -8px rgba(0, 0, 0, 0.5);
        --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.35), 0 5px 14px -5px rgba(0, 0, 0, 0.3);
        --state:     rgba(157, 123, 255, 0.13);
        --state-strong: rgba(157, 123, 255, 0.22);
        --state-on-primary: rgba(255, 255, 255, 0.17);
        --ring-opacity: 1;
        --noise-opacity: 0.035;
      }

      /* ── Shared keyframes ── */
      @keyframes fa-ring     { to { --fa-spin: 360deg; } }
      @keyframes fa-logo-flow{ to { background-position: 200% center; } }
      @keyframes fa-aurora-a {
        0%, 100% { transform: translate(-12%, -20%) scale(1); }
        50%      { transform: translate(16%, 10%) scale(1.25); }
      }
      @keyframes fa-aurora-b {
        0%, 100% { transform: translate(14%, 18%) scale(1.15); }
        50%      { transform: translate(-14%, -8%) scale(0.9); }
      }
      @keyframes msg-in   { from { opacity: 0; transform: translateY(12px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
      @keyframes panel-in { from { opacity: 0; transform: translateX(18px); } to { opacity: 1; transform: translateX(0); } }
      @keyframes fa-bounce {
        0%, 80%, 100% { transform: translateY(0); opacity: 0.35; }
        40%           { transform: translateY(-4px); opacity: 1; }
      }
      @keyframes fa-orb {
        0%, 100% { box-shadow: 0 2px 10px -1px rgba(124,92,255,0.65), inset 0 1px 2px rgba(255,255,255,0.55); }
        50%      { box-shadow: 0 2px 16px 1px rgba(236,72,153,0.6), inset 0 1px 2px rgba(255,255,255,0.55); }
      }
      @keyframes fa-spin  { to { transform: rotate(360deg); } }
      @keyframes blink    { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }
      @keyframes re-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
      @keyframes gp-flow  { 0% { background-position: 0% 0; } 100% { background-position: 200% 0; } }
      @keyframes ap-shine {
        0%   { transform: translateX(-130%) skewX(-18deg); }
        100% { transform: translateX(330%) skewX(-18deg); }
      }
      @keyframes trigger-glow {
        0%, 100% { box-shadow: 0 12px 34px -8px rgba(124,92,255,0.6), 0 0 0 0 rgba(168,85,247,0.3); }
        50%      { box-shadow: 0 14px 40px -6px rgba(236,72,153,0.55), 0 0 0 12px rgba(168,85,247,0); }
      }

      /* ── Interaction layer for all buttons ── */
      button { -webkit-tap-highlight-color: transparent; font-family: var(--font); }
      button:not(:disabled) { position: relative; overflow: hidden; }
      button:not(:disabled)::before {
        content: '';
        position: absolute; inset: 0; border-radius: inherit;
        background: var(--state);
        opacity: 0; pointer-events: none;
        transition: opacity 0.15s var(--ease);
      }
      button:not(:disabled):hover::before,
      button:not(:disabled):focus-visible::before { opacity: 1; }
      button:not(:disabled):active::before { opacity: 1; background: var(--state-strong); }
      button > * { position: relative; z-index: 1; }
      .trigger::before, .send-btn::before, .ap-primary::before,
      .profile-actions .btn-primary::before, .agent-confirm::before,
      .review-continue::before, .autofill-btn::before, .re-chip.primary::before { background: var(--state-on-primary); }

      /* ════════════════════════════════════════════════════════════════
         Trigger — gradient orb with rotating halo
         ════════════════════════════════════════════════════════════════ */
      button.trigger {
        position: fixed; bottom: 26px; right: 26px; width: 58px; height: 58px;
        background: var(--grad);
        border: none; border-radius: 20px; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        pointer-events: all; z-index: 2;
        overflow: visible;
        animation: trigger-glow 3.2s ease-in-out infinite;
        transition: transform 0.2s var(--spring), opacity 0.2s, border-radius 0.2s;
      }
      .trigger::after {
        content: ''; position: absolute; inset: -4px; border-radius: 24px; padding: 2px;
        background: conic-gradient(from var(--fa-spin, 0deg),
          rgba(124,92,255,0) 0deg, rgba(167,139,250,0.9) 60deg, rgba(236,72,153,0.9) 120deg,
          rgba(124,92,255,0) 200deg, rgba(56,189,248,0.7) 290deg, rgba(124,92,255,0) 360deg);
        -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
        -webkit-mask-composite: xor; mask-composite: exclude;
        animation: fa-ring 4s linear infinite;
        opacity: 0; transition: opacity 0.25s;
        pointer-events: none;
      }
      .trigger:hover  { transform: translateY(-4px) scale(1.06); border-radius: 24px; animation: none; box-shadow: var(--glow), var(--glow-pink); }
      .trigger:hover::after { opacity: 1; }
      .trigger:active { transform: translateY(-1px) scale(0.96); animation: none; }
      .trigger:focus-visible { outline: none; box-shadow: var(--focus), var(--glow); animation: none; }
      .trigger svg    { width: 25px; height: 25px; stroke: #fff; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; fill: none; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.25)); }
      .trigger-badge {
        position: absolute; top: -7px; right: -7px; z-index: 2;
        min-width: 22px; height: 22px; padding: 0 6px;
        background: #14121f; color: #fff;
        border: 2px solid #fff; border-radius: 999px;
        font: 800 10.5px/1 var(--font);
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 4px 10px -2px rgba(0,0,0,0.35);
      }
      :host(.dark) .trigger-badge { background: #f4f2ff; color: #14121f; border-color: #13111d; }

      /* ════════════════════════════════════════════════════════════════
         Sidebar — deep glass with animated aurora ring
         ════════════════════════════════════════════════════════════════ */
      .sidebar {
        position: fixed; top: 14px; right: 14px; bottom: 14px;
        width: 420px; min-width: 330px;
        background: var(--glass);
        backdrop-filter: blur(32px) saturate(1.7);
        -webkit-backdrop-filter: blur(32px) saturate(1.7);
        border: 1px solid var(--border);
        border-radius: 26px;
        box-shadow: var(--shadow);
        display: flex; flex-direction: column;
        font-family: var(--font); pointer-events: all; z-index: 2;
        transform: translateX(calc(100% + 36px));
        transition: transform 0.38s var(--spring);
        user-select: none;
        overflow: hidden;
      }
      /* rotating aurora border ring */
      .sidebar::before {
        content: ''; position: absolute; inset: 0; border-radius: inherit; padding: 1.5px;
        background: conic-gradient(from var(--fa-spin, 0deg),
          rgba(124,92,255,0) 0deg, rgba(149,118,255,var(--ring-opacity)) 50deg, rgba(236,72,153,var(--ring-opacity)) 110deg,
          rgba(124,92,255,0) 180deg, rgba(124,92,255,0) 230deg, rgba(56,189,248,0.55) 300deg, rgba(124,92,255,0) 360deg);
        -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
        -webkit-mask-composite: xor; mask-composite: exclude;
        animation: fa-ring 9s linear infinite;
        pointer-events: none; z-index: 40;
      }
      /* film grain for that premium glass feel */
      .sidebar::after {
        content: ''; position: absolute; inset: 0; z-index: 60; pointer-events: none;
        background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
        opacity: var(--noise-opacity);
      }
      .sidebar.open       { transform: translateX(0); }
      .sidebar.floating   { border-radius: 26px; }
      .sidebar.no-animate { transition: none !important; }

      /* ── Resize handles ── */
      .resize-handle { position: absolute; z-index: 45; }
      .resize-n, .resize-s { left: 18px; right: 18px; height: 8px; cursor: ns-resize; }
      .resize-n { top: 0; }
      .resize-s { bottom: 0; }
      .resize-e, .resize-w { top: 18px; bottom: 18px; width: 8px; cursor: ew-resize; }
      .resize-e { right: 0; }
      .resize-w { left: 0; }
      .resize-ne, .resize-nw, .resize-se, .resize-sw { width: 20px; height: 20px; z-index: 46; }
      .resize-ne { top: 0; right: 0; cursor: nesw-resize; }
      .resize-nw { top: 0; left: 0; cursor: nwse-resize; }
      .resize-se { bottom: 0; right: 0; cursor: nwse-resize; }
      .resize-sw { bottom: 0; left: 0; cursor: nesw-resize; }
      .resize-n::after, .resize-s::after, .resize-e::after, .resize-w::after {
        content: ''; position: absolute; border-radius: 999px; background: var(--accent-b);
        opacity: 0; transition: opacity 0.16s;
      }
      .resize-n::after, .resize-s::after { left: 50%; transform: translateX(-50%); width: 44px; height: 3px; }
      .resize-n::after { top: 3px; }
      .resize-s::after { bottom: 3px; }
      .resize-e::after, .resize-w::after { top: 50%; transform: translateY(-50%); width: 3px; height: 44px; }
      .resize-e::after { right: 3px; }
      .resize-w::after { left: 3px; }
      .resize-handle:hover::after { opacity: 0.95; }

      /* ════════════════════════════════════════════════════════════════
         Header — gradient wordmark
         ════════════════════════════════════════════════════════════════ */
      .header {
        padding: 14px 14px 13px 18px; height: 64px;
        border-bottom: 1px solid var(--border);
        display: flex; align-items: center; justify-content: space-between; gap: 12px;
        flex-shrink: 0; cursor: grab; touch-action: none; z-index: 4;
      }
      .header:active { cursor: grabbing; }
      .logo      { display: flex; align-items: center; gap: 10px; pointer-events: none; min-width: 0; }
      .logo-icon {
        width: 37px; height: 37px;
        background: var(--grad); color: #fff;
        border: none; border-radius: 13px;
        display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        box-shadow: 0 5px 14px -3px rgba(124,92,255,0.55), inset 0 1px 0 rgba(255,255,255,0.3);
      }
      .logo-icon svg { width: 18px; height: 18px; stroke: #fff; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; fill: none; }
      .logo-text  { display: flex; flex-direction: column; gap: 1px; min-width: 0; overflow: hidden; }
      .logo-name  {
        font-size: 15px; font-weight: 800; letter-spacing: -0.02em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        background: linear-gradient(90deg, #7c5cff, #ec4899 45%, #38bdf8 70%, #7c5cff);
        background-size: 200% auto;
        -webkit-background-clip: text; background-clip: text;
        -webkit-text-fill-color: transparent; color: transparent;
        animation: fa-logo-flow 7s linear infinite;
      }
      .logo-sub   { font-size: 11px; color: var(--text3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .header-btns { display: flex; gap: 3px; flex-shrink: 0; }
      .icon-btn {
        width: 32px; height: 32px; border: 1px solid transparent; background: transparent;
        cursor: pointer; border-radius: 10px;
        display: flex; align-items: center; justify-content: center; color: var(--text3);
        transition: color 0.15s, border-color 0.15s, background 0.15s, transform 0.12s var(--spring);
      }
      .icon-btn:hover  { color: var(--text); transform: translateY(-1px); }
      .icon-btn:focus-visible { outline: none; box-shadow: var(--focus); color: var(--accent); }
      .icon-btn.active { background: var(--accent-l); color: var(--accent); border-color: var(--accent-b); }
      .icon-btn svg { width: 15px; height: 15px; stroke: currentColor; stroke-width: 2.1; stroke-linecap: round; fill: none; }

      /* ════════════════════════════════════════════════════════════════
         Action panel — living aurora backdrop
         ════════════════════════════════════════════════════════════════ */
      .action-panel {
        padding: 16px 16px 14px;
        border-bottom: 1px solid var(--border);
        flex-shrink: 0;
        position: relative; overflow: hidden;
        background: var(--grad-soft);
      }
      .action-panel::before, .action-panel::after {
        content: ''; position: absolute; border-radius: 50%;
        filter: blur(42px); pointer-events: none; z-index: 0;
      }
      .action-panel::before {
        width: 240px; height: 240px; top: -120px; left: -50px;
        background: radial-gradient(circle, rgba(124,92,255,0.4), transparent 65%);
        animation: fa-aurora-a 13s ease-in-out infinite;
      }
      .action-panel::after {
        width: 220px; height: 220px; bottom: -130px; right: -40px;
        background: radial-gradient(circle, rgba(236,72,153,0.32), transparent 65%);
        animation: fa-aurora-b 16s ease-in-out infinite;
      }
      .action-panel > * { position: relative; z-index: 1; }

      .ap-primary {
        width: 100%; height: 50px;
        background: var(--grad);
        background-size: 160% auto;
        color: #fff; border: none; border-radius: 15px;
        font: 700 14px/1 var(--font); letter-spacing: -0.01em; cursor: pointer;
        display: flex; align-items: center; justify-content: center; gap: 9px;
        box-shadow: 0 2px 6px -2px rgba(124,92,255,0.45), 0 12px 30px -8px rgba(168,85,247,0.6), inset 0 1px 0 rgba(255,255,255,0.25);
        transition: transform 0.16s var(--spring), box-shadow 0.2s, opacity 0.15s, background-position 0.4s;
      }
      .ap-primary::after {
        content: '';
        position: absolute; top: 0; bottom: 0; width: 36%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.32), transparent);
        animation: ap-shine 3.4s var(--ease) infinite;
        pointer-events: none;
      }
      .ap-primary:disabled::after { display: none; }
      .ap-primary svg { width: 17px; height: 17px; stroke: #fff; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; fill: none; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.2)); }
      .ap-primary:hover { transform: translateY(-2px); background-position: 100% center; box-shadow: 0 4px 10px -2px rgba(124,92,255,0.5), 0 18px 40px -10px rgba(236,72,153,0.6), inset 0 1px 0 rgba(255,255,255,0.25); }
      .ap-primary:active { transform: translateY(0) scale(0.985); }
      .ap-primary:focus-visible { outline: none; box-shadow: var(--focus), var(--glow); }
      .ap-primary:disabled { opacity: 0.4; cursor: not-allowed; transform: none; box-shadow: none; }

      .ap-chips { display: flex; gap: 8px; margin-top: 10px; }
      .ap-chip {
        flex: 1; height: 35px;
        border: 1px solid var(--border2); background: var(--surface);
        color: var(--text2); border-radius: 11px;
        font: 600 12px/1 var(--font); cursor: pointer;
        display: flex; align-items: center; justify-content: center; gap: 6px;
        transition: color 0.15s, border-color 0.15s, background 0.15s, box-shadow 0.15s, transform 0.12s var(--spring);
        white-space: nowrap; flex-shrink: 0;
        box-shadow: var(--shadow-sm);
      }
      .ap-chip svg { width: 13px; height: 13px; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; fill: none; flex-shrink: 0; }
      .ap-chip:hover, .ap-chip.open { border-color: var(--accent-b); background: var(--accent-l); color: var(--accent); transform: translateY(-1px); }
      .ap-chip:active { transform: scale(0.97); }
      .ap-chip:focus-visible { outline: none; box-shadow: var(--focus); }

      .ap-field-list { overflow: hidden; max-height: 0; transition: max-height 0.3s var(--spring), padding-top 0.2s; }
      .ap-field-list.open { max-height: 230px; padding-top: 10px; }
      .ap-field-list .field-list { max-height: 220px; margin-top: 0; }

      /* ── Optionen: eingeklappte Einstellungen (Modus + Auto-Nav) ── */
      .ap-options-toggle {
        display: flex; align-items: center; gap: 7px;
        width: 100%; margin-top: 10px; padding: 8px 11px;
        border: 1px solid var(--border); border-radius: 11px;
        background: var(--surface); color: var(--text2);
        font: 600 11.5px/1 var(--font); cursor: pointer;
        box-shadow: var(--shadow-sm);
        transition: color 0.15s, border-color 0.15s, background 0.15s, transform 0.12s var(--spring);
      }
      .ap-options-toggle:hover { border-color: var(--accent-b); background: var(--accent-l); color: var(--accent); }
      .ap-options-toggle:active { transform: scale(0.99); }
      .ap-options-toggle:focus-visible { outline: none; box-shadow: var(--focus); }
      .ap-options-gear { width: 14px; height: 14px; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; fill: none; flex-shrink: 0; }
      .ap-options-caret { width: 14px; height: 14px; margin-left: auto; stroke: currentColor; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; fill: none; flex-shrink: 0; transition: transform 0.25s var(--spring); }
      .ap-options-toggle.open .ap-options-caret { transform: rotate(180deg); }
      .ap-options { overflow: hidden; max-height: 0; transition: max-height 0.32s var(--spring); }
      .ap-options.open { max-height: 170px; }

      .ap-mode-select-row { display: flex; flex-direction: column; gap: 6px; margin-top: 10px; }
      .ap-select {
        width: 100%; height: 35px;
        border: 1px solid var(--border2); border-radius: 11px;
        background: var(--surface); color: var(--text2);
        font: 500 12px/1 var(--font); padding: 0 10px; outline: none; cursor: pointer;
        transition: border-color 0.15s, box-shadow 0.15s;
        box-shadow: var(--shadow-sm);
      }
      .ap-select:focus-visible { border-color: var(--accent); box-shadow: var(--focus); }

      .ap-mode-row {
        display: flex; align-items: center; justify-content: space-between;
        margin-top: 9px; padding: 9px 11px;
        border: 1px solid var(--border); border-radius: 11px;
        background: var(--surface);
        box-shadow: var(--shadow-sm);
      }
      .ap-mode-label { font-size: 11.5px; color: var(--text2); font-weight: 500; }
      .ap-toggle { position: relative; display: inline-flex; align-items: center; width: 40px; height: 22px; flex-shrink: 0; cursor: pointer; }
      .ap-toggle input { opacity: 0; width: 0; height: 0; position: absolute; }
      .ap-toggle-track { position: absolute; inset: 0; border-radius: 999px; background: var(--border2); transition: background 0.2s; }
      .ap-toggle input:checked ~ .ap-toggle-track { background: var(--grad); }
      .ap-toggle-thumb { position: absolute; top: 3px; left: 3px; width: 16px; height: 16px; border-radius: 50%; background: #fff; box-shadow: 0 1px 4px rgba(0,0,0,0.3); transition: transform 0.22s var(--spring); }
      .ap-toggle input:checked ~ .ap-toggle-thumb { transform: translateX(18px); }

      .trust-row {
        display: flex; align-items: center; gap: 7px;
        margin-top: 11px; padding: 0 3px;
        color: var(--text3); font: 500 10.5px/1.35 var(--font);
      }
      .trust-dot {
        width: 7px; height: 7px; border-radius: 50%;
        background: var(--ok); box-shadow: 0 0 0 3px var(--ok-l), 0 0 8px rgba(5,150,105,0.5);
        flex-shrink: 0;
        animation: blink 3s ease-in-out infinite;
      }

      /* ── Guided progress — glowing bar ── */
      .guided-progress { margin-top: 10px; }
      .gp-bar-wrap { height: 6px; background: var(--surface3); border-radius: 999px; overflow: hidden; margin-bottom: 6px; }
      .gp-bar {
        height: 100%; border-radius: 999px;
        background: linear-gradient(90deg, #6d5dfc, #a855f7, #ec4899, #a855f7, #6d5dfc);
        background-size: 200% 100%;
        animation: gp-flow 2.2s linear infinite;
        transition: width 0.45s var(--spring);
        box-shadow: 0 0 12px rgba(168,85,247,0.65);
      }
      .gp-label { font-size: 11px; color: var(--text2); font-weight: 500; }

      /* ════════════════════════════════════════════════════════════════
         Messages — chat with AI orb avatars
         ════════════════════════════════════════════════════════════════ */
      .messages {
        flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px;
        scroll-behavior: smooth; transition: opacity 0.15s;
        background: radial-gradient(120% 50% at 50% 0%, var(--accent-l) 0%, transparent 55%);
      }
      .messages::-webkit-scrollbar { width: 5px; }
      .messages::-webkit-scrollbar-track { background: transparent; }
      .messages::-webkit-scrollbar-thumb { background: linear-gradient(180deg, rgba(124,92,255,0.4), rgba(236,72,153,0.4)); border-radius: 999px; }

      .results-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px 28px; text-align: center; pointer-events: none; }
      .re-icon {
        width: 64px; height: 64px; border-radius: 22px;
        background: var(--grad);
        display: flex; align-items: center; justify-content: center; margin-bottom: 20px;
        animation: re-float 4.5s ease-in-out infinite;
        box-shadow: 0 14px 36px -8px rgba(168,85,247,0.65), inset 0 1px 0 rgba(255,255,255,0.35);
        position: relative;
      }
      .re-icon::after {
        content: ''; position: absolute; inset: -7px; border-radius: 28px; padding: 1.5px;
        background: conic-gradient(from var(--fa-spin, 0deg), rgba(124,92,255,0), rgba(167,139,250,0.8) 90deg, rgba(236,72,153,0.8) 180deg, rgba(124,92,255,0) 290deg);
        -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
        -webkit-mask-composite: xor; mask-composite: exclude;
        animation: fa-ring 5s linear infinite;
      }
      .re-icon svg { width: 29px; height: 29px; stroke: #fff; stroke-width: 1.9; stroke-linecap: round; stroke-linejoin: round; fill: none; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.2)); }
      .re-title { font-size: 15.5px; font-weight: 800; color: var(--text); margin-bottom: 5px; line-height: 1.3; letter-spacing: -0.02em; }
      .re-sub { font-size: 11px; color: var(--text3); margin-bottom: 14px; }
      .re-hint { font-size: 12px; color: var(--text2); line-height: 1.6; max-width: 250px; }

      /* ── Empty-state suggestion chips ── */
      .re-chips { display: flex; flex-wrap: wrap; gap: 7px; justify-content: center; margin-top: 18px; pointer-events: all; }
      .re-chip {
        padding: 9px 15px; border-radius: 999px;
        border: 1px solid var(--border2); background: var(--surface); color: var(--text2);
        font: 600 12px/1 var(--font); cursor: pointer;
        transition: border-color 0.15s, color 0.15s, background 0.15s, transform 0.13s var(--spring), box-shadow 0.15s;
        box-shadow: var(--shadow-sm);
      }
      .re-chip:hover { border-color: var(--accent-b); color: var(--accent); background: var(--accent-l); transform: translateY(-2px); box-shadow: 0 8px 18px -6px rgba(124,92,255,0.35); }
      .re-chip:active { transform: scale(0.96); }
      .re-chip:focus-visible { outline: none; box-shadow: var(--focus); }
      .re-chip.primary { background: var(--grad); color: #fff; border-color: transparent; box-shadow: 0 6px 18px -4px rgba(168,85,247,0.6); }

      /* ── Chat memory divider + restored messages ── */
      .chat-divider {
        display: flex; align-items: center; gap: 10px;
        margin: 4px 0; color: var(--text3);
        font: 700 9.5px/1 var(--font); text-transform: uppercase; letter-spacing: 1px;
      }
      .chat-divider::before, .chat-divider::after {
        content: ''; flex: 1; height: 1px;
        background: linear-gradient(90deg, transparent, var(--accent-b), transparent);
      }
      .chat-divider span { display: inline-flex; align-items: center; gap: 5px; white-space: nowrap; }
      .msg.restored { animation: none; }
      .msg.restored .bubble { opacity: 0.62; }
      .msg.restored::before { opacity: 0.5; animation: none; }

      /* ── Message rows ── */
      .msg { display: flex; align-items: flex-start; animation: msg-in 0.28s var(--spring); }
      .msg.ai   { justify-content: flex-start; gap: 9px; }
      .msg.user { justify-content: flex-end; }
      /* AI orb avatar */
      .msg.ai::before, .typing-row::before {
        content: ''; width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0; margin-top: 3px;
        background: radial-gradient(circle at 32% 28%, #d8ccff 0%, #8b6bff 42%, #ec4899 100%);
        animation: fa-orb 3.5s ease-in-out infinite;
      }
      .bubble {
        max-width: calc(100% - 31px); padding: 11px 14px;
        font-size: 13px; line-height: 1.58; color: var(--text);
        font-family: var(--font); overflow-wrap: anywhere;
      }
      .msg.ai .bubble {
        background: var(--surface); border: 1px solid var(--border);
        border-radius: 4px 16px 16px 16px; box-shadow: var(--shadow-sm);
      }
      .msg.user .bubble {
        max-width: 86%;
        background: var(--grad); border: none;
        border-radius: 16px 16px 4px 16px; padding: 8px 13px;
        color: #fff; font-size: 12.5px; line-height: 1.5; font-weight: 500;
        box-shadow: 0 5px 16px -5px rgba(168,85,247,0.55);
      }
      .bubble code { background: var(--surface2); border: 1px solid var(--border); border-radius: 5px; padding: 1px 5px; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 0.9em; }
      .msg.user .bubble code { background: rgba(255,255,255,0.18); border-color: rgba(255,255,255,0.25); color: #fff; }
      .bubble.copyable { padding-right: 38px; position: relative; }
      .copy-btn {
        position: absolute; top: 6px; right: 6px; width: 26px; height: 26px;
        border: 1px solid transparent; border-radius: 8px; background: transparent; color: var(--text3);
        display: flex; align-items: center; justify-content: center; cursor: pointer;
        transition: background 0.15s, color 0.15s, border-color 0.15s;
      }
      .copy-btn:hover { background: var(--surface2); color: var(--text); border-color: var(--border); }
      .copy-btn:focus-visible { outline: none; box-shadow: var(--focus); }
      .copy-btn svg { width: 13px; height: 13px; stroke: currentColor; stroke-width: 2; fill: none; stroke-linecap: round; stroke-linejoin: round; }

      /* ── Chat action result card ── */
      .bubble.action-result { padding: 10px 13px; }
      .msg.ai .bubble.action-result { box-shadow: var(--shadow-sm), inset 3px 0 0 #a855f7; }
      .ar-hdr {
        font-size: 10.5px; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase; margin-bottom: 7px;
        background: var(--grad);
        -webkit-background-clip: text; background-clip: text;
        -webkit-text-fill-color: transparent; color: transparent;
      }
      .ar-row { display: flex; align-items: center; gap: 7px; font-size: 12px; padding: 3px 0; min-width: 0; animation: msg-in 0.2s var(--spring); }
      .ar-icon { flex-shrink: 0; width: 15px; text-align: center; font-weight: 700; }
      .ar-row.ok .ar-icon { color: var(--ok); }
      .ar-row.fail .ar-icon { color: var(--danger); }
      .ar-label { flex: 1; color: var(--text2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
      .ar-value { color: var(--text); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 120px; flex-shrink: 0; }

      /* ── Field list ── */
      .field-list { display: flex; flex-direction: column; gap: 5px; margin-top: 10px; max-height: 190px; overflow-y: auto; padding-right: 2px; }
      .field-list::-webkit-scrollbar { width: 4px; }
      .field-list::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 999px; }
      .field-btn {
        width: 100%; min-height: 32px;
        background: var(--surface); border: 1px solid var(--border); color: var(--text2);
        padding: 6px 10px; border-radius: 10px; font-size: 12px; cursor: pointer;
        text-align: left; display: flex; align-items: center; gap: 7px;
        transition: color 0.15s, border-color 0.15s, box-shadow 0.15s, transform 0.12s;
      }
      .field-btn:hover { color: var(--accent); border-color: var(--accent-b); transform: translateX(3px); box-shadow: var(--shadow-sm); }
      .field-btn:focus-visible { outline: none; box-shadow: var(--focus); border-color: var(--accent-b); }
      .field-btn-label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
      .field-btn .req { color: var(--danger); background: var(--danger-l); border: 1px solid rgba(225,29,72,0.2); border-radius: 6px; font-size: 9.5px; font-weight: 700; line-height: 1; padding: 3px 5px; margin-left: auto; flex-shrink: 0; }
      .field-type-tag { font-size: 10px; color: var(--text3); background: var(--surface2); border: 1px solid var(--border); padding: 2px 6px; border-radius: 6px; flex-shrink: 0; max-width: 78px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

      /* ── Chips ── */
      .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
      .chip  {
        max-width: 100%; background: var(--surface); border: 1px solid var(--border2); color: var(--text2);
        padding: 6px 12px; border-radius: 999px; font-size: 11.5px; font-weight: 500; cursor: pointer;
        transition: border-color 0.15s, color 0.15s, background 0.15s, transform 0.12s var(--spring);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .chip:hover { border-color: var(--accent-b); color: var(--accent); background: var(--accent-l); transform: translateY(-1px); }
      .chip:active { transform: scale(0.96); }
      .chip:focus-visible { outline: none; box-shadow: var(--focus); }

      /* ── Typing — three bouncing gradient dots ── */
      .typing-row    { display: flex; gap: 9px; align-items: flex-start; animation: msg-in 0.25s var(--spring); }
      .typing-bubble { background: var(--surface); border: 1px solid var(--border); border-radius: 4px 16px 16px 16px; padding: 13px 15px; display: flex; align-items: center; gap: 5px; box-shadow: var(--shadow-sm); }
      .dot { width: 6.5px; height: 6.5px; border-radius: 50%; background: var(--grad); animation: fa-bounce 1.2s ease-in-out infinite; }
      .dot:nth-child(2) { animation-delay: 0.15s; }
      .dot:nth-child(3) { animation-delay: 0.3s; }

      /* ════════════════════════════════════════════════════════════════
         Input area
         ════════════════════════════════════════════════════════════════ */
      .input-area  { padding: 12px 16px 13px; border-top: 1px solid var(--border); flex-shrink: 0; }
      .field-tag   { font-size: 11.5px; color: var(--text3); margin-bottom: 7px; display: none; align-items: center; gap: 6px; min-width: 0; }
      .field-tag.visible { display: flex; }
      .field-tag .dot-ind { width: 6px; height: 6px; background: var(--grad); border-radius: 50%; flex-shrink: 0; animation: blink 2s ease-in-out infinite; }
      .field-tag span { font-weight: 600; color: var(--accent); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
      .input-row  { display: flex; gap: 8px; align-items: flex-end; }
      .input-box  {
        flex: 1; min-width: 0; font-family: var(--font); font-size: 13px;
        padding: 11px 15px; border: 1px solid var(--border2); border-radius: 14px;
        background: var(--surface); color: var(--text); resize: none; outline: none;
        min-height: 43px; max-height: 112px; line-height: 1.45;
        transition: border-color 0.18s, box-shadow 0.18s;
        box-shadow: var(--shadow-sm);
      }
      .input-box:focus { border-color: var(--accent); box-shadow: var(--focus), 0 8px 22px -8px rgba(124,92,255,0.35); }
      .input-box::placeholder { color: var(--text3); }
      .send-btn {
        width: 43px; height: 43px;
        background: var(--grad); border: none; border-radius: 14px; cursor: pointer;
        display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        box-shadow: 0 5px 16px -4px rgba(168,85,247,0.6), inset 0 1px 0 rgba(255,255,255,0.25);
        transition: transform 0.14s var(--spring), box-shadow 0.15s;
      }
      .send-btn:hover  { transform: translateY(-2px) scale(1.05); box-shadow: var(--glow), var(--glow-pink); }
      .send-btn:focus-visible { outline: none; box-shadow: var(--focus), var(--glow); }
      .send-btn:active { transform: scale(0.92); }
      .send-btn svg { width: 16px; height: 16px; stroke: #fff; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; fill: none; }
      .footer-note {
        display: flex; align-items: center; justify-content: center; gap: 6px; flex-wrap: wrap;
        font-size: 10px; color: var(--text3); text-align: center; margin-top: 9px;
      }
      .footer-provider { color: var(--text2); font-weight: 700; }
      .footer-model { max-width: 210px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .footer-sep { color: var(--border2); }

      /* ── Autofill tip ── */
      .autofill-tip {
        display: none; align-items: center; gap: 8px; margin-bottom: 8px;
        background: var(--accent-l); border: 1px solid var(--accent-b); border-radius: 11px;
        padding: 8px 10px; font-size: 11.5px; color: var(--text2); min-width: 0;
        animation: msg-in 0.22s var(--spring);
      }
      .autofill-tip.visible { display: flex; }
      .autofill-tip strong { color: var(--text); font-weight: 600; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .autofill-btn { background: var(--grad); color: #fff; border: none; border-radius: 8px; padding: 5px 11px; font-size: 11px; font-weight: 700; cursor: pointer; white-space: nowrap; flex-shrink: 0; transition: transform 0.12s var(--spring), box-shadow 0.15s; box-shadow: 0 3px 10px -3px rgba(168,85,247,0.5); }
      .autofill-btn:hover { transform: translateY(-1px); box-shadow: var(--glow); }
      .autofill-btn:focus-visible { outline: none; box-shadow: var(--focus); }

      /* ════════════════════════════════════════════════════════════════
         Profile panel
         ════════════════════════════════════════════════════════════════ */
      .profile-panel { display: none; flex-direction: column; flex: 1; overflow: hidden; }
      .profile-panel.visible { display: flex; animation: panel-in 0.24s var(--spring) forwards; }
      .profile-hdr {
        padding: 11px 18px; border-bottom: 1px solid var(--border);
        font-size: 12px; font-weight: 800; color: var(--text); flex-shrink: 0; letter-spacing: -0.01em;
        display: flex; justify-content: space-between; align-items: center; gap: 10px; min-width: 0;
      }
      .profile-hdr span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .profile-hdr span:last-child { font-weight: 400; color: var(--text3); font-size: 10.5px; flex-shrink: 0; max-width: 52%; }
      .profile-grid { flex: 1; overflow-y: auto; padding: 14px 18px; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 10px; }
      .profile-grid::-webkit-scrollbar { width: 5px; }
      .profile-grid::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 999px; }
      .pf { display: flex; flex-direction: column; gap: 4px; }
      .pf.full { grid-column: 1 / -1; }
      .pf-group-hdr {
        grid-column: 1 / -1;
        font-size: 10px; font-weight: 800; color: var(--text3);
        text-transform: uppercase; letter-spacing: 0.8px;
        padding-top: 12px; margin-top: 4px; border-top: 1px solid var(--border);
      }
      .pf-group-hdr:first-child { padding-top: 2px; margin-top: 0; border-top: none; }
      .pf label { font-size: 10.5px; color: var(--text3); font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .pf input {
        width: 100%; min-width: 0; font-family: var(--font); font-size: 12.5px;
        padding: 8px 11px; border: 1px solid var(--border); border-radius: 10px;
        background: var(--surface); color: var(--text); outline: none;
        transition: border-color 0.15s, box-shadow 0.15s;
      }
      .pf input:focus { border-color: var(--accent); box-shadow: var(--focus); }
      .profile-actions {
        padding: 10px 18px; border-top: 1px solid var(--border);
        display: flex; flex-direction: column; gap: 7px; flex-shrink: 0;
      }
      .profile-actions button {
        min-width: 0; padding: 8px; border-radius: 10px; font-size: 11.5px; font-weight: 600;
        cursor: pointer; border: 1px solid var(--border2); background: var(--surface); color: var(--text2);
        transition: color 0.15s, border-color 0.15s, background 0.15s, transform 0.12s var(--spring);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .profile-actions button:hover { color: var(--text); border-color: var(--text3); transform: translateY(-1px); }
      .profile-actions button:focus-visible { outline: none; box-shadow: var(--focus); border-color: var(--accent-b); }
      .profile-actions .btn-primary { width: 100%; padding: 11px; font-size: 12.5px; background: var(--grad); color: #fff; border-color: transparent; box-shadow: 0 5px 14px -4px rgba(168,85,247,0.55); }
      .profile-actions .btn-primary:hover { color: #fff; border-color: transparent; transform: translateY(-1px); box-shadow: 0 7px 18px -4px rgba(168,85,247,0.65); }
      .profile-actions .btn-io { color: var(--accent); border-color: var(--accent-b); background: var(--accent-l); }
      /* Utility-Zeile (Fake · Export · Import) */
      .pf-actions-util { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 7px; }

      /* ── Profile switcher ── */
      .pf-switcher { display: flex; align-items: center; gap: 6px; padding: 10px 18px 0; flex-shrink: 0; }
      .pf-select {
        flex: 1; min-width: 0; height: 32px;
        border: 1px solid var(--border2); border-radius: 10px;
        background: var(--surface); color: var(--text);
        font: 500 12px/1 var(--font); padding: 0 8px; cursor: pointer; appearance: auto;
      }
      .pf-select:focus { outline: none; border-color: var(--accent-b); box-shadow: var(--focus); }
      .pf-sw-btn {
        width: 28px; height: 28px; border-radius: 9px;
        border: 1px solid var(--border2); background: var(--surface); color: var(--text2);
        font-size: 15px; line-height: 1; cursor: pointer;
        display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        transition: color 0.13s, border-color 0.13s, background 0.13s, transform 0.12s var(--spring);
      }
      .pf-sw-btn:hover { color: var(--accent); border-color: var(--accent-b); background: var(--accent-l); transform: translateY(-1px); }
      .pf-sw-btn.danger:hover { color: var(--danger); border-color: var(--danger); background: var(--danger-l); }

      .pf-extras-hdr { grid-column: 1 / -1; font-size: 10px; font-weight: 800; color: var(--text3); text-transform: uppercase; letter-spacing: 0.8px; padding-top: 10px; margin-top: 2px; border-top: 1px solid var(--border); }
      .pf-extras-empty { grid-column: 1 / -1; font-size: 11.5px; color: var(--text3); font-style: italic; }
      .pf-extra-row { display: flex; gap: 6px; align-items: center; }
      .pf-extra-row input {
        flex: 1; min-width: 0; font-family: var(--font); font-size: 12.5px;
        padding: 8px 11px; border: 1px solid var(--border); border-radius: 10px;
        background: var(--surface); color: var(--text); outline: none;
        transition: border-color 0.15s, box-shadow 0.15s;
      }
      .pf-extra-row input:focus { border-color: var(--accent); box-shadow: var(--focus); }
      .pf-del { background: transparent; border: 1px solid transparent; color: var(--text3); cursor: pointer; padding: 4px 8px; border-radius: 8px; font-size: 14px; line-height: 1; flex-shrink: 0; transition: color 0.15s, background 0.15s, border-color 0.15s; }
      .pf-del:hover { color: var(--danger); background: var(--danger-l); border-color: rgba(225,29,72,0.2); }

      /* ════════════════════════════════════════════════════════════════
         History panel
         ════════════════════════════════════════════════════════════════ */
      .history-panel { display: none; flex-direction: column; flex: 1; overflow: hidden; }
      .history-panel.visible { display: flex; animation: panel-in 0.24s var(--spring) forwards; }
      .history-list { flex: 1; overflow-y: auto; padding: 12px 18px; display: flex; flex-direction: column; gap: 8px; }
      .history-list::-webkit-scrollbar { width: 5px; }
      .history-list::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 999px; }
      .history-entry {
        display: flex; align-items: flex-start; gap: 11px; padding: 11px 12px;
        border: 1px solid var(--border); border-radius: 14px; background: var(--surface);
        cursor: pointer; transition: border-color 0.15s, background 0.15s, transform 0.14s var(--spring), box-shadow 0.15s;
        box-shadow: var(--shadow-sm);
      }
      .history-entry:hover { border-color: var(--accent-b); background: var(--accent-l); transform: translateX(3px); box-shadow: 0 8px 20px -8px rgba(124,92,255,0.35); }
      .history-icon { width: 34px; height: 34px; border-radius: 11px; background: var(--grad); display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 4px 10px -3px rgba(168,85,247,0.5); }
      .history-icon svg { width: 16px; height: 16px; stroke: #fff; stroke-width: 2; fill: none; stroke-linecap: round; stroke-linejoin: round; }
      .history-info { flex: 1; min-width: 0; }
      .history-domain { font-size: 12.5px; font-weight: 700; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .history-meta { font-size: 11px; color: var(--text3); margin-top: 2px; }
      .history-empty { padding: 40px 20px; text-align: center; color: var(--text3); font-size: 12.5px; line-height: 1.6; }
      .history-clear { font-size: 11px; color: var(--danger); background: none; border: none; cursor: pointer; padding: 0; }
      .history-clear:hover { text-decoration: underline; }

      /* ════════════════════════════════════════════════════════════════
         Review / status
         ════════════════════════════════════════════════════════════════ */
      .review-status { display: inline-flex; align-items: center; gap: 5px; margin-bottom: 8px; padding: 4px 10px; border-radius: 999px; font-size: 10.5px; font-weight: 800; letter-spacing: 0.3px; border: 1px solid var(--border); color: var(--text2); background: var(--surface2); }
      .review-status.ok      { color: var(--ok); background: var(--ok-l); border-color: rgba(5,150,105,0.3); }
      .review-status.warn    { color: var(--warn); background: var(--warn-l); border-color: rgba(180,83,9,0.3); }
      .review-status.missing { color: var(--danger); background: var(--danger-l); border-color: rgba(225,29,72,0.25); }
      .review-actions { display: flex; gap: 7px; margin-top: 10px; flex-wrap: wrap; }
      .review-continue, .review-secondary {
        border: none; background: var(--grad); color: #fff;
        border-radius: 10px; padding: 8px 13px; font-size: 11.5px; font-weight: 700;
        cursor: pointer; transition: box-shadow 0.15s, transform 0.12s var(--spring);
        box-shadow: 0 5px 14px -4px rgba(168,85,247,0.5);
      }
      .review-secondary { background: var(--surface); color: var(--text2); border: 1px solid var(--border2); box-shadow: none; font-weight: 600; }
      .review-secondary:hover { color: var(--text); }
      .review-continue:hover { transform: translateY(-1px); box-shadow: var(--glow); }
      .review-continue:focus-visible, .review-secondary:focus-visible { outline: none; box-shadow: var(--focus); }
      .review-continue:active, .review-secondary:active { transform: scale(0.98); }
      .review-note { color: var(--text3); font-size: 11px; line-height: 1.45; margin-top: 8px; }

      /* ════════════════════════════════════════════════════════════════
         Toast — frosted pill
         ════════════════════════════════════════════════════════════════ */
      .toast {
        position: absolute; top: 70px; left: 50%; max-width: calc(100% - 32px);
        transform: translateX(-50%) translateY(-8px) scale(0.97);
        background: rgba(20, 18, 31, 0.92); color: #f4f2ff;
        backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
        border: 1px solid rgba(167,139,250,0.3);
        font-family: var(--font); font-size: 12px; font-weight: 500;
        padding: 9px 16px; border-radius: 999px;
        opacity: 0; transition: opacity 0.2s, transform 0.25s var(--spring);
        pointer-events: none; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        z-index: 20; box-shadow: 0 14px 32px -8px rgba(0,0,0,0.45), 0 0 18px -4px rgba(124,92,255,0.4);
      }
      .toast.show { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }

      /* Undo-Toast — Sicherheitsnetz mit klickbarem Button */
      .undo-toast {
        position: absolute; top: 70px; left: 50%; max-width: calc(100% - 32px);
        transform: translateX(-50%) translateY(-8px) scale(0.97);
        display: flex; align-items: center; gap: 12px;
        background: rgba(20, 18, 31, 0.94); color: #f4f2ff;
        backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
        border: 1px solid rgba(52, 211, 153, 0.38);
        font-family: var(--font); font-size: 12px; font-weight: 500;
        padding: 7px 7px 7px 16px; border-radius: 999px;
        opacity: 0; transition: opacity 0.2s, transform 0.25s var(--spring);
        pointer-events: none; white-space: nowrap; z-index: 21;
        box-shadow: 0 14px 32px -8px rgba(0,0,0,0.5), 0 0 18px -4px rgba(52,211,153,0.4);
      }
      .undo-toast.show { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); pointer-events: auto; }
      .undo-toast-btn {
        font-family: var(--font); font-size: 12px; font-weight: 700; cursor: pointer;
        color: #fff; border: none; border-radius: 999px; padding: 6px 15px;
        background: linear-gradient(135deg, #34d399, #10b981);
        box-shadow: 0 4px 12px -3px rgba(16,185,129,0.6);
        transition: transform 0.12s var(--spring), filter 0.12s;
      }
      .undo-toast-btn:hover { filter: brightness(1.08); transform: translateY(-1px); }
      .undo-toast-btn:active { transform: translateY(0) scale(0.97); }

      /* ════════════════════════════════════════════════════════════════
         Smart-Fill preview (agent preview table)
         ════════════════════════════════════════════════════════════════ */
      .sf-preview { display: flex; flex-direction: column; gap: 0; margin-top: 8px; border: 1px solid var(--border); border-radius: 13px; overflow: hidden; background: var(--surface); }
      .sf-section-title { font-size: 10px; font-weight: 800; color: var(--text3); text-transform: uppercase; letter-spacing: 0.7px; padding: 9px 10px 5px; background: var(--surface2); }
      .sf-row { display: flex; align-items: center; gap: 8px; padding: 9px 10px; border-top: 1px solid var(--border); background: var(--surface); transition: background 0.15s; }
      .sf-section-title + .sf-row, .sf-preview > .sf-row:first-child { border-top: none; }
      .sf-row:has(.sf-cb:checked) { background: var(--accent-l); }
      .sf-cb { width: 15px; height: 15px; accent-color: var(--accent); flex-shrink: 0; cursor: pointer; }
      .sf-label { font-size: 11px; color: var(--text3); font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 104px; flex-shrink: 0; }
      .sf-input { flex: 1; min-width: 0; font-size: 12.5px; font-family: var(--font); border: none; background: transparent; color: var(--text); outline: none; padding: 0; cursor: text; }
      .sf-input:focus { color: var(--accent); }
      .sf-input::placeholder { color: var(--text3); font-style: italic; font-size: 11.5px; }

      /* source accents */
      .sf-row[data-source="profile"]    { box-shadow: inset 3px 0 0 #10b981; }
      .sf-row[data-source="inferred"]   { box-shadow: inset 3px 0 0 #7c5cff; }
      .sf-row[data-source="suggestion"] { box-shadow: inset 3px 0 0 #f59e0b; }

      .source-badge {
        border: 1px solid var(--border); border-radius: 999px; padding: 2px 8px;
        font-size: 10px; font-weight: 700; line-height: 1.2; white-space: nowrap; flex-shrink: 0;
      }
      .source-badge.inferred   { background: var(--accent-l); border-color: var(--accent-b); color: var(--accent); }
      .source-badge.suggestion { background: var(--warn-l); border-color: rgba(180,83,9,0.3); color: var(--warn); }

      .preview-source-row { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 6px; }
      .psr-chip { display: inline-flex; align-items: center; gap: 3px; padding: 3px 8px; border-radius: 7px; font-size: 10px; font-weight: 700; border: 1px solid transparent; }
      .psr-profile    { background: var(--ok-l); color: var(--ok); border-color: rgba(5,150,105,0.25); }
      .psr-inferred   { background: var(--accent-l); color: var(--accent); border-color: var(--accent-b); }
      .psr-suggestion { background: var(--warn-l); color: var(--warn); border-color: rgba(180,83,9,0.25); }

      /* ════════════════════════════════════════════════════════════════
         Agent live status
         ════════════════════════════════════════════════════════════════ */
      .agent-actions { display: flex; gap: 7px; margin-top: 6px; flex-wrap: wrap; }
      .agent-confirm {
        background: var(--grad); color: #fff; border: none; border-radius: 10px;
        padding: 8px 15px; font-size: 12px; font-weight: 700; cursor: pointer;
        box-shadow: 0 5px 14px -4px rgba(168,85,247,0.5);
        transition: box-shadow 0.15s, transform 0.12s var(--spring);
      }
      .agent-confirm:hover { box-shadow: var(--glow); transform: translateY(-1px); }
      .agent-confirm:focus-visible { outline: none; box-shadow: var(--focus); }
      .agent-confirm:active { transform: scale(0.98); }
      .agent-cancel { background: var(--surface); color: var(--text2); border: 1px solid var(--border2); border-radius: 10px; padding: 8px 15px; font-size: 12px; font-weight: 500; cursor: pointer; transition: color 0.15s; }
      .agent-cancel:hover { color: var(--text); }
      .agent-cancel:focus-visible { outline: none; box-shadow: var(--focus); }
      .agent-select-all { background: transparent; color: var(--accent); border: none; font-size: 11px; cursor: pointer; padding: 0; margin-left: auto; text-decoration: underline; }

      .fa-spinner { display: inline-block; width: 10px; height: 10px; border: 2px solid var(--border2); border-top-color: var(--accent); border-radius: 50%; animation: fa-spin 0.65s linear infinite; flex-shrink: 0; }
      .live-row { display: flex; align-items: center; gap: 8px; font-size: 12.5px; min-width: 0; animation: msg-in 0.2s var(--spring); }
      .live-row-icon { flex-shrink: 0; width: 16px; text-align: center; font-style: normal; }
      .live-row-label { flex: 1; color: var(--text2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
      .live-row-value { color: var(--text); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 110px; flex-shrink: 0; }
      .live-summary { margin-top: 10px; padding-top: 8px; border-top: 1px solid var(--border); font-size: 11.5px; color: var(--text3); }

      /* ════════════════════════════════════════════════════════════════
         Guided question bubble
         ════════════════════════════════════════════════════════════════ */
      .guided-q { padding: 2px 0; }
      .gq-eyebrow {
        font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.9px; margin-bottom: 7px;
        display: flex; align-items: center; gap: 6px;
        background: var(--grad);
        -webkit-background-clip: text; background-clip: text;
        -webkit-text-fill-color: transparent; color: transparent;
      }
      .gq-eyebrow::before { content: ''; display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: var(--grad); flex-shrink: 0; }
      .gq-text { font-size: 13.5px; color: var(--text); font-weight: 500; line-height: 1.45; margin-bottom: 11px; }
      .gq-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 9px; }
      .gq-chip {
        padding: 8px 15px; border-radius: 999px;
        border: 1px solid var(--accent-b); background: var(--accent-l); color: var(--accent);
        font: 600 12px/1 var(--font); cursor: pointer;
        transition: background 0.13s, border-color 0.13s, color 0.13s, transform 0.13s var(--spring), box-shadow 0.15s;
      }
      .gq-chip:hover { border-color: var(--accent); transform: translateY(-1px); box-shadow: 0 6px 14px -5px rgba(124,92,255,0.4); }
      .gq-chip:active { transform: scale(0.96); }
      .gq-chip.gq-selected { background: var(--grad); color: #fff; border-color: transparent; cursor: default; box-shadow: 0 5px 14px -4px rgba(168,85,247,0.55); }
      .gq-hint { font-size: 10.5px; color: var(--text3); line-height: 1.45; }

      /* ════════════════════════════════════════════════════════════════
         Live check — deterministische Feld-Validierung (input-area)
         ════════════════════════════════════════════════════════════════ */
      .live-check {
        display: none; align-items: center; gap: 7px; margin-bottom: 7px;
        padding: 7px 10px; border-radius: 10px; font-size: 11.5px; font-weight: 600;
        min-width: 0; animation: msg-in 0.2s var(--spring);
      }
      .live-check.visible { display: flex; }
      .live-check.ok   { background: var(--ok-l);   color: var(--ok);   border: 1px solid var(--ok); }
      .live-check.warn { background: var(--warn-l); color: var(--warn); border: 1px solid var(--warn); }
      .live-check .lc-icon { flex-shrink: 0; font-style: normal; }
      .live-check .lc-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }

      /* ════════════════════════════════════════════════════════════════
         Document scan — Vision-OCR im Profil-Panel
         ════════════════════════════════════════════════════════════════ */
      .pf-scan { padding: 10px 18px 0; flex-shrink: 0; display: flex; flex-direction: column; gap: 8px; }
      .pf-scan-btn {
        display: flex; align-items: center; justify-content: center; gap: 7px;
        width: 100%; padding: 9px; border-radius: 10px; cursor: pointer;
        border: 1px dashed var(--accent-b); background: var(--accent-l); color: var(--accent);
        font: 600 11.5px/1 var(--font);
        transition: border-color 0.15s, transform 0.12s var(--spring), box-shadow 0.15s;
      }
      .pf-scan-btn svg { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; flex-shrink: 0; }
      .pf-scan-btn:hover { border-color: var(--accent); transform: translateY(-1px); box-shadow: 0 6px 14px -5px rgba(124,92,255,0.4); }
      .pf-scan-btn:focus-visible { outline: none; box-shadow: var(--focus); }
      .pf-scan-btn:disabled { opacity: 0.6; cursor: default; transform: none; box-shadow: none; }
      .pf-scan-confirm {
        display: none; flex-direction: column; gap: 8px; padding: 10px;
        border: 1px solid var(--border2); border-radius: 12px; background: var(--surface2);
        animation: msg-in 0.2s var(--spring);
      }
      .pf-scan-confirm.visible { display: flex; }
      .pf-scan-confirm img { max-height: 90px; max-width: 100%; border-radius: 8px; object-fit: cover; align-self: flex-start; border: 1px solid var(--border); }
      .pf-scan-note { font-size: 10.5px; color: var(--text3); line-height: 1.45; }
      .pf-scan-actions { display: flex; gap: 7px; }
      .pf-scan-go {
        flex: 1; padding: 7px 11px; border: none; border-radius: 8px; cursor: pointer;
        background: var(--grad); color: #fff; font: 700 11px/1 var(--font);
        box-shadow: 0 3px 10px -3px rgba(168,85,247,0.5);
        transition: transform 0.12s var(--spring), box-shadow 0.15s;
      }
      .pf-scan-go:hover { transform: translateY(-1px); box-shadow: var(--glow); }
      .pf-scan-go:focus-visible { outline: none; box-shadow: var(--focus); }
      .pf-scan-cancel {
        padding: 7px 11px; border: 1px solid var(--border2); border-radius: 8px; cursor: pointer;
        background: var(--surface); color: var(--text2); font: 600 11px/1 var(--font);
        transition: color 0.15s, border-color 0.15s;
      }
      .pf-scan-cancel:hover { color: var(--text); border-color: var(--text3); }
      .pf input.pf-scanned { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-l); }

      /* ════════════════════════════════════════════════════════════════
         Responsive
         ════════════════════════════════════════════════════════════════ */
      @media (max-width: 440px) {
        .trigger { right: 16px; bottom: 16px; }
        .sidebar { top: 8px; right: 8px; bottom: 8px; width: calc(100vw - 16px); min-width: 0; border-radius: 20px; }
        .header { padding-left: 14px; padding-right: 10px; gap: 8px; }
        .logo-icon { width: 30px; height: 30px; }
        .header-btns { gap: 2px; }
        .icon-btn { width: 28px; height: 28px; }
        .action-panel { padding-left: 14px; padding-right: 14px; }
        .messages, .profile-grid { padding-left: 14px; padding-right: 14px; }
        .input-area, .profile-actions { padding-left: 14px; padding-right: 14px; }
        .profile-hdr { padding-left: 14px; padding-right: 14px; }
      }

      /* ── Accessibility: respect reduced-motion ── */
      @media (prefers-reduced-motion: reduce) {
        .sidebar::before, .trigger::after, .re-icon::after, .logo-name,
        .action-panel::before, .action-panel::after, .gp-bar,
        .trigger, .re-icon, .msg.ai::before, .typing-row::before, .trust-dot { animation: none !important; }
      }
`;

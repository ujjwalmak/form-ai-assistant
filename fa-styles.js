'use strict';
const FA_CSS = `
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

      /* ════════════════════════════════════════════════════════════════
         Design tokens — modern indigo/violet system
         ════════════════════════════════════════════════════════════════ */
      :host {
        --bg:        #f4f5fa;
        --surface:   #ffffff;
        --surface2:  #f1f3f9;
        --surface3:  #e8ebf6;
        --glass:     rgba(255, 255, 255, 0.86);
        --border:    rgba(15, 23, 42, 0.08);
        --border2:   rgba(15, 23, 42, 0.18);
        --text:      #0f172a;
        --text2:     #334155;
        --text3:     #64748b;
        --accent:    #6366f1;
        --accent-h:  #4f46e5;
        --accent-l:  #eef2ff;
        --accent-b:  #c7d2fe;
        --grad:      linear-gradient(135deg, #6366f1 0%, #8b5cf6 60%, #a855f7 100%);
        --grad-soft: linear-gradient(135deg, rgba(99,102,241,0.12), rgba(168,85,247,0.10));
        --danger:    #dc2626;
        --danger-l:  #fef2f2;
        --ok:        #059669;
        --ok-l:      #ecfdf5;
        --warn:      #b45309;
        --warn-l:    #fffbeb;
        --focus:     0 0 0 3px rgba(99, 102, 241, 0.28);
        --glow:      0 8px 28px -6px rgba(99, 102, 241, 0.5);
        --shadow:    0 32px 80px -20px rgba(15, 23, 42, 0.25), 0 8px 24px -8px rgba(15, 23, 42, 0.12);
        --shadow-sm: 0 1px 2px rgba(15, 23, 42, 0.05), 0 4px 12px -4px rgba(15, 23, 42, 0.08);
        --state:     rgba(99, 102, 241, 0.09);
        --state-strong: rgba(99, 102, 241, 0.16);
        --state-on-primary: rgba(255, 255, 255, 0.18);
        --font:      'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        --ease:      cubic-bezier(0.4, 0, 0.2, 1);
        --spring:    cubic-bezier(0.32, 0.72, 0, 1);
      }
      :host(.dark) {
        --bg:        #0b0d13;
        --surface:   #131620;
        --surface2:  #1a1e2b;
        --surface3:  #232839;
        --glass:     rgba(19, 22, 32, 0.88);
        --border:    rgba(148, 163, 184, 0.12);
        --border2:   rgba(148, 163, 184, 0.28);
        --text:      #f1f5f9;
        --text2:     #cbd5e1;
        --text3:     #8b95a8;
        --accent:    #818cf8;
        --accent-h:  #a5b4fc;
        --accent-l:  rgba(99, 102, 241, 0.16);
        --accent-b:  rgba(129, 140, 248, 0.42);
        --grad:      linear-gradient(135deg, #6366f1 0%, #8b5cf6 60%, #a855f7 100%);
        --grad-soft: linear-gradient(135deg, rgba(99,102,241,0.2), rgba(168,85,247,0.14));
        --danger:    #f87171;
        --danger-l:  rgba(220, 38, 38, 0.14);
        --ok:        #34d399;
        --ok-l:      rgba(5, 150, 105, 0.16);
        --warn:      #fbbf24;
        --warn-l:    rgba(180, 83, 9, 0.16);
        --focus:     0 0 0 3px rgba(129, 140, 248, 0.35);
        --glow:      0 8px 28px -6px rgba(99, 102, 241, 0.55);
        --shadow:    0 32px 80px -16px rgba(0, 0, 0, 0.6), 0 8px 24px -8px rgba(0, 0, 0, 0.4);
        --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3), 0 4px 12px -4px rgba(0, 0, 0, 0.25);
        --state:     rgba(129, 140, 248, 0.12);
        --state-strong: rgba(129, 140, 248, 0.2);
        --state-on-primary: rgba(255, 255, 255, 0.16);
      }

      /* ── Interaction layer for all buttons ── */
      button { -webkit-tap-highlight-color: transparent; font-family: var(--font); }
      button:not(:disabled) { position: relative; overflow: hidden; }
      button:not(:disabled)::before {
        content: '';
        position: absolute; inset: 0;
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
      .review-continue::before, .autofill-btn::before { background: var(--state-on-primary); }

      /* ════════════════════════════════════════════════════════════════
         Trigger — floating launcher with field-count badge
         ════════════════════════════════════════════════════════════════ */
      @keyframes trigger-glow {
        0%, 100% { box-shadow: 0 10px 30px -8px rgba(99,102,241,0.55), 0 0 0 0 rgba(99,102,241,0.25); }
        50%      { box-shadow: 0 12px 36px -6px rgba(99,102,241,0.65), 0 0 0 10px rgba(99,102,241,0); }
      }
      button.trigger {
        position: fixed; bottom: 26px; right: 26px; width: 56px; height: 56px;
        background: var(--grad);
        border: none; border-radius: 18px; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        pointer-events: all; z-index: 2;
        animation: trigger-glow 3s ease-in-out infinite;
        transition: transform 0.18s var(--spring), opacity 0.2s, border-radius 0.18s;
      }
      .trigger:hover  { transform: translateY(-3px) scale(1.05); border-radius: 22px; animation: none; box-shadow: var(--glow), 0 0 0 6px rgba(99,102,241,0.14); }
      .trigger:active { transform: translateY(-1px) scale(0.97); animation: none; }
      .trigger:focus-visible { outline: none; box-shadow: var(--focus), var(--glow); animation: none; }
      .trigger svg    { width: 24px; height: 24px; stroke: #fff; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; fill: none; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.2)); }
      .trigger-badge {
        position: absolute; top: -6px; right: -6px; z-index: 2;
        min-width: 21px; height: 21px; padding: 0 5px;
        background: #0f172a; color: #fff;
        border: 2px solid #fff; border-radius: 999px;
        font: 700 10.5px/1 var(--font);
        display: flex; align-items: center; justify-content: center;
      }
      :host(.dark) .trigger-badge { background: #f1f5f9; color: #0f172a; border-color: #131620; }

      /* ════════════════════════════════════════════════════════════════
         Sidebar — floating glass panel
         ════════════════════════════════════════════════════════════════ */
      .sidebar {
        position: fixed; top: 14px; right: 14px; bottom: 14px;
        width: 416px; min-width: 330px;
        background: var(--glass);
        backdrop-filter: blur(24px) saturate(1.5);
        -webkit-backdrop-filter: blur(24px) saturate(1.5);
        border: 1px solid var(--border);
        border-radius: 24px;
        box-shadow: var(--shadow);
        display: flex; flex-direction: column;
        font-family: var(--font); pointer-events: all; z-index: 2;
        transform: translateX(calc(100% + 32px));
        transition: transform 0.34s var(--spring);
        user-select: none;
        overflow: hidden;
      }
      .sidebar.open       { transform: translateX(0); }
      .sidebar.floating   { border-radius: 24px; }
      .sidebar.no-animate { transition: none !important; }

      /* ── Resize handles ── */
      .resize-handle { position: absolute; z-index: 10; }
      .resize-n, .resize-s { left: 18px; right: 18px; height: 8px; cursor: ns-resize; }
      .resize-n { top: 0; }
      .resize-s { bottom: 0; }
      .resize-e, .resize-w { top: 18px; bottom: 18px; width: 8px; cursor: ew-resize; }
      .resize-e { right: 0; }
      .resize-w { left: 0; }
      .resize-ne, .resize-nw, .resize-se, .resize-sw { width: 20px; height: 20px; z-index: 11; }
      .resize-ne { top: 0; right: 0; cursor: nesw-resize; }
      .resize-nw { top: 0; left: 0; cursor: nwse-resize; }
      .resize-se { bottom: 0; right: 0; cursor: nwse-resize; }
      .resize-sw { bottom: 0; left: 0; cursor: nesw-resize; }
      .resize-n::after, .resize-s::after, .resize-e::after, .resize-w::after {
        content: ''; position: absolute; border-radius: 999px; background: var(--border2);
        opacity: 0; transition: opacity 0.16s;
      }
      .resize-n::after, .resize-s::after { left: 50%; transform: translateX(-50%); width: 44px; height: 3px; }
      .resize-n::after { top: 3px; }
      .resize-s::after { bottom: 3px; }
      .resize-e::after, .resize-w::after { top: 50%; transform: translateY(-50%); width: 3px; height: 44px; }
      .resize-e::after { right: 3px; }
      .resize-w::after { left: 3px; }
      .resize-handle:hover::after { opacity: 0.9; }

      /* ════════════════════════════════════════════════════════════════
         Header
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
        width: 36px; height: 36px;
        background: var(--grad); color: #fff;
        border: none; border-radius: 12px;
        display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        box-shadow: 0 4px 12px -3px rgba(99,102,241,0.45);
      }
      .logo-icon svg { width: 18px; height: 18px; stroke: #fff; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; fill: none; }
      .logo-text  { display: flex; flex-direction: column; gap: 1px; min-width: 0; overflow: hidden; }
      .logo-name  { font-size: 14.5px; font-weight: 700; color: var(--text); letter-spacing: -0.01em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .logo-sub   { font-size: 11px; color: var(--text3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .header-btns { display: flex; gap: 3px; flex-shrink: 0; }
      .icon-btn {
        width: 32px; height: 32px; border: 1px solid transparent; background: transparent;
        cursor: pointer; border-radius: 10px;
        display: flex; align-items: center; justify-content: center; color: var(--text3);
        transition: color 0.15s, border-color 0.15s, background 0.15s;
      }
      .icon-btn:hover  { color: var(--text); }
      .icon-btn:focus-visible { outline: none; box-shadow: var(--focus); color: var(--accent); }
      .icon-btn.active { background: var(--accent-l); color: var(--accent); border-color: var(--accent-b); }
      .icon-btn svg { width: 15px; height: 15px; stroke: currentColor; stroke-width: 2.1; stroke-linecap: round; fill: none; }

      /* ════════════════════════════════════════════════════════════════
         Action panel
         ════════════════════════════════════════════════════════════════ */
      .action-panel {
        padding: 16px 16px 14px;
        border-bottom: 1px solid var(--border);
        flex-shrink: 0;
        background: var(--grad-soft);
      }
      @keyframes ap-shine {
        0%   { transform: translateX(-130%) skewX(-18deg); }
        100% { transform: translateX(330%) skewX(-18deg); }
      }
      .ap-primary {
        width: 100%; height: 48px;
        background: var(--grad);
        color: #fff; border: none; border-radius: 14px;
        font: 600 14px/1 var(--font); letter-spacing: -0.01em; cursor: pointer;
        display: flex; align-items: center; justify-content: center; gap: 9px;
        box-shadow: 0 2px 6px -2px rgba(99,102,241,0.4), 0 10px 26px -8px rgba(99,102,241,0.55), inset 0 1px 0 rgba(255,255,255,0.18);
        transition: transform 0.15s var(--spring), box-shadow 0.2s, opacity 0.15s;
      }
      .ap-primary::after {
        content: '';
        position: absolute; top: 0; bottom: 0; width: 36%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.28), transparent);
        animation: ap-shine 3.4s var(--ease) infinite;
        pointer-events: none;
      }
      .ap-primary:disabled::after { display: none; }
      .ap-primary svg { width: 17px; height: 17px; stroke: #fff; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; fill: none; }
      .ap-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 10px -2px rgba(99,102,241,0.45), 0 14px 32px -8px rgba(99,102,241,0.6), inset 0 1px 0 rgba(255,255,255,0.18); }
      .ap-primary:active { transform: translateY(0) scale(0.985); }
      .ap-primary:focus-visible { outline: none; box-shadow: var(--focus), var(--glow); }
      .ap-primary:disabled { opacity: 0.4; cursor: not-allowed; transform: none; box-shadow: none; }

      .ap-chips { display: flex; gap: 8px; margin-top: 10px; }
      .ap-chip {
        flex: 1; height: 34px;
        border: 1px solid var(--border2); background: var(--surface);
        color: var(--text2); border-radius: 10px;
        font: 600 12px/1 var(--font); cursor: pointer;
        display: flex; align-items: center; justify-content: center; gap: 6px;
        transition: color 0.15s, border-color 0.15s, background 0.15s, box-shadow 0.15s, transform 0.1s;
        white-space: nowrap; flex-shrink: 0;
      }
      .ap-chip svg { width: 13px; height: 13px; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; fill: none; flex-shrink: 0; }
      .ap-chip:hover, .ap-chip.open { border-color: var(--accent-b); background: var(--accent-l); color: var(--accent); }
      .ap-chip:active { transform: scale(0.97); }
      .ap-chip:focus-visible { outline: none; box-shadow: var(--focus); }

      .ap-field-list { overflow: hidden; max-height: 0; transition: max-height 0.3s var(--spring), padding-top 0.2s; }
      .ap-field-list.open { max-height: 230px; padding-top: 10px; }
      .ap-field-list .field-list { max-height: 220px; margin-top: 0; }

      .ap-mode-select-row { display: flex; flex-direction: column; gap: 6px; margin-top: 10px; }
      .ap-select {
        width: 100%; height: 34px;
        border: 1px solid var(--border2); border-radius: 10px;
        background: var(--surface); color: var(--text2);
        font: 500 12px/1 var(--font); padding: 0 10px; outline: none; cursor: pointer;
        transition: border-color 0.15s, box-shadow 0.15s;
      }
      .ap-select:focus-visible { border-color: var(--accent); box-shadow: var(--focus); }

      .ap-mode-row {
        display: flex; align-items: center; justify-content: space-between;
        margin-top: 9px; padding: 9px 11px;
        border: 1px solid var(--border); border-radius: 10px;
        background: var(--surface);
      }
      .ap-mode-label { font-size: 11.5px; color: var(--text2); font-weight: 500; }
      .ap-toggle { position: relative; display: inline-flex; align-items: center; width: 38px; height: 21px; flex-shrink: 0; cursor: pointer; }
      .ap-toggle input { opacity: 0; width: 0; height: 0; position: absolute; }
      .ap-toggle-track { position: absolute; inset: 0; border-radius: 999px; background: var(--border2); transition: background 0.2s; }
      .ap-toggle input:checked ~ .ap-toggle-track { background: var(--accent); }
      .ap-toggle-thumb { position: absolute; top: 3px; left: 3px; width: 15px; height: 15px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.25); transition: transform 0.2s var(--spring); }
      .ap-toggle input:checked ~ .ap-toggle-thumb { transform: translateX(17px); }

      .trust-row {
        display: flex; align-items: center; gap: 8px;
        margin-top: 10px; padding: 8px 11px;
        border-radius: 10px; background: var(--surface);
        border: 1px solid var(--border);
        color: var(--text3); font: 500 11px/1.35 var(--font);
      }
      .trust-dot {
        width: 7px; height: 7px; border-radius: 50%;
        background: var(--ok); box-shadow: 0 0 0 3px var(--ok-l);
        flex-shrink: 0;
      }

      /* ── Guided progress ── */
      .guided-progress { margin-top: 10px; }
      .gp-bar-wrap { height: 5px; background: var(--surface3); border-radius: 999px; overflow: hidden; margin-bottom: 6px; }
      .gp-bar {
        height: 100%; border-radius: 999px;
        background: var(--grad);
        background-size: 200% 100%;
        animation: gp-flow 2.2s linear infinite;
        transition: width 0.45s var(--spring);
      }
      @keyframes gp-flow { 0% { background-position: 0% 0; } 100% { background-position: 200% 0; } }
      .gp-label { font-size: 11px; color: var(--text2); font-weight: 500; }

      /* ════════════════════════════════════════════════════════════════
         Messages
         ════════════════════════════════════════════════════════════════ */
      .messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 10px; scroll-behavior: smooth; transition: opacity 0.15s; }
      .messages::-webkit-scrollbar { width: 5px; }
      .messages::-webkit-scrollbar-track { background: transparent; }
      .messages::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 999px; }

      .results-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px 28px; text-align: center; pointer-events: none; }
      @keyframes re-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
      .re-icon {
        width: 58px; height: 58px; border-radius: 18px;
        background: var(--grad-soft);
        border: 1px solid var(--accent-b);
        display: flex; align-items: center; justify-content: center; margin-bottom: 18px;
        animation: re-float 4.5s ease-in-out infinite;
      }
      .re-icon svg { width: 27px; height: 27px; stroke: var(--accent); stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; fill: none; }
      .re-title { font-size: 15px; font-weight: 700; color: var(--text); margin-bottom: 5px; line-height: 1.3; letter-spacing: -0.01em; }
      .re-sub { font-size: 11px; color: var(--text3); margin-bottom: 14px; }
      .re-hint { font-size: 12px; color: var(--text2); line-height: 1.6; max-width: 240px; }

      .msg { display: flex; align-items: flex-end; animation: msg-in 0.26s var(--spring); }
      @keyframes msg-in { from { opacity: 0; transform: translateY(12px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
      .msg.ai   { justify-content: flex-start; }
      .msg.user { justify-content: flex-start; }
      .bubble {
        max-width: 100%; padding: 11px 14px;
        font-size: 13px; line-height: 1.55; color: var(--text);
        font-family: var(--font); overflow-wrap: anywhere;
      }
      .msg.ai .bubble {
        background: var(--surface); border: 1px solid var(--border);
        border-radius: 14px; box-shadow: var(--shadow-sm);
      }
      .msg.user .bubble {
        background: var(--accent-l); border: 1px solid var(--accent-b);
        border-radius: 12px; padding: 6px 12px;
        color: var(--text2); font-size: 12px; line-height: 1.45;
      }
      .bubble code { background: var(--surface2); border: 1px solid var(--border); border-radius: 5px; padding: 1px 5px; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 0.9em; }
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

      /* ── Field list ── */
      .field-list { display: flex; flex-direction: column; gap: 5px; margin-top: 10px; max-height: 190px; overflow-y: auto; padding-right: 2px; }
      .field-list::-webkit-scrollbar { width: 4px; }
      .field-list::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 999px; }
      .field-btn {
        width: 100%; min-height: 32px;
        background: var(--surface); border: 1px solid var(--border); color: var(--text2);
        padding: 6px 10px; border-radius: 10px; font-size: 12px; cursor: pointer;
        text-align: left; display: flex; align-items: center; gap: 7px;
        transition: color 0.15s, border-color 0.15s, box-shadow 0.15s, transform 0.1s;
      }
      .field-btn:hover { color: var(--accent); border-color: var(--accent-b); transform: translateX(2px); }
      .field-btn:focus-visible { outline: none; box-shadow: var(--focus); border-color: var(--accent-b); }
      .field-btn-label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
      .field-btn .req { color: var(--danger); background: var(--danger-l); border: 1px solid rgba(220,38,38,0.2); border-radius: 6px; font-size: 9.5px; font-weight: 600; line-height: 1; padding: 3px 5px; margin-left: auto; flex-shrink: 0; }
      .field-type-tag { font-size: 10px; color: var(--text3); background: var(--surface2); border: 1px solid var(--border); padding: 2px 6px; border-radius: 6px; flex-shrink: 0; max-width: 78px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

      /* ── Chips ── */
      .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
      .chip  {
        max-width: 100%; background: var(--surface); border: 1px solid var(--border2); color: var(--text2);
        padding: 6px 11px; border-radius: 999px; font-size: 11.5px; font-weight: 500; cursor: pointer;
        transition: border-color 0.15s, color 0.15s, background 0.15s, transform 0.1s;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .chip:hover { border-color: var(--accent-b); color: var(--accent); background: var(--accent-l); }
      .chip:active { transform: scale(0.96); }
      .chip:focus-visible { outline: none; box-shadow: var(--focus); }

      /* ── Typing ── */
      .typing-row    { display: flex; gap: 9px; align-items: flex-end; }
      .typing-bubble { background: var(--surface); border: 1px solid var(--border); border-radius: 14px 14px 14px 5px; padding: 13px 16px; display: flex; align-items: center; gap: 5px; box-shadow: var(--shadow-sm); }
      .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--accent); animation: fa-pulse 1.3s ease-in-out infinite; }
      @keyframes fa-pulse { 0%,100% { opacity: 0.3; transform: scale(0.75); } 50% { opacity: 1; transform: scale(1.15); } }

      /* ════════════════════════════════════════════════════════════════
         Input area
         ════════════════════════════════════════════════════════════════ */
      .input-area  { padding: 12px 16px 13px; border-top: 1px solid var(--border); flex-shrink: 0; }
      .field-tag   { font-size: 11.5px; color: var(--text3); margin-bottom: 7px; display: none; align-items: center; gap: 6px; min-width: 0; }
      .field-tag.visible { display: flex; }
      .field-tag .dot-ind { width: 6px; height: 6px; background: var(--accent); border-radius: 50%; flex-shrink: 0; animation: blink 2s ease-in-out infinite; }
      @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }
      .field-tag span { font-weight: 600; color: var(--accent); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
      .input-row  { display: flex; gap: 8px; align-items: flex-end; }
      .input-box  {
        flex: 1; min-width: 0; font-family: var(--font); font-size: 13px;
        padding: 11px 14px; border: 1px solid var(--border2); border-radius: 13px;
        background: var(--surface); color: var(--text); resize: none; outline: none;
        min-height: 42px; max-height: 112px; line-height: 1.45;
        transition: border-color 0.15s, box-shadow 0.15s;
      }
      .input-box:focus { border-color: var(--accent); box-shadow: var(--focus); }
      .input-box::placeholder { color: var(--text3); }
      .send-btn {
        width: 42px; height: 42px;
        background: var(--grad); border: none; border-radius: 13px; cursor: pointer;
        display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        box-shadow: 0 4px 14px -4px rgba(99,102,241,0.5);
        transition: transform 0.13s var(--spring), box-shadow 0.15s;
      }
      .send-btn:hover  { transform: translateY(-1px) scale(1.04); box-shadow: var(--glow); }
      .send-btn:focus-visible { outline: none; box-shadow: var(--focus), var(--glow); }
      .send-btn:active { transform: scale(0.94); }
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
        background: var(--accent-l); border: 1px solid var(--accent-b); border-radius: 10px;
        padding: 8px 10px; font-size: 11.5px; color: var(--text2); min-width: 0;
        animation: msg-in 0.22s var(--spring);
      }
      .autofill-tip.visible { display: flex; }
      .autofill-tip strong { color: var(--text); font-weight: 600; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .autofill-btn { background: var(--accent); color: #fff; border: none; border-radius: 8px; padding: 5px 10px; font-size: 11px; font-weight: 600; cursor: pointer; white-space: nowrap; flex-shrink: 0; transition: background 0.15s; }
      .autofill-btn:hover { background: var(--accent-h); }
      .autofill-btn:focus-visible { outline: none; box-shadow: var(--focus); }

      /* ════════════════════════════════════════════════════════════════
         Profile panel
         ════════════════════════════════════════════════════════════════ */
      @keyframes panel-in { from { opacity: 0; transform: translateX(18px); } to { opacity: 1; transform: translateX(0); } }
      .profile-panel { display: none; flex-direction: column; flex: 1; overflow: hidden; }
      .profile-panel.visible { display: flex; animation: panel-in 0.24s var(--spring) forwards; }
      .profile-hdr {
        padding: 11px 18px; border-bottom: 1px solid var(--border);
        font-size: 12px; font-weight: 700; color: var(--text); flex-shrink: 0;
        display: flex; justify-content: space-between; align-items: center; gap: 10px; min-width: 0;
      }
      .profile-hdr span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .profile-hdr span:last-child { font-weight: 400; color: var(--text3); font-size: 10.5px; flex-shrink: 0; max-width: 52%; }
      .profile-grid { flex: 1; overflow-y: auto; padding: 14px 18px; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 10px; }
      .profile-grid::-webkit-scrollbar { width: 5px; }
      .profile-grid::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 999px; }
      .pf { display: flex; flex-direction: column; gap: 4px; }
      .pf.full { grid-column: 1 / -1; }
      .pf label { font-size: 10.5px; color: var(--text3); font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .pf input {
        width: 100%; min-width: 0; font-family: var(--font); font-size: 12.5px;
        padding: 8px 11px; border: 1px solid var(--border); border-radius: 9px;
        background: var(--surface); color: var(--text); outline: none;
        transition: border-color 0.15s, box-shadow 0.15s;
      }
      .pf input:focus { border-color: var(--accent); box-shadow: var(--focus); }
      .profile-actions {
        padding: 10px 18px; border-top: 1px solid var(--border);
        display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px; flex-shrink: 0;
      }
      .profile-actions button {
        min-width: 0; padding: 8px; border-radius: 9px; font-size: 11.5px; font-weight: 600;
        cursor: pointer; border: 1px solid var(--border2); background: var(--surface); color: var(--text2);
        transition: color 0.15s, border-color 0.15s, background 0.15s;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .profile-actions button:hover { color: var(--text); border-color: var(--text3); }
      .profile-actions button:focus-visible { outline: none; box-shadow: var(--focus); border-color: var(--accent-b); }
      .profile-actions .btn-primary { background: var(--grad); color: #fff; border-color: transparent; box-shadow: 0 4px 12px -4px rgba(99,102,241,0.45); }
      .profile-actions .btn-danger { color: var(--danger); border-color: var(--danger); }
      .profile-actions .btn-danger:hover { background: var(--danger-l); color: var(--danger); }
      .profile-actions .btn-io { color: var(--accent); border-color: var(--accent-b); background: var(--accent-l); }

      /* ── Profile switcher ── */
      .pf-switcher { display: flex; align-items: center; gap: 6px; padding: 10px 18px 0; flex-shrink: 0; }
      .pf-select {
        flex: 1; min-width: 0; height: 32px;
        border: 1px solid var(--border2); border-radius: 9px;
        background: var(--surface); color: var(--text);
        font: 500 12px/1 var(--font); padding: 0 8px; cursor: pointer; appearance: auto;
      }
      .pf-select:focus { outline: none; border-color: var(--accent-b); box-shadow: var(--focus); }
      .pf-sw-btn {
        width: 28px; height: 28px; border-radius: 8px;
        border: 1px solid var(--border2); background: var(--surface); color: var(--text2);
        font-size: 15px; line-height: 1; cursor: pointer;
        display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        transition: color 0.13s, border-color 0.13s, background 0.13s;
      }
      .pf-sw-btn:hover { color: var(--accent); border-color: var(--accent-b); background: var(--accent-l); }
      .pf-sw-btn.danger:hover { color: var(--danger); border-color: var(--danger); background: var(--danger-l); }

      .pf-extras-hdr { grid-column: 1 / -1; font-size: 10px; font-weight: 700; color: var(--text3); text-transform: uppercase; letter-spacing: 0.7px; padding-top: 10px; margin-top: 2px; border-top: 1px solid var(--border); }
      .pf-extras-empty { grid-column: 1 / -1; font-size: 11.5px; color: var(--text3); font-style: italic; }
      .pf-extra-row { display: flex; gap: 6px; align-items: center; }
      .pf-extra-row input {
        flex: 1; min-width: 0; font-family: var(--font); font-size: 12.5px;
        padding: 8px 11px; border: 1px solid var(--border); border-radius: 9px;
        background: var(--surface); color: var(--text); outline: none;
        transition: border-color 0.15s, box-shadow 0.15s;
      }
      .pf-extra-row input:focus { border-color: var(--accent); box-shadow: var(--focus); }
      .pf-del { background: transparent; border: 1px solid transparent; color: var(--text3); cursor: pointer; padding: 4px 8px; border-radius: 7px; font-size: 14px; line-height: 1; flex-shrink: 0; transition: color 0.15s, background 0.15s, border-color 0.15s; }
      .pf-del:hover { color: var(--danger); background: var(--danger-l); border-color: rgba(220,38,38,0.2); }

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
        border: 1px solid var(--border); border-radius: 13px; background: var(--surface);
        cursor: pointer; transition: border-color 0.15s, background 0.15s, transform 0.12s;
      }
      .history-entry:hover { border-color: var(--accent-b); background: var(--accent-l); transform: translateX(2px); }
      .history-icon { width: 34px; height: 34px; border-radius: 10px; background: var(--grad-soft); border: 1px solid var(--accent-b); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
      .history-icon svg { width: 16px; height: 16px; stroke: var(--accent); stroke-width: 2; fill: none; stroke-linecap: round; stroke-linejoin: round; }
      .history-info { flex: 1; min-width: 0; }
      .history-domain { font-size: 12.5px; font-weight: 600; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .history-meta { font-size: 11px; color: var(--text3); margin-top: 2px; }
      .history-empty { padding: 40px 20px; text-align: center; color: var(--text3); font-size: 12.5px; line-height: 1.6; }
      .history-clear { font-size: 11px; color: var(--danger); background: none; border: none; cursor: pointer; padding: 0; }
      .history-clear:hover { text-decoration: underline; }

      /* ════════════════════════════════════════════════════════════════
         Review / status
         ════════════════════════════════════════════════════════════════ */
      .review-status { display: inline-flex; align-items: center; gap: 5px; margin-bottom: 8px; padding: 4px 9px; border-radius: 999px; font-size: 10.5px; font-weight: 700; border: 1px solid var(--border); color: var(--text2); background: var(--surface2); }
      .review-status.ok      { color: var(--ok); background: var(--ok-l); border-color: rgba(5,150,105,0.3); }
      .review-status.warn    { color: var(--warn); background: var(--warn-l); border-color: rgba(180,83,9,0.3); }
      .review-status.missing { color: var(--danger); background: var(--danger-l); border-color: rgba(220,38,38,0.25); }
      .review-actions { display: flex; gap: 7px; margin-top: 10px; flex-wrap: wrap; }
      .review-continue, .review-secondary {
        border: none; background: var(--grad); color: #fff;
        border-radius: 9px; padding: 8px 12px; font-size: 11.5px; font-weight: 600;
        cursor: pointer; transition: box-shadow 0.15s, transform 0.1s;
        box-shadow: 0 4px 12px -4px rgba(99,102,241,0.4);
      }
      .review-secondary { background: var(--surface); color: var(--text2); border: 1px solid var(--border2); box-shadow: none; }
      .review-secondary:hover { color: var(--text); }
      .review-continue:focus-visible, .review-secondary:focus-visible { outline: none; box-shadow: var(--focus); }
      .review-continue:active, .review-secondary:active { transform: scale(0.98); }
      .review-note { color: var(--text3); font-size: 11px; line-height: 1.45; margin-top: 8px; }

      /* ════════════════════════════════════════════════════════════════
         Toast
         ════════════════════════════════════════════════════════════════ */
      .toast {
        position: absolute; top: 70px; left: 50%; max-width: calc(100% - 32px);
        transform: translateX(-50%) translateY(-8px);
        background: var(--text); color: var(--bg);
        font-family: var(--font); font-size: 12px; font-weight: 500;
        padding: 8px 14px; border-radius: 10px;
        opacity: 0; transition: opacity 0.2s, transform 0.2s var(--spring);
        pointer-events: none; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        z-index: 20; box-shadow: 0 12px 28px -6px rgba(15,23,42,0.3);
      }
      .toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }

      /* ════════════════════════════════════════════════════════════════
         Smart-Fill preview (agent preview table)
         ════════════════════════════════════════════════════════════════ */
      .sf-preview { display: flex; flex-direction: column; gap: 0; margin-top: 8px; border: 1px solid var(--border); border-radius: 12px; overflow: hidden; background: var(--surface); }
      .sf-section-title { font-size: 10px; font-weight: 700; color: var(--text3); text-transform: uppercase; letter-spacing: 0.6px; padding: 9px 10px 5px; background: var(--surface2); }
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
      .sf-row[data-source="inferred"]   { box-shadow: inset 3px 0 0 #6366f1; }
      .sf-row[data-source="suggestion"] { box-shadow: inset 3px 0 0 #f59e0b; }

      .source-badge {
        border: 1px solid var(--border); border-radius: 999px; padding: 2px 8px;
        font-size: 10px; font-weight: 700; line-height: 1.2; white-space: nowrap; flex-shrink: 0;
      }
      .source-badge.inferred   { background: var(--accent-l); border-color: var(--accent-b); color: var(--accent); }
      .source-badge.suggestion { background: var(--warn-l); border-color: rgba(180,83,9,0.3); color: var(--warn); }

      .preview-source-row { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 6px; }
      .psr-chip { display: inline-flex; align-items: center; gap: 3px; padding: 3px 8px; border-radius: 7px; font-size: 10px; font-weight: 600; border: 1px solid transparent; }
      .psr-profile    { background: var(--ok-l); color: var(--ok); border-color: rgba(5,150,105,0.25); }
      .psr-inferred   { background: var(--accent-l); color: var(--accent); border-color: var(--accent-b); }
      .psr-suggestion { background: var(--warn-l); color: var(--warn); border-color: rgba(180,83,9,0.25); }

      /* ════════════════════════════════════════════════════════════════
         Agent live status
         ════════════════════════════════════════════════════════════════ */
      .agent-actions { display: flex; gap: 7px; margin-top: 6px; flex-wrap: wrap; }
      .agent-confirm {
        background: var(--grad); color: #fff; border: none; border-radius: 9px;
        padding: 8px 14px; font-size: 12px; font-weight: 600; cursor: pointer;
        box-shadow: 0 4px 12px -4px rgba(99,102,241,0.4);
        transition: box-shadow 0.15s, transform 0.1s;
      }
      .agent-confirm:hover { box-shadow: var(--glow); }
      .agent-confirm:focus-visible { outline: none; box-shadow: var(--focus); }
      .agent-confirm:active { transform: scale(0.98); }
      .agent-cancel { background: var(--surface); color: var(--text2); border: 1px solid var(--border2); border-radius: 9px; padding: 8px 14px; font-size: 12px; font-weight: 500; cursor: pointer; transition: color 0.15s; }
      .agent-cancel:hover { color: var(--text); }
      .agent-cancel:focus-visible { outline: none; box-shadow: var(--focus); }
      .agent-select-all { background: transparent; color: var(--accent); border: none; font-size: 11px; cursor: pointer; padding: 0; margin-left: auto; text-decoration: underline; }

      @keyframes fa-spin { to { transform: rotate(360deg); } }
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
      .gq-eyebrow { font-size: 10px; font-weight: 700; color: var(--accent); text-transform: uppercase; letter-spacing: 0.7px; margin-bottom: 7px; display: flex; align-items: center; gap: 6px; }
      .gq-eyebrow::before { content: ''; display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: var(--grad); flex-shrink: 0; }
      .gq-text { font-size: 13.5px; color: var(--text); font-weight: 500; line-height: 1.45; margin-bottom: 11px; }
      .gq-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 9px; }
      .gq-chip {
        padding: 7px 14px; border-radius: 999px;
        border: 1px solid var(--accent-b); background: var(--accent-l); color: var(--accent);
        font: 600 12px/1 var(--font); cursor: pointer;
        transition: background 0.13s, border-color 0.13s, color 0.13s, transform 0.1s;
      }
      .gq-chip:hover { border-color: var(--accent); }
      .gq-chip:active { transform: scale(0.96); }
      .gq-chip.gq-selected { background: var(--grad); color: #fff; border-color: transparent; cursor: default; }
      .gq-hint { font-size: 10.5px; color: var(--text3); line-height: 1.45; }

      /* ════════════════════════════════════════════════════════════════
         Responsive
         ════════════════════════════════════════════════════════════════ */
      @media (max-width: 440px) {
        .trigger { right: 16px; bottom: 16px; }
        .sidebar { top: 8px; right: 8px; bottom: 8px; width: calc(100vw - 16px); min-width: 0; border-radius: 18px; }
        .header { padding-left: 14px; padding-right: 10px; gap: 8px; }
        .logo-icon { width: 30px; height: 30px; }
        .header-btns { gap: 2px; }
        .icon-btn { width: 28px; height: 28px; }
        .action-panel { padding-left: 14px; padding-right: 14px; }
        .messages, .profile-grid { padding-left: 14px; padding-right: 14px; }
        .input-area, .profile-actions { padding-left: 14px; padding-right: 14px; }
        .profile-hdr { padding-left: 14px; padding-right: 14px; }
        .profile-actions { grid-template-columns: 1fr; }
      }
`;

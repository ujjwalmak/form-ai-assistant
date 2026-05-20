'use strict';
const FA_CSS = `
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      :host {
        --bg:       #f8fafd;
        --surface:  #ffffff;
        --surface2: #f2f6fc;
        --surface3: #dfe9fb;
        --border:   #c4c7c5;
        --border2:  #9aa0a6;
        --text:     #202124;
        --text2:    #3c4043;
        --text3:    #5f6368;
        --accent:   #0b57d0;
        --accent-h: #0842a0;
        --accent-l: #d3e3fd;
        --accent-b: #a8c7fa;
        --grad:     linear-gradient(135deg, #0b57d0, #0a4cb5);
        --danger:   #b42318;
        --danger-l: #fef3f2;
        --focus:    0 0 0 3px rgba(11, 87, 208, 0.24);
        --shadow:   0 14px 34px rgba(60,64,67,0.2), 0 4px 12px rgba(60,64,67,0.14);
        --state:    rgba(11, 87, 208, 0.10);
        --state-strong: rgba(11, 87, 208, 0.16);
        --state-on-primary: rgba(255, 255, 255, 0.18);
        --ok:       #047857;
        --ok-l:     #ecfdf5;
        --warn:     #a16207;
        --warn-l:   #fffbeb;
        --font:     'Roboto', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        --ease:     cubic-bezier(0.4, 0, 0.2, 1);
      }
      :host(.dark) {
        --bg:       #131314;
        --surface:  #1f1f1f;
        --surface2: #2b2f36;
        --surface3: #253246;
        --border:   #3c4043;
        --border2:  #5f6368;
        --text:     #e8eaed;
        --text2:    #c7c9cc;
        --text3:    #9aa0a6;
        --accent:   #a8c7fa;
        --accent-h: #d3e3fd;
        --accent-l: #2f3a4d;
        --accent-b: #4d648f;
        --grad:     linear-gradient(135deg, #a8c7fa, #8fb2f5);
        --danger:   #f97066;
        --danger-l: #451a1a;
        --focus:    0 0 0 3px rgba(168, 199, 250, 0.3);
        --shadow:   0 18px 48px rgba(0,0,0,0.48), 0 3px 12px rgba(0,0,0,0.36);
        --state:    rgba(168, 199, 250, 0.14);
        --state-strong: rgba(168, 199, 250, 0.22);
        --state-on-primary: rgba(32, 33, 36, 0.18);
        --ok:       #86efac;
        --ok-l:     #052e1a;
        --warn:     #fde68a;
        --warn-l:   #422006;
      }

      button {
        -webkit-tap-highlight-color: transparent;
      }
      button:not(:disabled) {
        position: relative;
        overflow: hidden;
      }
      button:not(:disabled)::before {
        content: '';
        position: absolute;
        inset: 0;
        background: var(--state);
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.14s var(--ease);
      }
      button:not(:disabled):hover::before { opacity: 1; }
      button:not(:disabled):focus-visible::before { opacity: 1; }
      button:not(:disabled):active::before { opacity: 1; background: var(--state-strong); }
      button > * { position: relative; z-index: 1; }

      /* ── Trigger ── */
      @keyframes trigger-pulse {
        0%, 100% { box-shadow: 0 8px 22px rgba(11,87,208,0.3), 0 0 0 0 rgba(11,87,208,0); }
        50%       { box-shadow: 0 10px 28px rgba(11,87,208,0.36), 0 0 0 8px rgba(11,87,208,0); }
      }
      button.trigger {
        position: fixed; bottom: 24px; right: 24px; width: 52px; height: 52px;
        background: var(--accent); border: 1px solid transparent; border-radius: 20px; cursor: pointer;
        display: flex; align-items: center; justify-content: center; pointer-events: all; z-index: 2;
        animation: trigger-pulse 2.8s ease-in-out infinite;
        transition: transform 0.16s var(--ease), opacity 0.2s;
      }
      .trigger::before, .send-btn::before, .qs-btn.qs-accent::before,
      .profile-actions .btn-primary::before, .agent-confirm::before,
      .review-continue::before, .autofill-btn::before { background: var(--state-on-primary); }
      .trigger:hover  { transform: translateY(-2px) scale(1.04); animation: none; box-shadow: 0 12px 28px rgba(11,87,208,0.34), 0 0 0 6px rgba(11,87,208,0.12); }
      .trigger:active { transform: translateY(0) scale(0.97); animation: none; }
      .trigger:focus-visible { outline: none; box-shadow: var(--focus), 0 10px 24px rgba(11,87,208,0.3); animation: none; }
      .trigger svg    { width: 21px; height: 21px; stroke: #fff; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; fill: none; }

      /* ── Sidebar ── */
      .sidebar {
        position: fixed; top: 0; right: 0; bottom: 0; width: 400px; min-width: 320px;
        background: var(--surface);
        backdrop-filter: none;
        -webkit-backdrop-filter: none;
        border-left: 1px solid var(--border);
        box-shadow: var(--shadow); display: flex; flex-direction: column;
        font-family: var(--font); pointer-events: all; z-index: 2;
        transform: translateX(calc(100% + 4px));
        transition: transform 0.28s cubic-bezier(0.32, 0.72, 0, 1);
        user-select: none;
      }
      .sidebar::before {
        content: '';
        position: absolute;
        top: 8px;
        left: 50%;
        width: 36px;
        height: 4px;
        border-radius: 999px;
        background: var(--border2);
        opacity: 0.72;
        transform: translateX(-50%);
        z-index: 12;
      }
      :host(.dark) .sidebar { background: var(--surface); }
      .sidebar.open       { transform: translateX(0); }
      .sidebar.floating   { border: 1px solid var(--border); border-radius: 18px; overflow: hidden; }
      .sidebar.no-animate { transition: none !important; }

      /* ── Resize handles ── */
      .resize-handle { position: absolute; z-index: 10; }
      .resize-n, .resize-s { left: 16px; right: 16px; height: 8px; cursor: ns-resize; }
      .resize-n { top: 0; }
      .resize-s { bottom: 0; }
      .resize-e, .resize-w { top: 16px; bottom: 16px; width: 8px; cursor: ew-resize; }
      .resize-e { right: 0; }
      .resize-w { left: 0; }
      .resize-ne, .resize-nw, .resize-se, .resize-sw { width: 18px; height: 18px; z-index: 11; }
      .resize-ne { top: 0; right: 0; cursor: nesw-resize; }
      .resize-nw { top: 0; left: 0; cursor: nwse-resize; }
      .resize-se { bottom: 0; right: 0; cursor: nwse-resize; }
      .resize-sw { bottom: 0; left: 0; cursor: nesw-resize; }
      .resize-n::after, .resize-s::after, .resize-e::after, .resize-w::after {
        content: ''; position: absolute; border-radius: 999px; background: var(--border2);
        opacity: 0; transition: opacity 0.16s, background 0.16s;
      }
      .resize-n::after, .resize-s::after { left: 50%; transform: translateX(-50%); width: 44px; height: 3px; }
      .resize-n::after { top: 2px; }
      .resize-s::after { bottom: 2px; }
      .resize-e::after, .resize-w::after { top: 50%; transform: translateY(-50%); width: 3px; height: 44px; }
      .resize-e::after { right: 2px; }
      .resize-w::after { left: 2px; }
      .sidebar:hover .resize-n::after, .sidebar:hover .resize-s::after,
      .sidebar:hover .resize-e::after, .sidebar:hover .resize-w::after,
      .resize-handle:hover::after { opacity: 0.8; }

      /* ── Header ── */
      .header {
        padding: 8px 14px 0 16px; height: 64px; border-bottom: 1px solid var(--border);
        display: flex; align-items: center; justify-content: space-between;
        gap: 12px;
        background: var(--surface);
        flex-shrink: 0; cursor: grab; touch-action: none;
        box-shadow: 0 1px 0 rgba(60,64,67,0.04);
        z-index: 4;
      }
      .header:active { cursor: grabbing; }
      .logo      { display: flex; align-items: center; gap: 9px; pointer-events: none; min-width: 0; }
      .logo-icon { width: 32px; height: 32px; background: var(--accent-l); color: var(--accent); border: 1px solid var(--accent-b); border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
      .logo-icon svg { width: 17px; height: 17px; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; fill: none; }
      .logo-name  { font-size: 15px; font-weight: 650; color: var(--text); letter-spacing: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .logo-text  { display: flex; flex-direction: column; gap: 1px; min-width: 0; overflow: hidden; }
      .logo-sub   { font-size: 10.5px; color: var(--text3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .header-btns { display: flex; gap: 4px; flex-shrink: 0; }
      .icon-btn { width: 32px; height: 32px; border: 1px solid transparent; background: transparent; cursor: pointer; border-radius: 999px; display: flex; align-items: center; justify-content: center; color: var(--text3); transition: color 0.14s, border-color 0.14s; }
      .icon-btn:hover  { color: var(--text); }
      .icon-btn:focus-visible { outline: none; box-shadow: var(--focus); color: var(--accent); }
      .icon-btn.active { background: var(--accent-l); color: var(--accent); border-color: var(--accent-b); }
      .icon-btn svg { width: 14px; height: 14px; stroke: currentColor; stroke-width: 2.2; stroke-linecap: round; fill: none; }

      /* ── Messages ── */
      .messages { flex: 1; overflow-y: auto; padding: 18px; display: flex; flex-direction: column; gap: 12px; scroll-behavior: smooth; background: var(--bg); transition: opacity 0.15s, transform 0.15s; }
      .results-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px 28px; text-align: center; pointer-events: none; }
      .re-icon { width: 52px; height: 52px; border-radius: 16px; background: var(--accent-l); border: 1.5px solid var(--accent-b); display: flex; align-items: center; justify-content: center; margin-bottom: 18px; }
      .re-icon svg { width: 26px; height: 26px; stroke: var(--accent); stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; fill: none; }
      .re-title { font-size: 14.5px; font-weight: 700; color: var(--text); margin-bottom: 5px; line-height: 1.3; }
      .re-sub { font-size: 11px; color: var(--text3); margin-bottom: 14px; font-family: var(--font); }
      .re-hint { font-size: 12px; color: var(--text2); line-height: 1.6; max-width: 230px; }
      .messages::-webkit-scrollbar { width: 5px; }
      .messages::-webkit-scrollbar-track { background: transparent; }
      .messages::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 999px; }
      .msg { display: flex; align-items: flex-end; animation: msg-in 0.22s cubic-bezier(0.34, 1.3, 0.64, 1); }
      @keyframes msg-in { from { opacity: 0; transform: translateY(10px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
      .msg.ai { justify-content: flex-start; }
      .bubble { max-width: 100%; padding: 11px 14px; font-size: 13.5px; line-height: 1.52; color: var(--text); font-family: var(--font); overflow-wrap: anywhere; box-shadow: 0 1px 2px rgba(60,64,67,0.08); }
      .msg.ai   .bubble { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; }
      .msg.user { justify-content: flex-start; }
      .msg.user .bubble { background: var(--surface2); border: 1px solid var(--border); border-radius: 999px; padding: 5px 14px; color: var(--text2); font-size: 12px; line-height: 1.4; box-shadow: none; max-width: calc(100% - 0px); }
      .bubble code { background: rgba(100,116,139,0.14); border-radius: 5px; padding: 1px 4px; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 0.92em; }
      .bubble.copyable { padding-right: 38px; position: relative; }
      .copy-btn {
        position: absolute; top: 6px; right: 6px; width: 26px; height: 26px;
        border: 1px solid transparent; border-radius: 7px; background: transparent; color: var(--text3);
        display: flex; align-items: center; justify-content: center; cursor: pointer;
        transition: background 0.14s, color 0.14s, border-color 0.14s, box-shadow 0.14s;
      }
      .copy-btn:hover { background: var(--surface); color: var(--text); border-color: var(--border); }
      .copy-btn:focus-visible { outline: none; box-shadow: var(--focus); }
      .copy-btn svg { width: 13px; height: 13px; stroke: currentColor; stroke-width: 2; fill: none; stroke-linecap: round; stroke-linejoin: round; }


      /* ── Field list ── */
      .field-list { display: flex; flex-direction: column; gap: 6px; margin-top: 10px; max-height: 190px; overflow-y: auto; padding-right: 2px; }
      .field-list::-webkit-scrollbar { width: 4px; }
      .field-list::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 999px; }
      .field-btn {
        width: 100%; min-height: 32px; background: var(--surface); border: 1px solid var(--border); color: var(--text2);
        padding: 6px 9px; border-radius: 12px; font-size: 12px; cursor: pointer;
        text-align: left; font-family: var(--font); display: flex; align-items: center; gap: 7px;
        transition: background 0.14s, color 0.14s, border-color 0.14s, box-shadow 0.14s;
      }
      .field-btn:hover { color: var(--accent); border-color: var(--accent-b); }
      .field-btn:focus-visible { outline: none; box-shadow: var(--focus); border-color: var(--accent-b); }
      .field-btn-label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
      .field-btn .req { color: var(--danger); background: var(--danger-l); border: 1px solid rgba(180,35,24,0.2); border-radius: 5px; font-size: 10px; line-height: 1; padding: 3px 5px; margin-left: auto; flex-shrink: 0; }
      .field-type-tag { font-size: 10px; color: var(--text3); background: var(--bg); border: 1px solid var(--border); padding: 2px 5px; border-radius: 5px; flex-shrink: 0; max-width: 78px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

      /* ── Chips ── */
      .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
      .chip  { max-width: 100%; background: var(--surface); border: 1px solid var(--border); color: var(--text2); padding: 5px 9px; border-radius: 8px; font-size: 11.5px; cursor: pointer; font-family: var(--font); transition: background 0.14s, border-color 0.14s, color 0.14s, box-shadow 0.14s; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .chip:hover { border-color: var(--accent-b); color: var(--accent); }
      .chip:focus-visible { outline: none; box-shadow: var(--focus); border-color: var(--accent-b); }

      /* ── Typing ── */
      .typing-row    { display: flex; gap: 9px; align-items: flex-end; }
      .typing-bubble { background: var(--surface); border: 1px solid var(--border); border-radius: 16px 16px 16px 6px; padding: 13px 16px; display: flex; align-items: center; box-shadow: 0 1px 2px rgba(60,64,67,0.08); }
      .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--accent); animation: fa-pulse 1.3s ease-in-out infinite; }
      @keyframes fa-pulse { 0%,100% { opacity: 0.35; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.2); } }

      /* ── Input area ── */
      .input-area  { padding: 12px 16px 14px; border-top: 1px solid var(--border); background: var(--surface); flex-shrink: 0; }
      .field-tag   { font-size: 11.5px; color: var(--text3); margin-bottom: 7px; display: none; align-items: center; gap: 6px; min-width: 0; }
      .field-tag.visible { display: flex; }
      .field-tag .dot-ind { width: 6px; height: 6px; background: var(--accent); border-radius: 50%; flex-shrink: 0; animation: blink 2s ease-in-out infinite; }
      @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
      .field-tag span { font-weight: 600; color: var(--accent); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
      .input-row  { display: flex; gap: 8px; align-items: flex-end; }
      .input-box  { flex: 1; min-width: 0; font-family: var(--font); font-size: 13.5px; padding: 10px 14px; border: 1.5px solid transparent; border-radius: 20px; background: var(--surface2); color: var(--text); resize: none; outline: none; min-height: 40px; max-height: 112px; line-height: 1.45; transition: border-color 0.14s, box-shadow 0.14s, background 0.14s; }
      .input-box:focus { border-color: var(--accent); box-shadow: var(--focus); background: var(--surface); }
      .input-box::placeholder { color: var(--text3); }
      .send-btn { width: 40px; height: 40px; background: var(--accent); border: none; border-radius: 999px; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: transform 0.12s, box-shadow 0.14s, opacity 0.14s; box-shadow: 0 2px 6px rgba(11,87,208,0.28); }
      .send-btn:hover  { transform: scale(1.04); box-shadow: 0 4px 12px rgba(11,87,208,0.34); }
      .send-btn:focus-visible { outline: none; box-shadow: var(--focus), 0 2px 6px rgba(11,87,208,0.28); }
      .send-btn:active { transform: scale(0.95); }
      .send-btn svg { width: 15px; height: 15px; stroke: #fff; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; fill: none; }
      .footer-note { font-size: 10px; color: var(--text3); text-align: center; margin-top: 9px; font-family: var(--font); }

      /* ── Autofill tip ── */
      .autofill-tip { display: none; align-items: center; gap: 8px; margin-bottom: 8px; background: var(--accent-l); border: 1px solid var(--accent-b); border-radius: 8px; padding: 7px 9px; font-size: 11.5px; color: var(--text2); font-family: var(--font); min-width: 0; }
      .autofill-tip.visible { display: flex; }
      .autofill-tip strong { color: var(--text); font-weight: 500; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .autofill-btn { background: var(--accent); color: #fff; border: none; border-radius: 7px; padding: 4px 9px; font-size: 11px; cursor: pointer; font-family: var(--font); white-space: nowrap; flex-shrink: 0; transition: background 0.14s, box-shadow 0.14s; }
      .autofill-btn:hover { background: var(--accent-h); }
      .autofill-btn:focus-visible { outline: none; box-shadow: var(--focus); }

      /* ── Profile panel ── */
      @keyframes profile-in  { from { opacity: 0; transform: translateX(18px); } to   { opacity: 1; transform: translateX(0); } }
      .profile-panel { display: none; flex-direction: column; flex: 1; overflow: hidden; background: var(--surface); }
      .profile-panel.visible { display: flex; animation: profile-in 0.22s var(--ease) forwards; }
      .profile-hdr { padding: 11px 18px; border-bottom: 1px solid var(--border); font-size: 12px; font-weight: 650; color: var(--text); flex-shrink: 0; display: flex; justify-content: space-between; align-items: center; gap: 10px; min-width: 0; background: var(--surface2); }
      .profile-hdr span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .profile-hdr span:last-child { font-weight: 400; color: var(--text3); font-size: 10.5px; flex-shrink: 0; max-width: 52%; }
      .profile-grid { flex: 1; overflow-y: auto; padding: 14px 18px; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 10px; background: var(--surface); }
      .profile-grid::-webkit-scrollbar { width: 5px; }
      .profile-grid::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 999px; }
      .pf { display: flex; flex-direction: column; gap: 4px; }
      .pf.full { grid-column: 1 / -1; }
      .pf label { font-size: 10.5px; color: var(--text3); font-weight: 600; font-family: var(--font); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .pf input { width: 100%; min-width: 0; font-family: var(--font); font-size: 12.5px; padding: 8px 10px; border: 1px solid transparent; border-radius: 8px; background: var(--surface2); color: var(--text); outline: none; transition: border-color 0.14s, box-shadow 0.14s, background 0.14s; }
      .pf input:focus { border-color: var(--accent); box-shadow: var(--focus); background: var(--surface); }
      .profile-actions { padding: 10px 18px; border-top: 1px solid var(--border); display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px; flex-shrink: 0; background: var(--surface2); }
      .profile-actions button { min-width: 0; padding: 7px 8px; border-radius: 8px; font-size: 11.5px; font-family: var(--font); cursor: pointer; border: 1px solid var(--border2); background: var(--surface); color: var(--text2); transition: background 0.14s, color 0.14s, border-color 0.14s, box-shadow 0.14s; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .profile-actions button:hover { color: var(--text); }
      .profile-actions button:focus-visible { outline: none; box-shadow: var(--focus); border-color: var(--accent-b); }
      .profile-actions .btn-primary { background: var(--accent); color: #fff; border-color: transparent; }
      .profile-actions .btn-primary:hover { background: var(--accent-h); }
      .profile-actions .btn-danger { color: var(--danger); border-color: var(--danger); }
      .profile-actions .btn-danger:hover { background: var(--danger-l); }
      .profile-actions .btn-io { color: var(--accent); border-color: var(--accent-b); background: var(--accent-l); }
      .profile-actions .btn-io:hover { background: var(--accent-b); }
      /* ── History panel ── */
      .history-panel { display: none; flex-direction: column; flex: 1; overflow: hidden; }
      .history-panel.visible { display: flex; }
      .history-list { flex: 1; overflow-y: auto; padding: 10px 18px; display: flex; flex-direction: column; gap: 8px; }
      .history-entry { display: flex; align-items: flex-start; gap: 10px; padding: 10px 12px; border: 1px solid var(--border); border-radius: 10px; background: var(--surface); cursor: pointer; transition: border-color 0.14s, background 0.14s; }
      .history-entry:hover { border-color: var(--accent-b); background: var(--accent-l); }
      .history-icon { width: 32px; height: 32px; border-radius: 8px; background: var(--accent-l); border: 1px solid var(--accent-b); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
      .history-icon svg { width: 16px; height: 16px; stroke: var(--accent); stroke-width: 2; fill: none; stroke-linecap: round; stroke-linejoin: round; }
      .history-info { flex: 1; min-width: 0; }
      .history-domain { font-size: 12.5px; font-weight: 600; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .history-meta { font-size: 11px; color: var(--text3); margin-top: 2px; }
      .history-empty { padding: 40px 20px; text-align: center; color: var(--text3); font-size: 12.5px; }
      .history-clear { font-size: 11px; color: var(--danger); background: none; border: none; cursor: pointer; font-family: var(--font); padding: 0; }
      .history-clear:hover { text-decoration: underline; }

      /* ── Profile switcher ── */
      .pf-switcher { display: flex; align-items: center; gap: 6px; padding: 8px 18px 0; flex-shrink: 0; }
      .pf-select { flex: 1; min-width: 0; height: 30px; border: 1.5px solid var(--border2); border-radius: 8px; background: var(--surface); color: var(--text); font: 500 12px/1 var(--font); padding: 0 6px; cursor: pointer; appearance: auto; }
      .pf-select:focus { outline: none; border-color: var(--accent-b); }
      .pf-sw-btn { width: 26px; height: 26px; border-radius: 7px; border: 1.5px solid var(--border2); background: var(--surface); color: var(--text2); font-size: 15px; line-height: 1; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: color 0.12s, border-color 0.12s, background 0.12s; }
      .pf-sw-btn:hover { color: var(--accent); border-color: var(--accent-b); background: var(--accent-l); }
      .pf-sw-btn.danger:hover { color: var(--danger); border-color: var(--danger); background: var(--danger-l); }

      .pf-extras-hdr { grid-column: 1 / -1; font-size: 10px; font-weight: 700; color: var(--text3); text-transform: uppercase; letter-spacing: 0.6px; padding-top: 8px; margin-top: 2px; border-top: 1px solid var(--border); }
      .pf-extras-empty { grid-column: 1 / -1; font-size: 11.5px; color: var(--text3); font-style: italic; }
      .pf-extra-row { display: flex; gap: 6px; align-items: center; }
      .pf-extra-row input { flex: 1; min-width: 0; font-family: var(--font); font-size: 12.5px; padding: 8px 10px; border: 1px solid transparent; border-radius: 8px; background: var(--surface2); color: var(--text); outline: none; transition: border-color 0.14s, box-shadow 0.14s; }
      .pf-extra-row input:focus { border-color: var(--accent); box-shadow: var(--focus); background: var(--surface); }
      .pf-del { background: transparent; border: 1px solid transparent; color: var(--text3); cursor: pointer; padding: 4px 7px; border-radius: 6px; font-size: 14px; line-height: 1; flex-shrink: 0; transition: color 0.14s, background 0.14s, border-color 0.14s; }
      .pf-del:hover { color: var(--danger); background: var(--danger-l); border-color: rgba(180,35,24,0.2); }

      .review-status { display: inline-flex; align-items: center; gap: 5px; margin-bottom: 8px; padding: 3px 7px; border-radius: 7px; font-size: 10.5px; font-weight: 650; border: 1px solid var(--border); color: var(--text2); background: var(--surface); }
      .review-status.ok { color: #047857; background: #ecfdf5; border-color: #a7f3d0; }
      .review-status.warn { color: #a16207; background: #fffbeb; border-color: #fde68a; }
      .review-status.missing { color: var(--danger); background: var(--danger-l); border-color: rgba(180,35,24,0.22); }
      :host(.dark) .review-status.ok { color: #86efac; background: #052e1a; border-color: #166534; }
      :host(.dark) .review-status.warn { color: #fde68a; background: #422006; border-color: #854d0e; }
      .review-actions { display: flex; gap: 7px; margin-top: 10px; flex-wrap: wrap; }
      .review-continue, .review-secondary {
        border: 1px solid var(--accent-b); background: var(--accent); color: #fff;
        border-radius: 8px; padding: 7px 10px; font-size: 11.5px; font-family: var(--font);
        cursor: pointer; transition: background 0.14s, box-shadow 0.14s, transform 0.1s;
      }
      .review-continue:hover { background: var(--accent-h); }
      .review-secondary { background: var(--surface); color: var(--text2); border-color: var(--border2); }
      .review-secondary:hover { background: var(--bg); color: var(--text); }
      .review-continue:focus-visible, .review-secondary:focus-visible { outline: none; box-shadow: var(--focus); }
      .review-continue:active, .review-secondary:active { transform: scale(0.98); }
      .review-note { color: var(--text3); font-size: 11px; line-height: 1.4; margin-top: 8px; }

      /* ── Action panel ── */
      .action-panel { padding: 16px 16px 14px; background: var(--surface); border-bottom: 1px solid var(--border); flex-shrink: 0; }
      .ap-primary {
        width: 100%; height: 50px;
        background: linear-gradient(175deg, #1b67db 0%, #0b51c5 100%);
        color: #fff; border: none; border-radius: 14px; font: 600 14px/1 var(--font); cursor: pointer;
        display: flex; align-items: center; justify-content: center; gap: 8px;
        box-shadow: 0 1px 2px rgba(11,87,208,0.15), 0 4px 14px rgba(11,87,208,0.32), inset 0 1px 0 rgba(255,255,255,0.14);
        transition: opacity 0.14s, box-shadow 0.15s, transform 0.1s;
      }
      .ap-primary svg { width: 16px; height: 16px; stroke: #fff; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; fill: none; }
      .ap-primary:hover { opacity: 0.88; box-shadow: 0 2px 4px rgba(11,87,208,0.2), 0 8px 22px rgba(11,87,208,0.4), inset 0 1px 0 rgba(255,255,255,0.14); }
      .ap-primary:active { transform: scale(0.985); opacity: 0.95; }
      .ap-primary:focus-visible { outline: none; box-shadow: var(--focus); }
      .ap-primary:disabled { opacity: 0.42; cursor: not-allowed; transform: none; box-shadow: none; }
      .ap-chips { display: flex; gap: 8px; margin-top: 10px; }
      .ap-chip {
        flex: 1; height: 34px;
        border: 1.5px solid var(--accent-b); background: var(--accent-l);
        color: var(--accent); border-radius: 999px;
        font: 500 12px/1 var(--font); cursor: pointer;
        display: flex; align-items: center; justify-content: center; gap: 5px;
        transition: color 0.14s, border-color 0.14s, background 0.14s, box-shadow 0.14s;
        white-space: nowrap; flex-shrink: 0;
      }
      .ap-chip svg { width: 13px; height: 13px; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; fill: none; flex-shrink: 0; }
      .ap-chip:hover { border-color: var(--accent); box-shadow: 0 1px 6px rgba(11,87,208,0.18); }
      .ap-chip:active { transform: scale(0.97); }
      .ap-chip:focus-visible { outline: none; box-shadow: var(--focus); }
      .ap-chip.open { border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent-b); }
      .ap-field-list { overflow: hidden; max-height: 0; transition: max-height 0.28s cubic-bezier(0.4,0,0.2,1), padding-top 0.2s; }
      .ap-field-list.open { max-height: 220px; padding-top: 10px; }
      .ap-field-list .field-list { max-height: 210px; margin-top: 0; }
      .ap-mode-select-row { display: flex; flex-direction: column; gap: 6px; margin-top: 10px; }
      .ap-select {
        width: 100%;
        height: 34px;
        border: 1.5px solid var(--border2);
        border-radius: 10px;
        background: var(--surface2);
        color: var(--text2);
        font: 500 12px/1 var(--font);
        padding: 0 10px;
        outline: none;
      }
      .ap-select:focus-visible {
        border-color: var(--accent);
        box-shadow: var(--focus);
      }

      /* ── Toast ── */
      .toast { position: absolute; top: 66px; left: 50%; max-width: calc(100% - 32px); transform: translateX(-50%) translateY(-6px); background: var(--text); color: var(--surface); font-family: var(--font); font-size: 12px; padding: 7px 12px; border-radius: 8px; opacity: 0; transition: opacity 0.18s, transform 0.18s; pointer-events: none; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; z-index: 20; box-shadow: 0 10px 24px rgba(15,23,42,0.18); }
      .toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }

      /* ── Smart Fill Preview ── */
      .sf-preview { display: flex; flex-direction: column; gap: 5px; margin-top: 8px; }
      .sf-section-title { font-size: 10px; font-weight: 700; color: var(--text3); text-transform: uppercase; letter-spacing: 0.5px; padding: 8px 0 4px; border-top: 1px solid var(--border); margin-top: 4px; }
      .sf-section-title:first-child { border-top: none; margin-top: 0; padding-top: 0; }
      .sf-row { display: flex; align-items: center; gap: 7px; padding: 7px 9px; border: 1.5px solid var(--border); border-radius: 10px; background: var(--surface2); transition: border-color 0.14s, background 0.14s; }
      .sf-row:has(.sf-cb:checked) { border-color: var(--accent-b); background: var(--accent-l); }
      .sf-cb { width: 14px; height: 14px; accent-color: var(--accent); flex-shrink: 0; cursor: pointer; }
      .sf-label { font-size: 10.5px; color: var(--text3); font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 90px; flex-shrink: 0; }
      .sf-input { flex: 1; min-width: 0; font-size: 12.5px; font-family: var(--font); border: none; background: transparent; color: var(--text); outline: none; padding: 0; cursor: text; }
      .sf-input:focus { color: var(--accent); }
      .sf-input::placeholder { color: var(--text3); font-style: italic; font-size: 11.5px; }

      /* ── Agent preview ── */
      .agent-preview { display: flex; flex-direction: column; gap: 6px; margin-top: 10px; }
      .agent-field-row { display: flex; align-items: center; gap: 9px; padding: 7px 9px; background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; cursor: pointer; transition: border-color 0.14s, background 0.14s; }
      .agent-field-row:has(input:checked) { border-color: var(--accent-b); background: var(--accent-l); }
      .agent-field-row input[type="checkbox"] { flex-shrink: 0; width: 15px; height: 15px; accent-color: var(--accent); cursor: pointer; }
      .agent-field-row label { flex: 1; display: flex; flex-direction: column; gap: 2px; cursor: pointer; min-width: 0; }
      .agent-field-label { font-size: 10.5px; color: var(--text3); font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .agent-field-value { font-size: 12.5px; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .agent-actions { display: flex; gap: 7px; margin-top: 6px; flex-wrap: wrap; }
      .agent-confirm { background: var(--accent); color: #fff; border: none; border-radius: 8px; padding: 7px 13px; font-size: 12px; font-family: var(--font); cursor: pointer; transition: background 0.14s, box-shadow 0.14s; }
      .agent-confirm:hover { background: var(--accent-h); }
      .agent-confirm:focus-visible { outline: none; box-shadow: var(--focus); }
      .agent-cancel { background: var(--surface); color: var(--text2); border: 1px solid var(--border2); border-radius: 8px; padding: 7px 13px; font-size: 12px; font-family: var(--font); cursor: pointer; transition: background 0.14s; }
      .agent-cancel:hover { background: var(--bg); color: var(--text); }
      .agent-cancel:focus-visible { outline: none; box-shadow: var(--focus); }
      .agent-select-all { background: transparent; color: var(--accent); border: none; font-size: 11px; font-family: var(--font); cursor: pointer; padding: 0; margin-left: auto; text-decoration: underline; }
      @keyframes fa-spin { to { transform: rotate(360deg); } }
      .fa-spinner { display: inline-block; width: 10px; height: 10px; border: 2px solid var(--border2); border-top-color: var(--accent); border-radius: 50%; animation: fa-spin 0.65s linear infinite; flex-shrink: 0; }
      .live-row { display: flex; align-items: center; gap: 8px; font-size: 12.5px; min-width: 0; }
      .live-row-icon { flex-shrink: 0; width: 16px; text-align: center; font-style: normal; }
      .live-row-label { flex: 1; color: var(--text2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
      .live-row-value { color: var(--text); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 110px; flex-shrink: 0; }
      .live-summary { margin-top: 10px; padding-top: 8px; border-top: 1px solid var(--border); font-size: 11.5px; color: var(--text3); }

      /* ── Preview row source colors ── */
      .sf-row[data-source="profile"]    { border-left: 3px solid #22c55e; }
      .sf-row[data-source="inferred"]   { border-left: 3px solid #3b82f6; }
      .sf-row[data-source="suggestion"] { border-left: 3px solid #f59e0b; }
      :host(.dark) .sf-row[data-source="profile"]    { border-left-color: #16a34a; }
      :host(.dark) .sf-row[data-source="inferred"]   { border-left-color: #2563eb; }
      :host(.dark) .sf-row[data-source="suggestion"] { border-left-color: #d97706; }

      /* ── Preview source summary chips ── */
      .preview-source-row { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 6px; }
      .psr-chip { display: inline-flex; align-items: center; gap: 3px; padding: 2px 8px; border-radius: 999px; font-size: 10.5px; font-weight: 600; border: 1px solid transparent; }
      .psr-profile    { background: #dcfce7; color: #15803d; border-color: #bbf7d0; }
      .psr-inferred   { background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; }
      .psr-suggestion { background: #fffbeb; color: #a16207; border-color: #fde68a; }
      :host(.dark) .psr-profile    { background: #052e16; color: #86efac; border-color: #166534; }
      :host(.dark) .psr-inferred   { background: #0f172a; color: #93c5fd; border-color: #1e40af; }
      :host(.dark) .psr-suggestion { background: #1c1400; color: #fde68a; border-color: #854d0e; }

      /* ── Guided progress strip ── */
      .guided-progress { margin-top: 10px; }
      .gp-bar-wrap { height: 4px; background: var(--border); border-radius: 999px; overflow: hidden; margin-bottom: 5px; }
      .gp-bar { height: 100%; background: linear-gradient(90deg, #1b67db, #22c55e); border-radius: 999px; transition: width 0.4s cubic-bezier(0.4,0,0.2,1); }
      .gp-label { font-size: 11px; color: var(--text2); font-weight: 500; }

      /* ── Auto-nav toggle ── */
      .ap-mode-row { display: flex; align-items: center; justify-content: space-between; margin-top: 10px; padding: 0 2px; }
      .ap-mode-label { font-size: 11.5px; color: var(--text2); font-weight: 500; }
      .ap-toggle { position: relative; display: inline-flex; align-items: center; width: 36px; height: 20px; flex-shrink: 0; cursor: pointer; }
      .ap-toggle input { opacity: 0; width: 0; height: 0; position: absolute; }
      .ap-toggle-track { position: absolute; inset: 0; border-radius: 999px; background: var(--border2); transition: background 0.18s; }
      .ap-toggle input:checked ~ .ap-toggle-track { background: var(--accent); }
      .ap-toggle-thumb { position: absolute; top: 3px; left: 3px; width: 14px; height: 14px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.22); transition: transform 0.18s; }
      .ap-toggle input:checked ~ .ap-toggle-thumb { transform: translateX(16px); }

      /* ── Guided question bubble ── */
      .guided-q { padding: 2px 0; }
      .gq-eyebrow { font-size: 10px; font-weight: 700; color: var(--accent); text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 7px; display: flex; align-items: center; gap: 5px; }
      .gq-eyebrow::before { content: ''; display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: var(--accent); flex-shrink: 0; }
      .gq-text { font-size: 13.5px; color: var(--text); font-weight: 500; line-height: 1.45; margin-bottom: 11px; }
      .gq-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 9px; }
      .gq-chip { padding: 6px 13px; border-radius: 999px; border: 1.5px solid var(--accent-b); background: var(--accent-l); color: var(--accent); font: 500 12px/1 var(--font); cursor: pointer; transition: background 0.12s, border-color 0.12s, color 0.12s; }
      .gq-chip:hover { background: var(--accent-b); border-color: var(--accent); }
      .gq-chip:active { transform: scale(0.96); }
      .gq-chip.gq-selected { background: var(--accent); color: #fff; border-color: var(--accent); cursor: default; }
      .gq-hint { font-size: 10.5px; color: var(--text3); line-height: 1.4; }



      /* ── Professional polish pass ── */
      .sidebar {
        width: 420px;
        background: var(--surface);
      }
      .sidebar::before { display: none; }
      .header {
        height: 66px;
        padding: 12px 14px 11px 16px;
        border-bottom-color: var(--border);
        box-shadow: none;
      }
      .logo-icon {
        width: 34px;
        height: 34px;
        border-radius: 9px;
        background: var(--surface2);
        border-color: var(--border);
      }
      .logo-name { font-size: 14.5px; font-weight: 700; }
      .logo-sub { font-size: 11px; }
      .icon-btn {
        width: 30px;
        height: 30px;
        border-radius: 8px;
      }
      .icon-btn:hover {
        background: var(--surface2);
        border-color: var(--border);
      }
      .action-panel {
        padding: 14px 16px 12px;
        background: var(--surface);
      }
      .ap-primary {
        height: 44px;
        border-radius: 9px;
        background: var(--accent);
        box-shadow: none;
        font-size: 13.5px;
      }
      .ap-primary:hover {
        opacity: 1;
        background: var(--accent-h);
        box-shadow: none;
      }
      .ap-chips { gap: 7px; margin-top: 9px; }
      .ap-chip {
        height: 32px;
        border-radius: 8px;
        border-color: var(--border);
        background: var(--surface);
        color: var(--text2);
        font-weight: 600;
      }
      .ap-chip:hover,
      .ap-chip.open {
        border-color: var(--accent-b);
        background: var(--accent-l);
        color: var(--accent);
        box-shadow: none;
      }
      .ap-mode-select-row { margin-top: 10px; }
      .ap-select {
        height: 34px;
        border-radius: 8px;
        background: var(--surface);
        border-color: var(--border);
      }
      .ap-mode-row {
        margin-top: 9px;
        padding: 8px 10px;
        border: 1px solid var(--border);
        border-radius: 8px;
        background: var(--bg);
      }
      .trust-row {
        display: flex;
        align-items: center;
        gap: 7px;
        margin-top: 10px;
        padding: 8px 10px;
        border-radius: 8px;
        background: var(--bg);
        color: var(--text3);
        font: 500 11px/1.35 var(--font);
      }
      .trust-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: var(--ok);
        box-shadow: 0 0 0 3px var(--ok-l);
        flex-shrink: 0;
      }
      .messages {
        padding: 16px;
        background: var(--bg);
        gap: 10px;
      }
      .bubble {
        border-radius: 10px;
        box-shadow: none;
      }
      .msg.ai .bubble { border-radius: 10px; }
      .msg.user .bubble {
        border-radius: 10px;
        background: var(--surface);
      }
      .input-area { padding: 11px 16px 12px; }
      .input-box {
        border-radius: 10px;
        background: var(--surface);
        border-color: var(--border);
      }
      .send-btn {
        border-radius: 10px;
        box-shadow: none;
      }
      .send-btn:hover { box-shadow: none; }
      .footer-note {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        flex-wrap: wrap;
        margin-top: 9px;
        text-align: center;
      }
      .footer-provider {
        color: var(--text2);
        font-weight: 700;
      }
      .footer-model {
        max-width: 210px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .footer-sep { color: var(--border2); }
      .sf-preview { gap: 0; border: 1px solid var(--border); border-radius: 10px; overflow: hidden; background: var(--surface); }
      .sf-row {
        border: none;
        border-top: 1px solid var(--border);
        border-radius: 0;
        background: var(--surface);
        padding: 9px 10px;
      }
      .sf-section-title + .sf-row,
      .sf-preview > .sf-row:first-child { border-top: none; }
      .sf-row:has(.sf-cb:checked) {
        border-color: var(--border);
        background: var(--bg);
      }
      .sf-label { max-width: 104px; font-size: 11px; }
      .source-badge {
        border: 1px solid var(--border);
        border-radius: 999px;
        padding: 2px 7px;
        font-size: 10px;
        font-weight: 700;
        line-height: 1.2;
        white-space: nowrap;
        flex-shrink: 0;
      }
      .source-badge.inferred {
        background: #eff6ff;
        border-color: #bfdbfe;
        color: #1d4ed8;
      }
      .source-badge.suggestion {
        background: var(--warn-l);
        border-color: #fde68a;
        color: var(--warn);
      }
      :host(.dark) .source-badge.inferred {
        background: #0f172a;
        border-color: #1e40af;
        color: #93c5fd;
      }
      .psr-chip {
        border-radius: 6px;
        padding: 3px 7px;
        font-size: 10px;
      }

      @media (max-width: 420px) {
        .trigger { right: 16px; bottom: 16px; }
        .sidebar { width: min(100vw, 380px); min-width: 0; }
        .header { padding-left: 12px; padding-right: 10px; gap: 8px; }
        .logo-icon { width: 28px; height: 28px; }
        .header-btns { gap: 2px; }
        .icon-btn { width: 28px; height: 28px; }
        .action-panel { padding-left: 14px; padding-right: 14px; }
        .messages, .profile-grid { padding-left: 14px; padding-right: 14px; }
        .input-area, .profile-actions { padding-left: 14px; padding-right: 14px; }
        .profile-hdr { padding-left: 14px; padding-right: 14px; }
        .profile-actions { grid-template-columns: 1fr; }
      }
`;

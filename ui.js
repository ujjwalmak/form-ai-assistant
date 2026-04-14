function injectPanel() {
  if (panelInjected) return;
  panelInjected = true;

  const panel = document.createElement('div');
  panel.className = 'formassist-panel';
  panel.innerHTML = `
    <div class="chat-header">
      <div class="ai-avatar">
        <svg viewBox="0 0 24 24"><path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 010 2h-1v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1H2a1 1 0 010-2h1a7 7 0 017-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2zM9 11a5 5 0 100 10A5 5 0 009 11zm6 0a5 5 0 100 10 5 5 0 000-10zM9 13a1 1 0 110 2 1 1 0 010-2zm6 0a1 1 0 110 2 1 1 0 010-2z"/></svg>
      </div>
      <div class="chat-header-info">
        <h3>FormAssist KI</h3>
        <p><span class="status-dot"></span>Bereit - ich helfe bei Formularen</p>
      </div>
      <button id="minimizePanel" class="panel-btn" aria-label="Minimieren">-</button>
      <button id="closePanel" class="panel-btn" aria-label="Schliessen">x</button>
    </div>
    <div class="chat-messages" id="chatMessages"></div>
    <div class="chat-input-area">
      <div class="input-row">
        <textarea class="chat-textarea" id="userInput" placeholder="Frage zu einem Feld stellen..." rows="1"></textarea>
        <button class="send-btn" id="sendBtn" aria-label="Senden">
          <svg viewBox="0 0 24 24"><path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/></svg>
        </button>
      </div>
      <div class="context-tag" id="contextTag" style="display:none;">
        Aktuelles Feld: <span id="activeFieldName">-</span>
      </div>
    </div>
    <div id="resizeHandleLeft" class="resize-handle resize-handle-left" aria-hidden="true"></div>

  `;

  document.body.appendChild(panel);

  const fields = scanFormFields(panel);

  let greeting = 'Hallo! Ich bin dein KI-Formularassistent. Ich helfe dir bei der Ausfuellung von Formularen auf dieser Seite.';
  if (fields.length > 0) {
    greeting += '<br><br>Klicke auf eines der Felder, zu denen du Fragen hast, um mehr Infos zu bekommen.';
    greeting += '<br><br><div class="inline-field-list" id="inlineFieldList"></div>';
  } else {
    greeting += '<br><br>Ich konnte keine Formularfelder finden. Frage mich trotzdem, wenn du Hilfe brauchst!';
  }

  addMessage('ai', greeting, true);

  if (fields.length > 0) {
    renderFieldList(fields, 'inlineFieldList');
  }
  const minimizeButton = panel.querySelector('#minimizePanel');
  const closeButton = panel.querySelector('#closePanel');
  const resizeHandleLeft = panel.querySelector('#resizeHandleLeft');
  const sendBtn = panel.querySelector('#sendBtn');
  const userInput = panel.querySelector('#userInput');

  if (minimizeButton) {
    minimizeButton.addEventListener('click', () => {
      const minimized = panel.classList.toggle('minimized');
      minimizeButton.textContent = minimized ? '+' : '-';
      if (minimized) {
        panel.style.height = '64px';
        panel.style.width = '296px';
      } else {
        panel.style.height = '';
        panel.style.width = '';
      }
    });
  }

  closeButton.addEventListener('click', () => {
    panel.remove();
    panelInjected = false;
  });

  const header = panel.querySelector('.chat-header');
  let dragInfo = null;
  let resizeInfo = null;

  header.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return;
    if (panel.classList.contains('minimized')) return;

    dragInfo = {
      startX: e.clientX,
      startY: e.clientY,
      startLeft: panel.getBoundingClientRect().left,
      startTop: panel.getBoundingClientRect().top,
      width: panel.offsetWidth,
      height: panel.offsetHeight
    };
    panel.style.right = 'auto';
    panel.setPointerCapture(e.pointerId);
    document.addEventListener('pointermove', onDrag);
    document.addEventListener('pointerup', onDragEnd, { once: true });
    e.preventDefault();
  });

  function onDrag(e) {
    if (!dragInfo) return;
    const dx = e.clientX - dragInfo.startX;
    const dy = e.clientY - dragInfo.startY;
    let left = dragInfo.startLeft + dx;
    let top = dragInfo.startTop + dy;
    left = Math.max(20, Math.min(window.innerWidth - dragInfo.width - 20, left));
    top = Math.max(20, Math.min(window.innerHeight - dragInfo.height - 20, top));
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
  }

  function onDragEnd() {
    dragInfo = null;
    document.removeEventListener('pointermove', onDrag);
  }

  function bindResizeHandle(handle) {
    if (!handle) return;
    handle.addEventListener('pointerdown', (e) => {
      if (panel.classList.contains('minimized')) return;

      const rect = panel.getBoundingClientRect();
      const style = window.getComputedStyle(panel);
      const minWidth = parseFloat(style.minWidth) || 320;
      const minHeight = parseFloat(style.minHeight) || 240;

      resizeInfo = {
        startX: e.clientX,
        startY: e.clientY,
        startWidth: rect.width,
        startHeight: rect.height,
        startLeft: rect.left,
        startRight: rect.left + rect.width,
        startTop: rect.top,
        minWidth,
        minHeight
      };

      panel.classList.add('resizing');
      panel.style.right = 'auto';
      panel.style.left = `${rect.left}px`;
      panel.style.top = `${rect.top}px`;

      handle.setPointerCapture(e.pointerId);
      document.addEventListener('pointermove', onResize);
      document.addEventListener('pointerup', onResizeEnd, { once: true });
      e.preventDefault();
    });
  }

  bindResizeHandle(resizeHandleLeft);

  function onResize(e) {
    if (!resizeInfo) return;

    const dx = e.clientX - resizeInfo.startX;
    const dy = e.clientY - resizeInfo.startY;

    const maxHeight = Math.max(resizeInfo.minHeight, window.innerHeight - resizeInfo.startTop - 20);
    const height = Math.max(resizeInfo.minHeight, Math.min(maxHeight, resizeInfo.startHeight + dy));

    const minLeft = 20;
    const maxLeft = resizeInfo.startRight - resizeInfo.minWidth;
    const left = Math.max(minLeft, Math.min(maxLeft, resizeInfo.startLeft + dx));
    const width = resizeInfo.startRight - left;
    panel.style.left = `${left}px`;
    panel.style.width = `${width}px`;

    panel.style.height = `${height}px`;
  }

  function onResizeEnd() {
    resizeInfo = null;
    panel.classList.remove('resizing');
    document.removeEventListener('pointermove', onResize);
  }

  userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  userInput.addEventListener('input', () => autoResize(userInput));
  sendBtn.addEventListener('click', sendMessage);

  Array.from(document.querySelectorAll('input, select, textarea'))
    .filter((el) => !panel.contains(el))
    .forEach((el) => {
      el.addEventListener('focus', () => {
        activeField = getFieldLabel(el);
        const contextTag = panel.querySelector('#contextTag');
        const activeName = panel.querySelector('#activeFieldName');
        if (contextTag && activeName) {
          contextTag.style.display = 'block';
          activeName.textContent = activeField || el.name || el.id || 'Unbekannt';
        }
      });
    });
}

function scanFormFields(panel) {
  const nodes = Array.from(document.querySelectorAll('input, select, textarea'))
    .filter((el) => !panel.contains(el));
  const fields = [];
  const seen = new Set();

  nodes.forEach((el) => {
    if (el.type === 'hidden' || el.disabled) return;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || !el.offsetParent) return;

    const label = getFieldLabel(el) || `${el.tagName.toLowerCase()} ${el.type || ''}`.trim();
    const key = `${label}|${el.name}|${el.id}|${el.tagName}`;
    if (seen.has(key)) return;
    seen.add(key);

    fields.push({
      label,
      element: el,
      type: el.type || el.tagName.toLowerCase(),
      name: el.name,
      id: el.id
    });
  });

  return fields;
}

function renderFieldList(fields, containerId = 'fieldList') {
  const list = document.getElementById(containerId);
  if (!list) return;
  list.innerHTML = '';

  if (!fields.length) {
    list.textContent = 'Keine Formularfelder gefunden.';
    return;
  }

  fields.forEach((field) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'field-item';
    item.textContent = field.label;
    item.addEventListener('click', () => {
      focusField(field.element);
      addMessage('user', `Feld ausgewaehlt: ${field.label}`);
      askAI(`Erklaere mir das Feld "${field.label}" und was ich dort eintragen sollte.`);
    });
    list.appendChild(item);
  });
}

function focusField(el) {
  if (!el) return;
  if (typeof el.focus === 'function') el.focus();
  activeField = getFieldLabel(el);
  const tag = document.getElementById('activeFieldName');
  const contextTag = document.getElementById('contextTag');
  if (tag && contextTag) {
    tag.textContent = activeField || el.name || el.id || 'Unbekannt';
    contextTag.style.display = 'block';
  }
}

function getFieldLabel(el) {
  if (!el) return '';
  const label = el.id ? document.querySelector(`label[for="${el.id}"]`) : null;
  if (label) return label.textContent.trim();
  let parent = el.parentElement;
  while (parent && parent.tagName !== 'FORM') {
    const innerLabel = parent.querySelector('label');
    if (innerLabel) return innerLabel.textContent.trim();
    parent = parent.parentElement;
  }
  return el.placeholder || el.name || el.id || '';
}

function addMessage(role, message, trustedHtml = false) {
  const wrap = document.getElementById('chatMessages');
  if (!wrap) return;
  const div = document.createElement('div');
  div.className = 'msg ' + role;
  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';
  if (trustedHtml) {
    bubble.innerHTML = message;
  } else {
    bubble.innerHTML = formatPlainTextAsHtml(message);
  }
  div.appendChild(bubble);
  wrap.appendChild(div);
  wrap.scrollTop = wrap.scrollHeight;
}

function showTyping() {
  const wrap = document.getElementById('chatMessages');
  if (!wrap) return;
  const div = document.createElement('div');
  div.className = 'msg ai';
  div.id = 'typing';
  div.innerHTML = `<div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>`;
  wrap.appendChild(div);
  wrap.scrollTop = wrap.scrollHeight;
}

function removeTyping() {
  const t = document.getElementById('typing');
  if (t) t.remove();
}

function sendMessage() {
  const inp = document.getElementById('userInput');
  if (!inp) return;
  const text = inp.value.trim();
  if (!text) return;
  addMessage('user', text);
  inp.value = '';
  autoResize(inp);
  askAI(text);
}

function autoResize(el) {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}
(function () {
  'use strict';

  var STORAGE_KEY = 'sa_chat_v1';
  var INITIAL_MSG = {
    role: 'assistant',
    content: "Hello! \uD83D\uDC4B Welcome to Smith & Adams. I\u2019m here to help you explore our real estate and residency opportunities in Portugal. How can I assist you today?"
  };

  // ─── STATE ─────────────────────────────────────────────────────────────────
  var state = {
    open:     false,
    history:  [INITIAL_MSG],
    leadData: { name: null, country_of_residence: null, email: null, phone_whatsapp: null },
    crmDone:  false
  };

  function saveState() {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
  }
  function loadState() {
    try {
      var s = sessionStorage.getItem(STORAGE_KEY);
      if (s) { var p = JSON.parse(s); state.history = p.history || [INITIAL_MSG]; state.leadData = p.leadData || state.leadData; state.crmDone = p.crmDone || false; }
    } catch (e) {}
  }

  // ─── STYLES ────────────────────────────────────────────────────────────────
  function injectStyles() {
    var css = [
      '#sa-btn-wrap{position:fixed;bottom:28px;right:28px;z-index:99999;display:flex;flex-direction:column;align-items:flex-end;gap:10px}',
      '#sa-btn{position:relative;width:56px;height:56px;border-radius:50%;background:#38BDF8;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(56,189,248,.55);transition:transform .2s,box-shadow .2s;flex-shrink:0}',
      '#sa-btn:hover{transform:scale(1.08);box-shadow:0 6px 32px rgba(56,189,248,.7)}',
      '#sa-btn::before{content:"";position:absolute;inset:-6px;border-radius:50%;border:2.5px solid rgba(56,189,248,.5);animation:sa-pulse 2.2s ease-out infinite}',
      '#sa-btn::after{content:"";position:absolute;inset:-12px;border-radius:50%;border:2px solid rgba(56,189,248,.22);animation:sa-pulse 2.2s ease-out .5s infinite}',
      '@keyframes sa-pulse{0%{transform:scale(1);opacity:1}100%{transform:scale(1.45);opacity:0}}',
      '#sa-tooltip{background:#fff;color:#0C1E28;font-size:12.5px;line-height:1.45;font-family:Satoshi,sans-serif;padding:9px 13px 9px 13px;border-radius:10px;box-shadow:0 4px 20px rgba(12,30,40,.18);max-width:190px;text-align:right;position:relative;opacity:0;transform:translateY(6px);transition:opacity .25s ease,transform .25s ease;pointer-events:none}',
      '#sa-tooltip.sa-tt-show{opacity:1;transform:translateY(0);pointer-events:all}',
      '#sa-tooltip::after{content:"";position:absolute;bottom:-6px;right:20px;width:12px;height:12px;background:#fff;transform:rotate(45deg);box-shadow:3px 3px 8px rgba(12,30,40,.08)}',
      '#sa-tooltip strong{display:block;font-weight:700;font-size:13px;margin-bottom:2px;color:#0284C7}',
      '#sa-tt-close{position:absolute;top:5px;left:7px;background:none;border:none;cursor:pointer;color:rgba(12,30,40,.3);font-size:15px;line-height:1;padding:0;transition:color .15s}',
      '#sa-tt-close:hover{color:#0C1E28}',
      '#sa-win{position:fixed;bottom:96px;right:28px;z-index:99999;width:360px;max-width:calc(100vw - 40px);height:520px;max-height:calc(100vh - 120px);background:#FDFCF9;border-radius:16px;box-shadow:0 16px 56px rgba(12,30,40,.18);display:flex;flex-direction:column;overflow:hidden;opacity:0;transform:translateY(16px) scale(.97);pointer-events:none;transition:opacity .2s ease,transform .25s cubic-bezier(.34,1.56,.64,1);font-family:Satoshi,sans-serif}',
      '#sa-win.sa-open{opacity:1;transform:translateY(0) scale(1);pointer-events:all}',
      '#sa-hdr{background:#0C1E28;padding:16px 20px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}',
      '#sa-hdr-left{display:flex;align-items:center;gap:12px}',
      '#sa-avatar{width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.1);display:flex;align-items:center;justify-content:center;flex-shrink:0}',
      '#sa-hdr-title{color:#fff;font-weight:700;font-size:14px;line-height:1.2;font-family:Satoshi,sans-serif}',
      '#sa-hdr-sub{color:#9ab4c2;font-size:12px;font-family:Satoshi,sans-serif}',
      '#sa-close{background:none;border:none;cursor:pointer;color:rgba(255,255,255,.45);padding:4px;display:flex;align-items:center;transition:color .2s}',
      '#sa-close:hover{color:#fff}',
      '#sa-msgs{flex:1;overflow-y:auto;padding:20px 16px;display:flex;flex-direction:column;gap:10px;scroll-behavior:smooth}',
      '#sa-msgs::-webkit-scrollbar{width:3px}',
      '#sa-msgs::-webkit-scrollbar-thumb{background:rgba(12,30,40,.12);border-radius:4px}',
      '.sa-m{display:flex;flex-direction:column;max-width:84%;animation:sa-in .18s ease}',
      '@keyframes sa-in{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}',
      '.sa-m.b{align-self:flex-start}.sa-m.u{align-self:flex-end}',
      '.sa-bubble{padding:10px 14px;border-radius:12px;font-size:14px;line-height:1.55;word-break:break-word}',
      '.sa-m.b .sa-bubble{background:#f0ede8;color:#0C1E28;border-bottom-left-radius:3px}',
      '.sa-m.u .sa-bubble{background:#0C1E28;color:#fff;border-bottom-right-radius:3px}',
      '#sa-typing{display:flex;align-items:center;gap:4px;padding:10px 14px;background:#f0ede8;border-radius:12px;border-bottom-left-radius:3px;width:fit-content;align-self:flex-start}',
      '#sa-typing span{width:6px;height:6px;border-radius:50%;background:#0C1E28;opacity:.35;animation:sa-dot 1.2s infinite}',
      '#sa-typing span:nth-child(2){animation-delay:.2s}',
      '#sa-typing span:nth-child(3){animation-delay:.4s}',
      '@keyframes sa-dot{0%,60%,100%{transform:translateY(0);opacity:.35}30%{transform:translateY(-4px);opacity:1}}',
      '#sa-footer{padding:12px 16px;border-top:1px solid rgba(12,30,40,.07);display:flex;gap:8px;background:#FDFCF9;flex-shrink:0;align-items:flex-end}',
      '#sa-input{flex:1;border:1px solid rgba(12,30,40,.14);border-radius:20px;padding:10px 16px;font-size:14px;font-family:Satoshi,sans-serif;color:#0C1E28;background:#fff;outline:none;resize:none;transition:border-color .2s;line-height:1.45;max-height:96px;overflow-y:auto}',
      '#sa-input:focus{border-color:#0C1E28}',
      '#sa-input::placeholder{color:rgba(12,30,40,.32)}',
      '#sa-send{width:40px;height:40px;flex-shrink:0;background:#0C1E28;border:none;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .2s,transform .15s}',
      '#sa-send:hover{background:#1a3242;transform:scale(1.06)}',
      '#sa-send:disabled{background:rgba(12,30,40,.18);cursor:not-allowed;transform:none}',
      '#sa-powered{text-align:center;padding:5px 0 10px;font-size:11px;color:rgba(12,30,40,.28);font-family:Satoshi,sans-serif;flex-shrink:0;letter-spacing:.02em}',
      '@media(max-width:480px){#sa-btn-wrap{bottom:16px;right:14px}#sa-win{bottom:82px;right:10px;left:10px;width:auto;max-width:none}#sa-tooltip{max-width:calc(100vw - 100px)}}',
      '#sa-notice{background:#D6EAF5;padding:10px 16px;display:flex;align-items:flex-start;gap:9px;flex-shrink:0;border-bottom:1px solid rgba(12,30,40,.06)}',
      '#sa-notice-icon{flex-shrink:0;margin-top:1px;color:#2074A0}',
      '#sa-notice-text{font-size:12.5px;line-height:1.45;color:#1A3E52;font-family:Satoshi,sans-serif}',
      '#sa-notice-text strong{font-weight:700}'
    ].join('');
    var el = document.createElement('style');
    el.textContent = css;
    document.head.appendChild(el);
  }

  // ─── BUILD DOM ─────────────────────────────────────────────────────────────
  function buildDOM() {
    // Wrapper holds tooltip + button
    var wrap = document.createElement('div');
    wrap.id = 'sa-btn-wrap';

    // Tooltip callout above button
    var tooltip = document.createElement('div');
    tooltip.id = 'sa-tooltip';
    tooltip.innerHTML =
      '<button id="sa-tt-close" aria-label="Close">&times;</button>' +
      '<strong>&#128197; Schedule a Consultant</strong>' +
      'Speak with one of our consultants \u2014 we\u2019ll get back to you within 24 hours.';

    // Main FAB button
    var btn = document.createElement('button');
    btn.id = 'sa-btn';
    btn.setAttribute('aria-label', 'Abrir chat — agendar consulta');
    btn.innerHTML = iconChat();

    wrap.appendChild(tooltip);
    wrap.appendChild(btn);

    var win = document.createElement('div');
    win.id = 'sa-win';
    win.setAttribute('role', 'dialog');
    win.setAttribute('aria-label', 'Smith & Adams Chat');
    win.innerHTML =
      '<div id="sa-hdr">' +
        '<div id="sa-hdr-left">' +
          '<div id="sa-avatar">' + iconUser() + '</div>' +
          '<div><div id="sa-hdr-title">Smith &amp; Adams</div><div id="sa-hdr-sub">AI Assistant</div></div>' +
        '</div>' +
        '<button id="sa-close" aria-label="Close">' + iconX() + '</button>' +
      '</div>' +
      '<div id="sa-notice">' +
        '<div id="sa-notice-icon">' + iconCalendar() + '</div>' +
        '<div id="sa-notice-text"><strong>Book a free consultation</strong> — chat with our AI assistant and a specialist will contact you within 24 hours.</div>' +
      '</div>' +
      '<div id="sa-msgs"></div>' +
      '<div id="sa-footer">' +
        '<textarea id="sa-input" rows="1" placeholder="Type a message\u2026" maxlength="600"></textarea>' +
        '<button id="sa-send" aria-label="Send">' + iconSend() + '</button>' +
      '</div>' +
      '<div id="sa-powered">Smith &amp; Adams &middot; AI Assistant</div>';

    document.body.appendChild(wrap);
    document.body.appendChild(win);

    // Auto-show tooltip after 1.5s, auto-hide after 7s
    setTimeout(function () {
      tooltip.classList.add('sa-tt-show');
      setTimeout(function () { tooltip.classList.remove('sa-tt-show'); }, 7000);
    }, 1500);

    document.getElementById('sa-tt-close').addEventListener('click', function (e) {
      e.stopPropagation();
      tooltip.classList.remove('sa-tt-show');
    });
  }

  // ─── ICONS ─────────────────────────────────────────────────────────────────
  function iconChat()     { return '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'; }
  function iconX()        { return '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'; }
  function iconUser()     { return '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'; }
  function iconSend()     { return '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>'; }
  function iconCalendar() { return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>'; }

  // ─── MESSAGES ──────────────────────────────────────────────────────────────
  function renderAll() {
    var c = document.getElementById('sa-msgs');
    c.innerHTML = '';
    state.history.forEach(function (m) { appendBubble(m.role, m.content, false); });
    scrollDown();
  }

  function appendBubble(role, text, animate) {
    if (animate === undefined) animate = true;
    var c    = document.getElementById('sa-msgs');
    var wrap = document.createElement('div');
    wrap.className = 'sa-m ' + (role === 'user' ? 'u' : 'b');
    if (!animate) wrap.style.animation = 'none';
    var bub  = document.createElement('div');
    bub.className = 'sa-bubble';
    bub.textContent = text;
    wrap.appendChild(bub);
    c.appendChild(wrap);
    scrollDown();
  }

  function showTyping() {
    var c = document.getElementById('sa-msgs');
    var t = document.createElement('div');
    t.id = 'sa-typing';
    t.innerHTML = '<span></span><span></span><span></span>';
    c.appendChild(t);
    scrollDown();
  }

  function hideTyping() {
    var t = document.getElementById('sa-typing');
    if (t) t.parentNode.removeChild(t);
  }

  function scrollDown() {
    var c = document.getElementById('sa-msgs');
    setTimeout(function () { c.scrollTop = c.scrollHeight; }, 40);
  }

  // ─── SEND ──────────────────────────────────────────────────────────────────
  function send(text) {
    text = text.trim();
    if (!text) return;

    var input  = document.getElementById('sa-input');
    var sendBtn = document.getElementById('sa-send');

    input.value = '';
    input.style.height = 'auto';
    input.disabled = true;
    sendBtn.disabled = true;

    // Append user message to history and render
    state.history.push({ role: 'user', content: text });
    appendBubble('user', text);
    saveState();

    showTyping();

    // Send to API — pass history without the last user message (API adds it via `message`)
    fetch('/api/chat', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message:  text,
        history:  state.history.slice(0, -1),
        leadData: state.leadData
      })
    })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      hideTyping();
      var reply = data.reply || "I\u2019m sorry, I couldn\u2019t process that. Please try again.";
      state.history.push({ role: 'assistant', content: reply });
      if (data.leadData)      state.leadData = data.leadData;
      if (data.shouldCreateCrm) state.crmDone = true;
      appendBubble('bot', reply);
      saveState();
    })
    .catch(function () {
      hideTyping();
      var err = "Sorry, I\u2019m having trouble connecting right now. Please try again in a moment.";
      state.history.push({ role: 'assistant', content: err });
      appendBubble('bot', err);
    })
    .finally(function () {
      input.disabled  = false;
      sendBtn.disabled = false;
      input.focus();
    });
  }

  // ─── OPEN / CLOSE ──────────────────────────────────────────────────────────
  function openChat() {
    var win = document.getElementById('sa-win');
    var btn = document.getElementById('sa-btn');
    var tooltip = document.getElementById('sa-tooltip');
    state.open = true;
    win.classList.add('sa-open');
    btn.innerHTML = iconX();
    btn.style.background = '#0C1E28';
    if (tooltip) tooltip.classList.remove('sa-tt-show');
    renderAll();
    setTimeout(function () { document.getElementById('sa-input').focus(); }, 280);
  }

  function closeChat() {
    var win = document.getElementById('sa-win');
    var btn = document.getElementById('sa-btn');
    state.open = false;
    win.classList.remove('sa-open');
    btn.innerHTML = iconChat();
    btn.style.background = '#38BDF8';
  }

  // ─── INIT ──────────────────────────────────────────────────────────────────
  function init() {
    loadState();
    injectStyles();
    buildDOM();

    document.getElementById('sa-btn-wrap').addEventListener('click', function (e) {
      if (e.target.id === 'sa-tt-close') return;
    });
    document.getElementById('sa-btn').addEventListener('click', function () {
      state.open ? closeChat() : openChat();
    });

    document.getElementById('sa-close').addEventListener('click', closeChat);

    var input = document.getElementById('sa-input');
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        send(input.value);
      }
    });
    input.addEventListener('input', function () {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 96) + 'px';
    });

    document.getElementById('sa-send').addEventListener('click', function () {
      send(input.value);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

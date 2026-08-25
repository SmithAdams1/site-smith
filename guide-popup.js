/* Investor-guide lead pop-up.
 * Self-contained: injects its own styles and markup, so it works on any page
 * regardless of the page's own CSS. Collects name + email + consent, posts to
 * /api/guide, which emails the requester the branded guide. EN/PT aware.
 * Shows once per visitor (localStorage), after a delay or on scroll depth.
 */
(function () {
  'use strict';
  if (window.self !== window.top) return;            // never inside an embed (Studio)
  var KEY = 'sa_guide_v1';
  try { if (localStorage.getItem(KEY)) return; } catch (e) {}

  var path = location.pathname.toLowerCase();
  // Not on pages where it would be noise or intrusive.
  if (/\/(contact|admin|studio|page|thank)/.test(path)) return;

  var PT = (document.documentElement.lang || '').toLowerCase().indexOf('pt') === 0
        || path.indexOf('/pt/') === 0 || path === '/pt';

  var T = PT ? {
    eyebrow: 'GUIA DO INVESTIDOR · PORTUGAL',
    title: 'Porquê investir em Portugal?',
    body: 'Portugal registou o maior crescimento de preços residenciais da UE em 2025. Receba o guia gratuito — fundamentos do mercado, custos reais de uma compra e como investir bem.',
    name: 'Nome', email: 'Email',
    consent: 'Aceito receber o guia e comunicações ocasionais da Smith &amp; Adams. Posso cancelar quando quiser.',
    cta: 'Enviar-me o guia', sending: 'A enviar…',
    okTitle: 'Está a caminho.', okBody: 'Enviámos o guia para o seu email. Pode também descarregá-lo já aqui:',
    okLink: 'Descarregar o guia (PDF)',
    errName: 'Escreva o seu nome.', errEmail: 'Escreva um email válido.', errConsent: 'É preciso o seu consentimento.',
    errSend: 'Não foi possível enviar. Tente novamente.', close: 'Fechar'
  } : {
    eyebrow: 'INVESTOR GUIDE · PORTUGAL',
    title: 'Why invest in Portugal?',
    body: 'Portugal recorded the EU’s strongest residential price growth in 2025. Get the free guide — market fundamentals, what a purchase really costs, and how to invest well.',
    name: 'Name', email: 'Email',
    consent: 'I agree to receive the guide and occasional updates from Smith &amp; Adams. I can unsubscribe anytime.',
    cta: 'Send me the guide', sending: 'Sending…',
    okTitle: 'It’s on its way.', okBody: 'We’ve emailed the guide to you. You can also download it right here:',
    okLink: 'Download the guide (PDF)',
    errName: 'Please enter your name.', errEmail: 'Please enter a valid email.', errConsent: 'Please tick consent to continue.',
    errSend: 'Could not send. Please try again.', close: 'Close'
  };

  var css = ''
    + '.sag-ov{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:20px;'
    + 'background:rgba(17,34,45,.55);opacity:0;transition:opacity .35s ease;-webkit-backdrop-filter:blur(2px);backdrop-filter:blur(2px);}'
    + '.sag-ov.sag-on{opacity:1;}'
    + '.sag-box{position:relative;display:flex;width:100%;max-width:760px;background:#FDFCF9;box-shadow:0 30px 80px rgba(17,34,45,.35);'
    + 'transform:translateY(14px);transition:transform .45s cubic-bezier(.16,1,.3,1);overflow:hidden;}'
    + '.sag-ov.sag-on .sag-box{transform:none;}'
    + '.sag-media{flex:0 0 40%;background:#11222D;}'
    + '.sag-media img{width:100%;height:100%;object-fit:cover;display:block;}'
    + '.sag-body{flex:1;padding:34px 34px 30px;}'
    + '.sag-eyebrow{font:500 10px/1 "Helvetica Neue",Helvetica,Arial,sans-serif;letter-spacing:.22em;color:#6A7883;text-transform:uppercase;margin:0 0 14px;}'
    + '.sag-h{font-family:"Playfair Display",Georgia,serif;font-weight:500;color:#11222D;font-size:27px;line-height:1.12;letter-spacing:-.01em;margin:0 0 12px;}'
    + '.sag-p{font:400 14px/1.6 "Helvetica Neue",Helvetica,Arial,sans-serif;color:#26333C;margin:0 0 18px;}'
    + '.sag-f{display:block;margin:0 0 11px;}'
    + '.sag-f input[type=text],.sag-f input[type=email]{width:100%;box-sizing:border-box;border:1px solid #d9d5cc;background:#fff;'
    + 'font:400 15px "Helvetica Neue",Helvetica,Arial,sans-serif;color:#11222D;padding:12px 13px;border-radius:2px;outline:none;}'
    + '.sag-f input:focus{border-color:#11222D;}'
    + '.sag-consent{display:flex;gap:9px;align-items:flex-start;font:400 12px/1.5 "Helvetica Neue",Helvetica,Arial,sans-serif;color:#6A7883;margin:4px 0 16px;}'
    + '.sag-consent input{margin-top:2px;flex:0 0 auto;}'
    + '.sag-btn{width:100%;border:0;background:#11222D;color:#fff;font:600 15px "Helvetica Neue",Helvetica,Arial,sans-serif;'
    + 'padding:14px;border-radius:2px;cursor:pointer;transition:background .25s ease;}'
    + '.sag-btn:hover{background:#1c3646;}.sag-btn[disabled]{opacity:.6;cursor:default;}'
    + '.sag-x{position:absolute;top:12px;right:12px;z-index:2;width:30px;height:30px;border:0;border-radius:50%;cursor:pointer;'
    + 'background:rgba(255,255,255,.14);color:#fff;font-size:17px;line-height:30px;}'
    + '.sag-body .sag-x{background:rgba(17,34,45,.08);color:#11222D;}'
    + '.sag-err{font:500 12px "Helvetica Neue",Helvetica,Arial,sans-serif;color:#b3261e;min-height:16px;margin:2px 0 8px;}'
    + '.sag-oklink{display:inline-block;margin-top:6px;font:600 14px "Helvetica Neue",Helvetica,Arial,sans-serif;color:#11222D;text-decoration:underline;}'
    + '@media (max-width:640px){.sag-media{display:none;}.sag-box{max-width:440px;}.sag-body{padding:44px 24px 26px;}.sag-h{font-size:24px;}}'
    + '@media (prefers-reduced-motion:reduce){.sag-ov,.sag-box{transition:none;}}';

  function h(html) { var d = document.createElement('div'); d.innerHTML = html; return d.firstElementChild; }

  var shown = false;
  function show() {
    if (shown) return; shown = true;
    try { localStorage.setItem(KEY, 'seen'); } catch (e) {}
    var style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);

    var ov = h(''
      + '<div class="sag-ov" role="dialog" aria-modal="true" aria-label="' + T.title + '">'
      +   '<div class="sag-box">'
      +     '<div class="sag-media"><img src="/guide-cover.jpg" alt=""></div>'
      +     '<button class="sag-x" type="button" aria-label="' + T.close + '">&times;</button>'
      +     '<div class="sag-body">'
      +       '<p class="sag-eyebrow">' + T.eyebrow + '</p>'
      +       '<h2 class="sag-h">' + T.title + '</h2>'
      +       '<p class="sag-p">' + T.body + '</p>'
      +       '<form class="sag-form" novalidate>'
      +         '<label class="sag-f"><input type="text" name="name" placeholder="' + T.name + '" autocomplete="name"></label>'
      +         '<label class="sag-f"><input type="email" name="email" placeholder="' + T.email + '" autocomplete="email"></label>'
      +         '<label class="sag-consent"><input type="checkbox" name="consent"><span>' + T.consent + '</span></label>'
      +         '<div class="sag-err" aria-live="polite"></div>'
      +         '<button class="sag-btn" type="submit">' + T.cta + '</button>'
      +       '</form>'
      +     '</div>'
      +   '</div>'
      + '</div>');
    document.body.appendChild(ov);
    requestAnimationFrame(function () { ov.classList.add('sag-on'); });

    var box = ov.querySelector('.sag-box');
    var form = ov.querySelector('.sag-form');
    var err = ov.querySelector('.sag-err');

    function close() {
      ov.classList.remove('sag-on');
      setTimeout(function () { ov.remove(); }, 400);
      document.removeEventListener('keydown', onKey);
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    ov.querySelector('.sag-x').addEventListener('click', close);
    ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
    document.addEventListener('keydown', onKey);
    setTimeout(function () { var n = form.name; if (n) n.focus(); }, 450);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = form.name.value.trim();
      var email = form.email.value.trim();
      var consent = form.consent.checked;
      if (!name) { err.textContent = T.errName; return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { err.textContent = T.errEmail; return; }
      if (!consent) { err.textContent = T.errConsent; return; }
      err.textContent = '';
      var btn = form.querySelector('.sag-btn');
      btn.disabled = true; btn.textContent = T.sending;

      fetch('/api/guide', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name, email: email, consent: true, locale: PT ? 'pt' : 'en' })
      }).then(function (r) { return r.ok ? r.json() : Promise.reject(); })
        .then(function (d) {
          try { localStorage.setItem(KEY, 'done'); } catch (e) {}
          var url = (d && d.guideUrl) || '/smith-adams-investor-guide-portugal.pdf';
          box.querySelector('.sag-body').innerHTML =
            '<p class="sag-eyebrow">' + T.eyebrow + '</p>'
          + '<h2 class="sag-h">' + T.okTitle + '</h2>'
          + '<p class="sag-p">' + T.okBody + '</p>'
          + '<a class="sag-oklink" href="' + url + '" target="_blank" rel="noopener">' + T.okLink + ' &rarr;</a>';
        })
        .catch(function () {
          err.textContent = T.errSend; btn.disabled = false; btn.textContent = T.cta;
        });
    });
  }

  // Triggers: whichever fires first — a dwell timer or scrolling past ~45%.
  var timer = setTimeout(show, 20000);
  function onScroll() {
    var sc = window.scrollY || document.documentElement.scrollTop;
    var h2 = document.documentElement.scrollHeight - window.innerHeight;
    if (h2 > 0 && sc / h2 > 0.45) { clearTimeout(timer); window.removeEventListener('scroll', onScroll); show(); }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
})();

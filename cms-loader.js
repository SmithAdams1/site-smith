(function () {
  const SUPABASE_URL = 'https://bcjtkfipcfvvitglgpys.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjanRrZmlwY2Z2dml0Z2xncHlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNDU3NjcsImV4cCI6MjA5MTgyMTc2N30.kgnE2E-xDQT855to1Nz8LNKtwIBGw2QsIw81Us3B_ZA';

  const DEFAULT_LOCALE = 'en';
  const SUPPORTED_LOCALES = ['en', 'pt'];

  // ─── Esconder o item "Urban Collection" do menu (nav + mobile + footer) ──
  // Solicitação do cliente: ocultar sem apagar. Para reativar, basta remover
  // este bloco de CSS. Os links e a página /urban-collection continuam ativos.
  (function hideUrbanCollectionNav() {
    const css = '' +
      'header div.relative.group:has(> a[href="urban-collection.html"]),' +
      '#mobile-menu a[href="urban-collection.html"],' +
      'footer li:has(> a[href="urban-collection.html"])' +
      '{ display:none !important; }';
    const style = document.createElement('style');
    style.id = 'hide-urban-collection-nav';
    style.textContent = css;
    (document.head || document.documentElement).appendChild(style);
  })();

  function getLocale() {
    try {
      const v = localStorage.getItem('cmsLocale');
      if (v && SUPPORTED_LOCALES.includes(v)) return v;
    } catch (_) {}
    return DEFAULT_LOCALE;
  }

  function setLocale(loc) {
    if (!SUPPORTED_LOCALES.includes(loc)) return;
    try { localStorage.setItem('cmsLocale', loc); } catch (_) {}
    location.reload();
  }

  function applyValue(el, value) {
    if (value == null) return;
    const tag = el.tagName;
    const attr = el.dataset.cmsAttr;
    const type = el.dataset.cmsType;

    if (type === 'stars') {
      const n = Math.max(0, Math.min(5, parseInt(value, 10) || 0));
      const size = el.dataset.starSize || '16';
      const color = el.dataset.starColor || '#FBBC05';
      let html = '';
      for (let i = 0; i < n; i++) {
        html += `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
      }
      el.innerHTML = html;
      return;
    }

    if (attr === 'bg') {
      el.style.backgroundImage = `url('${value}')`;
      return;
    }
    if (attr === 'href') {
      el.setAttribute('href', value);
      return;
    }
    if (attr === 'src') {
      el.setAttribute('src', value);
      return;
    }
    if (attr === 'html') {
      el.innerHTML = value;
      return;
    }

    if (tag === 'IMG' || tag === 'SOURCE') {
      el.setAttribute('src', value);
      if (el.hasAttribute('srcset')) el.setAttribute('srcset', value);
      return;
    }
    if (tag === 'IFRAME' || tag === 'VIDEO') {
      el.setAttribute('src', value);
      return;
    }
    if (tag === 'A') {
      el.setAttribute('href', value);
      return;
    }
    // Auto-detecta HTML: se o valor contém tags ou HTML entities (&amp;, &lt;, etc.),
    // aplica via innerHTML para que o browser decodifique. Isso evita o bug onde
    // valores como "S&amp;A" salvos por richtext apareciam literais com textContent.
    if (/<[a-z][\s\S]*?>/i.test(value) || /&[a-zA-Z]+;|&#\d+;/.test(value)) {
      el.innerHTML = value;
    } else {
      el.textContent = value;
    }
  }

  async function loadContent() {
    // Não capturamos os targets aqui: alguns scripts da página (ex: marquee de
    // testimonials no index.html) clonam/recriam nós com data-cms durante o
    // DOMContentLoaded. Se guardarmos referências antes do fetch, aplicamos
    // valores em nós que já foram removidos do DOM. Re-query depois do fetch.
    if (document.querySelector('[data-cms]') === null) return;

    const locale = getLocale();
    // Busca linhas no idioma escolhido + o default (en) como fallback,
    // numa única request. Se locale === 'en', traz só 'en'.
    const localeFilter = locale === DEFAULT_LOCALE
      ? `eq.${DEFAULT_LOCALE}`
      : `in.(${locale},${DEFAULT_LOCALE})`;

    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/site_content?select=key,value,locale&locale=${localeFilter}`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
        }
      );
      if (!res.ok) {
        console.warn('[cms-loader] fetch failed', res.status);
        return;
      }
      const rows = await res.json();
      // Constrói mapa: prefere o locale escolhido, cai no DEFAULT_LOCALE se faltar.
      const map = Object.create(null);
      for (const r of rows) {
        if (r.locale === locale) {
          map[r.key] = r.value;
        } else if (!(r.key in map) && r.locale === DEFAULT_LOCALE) {
          map[r.key] = r.value;
        }
      }

      // Re-query agora — após o fetch — para pegar nós clonados/movidos por
      // scripts que rodam em paralelo (ex: marquee de testimonials).
      document.querySelectorAll('[data-cms]').forEach((el) => {
        const key = el.dataset.cms;
        if (key in map) applyValue(el, map[key]);
      });

      document.dispatchEvent(new CustomEvent('cms-loaded', { detail: { count: rows.length, locale } }));
    } catch (e) {
      console.warn('[cms-loader] error', e);
    }
  }

  // ============================================================
  // Language switcher injection (no per-page HTML changes needed)
  // ============================================================

  function makeSwitcher(currentLocale, theme) {
    const wrap = document.createElement('div');
    wrap.className = 'cms-lang-switcher';
    wrap.style.cssText = 'display:inline-flex; align-items:center; margin-left:8px;';

    const sel = document.createElement('select');
    sel.setAttribute('aria-label', 'Language');
    // theme === 'dark'  → header com fundo escuro (texto branco). Switcher fica BRANCO.
    // theme === 'light' → header com fundo branco (texto escuro). Switcher fica AZUL.
    const isDarkBg = theme === 'dark';
    const bg     = isDarkBg ? '#ffffff' : '#0C1E28';
    const fg     = isDarkBg ? '#0C1E28' : '#ffffff';
    const stroke = isDarkBg ? '%230C1E28' : '%23ffffff';
    sel.style.cssText = [
      'appearance:none',
      '-webkit-appearance:none',
      `background-color:${bg}`,
      `color:${fg}`,
      'border:none',
      'padding:6px 28px 6px 12px',
      'border-radius:9999px',
      'font-size:13px',
      'font-weight:600',
      'cursor:pointer',
      'font-family:inherit',
      "background-image:url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='" + stroke + "' stroke-width='2.5'><polyline points='6 9 12 15 18 9'/></svg>\")",
      'background-repeat:no-repeat',
      'background-position:right 8px center',
      'background-size:10px',
    ].join(';');

    sel.innerHTML = `
      <option value="en" ${currentLocale==='en'?'selected':''}>🇬🇧 EN</option>
      <option value="pt" ${currentLocale==='pt'?'selected':''}>🇧🇷 pt-BR</option>
    `;
    // Forçar a cor das options no mobile/desktop (background dropdown branco)
    sel.querySelectorAll('option').forEach(o => { o.style.color = '#0C1E28'; o.style.background = '#ffffff'; });

    sel.addEventListener('change', (e) => setLocale(e.target.value));
    wrap.appendChild(sel);
    return wrap;
  }

  function detectTheme(navEl) {
    // Para nossas páginas: maioria dos headers tem texto branco sobre fundo dark.
    // Heurística: se o nav tem className contendo 'text-white' ou seu link tem cor branca → dark theme.
    const link = navEl.querySelector('a');
    if (!link) return 'dark';
    const c = getComputedStyle(link).color;
    // c é "rgb(...)". Converter em luminância simples.
    const m = c.match(/\d+/g);
    if (!m) return 'dark';
    const r = +m[0], g = +m[1], b = +m[2];
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return lum > 0.6 ? 'dark' : 'light'; // se texto é claro, fundo é dark → switcher claro
  }

  function injectSwitcher() {
    const currentLocale = getLocale();

    // Desktop nav: <nav class="hidden lg:flex ...">
    const desktopNav = document.querySelector('header nav.hidden.lg\\:flex, header nav.lg\\:flex');
    if (desktopNav && !desktopNav.querySelector('.cms-lang-switcher')) {
      const theme = detectTheme(desktopNav);
      desktopNav.appendChild(makeSwitcher(currentLocale, theme));
    }

    // Mobile menu: <div id="mobile-menu">
    const mobile = document.getElementById('mobile-menu');
    if (mobile && !mobile.querySelector('.cms-lang-switcher')) {
      const inner = mobile.querySelector('.flex.flex-col') || mobile;
      const sw = makeSwitcher(currentLocale, 'light');
      sw.style.marginTop = '24px';
      sw.style.marginLeft = '0';
      inner.appendChild(sw);
    }

    // Headers de páginas tipo contact que têm um <header> próprio com classe diferente
    // (caso o seletor acima não pegue). Tentativa de fallback:
    if (!desktopNav) {
      const anyNav = document.querySelector('header nav, nav.hidden, nav[class*="flex"]');
      if (anyNav && !anyNav.querySelector('.cms-lang-switcher')) {
        const theme = detectTheme(anyNav);
        anyNav.appendChild(makeSwitcher(currentLocale, theme));
      }
    }
  }

  // ============================================================
  // "Invest in Portugal" nav item injection (separador novo).
  // Injeta no nav desktop, no menu mobile e na lista do footer de
  // TODAS as páginas, sem precisar editar cada header. Idempotente:
  // se o link já existir (ex: na própria página invest-in-portugal),
  // não duplica. Mantém o label em inglês como o resto do menu.
  // ============================================================
  function injectInvestNav() {
    var HREF = 'invest-in-portugal.html';
    var LABEL = 'Invest in Portugal';

    // Desktop nav
    var nav = document.querySelector('header nav.hidden.lg\\:flex, header nav.lg\\:flex');
    if (nav && !nav.querySelector('a[href="' + HREF + '"]')) {
      var wrap = document.createElement('div');
      wrap.className = 'relative group';
      wrap.innerHTML =
        '<a class="text-white transition-colors duration-300 font-satoshi hover:text-gray-300 satoshi" href="' + HREF + '">' + LABEL + '</a>' +
        '<span class="absolute -bottom-1 left-0 w-0 h-0.5 bg-white rounded-full transition-all duration-300 group-hover:w-full"></span>';
      var pm = nav.querySelector('a[href="property-management.html"]');
      var pmWrap = pm && pm.closest('.relative.group');
      if (pmWrap && pmWrap.parentNode === nav) {
        pmWrap.insertAdjacentElement('afterend', wrap);
      } else if (nav.lastElementChild) {
        nav.insertBefore(wrap, nav.lastElementChild);
      } else {
        nav.appendChild(wrap);
      }
    }

    // Mobile menu
    var mobileInner = document.querySelector('#mobile-menu .flex.flex-col');
    if (mobileInner && !mobileInner.querySelector('a[href="' + HREF + '"]')) {
      var a = document.createElement('a');
      a.className = 'text-2xl font-medium transition-colors duration-300 text-gray-300 hover:text-white satoshi';
      a.href = HREF;
      a.textContent = LABEL;
      var pmM = mobileInner.querySelector('a[href="property-management.html"]');
      if (pmM) {
        pmM.insertAdjacentElement('afterend', a);
      } else if (mobileInner.lastElementChild) {
        mobileInner.insertBefore(a, mobileInner.lastElementChild);
      } else {
        mobileInner.appendChild(a);
      }
    }

    // Footer "Menu" list (primeira ul.list-none)
    var footerList = document.querySelector('footer ul.list-none');
    if (footerList && !footerList.querySelector('a[href="' + HREF + '"]')) {
      var li = document.createElement('li');
      li.className = 'font-normal satoshi text-[15px] text-gray-300 hover:text-white transition-all ease-in-out cursor-pointer';
      li.innerHTML = '<a href="' + HREF + '">' + LABEL + '</a>';
      var pmF = footerList.querySelector('a[href="property-management.html"]');
      var pmLi = pmF && pmF.closest('li');
      if (pmLi) pmLi.insertAdjacentElement('afterend', li);
      else footerList.appendChild(li);
    }
  }

  // ============================================================
  // "Real Estate" nav item injection. Inserido ENTRE "Invest in
  // Portugal" e "Our Developments", no nav desktop, menu mobile e
  // footer de todas as páginas. Idempotente (não duplica).
  // Corre depois de injectInvestNav para se ancorar ao link Invest.
  // ============================================================
  function injectRealEstateNav() {
    var HREF = 'real-estate.html';
    var LABEL = 'Real Estate';

    // Desktop nav: inserir a seguir ao "Invest in Portugal"
    var nav = document.querySelector('header nav.hidden.lg\\:flex, header nav.lg\\:flex');
    if (nav && !nav.querySelector('a[href="' + HREF + '"]')) {
      var wrap = document.createElement('div');
      wrap.className = 'relative group';
      wrap.innerHTML =
        '<a class="text-white transition-colors duration-300 font-satoshi hover:text-gray-300 satoshi" href="' + HREF + '">' + LABEL + '</a>' +
        '<span class="absolute -bottom-1 left-0 w-0 h-0.5 bg-white rounded-full transition-all duration-300 group-hover:w-full"></span>';
      var inv = nav.querySelector('a[href="invest-in-portugal.html"]');
      var invWrap = inv && inv.closest('.relative.group');
      if (invWrap && invWrap.parentNode === nav) {
        invWrap.insertAdjacentElement('afterend', wrap);
      } else {
        var dev = nav.querySelector('a[href="our-developments.html"]');
        var devWrap = dev && dev.closest('.relative.group');
        if (devWrap) devWrap.insertAdjacentElement('beforebegin', wrap);
        else if (nav.lastElementChild) nav.insertBefore(wrap, nav.lastElementChild);
        else nav.appendChild(wrap);
      }
    }

    // Mobile menu
    var mobileInner = document.querySelector('#mobile-menu .flex.flex-col');
    if (mobileInner && !mobileInner.querySelector('a[href="' + HREF + '"]')) {
      var a = document.createElement('a');
      a.className = 'text-2xl font-medium transition-colors duration-300 text-gray-300 hover:text-white satoshi';
      a.href = HREF; a.textContent = LABEL;
      var invM = mobileInner.querySelector('a[href="invest-in-portugal.html"]');
      var devM = mobileInner.querySelector('a[href="our-developments.html"]');
      if (invM) invM.insertAdjacentElement('afterend', a);
      else if (devM) devM.insertAdjacentElement('beforebegin', a);
      else if (mobileInner.lastElementChild) mobileInner.insertBefore(a, mobileInner.lastElementChild);
      else mobileInner.appendChild(a);
    }

    // Footer "Menu" list
    var footerList = document.querySelector('footer ul.list-none');
    if (footerList && !footerList.querySelector('a[href="' + HREF + '"]')) {
      var li = document.createElement('li');
      li.className = 'font-normal satoshi text-[15px] text-gray-300 hover:text-white transition-all ease-in-out cursor-pointer';
      li.innerHTML = '<a href="' + HREF + '">' + LABEL + '</a>';
      var invF = footerList.querySelector('a[href="invest-in-portugal.html"]');
      var invLi = invF && invF.closest('li');
      var devF = footerList.querySelector('a[href="our-developments.html"]');
      var devLi = devF && devF.closest('li');
      if (invLi) invLi.insertAdjacentElement('afterend', li);
      else if (devLi) devLi.insertAdjacentElement('beforebegin', li);
      else footerList.appendChild(li);
    }
  }

  function init() {
    loadContent();
    injectInvestNav();
    injectRealEstateNav();
    injectSwitcher();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

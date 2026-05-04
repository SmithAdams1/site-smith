(function () {
  const SUPABASE_URL = 'https://bcjtkfipcfvvitglgpys.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjanRrZmlwY2Z2dml0Z2xncHlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNDU3NjcsImV4cCI6MjA5MTgyMTc2N30.kgnE2E-xDQT855to1Nz8LNKtwIBGw2QsIw81Us3B_ZA';

  const DEFAULT_LOCALE = 'en';
  const SUPPORTED_LOCALES = ['en', 'pt'];

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
    const targets = document.querySelectorAll('[data-cms]');
    if (targets.length === 0) return;

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

      targets.forEach((el) => {
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
    const isDark = theme === 'dark';
    sel.style.cssText = [
      'appearance:none',
      '-webkit-appearance:none',
      'background:transparent',
      `color:${isDark ? '#0C1E28' : '#ffffff'}`,
      `border:1px solid ${isDark ? 'rgba(12,30,40,0.3)' : 'rgba(255,255,255,0.3)'}`,
      'padding:6px 28px 6px 12px',
      'border-radius:9999px',
      'font-size:13px',
      'font-weight:500',
      'cursor:pointer',
      'font-family:inherit',
      "background-image:url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='" + (isDark ? '%230C1E28' : '%23ffffff') + "' stroke-width='2.5'><polyline points='6 9 12 15 18 9'/></svg>\")",
      'background-repeat:no-repeat',
      'background-position:right 8px center',
      'background-size:10px',
    ].join(';');

    sel.innerHTML = `
      <option value="en" ${currentLocale==='en'?'selected':''}>🇬🇧 EN</option>
      <option value="pt" ${currentLocale==='pt'?'selected':''}>🇧🇷 PT</option>
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

  function init() {
    loadContent();
    injectSwitcher();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

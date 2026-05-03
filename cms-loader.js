(function () {
  const SUPABASE_URL = 'https://bcjtkfipcfvvitglgpys.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjanRrZmlwY2Z2dml0Z2xncHlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNDU3NjcsImV4cCI6MjA5MTgyMTc2N30.kgnE2E-xDQT855to1Nz8LNKtwIBGw2QsIw81Us3B_ZA';

  function applyValue(el, value) {
    if (value == null) return;
    const tag = el.tagName;
    const attr = el.dataset.cmsAttr;

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
    el.textContent = value;
  }

  async function loadContent() {
    const targets = document.querySelectorAll('[data-cms]');
    if (targets.length === 0) return;

    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/site_content?select=key,value`,
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
      const map = Object.create(null);
      for (const r of rows) map[r.key] = r.value;

      targets.forEach((el) => {
        const key = el.dataset.cms;
        if (key in map) applyValue(el, map[key]);
      });

      document.dispatchEvent(new CustomEvent('cms-loaded', { detail: { count: rows.length } }));
    } catch (e) {
      console.warn('[cms-loader] error', e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadContent);
  } else {
    loadContent();
  }
})();

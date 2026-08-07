// =====================================================================
// Phase 2 — design-system block renderer (the `rd-` component blocks).
// =====================================================================
// The block library IS the redesign component set: each block type maps
// to one `rd-` component with a FIXED, on-brand template and typed,
// editable fields. Add/remove/reorder blocks and edit their fields, but
// the output is always Brand-Book-compliant by construction.
//
// Same contract as lib/renderBlocks.js: pure (blocks, locale) -> HTML.
// A block is { type, data }; localized fields are { en, pt } (or a plain
// string). This module is used SSR (api) and in the Studio live editor,
// so the editor preview is byte-identical to what crawlers get.
//
// Pilot scope: the block types the About page needs. Others follow once
// About proves SSR/SEO + visual parity.
// =====================================================================

const DEFAULT_LOCALE = 'en';

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}
function escAttr(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
// Localized fields keep their inner HTML (they carry brand entities like
// &amp;, &rsquo;, <br>, <strong>); they are authored in the editor, not
// user-supplied, so we emit them as-is rather than escaping.
function pick(field, locale) {
  if (field == null) return '';
  if (typeof field === 'string') return field;
  if (typeof field !== 'object') return '';
  const v = field[locale];
  if (v != null && v !== '') return v;
  const fb = field[DEFAULT_LOCALE];
  return fb == null ? '' : fb;
}

const ARROW = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

function ctaHtml(cta, locale) {
  if (!cta || !pick(cta.label, locale)) return '';
  const ghost = cta.style === 'ghost' ? ' rd-cta--ghost' : '';
  return `<a class="rd-cta${ghost}" href="${escAttr(cta.href || 'contact.html')}">${pick(cta.label, locale)} ${ARROW}</a>`;
}

// ---- individual rd- block renderers ----------------------------------
const renderers = {
  // Full-bleed hero: media (img or video), scrim, eyebrow, h1, sub, CTAs.
  rd_hero(d, locale) {
    const media = d.video
      ? `<video ${d.autoplay ? 'data-autoplay ' : ''}muted loop playsinline preload="none"${d.poster ? ` poster="${escAttr(d.poster)}"` : ''}><source src="${escAttr(d.video)}" type="video/mp4"></video>`
      : `<img src="${escAttr(d.image || '')}" alt="${escAttr(pick(d.image_alt, locale))}" loading="eager" decoding="async">`;
    const ctas = (Array.isArray(d.ctas) ? d.ctas : []).map(c => ctaHtml(c, locale)).join('\n            ');
    return (
`      <section class="rd-hero"${d.hero_bg ? ` style="background-size:cover;background-position:center;"` : ''}>
        <div class="rd-hero__media">${media}</div>
        <div class="rd-hero__scrim"></div>
        <div class="rd-wrap rd-hero__inner">
          ${d.eyebrow ? `<p class="rd-label" style="color:rgba(255,255,255,0.62); margin:0 0 26px;">${pick(d.eyebrow, locale)}</p>` : ''}
          <h1>${pick(d.title, locale)}</h1>
          ${d.subtitle ? `<p class="rd-hero__sub">${pick(d.subtitle, locale)}</p>` : ''}
          ${ctas ? `<div class="rd-hero__row">\n            ${ctas}\n          </div>` : ''}
        </div>
        ${d.caption_k || d.caption_v ? `<div class="rd-hero__caption"><span class="rd-label k">${pick(d.caption_k, locale)}</span><span class="v">${pick(d.caption_v, locale)}</span></div>` : ''}
      </section>`
    );
  },

  // Prose section: hairline + eyebrow + serif statement + body paragraphs,
  // optional supporting image. Paper or navy.
  rd_prose(d, locale) {
    const navy = d.bg === 'navy';
    const paras = (Array.isArray(d.body) ? d.body : []).map((p, i) =>
      `<p class="rd-body reveal"${i ? ' style="margin-top:18px;"' : ' style="margin-top:26px;"'}>${pick(p, locale)}</p>`
    ).join('\n            ');
    const img = d.image ? `\n          <div class="reveal" style="margin-top:clamp(36px,5vw,64px);"><img src="${escAttr(d.image)}" alt="${escAttr(pick(d.image_alt, locale))}" loading="lazy" decoding="async" style="width:100%; aspect-ratio:16/9; object-fit:cover; display:block;"></div>` : '';
    return (
`      <section class="rd-sec${navy ? ' rd-sec--navy' : ''}"${navy ? '' : ' style="background:var(--paper);"'}>
        <div class="rd-wrap">
          ${d.hairline === false ? '' : '<hr class="rd-hair">'}
          <div style="max-width:900px; padding-top:clamp(28px,4vw,48px);">
            ${d.eyebrow ? `<p class="rd-label reveal" style="margin:0 0 22px;${navy ? 'color:rgba(255,255,255,0.55);' : ''}">${pick(d.eyebrow, locale)}</p>` : ''}
            <h2 class="rd-statement reveal" style="font-size:clamp(32px,4.6vw,64px); margin:0;${navy ? 'color:#fff;' : ''}">${pick(d.title, locale)}</h2>
            ${paras}
          </div>${img}
        </div>
      </section>`
    );
  },

  // Numbered timeline / list (rd-funcs) on navy. Each item: index, title, body.
  rd_timeline(d, locale) {
    const items = (Array.isArray(d.items) ? d.items : []).map(it =>
      `<li class="reveal"><span class="fi">${esc(pick(it.index, locale))}</span><span><span class="ft">${pick(it.title, locale)}</span><span class="fd">${pick(it.body, locale)}</span></span></li>`
    ).join('\n            ');
    return (
`      <section class="rd-sec rd-sec--navy"${d.anchor ? ` id="${escAttr(d.anchor)}"` : ''}>
        <div class="rd-wrap">
          ${d.eyebrow ? `<p class="rd-label reveal" style="color:rgba(255,255,255,0.55); margin:0 0 22px;">${pick(d.eyebrow, locale)}</p>` : ''}
          <h2 class="rd-statement reveal" style="font-size:clamp(30px,4vw,54px); color:#fff; margin:0 0 clamp(32px,4vw,56px); max-width:18ch;">${pick(d.title, locale)}</h2>
          <ul class="rd-funcs">
            ${items}
          </ul>
        </div>
      </section>`
    );
  },

  // Three (or more) editorial pillars (rd-pillars) on paper: title + body each.
  rd_pillars(d, locale) {
    const cards = (Array.isArray(d.items) ? d.items : []).map(it =>
      `<div class="reveal">\n              <h3>${pick(it.title, locale)}</h3>\n              <p>${pick(it.body, locale)}</p>\n            </div>`
    ).join('\n            ');
    return (
`      <section class="rd-sec" style="background:var(--paper);">
        <div class="rd-wrap">
          <hr class="rd-hair">
          <div style="max-width:900px; padding-top:clamp(28px,4vw,48px);">
            ${d.eyebrow ? `<p class="rd-label reveal" style="margin:0 0 22px;">${pick(d.eyebrow, locale)}</p>` : ''}
            <h2 class="rd-statement reveal" style="font-size:clamp(30px,4.4vw,58px); margin:0; max-width:18ch;">${pick(d.title, locale)}</h2>
          </div>
          <div class="rd-pillars">
            ${cards}
          </div>
        </div>
      </section>`
    );
  },

  // Big proof numbers (rd-proof) on navy + optional intro + bullet list.
  rd_proof(d, locale) {
    const stats = (Array.isArray(d.stats) ? d.stats : []).map(s =>
      `<div class="reveal"><div class="n">${pick(s.value, locale)}</div><div class="l">${pick(s.label, locale)}</div></div>`
    ).join('\n            ');
    const bullets = (Array.isArray(d.bullets) ? d.bullets : []).map((b, i) =>
      `<li class="reveal"><span class="fi">${String(i + 1).padStart(2, '0')}</span><span class="fd" style="font-size:15px; color:var(--stone);">${pick(b, locale)}</span></li>`
    ).join('\n            ');
    return (
`      <section class="rd-sec rd-sec--navy">
        <div class="rd-wrap">
          ${d.eyebrow ? `<p class="rd-label reveal" style="color:rgba(255,255,255,0.55); margin:0 0 22px;">${pick(d.eyebrow, locale)}</p>` : ''}
          <h2 class="rd-statement reveal" style="font-size:clamp(30px,4vw,54px); color:#fff; margin:0; max-width:18ch;">${pick(d.title, locale)}</h2>
          ${d.body ? `<p class="rd-body reveal" style="margin-top:24px; max-width:70ch;">${pick(d.body, locale)}</p>` : ''}
          <div class="rd-proof" style="margin-top:clamp(40px,6vw,72px);">
            ${stats}
          </div>
          ${bullets ? `<ul class="rd-funcs" style="margin-top:clamp(44px,6vw,72px);">\n            ${bullets}\n          </ul>` : ''}
        </div>
      </section>`
    );
  },

  // Centred closing CTA (rd-close). Paper (navy text) or navy (white text).
  rd_close(d, locale) {
    const navy = d.bg === 'navy';
    return (
`      <section class="rd-sec${navy ? ' rd-sec--navy' : ''}"${navy ? '' : ' style="background:var(--paper);"'}>
        <div class="rd-wrap rd-close">
          <h2${navy ? ' style="color:#fff;"' : ''}>${pick(d.title, locale)}</h2>
          ${d.body ? `<p>${pick(d.body, locale)}</p>` : ''}
          <div style="display:flex; justify-content:center; margin-top:36px;">
            ${ctaHtml(d.cta, locale)}
          </div>
        </div>
      </section>`
    );
  },
};

// ---- public API ------------------------------------------------------
export function renderRdBlock(block, locale) {
  if (!block || typeof block !== 'object' || !block.type) return '';
  const fn = renderers[block.type];
  if (!fn) return `<!-- unknown rd- block type: ${esc(block.type)} -->`;
  try {
    return fn(block.data || {}, locale || DEFAULT_LOCALE);
  } catch (e) {
    return `<!-- rd- block render error: ${esc(e.message)} -->`;
  }
}

export function renderRdBlocks(blocks, locale) {
  const arr = Array.isArray(blocks) ? blocks : [];
  return arr.map(b => renderRdBlock(b, locale)).join('\n\n');
}

export const RD_BLOCK_TYPES = Object.keys(renderers);

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { renderRdBlock, renderRdBlocks, RD_BLOCK_TYPES };
}

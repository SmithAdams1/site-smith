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
// Model field values are authored HTML-ready (already entity-encoded, e.g.
// "Smith &amp; Adams", paths with &amp;). In attributes we must NOT re-encode
// the ampersands (that double-escapes to &amp;amp;); we only guard against a
// literal double-quote breaking out of the attribute. Encoding on input is
// the editor's job, same contract as the richtext blocks in renderBlocks.js.
function attr(s) {
  return String(s == null ? '' : s).replace(/"/g, '&quot;');
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
  const label = cta.wrap ? `<span>${pick(cta.label, locale)}</span>` : pick(cta.label, locale);
  // Space before the arrow unless it's a wrapped label with space:false
  // (some source CTAs keep the space between </span> and the icon, some don't).
  const arrow = cta.arrow === false ? '' : ((cta.wrap && cta.space !== true) ? ARROW : ' ' + ARROW);
  return `<a class="rd-cta${ghost}" href="${attr(cta.href || 'contact.html')}">${label}${arrow}</a>`;
}

// ---- individual rd- block renderers ----------------------------------
const renderers = {
  // Full-bleed hero: media (img or video), scrim, eyebrow, h1, sub, CTAs.
  rd_hero(d, locale) {
    const media = d.video
      ? `<video ${d.autoplay ? 'data-autoplay ' : ''}muted loop playsinline preload="none"${d.poster ? ` poster="${attr(d.poster)}"` : ''}><source src="${attr(d.video)}" type="video/mp4"></video>`
      : `<img src="${attr(d.image || '')}" alt="${attr(pick(d.image_alt, locale))}" loading="eager" decoding="async">`;
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
    const img = d.image ? `\n          <div class="reveal" style="margin-top:clamp(36px,5vw,64px);"><img src="${attr(d.image)}" alt="${attr(pick(d.image_alt, locale))}" loading="lazy" decoding="async" style="width:100%; aspect-ratio:16/9; object-fit:cover; display:block;"></div>` : '';
    // Optional card grid (rd-two): a section header followed by 2–4 cards,
    // each a tracked label + a body line (the "Subject NN" pattern).
    const cards = (Array.isArray(d.cards) && d.cards.length)
      ? `\n          <div class="rd-two" style="margin-top:clamp(32px,4vw,56px);">` +
        d.cards.map(c => `\n          <div class="rd-card reveal">\n            <p class="rd-label" style="margin:0 0 14px;">${pick(c.label, locale)}</p>\n            <p style="margin:0;">${pick(c.body, locale)}</p>\n          </div>`).join('') +
        `\n          </div>`
      : '';
    return (
`      <section class="rd-sec${navy ? ' rd-sec--navy' : ''}"${navy ? '' : ' style="background:var(--paper);"'}>
        <div class="rd-wrap">
          ${d.hairline === false ? '' : '<hr class="rd-hair">'}
          <div style="max-width:900px; padding-top:clamp(28px,4vw,48px);">
            ${d.eyebrow ? `<p class="rd-label reveal" style="margin:0 0 22px;${navy ? 'color:rgba(255,255,255,0.55);' : ''}">${pick(d.eyebrow, locale)}</p>` : ''}
            <h2 class="rd-statement reveal" style="font-size:clamp(32px,4.6vw,64px); margin:0;${navy ? 'color:#fff;' : ''}">${pick(d.title, locale)}</h2>
            ${paras}
          </div>${cards}${img}
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
`      <section class="rd-sec rd-sec--navy"${d.anchor ? ` id="${attr(d.anchor)}"` : ''}>
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
          ${d.source ? `<p class="reveal" style="font-family:var(--sans); font-size:12px; color:rgba(255,255,255,0.5); letter-spacing:0.02em; margin-top:clamp(24px,3vw,36px);">${pick(d.source, locale)}</p>` : ''}
          ${bullets ? `<ul class="rd-funcs" style="margin-top:clamp(44px,6vw,72px);">\n            ${bullets}\n          </ul>` : ''}
        </div>
      </section>`
    );
  },

  // Signed message with portrait + bio-over-photo toggle (rd-msg). The
  // bio panel / trigger use fixed ids (msg-bio) matched by redesign.js's
  // always-on bio toggle — one per page (fine for About).
  rd_msg(d, locale) {
    const bio = (Array.isArray(d.bio) ? d.bio : []).map(p => `<p>${pick(p, locale)}</p>`).join('\n                ');
    const body = (Array.isArray(d.body) ? d.body : []).map(p => `<p>${pick(p, locale)}</p>`).join('\n              ');
    return (
`      <section class="rd-sec"${d.anchor ? ` id="${attr(d.anchor)}"` : ''} style="background:var(--paper);">
        <div class="rd-wrap">
          ${d.eyebrow ? `<p class="rd-label reveal" style="margin:0 0 clamp(28px,3.5vw,48px);">${pick(d.eyebrow, locale)}</p>` : ''}
          <div class="rd-msg">
            <figure class="rd-msg__figure reveal">
              <img src="${attr(d.photo || '')}" alt="${attr(pick(d.photo_alt, locale))}" loading="lazy" decoding="async"${d.photo_pos ? ` style="object-position:${attr(d.photo_pos)};"` : ''}>
              <div class="rd-msg__bio" id="msg-bio" role="region" aria-label="Biography">
                ${bio}
              </div>
              <button type="button" class="rd-msg__trigger" aria-expanded="false" aria-controls="msg-bio">
                <span class="o">${pick(d.bio_open, locale)}</span>
                <span class="x">${pick(d.bio_close, locale)}</span>
              </button>
            </figure>
            <div class="rd-msg__body reveal">
              <p class="rd-msg__lead">${pick(d.lead, locale)}</p>
              ${body}
              <div class="rd-msg__sign">
                <p class="rd-msg__name">${pick(d.name, locale)}</p>
                <p class="rd-msg__role">${pick(d.role, locale)}</p>
              </div>
            </div>
          </div>
        </div>
      </section>`
    );
  },

  // Full-bleed asset: image + scrim + navy plate with title (+ italic tail)
  // and a row of figures. (rd-asset)
  rd_asset(d, locale) {
    const figs = (Array.isArray(d.figs) ? d.figs : []).map(f =>
      `<div class="f"><div class="n">${pick(f.n, locale)}</div><div class="l">${pick(f.l, locale)}</div></div>`
    ).join('');
    return (
`      <section class="rd-asset">
        <div class="rd-asset__media"><img src="${attr(d.image || '')}" alt="${attr(pick(d.image_alt, locale))}" loading="lazy" decoding="async"></div>
        <div class="rd-asset__scrim"></div>
        <div class="rd-wrap rd-asset__plate">
          ${d.tag ? `<p class="rd-label" style="color:rgba(255,255,255,0.6); margin:0 0 10px;">${pick(d.tag, locale)}</p>` : ''}
          ${d.eyebrow ? `<p class="rd-label" style="color:rgba(255,255,255,0.6); margin:0 0 22px;">${pick(d.eyebrow, locale)}</p>` : ''}
          <h2>${pick(d.title, locale)}${d.title_em ? ` <em style="font-style:italic;">${pick(d.title_em, locale)}</em>` : ''}</h2>
          ${figs ? `<div class="rd-figs">${figs}</div>` : ''}
          ${d.byline ? `<p class="rd-body" style="color:var(--stone); margin-top:26px;">${pick(d.byline, locale)}</p>` : ''}
        </div>
      </section>`
    );
  },

  // FAQ accordion using native <details> (rd-faq). Each item: q + a (HTML).
  // Also emits a FAQPage JSON-LD block derived from the items, so the SEO
  // rich-result data survives when this section comes from the block model.
  rd_faq(d, locale) {
    const list = Array.isArray(d.items) ? d.items : [];
    const items = list.map(it =>
      `<details>\n              <summary><span>${pick(it.q, locale)}</span><span class="rd-faq__mark" aria-hidden="true"></span></summary>\n              <div class="rd-faq__a">${pick(it.a, locale)}</div>\n            </details>`
    ).join('\n            ');
    // Plain text for the schema (strip tags, decode the entities we emit).
    const plain = s => String(s == null ? '' : s).replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&rsquo;|&#8217;/g, '\u2019').replace(/&lsquo;/g, '\u2018').replace(/&mdash;/g, '\u2014').replace(/&ndash;/g, '\u2013').replace(/&euro;/g, '\u20ac').replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
    const schema = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: list.map(it => ({ '@type': 'Question', name: plain(pick(it.q, locale)), acceptedAnswer: { '@type': 'Answer', text: plain(pick(it.a, locale)) } })) };
    const ld = list.length ? `\n<script type="application/ld+json">${JSON.stringify(schema).replace(/</g, '\\u003c')}<\/script>` : '';
    return (
`      <section class="rd-sec"${d.anchor ? ` id="${attr(d.anchor)}"` : ''} style="background:var(--paper);">
        <div class="rd-wrap">
          <hr class="rd-hair">
          <div style="padding-top:clamp(28px,4vw,48px);">
            ${d.eyebrow ? `<p class="rd-label reveal" style="margin:0 0 22px;">${pick(d.eyebrow, locale)}</p>` : ''}
            <h2 class="rd-statement reveal" style="font-size:clamp(30px,4vw,54px); margin:0 0 clamp(32px,4vw,56px); max-width:20ch;">${pick(d.title, locale)}</h2>
          </div>
          <div class="rd-faq">
            ${items}
          </div>
        </div>
      </section>` + ld
    );
  },

  // Editorial "project" section: eyebrow + italic quote + body paras + a
  // two-image grid + a centred italic closing quote.
  rd_project(d, locale) {
    const body = (Array.isArray(d.body) ? d.body : []);
    const paras = body.map((p, i) => `<p class="rd-body reveal" style="margin:0${i < body.length - 1 ? ' 0 22px' : ''};">${pick(p, locale)}</p>`).join('\n            ');
    const imgs = (Array.isArray(d.images) ? d.images : []);
    const grid = imgs.length ? `\n          <div style="display:grid; grid-template-columns:1fr 1fr; gap:clamp(12px,1.6vw,20px); margin-top:clamp(36px,5vw,64px);">` +
      imgs.map(im => `<img src="${attr(im.src)}" alt="${attr(pick(im.alt, locale))}" loading="lazy" decoding="async" style="width:100%; aspect-ratio:4/3; object-fit:cover; display:block;">`).join('') + `</div>` : '';
    return (
`      <section class="rd-sec" style="background:var(--paper);">
        <div class="rd-wrap">
          <hr class="rd-hair">
          <div style="max-width:900px; padding-top:clamp(28px,4vw,48px);">
            ${d.eyebrow ? `<p class="rd-label reveal" style="margin:0 0 22px;">${pick(d.eyebrow, locale)}</p>` : ''}
            ${d.quote ? `<p class="rd-statement reveal" style="font-size:clamp(24px,3vw,40px); font-style:italic; font-weight:400; margin:0 0 32px;">${pick(d.quote, locale)}</p>` : ''}
            ${paras}
          </div>${grid}
          ${d.closing_quote ? `<p class="rd-statement reveal" style="font-size:clamp(22px,2.8vw,36px); font-style:italic; font-weight:400; margin:clamp(36px,5vw,64px) auto 0; max-width:24ch; text-align:center;">${pick(d.closing_quote, locale)}</p>` : ''}
        </div>
      </section>`
    );
  },

  // Navy numbered list (rd-funcs) with index + body only (no title), plus an
  // optional closing paragraph. Used for "pillars"-style sections.
  rd_list(d, locale) {
    const items = (Array.isArray(d.items) ? d.items : []).map(it =>
      `<li class="reveal"><span class="fi">${pick(it.index, locale)}</span><span class="fd" style="font-size:15px; color:var(--stone);">${pick(it.body, locale)}</span></li>`
    ).join('\n            ');
    return (
`      <section class="rd-sec rd-sec--navy">
        <div class="rd-wrap">
          ${d.eyebrow ? `<p class="rd-label reveal" style="color:rgba(255,255,255,0.55); margin:0 0 clamp(28px,4vw,48px);">${pick(d.eyebrow, locale)}</p>` : ''}
          <ul class="rd-funcs">
            ${items}
          </ul>
          ${d.closing ? `<p class="rd-body reveal" style="margin-top:clamp(32px,4vw,52px); max-width:70ch;">${pick(d.closing, locale)}</p>` : ''}
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

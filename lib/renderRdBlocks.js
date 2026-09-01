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

// Optional hairline segment icons for rd_prose. Authored at 24x24 as strokes so
// they ride the shared .rd-ico system (navy on paper, gold on navy sections) and
// match the homepage pillar icons. Referenced by name via a block's `icon` field.
const RD_PROSE_ICONS = {
  'trending-up': '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  'globe': '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.5 2.5 3.8 5.6 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.6-3.8-9S9.5 5.5 12 3z"/>',
  'sun': '<circle cx="12" cy="11" r="3.5"/><path d="M12 2.5v2M12 15.5v1.5M5.6 11H3.6M20.4 11h-2M6.9 5.9 5.5 4.5M17.1 5.9l1.4-1.4M6.9 16.1l-1.4 1.4M17.1 16.1l1.4 1.4"/><path d="M3 20h18"/>'
};
function rdProseIcon(name) {
  return RD_PROSE_ICONS[name]
    ? '<svg class="rd-ico reveal" viewBox="0 0 24 24" style="width:34px;height:34px;display:block;margin:0 0 22px;">' + RD_PROSE_ICONS[name] + '</svg>'
    : '';
}

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
  // Data table (GEO-friendly, extractable): eyebrow + title + a responsive
  // table + a sources/disclaimer note. columns:[{en,pt}], rows:[[cell,...]]
  // where a cell is a localized field {en,pt} or a plain string. note is HTML.
  rd_table(d, locale) {
    const cols = Array.isArray(d.columns) ? d.columns : [];
    const rows = Array.isArray(d.rows) ? d.rows : [];
    const th = cols.map(c => `<th>${pick(c, locale)}</th>`).join('');
    const trs = rows.map(r => `<tr>${(Array.isArray(r) ? r : []).map((cell, i) =>
      `<td${i === 0 ? ' class="rdtbl__h"' : ''}>${pick(cell, locale)}</td>`).join('')}</tr>`).join('');
    const note = pick(d.note, locale);
    return (
      '<section class="rd-sec"' + (d.anchor ? ` id="${attr(d.anchor)}"` : '') + ' style="background:var(--paper);">' +
      '<style>' +
      '.rdtbl-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch;margin-top:clamp(24px,3vw,36px);border:1px solid var(--line);border-radius:4px;}' +
      '.rdtbl{width:100%;border-collapse:collapse;font-family:var(--sans);min-width:520px;}' +
      '.rdtbl th{background:var(--navy);color:#fff;font-size:11px;letter-spacing:.12em;text-transform:uppercase;font-weight:600;text-align:left;padding:14px 18px;}' +
      '.rdtbl th:not(:first-child),.rdtbl td:not(:first-child){text-align:right;font-variant-numeric:tabular-nums;}' +
      '.rdtbl td{padding:15px 18px;border-bottom:1px solid var(--line);font-size:16px;color:var(--ink);background:#fff;}' +
      '.rdtbl tbody tr:last-child td{border-bottom:none;}' +
      '.rdtbl .rdtbl__h{font-weight:600;color:var(--navy);}' +
      '.rdtbl__note{font-family:var(--sans);font-size:12.5px;line-height:1.65;color:var(--slate);margin:18px 0 0;max-width:82ch;}' +
      '</style>' +
      '<div class="rd-wrap">' +
      (pick(d.eyebrow, locale) ? `<p class="rd-label">${pick(d.eyebrow, locale)}</p>` : '') +
      (pick(d.title, locale) ? `<h2 class="rd-statement" style="font-size:clamp(22px,2.6vw,34px);margin-top:14px;">${pick(d.title, locale)}</h2>` : '') +
      `<div class="rdtbl-wrap"><table class="rdtbl"><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table></div>` +
      (note ? `<p class="rdtbl__note">${note}</p>` : '') +
      '</div></section>'
    );
  },

  // Mission / Vision / Values: three buttons that open an accessible modal.
  // Brand-Book statements are set in the display serif, on paper, never in caps.
  // data.items: [{key,label{},teaser{},statement{}} | {key,label{},teaser{},intro{},values:[{name{},desc{}}]}]
  rd_mvv(d, locale) {
    const items = Array.isArray(d.items) ? d.items : [];
    const arrow = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
    const openLbl = locale === 'pt' ? 'Ver' : 'Read';
    const closeLbl = locale === 'pt' ? 'Fechar' : 'Close';
    const btns = items.map(it =>
      '<button type="button" class="rd-mvv__btn" data-mvv-open="' + attr(it.key) + '">' +
        '<span class="rd-mvv__name">' + pick(it.label, locale) + '</span>' +
        '<span class="rd-mvv__teaser">' + pick(it.teaser, locale) + '</span>' +
        '<span class="rd-mvv__cue">' + openLbl + ' ' + arrow + '</span>' +
      '</button>').join('');
    const dialogs = items.map(it => {
      let body;
      if (Array.isArray(it.values)) {
        const intro = pick(it.intro, locale) ? '<p class="rd-mvv__intro">' + pick(it.intro, locale) + '</p>' : '';
        const grid = it.values.map(v => '<div class="rd-mvv__v"><h4>' + pick(v.name, locale) + '</h4><p>' + pick(v.desc, locale) + '</p></div>').join('');
        body = intro + '<div class="rd-mvv__vgrid">' + grid + '</div>';
      } else {
        body = '<p class="rd-mvv__stmt">' + pick(it.statement, locale) + '</p>';
      }
      return '<div class="rd-mvv__dialog" data-mvv="' + attr(it.key) + '" role="dialog" aria-modal="true" aria-label="' + attr(pick(it.label, locale)) + '" hidden>' +
        '<button type="button" class="rd-mvv__close" data-mvv-close aria-label="' + attr(closeLbl) + '">&times;</button>' +
        '<p class="rd-mvv__dlabel">' + pick(it.label, locale) + '</p>' + body + '</div>';
    }).join('');
    const anchor = d.anchor || 'purpose';
    const id = 'rd-mvv-' + anchor;
    const css = '<style>' +
      '.rd-mvv__grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:clamp(26px,3vw,40px);}' +
      '.rd-mvv__btn{appearance:none;text-align:left;cursor:pointer;background:#fff;border:1px solid var(--line);border-radius:5px;padding:clamp(22px,2.4vw,30px);display:flex;flex-direction:column;gap:9px;min-height:130px;justify-content:flex-start;font-family:inherit;transition:border-color .3s ease,box-shadow .3s ease,transform .3s ease;}' +
      '.rd-mvv__btn:hover{border-color:var(--gold-line);box-shadow:0 12px 28px rgba(17,34,45,.07);transform:translateY(-2px);}' +
      '.rd-mvv__name{font-family:var(--display,\'Playfair Display\',Georgia,serif);font-weight:400;font-size:clamp(19px,1.9vw,24px);line-height:1.12;letter-spacing:-.01em;color:var(--navy);}' +
      '.rd-mvv__teaser{font-family:var(--sans);font-size:13.5px;line-height:1.5;color:var(--slate);flex:1 1 auto;}' +
      '.rd-mvv__cue{display:inline-flex;align-items:center;gap:7px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--slate);margin-top:4px;}' +
      '.rd-mvv__cue svg{width:13px;height:13px;}' +
      '.rd-mvv__ov{position:fixed;inset:0;z-index:9999;display:none;align-items:center;justify-content:center;padding:clamp(16px,4vw,40px);background:rgba(12,20,26,.74);opacity:0;transition:opacity .28s ease;}' +
      '.rd-mvv__ov.is-open{opacity:1;}' +
      '.rd-mvv__dialog{background:#FDFCF9;max-width:660px;width:100%;border-radius:6px;padding:clamp(30px,4vw,50px) clamp(26px,3.4vw,46px);position:relative;box-shadow:0 30px 80px rgba(12,20,26,.45);max-height:86vh;overflow-y:auto;transform:translateY(14px);transition:transform .32s cubic-bezier(.2,.7,.2,1);}' +
      '.rd-mvv__ov.is-open .rd-mvv__dialog{transform:none;}' +
      '.rd-mvv__close{position:absolute;top:14px;right:14px;width:40px;height:40px;border:1px solid var(--line);border-radius:50%;background:#fff;cursor:pointer;font-size:20px;line-height:1;color:var(--navy);display:flex;align-items:center;justify-content:center;transition:border-color .2s ease,background .2s ease;}' +
      '.rd-mvv__close:hover{border-color:var(--navy);background:var(--sunken,#F6F2EA);}' +
      '.rd-mvv__dlabel{font-size:11px;letter-spacing:.24em;text-transform:uppercase;color:var(--slate);font-weight:600;margin:0 0 20px;padding-bottom:18px;border-bottom:1px solid var(--gold-line);}' +
      '.rd-mvv__stmt{font-family:var(--display,\'Playfair Display\',Georgia,serif);font-weight:400;font-size:clamp(20px,2.3vw,28px);line-height:1.32;letter-spacing:-.005em;color:var(--navy);margin:0;}' +
      '.rd-mvv__intro{font-family:var(--sans);font-size:14px;line-height:1.6;color:var(--slate);margin:0 0 26px;max-width:62ch;}' +
      '.rd-mvv__vgrid{display:grid;grid-template-columns:1fr 1fr;gap:24px 36px;}' +
      '.rd-mvv__v h4{font-family:var(--sans);font-size:15px;color:var(--navy);margin:0 0 5px;}' +
      '.rd-mvv__v p{font-family:var(--sans);font-size:14px;line-height:1.6;color:var(--ink);margin:0;}' +
      '@media(max-width:760px){.rd-mvv__grid{grid-template-columns:1fr;}.rd-mvv__vgrid{grid-template-columns:1fr;}}' +
      '</style>';
    const js = '<script>(function(){var r=document.getElementById(' + JSON.stringify(id) + ');if(!r)return;var ov=r.querySelector("[data-mvv-ov]");if(!ov)return;if(ov.parentNode!==document.body)document.body.appendChild(ov);var dgs=ov.querySelectorAll(".rd-mvv__dialog");function op(k){for(var i=0;i<dgs.length;i++){dgs[i].hidden=dgs[i].getAttribute("data-mvv")!==k;}ov.style.display="flex";requestAnimationFrame(function(){ov.classList.add("is-open");});document.documentElement.style.overflow="hidden";var f=ov.querySelector(".rd-mvv__dialog:not([hidden]) .rd-mvv__close");if(f)f.focus();}function cl(){ov.classList.remove("is-open");document.documentElement.style.overflow="";setTimeout(function(){if(!ov.classList.contains("is-open"))ov.style.display="none";},320);}var bs=r.querySelectorAll("[data-mvv-open]");for(var i=0;i<bs.length;i++){(function(b){b.addEventListener("click",function(){op(b.getAttribute("data-mvv-open"));});})(bs[i]);}ov.addEventListener("click",function(e){if(e.target===ov||(e.target.closest&&e.target.closest("[data-mvv-close]")))cl();});document.addEventListener("keydown",function(e){if(e.key==="Escape"&&ov.classList.contains("is-open"))cl();});})();</script>';
    return (
      '<section class="rd-sec" id="' + attr(anchor) + '" style="background:var(--paper);">' + css +
      '<div class="rd-wrap" id="' + id + '">' +
        (pick(d.eyebrow, locale) ? '<p class="rd-label">' + pick(d.eyebrow, locale) + '</p>' : '') +
        (pick(d.title, locale) ? '<h2 class="rd-statement" style="font-size:clamp(26px,3.2vw,42px);margin-top:14px;">' + pick(d.title, locale) + '</h2>' : '') +
        '<div class="rd-mvv__grid">' + btns + '</div>' +
        '<div class="rd-mvv__ov" data-mvv-ov>' + dialogs + '</div>' +
      '</div>' + js +
      '</section>'
    );
  },

  // Full-bleed hero: media (img or video), scrim, eyebrow, h1, sub, CTAs.
  rd_hero(d, locale) {
    let media;
    if (d.video) {
      media = `<video ${d.autoplay ? 'data-autoplay ' : ''}muted loop playsinline preload="none"${d.poster ? ` poster="${attr(d.poster)}"` : ''}><source src="${attr(d.video)}" type="video/mp4"></video>`;
    } else {
      const heroImg = d.image || '';
      const heroTag = `<img src="${attr(heroImg)}" alt="${attr(pick(d.image_alt, locale))}" loading="eager" decoding="async">`;
      // Serve WebP with a JPG fallback (older browsers keep the jpg).
      const heroWebp = /\.jpe?g$/i.test(heroImg) ? heroImg.replace(/\.jpe?g$/i, '.webp') : '';
      media = heroWebp ? `<picture><source srcset="${attr(heroWebp)}" type="image/webp">${heroTag}</picture>` : heroTag;
    }
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
    // Optional brochure links. A "gate:true" item renders a button that opens
    // the lead form (brochure-gate.js) which sends the lead to the CRM + fires
    // the GA4/Ads conversion, then delivers the PDF. Otherwise a direct download.
    const DL_ICON = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex:0 0 auto;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>';
    const dls = (Array.isArray(d.downloads) && d.downloads.length)
      ? '\n            <div class="reveal" style="display:flex;flex-wrap:wrap;gap:26px;margin-top:28px;">' +
        d.downloads.map(function (x) {
          const st = 'display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:600;letter-spacing:.02em;font-family:inherit;color:' + (navy ? '#fff' : 'var(--navy,#11222D)') + ';text-decoration:none;border:0;background:none;cursor:pointer;border-bottom:1px solid var(--champ,#D6C29A);padding:0 0 3px;';
          const inner = DL_ICON + '<span>' + pick(x.label, locale) + '</span>';
          return x.gate
            ? '<button type="button" data-brochure="' + attr(x.href) + '" data-brochure-type="' + attr(x.type || '') + '" data-brochure-title="' + attr(pick(x.title, locale) || pick(x.label, locale)) + '" style="' + st + '">' + inner + '</button>'
            : '<a href="' + attr(x.href) + '" download style="' + st + '">' + inner + '</a>';
        }).join('') +
        '</div>'
      : '';
    return (
`      <section class="rd-sec${navy ? ' rd-sec--navy' : ''}"${navy ? '' : ' style="background:var(--paper);"'}>
        <div class="rd-wrap">
          ${d.hairline === false ? '' : '<hr class="rd-hair">'}
          <div style="max-width:900px; padding-top:clamp(28px,4vw,48px);">
            ${d.icon ? rdProseIcon(d.icon) : ''}
            ${d.eyebrow ? `<p class="rd-label reveal" style="margin:0 0 22px;${navy ? 'color:rgba(255,255,255,0.55);' : ''}">${pick(d.eyebrow, locale)}</p>` : ''}
            <h2 class="rd-statement reveal" style="font-size:clamp(32px,4.6vw,64px); margin:0;${navy ? 'color:#fff;' : ''}">${pick(d.title, locale)}</h2>
            ${paras}${dls}
          </div>${cards}${img}
        </div>
      </section>`
    );
  },

  // Interactive business-units panel. CSS-only radio tabs (no JS), so it works
  // even when the block HTML is injected via innerHTML. Each logo toggles a
  // panel with a short blurb and a "Know more" link to that unit's page.
  rd_units(d, locale) {
    const units = [
      { id: 'inv', logo: '/assets/logos/bu-investments.png?v=2', name: 'Smith &amp; Adams Investments', href: '/invest-in-portugal',
        blurb: { en: 'Independent investment advisory for international buyers in Portugal. We identify, vet and structure each opportunity for yield and capital growth, and we are paid to be right about the asset, not to sell it. Where the numbers do not hold up, we say so.',
                 pt: 'Consultoria de investimento independente para compradores internacionais em Portugal. Identificamos, avaliamos e estruturamos cada oportunidade para rendimento e valoriza&ccedil;&atilde;o, e somos pagos para estar certos sobre o ativo, n&atilde;o para o vender. Quando os n&uacute;meros n&atilde;o se sustentam, dizemo-lo.' } },
      { id: 're', logo: '/assets/logos/bu-real-estate.png?v=2', name: 'Smith &amp; Adams Real Estate', href: '/real-estate',
        blurb: { en: 'Premium residential real estate across Portugal, from Lisbon and Cascais to the Algarve and Comporta. Every property is sourced and independently vetted before it reaches you, so the shortlist reflects your objectives, not someone else&rsquo;s inventory.',
                 pt: 'Imobili&aacute;rio residencial premium em todo o Portugal, de Lisboa e Cascais ao Algarve e &agrave; Comporta. Cada im&oacute;vel &eacute; selecionado e verificado de forma independente antes de chegar a si, para que a lista reflita os seus objetivos e n&atilde;o o invent&aacute;rio de terceiros.' } },
      { id: 'pm', logo: '/assets/logos/bu-property-management.png?v=2', name: 'Smith &amp; Adams Property Management', href: '/property-management',
        blurb: { en: 'End-to-end management of your apartment: tenants, maintenance and financial reporting under one roof. You receive hands-off, euro-denominated income and a clear account of costs and performance, reported quarterly in the same format every time.',
                 pt: 'Gest&atilde;o completa do seu apartamento: inquilinos, manuten&ccedil;&atilde;o e relat&oacute;rios financeiros sob um s&oacute; teto. Recebe rendimento em euros, sem preocupa&ccedil;&otilde;es, e uma conta clara de custos e desempenho, reportada trimestralmente sempre no mesmo formato.' } },
      { id: 'ho', logo: '/assets/logos/bu-hospitality.png?v=2', name: 'Smith &amp; Adams Hospitality', href: '/hospitality',
        blurb: { en: 'Our Hygge House stays and the Hygge Kaffe coffee house: hospitality built around the Nordic idea of well-being. We run it ourselves rather than licensing a name, so the standard we advise on is one we hold to in practice.',
                 pt: 'As nossas estadias Hygge House e o Hygge Kaffe: hospitalidade constru&iacute;da em torno do conceito n&oacute;rdico de bem-estar. Somos n&oacute;s que a operamos, em vez de licenciar um nome, por isso o padr&atilde;o que aconselhamos &eacute; o que cumprimos na pr&aacute;tica.' } }
    ];
    const know = locale === 'pt' ? 'Saber mais' : 'Know more';
    const groupLabel = locale === 'pt' ? 'Quatro unidades de neg&oacute;cio, uma rela&ccedil;&atilde;o de consultoria' : 'Four business units, one advisory relationship';
    const radios = units.map((u, i) => '<input class="sa-bu__r" type="radio" name="sa-bu" id="sa-bu-' + u.id + '"' + (i === 0 ? ' checked' : '') + '>').join('');
    const tabs = units.map(u => '<label class="sa-bu__tab" for="sa-bu-' + u.id + '"><img src="' + u.logo + '" alt="' + attr(u.name) + '" loading="lazy" decoding="async"></label>').join('');
    const panels = units.map(u => '<div class="sa-bu__panel sa-bu__panel--' + u.id + '"><h3 class="sa-bu__name">' + u.name + '</h3><p class="sa-bu__blurb">' + pick(u.blurb, locale) + '</p><a class="sa-bu__cta" href="' + u.href + '">' + know + ' <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a></div>').join('');
    const checkedCss = units.map(u => '#sa-bu-' + u.id + ':checked~.sa-bu__tabs .sa-bu__tab[for="sa-bu-' + u.id + '"]{opacity:1;border-color:var(--navy);} #sa-bu-' + u.id + ':checked~.sa-bu__panels .sa-bu__panel--' + u.id + '{display:block;}').join(' ');
    return (
      '<section class="rd-sec" style="background:var(--paper);">' +
      '<style>' +
      '.sa-bu{max-width:1100px;margin:0 auto;text-align:center;}' +
      '.sa-bu__grouplogo{display:block;max-height:54px;width:auto;margin:0 auto;}' +
      '.sa-bu__group{text-align:center;font-family:var(--sans);font-size:11px;letter-spacing:0.24em;text-transform:uppercase;color:var(--slate);margin:0 0 10px;}' +
      '.sa-bu__connector{width:1px;height:32px;background:var(--line);margin:0 auto 24px;}' +
      '.sa-bu__r{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;}' +
      '.sa-bu__tabs{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;}' +
      '.sa-bu__tab{display:flex;align-items:center;justify-content:center;padding:22px 14px;border:1px solid var(--line);border-radius:4px;cursor:pointer;opacity:0.62;transition:opacity .25s ease,border-color .25s ease,transform .25s ease;background:#fff;min-height:92px;}' +
      '.sa-bu__tab:hover{opacity:0.8;transform:translateY(-2px);}' +
      '.sa-bu__tab img{max-width:100%;max-height:42px;width:auto;height:auto;object-fit:contain;}' +
      '.sa-bu__panels{margin-top:20px;}' +
      '.sa-bu__panel{display:none;border:1px solid var(--line);border-radius:4px;background:#fff;padding:clamp(26px,3.5vw,44px);text-align:center;}' +
      '.sa-bu__name{font-family:var(--display);font-weight:600;color:var(--navy);font-size:clamp(20px,2.2vw,28px);margin:0 0 14px;}' +
      '.sa-bu__blurb{font-family:var(--sans);font-size:16px;line-height:1.7;color:var(--ink);max-width:60ch;margin:0 auto 26px;}' +
      '.sa-bu__cta{display:inline-flex;align-items:center;gap:9px;background:var(--navy);color:#fff;text-decoration:none;font-family:var(--sans);font-weight:600;font-size:15px;padding:14px 30px;border-radius:2px;transition:transform .4s var(--ease-expo),background .3s ease;}' +
      '.sa-bu__cta:hover{transform:translateY(-2px);background:#1c3646;}' +
      '@media(max-width:640px){.sa-bu__tabs{grid-template-columns:1fr 1fr;}}' +
      checkedCss +
      '</style>' +
      '<div class="rd-wrap"><div class="sa-bu reveal">' +
      '<p class="rd-label" style="justify-content:center;margin:0 auto 18px;">' + (locale === 'pt' ? 'O Grupo' : 'The Group') + '</p>' +
      '<img class="sa-bu__grouplogo" src="/assets/logos/bu-group.png" alt="Smith &amp; Adams Group" width="220" height="54" decoding="async">' +
      '<h2 class="rd-statement" style="text-align:center;font-size:clamp(24px,3vw,38px);letter-spacing:-0.015em;margin:18px auto 0;max-width:24ch;">' + groupLabel + '</h2>' +
      '<div class="sa-bu__connector"></div>' +
      radios +
      '<div class="sa-bu__tabs">' + tabs + '</div>' +
      '<div class="sa-bu__panels">' + panels + '</div>' +
      '</div></div></section>'
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

  // Meet the Team: leadership row + full team grid. Photo frames show the
  // person's initials until a real headshot is set (data.leaders/team[].photo).
  rd_team(d, locale) {
    const initials = (name) => {
      const p = String(name || '').trim().split(/\s+/).filter(Boolean);
      if (!p.length) return '';
      return (p.length === 1 ? p[0].slice(0, 2) : p[0][0] + p[p.length - 1][0]).toUpperCase();
    };
    const card = (person, kind) => {
      const nm = esc((person && person.name) || '');
      const role = esc(pick(person && person.role, locale) || '');
      const photo = person && person.photo ? attr(person.photo) : '';
      const media = photo
        ? `<img class="rdt__img" src="${photo}" alt="${nm}" loading="lazy" decoding="async"${person && person.photo_pos ? ` style="object-position:${attr(person.photo_pos)};"` : ''}>`
        : `<span class="rdt__ini" aria-hidden="true">${initials(person && person.name)}</span>`;
      return `<figure class="rdt ${kind}"><span class="rdt__ph${photo ? ' rdt__ph--img' : ''}">${media}</span><figcaption><span class="rdt__name">${nm}</span><span class="rdt__role">${role}</span></figcaption></figure>`;
    };
    // Groups are generic: each { label:{en,pt}, layout:'lead'|'team', people:[] }.
    // Falls back to the old leaders/team shape so existing data keeps working.
    const layoutKind = (layout) => (layout === 'team' ? 'rdt--team' : 'rdt--lead');
    const layoutGrid = (layout) => (layout === 'team' ? 'rdt-grid--team' : 'rdt-grid--lead');
    const groups = (Array.isArray(d.groups) && d.groups.length)
      ? d.groups
      : [
          { label: { en: 'Leadership', pt: 'Lideran&ccedil;a' }, layout: 'lead', people: Array.isArray(d.leaders) ? d.leaders : [] },
          { label: { en: 'The Team', pt: 'A Equipa' }, layout: 'team', people: Array.isArray(d.team) ? d.team : [] },
        ];
    const sectionsHtml = groups.map((g) => {
      const people = Array.isArray(g.people) ? g.people : [];
      if (!people.length) return '';
      const lbl = pick(g.label, locale) || '';
      return `<p class="rdt__seclabel">${lbl}</p>\n          <div class="rdt-grid ${layoutGrid(g.layout)}">${people.map((p) => card(p, layoutKind(g.layout))).join('')}</div>`;
    }).join('\n          ');
    const CSS = '<style>'
      + '.rd-team .rd-tm-eyebrow{font-size:11px;letter-spacing:.24em;text-transform:uppercase;color:var(--gold,#B58B45);font-weight:600;margin:0 0 14px;}'
      + '.rd-team .rd-tm-title{font-family:var(--serif,"Playfair Display",Georgia,serif);font-weight:500;font-size:clamp(30px,5vw,52px);line-height:1.05;letter-spacing:-.01em;margin:0 0 14px;color:var(--navy,#11222D);}'
      + '.rd-team .rd-tm-intro{color:var(--slate,#6A7883);font-size:16px;line-height:1.6;max-width:62ch;margin:0;}'
      + '.rd-team .rdt__seclabel{font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:var(--slate,#6A7883);font-weight:600;margin:clamp(30px,4vw,46px) 0 18px;}'
      + '.rd-team .rdt-grid{display:grid;gap:clamp(14px,2vw,22px);}'
      + '.rd-team .rdt-grid--lead{grid-template-columns:repeat(auto-fill,minmax(168px,1fr));}'
      + '.rd-team .rdt-grid--team{grid-template-columns:repeat(auto-fill,minmax(138px,1fr));}'
      + '.rd-team .rdt{margin:0;display:flex;flex-direction:column;}'
      + '.rd-team .rdt__ph{position:relative;display:flex;align-items:center;justify-content:center;background:linear-gradient(160deg,#f3f4f2,#EEF0EE);border:1px solid var(--line,#E7E2D6);border-radius:3px;overflow:hidden;margin-bottom:12px;transition:border-color .35s ease,box-shadow .35s ease;}'
      + '.rd-team .rdt--lead .rdt__ph{aspect-ratio:4/5;}'
      + '.rd-team .rdt--team .rdt__ph{aspect-ratio:1/1;}'
      + '.rd-team .rdt__ph--img{background:none;}'
      + '.rd-team .rdt__img{width:100%;height:100%;object-fit:cover;object-position:50% 22%;display:block;}'
      + '.rd-team .rdt__ini{font-family:var(--serif,"Playfair Display",Georgia,serif);font-weight:500;color:var(--navy,#11222D);opacity:.3;}'
      + '.rd-team .rdt--lead .rdt__ini{font-size:36px;}.rd-team .rdt--team .rdt__ini{font-size:24px;}'
      + '.rd-team .rdt:hover .rdt__ph{border-color:var(--champ,#D6C29A);box-shadow:0 14px 30px rgba(17,34,45,.10);}'
      + '.rd-team .rdt__name{font-family:var(--serif,"Playfair Display",Georgia,serif);color:var(--navy,#11222D);}'
      + '.rd-team .rdt--lead .rdt__name{font-size:18px;}.rd-team .rdt--team .rdt__name{font-size:15px;}'
      + '.rd-team .rdt__role{font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--slate,#6A7883);margin-top:3px;}'
      + '.rd-team figcaption{display:flex;flex-direction:column;}'
      + '</style>';
    return (
`      <section class="rd-sec rd-team"${d.anchor ? ` id="${attr(d.anchor)}"` : ' id="team"'} style="background:var(--paper);">${CSS}
        <div class="rd-wrap">
          ${pick(d.eyebrow, locale) ? `<p class="rd-tm-eyebrow">${pick(d.eyebrow, locale)}</p>` : ''}
          <h2 class="rd-tm-title">${pick(d.title, locale)}</h2>
          ${pick(d.intro, locale) ? `<p class="rd-tm-intro">${pick(d.intro, locale)}</p>` : ''}
          ${sectionsHtml}
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

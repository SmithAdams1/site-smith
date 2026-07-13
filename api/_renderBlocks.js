// =====================================================================
// Studio v1 — shared block renderer.
// =====================================================================
// Same module used server-side by /api/page.js and in-browser by the
// Studio preview. Pure functions: (blocks, locale, opts) -> HTML string.
//
// Locale fallback: whatever locale is asked for, fall back to 'en'.
// Unknown block types are skipped silently (forward-compat).
//
// Rich-text blocks emit HTML as-is (Quill output, already sanitized in
// the editor). Every other field is HTML-escaped.
// =====================================================================

const DEFAULT_LOCALE = 'en';

// ---- escaping ---------------------------------------------------------
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>]/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]
  ));
}
function escAttr(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

// Pick a localized value from { en: '...', pt: '...' } (or a plain string
// for legacy content). Falls back to 'en' when the requested locale is
// missing or empty.
function pick(field, locale) {
  if (field == null) return '';
  if (typeof field === 'string') return field;
  if (typeof field !== 'object') return '';
  const v = field[locale];
  if (v != null && v !== '') return v;
  const fb = field[DEFAULT_LOCALE];
  return fb == null ? '' : fb;
}

// ---- individual block renderers --------------------------------------
const renderers = {
  heading(data, locale) {
    const text = pick(data.text, locale);
    if (!text) return '';
    const level = ['h1', 'h2', 'h3', 'h4'].includes(data.level) ? data.level : 'h2';
    const align = { left: 'text-left', center: 'text-center', right: 'text-right' }[data.align] || 'text-left';
    const size = {
      h1: 'text-4xl md:text-5xl font-bold',
      h2: 'text-3xl md:text-4xl font-bold',
      h3: 'text-2xl md:text-3xl font-semibold',
      h4: 'text-xl md:text-2xl font-semibold',
    }[level];
    return `<${level} class="satoshi ${size} ${align} text-[#0C1E28] my-6">${esc(text)}</${level}>`;
  },

  richtext(data, locale) {
    const html = pick(data.html, locale);
    if (!html) return '';
    // Trusted HTML — comes from the Studio's rich-text editor.
    return `<div class="satoshi text-[#0C1E28] text-[16px] leading-relaxed my-6 rt">${html}</div>`;
  },

  image(data, locale) {
    const src = data.src;
    if (!src) return '';
    const alt = pick(data.alt, locale) || '';
    const caption = pick(data.caption, locale);
    const width = data.width === 'full' ? 'w-full' : 'max-w-3xl mx-auto';
    const align = data.align === 'left' ? 'ml-0' : data.align === 'right' ? 'mr-0 ml-auto' : '';
    return (
      `<figure class="my-8 ${width} ${align}">` +
        `<img src="${escAttr(src)}" alt="${escAttr(alt)}" class="w-full h-auto rounded-xl" loading="lazy"/>` +
        (caption ? `<figcaption class="text-sm text-gray-500 text-center mt-3 satoshi">${esc(caption)}</figcaption>` : '') +
      `</figure>`
    );
  },

  image_text(data, locale) {
    const src = data.image && data.image.src;
    if (!src) return '';
    const alt = pick(data.image && data.image.alt, locale) || '';
    const title = pick(data.title, locale);
    const body = pick(data.body, locale);
    const side = data.side === 'right' ? 'md:flex-row-reverse' : 'md:flex-row';
    const cta = data.cta && data.cta.href
      ? `<a href="${escAttr(data.cta.href)}" class="inline-block mt-6 ` +
        (data.cta.style === 'ghost'
          ? 'border border-[#0C1E28] text-[#0C1E28] hover:bg-[#0C1E28] hover:text-white'
          : 'bg-[#0C1E28] text-white hover:bg-opacity-90') +
        ` px-6 py-3 rounded-full font-medium satoshi transition-all">${esc(pick(data.cta.label, locale))}</a>`
      : '';
    return (
      `<section class="my-12 flex flex-col ${side} items-center gap-10 max-w-6xl mx-auto">` +
        `<div class="w-full md:w-1/2"><img src="${escAttr(src)}" alt="${escAttr(alt)}" class="w-full h-auto rounded-xl" loading="lazy"/></div>` +
        `<div class="w-full md:w-1/2 satoshi">` +
          (title ? `<h3 class="text-2xl md:text-3xl font-bold text-[#0C1E28] mb-4">${esc(title)}</h3>` : '') +
          (body ? `<div class="text-[#0C1E28] text-[16px] leading-relaxed rt">${body}</div>` : '') +
          cta +
        `</div>` +
      `</section>`
    );
  },

  gallery(data, locale) {
    const imgs = Array.isArray(data.images) ? data.images.filter(i => i && i.src) : [];
    if (!imgs.length) return '';
    const layout = data.layout === 'grid' ? 'grid' : 'carousel';

    if (layout === 'grid') {
      const cols = imgs.length >= 3 ? 'md:grid-cols-3' : 'md:grid-cols-2';
      return (
        `<div class="my-10 grid grid-cols-1 ${cols} gap-4 max-w-6xl mx-auto">` +
        imgs.map(im => `<img src="${escAttr(im.src)}" alt="${escAttr(pick(im.alt, locale))}" class="w-full h-72 object-cover rounded-xl" loading="lazy"/>`).join('') +
        `</div>`
      );
    }
    // Carousel (horizontal scroll — client JS can enhance later).
    return (
      `<div class="my-10 max-w-6xl mx-auto">` +
        `<div class="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4" data-studio-carousel>` +
          imgs.map(im => `<div class="snap-center shrink-0 w-[85%] md:w-[60%]"><img src="${escAttr(im.src)}" alt="${escAttr(pick(im.alt, locale))}" class="w-full h-96 object-cover rounded-xl" loading="lazy"/></div>`).join('') +
        `</div>` +
      `</div>`
    );
  },

  video(data /*, locale*/) {
    const src = data.url;
    if (!src) return '';
    const source = data.source || 'upload';
    if (source === 'youtube' || source === 'vimeo') {
      // Accepts either a full embed URL or an ID.
      const url = /^https?:\/\//.test(src)
        ? src
        : (source === 'youtube' ? `https://www.youtube.com/embed/${encodeURIComponent(src)}` : `https://player.vimeo.com/video/${encodeURIComponent(src)}`);
      return (
        `<div class="my-10 max-w-5xl mx-auto aspect-video rounded-xl overflow-hidden">` +
          `<iframe src="${escAttr(url)}" class="w-full h-full" frameborder="0" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>` +
        `</div>`
      );
    }
    // Uploaded video
    const attrs = [
      'class="w-full h-full object-cover"',
      data.autoplay ? 'autoplay' : '',
      data.loop ? 'loop' : '',
      data.muted ? 'muted' : '',
      data.autoplay ? 'playsinline' : 'controls',
      data.poster ? `poster="${escAttr(data.poster)}"` : '',
    ].filter(Boolean).join(' ');
    return (
      `<div class="my-10 max-w-5xl mx-auto aspect-video rounded-xl overflow-hidden bg-black">` +
        `<video ${attrs}><source src="${escAttr(src)}"/></video>` +
      `</div>`
    );
  },

  button(data, locale) {
    const label = pick(data.label, locale);
    if (!label || !data.href) return '';
    const align = data.align === 'left' ? 'text-left' : data.align === 'right' ? 'text-right' : 'text-center';
    const style = data.style === 'ghost'
      ? 'border border-[#0C1E28] text-[#0C1E28] hover:bg-[#0C1E28] hover:text-white'
      : 'bg-[#0C1E28] text-white hover:bg-opacity-90';
    return (
      `<div class="my-8 ${align}">` +
        `<a href="${escAttr(data.href)}" class="inline-block ${style} px-8 py-4 rounded-full font-medium satoshi transition-all">${esc(label)}</a>` +
      `</div>`
    );
  },

  divider(data /*, locale*/) {
    if (data.style === 'space') {
      const h = { sm: 'h-6', md: 'h-12', lg: 'h-24' }[data.size || 'md'];
      return `<div class="${h}"></div>`;
    }
    return `<hr class="border-t border-gray-200 max-w-3xl mx-auto my-12"/>`;
  },

  spacer(data) { return renderers.divider({ style: 'space', size: data.size || 'md' }); },

  embed(data /*, locale*/) {
    // Raw HTML — admin-only. No sanitization; use with care.
    return `<div class="my-8 max-w-5xl mx-auto">${data.html || ''}</div>`;
  },
};

// ---- public API ------------------------------------------------------
export function renderBlock(block, locale) {
  if (!block || typeof block !== 'object' || !block.type) return '';
  const fn = renderers[block.type];
  if (!fn) return `<!-- unknown block type: ${esc(block.type)} -->`;
  try {
    return fn(block.data || {}, locale || DEFAULT_LOCALE);
  } catch (e) {
    return `<!-- block render error: ${esc(e.message)} -->`;
  }
}

export function renderBlocks(blocks, locale) {
  const arr = Array.isArray(blocks) ? blocks : [];
  return arr.map(b => renderBlock(b, locale)).join('\n');
}

export function pickLocalized(field, locale) {
  return pick(field, locale || DEFAULT_LOCALE);
}

export { esc as escapeHtml, escAttr as escapeAttr };

// CommonJS fallback so `require()` also works (Vercel supports both).
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { renderBlock, renderBlocks, pickLocalized, escapeHtml: esc, escapeAttr: escAttr };
}

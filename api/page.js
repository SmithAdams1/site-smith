import fs from 'fs';
import path from 'path';
import { renderBlocks, pickLocalized, escapeHtml, escapeAttr } from './_renderBlocks.js';

// =====================================================================
// Server-renders /p/:slug pages built in the Studio.
// - Fetches the published row from the `pages` table
// - Renders blocks server-side (SEO + fast first paint)
// - Injects <title>, meta description, canonical, and OpenGraph tags
// =====================================================================

const SUPABASE_URL = 'https://bcjtkfipcfvvitglgpys.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjanRrZmlwY2Z2dml0Z2xncHlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNDU3NjcsImV4cCI6MjA5MTgyMTc2N30.kgnE2E-xDQT855to1Nz8LNKtwIBGw2QsIw81Us3B_ZA';

const SITE_BASE = 'https://smithandadams.com';
const DEFAULT_LOCALE = 'en';
const SUPPORTED_LOCALES = ['en', 'pt'];

export default async function handler(req, res) {
  const rawSlug = req.query.slug || '';
  const slug = String(rawSlug).trim();

  // Locale is decided client-side (localStorage) via cms-loader; for SSR
  // we render EN (the canonical version). Client will re-render blocks
  // in PT after boot if needed. Query param overrides for previews.
  const qLocale = String(req.query.locale || '').toLowerCase();
  const locale = SUPPORTED_LOCALES.includes(qLocale) ? qLocale : DEFAULT_LOCALE;

  const templatePath = path.join(process.cwd(), 'page.html');
  let template;
  try {
    template = fs.readFileSync(templatePath, 'utf8');
  } catch (e) {
    res.status(500).send('page.html template missing');
    return;
  }

  if (!slug) {
    res.status(400).send(renderNotFound(template, '', 'Missing slug.'));
    return;
  }

  try {
    // Preview mode: when ?preview=1, drafts are also returned. RLS blocks
    // this for the anon key — but when the caller passes an auth token
    // via cookies/header this could work. For v1 we keep public-only.
    const url = `${SUPABASE_URL}/rest/v1/pages` +
      `?slug=eq.${encodeURIComponent(slug)}` +
      `&published=eq.true` +
      `&select=slug,title,blocks,seo,updated_at` +
      `&limit=1`;

    const resp = await fetch(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });

    if (!resp.ok) {
      console.error('page SSR: supabase fetch failed', resp.status);
      res.status(502).send(renderNotFound(template, slug, 'Content service unavailable.'));
      return;
    }

    const rows = await resp.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      res.status(404).send(renderNotFound(template, slug));
      return;
    }

    const page = rows[0];
    const html = renderPage(template, page, locale, slug);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    // Cache at the edge for 60s; browser revalidates. Studio publishes
    // trigger a purge later — for now short TTL keeps things fresh.
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=300');
    res.status(200).send(html);
  } catch (error) {
    console.error('page SSR error:', error);
    res.status(500).send(renderNotFound(template, slug, 'Server error.'));
  }
}

// ---- rendering helpers -----------------------------------------------

function renderPage(template, page, locale, slug) {
  const title = pickLocalized(page.title, locale) || 'Untitled';
  const seo = page.seo || {};
  const seoTitle = pickLocalized(seo.title, locale) || title;
  const seoDesc  = pickLocalized(seo.description, locale) || '';
  const ogImage  = seo.og_image || '';
  const canonical = `${SITE_BASE}/p/${encodeURIComponent(slug)}`;
  const fullTitle = `${seoTitle} | Smith & Adams`;

  const seoTags =
    `<title>${escapeHtml(fullTitle)}</title>` +
    `<meta name="description" content="${escapeAttr(seoDesc)}">` +
    `<link rel="canonical" href="${canonical}">` +
    `<meta property="og:title" content="${escapeAttr(fullTitle)}">` +
    `<meta property="og:description" content="${escapeAttr(seoDesc)}">` +
    (ogImage ? `<meta property="og:image" content="${escapeAttr(ogImage)}">` : '') +
    `<meta property="og:type" content="website">` +
    `<meta property="og:url" content="${canonical}">` +
    `<meta name="twitter:card" content="summary_large_image">` +
    `<meta name="twitter:title" content="${escapeAttr(fullTitle)}">` +
    `<meta name="twitter:description" content="${escapeAttr(seoDesc)}">` +
    (ogImage ? `<meta name="twitter:image" content="${escapeAttr(ogImage)}">` : '');

  // Server-rendered EN copy (canonical). We also stash the raw page data
  // in a script tag so the client can re-render in another locale on
  // request without a round-trip.
  const bodyHtml =
    `<h1 class="satoshi text-4xl md:text-5xl font-bold text-[#0C1E28] text-center mt-16 mb-4">${escapeHtml(title)}</h1>` +
    `<div id="studio-blocks">` +
      renderBlocks(page.blocks, locale) +
    `</div>` +
    `<script id="__STUDIO_PAGE__" type="application/json">${escapeJsonForScript(page)}</script>`;

  return template
    .replace(/<!-- STUDIO_SEO -->[\s\S]*?<!-- \/STUDIO_SEO -->/, `<!-- STUDIO_SEO -->${seoTags}<!-- /STUDIO_SEO -->`)
    .replace(/<!-- STUDIO_BODY -->[\s\S]*?<!-- \/STUDIO_BODY -->/, `<!-- STUDIO_BODY -->${bodyHtml}<!-- /STUDIO_BODY -->`);
}

function renderNotFound(template, slug, extra) {
  const msg = extra || 'Page not found.';
  const body =
    `<div class="max-w-2xl mx-auto text-center py-32 px-6 satoshi">` +
      `<h1 class="text-4xl font-bold text-[#0C1E28] mb-4">404</h1>` +
      `<p class="text-gray-500 mb-8">${escapeHtml(msg)}${slug ? ' (' + escapeHtml('/p/' + slug) + ')' : ''}</p>` +
      `<a href="/" class="inline-block bg-[#0C1E28] text-white px-6 py-3 rounded-full">Back to home</a>` +
    `</div>`;
  return template
    .replace(/<!-- STUDIO_SEO -->[\s\S]*?<!-- \/STUDIO_SEO -->/, `<!-- STUDIO_SEO --><title>Not found | Smith &amp; Adams</title><meta name="robots" content="noindex"><!-- /STUDIO_SEO -->`)
    .replace(/<!-- STUDIO_BODY -->[\s\S]*?<!-- \/STUDIO_BODY -->/, `<!-- STUDIO_BODY -->${body}<!-- /STUDIO_BODY -->`);
}

// JSON-in-<script> must escape </script> and U+2028/9 to be safe.
function escapeJsonForScript(obj) {
  return JSON.stringify(obj)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

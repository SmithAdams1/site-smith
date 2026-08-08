import fs from 'fs';
import path from 'path';
import { renderRdBlocks } from './_renderRdBlocks.js';

// =====================================================================
// Phase 2 pilot — SSR for the hand-built pages rebuilt as rd- blocks.
// Fetches a page's block list from `rd_pages`, renders the rd- component
// blocks server-side (crawlers get full HTML), and injects them into the
// page's own shell (head/nav/footer/scripts) at the <!--RD_BLOCKS-->
// marker. Content is baked into the HTML, so no data-cms/site_content is
// needed for these sections — cms-loader still runs for the nav/footer.
//
// Pilot serves ONLY `about`. Test it live at /api/rd-page?slug=about
// (no rewrite yet, so it doesn't collide with the static about.html).
// Cutover later: rewrite /about -> here + delete the static about.html.
// =====================================================================

const SUPABASE_URL = 'https://bcjtkfipcfvvitglgpys.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjanRrZmlwY2Z2dml0Z2xncHlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNDU3NjcsImV4cCI6MjA5MTgyMTc2N30.kgnE2E-xDQT855to1Nz8LNKtwIBGw2QsIw81Us3B_ZA';

const SUPPORTED_LOCALES = ['en', 'pt'];
// slug -> shell file (its head/nav/footer/scripts, with a <!--RD_BLOCKS--> marker)
const SHELLS = { about: 'about.shell.html' };
// committed fallback block models, so the route works before the SQL is run
const FALLBACK = { about: 'docs/about.blocks.json' };

export default async function handler(req, res) {
  const slug = String(req.query.slug || 'about').trim();
  const qLocale = String(req.query.locale || '').toLowerCase();
  const locale = SUPPORTED_LOCALES.includes(qLocale) ? qLocale : 'en';

  if (!SHELLS[slug]) { res.status(404).send('Unknown rd-page: ' + slug); return; }

  let shell;
  try {
    // Literal path so Vercel's file tracer bundles the shell into the
    // function (api/page.js reads 'page.html' the same way; a variable path
    // is not traced -> file absent at runtime). Pilot is About-only;
    // generalising to more pages later moves to vercel.json includeFiles.
    shell = fs.readFileSync(path.join(process.cwd(), 'about.shell.html'), 'utf8');
  } catch (e) {
    res.status(500).send('Shell template missing: about.shell.html');
    return;
  }
  if (shell.indexOf('<!--RD_BLOCKS-->') < 0) {
    res.status(500).send('Shell marker <!--RD_BLOCKS--> missing');
    return;
  }

  // Blocks: from rd_pages if present, else the committed JSON fallback.
  let blocks = await fetchBlocks(slug);
  if (!Array.isArray(blocks)) blocks = readFallback(slug);
  if (!Array.isArray(blocks)) { res.status(502).send('No blocks for ' + slug); return; }

  let rendered;
  try {
    rendered = renderRdBlocks(blocks, locale);
  } catch (e) {
    console.error('rd-page render error', e);
    res.status(500).send('Render error');
    return;
  }

  const html = shell.replace('<!--RD_BLOCKS-->', rendered);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=300');
  res.status(200).send(html);
}

async function fetchBlocks(slug) {
  try {
    const url = `${SUPABASE_URL}/rest/v1/rd_pages` +
      `?slug=eq.${encodeURIComponent(slug)}` +
      `&select=slug,blocks&limit=1`;
    const resp = await fetch(url, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    });
    if (!resp.ok) return null;
    const rows = await resp.json();
    if (Array.isArray(rows) && rows.length && Array.isArray(rows[0].blocks)) return rows[0].blocks;
    return null;
  } catch (e) {
    return null;
  }
}

function readFallback(slug) {
  if (slug !== 'about') return null;
  try {
    // Literal path (traced + bundled by Vercel), same reason as the shell.
    const j = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'docs/about.blocks.json'), 'utf8'));
    return Array.isArray(j.blocks) ? j.blocks : null;
  } catch (e) {
    return null;
  }
}

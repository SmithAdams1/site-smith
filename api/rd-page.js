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
// Pages served from the block model. Shell + committed fallback are read via
// LITERAL paths in readShell()/readFallback() so Vercel's file tracer bundles
// them into the function (a variable path is not traced).
const PAGES = { 'about': true, 'invest-in-portugal': true };

// Client module embedded in the served page: repaints the block region in
// PT when cmsLocale is 'pt' (block content has no data-cms). Uses the SAME
// renderer as the SSR. Initial PT paint waits for window.load so redesign.js
// has already booted on the EN nodes (avoids a double-wire race), then we
// re-init reveals (make them visible) and the bio toggle on the new nodes.
const RD_CLIENT_JS = `
import { renderRdBlocks } from '/lib/renderRdBlocks.js';
(function(){
  var el = document.getElementById('__RD_BLOCKS__'); if(!el) return;
  var model; try { model = JSON.parse(el.textContent); } catch(e){ return; }
  function loc(){ try { return localStorage.getItem('cmsLocale') === 'pt' ? 'pt' : 'en'; } catch(e){ return 'en'; } }
  var painted = 'en';
  function region(){ var m=document.querySelector('main'); if(!m) return null; var s=null,e=null,n; for(n=m.firstChild;n;n=n.nextSibling){ if(n.nodeType===8){ if(n.data==='RD:START')s=n; else if(n.data==='RD:END')e=n; } } return (s&&e)?{m:m,s:s,e:e}:null; }
  function reinit(){
    document.querySelectorAll('main .reveal, main .reveal-line').forEach(function(x){ x.style.opacity='1'; x.style.transform='none'; });
    var t = document.querySelector('main .rd-msg__trigger');
    if(t && !t._rdWired){ t._rdWired=1; var p=document.getElementById(t.getAttribute('aria-controls')); var f=t.closest('.rd-msg__figure'); if(f)f.setAttribute('data-js','1'); var set=function(o){ t.setAttribute('aria-expanded',o?'true':'false'); if(p){ if(o)p.setAttribute('data-open','1'); else p.removeAttribute('data-open'); p.setAttribute('aria-hidden',o?'false':'true'); } }; t.addEventListener('click',function(){ set(t.getAttribute('aria-expanded')!=='true'); }); set(false); }
  }
  function paint(l){ if(l===painted) return; var r=region(); if(!r) return; while(r.s.nextSibling && r.s.nextSibling!==r.e) r.m.removeChild(r.s.nextSibling); var tpl=document.createElement('template'); tpl.innerHTML = renderRdBlocks(model.blocks, l); r.m.insertBefore(tpl.content, r.e); painted=l; reinit(); }
  window.addEventListener('load', function(){ if(loc()==='pt') paint('pt'); });
  window.addEventListener('storage', function(ev){ if(ev.key==='cmsLocale') paint(loc()); });
  document.addEventListener('click', function(ev){ var s=ev.target && ev.target.closest && ev.target.closest('.cms-lang-switcher'); if(s) setTimeout(function(){ paint(loc()); }, 60); }, true);
})();
`;

// JSON-in-<script> must escape </script> and the line separators.
function escapeJsonForScript(obj){
  return JSON.stringify(obj)
    .replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

const SITE_BASE = 'https://www.smithandadams.com';

// Portuguese <head> SEO for the localized (/pt/...) URLs. EN comes from the
// shell verbatim. Keep "&amp;" — these land inside HTML head tags.
const PT_SEO = {
  'about': {
    title: 'Sobre Nós | Consultoria Imobiliária Independente em Portugal | Smith &amp; Adams',
    desc: 'Desde 2020, a Smith &amp; Adams ajuda investidores internacionais a construir carteiras imobiliárias em euros em Portugal e a obter residência. Conheça o grupo de consultoria independente.',
  },
  'invest-in-portugal': {
    title: 'Investir em Portugal | Visto D2 e Golden Visa | Smith &amp; Adams',
    desc: 'Dois caminhos para a residência europeia: o Visto D2 para empreendedores e o Golden Visa para investidores. Compare objetivos, prazos e investimento com a Smith &amp; Adams.',
  },
};

// Rewrite the shell <head> for the served locale: correct canonical + og:url,
// reciprocal hreflang (en / pt / x-default), and — for PT — <html lang>, title
// and descriptions. Regex targets tag shapes (not exact EN text), so it is
// resilient to copy changes.
function localizeHead(shell, slug, locale) {
  const enUrl = SITE_BASE + '/' + slug;
  const ptUrl = SITE_BASE + '/pt/' + slug;
  const canonical = locale === 'pt' ? ptUrl : enUrl;
  const hreflang =
    '<link rel="alternate" hreflang="en" href="' + enUrl + '"/>' +
    '<link rel="alternate" hreflang="pt" href="' + ptUrl + '"/>' +
    '<link rel="alternate" hreflang="x-default" href="' + enUrl + '"/>';

  let out = shell;
  // canonical -> locale-correct, and append the hreflang set right after it
  out = out.replace(/<link[^>]*rel=["']canonical["'][^>]*>/i,
    '<link rel="canonical" href="' + canonical + '"/>' + hreflang);
  // og:url -> canonical for this locale
  out = out.replace(/(<meta[^>]*property=["']og:url["'][^>]*content=["'])[^"']*(["'])/i,
    '$1' + canonical + '$2');

  if (locale === 'pt') {
    out = out.replace(/<html([^>]*)\slang=["']en["']/i, '<html$1 lang="pt"');
    const seo = PT_SEO[slug];
    if (seo) {
      out = out.replace(/<title>[\s\S]*?<\/title>/i, '<title>' + seo.title + '</title>');
      out = out.replace(/(<meta[^>]*name=["']description["'][^>]*content=["'])[^"']*(["'])/i, '$1' + seo.desc + '$2');
      out = out.replace(/(<meta[^>]*property=["']og:title["'][^>]*content=["'])[^"']*(["'])/i, '$1' + seo.title + '$2');
      out = out.replace(/(<meta[^>]*property=["']og:description["'][^>]*content=["'])[^"']*(["'])/i, '$1' + seo.desc + '$2');
    }
  }
  return out;
}

export default async function handler(req, res) {
  const slug = String(req.query.slug || 'about').trim();
  const qLocale = String(req.query.locale || '').toLowerCase();
  const locale = SUPPORTED_LOCALES.includes(qLocale) ? qLocale : 'en';

  if (!PAGES[slug]) { res.status(404).send('Unknown rd-page: ' + slug); return; }

  const shell = readShell(slug);
  if (shell == null) { res.status(500).send('Shell template missing for ' + slug); return; }
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

  // Baseline = EN (canonical) between markers; embed the model + a client
  // module that repaints in PT when cmsLocale is 'pt' (block content has no
  // data-cms, so cms-loader can't switch it — this keeps the no-reload UX).
  const injected =
    '<!--RD:START-->' + rendered + '<!--RD:END-->' +
    '<script type="application/json" id="__RD_BLOCKS__">' + escapeJsonForScript({ blocks }) + '</script>' +
    '<script type="module">' + RD_CLIENT_JS + '</script>';
  const localizedShell = localizeHead(shell, slug, locale);
  const html = localizedShell.replace('<!--RD_BLOCKS-->', injected);
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

// Literal paths so Vercel's file tracer bundles each shell/fallback.
function readShell(slug) {
  try {
    if (slug === 'about') return fs.readFileSync(path.join(process.cwd(), 'about.shell.html'), 'utf8');
    if (slug === 'invest-in-portugal') return fs.readFileSync(path.join(process.cwd(), 'invest-in-portugal.shell.html'), 'utf8');
  } catch (e) {}
  return null;
}
function readFallback(slug) {
  try {
    if (slug === 'about') return JSON.parse(fs.readFileSync(path.join(process.cwd(), 'docs/about.blocks.json'), 'utf8')).blocks;
    if (slug === 'invest-in-portugal') return JSON.parse(fs.readFileSync(path.join(process.cwd(), 'docs/invest.blocks.json'), 'utf8')).blocks;
  } catch (e) {}
  return null;
}

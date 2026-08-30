import fs from 'fs';
import path from 'path';

// Server-renders real-estate.html with (1) an ItemList JSON-LD of the published
// properties and (2) a crawlable list of property links inside #re-grid, so
// non-JS crawlers and answer engines see the listings (the client app overwrites
// #re-grid on load, so users still get the interactive, filterable grid).
export default async function handler(req, res) {
  const SUPABASE_URL = 'https://bcjtkfipcfvvitglgpys.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjanRrZmlwY2Z2dml0Z2xncHlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNDU3NjcsImV4cCI6MjA5MTgyMTc2N30.kgnE2E-xDQT855to1Nz8LNKtwIBGw2QsIw81Us3B_ZA';
  const filePath = path.join(process.cwd(), 'real-estate.shell.html');
  const BASE = 'https://www.smithandadams.com';

  try {
    let html = fs.readFileSync(filePath, 'utf8');
    let rows = [];
    try {
      const resp = await fetch(
        `${SUPABASE_URL}/rest/v1/properties?status=eq.published&select=slug,title,cover_image,images,price,currency,sold,upcoming,city,region,bedrooms,bathrooms,property_type&order=featured.desc,sort_order.asc,created_at.desc`,
        { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
      );
      if (resp.ok) rows = await resp.json();
    } catch (e) { rows = []; }

    if (Array.isArray(rows) && rows.length) {
      const pick = (o) => o ? (typeof o === 'string' ? o : (o.en || o.pt || '')) : '';
      const toAbs = (u) => (u && !u.startsWith('http')) ? (BASE + '/' + u.replace(/^\.?\//, '')) : u;
      const fmtPrice = (p, cur) => {
        if (p == null || p === '') return '';
        const s = cur === 'USD' ? '$' : cur === 'GBP' ? '£' : '€';
        return s + Number(p).toLocaleString('en-GB');
      };

      // ---- ItemList JSON-LD ----
      const itemList = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'Smith & Adams real estate in Portugal',
        numberOfItems: rows.length,
        itemListElement: rows.map((p, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: `${BASE}/property/${encodeURIComponent(p.slug)}`,
          name: pick(p.title),
          image: toAbs(p.cover_image || (Array.isArray(p.images) && p.images[0])) || undefined,
        })),
      };
      const itemListLd = `\n<script type="application/ld+json">${JSON.stringify(itemList).replace(/</g, '\\u003c')}</script>\n`;
      html = html.replace('</head>', itemListLd + '</head>');

      // ---- Server-rendered link cards inside #re-grid (crawler/GEO fallback) ----
      const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
      const cards = rows.map((p) => {
        const title = esc(pick(p.title));
        const loc = esc([p.city, p.region].filter(Boolean).join(', '));
        const priceLabel = p.sold ? 'Sold' : (p.price ? `${p.upcoming ? 'From ' : ''}${fmtPrice(p.price, p.currency)}` : 'Price on application');
        const img = toAbs(p.cover_image || (Array.isArray(p.images) && p.images[0])) || '';
        const specs = [];
        if (p.bedrooms) specs.push(`${p.bedrooms} bed`);
        if (p.bathrooms) specs.push(`${p.bathrooms} bath`);
        return `<a href="/property/${encodeURIComponent(p.slug)}" style="text-decoration:none;color:inherit;display:block;">`
          + (img ? `<img src="${esc(img)}" alt="${title}" loading="lazy" style="width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:2px;">` : '')
          + `<h3 style="font-size:18px;color:#11222D;margin:12px 0 4px;">${title}</h3>`
          + (loc ? `<p style="font-size:13px;color:#6A7883;margin:0 0 4px;">${loc}</p>` : '')
          + (specs.length ? `<p style="font-size:13px;color:#6A7883;margin:0 0 4px;">${esc(specs.join(' · '))}</p>` : '')
          + `<p style="font-size:15px;color:#11222D;font-weight:600;margin:0;">${esc(priceLabel)}</p>`
          + `</a>`;
      }).join('');

      html = html.replace(
        '<div id="re-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:26px;"></div>',
        `<div id="re-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:26px;">${cards}</div>`
      );
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=120, stale-while-revalidate=600');
    res.status(200).send(html);
  } catch (error) {
    console.error('real-estate SSR error:', error);
    const html = fs.readFileSync(filePath, 'utf8');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);
  }
}

import fs from 'fs';
import path from 'path';

// Server-renders property.html with real SEO meta tags for /property/:slug
export default async function handler(req, res) {
  // Real Estate listing SSR is folded into this function (Vercel Hobby caps
  // serverless functions at 12; a separate api/real-estate.js would exceed it).
  if (req.query.list === '1') return renderRealEstateList(req, res);
  const { slug } = req.query;
  const locale = String(req.query.locale || '').toLowerCase() === 'pt' ? 'pt' : 'en';

  const SUPABASE_URL = 'https://bcjtkfipcfvvitglgpys.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjanRrZmlwY2Z2dml0Z2xncHlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNDU3NjcsImV4cCI6MjA5MTgyMTc2N30.kgnE2E-xDQT855to1Nz8LNKtwIBGw2QsIw81Us3B_ZA';

  const filePath = path.join(process.cwd(), 'property.html');

  try {
    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/properties?slug=eq.${encodeURIComponent(slug)}&status=eq.published&select=title,summary,description,highlights,cover_image,images,region,city,address,property_type,price,currency,bedrooms,bathrooms,area_sqm,latitude,longitude,sold,upcoming,reference&limit=1`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
    );
    const data = await resp.json();
    let html = fs.readFileSync(filePath, 'utf8');

    if (data && data.length > 0) {
      const p = data[0];
      const pickL = (o) => o ? (locale === 'pt' ? (o.pt || o.en) : (o.en || o.pt)) : '';
      const plain = (s) => String(s == null ? '' : s).replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();
      const toAbs = (u) => (u && !u.startsWith('http')) ? ('https://www.smithandadams.com/' + u.replace(/^\.?\//, '')) : u;
      const title = pickL(p.title) || 'Property';
      const descHtml = pickL(p.description) || '';
      const descPlain = plain(descHtml) || pickL(p.summary) ||
        `${title} in ${[p.city, p.region].filter(Boolean).join(', ')} - Smith & Adams real estate.`;
      const metaDesc = descPlain.length > 300 ? descPlain.slice(0, 297) + '...' : descPlain;
      const imgs = (Array.isArray(p.images) ? p.images : []).map(toAbs).filter(Boolean);
      let img = toAbs(p.cover_image) || imgs[0] || '';
      const highlights = (() => { const h = p.highlights; if (!h) return []; if (Array.isArray(h)) return h; return (locale === 'pt' ? (h.pt && h.pt.length ? h.pt : h.en) : (h.en || h.pt)) || []; })();
      const enUrl = `https://www.smithandadams.com/property/${encodeURIComponent(slug)}`;
      const ptUrl = `https://www.smithandadams.com/pt/property/${encodeURIComponent(slug)}`;
      const canonical = locale === 'pt' ? ptUrl : enUrl;
      const hreflang =
        `<link rel="alternate" hreflang="en" href="${enUrl}"/>` +
        `<link rel="alternate" hreflang="pt" href="${ptUrl}"/>` +
        `<link rel="alternate" hreflang="x-default" href="${enUrl}"/>`;
      const fullTitle = `${title} | Smith & Adams Real Estate`;

      const availability = p.sold ? 'https://schema.org/SoldOut' : (p.upcoming ? 'https://schema.org/PreOrder' : 'https://schema.org/InStock');
      const listing = {
        '@context': 'https://schema.org',
        '@type': ['RealEstateListing', 'Residence'],
        name: title,
        description: descPlain,
        image: imgs.length ? imgs : (img || undefined),
        url: canonical,
        numberOfBedrooms: p.bedrooms || undefined,
        numberOfBathroomsTotal: p.bathrooms || undefined,
        floorSize: p.area_sqm ? { '@type': 'QuantitativeValue', value: p.area_sqm, unitCode: 'MTK' } : undefined,
        address: (p.address || p.city) ? { '@type': 'PostalAddress', streetAddress: p.address || undefined, addressLocality: p.city || undefined, addressRegion: p.region || undefined, addressCountry: 'PT' } : undefined,
        geo: (p.latitude && p.longitude) ? { '@type': 'GeoCoordinates', latitude: p.latitude, longitude: p.longitude } : undefined,
        amenityFeature: highlights.length ? highlights.map(a => ({ '@type': 'LocationFeatureSpecification', name: a, value: true })) : undefined,
        offers: p.price
          ? { '@type': 'Offer', price: p.price, priceCurrency: p.currency || 'EUR', availability }
          : { '@type': 'Offer', availability, priceCurrency: p.currency || 'EUR' },
        provider: { '@type': 'RealEstateAgent', '@id': 'https://www.smithandadams.com/#organization', name: 'Smith & Adams Group', url: 'https://www.smithandadams.com' },
      };
      const breadcrumb = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.smithandadams.com/' },
          { '@type': 'ListItem', position: 2, name: locale === 'pt' ? 'Imóveis' : 'Real Estate', item: 'https://www.smithandadams.com/real-estate' },
          { '@type': 'ListItem', position: 3, name: title, item: canonical },
        ],
      };
      const enc = (o) => JSON.stringify(o).replace(/</g, '\\u003c');
      const jsonLd = enc(listing) + '</script>\n<script type="application/ld+json">' + enc(breadcrumb);

      const seoTags = `
        <title>${escapeHtml(fullTitle)}</title>
        <meta name="description" content="${escapeAttr(metaDesc)}">
        <link rel="canonical" href="${canonical}">
        ${hreflang}
        <meta property="og:title" content="${escapeAttr(fullTitle)}">
        <meta property="og:description" content="${escapeAttr(metaDesc)}">
        <meta property="og:image" content="${escapeAttr(img)}">
        <meta property="og:type" content="website">
        <meta property="og:url" content="${canonical}">
        <meta name="twitter:card" content="summary_large_image">
        <meta name="twitter:title" content="${escapeAttr(fullTitle)}">
        <meta name="twitter:description" content="${escapeAttr(metaDesc)}">
        <meta name="twitter:image" content="${escapeAttr(img)}">
        <script type="application/ld+json">${jsonLd}</script>
      `;
      html = html.replace(/<title>.*?<\/title>/, seoTags);

      // Server-rendered content block so non-JS crawlers (GPTBot, PerplexityBot,
      // CCBot, Google AI) see the real listing content, not an empty shell. The
      // client app overwrites #pd-root on load, so users get the interactive view.
      const specParts = [];
      if (p.bedrooms) specParts.push(`${p.bedrooms} ${locale === 'pt' ? 'quartos' : 'bedrooms'}`);
      if (p.bathrooms) specParts.push(`${p.bathrooms} ${locale === 'pt' ? 'casas de banho' : 'bathrooms'}`);
      if (p.area_sqm) specParts.push(`${Math.round(p.area_sqm)} m²`);
      if (p.property_type) specParts.push(escapeHtml(String(p.property_type)));
      if (p.reference) specParts.push(`Ref ${escapeHtml(String(p.reference))}`);
      const cur = p.currency === 'USD' ? '$' : p.currency === 'GBP' ? '£' : '€';
      const priceLabel = p.sold
        ? (locale === 'pt' ? 'Vendido' : 'Sold')
        : (p.price ? `${p.upcoming ? (locale === 'pt' ? 'Desde ' : 'From ') : ''}${cur}${Number(p.price).toLocaleString('en-GB')}` : (locale === 'pt' ? 'Sob consulta' : 'Price on application'));
      const ssr = `
        <section style="max-width:1200px;margin:0 auto;padding:40px 24px;">
          <p>${escapeHtml([p.city, p.region].filter(Boolean).join(', '))}</p>
          <h1>${escapeHtml(title)}</h1>
          <p>${escapeHtml(priceLabel)}</p>
          ${descHtml ? `<div>${descHtml}</div>` : ''}
          ${specParts.length ? `<ul>${specParts.map(s => `<li>${s}</li>`).join('')}</ul>` : ''}
          ${highlights.length ? `<h2>${locale === 'pt' ? 'Destaques' : 'Highlights'}</h2><ul>${highlights.map(a => `<li>${escapeHtml(a)}</li>`).join('')}</ul>` : ''}
          ${p.address ? `<p>${escapeHtml(p.address)}</p>` : ''}
          <p><a href="/real-estate">${locale === 'pt' ? 'Ver todos os imóveis' : 'View all properties'}</a></p>
        </section>`;
      html = html.replace('<div id="pd-root" class="pd-detail" style="display:none;"></div>', `<div id="pd-root" class="pd-detail" style="display:none;">${ssr}</div>`);
      if (locale === 'pt') html = html.replace(/<html lang=["']en["']/i, '<html lang="pt"');
      html = html.replace('<head>', `<head><script>window.INJECTED_SLUG = ${JSON.stringify(String(slug))};</script>`);
    } else {
      html = html.replace('<head>', `<head><script>window.INJECTED_SLUG = ${JSON.stringify(String(slug || ''))};</script>`);
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);
  } catch (error) {
    console.error('property SSR error:', error);
    const html = fs.readFileSync(filePath, 'utf8')
      .replace('<head>', `<head><script>window.INJECTED_SLUG = ${JSON.stringify(String(slug || ''))};</script>`);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);
  }
}

function escapeHtml(s) { return String(s == null ? '' : s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }
function escapeAttr(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

// Real Estate listing SSR: reads real-estate.shell.html, fetches published
// properties and injects an ItemList JSON-LD + crawlable <a> link-cards into
// #re-grid (the client app overwrites #re-grid on load). Served at
// /real-estate via /api/property?list=1.
async function renderRealEstateList(req, res) {
  const SUPABASE_URL = 'https://bcjtkfipcfvvitglgpys.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjanRrZmlwY2Z2dml0Z2xncHlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNDU3NjcsImV4cCI6MjA5MTgyMTc2N30.kgnE2E-xDQT855to1Nz8LNKtwIBGw2QsIw81Us3B_ZA';
  const BASE = 'https://www.smithandadams.com';
  const filePath = path.join(process.cwd(), 'real-estate.shell.html');
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
      const itemList = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'Smith & Adams real estate in Portugal',
        numberOfItems: rows.length,
        itemListElement: rows.map((p, i) => ({
          '@type': 'ListItem', position: i + 1,
          url: `${BASE}/property/${encodeURIComponent(p.slug)}`,
          name: pick(p.title),
          image: toAbs(p.cover_image || (Array.isArray(p.images) && p.images[0])) || undefined,
        })),
      };
      html = html.replace('</head>', `\n<script type="application/ld+json">${JSON.stringify(itemList).replace(/</g, '\\u003c')}</script>\n</head>`);

      const cards = rows.map((p) => {
        const title = escapeAttr(pick(p.title));
        const loc = escapeAttr([p.city, p.region].filter(Boolean).join(', '));
        const priceLabel = p.sold ? 'Sold' : (p.price ? `${p.upcoming ? 'From ' : ''}${fmtPrice(p.price, p.currency)}` : 'Price on application');
        const img = toAbs(p.cover_image || (Array.isArray(p.images) && p.images[0])) || '';
        const specs = [];
        if (p.bedrooms) specs.push(`${p.bedrooms} bed`);
        if (p.bathrooms) specs.push(`${p.bathrooms} bath`);
        return `<a href="/property/${encodeURIComponent(p.slug)}" style="text-decoration:none;color:inherit;display:block;">`
          + (img ? `<img src="${escapeAttr(img)}" alt="${title}" loading="lazy" style="width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:2px;">` : '')
          + `<h3 style="font-size:18px;color:#11222D;margin:12px 0 4px;">${title}</h3>`
          + (loc ? `<p style="font-size:13px;color:#6A7883;margin:0 0 4px;">${loc}</p>` : '')
          + (specs.length ? `<p style="font-size:13px;color:#6A7883;margin:0 0 4px;">${escapeHtml(specs.join(' \u00b7 '))}</p>` : '')
          + `<p style="font-size:15px;color:#11222D;font-weight:600;margin:0;">${escapeHtml(priceLabel)}</p></a>`;
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
    console.error('real-estate listing SSR error:', error);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(fs.readFileSync(filePath, 'utf8'));
  }
}

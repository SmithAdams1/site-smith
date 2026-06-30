import fs from 'fs';
import path from 'path';

// Server-renders property.html with real SEO meta tags for /property/:slug
export default async function handler(req, res) {
  const { slug } = req.query;

  const SUPABASE_URL = 'https://bcjtkfipcfvvitglgpys.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjanRrZmlwY2Z2dml0Z2xncHlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNDU3NjcsImV4cCI6MjA5MTgyMTc2N30.kgnE2E-xDQT855to1Nz8LNKtwIBGw2QsIw81Us3B_ZA';

  const filePath = path.join(process.cwd(), 'property.html');

  try {
    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/properties?slug=eq.${encodeURIComponent(slug)}&status=eq.published&select=title,summary,cover_image,images,region,city,property_type,price,currency&limit=1`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
    );
    const data = await resp.json();
    let html = fs.readFileSync(filePath, 'utf8');

    if (data && data.length > 0) {
      const p = data[0];
      const title = (p.title && (p.title.en || p.title.pt)) || 'Property';
      const desc  = (p.summary && (p.summary.en || p.summary.pt)) ||
        `${title} in ${[p.city, p.region].filter(Boolean).join(', ')} - Smith & Adams real estate.`;
      let img = p.cover_image || (Array.isArray(p.images) && p.images[0]) || '';
      if (img && !img.startsWith('http')) img = 'https://smithandadams.com/' + img.replace(/^\.?\//, '');
      const canonical = `https://smithandadams.com/property/${slug}`;
      const fullTitle = `${title} | Smith & Adams Real Estate`;

      const jsonLd = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'RealEstateListing',
        name: title,
        description: desc,
        image: img || undefined,
        url: canonical,
        offers: p.price ? { '@type': 'Offer', price: p.price, priceCurrency: p.currency || 'EUR' } : undefined,
        provider: { '@type': 'Organization', name: 'Smith & Adams Group', url: 'https://smithandadams.com' },
      });

      const seoTags = `
        <title>${escapeHtml(fullTitle)}</title>
        <meta name="description" content="${escapeAttr(desc)}">
        <link rel="canonical" href="${canonical}">
        <meta property="og:title" content="${escapeAttr(fullTitle)}">
        <meta property="og:description" content="${escapeAttr(desc)}">
        <meta property="og:image" content="${escapeAttr(img)}">
        <meta property="og:type" content="website">
        <meta property="og:url" content="${canonical}">
        <meta name="twitter:card" content="summary_large_image">
        <meta name="twitter:title" content="${escapeAttr(fullTitle)}">
        <meta name="twitter:description" content="${escapeAttr(desc)}">
        <meta name="twitter:image" content="${escapeAttr(img)}">
        <script type="application/ld+json">${jsonLd}</script>
      `;
      html = html.replace(/<title>.*?<\/title>/, seoTags);
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

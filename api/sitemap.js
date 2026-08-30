export default async function handler(req, res) {
  const BASE_URL = 'https://www.smithandadams.com';
  const today = new Date().toISOString().split('T')[0];

  const staticPages = [
    { loc: `${BASE_URL}/blog`,                lastmod: today, changefreq: 'daily',   priority: '0.8' },
    { loc: `${BASE_URL}/terms`,               lastmod: today, changefreq: 'yearly',  priority: '0.3' },
    { loc: `${BASE_URL}/privacy`,             lastmod: today, changefreq: 'yearly',  priority: '0.3' },
  ];

  const SUPABASE_URL = 'https://bcjtkfipcfvvitglgpys.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjanRrZmlwY2Z2dml0Z2xncHlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNDU3NjcsImV4cCI6MjA5MTgyMTc2N30.kgnE2E-xDQT855to1Nz8LNKtwIBGw2QsIw81Us3B_ZA';
  const sbHeaders = { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` };
  const dateOf = (v) => (v ? new Date(v).toISOString().split('T')[0] : today);

  // Blog posts
  let blogEntries = [];
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/posts?select=slug,created_at,translations&order=created_at.desc`, { headers: sbHeaders });
    const posts = await r.json();
    if (Array.isArray(posts)) {
      posts.filter(p => p.slug).forEach(p => {
        const en = `${BASE_URL}/blog/${p.slug}`;
        const lastmod = dateOf(p.created_at);
        const hasPt = p.translations && p.translations.pt;
        if (hasPt) {
          const pt = `${BASE_URL}/pt/blog/${p.slug}`;
          const alts =
            `<xhtml:link rel="alternate" hreflang="en" href="${en}"/>` +
            `<xhtml:link rel="alternate" hreflang="pt" href="${pt}"/>` +
            `<xhtml:link rel="alternate" hreflang="x-default" href="${en}"/>`;
          blogEntries.push({ loc: en, lastmod, changefreq: 'monthly', priority: '0.7', alternates: alts });
          blogEntries.push({ loc: pt, lastmod, changefreq: 'monthly', priority: '0.7', alternates: alts });
        } else {
          blogEntries.push({ loc: en, lastmod, changefreq: 'monthly', priority: '0.7' });
        }
      });
    }
  } catch (err) {
    console.error('Sitemap: failed to fetch blog posts', err);
  }

  // Published property listings
  let propertyEntries = [];
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/properties?status=eq.published&select=slug,updated_at,title&order=updated_at.desc`,
      { headers: sbHeaders }
    );
    const props = await r.json();
    if (Array.isArray(props)) {
      props.filter(p => p.slug).forEach(p => {
        const en = `${BASE_URL}/property/${p.slug}`;
        const lastmod = dateOf(p.updated_at);
        const hasPt = p.title && p.title.pt;
        if (hasPt) {
          const pt = `${BASE_URL}/pt/property/${p.slug}`;
          const alts =
            `<xhtml:link rel="alternate" hreflang="en" href="${en}"/>` +
            `<xhtml:link rel="alternate" hreflang="pt" href="${pt}"/>` +
            `<xhtml:link rel="alternate" hreflang="x-default" href="${en}"/>`;
          propertyEntries.push({ loc: en, lastmod, changefreq: 'weekly', priority: '0.8', alternates: alts });
          propertyEntries.push({ loc: pt, lastmod, changefreq: 'weekly', priority: '0.8', alternates: alts });
        } else {
          propertyEntries.push({ loc: en, lastmod, changefreq: 'weekly', priority: '0.8' });
        }
      });
    }
  } catch (err) {
    console.error('Sitemap: failed to fetch properties', err);
  }

  // Localized pages: real /pt/ URLs with reciprocal hreflang alternates.
  const localized = [
    { path: '/', priority: '1.0', changefreq: 'weekly' },
    { path: '/invest-in-portugal', priority: '0.9' },
    { path: '/golden-visa', priority: '0.9' },
    { path: '/d2-visa', priority: '0.9' },
    { path: '/hospitality', priority: '0.9' },
    { path: '/real-estate', priority: '0.9', changefreq: 'daily' },
    { path: '/property-management', priority: '0.8' },
    { path: '/about', priority: '0.7' },
    { path: '/contact', priority: '0.6' },
  ];
  const localizedEntries = [];
  localized.forEach((p) => {
    const en = p.path === '/' ? `${BASE_URL}/` : `${BASE_URL}${p.path}`;
    const pt = p.path === '/' ? `${BASE_URL}/pt` : `${BASE_URL}/pt${p.path}`;
    const cf = p.changefreq || 'monthly';
    const alts =
      `<xhtml:link rel="alternate" hreflang="en" href="${en}"/>` +
      `<xhtml:link rel="alternate" hreflang="pt" href="${pt}"/>` +
      `<xhtml:link rel="alternate" hreflang="x-default" href="${en}"/>`;
    localizedEntries.push({ loc: en, lastmod: today, changefreq: cf, priority: p.priority, alternates: alts });
    localizedEntries.push({ loc: pt, lastmod: today, changefreq: cf, priority: p.priority, alternates: alts });
  });

  const allPages = [...staticPages, ...localizedEntries, ...propertyEntries, ...blogEntries];

  const urlTags = allPages.map(p => `
  <url>
    <loc>${p.loc}</loc>
    <lastmod>${p.lastmod}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>${p.alternates || ''}
  </url>`).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urlTags}
</urlset>`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
  res.status(200).send(xml);
}

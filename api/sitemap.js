export default async function handler(req, res) {
  const BASE_URL = 'https://www.smithandadams.com';
  const today = new Date().toISOString().split('T')[0];

  const staticPages = [
    { loc: `${BASE_URL}/`,                    lastmod: today, changefreq: 'weekly',  priority: '1.0' },
    { loc: `${BASE_URL}/urban-collection`,    lastmod: today, changefreq: 'monthly', priority: '0.9' },
    { loc: `${BASE_URL}/our-developments`,    lastmod: today, changefreq: 'monthly', priority: '0.9' },
    { loc: `${BASE_URL}/real-estate`,         lastmod: today, changefreq: 'daily',   priority: '0.9' },
    { loc: `${BASE_URL}/property-management`, lastmod: today, changefreq: 'monthly', priority: '0.8' },
    { loc: `${BASE_URL}/blog`,                lastmod: today, changefreq: 'daily',   priority: '0.8' },
    { loc: `${BASE_URL}/contact`,             lastmod: today, changefreq: 'monthly', priority: '0.6' },
    { loc: `${BASE_URL}/lp-hygge-house`,             lastmod: today, changefreq: 'monthly', priority: '0.6' },
    { loc: `${BASE_URL}/lp-hygge-house-yield`,       lastmod: today, changefreq: 'monthly', priority: '0.6' },
    { loc: `${BASE_URL}/lp-hygge-house-citizenship`, lastmod: today, changefreq: 'monthly', priority: '0.6' },
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
    const r = await fetch(`${SUPABASE_URL}/rest/v1/posts?select=slug,created_at&order=created_at.desc`, { headers: sbHeaders });
    const posts = await r.json();
    if (Array.isArray(posts)) {
      blogEntries = posts.filter(p => p.slug).map(p => ({
        loc: `${BASE_URL}/blog/${p.slug}`, lastmod: dateOf(p.created_at), changefreq: 'monthly', priority: '0.7',
      }));
    }
  } catch (err) {
    console.error('Sitemap: failed to fetch blog posts', err);
  }

  // Published property listings
  let propertyEntries = [];
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/properties?status=eq.published&select=slug,updated_at&order=updated_at.desc`,
      { headers: sbHeaders }
    );
    const props = await r.json();
    if (Array.isArray(props)) {
      propertyEntries = props.filter(p => p.slug).map(p => ({
        loc: `${BASE_URL}/property/${p.slug}`, lastmod: dateOf(p.updated_at), changefreq: 'weekly', priority: '0.8',
      }));
    }
  } catch (err) {
    console.error('Sitemap: failed to fetch properties', err);
  }

  // Localized pages: real /pt/ URLs with reciprocal hreflang alternates.
  const localized = [
    { path: '/about', priority: '0.7' },
    { path: '/invest-in-portugal', priority: '0.9' },
  ];
  const localizedEntries = [];
  localized.forEach((p) => {
    const en = `${BASE_URL}${p.path}`;
    const pt = `${BASE_URL}/pt${p.path}`;
    const alts =
      `<xhtml:link rel="alternate" hreflang="en" href="${en}"/>` +
      `<xhtml:link rel="alternate" hreflang="pt" href="${pt}"/>` +
      `<xhtml:link rel="alternate" hreflang="x-default" href="${en}"/>`;
    localizedEntries.push({ loc: en, lastmod: today, changefreq: 'monthly', priority: p.priority, alternates: alts });
    localizedEntries.push({ loc: pt, lastmod: today, changefreq: 'monthly', priority: p.priority, alternates: alts });
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

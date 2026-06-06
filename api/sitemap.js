export default async function handler(req, res) {
  const BASE_URL = 'https://smithandadams.com';
  const today = new Date().toISOString().split('T')[0];

  const staticPages = [
    { loc: `${BASE_URL}/`,                         lastmod: today, changefreq: 'weekly',  priority: '1.0' },
    { loc: `${BASE_URL}/urban-collection`,          lastmod: today, changefreq: 'monthly', priority: '0.9' },
    { loc: `${BASE_URL}/property-management`,       lastmod: today, changefreq: 'monthly', priority: '0.8' },
    { loc: `${BASE_URL}/invest-in-portugal`,        lastmod: today, changefreq: 'monthly', priority: '0.9' },
    { loc: `${BASE_URL}/our-developments`,          lastmod: today, changefreq: 'monthly', priority: '0.9' },
    { loc: `${BASE_URL}/blog`,                      lastmod: today, changefreq: 'daily',   priority: '0.8' },
    { loc: `${BASE_URL}/about`,                     lastmod: today, changefreq: 'monthly', priority: '0.7' },
    { loc: `${BASE_URL}/contact`,                   lastmod: today, changefreq: 'monthly', priority: '0.6' },
  ];

  // Fetch blog posts from Supabase
  let blogEntries = [];
  try {
    const SUPABASE_URL = 'https://bcjtkfipcfvvitglgpys.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjanRrZmlwY2Z2dml0Z2xncHlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNDU3NjcsImV4cCI6MjA5MTgyMTc2N30.kgnE2E-xDQT855to1Nz8LNKtwIBGw2QsIw81Us3B_ZA';

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/posts?select=slug,date&order=date.desc`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      }
    );

    const posts = await response.json();
    if (Array.isArray(posts)) {
      blogEntries = posts.map(post => ({
        loc: `${BASE_URL}/blog/${post.slug}`,
        lastmod: post.date ? new Date(post.date).toISOString().split('T')[0] : today,
        changefreq: 'monthly',
        priority: '0.7'
      }));
    }
  } catch (err) {
    console.error('Sitemap: failed to fetch blog posts', err);
  }

  const allPages = [...staticPages, ...blogEntries];

  const urlTags = allPages.map(p => `
  <url>
    <loc>${p.loc}</loc>
    <lastmod>${p.lastmod}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urlTags}
</urlset>`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
  res.status(200).send(xml);
}

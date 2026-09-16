// Notifies IndexNow-participating engines (Bing, Yandex, Seznam) that content
// changed, so they re-crawl within minutes instead of on their own schedule.
// Called fire-and-forget by the Studio backoffice when a property or blog post
// is published. Google does not use IndexNow: for Google we rely on the dynamic
// sitemap (api/sitemap.js) plus Search Console.
const HOST = 'www.smithandadams.com';
const KEY = '5a8639dd08361f2f5372662f25e4869c'; // public: also served at /<key>.txt
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const raw = Array.isArray(body && body.urls) ? body.urls : [];

  // Normalise to absolute URLs on our own host; silently drop anything else so
  // this open endpoint can only ever ask engines to re-crawl our own pages.
  const urlList = [...new Set(
    raw
      .map((u) => { try { return new URL(u, `https://${HOST}`).href; } catch { return null; } })
      .filter((u) => u && new URL(u).host === HOST)
  )].slice(0, 1000);

  if (!urlList.length) return res.status(400).json({ error: 'No valid urls' });

  try {
    const r = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList }),
    });
    return res.status(200).json({ ok: r.ok, status: r.status, submitted: urlList.length });
  } catch (err) {
    return res.status(502).json({ error: 'IndexNow ping failed', detail: String(err) });
  }
}

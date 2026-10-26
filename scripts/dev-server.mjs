// Minimal local stand-in for `vercel dev` (the CLI needs a login): serves the
// static files with cleanUrls and runs the real api/*.js handlers behind the
// rewrites declared in vercel.json. Usage: node scripts/dev-server.mjs [port]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PORT = Number(process.argv[2] || 5199);
process.chdir(ROOT); // api handlers resolve templates from process.cwd(), as on Vercel
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.mp4': 'video/mp4', '.txt': 'text/plain', '.xml': 'application/xml' };

function compile(src) {
  const names = [];
  const re = new RegExp('^' + src.replace(/\/:(\w+)\*/g, (_, n) => { names.push(n); return '(?:/(.*))?'; })
    .replace(/:(\w+)/g, (_, n) => { names.push(n); return '([^/]+)'; }) + '/?$');
  return { re, names };
}
const rewrites = (cfg.rewrites || []).map(r => ({ ...r, ...compile(r.source) }));
const redirects = (cfg.redirects || []).filter(r => !r.has).map(r => ({ ...r, ...compile(r.source) }));

async function runApi(name, query, req, res) {
  const mod = await import(pathToFileURL(path.join(ROOT, 'api', name + '.js')).href + '?t=' + Date.now());
  let status = 200; const headers = {};
  const shim = {
    status(c) { status = c; return shim; },
    setHeader(k, v) { headers[k] = v; return shim; },
    send(b) { res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8', ...headers }); res.end(b); },
    json(o) { res.writeHead(status, { 'Content-Type': 'application/json', ...headers }); res.end(JSON.stringify(o)); },
    end(b) { res.writeHead(status, headers); res.end(b); },
    redirect(c, u) { if (typeof c === 'string') { u = c; c = 307; } res.writeHead(c, { Location: u }); res.end(); },
  };
  req.query = query;
  await mod.default(req, shim);
}

function serveFile(p, res) {
  for (const cand of [p, p + '.html', path.join(p, 'index.html')]) {
    const f = path.join(ROOT, cand);
    if (f.startsWith(ROOT) && fs.existsSync(f) && fs.statSync(f).isFile()) {
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(res); return true;
    }
  }
  return false;
}

http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://localhost');
    let p = decodeURIComponent(u.pathname);
    const qs = Object.fromEntries(u.searchParams);
    for (const r of redirects) {
      const m = p.match(r.re);
      if (m) { let d = r.destination; r.names.forEach((n, i) => { d = d.replace(':' + n + '*', m[i + 1] || '').replace(':' + n, m[i + 1] || ''); }); res.writeHead(r.permanent ? 308 : 307, { Location: d }); return res.end(); }
    }
    if (p.endsWith('.html') && p !== '/index.html' && fs.existsSync(path.join(ROOT, p))) {
      // cleanUrls: /x.html -> /x, unless a rewrite owns it
      if (!rewrites.some(r => r.re.test(p))) { res.writeHead(308, { Location: p.slice(0, -5) }); return res.end(); }
    }
    for (const r of rewrites) {
      const m = p.match(r.re);
      if (!m) continue;
      let dest = r.destination;
      dest = dest.replace(/\$(\d)/g, (_, i) => m[Number(i)] || '');
      r.names.forEach((n, i) => { dest = dest.replace(':' + n, m[i + 1] || ''); });
      const du = new URL(dest, 'http://localhost');
      if (du.pathname.startsWith('/api/')) return await runApi(du.pathname.slice(5), { ...qs, ...Object.fromEntries(du.searchParams) }, req, res);
      p = du.pathname;
      break;
    }
    if (p.startsWith('/api/')) return await runApi(p.slice(5).replace(/\/$/, ''), qs, req, res);
    if (p === '/') p = '/index.html';
    if (!serveFile(p, res)) { res.writeHead(404); res.end('404 ' + p); }
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'text/plain' }); res.end(String(e && e.stack || e));
  }
}).listen(PORT, () => console.log('site-smith dev on http://localhost:' + PORT));

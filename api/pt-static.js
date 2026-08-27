import fs from 'fs';
import path from 'path';

// Serves the Portuguese (/pt/...) variant of a hand-built static page:
// reads the EN static file, rewrites the <head> to PT (title/description/
// canonical/og + reciprocal hreflang + <html lang>), and absolutizes relative
// asset paths so they don't 404 under the /pt/ prefix. The BODY is rendered in
// PT client-side by cms-loader (which treats a /pt/ URL as locale=pt).

const SITE = 'https://www.smithandadams.com';

// EN static file per page key. Literal map so Vercel's tracer bundles them.
function readFile(page) {
  try {
    if (page === 'index') return fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf8');
    if (page === 'our-developments') return fs.readFileSync(path.join(process.cwd(), 'hospitality.html'), 'utf8');
    if (page === 'property-management') return fs.readFileSync(path.join(process.cwd(), 'property-management.html'), 'utf8');
    if (page === 'contact') return fs.readFileSync(path.join(process.cwd(), 'contact.html'), 'utf8');
    if (page === 'real-estate') return fs.readFileSync(path.join(process.cwd(), 'real-estate.html'), 'utf8');
  } catch (e) {}
  return null;
}

const PT_SEO = {
  'index': {
    title: 'Investimento Imobiliário Premium em Portugal &amp; Golden Visa | Smith &amp; Adams',
    desc: 'Oportunidades de investimento imobiliário premium em Portugal. A Smith &amp; Adams é especialista no Golden Visa, no Visto D2 e na gestão de propriedades chave-na-mão.',
  },
  'our-developments': {
    title: 'Os Nossos Empreendimentos | Hygge House em Lisboa | Smith &amp; Adams',
    desc: 'Conheça os empreendimentos da Smith &amp; Adams: o conceito Hygge e os projetos Hygge House em Lisboa (S. Julião, Fanqueiros e Beato), além de projetos anteriores em Portugal.',
  },
  'property-management': {
    title: 'Gestão de Propriedades em Portugal | Smith &amp; Adams',
    desc: 'Gerimos a 100% a operação do seu apartamento em Lisboa e em Portugal - inquilinos, manutenção e relatórios financeiros - para um rendimento estável em euros, sem preocupações.',
  },
  'contact': {
    title: 'Contactos | Smith &amp; Adams',
    desc: 'Fale com a Smith &amp; Adams sobre investimento imobiliário e residência em Portugal. Marque uma reunião com a nossa equipa em Lisboa.',
  },
  'real-estate': {
    title: 'Imóveis à Venda em Portugal | Smith &amp; Adams',
    desc: 'Explore imóveis premium em Portugal - Lisboa, Porto, Algarve, Cascais e Costa de Prata. Apartamentos, moradias e investimentos elegíveis para Golden Visa.',
  },
};

export default async function handler(req, res) {
  const page = String(req.query.page || '').toLowerCase();
  let html = readFile(page);
  if (html == null) { res.status(404).send('Unknown pt page'); return; }

  const enUrl = SITE + (page === 'index' ? '/' : '/' + page);
  const ptUrl = SITE + (page === 'index' ? '/pt' : '/pt/' + page);
  const hreflang =
    `<link rel="alternate" hreflang="en" href="${enUrl}"/>` +
    `<link rel="alternate" hreflang="pt" href="${ptUrl}"/>` +
    `<link rel="alternate" hreflang="x-default" href="${enUrl}"/>`;

  // Absolutize relative src/href so assets resolve under /pt/ (not /pt/asset).
  html = html.replace(/\b(src|href)=("|')(?!https?:|\/\/|\/|#|data:|mailto:|tel:)/gi, '$1=$2/');

  // <html lang>
  html = html.replace(/<html([^>]*)\slang=["']en["']/i, '<html$1 lang="pt"');

  // hreflang is already baked (reciprocal) into the EN static file, so only
  // point the canonical at the PT URL. If a page had no canonical, add both.
  if (/<link[^>]*rel=["']canonical["']/i.test(html)) {
    html = html.replace(/(<link[^>]*rel=["']canonical["'][^>]*href=["'])[^"']*(["'])/i, `$1${ptUrl}$2`);
  } else {
    html = html.replace(/<\/title>/i, `</title><link rel="canonical" href="${ptUrl}"/>` + hreflang);
  }

  // og:url -> PT
  html = html.replace(/(<meta[^>]*property=["']og:url["'][^>]*content=["'])[^"']*(["'])/i, `$1${ptUrl}$2`);

  // PT title + descriptions
  const seo = PT_SEO[page];
  if (seo) {
    html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${seo.title}</title>`);
    html = html.replace(/(<meta[^>]*name=["']description["'][^>]*content=["'])[^"']*(["'])/i, `$1${seo.desc}$2`);
    html = html.replace(/(<meta[^>]*property=["']og:title["'][^>]*content=["'])[^"']*(["'])/i, `$1${seo.title}$2`);
    html = html.replace(/(<meta[^>]*property=["']og:description["'][^>]*content=["'])[^"']*(["'])/i, `$1${seo.desc}$2`);
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=300');
  res.status(200).send(html);
}

import fs from 'fs';
import path from 'path';

const escapeHtml = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escapeAttr = (s) => escapeHtml(s).replace(/"/g, '&quot;');

export default async function handler(req, res) {
  const { slug } = req.query;

  try {
    // 1. Fetch Post from Supabase
    const SUPABASE_URL = 'https://bcjtkfipcfvvitglgpys.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjanRrZmlwY2Z2dml0Z2xncHlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNDU3NjcsImV4cCI6MjA5MTgyMTc2N30.kgnE2E-xDQT855to1Nz8LNKtwIBGw2QsIw81Us3B_ZA';

    // We fetch via REST to avoid dependencies
    const supabaseResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/posts?slug=eq.${encodeURIComponent(slug)}&select=title,excerpt,image_url,category,created_at`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      }
    );
    const data = await supabaseResponse.json();

    // 2. Read Base HTML structure File
    const filePath = path.join(process.cwd(), 'article.html');
    let html = fs.readFileSync(filePath, 'utf8');

    // 3. If Valid Post, Inject SEO Meta Tags natively!
    if (data && data.length > 0) {
      const post = data[0];
      
      // Fix potential relative image URLs
      let img = post.image_url || '';
      if(img && !img.startsWith('http') && img.startsWith('.')) img = img.substring(1);
      if(img && !img.startsWith('http')) img = 'https://www.smithandadams.com' + (img.startsWith('/') ? img : '/' + img);

      const title = `${post.title} | Smith & Adams Blog`;
      const desc = post.excerpt || '';
      const canonicalUrl = `https://www.smithandadams.com/blog/${encodeURIComponent(slug)}`;
      const published = post.created_at ? new Date(post.created_at).toISOString() : undefined;

      const jsonLd = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": post.title,
        "description": desc,
        "image": img || undefined,
        "datePublished": published,
        "dateModified": published,
        "author": { "@type": "Organization", "name": "Smith & Adams", "url": "https://www.smithandadams.com" },
        "publisher": {
          "@type": "Organization",
          "name": "Smith & Adams",
          "logo": { "@type": "ImageObject", "url": "https://www.smithandadams.com/logo.png" }
        },
        "mainEntityOfPage": { "@type": "WebPage", "@id": canonicalUrl }
      });

      const seoTags = `
        <title>${escapeHtml(title)}</title>
        <meta name="description" content="${escapeAttr(desc)}">
        <link rel="canonical" href="${escapeAttr(canonicalUrl)}">
        <meta property="og:title" content="${escapeAttr(title)}">
        <meta property="og:description" content="${escapeAttr(desc)}">
        <meta property="og:image" content="${escapeAttr(img)}">
        <meta property="og:type" content="article">
        <meta property="og:url" content="${escapeAttr(canonicalUrl)}">
        <meta name="twitter:card" content="summary_large_image">
        <meta name="twitter:title" content="${escapeAttr(title)}">
        <meta name="twitter:description" content="${escapeAttr(desc)}">
        <meta name="twitter:image" content="${escapeAttr(img)}">
        <script type="application/ld+json">${jsonLd}</script>
      `;

      // Strip the template's default SEO/social tags so the injected ones
      // below never duplicate the article.html fallback defaults.
      html = html
        .replace(/\s*<meta\s+name=["']description["'][^>]*>/gi, '')
        .replace(/\s*<link\s+rel=["']canonical["'][^>]*>/gi, '')
        .replace(/\s*<meta\s+property=["']og:[^"']*["'][^>]*>/gi, '')
        .replace(/\s*<meta\s+name=["']twitter:[^"']*["'][^>]*>/gi, '');

      // Replace generic title with all our rich structured tags
      html = html.replace(/<title>.*?<\/title>/, seoTags);

      // Inject global script hook so client side javascript can bypass location.search
      html = html.replace('<head>', `<head><script>window.INJECTED_SLUG = ${JSON.stringify(slug)};</script>`);
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);

  } catch (error) {
    console.error("Vercel Edge Rendering Error:", error);
    
    // Fallback safely to unmodified article page if Supabase fails
    const filePath = path.join(process.cwd(), 'article.html');
    const html = fs.readFileSync(filePath, 'utf8');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);
  }
}

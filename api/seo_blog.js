import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  const { slug } = req.query;

  try {
    // 1. Fetch Post from Supabase
    const SUPABASE_URL = 'https://bcjtkfipcfvvitglgpys.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjanRrZmlwY2Z2dml0Z2xncHlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNDU3NjcsImV4cCI6MjA5MTgyMTc2N30.kgnE2E-xDQT855to1Nz8LNKtwIBGw2QsIw81Us3B_ZA';
    
    // We fetch via REST to avoid dependencies
    const supabaseResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/posts?slug=eq.${slug}&select=title,excerpt,image_url,category`,
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
      if(img && !img.startsWith('http')) img = 'https://smithandadams.com' + (img.startsWith('/') ? img : '/' + img);

      const title = `${post.title} | Smith & Adams Blog`;
      const desc = post.excerpt || '';

      const canonicalUrl = `https://smithandadams.com/blog/${slug}`;

      const jsonLd = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": post.title,
        "description": desc,
        "image": img || undefined,
        "author": {
          "@type": "Organization",
          "name": "Smith & Adams Group"
        },
        "publisher": {
          "@type": "Organization",
          "name": "Smith & Adams Group",
          "logo": {
            "@type": "ImageObject",
            "url": "https://smithandadams.com/logo.png"
          }
        },
        "mainEntityOfPage": {
          "@type": "WebPage",
          "@id": canonicalUrl
        }
      });

      const seoTags = `
        <title>${title}</title>
        <meta name="description" content="${desc}">
        <link rel="canonical" href="${canonicalUrl}">
        <meta property="og:title" content="${title}">
        <meta property="og:description" content="${desc}">
        <meta property="og:image" content="${img}">
        <meta property="og:type" content="article">
        <meta property="og:url" content="${canonicalUrl}">
        <meta name="twitter:card" content="summary_large_image">
        <meta name="twitter:title" content="${title}">
        <meta name="twitter:description" content="${desc}">
        <meta name="twitter:image" content="${img}">
        <script type="application/ld+json">${jsonLd}</script>
      `;

      // Replace generic title with all our rich structured tags
      html = html.replace(/<title>.*?<\/title>/, seoTags);
      
      // Inject global script hook so client side javascript can bypass location.search
      html = html.replace('<head>', `<head><script>window.INJECTED_SLUG = "${slug}";</script>`);
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

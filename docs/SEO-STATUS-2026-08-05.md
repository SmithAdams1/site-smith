# Smith & Adams — SEO status report

**Date:** 2026-08-05 · **Site:** https://www.smithandadams.com · **Branch:** `main` (= production)
**Verified:** every figure below was checked against the live production site and the `main` branch on the date above, not taken from notes.

---

## 1. Summary

Five batches of SEO work shipped to production between 2026-08-05 and are live. The site went from
"no structured data, no social cards, apex/www conflict, missing H1s, incomplete sitemap" to a
consistent technical baseline: **33 JSON-LD blocks across 25 pages, one canonical host, a complete
19-URL sitemap, an H1 on every page, and breadcrumbs on 16 pages.**

Three items are still open and need a decision (section 5), and this audit surfaced four defects
that were not previously logged (section 6).

---

## 2. What shipped, in order

| # | Commit | What |
|---|---|---|
| 1 | `6813242` | **Removed the Press/Media block** from the homepage (EN + PT). It claimed coverage in The Times / FT / Guardian. |
| 2 | `4519e44` + `2595ce4` | **Homepage performance (Core Web Vitals).** Both hero videos re-encoded (53 MB + 39 MB → 2.4 MB + 1.7 MB, audio stripped); heaviest images resized in place (`5.png` 16 → 1.9 MB, `benefitsImage2` 7 → 0.7 MB, AML doc 7.5 → 0.2 MB); a real `<h1>` added (page had none); stats-label contrast raised .4 → .72; CTAs added to the two advisory cards; 3 orphan image preloads dropped that were competing with the hero video for bandwidth. **Homepage media ~90 MB → ~7 MB.** |
| 3 | `a15fe94` | **Structured data + social + sitemap + H1s + breadcrumbs.** Branded 1200×630 `og-image.jpg` replacing an SVG (SVG is not a valid social-card format); Twitter Cards; homepage `RealEstateAgent`/`LocalBusiness` JSON-LD enriched with address, geo, `sameAs`, `areaServed` and corrected wording; `BlogPosting` on all 9 blog posts; `BreadcrumbList` on 7 subpages + 9 posts; sitemap rewritten to canonical extensionless URLs and the 9 blog posts added (they were missing); `<h1>` added to `about`. |
| 4 | `375fb86` | **Canonical host standardised on `www`.** The apex 307-redirects to www, so www is canonical. 198 references across 24 files switched from apex to www: canonicals, sitemap `<loc>`, OG/Twitter, JSON-LD, `robots.txt`. **Reason:** the Google Search Console www property was *rejecting the sitemap* because its URLs were apex and therefore "outside the property". Now aligned. |
| 5 | `4c9b66e` | **FAQ + `FAQPage` schema on `/invest-in-portugal` (SEO + AEO).** 8 Q&As on Golden Visa / D2 / residency / citizenship / choosing an advisor, as an accessible native `<details>` accordion — content is always in the DOM, so it is indexable. Matching `FAQPage` JSON-LD, worded identically to the visible text (Google requires that match). CMS-editable via `invest.faq.q0..7` / `a0..7`. |

---

## 3. Current coverage (verified on production)

### Per-page technical tags

| Page | H1 | Canonical | OG title/desc | OG image | Twitter card | hreflang |
|---|---|---|---|---|---|---|
| `/` | 1 | www | ✅ | ✅ | ✅ | — |
| `/about` | 1 | www | ✅ | ❌ | ❌ | — |
| `/blog` | 1 | www | ✅ | ❌ | ❌ | — |
| `/contact` | 1 | www | ✅ | ❌ | ❌ | — |
| `/invest-in-portugal` | 1 | www | ✅ | ❌ | ❌ | — |
| `/our-developments` | 1 | www | ✅ | ❌ | ❌ | — |
| `/property-management` | 1 | www | ✅ | ❌ | ❌ | — |
| `/real-estate` | 1 | www | ✅ | ❌ | ❌ | — |
| `/urban-collection` | 1 | www | ✅ | ✅ | ❌ | — |
| `lp-hygge-house` (×3 LPs) | 1 | www | ✅ | ✅ | ✅ | — |
| `fanqueiros-hotel` | 1 | ❌ | ❌ | ❌ | ❌ | — |
| `/terms`, `/privacy` | 1 | ❌ (noindex) | ❌ | ❌ | ❌ | — |
| 9 blog posts | 1 | www | ✅ | ✅ | ✅ | — |

**H1: 15/15 core pages have exactly one.** No accidental `noindex` anywhere except `/terms` and `/privacy`, which is intentional.

### Structured data (33 JSON-LD blocks / 25 pages)

| Schema type | Pages |
|---|---|
| `BreadcrumbList` + `ListItem` | 16 |
| `Organization` | 13 |
| `Blog`, `WebPage`, `ImageObject` | 10 each |
| `BlogPosting` | 9 |
| `PostalAddress` | 3 |
| `ContactPoint`, `Place` | 2 each |
| `RealEstateAgent`, `LocalBusiness`, `GeoCoordinates`, `Country` | 1 each (homepage / contact) |
| `FAQPage` + `Question` + `Answer` | 1 (`/invest-in-portugal`, 8 questions) |
| `Service` | 1 (`/property-management`) |
| `Product` + `Brand` + `Offer` | 1 (`/urban-collection`) |

### Crawl & indexing

- **`robots.txt`** — `User-agent: * / Allow: /`, sitemap declared at the www host. Live, 200.
- **`/sitemap.xml`** — 19 URLs, **all on www**: 10 site pages + 9 blog posts. Live, 200.
- **Apex** — `smithandadams.com` → `307` → `www.smithandadams.com`. Consistent with the canonicals.
- **`og-image.jpg`** — live, 200, 78 KB, 1200×630.

---

## 4. On the FAQ: what to expect

Set expectations with the team, because this is widely misunderstood:

- **You will not see FAQ dropdowns in Google results.** Google retired FAQ rich results for non-government / non-health sites in 2023. Anyone promising those is out of date.
- **The real value is threefold:**
  1. **AEO** — ChatGPT, Gemini and AI Overviews cite structured Q&A readily. This is the main reason it was built.
  2. **On-page SEO** — captures long-tail queries and "People also ask" surfaces.
  3. **Conversion** — handles objections before the CTA.

⚠️ **Action for legal:** the visa facts in questions 1, 2, 4, 5 and 6 should be validated by whoever handles the legal side. If anything changes, it is editable directly in the CMS — no code deploy needed.

---

## 5. Open decisions (need a call from strategy)

1. **Portuguese market / `hreflang` — nothing implemented.** EN and PT currently share a single URL, so **the Portuguese content is not indexed at all**. Fixing it means committing to a URL structure (`/pt/` prefix is the proposal) plus `hreflang` pairs. This is the single largest untapped organic opportunity on the site.
2. **A shorter FAQ on `/property-management`** (3–4 questions on the management service) — same AEO logic, different audience.
3. **Trust block (P2)** — AMI licence number, team, case studies. Needs content from the business, not engineering. Relevant to E-E-A-T.

---

## 6. Defects found in this audit (not previously logged)

These were discovered while verifying the report and are not yet fixed.

1. **`/terms` and `/privacy` are `noindex` but are listed in the sitemap.** Google Search Console will report these as *"Submitted URL marked noindex"* errors, which drags down the sitemap's health signal. **Fix:** remove both `<url>` entries from `sitemap.xml`.

2. **New blog posts will no longer reach the sitemap automatically.** The sitemap is now a *static* `sitemap.xml` file, and on Vercel the filesystem takes precedence over `vercel.json` rewrites — so the `/sitemap.xml` → `/api/sitemap` rewrite never fires. The dynamic generator that used to pull posts from Supabase is now dead code. **Consequence:** every new post must be added to `sitemap.xml` by hand, or the static file must be deleted so the dynamic route takes over again.

3. **`api/sitemap.js` still hardcodes the apex host** (`https://smithandadams.com`), missed by the www migration. Harmless today because the route is shadowed, but it is a trap: anyone who deletes the static sitemap to restore dynamic generation would silently reintroduce the exact apex/www problem that broke Search Console.

4. **A newly published blog post would get weaker markup than the existing 9.** The 9 current posts are static files with `BlogPosting` + `BreadcrumbList`. A post that exists only in Supabase falls through to `api/seo_blog.js`, which emits `Article` and no `BreadcrumbList`. **Fix:** bring the dynamic template up to parity with the static files.

5. **Social cards are missing on the main service pages.** `about`, `blog`, `contact`, `invest-in-portugal`, `our-developments`, `property-management` and `real-estate` have `og:title` and `og:description` but **no `og:image` and no Twitter Card**. Shared on LinkedIn or WhatsApp they render as a bare text link. These are exactly the pages the commercial team shares, so this is a low-effort, high-visibility fix — `og-image.jpg` already exists and can be reused.

---

## 7. Not SEO, but related — performance

Core Web Vitals matter for ranking, so for completeness:

- Homepage media went from **~90 MB to ~7 MB** (item 2 above).
- The in-flight `motion-layer` branch (not merged, not deployed) was measured under 4× CPU throttling:
  **LCP 1.88 s** (baseline 2.28 s), **CLS 0.019 desktop / 0 mobile**, 60 fps held during scroll across 3 runs.
  So the planned animation work does not cost Core Web Vitals.
- Still outstanding: the "Why" section images are **6.8 MB and 7.0 MB** (2596×1892) rendered into ~380 px boxes.
  Resizing them is the next obvious performance win — roughly 13.8 MB → ~200 KB.

---

*Sources: `main` branch at `4c9b66e`; live production responses; `docs/BACKLOG.md` session log.*

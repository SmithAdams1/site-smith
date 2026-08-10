# Smith & Adams — 90-Day Organic Growth Plan

_Owner: Suzan / George · Prepared 2026-08-10 · Review cadence: weekly (30 min) + monthly deep-dive._

The technical SEO base is now solid (indexing, schema, metadata, Consent Mode + GA4).
This plan turns that base into **traffic and leads**. Nothing here counts until the
redesign is **live in production** and **Search Console is verified**.

## North star & KPIs
- **North star:** qualified organic leads (MQLs) into the CRM per month.
- Track monthly:
  - Organic sessions (GA4) and Search Console **impressions / clicks / avg position**.
  - Rankings for the money terms (below).
  - **GBP** actions (calls, direction requests, website clicks).
  - Referring domains (backlinks) — Ahrefs/Semrush.
  - Organic → lead conversion rate (GA4 event → CRM), by page.
- **90-day targets (starting from a near-zero organic baseline):**
  - +40–70% organic impressions; first page-1 rankings for 3–5 long-tail money terms.
  - GBP live + 15–25 reviews.
  - 10–20 new referring domains.
  - A repeatable content + link cadence running.

## Money keywords (build topical authority here)
Portugal investment-migration + Lisbon real estate:
- **Golden Visa Portugal** (2026 rules, fund vs real estate, process, timeline)
- **D2 Visa Portugal** (entrepreneur/immigrant, vs Golden Visa)
- **NHR / IFICI tax regime** (new NHR 2.0)
- **Investir em Portugal / imóveis Lisboa / yield / arrendamento**
- **Buy property in Portugal as a foreigner** (financing, taxes, process)
- Local: **real estate agency Lisbon / imobiliária Lisboa**, neighbourhood guides (Beato, Marvila, Baixa)

---

## Phase 0 — Week 1: switch the lights on
_These unlock measurement + local presence. Mostly owner actions; low effort, high leverage._
1. **Go live** (merge `homepage-redesign → main`) — until then Google sees the old site.
2. **Search Console**: verify the **Domain property** `smithandadams.com` (DNS TXT); submit `sitemap.xml`. Repeat in **Bing Webmaster** (import from GSC).
3. **GA4**: confirm the `GT-TWZKWC9P` tag feeds GA4; mark **key events as conversions** (contact form submit, property enquiry, brochure download, WhatsApp/phone click). Link GA4 ↔ Google Ads.
4. **Google Business Profile**: claim/verify, complete NAP (must match the site exactly: Av. José Malhoa 14, 1070-073 Lisboa, +351 938 227 348), categories (Real estate agency / Real estate consultant), photos, services, description.
5. **Looker Studio** dashboard: GA4 + GSC in one view (sessions, conversions, top queries/pages, position).

## Month 1 — foundation: finish on-site + cornerstone content + reviews
**Technical finish**
- **PT indexability** (see the PT project) — start with `/pt/invest-in-portugal` + `/pt/about`, then blog/property. Reciprocal hreflang + sitemap alternates.
- **Core Web Vitals**: optimise the CMS/Supabase images (WebP, sized, lazy), preload the hero poster, self-host `lenis`. Target: green LCP/CLS/INP on mobile.
- Visible NAP in the footer (currently only in JSON-LD); a couple of title trims.

**Content — 4–6 cornerstone "pillar" pages** (long, definitive, internally linked):
- Portugal Golden Visa 2026 (complete guide) · D2 Visa complete guide · NHR/IFICI tax guide · Investing in Lisbon real estate (yields, areas) · Buying property as a foreigner.
- Each with FAQ (FAQPage schema), clear CTA to a lead form, internal links to related posts + relevant property listings.

**Trust / local**
- **Reviews engine**: after every client interaction, request a Google review (email/WhatsApp template). Aim 2–4/week. Add Trustpilot. Surface reviews on site with `Review`/`AggregateRating` schema.
- **Author E-E-A-T**: George bio page + `Person` schema (done on About) linked from posts; add credentials, "as featured in", real numbers (1,000+ investors / €300M+).

## Month 2 — engine: content cadence + link building
**Content cadence: 2–4 posts/week** in the clusters (supporting the pillars). Each targets a specific long-tail query and links up to its pillar.
- Comparison + decision content converts best: "Golden Visa vs D2", "Lisbon vs Porto for investment", "Is Portugal real estate still worth it in 2026", neighbourhood guides.
- Repurpose each post → LinkedIn post + a short YouTube/Reel.

**Digital PR / backlinks (the biggest off-page lever):**
- Listings/profiles on **investment-migration + relocation directories** (IMI, relocation guides, expat portals).
- **Journalist/HARO-style outreach**: offer George as a Portugal-investment expert for quotes (data + opinion).
- **Partnerships**: immigration lawyers, tax advisors, relocation firms, mortgage brokers → mutual referrals + links + co-authored guides.
- Reclaim unlinked brand mentions; guest posts on relevant finance/relocation blogs.

**On-page/CRO on money pages**: property listing SEO (unique descriptions, schema — done), internal linking hub, strong lead CTAs, and a fast contact/enquiry form.

## Month 3 — scale + convert
- **Scale content + links** in the clusters that show early traction (watch GSC).
- **Video SEO**: optimise the YouTube channel (titles/descriptions/chapters targeting the money terms); embed videos on the pillar pages.
- **LinkedIn thought leadership** (George) — investor audience; 2–3 posts/week.
- **CRO**: test lead-form length, hero CTAs, social proof placement; measure organic→MQL by page and double down.
- **Retargeting** with the Ads tag + GA4 audiences (site visitors, blog readers, property viewers) — consent-gated.
- **Email nurture** via the CRM: lead magnet (e.g. Golden Visa 2026 PDF) → sequence → booking. Tag source with UTMs for attribution.

---

## Tooling
- **Free/essential:** Google Search Console, Bing Webmaster, GA4, Looker Studio, Google Business Profile, PageSpeed/CrUX.
- **Paid (pick one):** Ahrefs *or* Semrush (keywords, backlinks, rank tracking, content gaps). Screaming Frog (technical crawl, free ≤500 URLs).
- **Consent:** the built-in banner (RGPD). Consider Cookiebot/Usercentrics later if you want a CMP with audit logs.

## Weekly cadence (30 min)
GSC queries/pages movement · new content shipped · new backlinks · GBP actions + new reviews · organic→lead in CRM. Monthly: full Looker review + next month's content/link targets.

## Who does what
- **Claude/dev:** PT indexability, CWV/media, schema, technical fixes, dashboards.
- **Suzan/George:** GSC/GBP/GA4 setup, review requests, PR/partnership outreach, LinkedIn/video, approving content.
- **Content:** brief by Claude (outlines + SEO) → written by George/writer → published via Studio.

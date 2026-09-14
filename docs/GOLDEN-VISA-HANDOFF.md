# Golden Visa Funnel - Handoff & Continuity

Last updated: 2026-08-29. Owner: Abílio Diz (abilio.diz@smithandadams.com).
Purpose: single source of truth so this work can continue from any account/machine without losing context.
Conventions: European Portuguese in chat; NO em-dashes (use hyphens); Supabase SQL shared as inline code blocks; commit author = Suzan <suzan@smithandadams.com>; push to `upstream` remote with gh account SmithAdams1 (abiliodiz-cell gets 403).

---

## 1. Landing page - /lp-invest

- File: `lp-invest.html` (repo root). Live: https://www.smithandadams.com/lp-invest (robots noindex - it is an ad LP, not for organic).
- Loads `/redesign.css?v=gN` with `<body class="rd">` (Geoform font + brand tokens), `consent.js`, `sa-events.js`, gtag (GT-TWZKWC9P + AW-18073134136).
- Hero: navy gradient scrim over `/assets/hero-invest.jpg` (25 de Abril bridge) with a floating white form card. Gold accent (#c9b790 / #c9a227) = brand 3rd colour.
- Copy voice: senior advisory ("Advisers, not brokers", "single mandate: your outcome"). Headline "Your Portugal Golden Visa, from a €280,000 investment." Proof: 1,000+ investors / €300M+ / 300+ assets.
- Form (`#lp-form`) fields: name, email, phoneCode/phoneNumber (curated ~11-country select, default +1), forWho, timing, funds (€280k qualifier), consent. Single CTA (no competing investor guide - deliberate).
- On submit: POST `/api/contact` with `interest:'golden-visa'`, `source:'lp-invest'`, a `message` string carrying For/Timing/Funds, and `attribution: window.saLeadContext()`. On success fires `saTrackLead('consultation')` → GA4 `generate_lead`.

## 2. CRM wiring (proven 2026-08-28)

- `api/contact.js`: for non-property-management interest, routes explicitly to `assign_to_email: benjamin.sharps@smithandadams.com` + `pipeline_name: 'Benjamin Pipeline'`. LP submissions (source==='lp-invest') set `campaign_name: 'LP - Golden Visa (Invest)'` and prepend a "Source: Landing Page (Invest / Golden Visa)" note line. Property-management interest → Teresa Cherry (teresa.pinto@) + Property Management pipeline.
- Pipedrive is now STRICTLY best-effort (`postToPipedrive()` returns false if no `PIPEDRIVE_TOKEN`) so its absence can never 500 the form. Own CRM (`postCrmLead`) is the source of truth and returns a boolean; the handler returns success if either CRM or Pipedrive succeeded.
- `api/_crm.js`: posts to `${CRM_API_URL}/api/v1/leads` (Bearer `CRM_API_KEY`), `source: 'Website Organic'`, forwards notes + attribution (gclid/utm/ga_client_id). Country from Vercel `x-vercel-ip-country`; the CRM also derives country from the phone dial code (`countryFromPhone`) if the geo header is empty.
- CRM app repo: `~/Code/sa-crm` (Next.js + Supabase). Supabase project `mjmdrlkzduxwiwtoyoya`. Endpoint schema: `src/app/api/v1/leads/route.ts`.
- IDs: Benjamin Pipeline = `14099367-0df8-4fcb-8c1b-a20514a7f428`. Benjamin Sharps agent id = `3bf9ef27-c188-4dbe-b604-4d8548d3dbb5`.
- Verification: a test LP submission (curl to /api/contact) landed as assigned_agent Benjamin Sharps, pipeline Benjamin Pipeline, campaign "LP - Golden Visa (Invest)", notes carrying For/Timing/Funds + attribution. Test lead soft-deleted afterwards (leads.deleted_at, reversible).

## 3. Google Ads campaign (LIVE)

- Account: Smith & Adams, customer 529-975-9113, ocid 8147391285, login abilio.diz@smithandadams.com. Driven via the Claude-in-Chrome extension ("Browser 1").
- Campaign: "Invest in Portugal | US | Search", live **campaignId = 24190674671** (draftId was 10211110088). Published 2026-08-29.
- Settings: Objective Leads; bidding Maximize conversions (started in learning); networks Search-only (Search Partners OFF, Display OFF); location United States, "Presence" (not interest), English; AI Max OFF; EU political ads = No.
- Ad (RSA): final URL `https://www.smithandadams.com/lp-invest`; display path smithandadams.com/Portugal; 14 headlines (incl. Portugal Golden Visa, Residency From €280,000, Book a Free Consultation, Speak With a Portugal Adviser, Portugal Residency Visa, EU Residency by Investment, plus the original brand/proof ones) + 4 descriptions (€280k / D2 / net-of-cost / proof). Ad strength "Razoável".
- Budget: daily average **€20/day, no end date (ongoing)**. Chosen over a fixed total so Maximize Conversions has continuous runway to learn. NOTE: budget TYPE (daily vs total) is locked once a campaign starts.
- Keywords (broad + phrase mix): invest in portugal, golden visa portugal, portugal real estate investment, portugal property golden visa, investment visa portugal, portugal citizenship by investment, portugal golden visa application/investment, golden visa portugal real estate, etc.
- Negative keywords: 82 added at campaign level, PHRASE match. Themes: employment (jobs/work visa/sponsorship/salary/careers), free/cheap, DIY/research (reddit/forum/wikipedia/pdf/youtube), citizenship-by-descent (descent/sephardic/jewish/ancestry), wrong PT visas (d7/retirement/digital nomad/student), competitor countries (spain/greece/malta/cyprus/italy/dubai/uae/caribbean/grenada/st kitts/st lucia/dominica/vanuatu/turkey/montenegro/ireland), tourism (tourist visa/schengen/holiday/vacation/hotel/airbnb/flights/weather/things to do), programme-ended (abolished/scrapped/cancelled/ended/news), misc (course/embassy/vfs/appointment/status check). DELIBERATELY KEPT OUT: rent/rental (rental-yield is a buyer signal), and cost/requirements/minimum investment/"for us citizens"/tax/D2 (buyer intent).

## 4. Analytics / conversion tracking

- Google tag GT-TWZKWC9P (routes to GA4) + Google Ads AW-18073134136. `sa-events.js` fires `generate_lead` on form success and captures gclid/utm/ga_client_id via `saLeadContext()`.
- GA4 key-event funnel: generate_lead → qualify_lead → close_convert_lead. The CRM sends offline conversions back via GA4 Measurement Protocol (`sa-crm/lib/analytics/ga4.ts`) so MQL/SQL can be imported into Ads.

## 5. Open next steps

- Scheduled review: one-time task `sa-ads-search-terms-review` fires 2026-09-03 10:00 (Europe/Lisbon) - review the search-terms report, add new negatives, check learning-phase exit + CPA, and (if ~15-30+ conversions with stable CPA) consider switching to Target CPA.
- Let the campaign run ~1-2 weeks before touching budget/bidding (learning period).
- Lead RESPONSE TIME is the biggest conversion lever (historical avg 85h on Benjamin's US leads) - fast follow-up matters more than anything in the ad.
- Copyright SQL still to run (site_content): `update site_content set value = '© 2026 Smith & Adams Group' where key = 'global.footer.copyright';`
- Taipas Sold SQL still to run (properties): `alter table properties add column if not exists sold boolean not null default false; update properties set sold = true where reference = 'BB-20788';`

## 6. Content / knowledge-base plan (next phase)

Goal: compile the dispersed S&A knowledge (company, D2, Golden Visa, invest in Portugal, taxation/NHR-IFICI, Portugal vs other countries, proof points) into a vetted source-of-truth that powers SEO + GEO-optimised content: table copy, articles, guides/papers, and email marketing.
Proposed shape:
- `knowledge/` directory of authoritative markdown docs (one per topic), each with a "last verified" date and sources.
- A content-generation skill (e.g. `.claude/skills/sa-content`) that packages house voice (senior advisory, EU-PT / EN, no em-dashes), proof points (1,000+ / €300M+ / 300+), SEO/GEO rules, and points at `knowledge/` as the fact base.
- CRITICAL: Golden Visa and Portuguese tax rules change frequently and are outside model training. Every legal/tax fact must be verified against CURRENT 2026 rules before publishing (e.g. the real-estate GV route was removed in Oct 2023; NHR was replaced by the IFICI/"NHR 2.0" regime in 2024). Flag anything unverified.

## 7. Related memory / files

- User memory: `project_sa_golden_visa_lp_ads`, `project_sa_crm`, `project_sa_dashboard`, `project_site_smith_seo`, `reference_li_lead_qualification`, `feedback_git_author_suzan_vercel`, `feedback_no_em_dashes`, `feedback_sql_inline`.
- Key files: `lp-invest.html`, `api/contact.js`, `api/_crm.js`, `redesign.css`, `redesign.js`, `sa-events.js`.

---

## 8. ChatGPT (OpenAI) Ads - status 2026-09-04 (Claude Code session, git author Suzan / suelen@)

Second ad channel, separate from Google Ads. Account "Smith & Adams" at **ads.openai.com** (OpenAI Ads Manager, Beta), ad account `adacct_6a9949c3bbd881938d0d9831f785fe6c`, driven via the **in-app Claude Browser** (NOT Claude-in-Chrome). Login abilio.diz.

### 8.1 CRITICAL BLOCKER (do not lose this)
The single ad ("Ad 3") is **rejected by OpenAI ad policy at the CATEGORY level**, not for wording. Exact rejection (reason 1 of 2):
> Regulated Products & Services -> Financial services -> High risk alternative investments -> **Real estate investments**
> "Este anuncio nao esta a ser servido porque nao cumpre as nossas Politicas de Publicidade. **A revisao NAO esta disponivel para esta rejeicao.**"

Meaning: **OpenAI Ads currently prohibits real-estate-investment advertising** (treated as a high-risk alternative investment). The ad went "Fora de servico" then, after our edit, "Nao aprovado (+2)". **Rewriting copy does NOT fix it** - we reframed the ad from residency to pure property investment and it was still rejected under this exact category. The earlier hypothesis (Golden Visa / residency being the trigger) was WRONG; the trigger is *real estate investment itself*.

STRATEGIC: this offer likely **cannot be advertised on ChatGPT Ads** under current policy. Options for Abilio:
(a) manual policy review - UI says review NOT available for this rejection, so probably impossible.
(b) reframe away from investment/returns toward a non-financial angle - guts the offer, may still fail.
(c) accept ChatGPT Ads do not fit this offer; keep spend on Google Ads. RECOMMENDED unless OpenAI opens the category.

### 8.2 What was BUILT + is LIVE (production, git author Suzan)
- **Pixel**: OpenAI pixel `pixelId 4R6dpZN7mfCe7cR5VRagoQ` base snippet in `<head>` + `oaiq('measure','lead_created',{type:'customer_action'})` on form success. Verified: SDK `bzrcdn.openai.com/sdk/oaiq.min.js` = 200, `window.oaiq` defined + queue drained. NOTE `debug:true` still ON - flip to `debug:false` before real conversions count.
- **Dedicated LP `/lp-portugal-investment`** (`lp-portugal-investment.html`, noindex): property-investment-advisory copy ONLY (zero Golden Visa / D2 / residency / citizenship / visa), house voice, proof 1,000+/EUR300M+/300+, hero `/assets/hero-invest.jpg`, the form, the ChatGPT pixel. Form posts `/api/contact` `interest:'investment'`, `source:'lp-chatgpt'`.
- **CRM tagging**: `api/contact.js` branches `source==='lp-chatgpt'` -> `campaign_name:'ChatGPT Ads - Portugal Investment'` + note "Source: ChatGPT Ads (Portugal Investment LP)", routed to Benjamin Sharps / Benjamin Pipeline.
- **`/lp-invest`** (Golden Visa LP for Google Ads): headline softened to "Secure European mobility, investing in Portugal", benefits heading turned into a question, ChatGPT pixel REMOVED (belongs on the ChatGPT LP). Otherwise the Google Ads funnel is untouched.
- **Ad "Ad 3" edited + saved** in OpenAI Ads Manager: Titulo "Portugal Property Investment Advisory", Descricao "Advisers, not brokers. 1,000+ investors advised, EUR300M+ in assets.", Ligacao -> `https://www.smithandadams.com/lp-portugal-investment?utm_source=chatgpt&utm_medium=cpc&utm_campaign=us_invest_test`. The IMAGE still says "Portugal Residency, Done Right" (could not upload a new one from the in-app browser). Rejected anyway on the real-estate category (8.1).

### 8.3 Still open on ChatGPT Ads
- The category rejection (8.1) - decision needed from Abilio (recommend option c).
- Conversions not configured in OpenAI Ads: banner "Associe os seus eventos de conversao a uma campanha" - associate the `lead_created` event with the campaign so it optimises/reports.
- **Conversions API (server-side)**: Abilio gave the CAPI shape (`POST https://bzr.openai.com/v1/events?pid=4R6dpZN7mfCe7cR5VRagoQ`, `type:lead_created`, `data.type:customer_action`) but NOT the API key. When given, wire best-effort server-side send in `api/contact.js` for `source==='lp-chatgpt'`, shared event_id for dedup with the pixel.
- Flip pixel `debug:true` -> `false`.
- If a compliant ad image is ever needed: replace "Portugal Residency, Done Right" with a text-free Lisbon property image (upload from the account), or remove it for a text-only ad.

---

## 9. Google Ads: keyword -> LP campaign PUBLISHED, DSA paused (2026-09-14, Suelen session)

Diagnosis this session: the running `Invest in Portugal | US | Search` was serving **DSA -> site pages** (`/portugal/golden-visa`, `/invest`, `/residency`, `/advisers`), NOT keyword -> /lp-invest, at 40 EUR/day with **0 CRM leads** since launch. The /lp-invest LP was orphaned (no paid traffic). Fix = publish a dedicated keyword -> LP campaign and pause the DSA.

**PUBLISHED live 2026-09-14: `Invest in Portugal | US | LP`, campaignId 24249877373** (was draftId 10212343414 / campaignId 281499183779749; account ocid 8147391285, real Chrome / abilio.diz).
- Bidding: **Maximize clicks, CPC cap 7 EUR**
- Networks: Search-only (Search Partners + Display OFF)
- Locations: United States, **Presence** (not interest); Language: English
- AI Max: OFF (no final-URL expansion)
- Final URL: /lp-invest ; display path /Golden-Visa/Advisers
- Keywords (7): [portugal golden visa], "portugal golden visa", [golden visa portugal], [portuguese golden visa requirements], [portuguese golden visa cost], [portugal residency by investment], "portugal residency by investment"
- 1 RSA: 10 headlines (Portugal Golden Visa Advice / Independent Portugal Advisers / Advisers, Not Brokers / 1,000+ Investors Advised / 300M+ in Advised Assets / Speak With a Portugal Adviser / D2 & Golden Visa Routes / Your Family's EU Residency / Book a Confidential Call / No-Obligation Consultation) + 3 descriptions; ad strength "Razoavel" (82%)
- Budget: **40 EUR/day**
- Negatives (campaign-level, broad): free, diy, jobs, consulate, embassy
- Ad group left as "Grupo de anuncios 1" (rename cosmetic, skipped)
- Identity re-verification popup appeared mid-setup (USER-ONLY; Abilio confirmed) - blocks saves until confirmed.

**Old `Invest in Portugal | US | Search` = PAUSED** ("Colocado em pausa") same day. `SA . Brand . US` (5 EUR/day) left running. Account now ~45 EUR/day effective.

Two Google banners still open (flag to owner):
- "Adicione um metodo de pagamento alternativo" - billing backup, user-only.
- "Configurar o acompanhamento de conversoes" - relies on existing site Google tag + GA4 `generate_lead` import as the Ads conversion; verify with Tag Assistant that it fires on an /lp-invest submit.

Post-launch: let it exit learning ~1-2 weeks; check search-terms report to add more negatives; lead response time still the key conversion lever.

## 9b. A/B arm B: inline guide form on /golden-visa (2026-09-14)

Decision (Abilio): run the LP-vs-site A/B from the old session (site = more authority). Arm A = /lp-invest (consultation form). Arm B = **/golden-visa** with an inline **"Download the guide"** lead magnet (perk = the investor guide PDF), so the test measures authority, not form friction.

Built (author must be Suzan on commit):
- `golden-visa.shell.html`: new inline `<section id="download-guide">` after `<!--RD_BLOCKS-->` (OUTSIDE the RD:START/END region so the PT repaint never wipes it). Navy band + paper form card (name/email/phone/consent). Posts to existing `/api/guide`, fires `saTrackLead('guide')` (= generate_lead -> Ads conversion), reveals inline PDF link on success. EN default with a PT string-swap wired to `document.documentElement.lang` + the cms-lang-switcher.
- `guide-popup.js`: excluded `/golden-visa` + `/pt/golden-visa` from the auto pop-up so the inline form is the single conversion surface on arm B.
- `api/guide.js`: accepts optional `campaign` (sanitised, <=80 chars) -> CRM `campaign_name`; the inline form sends `campaign:'Golden Visa Page (guide)'` so arm-B guide leads are attributable (defaults to 'Investor Guide' for the pop-up).

Static checks pass (node --check on guide.js, guide-popup.js, and the extracted inline script). NOT yet deployed.

NEXT: 1) deploy (commit as Suzan -> push SmithAdams1/site-smith -> Vercel) and confirm /golden-visa form live + generate_lead fires; 2) build the **Google Ads Experiment** on `Invest in Portugal | US | LP` (24249877373): 50/50 split, control arm final URL /lp-invest, variant arm final URL /golden-visa; let Ads declare the winner (~2-4 weeks / enough conversions). Note: base bidding is Maximize clicks, so compare conversions/conv-rate per arm in the experiment report. Arm B (guide download) is a softer conversion than arm A (consultation) - compare lead QUALITY/SQL downstream, not just volume.

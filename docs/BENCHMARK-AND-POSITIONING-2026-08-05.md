# Benchmark and positioning decision

**Date:** 2026-08-05 · **Decides:** whether the site leads with residency or with asset performance
**Delegated by Abílio:** *"faz aquilo que funciona melhor, ou então decide conforme o benchmark que fizeres"*
**Companion to:** `BRAND-SITE-GAP-2026-08-05.md` (the as-is), `SEO-STATUS-2026-08-05.md` (what shipped)

---

## Decision

**Residency comes off the headline. The site leads with net-of-cost asset performance.**

This is what the Brand Book already mandates (p19, p33, p35, p46, p52), and the benchmark independently arrives at the same answer for commercial reasons. The two do not conflict, so there is no exception to argue about.

One residency page survives — as a factual answer page, not as the proposition. Details in §5.

---

## 1. The route is structurally dead for a property operator

Portugal's Golden Visa **real-estate route was permanently removed in October 2023** under the *Mais Habitação* housing bill, and remains closed in 2026. The programme itself is alive, but the qualifying routes are now venture-capital / private-equity funds from €500,000, job creation, and cultural donation.

The consequence is not a marketing preference, it is arithmetic: **Smith & Adams sells property; property no longer qualifies.** Every visitor who arrives on a residency query is looking for a product the group does not and cannot sell them. The Brand Book's lead-scoring model already prices this correctly at **−15 for "residency-only"** profiles (p46).

This also reframes the FAQ shipped on 2026-08-05. The eight questions are accurate and well built, but they answer *"how do I get residency"*, which routes the reader to a fund manager, not to us.

## 2. The residency SERP is owned, and not by people we compete with

A search for the core residency query returns, in order: Global Citizen Solutions (three separate results), Mercan, Latitude World, Golden Keys Global, Connaught Law, imin-portugal, Harris Sliwoski. Immigration advisories, relocation packagers and law firms — content operations with years of topical authority on exactly this subject.

These are the Brand Book's own p35 competitor set ("Golden-visa promoters and funds · residency headline, urgency framing, regulatory exposure"). We would be entering their category, on their terms, against their domain authority, for traffic that cannot buy our product. That is the worst of the four positions available.

## 3. The yield SERP is thin, and beatable

The same exercise for Lisbon yield data returns: Investropa, BestYieldFinder, Global Property Guide, Portugal Resident, realestate-lisbon.com.

Every one of them publishes **modelled gross yields**. None publishes net-of-cost figures, occupancy history, time-to-let, or renovation cost per m². None owns a portfolio. At the global level Knight Frank does own the format — the **Global Residential Cities Index**, quarterly across 150 cities — but at *city* granularity, from registry data, not from an operator's own book.

So the Brand Book's strategic bet (p28: *"nobody publishes trustworthy net-of-cost performance data on Portuguese residential investment"*) needs one correction and survives it:

> It is not that nobody publishes Portuguese yields. Aggregators publish modelled **gross** yields at scale. Nobody publishes **net-of-cost, operator-owned, district-level** performance. That is the gap, and it is narrower and more defensible than "nobody has the data".

## 4. What the benchmark says about the market itself — read this before publishing anything

The data-led strategy commits the group to publishing whatever the numbers say. In 2026 the numbers are softening:

- Lisbon gross rental yield ~**4.3%** in Q2 2026, described as the **least attractive district capital in Portugal for buy-to-let**.
- Net yields typically run 1.5–2 points below gross, so **roughly 2–3% net** in Lisbon.
- Year-on-year rent **declines** across central districts in April 2026: Santa Maria Maior −10.9%, Misericórdia −10.6%, Olivais −8.2%, Santo António −6.0%, Campolide −5.5%, Arroios −3.5%.
- Higher-yield pockets remain: Alfama/Baixa 4–6% gross, Marvila 5–5.5% gross.

Two implications:

1. **The Brief will be a downbeat document in its first editions.** The Brand Book has already chosen this ground — p39: *"Publishing an underperforming asset once a year buys more credibility than a year of good news."* Correct, but it should be a decision taken with open eyes, not a surprise in Q1.
2. **The Urban Collection's "guaranteed annual rental yield" claim now sits in tension with the market and with the brand's own voice rules** (p21 bans "Guaranteed returns"; p33 bans a guaranteed-return headline; p37 requires US-facing copy to carry no projected returns and be counsel-reviewed quarterly). This needs a separate look.

## 5. What the site does instead

| Element | Now | After |
|---|---|---|
| Hero | Drone/pool video, lockup burned in, no copy | One asset, direction A photography, location + two figures, flat 80% navy scrim if type is needed |
| Homepage proposition | "I want to invest in Portugal" | Net-of-cost performance, published quarterly, by a group that operates the asset |
| Primary CTA | "Book a Consultation" | Register for the Performance Brief (named registration is the Brand Book's definition of success, p33) |
| Secondary CTA | — | "A 20-minute call, whenever it suits you" (p21, verbatim) |
| `/invest-in-portugal` | Residency-led page + 8 visa FAQs | Retitled to the asset case. Residency demoted to one honest section |
| The visa FAQ | Headline content | Kept as a factual answer page at its own URL, linked from the footer, with the true and rare answer: *the property route is closed; here is what actually still works* |
| New FAQ | — | Same `<details>` + `FAQPage` pattern, re-pointed at the expensive questions: net vs gross, real costs, time-to-let, what management actually charges, what happens when a tenant leaves |

The residency page is worth keeping precisely because we can tell the truth about it. Everyone ranking above us has a commercial reason to keep the reader hopeful; we do not. That is a genuine, defensible content position — and it is still a footnote, as p19 requires.

---

## 6. The design benchmark, and the one hard constraint

### The constraint, which changes the whole architecture

**AI crawlers do not execute JavaScript.** GPTBot, ClaudeBot and PerplexityBot skip it entirely, and they are materially less capable than Google's rendering service. For AEO — the channel the Brand Book names as the priority (p40: *"increasingly the source that AI assistants quote when someone asks about Portuguese yields"*) — content must be in the **served HTML**.

This is not hypothetical on this site. Verified today by fetching production as a bot:

| | What a human sees (CMS, via JS) | What a bot reads (served HTML) |
|---|---|---|
| Stats | 1,000+ · €300M+ · 300+ | **+10 · +500 · +€30M** |
| H1 | "Independent real estate investment advisory, for objective buyers…" | "The world's smartest investors are already turning to Portugal. Smith & Adams ensures **the most exclusive opportunities** reach you first." |

So there are effectively two versions of the site. The one machines read carries figures **10× below** the correct ones and a headline in the exact voice the Brand Book bans (p21: *"Exclusive opportunity"* → *"Nine units, 6.4% net yield"*).

**This is the highest-value fix on the whole list** and it is independent of the redesign: every euro of AEO and SEO effort is currently being spent on a stale, off-brand, understated copy of the site. Either the CMS renders server-side, or the HTML fallbacks are kept in sync as a release step.

### What good looks like

- **Data scrollytelling, done properly:** progressive revelation with user-driven pacing — the reader controls the story and becomes a participant. The reference standard is editorial data journalism (The Pudding and the newspaper graphics desks), not agency showreels.
- **The index as a durable owned asset:** Knight Frank's quarterly Global Residential Cities Index is the proof that the format compounds. Ours is narrower and deeper: districts, net of cost, from our own book.
- **Motion animates what is already there.** The existing `motion.js` is built exactly this way — it animates DOM nodes that the server already sent, rather than injecting content on scroll. That is the correct architecture and it should be the rule: *if the animation is removed, the page must still read completely.* It is also what the existing FAQ got right with native `<details>` — content always in the DOM.
- **Parallax on the asset, never on lifestyle.** Depth on buildings-as-built-things (direction A). Lifestyle parallax is what the p35 "buyer's agents" do: *"heavy on lifestyle; almost no published performance data."*
- **One pinned, scrubbed narrative on the entire site:** a single building from purchase to let, with the real cost line on screen. That is p39's *Deal file* and *Cost Line* as an interactive page. GSAP + ScrollTrigger loaded on that page only.
- **Performance is a brand requirement, not a tax.** Scroll work regresses LCP and CLS when assets and animation load carelessly. The current motion branch measures LCP 1.88 s and CLS 0.019 at 4× CPU throttle; that is the bar to hold, not a starting point to erode.

---

## 7. Sequence

1. **Fix what machines read** (server-render the CMS, or sync the HTML fallbacks). Independent of design, unblocks all SEO/AEO. Also removes the wrong figures from the indexable page.
2. **Add date and source to the published figures.** The Brand Book rule stands regardless of magnitude: *"a number without a date does not go out."* The stats currently carry neither.
3. **Re-point the FAQ** at yield/cost/management questions; keep the visa FAQ as a footnote page.
4. **Hero decision** (§5) — blocks the homepage.
5. **Type licence decision** (Helvetica Neue, or a documented substitute written into Edition 04).
6. **Then** rebuild on the brand grid with the motion engine, and only then extend reveals sitewide.

Open item still needing an answer: **does the Yield Index / Performance Brief data exist yet?** The immersive centrepiece cannot be built on placeholder numbers — p52 lists *"publish a figure without a date and a source"* under *do not*.

---

### Sources

- Golden Visa real-estate route closed, Oct 2023, still closed 2026 — [Global Citizen Solutions](https://www.globalcitizensolutions.com/portugal-golden-visa-changes/), [Connaught Law](https://connaughtlaw.com/portugal-golden-visa-real-estate-eliminated/), [Golden Keys Global](https://www.goldenkeysglobal.com/portugal-golden-visa-2026-complete-guide/), [Latitude World](https://www.latitudeworld.com/portugal-golden-visa-2026/)
- Lisbon yields and rent declines 2026 — [Portugal Resident](https://www.portugalresident.com/rental-property-returns-start-falling-throughout-portugal-lisbon-leads-decline/), [Investropa](https://investropa.com/blogs/news/lisbon-rental-yields-apartment), [Global Property Guide](https://www.globalpropertyguide.com/europe/portugal/price-history), [BestYieldFinder](https://www.bestyieldfinder.com/en/portugal/lisbon)
- Index format precedent — [Knight Frank Research](https://www.knightfrank.com/research)
- Scrollytelling craft — [scrollytelling.ai examples](https://scrollytelling.ai/examples/), [Maglr](https://www.maglr.com/blog/best-scrollytelling-examples), [Metabole Studio](https://metabole.studio/en/blog/scrollytelling)
- AI crawlers and JavaScript — [INSIDEA](https://insidea.com/blog/seo/aieo/common-javascript-seo-issues-that-affect-ai-content-rendering/), [w3era](https://www.w3era.com/blog/seo/javascript-seo-guide/), [Verkeer](https://www.verkeer.co/insights/javascript-seo/)

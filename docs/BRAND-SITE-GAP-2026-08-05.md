# Brand Book Edition 03 → live site: gap analysis

**Source:** Smith & Adams Brand Book, Edition 03 (2026), 53 pp · read in full
**Compared against:** `main` @ `4c9b66e` and live production, 2026-08-05
**Purpose:** the brief for the site reformulation. Read this before any design work starts.

---

## 1. The one page that governs the website

Page 22 (*Channel guidelines*) is the binding instruction. Everything else is context.

| | |
|---|---|
| **Job of the website** | Prove the scope and the standard. |
| **Rules** | **Type direction B.** One asset per page with location and two figures. **No hero video over the lockup.** |
| **Cadence** | Reviewed quarterly |

Three things follow from that single row, and all three are currently broken.

---

## 2. Hard conflicts, ranked

### 2.1 The published numbers contradict the brandbook by 10× — resolve first

The brandbook's official proof points (p20) are **10+ years · 500+ units · €30M+ advised · 4 reports a year**, with the handling rule: *"Figures carry a date and a source in the footnote. A number without a date does not go out."*

The committed HTML defaults match the brandbook exactly (`+10`, `+500`, `+€30M`). **But the live site does not** — the Supabase CMS overrides them to:

| Live on site (CMS) | Brand Book (p20) |
|---|---|
| 1,000+ investors advised | 500+ units delivered |
| **€300M+** in advised investment value | **€30M+** of investment advised |
| 300+ assets under management | *(not a brandbook figure)* |

This is a published financial claim to international private investors that is **an order of magnitude above the brand's own approved figure**, carries no date and no source, and can be changed by anyone with CMS access without a deploy.

Either the brandbook is stale or the site is overstating. **This needs your call before anything else** — it is a credibility and compliance question, not a design one, and it sits on the page a US investor lands on first. Fixing it is SQL on `site_content`, not code.

### 2.2 The hero breaks three explicit rules at once

The homepage hero is an aerial drone video of a pool and rooftops with the SMITH & ADAMS GROUP lockup burned into the footage, centred over the image.

| Rule | Where | Status |
|---|---|---|
| "No hero video over the lockup" | p22, website row | ✗ |
| "Never centre the logo on a photograph" | p11, and p52 *do not* | ✗ |
| "Set type directly over texture" — listed under *do not* | p52 | ✗ |
| NOT ON BRAND: "drone sunsets… aerial pool shots" | p24 | ✗ |
| Type on image: "only on a navy scrim at 80% or a white plate" | p24 | ✗ |

The lockup is baked into the video file, so this cannot be fixed in CSS. **The hero needs re-shooting or re-cutting**, and the brandbook already says what to replace it with: photography direction **A (the asset — buildings as built things)** as the base language, with **C (documentary reportage of the group at work)** for the group, and B (place) on covers only. Every image captioned with a location and one number.

Note for the record: the hero gradient scrim I added on the `motion-layer` branch is also off-brand — p13 says *never gradients, never tinted photography*, and p24 permits only a **flat navy scrim at 80%** or a white plate. That grade should become a flat scrim, or disappear with the video.

### 2.3 Typography is the wrong system entirely

| | Brand Book (direction B, for the website) | Live site |
|---|---|---|
| Display | Helvetica Neue Light, 46–80 px, tracking −3.5%, sentence case | Geist / Poppins |
| Body | Helvetica Neue Roman, 13–15 px, 1.55 leading, max 34em | Satoshi |
| Serif | **None anywhere** in direction B | — |

The site loads Poppins and Satoshi. Neither is in the brand system. And note the trap: **direction A (Playfair) is not the website's voice** — it is for what an investor reads slowly (brochures, reports, advisory). Page 52 lists *"Mix the two type directions in one document"* under **do not**. So a Playfair headline on the site would be a second, different error, not a fix.

### 2.4 Colour: right family, wrong hex, wrong proportion

- Brand navy is **#11222D**. The site uses **#0C1E28** in 41 places and #11222D in zero.
- Proportion is mandated as **white 70 / navy 20 / stone 8 / slate 2**, with navy reserved for "moments" — covers, dividers, report fronts, the umbrella bar — *"not body pages"*. The current homepage is navy-dominant: the stats block, steps, dreams, press and social sections are all full-bleed navy. The proportion is roughly inverted.
- Stone `#C3CBD1` and slate `#6A7883` are not in the site's palette at all.

### 2.5 The residency-led positioning is the opposite of the brand

This is the most strategically significant conflict, and it collides with the work shipped yesterday.

The brandbook says, in four separate places:

- p19: *"Residency and visa routes are a footnote in investor material, never a headline. The asset has to stand on its return. Since the Golden Visa real-estate route closed, this is not a constraint — it is our advantage."*
- p33: paid media *"never runs a lifestyle promise, a countdown, a guaranteed return or a residency headline."*
- p35: **"Golden-visa promoters and funds"** are listed as a *competitor set* — characterised by "residency headline, urgency framing, regulatory exposure". The stated differentiator: *"Residency is our footnote, never our headline — and the property route is closed."*
- p46: lead scoring gives **−15 points** to "residency-only" profiles.
- p52 *do not*: **"Lead with residency, scarcity or lifestyle promises."**

The live site does the reverse: `/invest-in-portugal` is a residency-led page, the homepage CTA reads *"I want to invest in Portugal"*, and the FAQ shipped yesterday leads with eight questions on Golden Visa, D2, residency and citizenship.

That FAQ is good work and the AEO thesis behind it is exactly right — p40 explicitly names *"Search as an answer engine: pages that answer the expensive questions with real figures. Increasingly the source that AI assistants quote when someone asks about Portuguese yields."* But note **"with real figures"**, and note what the expensive question is: *yields*, not visas. The format is right; the subject matter is the competitor's, not ours.

### 2.6 Voice, throughout

Page 21 gives a literal substitution table. The site is on the wrong side of most rows:

| Brand Book: instead of | Write | On the site today |
|---|---|---|
| Exclusive opportunity | Nine units, 6.4% net yield | "the most exclusive opportunities reach you first" |
| Your dream in Portugal | A managed asset in Lisbon | "Building your dreams." |
| Book now, spots limited | A 20-minute call, whenever it suits you | "Book a Consultation" |

House style also bans em dashes, exclamation marks and emoji, and requires numerals for all figures, € before the amount, and dates as *12 March 2026*.

### 2.7 Smaller, but cheap to fix

- **No image carries a caption.** p23/p24: *"Every image carries a location and one number."* p52 *do*: *"Caption every photograph with a location and one number."*
- **"One asset per page with location and two figures"** (p22) — no page does this.
- **Practice naming.** p9: practices are written "S&A [Practice]" in text and "Smith & Adams [Practice]" at first mention; *"a practice never appears without the group signature somewhere on the piece."* The site's Property Management page does not carry the group signature this way.
- **Grid.** p16: twelve columns, 64 px margins, 20 px gutter, 6 px baseline, hairline under a tracked label at the top of every page and above the notes at the bottom, content never edge to edge except full-bleed imagery. The site has no consistent grid.

---

## 3. The real tension to resolve: immersive scroll vs institutional restraint

You want parallax, scroll-driven animation and immersive scrolling. The brandbook never mentions motion — it neither permits nor forbids it — but its whole argument is restraint: *"quiet type, generous space, verifiable numbers. Nothing that reads as an agency window"* (p6), *"Mixing them is what makes a company look like a listings site"* (p23), no urgency colour, no gradients.

A conventional immersive site — pinned lifestyle imagery, sweeping parallax over drone footage, big kinetic type — would be brand-accurate in polish and brand-wrong in argument. It would look like the "international buyer's agents" in the p35 competitor table: *"heavy on lifestyle; almost no published performance data."*

**There is a version that satisfies both, and the brandbook has already written it.** The group's flagship owned asset is the **Portugal Residential Performance Brief** and the **Yield Index** (p28, p39) — quarterly net-of-cost yield by district, occupancy, renovation cost per m², time to let. The strategic bet is *"nobody publishes trustworthy net-of-cost performance data on Portuguese residential investment. We do."*

So the immersive centrepiece should be **the data, scroll-told**:

- Scroll-driven charts where the Yield Index builds as you scroll — district by district, net versus gross, revealed as evidence rather than decoration.
- Parallax reserved for **depth on the asset photography** (direction A: buildings as built things), never on lifestyle.
- One pinned, scrubbed narrative on the whole site — a single building, start to let, with the real cost line on screen. That is p39's *"Deal files"* and *"The Cost Line"* as an interactive page, and p34's *"the long-form building film"*.
- Motion that "explains hierarchy, not decorates" — which is the same instruction the brand gives type.

That reading turns the design ambition into the brand's argument instead of fighting it: **the most immersive thing on the site is the evidence nobody else publishes.** It is also the strongest possible AEO asset, because it is figures with dates and sources on answer pages.

---

## 4. What this means for the `motion-layer` branch in flight

The branch is committed (`6f78152`) but not merged and not deployed. Verified: LCP 1.88 s at 4× CPU throttle, CLS 0.019, 60 fps held.

- The **engine** (motion.css / motion.js: easing tokens, reveals, parallax, reduced-motion, view transitions) survives the reformulation. It is brand-neutral infrastructure and it is measured.
- The **hero grade** does not — flat 80% navy scrim or nothing (§2.2).
- The **reveal attributes** already added to seven pages will need re-applying if the pages are rebuilt on the brand grid, so **do not extend them to more pages yet.**

Recommendation: hold the merge. Extending motion across a site whose type, colour, hero and positioning are all about to change is work that gets thrown away.

---

## 5. Decisions needed from you

1. **The numbers.** €30M+ or €300M+? 500+ units or 1,000+ investors? And what date and source goes in the footnote? *(Blocking — it is live right now.)*
2. **Residency.** Does the site follow the brandbook and demote Golden Visa / D2 to a footnote, keeping the FAQ format but re-pointing it at yields, costs and management? Or does the brandbook's rule get an explicit exception for the website because that traffic converts?
3. **Hero.** Re-cut the existing footage without the burned-in lockup, or commission direction A / C photography? Nothing else unblocks the homepage.
4. **Type licence.** Helvetica Neue for web needs a licence. Confirm, or agree a documented substitute — this is the one place a deliberate deviation may be reasonable, and it should be written into Edition 04 rather than improvised in CSS.
5. **Does the Yield Index exist yet?** The whole reformulation thesis in §3 depends on real data. If the first Brief is not published, the site can be built to receive it, but the immersive centrepiece cannot be filled with placeholder numbers — p52: *"Publish a figure without a date and a source"* is a *do not*.

---

*Next, once 1–5 are answered: research pass on best-in-class SEO + immersive-scroll sites, judged against this brief rather than against general "award site" taste.*

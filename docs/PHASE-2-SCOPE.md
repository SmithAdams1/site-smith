# Phase 2 — Governing the hand-built pages (unified CMS, part 2)

_Draft scope, 2026-08-08. Branch `homepage-redesign`. Follows Phase 1 (RE + Blog + Media native in Studio, legacy admins retired). Nothing here is built yet — this is the design to agree before writing code._

## The goal (client's words)
"One single platform that controls all the content inside the site — adding blocks and sub-blocks, images and text, editing the elements already present, in the style of the best CMS on the market."

## The one constraint that shapes everything
The bespoke marketing pages (home, about, invest, real-estate, property-management, contact, our-developments) were **hand-designed to Brand Book Ed.03**. We must **edit their content in place, never restructure them into generic blocks** — turning them into a freeform block soup would destroy the redesign we just shipped. This was already decided in Studio v1 and holds.

So Phase 2 is **not** "make every page a block page". It is: **make every string and every image on every page editable from one place**, while keeping the block-builder for genuinely new/simple pages.

## DECISION (2026-08-08, client)
Go the ambitious route, consciously superseding the old "don't blockify bespoke pages" rule:
- **Blocks everywhere, including the hand-built pages** — but **blocks == the `rd-` design-system components** (typed fields + a fixed on-brand template), never freeform HTML. You reorder/add/remove and edit fields; you cannot produce off-brand output.
- **Include the live click-to-edit editor (2c).**
- **Pilot on `about.html` first**: build the shared SSR block renderer + editor, migrate only About, prove byte-level SSR/SEO + visual parity and the live edit, then roll out to the other pages.

### Pilot build order (About)
1. **Block schema + shared SSR renderer.** Define block types for About's sections (Hero, Statement/Message, Funcs timeline, Pillars, Proof, Close) as typed data; extend `lib/renderBlocks.js` to render each to the *exact* current `rd-` HTML. Serve About from the block model via `api/page.js` on its real URL (not `/p/:slug`).
2. **SSR/SEO parity gate.** Diff the block-rendered HTML against today's `about.html` (content + `data-cms` + structure). Must match before anything ships. Crawlers get full HTML.
3. **Studio editor (2c).** Same renderer in an iframe: click a block → inspector (inline text EN/PT, images via the Media picker), drag to reorder, add/remove from the `rd-` palette. WYSIWYG because it's the same renderer.
4. **Switch** `/about` to the block-served version once 2+3 are proven. Then roll the pattern to the remaining hand-built pages, one at a time, each behind the same parity gate.

### Pilot progress (2026-08-08)
- ✅ `lib/renderRdBlocks.js` — six rd- block renderers (hero, prose, timeline, pillars, proof, close); pure, SSR + editor.
- ✅ `docs/about.blocks.json` — About block model seeded with live copy.
- ⚠️ **Model is one block short of the current page.** The live `about.html` has **7** sections; the model has 6 — it is missing the **"A message from our Head of Investment" (George Hobson)** block (component `rd-msg`, keys `about.message.*`, portrait + statement + bio-over-photo toggle). The model was seeded from an older `about.html`. **Next: add an `rd_msg` renderer + insert the George block, then re-run parity against the full 7-section page.** (The first structural parity check passed only because its markers didn't include `rd-msg`.)
- ✅ **Full-page parity ACHIEVED (offline).** Assembling `about.html`'s shell (head/nav/footer/scripts, verbatim) + `renderRdBlocks(about.blocks.json)` reproduces the current `about.html` with **identical visible + SEO HTML** — the only diffs are the non-visible `data-cms` hooks and decorative section comments, which are exactly what differs between the two content models. Verified by normalized diff (strip comments + data-cms → strings identical). Renderer refinements this took: `attr()` (quote-only, no double-encoding of pre-encoded `&amp;`), per-CTA `arrow`/`wrap` flags, and source-before-bullets order in `rd_proof`.
- ⏭️ **Next — the deploy-sensitive cutover (client-tested on Vercel):**
  1. `rd_pages(slug, title jsonb, blocks jsonb, seo jsonb, updated_at)` table + seed `about` from `about.blocks.json` (SQL for the client to run).
  2. `api/rd-page.js` (+ `api/_renderRdBlocks.js` copy): fetch the row, `renderRdBlocks`, inject into the About shell, serve. The shell = about.html split at `</header>` / `<footer` (or a stored template).
  3. Expose first at a **test route** (e.g. `/api/rd-page?slug=about`) so it can be compared live **without** removing `about.html` (Vercel filesystem would otherwise shadow a `/about` rewrite).
  4. Once verified live: flip — `vercel.json` rewrite `/about` → handler + delete the static `about.html`. This is the irreversible step; do it last, client-confirmed.
- ⏭️ Then the Studio live click-to-edit editor over the same renderer.

### ⚠️ PT / bilingual — the flip is BLOCKED on this (verified 2026-08-08)
About is **bilingual in production**. `site_content` PT coverage for the *current* page keys:
- **Has PT:** `about.hero.*`, `about.group.*`, `about.journey.*`, `about.solutions.*`, `about.track.*`.
- **No PT (EN-only even in prod):** `about.message.*` (George block), `about.cta.*` (closing).

The block model (`about.blocks.json`) is **EN-only**, so flipping `/about` to the block SSR now would **regress PT** for the five translated sections. Do **not** flip until the block system is bilingual:
1. **Add `pt` to the model** for hero/prose/timeline/pillars/proof, pulled from `site_content` PT (George + close stay EN — matches prod, no regression).
2. **Make the served page bilingual.** The rendered HTML has no `data-cms`, so cms-loader can't switch it. Follow the `api/page.js` pattern: the handler embeds the block model as a `<script type="application/json">`, and a small client script re-renders the blocks in PT (via the same `/lib/renderRdBlocks.js` module) when `cmsLocale === 'pt'` — so the EN/PT toggle keeps working without a reload.
3. **Add PT editing to the Studio editor** (a EN/PT toggle in the inspector; the renderer already does `pick()` en/pt fallback).
Then, and only then, the flip is a no-regression change.

**Progress:** ✅ **Bilingual DONE — flip is now UNBLOCKED (no PT regression).**
- Part 1 — `about.blocks.json` bilingual: 52 `pt` fields across hero/prose/timeline/pillars/proof; George + close EN-only (matches prod).
- Part 2 — served page switches EN↔PT without reload: handler wraps blocks in `<!--RD:START/END-->`, embeds the model as `#__RD_BLOCKS__` JSON, and a client module repaints via `/lib/renderRdBlocks.js` on `cmsLocale`, re-init'ing reveals + the bio toggle. Live + verified on `/about-preview`.
- Part 3 — Studio editor edits both locales (EN|PT toggle → fields + preview bind to the locale).
All committed and on the preview. The flip is now a no-regression change (pending explicit OK). First Studio Save seeds `rd_pages`; until then the handler serves the committed bilingual fallback.
> **Part 2 design decision to make first:** the current site switches language client-side (no reload, cms-loader re-applies `data-cms`). The block-served page has no `data-cms`, so PT needs either (a) a client re-render — embed the block JSON in the page + a module script that repaints the block region via `/lib/renderRdBlocks.js` when `cmsLocale==='pt'` (keeps the no-reload UX; must preserve DOM parity, e.g. repaint between `<!--RD:START-->`/`<!--RD:END-->` markers, not a wrapper div), or (b) SSR-per-locale — the switcher reloads to `/about?locale=pt` and the handler renders PT (better PT SEO, but a reload, inconsistent with other pages). Pick (a) for UX consistency unless PT SEO is a priority.

Until then: production `/about` stays the static bilingual file; `/about-preview` is the EN block-served validation surface (fully working, images and all).

### Rollout progress (path 2) — 2026-08-08
The block system now serves + edits **two** pages; the recipe is proven and repeatable.
- ✅ **About** — full pilot (model, SSR, PT switching, editor). `/about-preview`.
- ✅ **Invest in Portugal** — bilingual model (54/54 CMS keys; FAQ EN from static HTML), palette extended (rd_prose+cards, rd_asset, rd_project, rd_list, rd_faq w/ FAQPage JSON-LD), shell, `/invest-preview`, editor page-picker. Visible-text parity 100%; live, 0 errors.
- **Infra:** `api/rd-page.js` serves any page in `PAGES` (literal shell/fallback paths so Vercel bundles them); Studio editor has a page picker (`RD_PAGES`); each page has `<slug>.shell.html` + `docs/<name>.blocks.json`.
- **Per-page recipe:** (1) map sections → blocks, add any missing renderer faithful to the markup; (2) build the bilingual model from `site_content` (+ static for non-CMS bits like FAQ); (3) generate the shell; (4) add the slug to `PAGES`/`readShell`/`readFallback` + a `/<x>-preview` rewrite + the editor picker; (5) visible-text parity gate.
- **Remaining hand-built pages:** our-developments, property-management (functional: Boom booking + gallery), contact (form). index + real-estate are complex/functional. urban-collection/fanqueiros/privacy/terms are header-only.
- **The flip (path 1) stays for the end** — one flip per page (rewrite `/<slug>` → handler + delete the static file), each after its `-preview` is signed off.

### Risk register for the pilot
- **SEO/SSR parity is make-or-break** (canonical URL, crawler HTML). Gate every page on it.
- **Serving real URLs from the block model** (not `/p/:slug`) needs a routing/rewrite decision in `vercel.json` + `api/page.js` — settle it in step 1.
- Effort is real; the pilot exists precisely to prove the architecture on one page before committing to eight.

---

## (Original draft below — superseded by the DECISION above; kept for the reasoning)

## Two classes of page (the fork — superseded)
1. **Block-builder pages** — `pages` table, served at `/p/:slug` (SSR `api/page.js` + `lib/renderBlocks.js`). Here you **add / remove / reorder blocks and sub-blocks** freely. For new or simple pages. Already exists; extend the block palette.
2. **Hand-built pages** — the bespoke redesign pages. Here you **edit in place**: every copy string and every image, EN/PT — but you do **not** add/remove/reorder structure. Governed through an upgraded "Site content".

**Decision to confirm:** is that boundary right (restructure only on `/p/:slug` pages; hand-built pages are edit-in-place)? Everything below assumes yes.

## What already exists (we build on it, not from scratch)
- **`cms-loader.js` already applies both text and images** from `site_content` by `data-cms` key: `data-cms-attr` handles `html` / text / `src` / `srcset` / `href`. So image-editability needs **no loader work** — only that the `<img>` carries a `data-cms` key.
- **`site_content(key, value, locale)`** is the store; keys are page-namespaced (`about.*`, `invest.*`, …).
- **Studio → "Site content"** already lists per-page fields (EN/PT) and now, after Phase 1, **image fields get a preview + "Choose from library" picker** (the shared Media picker over `site-media`).
- **`docs/CMS-REHOOK-MANIFEST.md`** already inventories the hardcoded strings still needing keys (~71 on the homepage) + `scripts/cms-rehook-manifest.py` / `scripts/sync-cms-fallbacks.py` helpers.

## Scope, in build order
### 2a — Complete the CMS key coverage (mechanical, low risk)
Every editable string and image on the hand-built pages gets a `data-cms` key with an inline fallback that matches the live copy (the "served HTML == CMS" rule).
- Drive from `CMS-REHOOK-MANIFEST.md`; extend it to list **image** slots too (hero media, section images), not just strings.
- Add `data-cms` + `data-cms-attr="src"` to the `<img>`s that aren't hooked yet (heroes, section imagery). Many already are.
- Seed `site_content` rows for the new keys (value = current fallback) so Studio shows them populated.
- Verify with the CMS blocked: page identical before/after.

### 2b — "Site content" as the real governance surface (moderate)
Make the Content section genuinely cover a whole page, comfortably:
- Group fields by section (not one flat list), with human labels instead of raw keys.
- Image fields: preview + Media picker (done in Phase 1) + "clear".
- Rich-text where a field is HTML (reuse the Quill instances already in Studio) instead of a raw `<textarea>` of tags.
- Show EN/PT side by side with a "copy EN→PT" helper.

### 2c — Live-preview click-to-edit (high effort, the "best CMS" feel) — optional / later
An edit mode that loads the actual page in an iframe and lets you **click an element to edit it in place** (contentEditable for text, the Media picker for images), writing back to `site_content` by its `data-cms` key. This is what makes it feel like the best CMS on the market. Biggest build; propose as its own mini-project **after 2a/2b land**, because 2a/2b already satisfy "one platform controls all content".

### 2d — Block-builder palette for `/p/:slug` (moderate)
For the block pages, add the "blocks and sub-blocks" richness: more block types + nested sub-blocks, all pulling images from the Media picker. Only touches new pages, so zero risk to the redesign.

## Data model
- **No schema change needed for hand-built pages** — `site_content(key,value,locale)` already covers text and image URLs. The only new artefact is a per-page **registry of editable keys** so Studio knows what to show; derive it from the `data-cms` attributes in the HTML (or from the manifest), rather than hard-coding lists.
- **Block pages** keep the `pages` table (`blocks` jsonb). Sub-blocks = nested arrays inside `blocks`; `lib/renderBlocks.js` gains the new types (SSR) and the Studio builder mirrors them.

## Risks & decisions to confirm
1. **The fork boundary** (restructure only on `/p/:slug`; hand-built = edit-in-place). ← the key one.
2. **How far to take 2c** (live click-to-edit) — do it, or is grouped field-editing (2b) enough for now?
3. **Key coverage is the unglamorous majority of the work** — 2a across ~8 pages is where the hours go; it's mechanical but must respect the served-HTML rule.

## Suggested order
2a (coverage) → 2b (Site-content UX) → 2d (block palette) → 2c (live click-to-edit, if wanted). 2a is the foundation everything else needs.

# Phase 2 — Governing the hand-built pages (unified CMS, part 2)

_Draft scope, 2026-08-08. Branch `homepage-redesign`. Follows Phase 1 (RE + Blog + Media native in Studio, legacy admins retired). Nothing here is built yet — this is the design to agree before writing code._

## The goal (client's words)
"One single platform that controls all the content inside the site — adding blocks and sub-blocks, images and text, editing the elements already present, in the style of the best CMS on the market."

## The one constraint that shapes everything
The bespoke marketing pages (home, about, invest, real-estate, property-management, contact, our-developments) were **hand-designed to Brand Book Ed.03**. We must **edit their content in place, never restructure them into generic blocks** — turning them into a freeform block soup would destroy the redesign we just shipped. This was already decided in Studio v1 and holds.

So Phase 2 is **not** "make every page a block page". It is: **make every string and every image on every page editable from one place**, while keeping the block-builder for genuinely new/simple pages.

## Two classes of page (the fork — please confirm)
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

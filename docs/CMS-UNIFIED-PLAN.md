# Unified CMS — plan (roadmap item 5)

_Drafted 2026-08-07. Working branch `homepage-redesign`. This is the design for the client's ask: "one single platform that controls all the content inside the site — add blocks and sub-blocks, images and text, edit the elements already present, in the style of the best CMS on the market." Design before build: this doc + the fork decision come first._

## What already exists (better than the older handoffs say)
`studio.html` (116K) is already the skeleton of the unified backoffice — one Supabase login, a left-nav with sections. Native and working today:
- **Pages** — the block-builder for the `pages` table (`select/insert/update/delete`), rendered at `/p/:slug` by `api/page.js` + `lib/renderBlocks.js`. Block types: heading, richtext (Quill), image, image_text, gallery, video, button, divider. New pages can be added to the site nav via `show_in_nav`.
- **Site pages** — field-by-field EN/PT editing of the hand-built pages via `site_content` (key/value/locale), covering all 10 prefixes (`index. about. invest. dev. propmgmt. contact. urban. terms. privacy. global.`). This is how the bespoke rd-* pages are edited today.
- **Media** — upload + getPublicUrl against the `site-media` bucket (a browse/reuse library is partial).
- **Navigation** — heavily wired (reorders the nav, toggles `show_in_nav`).

Still **external** (0 native DB calls in Studio; still their own admin files):
- **Blog** → `admin.html` (posts CRUD, Quill, i18n `translations`, image upload).
- **Real Estate** → `admin-real-estate.html` (`properties` + `re_page`).

Fragmented files to retire once consolidated: `admin.html` (165K), `admin-real-estate.html`, and the dead `admin-v2.html` / `admin-v3.html`.

## Data model (Supabase)
- `pages` — block-builder pages (slug, title i18n, blocks jsonb, seo jsonb, published, nav fields). RLS: public reads published, authenticated does everything.
- `site_content` — (key, locale) → value. The hand-built pages' copy. Read at runtime by `cms-loader.js`.
- `posts` — blog (EN columns + `translations` jsonb for PT).
- `properties` — real-estate listings; `re_page` — the Real Estate hero config.
- Buckets: `site-media` (general), `blog-media` (posts).

## The gaps to "one platform controls everything"
1. **Blog native in Studio** — posts CRUD + Quill + EN/PT translations + image upload + slug/category/read-time. (Port from `admin.html`.)
2. **Real Estate native in Studio** — `properties` CRUD (the listing fields, gallery, amenities, golden_visa, transaction_type) + the `re_page` hero. (Port from `admin-real-estate.html`.)
3. **Media library** — finish browse/pick/reuse/delete across `site-media`, so image fields everywhere pick from one library.
4. **Navigation** — confirm reorder + group (Properties dropdown) + show/hide works for both `pages` and the hand-built pages.
5. **Retire** the old admin files and point every entry at Studio.
6. **Security** — see below.
7. **The fork** — how far block-editing reaches into the hand-built pages (next section).

## The one decision that forks the build
The hand-built rd-* pages (index, about, invest, real-estate, contact, our-developments, property-management) are bespoke HTML, not blocks. "Edit the elements already present / add blocks and sub-blocks" can mean two very different builds:

**Option A — Unified control plane; field + image editing on the bespoke pages (pragmatic, weeks).**
One Studio governs everything: Pages (blocks, for new pages at `/p/:slug`), Blog, Real Estate, Media, Navigation — all native. The bespoke pages are edited through an upgraded "Site content" that covers every copy string **and every image** (today `site_content` is mostly text), ideally with a click-the-element-on-a-live-preview mode instead of a flat field list. You add/remove/reorder blocks freely on block-builder pages; on the hand-coded pages you edit content in place but don't restructure them. Preserves the just-shipped redesign exactly. Honours the existing Studio decision ("don't rebuild bespoke marketing pages as blocks"). Lower risk.

**Option B — Everything is blocks (WordPress parity, months).**
Normalise every bespoke page into the `pages`/blocks model: rd-hero, rd-carousel, rd-proof, the canvas flythrough, FAQ, the Head-of-Investment block, etc. all become first-class block types with inspectors, and `renderBlocks.js` learns to output them (server-side, including the GSAP/Lenis/canvas wiring). The homepage becomes a `pages` row. Then the builder truly governs add/remove/reorder blocks and sub-blocks on **all** pages. This is the fullest "best CMS on the market" reading, but it re-plumbs the SEO surface of every page, risks regressing the bespoke motion/SEO work just shipped, and is a large migration. (This matches the older "normalize ALL pages into rd-" intent.)

**Recommendation: a phased hybrid.** Do A first — it delivers "one platform controls all content" quickly and safely — then migrate to B **one page at a time, on request**, as each rd-* component is promoted to a proper block type. That way full block-parity is reached incrementally without a big-bang migration and without freezing the site.

## Phased plan (assuming the hybrid)
- **Phase 0 — Security (do first, blocks nothing).** Rotate the admin password in Supabase; the cleartext is removed from `schema.sql` (done in this branch) but remains in git history of a public repo — scrub history or make the repo private. Consider per-user admin accounts over one shared login.
- **Phase 1 — Consolidate.** Bring Blog and Real Estate natively into Studio; finish the Media library; confirm Navigation. Retire `admin*.html`. Result: one backoffice, every content type native. (This alone satisfies "unified platform controls all content".)
- **Phase 2 — Bespoke-page editing.** Upgrade "Site content" to cover images as well as text, and add a visual/in-context editing mode (click an element in a live preview, edit it). Wire the 13 new `about.message.*` keys + `home.proof.source` + `about.track.source` + the 71 strings in `CMS-REHOOK-MANIFEST.md`.
- **Phase 3 — Block parity, per page.** Promote rd-* components to block types and migrate pages into the builder one at a time, on request.

## Open decisions for the client
1. **A vs B (the fork above).** Recommend the phased hybrid (A now → B per page later).
2. Within Phase 1, **which to consolidate first — Blog or Real Estate?** (Real Estate is the higher-traffic, more complex domain; Blog is simpler and a faster win.)
3. **Auth**: keep one shared admin login, or move to per-user accounts (better audit trail; the `pages.updated_by` column already exists for it).

## Security action items (priority)
- ⚠️ **Rotate `admin@smithandadams.com`'s password in Supabase now.** It shipped in cleartext in a public repo (`schema.sql`, previous editions) and is in git history.
- Cleartext removed from `schema.sql` in this branch (uses a `:'admin_pw'` psql var).
- Decide: scrub git history (BFG/filter-repo) and/or make the repo private.

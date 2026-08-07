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

## Verified findings & decisions (2026-08-07)
Locked with the client, and confirmed against the code:
- **Fork → phased hybrid.** Unify now (A), migrate pages into blocks later, one at a time (B). Do not big-bang B.
- **Auth → per-user accounts.** Confirmed no app change is needed: Studio's login already uses `sb.auth.signInWithPassword({ email, password })` with a full email, and every RLS policy authorises `auth.role() = 'authenticated'` (any user). **Action is purely in Supabase:** create one account per person under Authentication → Users. The `admin.html` login still concatenates `@smithandadams.com` (line ~405), but it's being retired; non-`@smithandadams` users must sign in through Studio, not that file.
- **Consolidation order → Real Estate, then Blog, then Media** ("avança conforme esta lista"). Media *upload* already works, so RE/Blog can upload inline now and gain the shared picker when Media is finished last.

**The surface is further along than the older handoffs claimed:**
- `admin-v2.html` / `admin-v3.html` **no longer exist** — already deleted.
- Studio's **Real Estate and Blog sections already embed the real admins in an iframe** (`activateSection` → `loadEmbed('re-frame','/admin-real-estate.html')` and `loadEmbed('blog-frame','/admin.html')`), lazy-loaded on first open. Both are **same-origin with no custom `storageKey`, so they inherit Studio's Supabase session** — no second login. So "one login, one surface, all content types" is effectively already true; the seam is cosmetic (the embedded admins show their own header/login chrome).

**Two ways to finish Phase 1, pick per appetite:**
1. **Polish the embed (fast, ~zero risk).** When embedded (`window.self !== window.top`), the admins hide their own chrome (RE: the navy `Real Estate — Backoffice` bar + sign-out; Blog/admin.html: its sidebar + login screen) so they present as native Studio panels. Reuses 100% of tested CRUD. Cannot retire `admin*.html` (still the engine behind the iframe).
2. **True native re-author (slower, higher fidelity).** Rebuild the CRUD inside `studio.html` and retire `admin*.html`. For Real Estate the exact contract is known — port these verbatim:
   - list: `sb.from('properties').select('*').order('featured',{ascending:false}).order('created_at',{ascending:false})`
   - save: `payload = { slug, reference, status, price, currency:'EUR', golden_visa, featured, title:{en,pt}, summary:{en,pt}, description:{en,pt}, highlights:{en:[],pt:[]}, images:[], cover_image, brochure_url }` (+ the location/spec fields `region, city, property_type, transaction_type, bedrooms, bathrooms, area_sqm, year, plot, energy, lat, lng` — read the full `saveProperty` in `admin-real-estate.html` before porting); insert with `.select().single()`, else `update().eq('id', current.id)`
   - upload: `sb.storage.from('properties').upload(path,file,{cacheControl:'3600',upsert:false})` → `getPublicUrl`
   - hero: `sb.from('re_page').select('hero,blocks').eq('id','real-estate')`

**⚠️ Verification constraint for this whole item.** Everything meaningful in the backoffice is behind Supabase auth, which cannot be exercised headlessly in this environment (interactive login). Studio UI *renders* can be checked, but **authenticated create/edit/delete must be verified by the client logging in.** Build correct-by-construction from the contracts above; hand data-write verification to the client.

## Security action items (priority)
- ⚠️ **Rotate `admin@smithandadams.com`'s password in Supabase now.** It shipped in cleartext in a public repo (`schema.sql`, previous editions) and is in git history.
- Cleartext removed from `schema.sql` in this branch (uses a `:'admin_pw'` psql var).
- Decide: scrub git history (BFG/filter-repo) and/or make the repo private.

## Progress — 2026-08-08 (this session), client-verified with a login
Phase 1 consolidation is well underway. Order RE → Blog → Media.

- **Real Estate → native, DONE & tested.** `studio.html` has the full native module: list + editor + CRUD + image upload to the `properties` bucket + `re_page` hero editor. Payload was audited **column-for-column** against `admin-real-estate.html` `saveProperty()` and matches exactly: `slug, reference, status, transaction_type, property_type, region, city, address, price, currency:'EUR', bedrooms, bathrooms, area_sqm, plot_sqm, year_built, energy_rating, latitude, longitude, golden_visa, featured, title{en,pt}, summary{en,pt}, description{en,pt}, highlights{en,pt}, images, cover_image, brochure_url`. `reEdit` restores `images` + `brochureUrl` (no data loss on edit). UI made Studio-compliant: `.re-f` fields match the inspector style, grouped **Basics / Location / Specification / Content / Gallery**, list rows have thumbnail + Published/Draft/★Featured badges. **Legacy editor link removed**; `activateSection('real-estate')` now calls `reLoad()` so the list loads on open (not only after a save). Minor gap: no UI yet to *replace* the brochure (existing `brochure_url` is preserved on edit).
- **Blog → native, DONE & tested.** Replaced the `admin.html` iframe with a native module: posts list (thumbnail, category badge, date, read-time), editor grouped **Basics / Cover / Content(EN) / Content(PT)** with **Quill EN+PT**, cover upload to `blog-media`. Payload mirrors `admin.html` `savePost()`: `{title, slug, category, read_time, excerpt, content, image_url, translations:{pt:{title,excerpt,content}}}`; slug preserved on edit, `slugify()` on create. `activateSection('blog')` calls `blLoad()`. Quill instances are lazy-init on first editor open (`blInitQuills`).
- **Media → DONE (build-verified; needs a logged-in write test).** The library already did browse/upload/copy-URL/delete over `site-media`. Added the missing **pick / reuse** half: a reusable `openMediaPicker(onPick)` modal (folder switch + upload-new + click-to-pick, returns the public URL) wired into every image field — RE gallery (`#re-pick` → `reState.images.push`), Blog cover (`#bl-pick` → `blState.cover`), and Site-content image fields (auto-detected by key/extension; a preview + "Choose from library" that fills every locale and marks the row dirty). Same bucket/folders as the Media section, so all fields draw from one library. Verified: `studio.html` parses with zero console errors and every field/button is in the DOM; authenticated picking to be confirmed with a login.
- **Legacy admins RETIRED** (commit `8c63811`): `admin.html` and `admin-real-estate.html` deleted after the native modules' writes were re-confirmed with a logged-in test. `admin-v2/v3` were already gone. Nothing functional referenced them (no iframe, link, rewrite, or cms-loader hook); only provenance comments in `studio.html` remain.
- **Auth:** per-user accounts = create users in Supabase → Authentication → Users. No code change (Studio already uses `signInWithPassword` + RLS `authenticated`).
- **Security (Phase 0, still open):** rotate `admin@smithandadams.com` password in Supabase; scrub git history / make repo private.

**Commits on `homepage-redesign`:** `d5f07a4` (RE native, preserved from the interrupted session), `1154d51` (RE UI Studio-compliant), `e8fa8b6` (Blog native + RE finalise). Test surface: `/studio.html` on the branch preview alias. **Verification constraint stands:** authenticated writes can only be tested by the client logging in — build correct-by-construction from the contracts above.

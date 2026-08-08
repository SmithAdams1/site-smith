# Go-live plan — `homepage-redesign` → production

_Draft 2026-08-08. Nothing here is executed without explicit owner approval. Production = `main` on `SmithAdams1/site-smith`, git-connected to Vercel: a push to `main` auto-deploys to **www.smithandadams.com** in ~30s._

## What go-live does (blast radius)
Merges the whole redesign line into production at once: **170 files, +5,340 / −6,175**. The entire public site switches from the legacy design to the redesign, plus the new backoffice and the block-served pages.
- **Every public page** → redesign look (rd- system, compiled `tailwind.css`, baked nav, `redesign.js` motion).
- **`/about` + `/invest-in-portugal`** → **SSR from the block model** (`api/rd-page.js` + `rd_pages`/committed fallback), bilingual.
- **Backoffice** → unified Studio (Real Estate, Blog, Media, Redesign-pages block editor); legacy `admin*.html` gone.
- **Bespoke pages** (our-developments, property-management, contact, real-estate, blog, index) → redesigned, still `site_content`-editable, functional widgets (Boom booking, contact form, listings) unchanged.

Fast-forward is possible (main `c798471` is a direct ancestor), so history stays linear — no merge commit needed.

## Pre-flight checklist (confirm BEFORE the merge)
1. **Git author = Suzan** `<suzan@smithandadams.com>` — required or Vercel won't deploy. (Already configured.)
2. **Supabase is the same project for preview + prod** (`bcjtkfipcfvvitglgpys`), so `rd_pages` (created) + `site_content` + RLS are already in place — **no DB migration at go-live**. `/about`+`/invest` serve from the committed bilingual fallback until a first Studio Save seeds `rd_pages`.
3. **Admin password rotated** (Phase 0) — done.
4. **`tailwind.css` compiled + committed** — done. (If any HTML class changed since, recompile: `npx -y tailwindcss@3 -c scripts/tailwind.config.js -i scripts/tailwind-input.css -o tailwind.css --minify`.)
5. **Preview QA green** — done (both block pages: 200, SSR, canonical, meta/OG, images, links, FAQ schema, 0 render errors). **Still do the 2-minute in-browser check**: EN↔PT toggle repaints on `/about` + `/invest-in-portugal`; console clean.
6. **Working tree**: only untracked files (`.claude/`, `docs/STUDIO-HANDOFF.md`, `scripts/build-invest-page.py`) — they won't be pushed. Decide whether to commit the two docs/scripts or leave them.

## Cleanup to do BEFORE merging (small)
- **Remove the `/about-preview` and `/invest-preview` rewrites** from `vercel.json` (they'd become live duplicate URLs of `/about` and `/invest-in-portugal`). Canonicals already point to the clean URLs, so the SEO risk is low, but cleaner to drop them for production. (One small commit.)

## Deploy steps (owner runs, or Claude with explicit OK)
```bash
cd ~/Code/site-smith
git fetch upstream
git checkout homepage-redesign && git pull --ff-only upstream homepage-redesign   # ensure latest
# fast-forward main to the redesign line
git checkout main && git merge --ff-only homepage-redesign
git push upstream main        # ← THIS triggers the production deploy (~30s)
```
Then watch the Vercel dashboard for the deployment to go green.

## Immediate post-deploy smoke test (on www.smithandadams.com)
- `/` homepage renders (hero, sections).
- `/about` + `/invest-in-portugal`: block-served, EN↔PT toggle works, images load, no console errors.
- `/real-estate`: listings load from Supabase. `/blog`: posts load. `/property/<slug>` + `/blog/<slug>` resolve.
- `/property-management` + `/contact`: **the Boom booking widget and the contact form submit** (business-critical — test a real submit).
- `/studio`: login works (rotated password), each section loads.
- Spot-check PT across a couple of pages; check the nav/footer + dropdown on 2–3 pages.

## Rollback (if anything is wrong)
- **Fastest — Vercel dashboard:** Deployments → the previous production deployment (pre-merge) → **Promote to Production** / Rollback. Instant, no git.
- **Git:** reset production to the known-good and redeploy:
  ```bash
  git push upstream c798471ae3079d03c6bacdbeb7009eb9cdccf73e:main --force
  ```
- Backup mirror exists at `~/site-smith-backup.git`; `main@c798471` is the known-good baseline.

## Risks & mitigations
- **Whole-site change at once (big blast radius).** → Deploy at a low-traffic time; keep the Vercel rollback one click away; run the smoke test immediately.
- **`/about` + `/invest` now depend on the SSR function + Supabase.** → The committed fallback serves the content even if `rd_pages` is empty; verified on preview. If the function errors, those two pages 500 (rest of the site is static/unaffected) → rollback.
- **SEO.** → Content + canonicals + titles verified at parity; URLs unchanged. Neutral expected. After go-live: resubmit `sitemap.xml` in Search Console and monitor coverage for a week.
- **Functional widgets (contact form, Boom booking).** → Unchanged logic, but restyled — test a real form submit + a booking search post-deploy (lead capture is business-critical).
- **Editing surface change.** → About/Invest are now edited only via Studio → Redesign pages (not "Site pages"). Tell whoever edits content.

## After go-live (optional follow-ups)
- Seed `rd_pages` for about + invest (a Studio Save each) so they serve from the DB, not the fallback.
- Consider PT for the bespoke pages / more pages in blocks (deferred by decision).
- Move heavy media masters out of the repo (clone-time), if not already.

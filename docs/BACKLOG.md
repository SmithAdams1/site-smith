# Smith & Adams — Work Log & Backlog

> **Purpose:** this file is the handoff record. It is written so that **any account, starting cold, can pick the work up mid-flight** when credits run out. Update it at the end of each working block.

---

## Accounts & tooling in use

| What | Value |
|---|---|
| Claude Code user | `abilio.diz@smithandadams.com` |
| Model | Claude Opus 4.7 (some blocks ran on Opus 4.8 / Fable 5 — see log) |
| Repo (canonical) | **`SmithAdams1/site-smith`** — Suzan owns it |
| Repo (mirror) | `abiliodiz-cell/site-smith` — keep in sync |
| Git author (this repo) | **Suzan** `<suzan@smithandadams.com>` — required, see below |
| GitHub CLI accounts | `SmithAdams1` (push to canonical) · `abiliodiz-cell` (mirror) — switch with `gh auth switch --user <name>` |
| Vercel | project `site-smith`, team `smith-adams1`, logged in as `suzan-3966` |
| Production URL | https://www.smithandadams.com |
| Supabase | project `bcjtkfipcfvvitglgpys` (CMS: `site_content`, `posts`, `properties`, `pages`, `re_page`) |
| Local checkout | `~/Code/site-smith` (~946MB — full media required) |

**Critical rules**
1. **Vercel is git-connected** (since 2026-07-29). A push to `SmithAdams1/main` **auto-deploys to production** in ~28s. Never push half-finished work to `main` — use a branch.
2. **Git author must be Suzan** — the SA Vercel setup only deploys Suzan-authored commits. Already configured locally (`git config user.email suzan@smithandadams.com`).
3. **Never deploy from an old checkout.** Doing so once wiped the entire Studio from production. Always `git pull` first; work only in `~/Code/site-smith`.
4. **Content vs code:** copy lives in Supabase `site_content` and goes live **immediately** on SQL execution (no deploy). Code needs a push.

---

## Session log

| Date | Block | Account / model | Outcome |
|---|---|---|---|
| 2026-07-10 | Studio v1 steps 1–4c (schema, `/p/:slug` SSR, shell, block builder, i18n, preview) | abilio.diz / Opus 4.7 | Shipped, commits `fde550c`→`40bb201` |
| 2026-07-10 | Step 5 nav injection + native Site-pages editor | *other account* | Commits `89704bd`, `c423238` |
| 2026-07-13 | `/api/page` 500 fix, About 3rd card | *other account* | `6826f90`, `852550c` |
| 2026-07-13 | Studio follow-ups: Site-pages coverage, native Media + Navigation, Blog/RE embedded, dead admins deleted | abilio.diz / Opus 4.7 | `3ad5990` |
| 2026-07-13 | Navigation shows full site menu + Real Estate visibility flag | abilio.diz / Opus 4.7 | `d6015be` |
| 2026-07-13 | Fix `/p/:slug` 500 in prod (ESM `api/package.json` + malformed regex) | abilio.diz / Opus 4.7 | `8c8fe44` |
| 2026-07-29 | Calculator revert recovery + repo consolidation + Vercel git-connect | abilio.diz / Opus 4.7 | `123a0b6`, `6779ea4`, `1377e13` |
| 2026-07-29 | 4 pending copy SQL from `smith-adams-copy-changes-log.md` | abilio.diz | Applied to `site_content` (12 rows EN+PT) |
| 2026-07-29 | Full master-doc copy audit — 4 remaining "developer" framing fixes | abilio.diz | Applied (8 rows EN+PT) |
| 2026-07-29 | Health & Physical Information A4 PDF (branded, bilingual) | abilio.diz / Opus 4.7 | Delivered as file |
| **2026-07-30 (11:00→12:xx)** | **Motion layer — in progress** | abilio.diz / Opus 4.7 | Branch `motion-layer`: `1be5cca` (video+CSS), `2769366` (this doc), `43ba2f7` (foundation+hero wiring) |
| 2026-08-05 (~afternoon) | Homepage: removed Press/Media block (EN+PT) | abilio.diz / Opus 4.8 | Branch `main` → prod: `6813242` (upstream + mirror pushed, auto-deployed, verified live). motion-layer WIP untouched (stash-popped back). |

> Hours are not tracked precisely; use commit timestamps (`git log --format='%h %ad %s' --date=iso`) as the source of truth for elapsed work.

---

## CURRENT WORK: motion layer (branch `motion-layer`)

**Goal:** take the site to "ultra pro" motion. Decision taken with the user: **keep the static delivery, add a real motion layer** (not a framework rebuild). Static ≠ no motion; the site simply had zero animation libraries.

**Branch:** `motion-layer` (NOT merged, NOT deployed). Base: `1377e13`.

### ✅ Done — commit `1be5cca`

**Video optimisation** (the single biggest win — the site's #1 problem)

The homepage was serving **53MB on desktop** and **39MB on mobile**, both encoded at 15–21 Mbps for a *muted ambient background loop* (~15× the necessary bitrate).

| Asset | Before | After | Change |
|---|---|---|---|
| Desktop hero (1920×802) | 53 MB | **3.5 MB** | −93% |
| Mobile hero (→720w) | 39 MB | **1.3 MB** | −97% |
| Posters | — | 146 KB / 118 KB | new |

- Pipeline is committed and repeatable: **`media/encode.sh`**
- Audio stripped (`-an`), `+faststart`, CRF-based (27 desktop / 28 mobile)
- Quality verified frame-by-frame against source — no visible artefacts
- **VP9/WebM was tried and deliberately dropped:** on this footage it came out *larger* than H.264 (3.7 vs 3.5 MB; the real-estate clip went 2.8 → 4.1 MB). Shipping it as primary would have slowed the site. MP4-only is correct here — don't "re-add WebM" without measuring.

**`motion.css`** — the motion vocabulary:
- Premium easing tokens (`--sa-ease-out-expo` etc.). **No overshoot** — luxury property, not consumer app.
- `[data-reveal]` / `[data-reveal-mask]` pre-states **gated behind `.js`** so content is never invisible without JS
- Ken Burns utility, hero-video fade-in, cross-document view transitions
- **Mandatory `prefers-reduced-motion` block** landing users in the final visual state

### ✅ Also done — commit `43ba2f7`

**Hero video wired in.** `index.html` now serves `/media/hero-{desktop,mobile}.mp4` with per-variant posters, `preload="none"`, cross-fade on `canplay`, and no video fetched at all under reduced-motion or saveData/2G. *(The CMS key `index.hero.video_url` turned out to have **no row** in `site_content`, so no SQL was needed — the hardcoded src is authoritative.)*

**`motion.js`** — zero dependencies, ~1kb of behaviour:
- **Deliberately not GSAP.** Reveals are IntersectionObserver + CSS transitions on transform/opacity — ~35kb lighter. GSAP only becomes worthwhile for the pinned scrollytelling section, and then only on that page.
- Reveal system for `[data-reveal]` / `[data-reveal-mask]` / `[data-reveal-lines]`
- Layered parallax (rAF-throttled, transform only, capped 18%)
- Pauses off-screen video; rebuilds on `cms-loaded`; shared-element VT name assigned at click time

**Legacy `.custom-fade-in` rebuilt** (6 instances in `index.html`, 1 in `about.html`):
- Removed inline `transition: all` + `filter: blur(4px)` — blur repainted whole sections every frame (main jank source)
- Pre-state moved to `motion.css` under `.js` → **with JS disabled content is now fully visible** instead of 40% opacity behind a blur (verified)
- Reveal now uses `threshold: 0` + bottom rootMargin. The page's own observer used `threshold: 0.2`, which **never fires for sections taller than ~5× the viewport**

**Injected** into all 15 public pages. `admin.html`, `admin-real-estate.html`, `studio.html` excluded.

> ⚠️ **Tooling caveat for future sessions:** `getComputedStyle` in the automation browser returns **stale values** on this site — inline styles read back as unapplied while rendering correctly. This caused a false-alarm bug hunt. **Trust screenshots over computed styles** when verifying motion here.

### 🔜 Next — pick up here

**1. Cinematic homepage hero polish** (task #10)
- Masked reveal on the headline with staggered entry (use `data-reveal-mask` / `data-reveal-lines`, already implemented)
- Subtle depth parallax on the hero media (`data-parallax="8"` inside a `[data-parallax-wrap]`)
- Gradient grading over the video so the copy reads at any frame
- **The LCP element must never be animated** — reveal *around* the headline/poster

**2. Sitewide reveals + one pinned narrative** (task #11)
- Add `data-reveal` / `data-reveal-mask` attributes to section content across pages — the system is built, nothing consumes it yet beyond the legacy fades
- Luxury timing: 600–1000ms, `expo.out`, max 2 focal motions per viewport
- At most one pinned/scrubbed section on the whole site — **this is the only place GSAP + ScrollTrigger should be introduced**, loaded on that page alone

**3. Page transitions** (task #12)
- `@view-transition` CSS is already in `motion.css` and the shared-element wiring is in `motion.js`
- Still to verify end-to-end: property card → property detail hero morph, and that names never duplicate

**4. Verify before merging**
- Throttle CPU 4× — must hold 60fps
- Reduced motion on — page complete and usable
- JS disabled — all content present
- LCP/CLS before vs after (use the `web-perf` skill). If LCP got worse, the motion is wrong.
- Then: merge to `main` → auto-deploys to production

### Open decisions for the user
- **`aboutVideo.mp4` (34MB) is referenced nowhere** — not in any HTML, not in `site_content`, not in `pages`/`re_page`. Dead weight. Delete, or keep as a master? *(not deleted unilaterally)*
- **Original masters (53MB + 39MB + others, ~92MB)** are still in the repo. Now that Vercel builds from git, repo size costs clone time on every deploy. Move masters out of the repo, or keep?
- `urban-collections/` holds two more variants of the same 20s clip (7.1MB 4K, 8MB) — likely consolidatable.

---

## Skills installed for this work

Created **`~/.claude/skills/premium-web-motion/`** (not in this repo — it is user-level):
- `SKILL.md` — non-negotiables, technique selection, easing discipline, performance budget
- `references/gsap-static-setup.md` — GSAP/ScrollTrigger architecture + the 7 recurring pitfalls
- `references/media-optimization.md` — video/Lottie/image pipeline with ffmpeg commands
- `references/motion-taste.md` — cheap vs expensive signals, brand archetypes (luxury property)
- `references/architecture-choices.md` — static vs framework, honest capability table

Audit finding: **61 skills were already installed.** UI/UX and webdesign are excellently covered (`ui-ux-pro-max` is the gold standard, plus `frontend-design`, `design-audit`, `typography`, `web-design-guidelines`, `bencium-*`). Only motion was genuinely missing. **Do not install more design skills** — they would duplicate.

---

## Wider backlog (not started)

**Security**
- Admin password is plaintext at `schema.sql:126` and in git history. Repo was made private 2026-07-29, which closes the exposure, but **the password has not been rotated** (user's decision to defer). Same password was also shared in chat — rotate when convenient.

**Studio v2**
- Consolidate Blog + Real Estate natively (currently embedded in iframes — works, but not native)
- Settings section is still a stub (feature flags, editor accounts)
- `admin.html` login concatenates `@smithandadams.com` to the username — breaks if a full email is entered. A fix branch `fix-admin-login-email` was spun off; **verify whether it landed**.

**Content / copy**
- Master doc `~/Downloads/smith-adams-full-site-copy-master.md` — fully applied and audited as of 2026-07-29.
- `urban.advantages.0.body` still claims *"over a decade of experience"*, which contradicts the 2020 founding. Left deliberately (user deferred, page is hidden from the menu).
- Campolide: distinct projects with distinct values — **not** duplicate data. Do not "fix".

**Studio pages**
- Only one Studio page exists (`/p/hello`, a test). Real pages still to be built.
- Migration of existing hand-designed pages to blocks: **deliberately not doing this.** Custom marketing pages stay hand-coded; only their text is CMS-editable. The block builder is for new/simple pages.

---

## Resuming cold — command sequence

```bash
cd ~/Code/site-smith
git fetch upstream && git status          # canonical = upstream (SmithAdams1)
git checkout motion-layer                # the in-flight branch
git log --oneline -5                     # last: 1be5cca
cat docs/BACKLOG.md                      # this file
ls -lh media/                            # optimised video is here
```

Then continue from **"🔜 Next — pick up here"** above, starting with wiring the video into `index.html` (item 1) since the encoded files exist but nothing references them yet.

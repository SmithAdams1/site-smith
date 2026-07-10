-- =====================================================================
-- Studio v1 — page builder schema
-- =====================================================================
-- New table `pages` powers the WordPress-style page builder in /studio.
-- Existing static pages (index.html, about.html, real-estate.html, ...)
-- are NOT touched. Pages created in the Studio render at /p/<slug>
-- via the /api/page.js serverless function.
--
-- Idempotent: safe to run multiple times.
-- Media reuses the existing `site-media` bucket (see schema.sql §7).
-- =====================================================================

-- 1. Pages table --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pages (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    -- URL: /p/<slug>. Slug is the canonical route.
    slug          text NOT NULL UNIQUE,

    -- Optional pretty URL override (e.g. "/investir-em-portugal").
    -- Enforced unique via partial index below (nulls allowed).
    -- Rewrite in vercel.json can later map custom_path -> /api/page?slug=...
    custom_path   text,

    -- Per-locale title: { "en": "About Us", "pt": "Sobre Nós" }
    title         jsonb NOT NULL DEFAULT '{}'::jsonb,

    -- Ordered array of block objects. Each block:
    --   { "id": "b_xxx", "type": "heading|richtext|image|image_text|
    --                             gallery|video|button|divider|spacer|
    --                             columns|embed",
    --     "data": { <type-specific fields, i18n where needed> } }
    blocks        jsonb NOT NULL DEFAULT '[]'::jsonb,

    -- SEO overrides. Shape:
    --   { "title": { "en":"...", "pt":"..." },
    --     "description": { "en":"...", "pt":"..." },
    --     "og_image": "https://..." }
    seo           jsonb NOT NULL DEFAULT '{}'::jsonb,

    -- Draft / published
    published     boolean NOT NULL DEFAULT false,

    -- Nav integration (auto-injected by cms-loader.js when true)
    show_in_nav   boolean NOT NULL DEFAULT false,
    -- Optional grouping key (e.g. "properties" to nest under the
    -- Properties dropdown). NULL = top-level.
    nav_group     text,
    nav_position  integer NOT NULL DEFAULT 100,

    -- Audit
    created_at    timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at    timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 2. Indexes ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS pages_published_idx
    ON public.pages (published);

CREATE INDEX IF NOT EXISTS pages_nav_idx
    ON public.pages (show_in_nav, nav_position)
    WHERE show_in_nav = true;

CREATE UNIQUE INDEX IF NOT EXISTS pages_custom_path_uidx
    ON public.pages (custom_path)
    WHERE custom_path IS NOT NULL;

-- 3. Auto-update `updated_at` on every UPDATE --------------------------
CREATE OR REPLACE FUNCTION public.pages_touch_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pages_touch_updated_at ON public.pages;
CREATE TRIGGER pages_touch_updated_at
  BEFORE UPDATE ON public.pages
  FOR EACH ROW EXECUTE FUNCTION public.pages_touch_updated_at();

-- 4. Row-Level Security ------------------------------------------------
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;

-- Public (anon) can only read PUBLISHED pages.
DROP POLICY IF EXISTS "Public read published pages" ON public.pages;
CREATE POLICY "Public read published pages"
  ON public.pages FOR SELECT
  USING (published = true);

-- Authenticated users (admins) can read everything, including drafts.
DROP POLICY IF EXISTS "Authenticated read all pages" ON public.pages;
CREATE POLICY "Authenticated read all pages"
  ON public.pages FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated insert pages" ON public.pages;
CREATE POLICY "Authenticated insert pages"
  ON public.pages FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated update pages" ON public.pages;
CREATE POLICY "Authenticated update pages"
  ON public.pages FOR UPDATE
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated delete pages" ON public.pages;
CREATE POLICY "Authenticated delete pages"
  ON public.pages FOR DELETE
  USING (auth.role() = 'authenticated');

-- 5. Sanity check ------------------------------------------------------
-- Uncomment to verify after running:
--   SELECT column_name, data_type FROM information_schema.columns
--     WHERE table_schema='public' AND table_name='pages' ORDER BY ordinal_position;
--   SELECT policyname FROM pg_policies WHERE tablename='pages';

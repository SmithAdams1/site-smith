-- 1. Create the posts table
CREATE TABLE public.posts (
    id uuid default gen_random_uuid() primary key,
    title text not null,
    slug text not null unique,
    excerpt text not null,
    content text not null,
    category text not null,
    read_time text not null,
    image_url text not null,
    -- i18n: per-locale overrides for title/excerpt/content. Shape:
    --   { "pt": { "title": "...", "excerpt": "...", "content": "<p>...</p>" } }
    -- Loader/article use EN columns as fallback when a locale or field is missing.
    translations jsonb not null default '{}'::jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Migration para tabelas existentes:
-- ALTER TABLE public.posts
--   ADD COLUMN IF NOT EXISTS translations jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 2. Enable Row Level Security (RLS) on posts
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies for Posts
CREATE POLICY "Allow public read access on posts"
ON public.posts
FOR SELECT
USING (true);

CREATE POLICY "Allow authenticated insert on posts"
ON public.posts
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated update on posts"
ON public.posts
FOR UPDATE
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated delete on posts"
ON public.posts
FOR DELETE
USING (auth.role() = 'authenticated');

-- 4. Create Storage Bucket for Blog Images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('blog-media', 'blog-media', true);

-- 5. Storage Bucket RLS Policies
CREATE POLICY "Public read access to blog-media"
ON storage.objects FOR SELECT
USING (bucket_id = 'blog-media');

CREATE POLICY "Authenticated users can insert into blog-media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'blog-media' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update blog-media"
ON storage.objects FOR UPDATE
USING (bucket_id = 'blog-media' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete from blog-media"
ON storage.objects FOR DELETE
USING (bucket_id = 'blog-media' AND auth.role() = 'authenticated');

-- 6. Site Content key-value store (CMS for static pages)
-- (Originalmente PK simples em key. Em 2026 virou PK composta (key, locale)
--  para suportar i18n EN + PT-BR. Migration ALTER abaixo.)
CREATE TABLE public.site_content (
    key    text not null,
    locale text not null default 'en',
    value  text not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    primary key (key, locale)
);
CREATE INDEX site_content_locale_idx ON public.site_content (locale);

-- Migration para tabelas existentes (se a tabela já foi criada com PK simples):
-- ALTER TABLE public.site_content DROP CONSTRAINT site_content_pkey;
-- ALTER TABLE public.site_content ADD COLUMN IF NOT EXISTS locale text NOT NULL DEFAULT 'en';
-- ALTER TABLE public.site_content ADD CONSTRAINT site_content_pkey PRIMARY KEY (key, locale);
-- CREATE INDEX IF NOT EXISTS site_content_locale_idx ON public.site_content (locale);

ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read site_content"
  ON public.site_content FOR SELECT USING (true);

CREATE POLICY "Authenticated insert site_content"
  ON public.site_content FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated update site_content"
  ON public.site_content FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated delete site_content"
  ON public.site_content FOR DELETE USING (auth.role() = 'authenticated');

-- 7. Storage bucket for site-wide media (separate from blog-media)
INSERT INTO storage.buckets (id, name, public)
VALUES ('site-media', 'site-media', true);

CREATE POLICY "Public read site-media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'site-media');

CREATE POLICY "Authenticated insert site-media"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'site-media' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated update site-media"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'site-media' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated delete site-media"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'site-media' AND auth.role() = 'authenticated');

-- 8. Create Admin User (admin@smithandadams.com)
-- Requires pgcrypto extension (enabled by default in Supabase).
--
-- SECURITY: never hard-code the password here. This repo is public, and any
-- literal committed to it is exposed in git history for good. Set the password
-- at run time via a psql variable and pass it out of band:
--   psql "$SUPABASE_DB_URL" -v admin_pw="<the password>" -f schema.sql
-- The earlier edition of this file shipped a real password in cleartext; it has
-- been rotated in Supabase and removed here. If you are seeding a fresh project,
-- create the admin through the Supabase Auth dashboard instead of this block.
DO $$
DECLARE
    new_user_id uuid := gen_random_uuid();
    encrypted_pw text;
BEGIN
    encrypted_pw := crypt(:'admin_pw', gen_salt('bf'));

    INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
        '00000000-0000-0000-0000-000000000000', new_user_id, 'authenticated', 'authenticated', 'admin@smithandadams.com', encrypted_pw, now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''
    );

    INSERT INTO auth.identities (
        id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    ) VALUES (
        gen_random_uuid(), new_user_id, format('{"sub":"%s","email":"%s"}', new_user_id::text, 'admin@smithandadams.com')::jsonb, 'email', 'admin@smithandadams.com', now(), now(), now()
    );
END $$;

-- AI content agent (local Mac pipeline in ~/Code/sa-content-agent).
-- The agent writes drafts here with the service role; Studio (authenticated)
-- reviews, edits, approves and publishes them into public.posts.

create table if not exists public.ai_runs (
  id uuid primary key default gen_random_uuid(),
  kind text not null,                      -- 'articles' | 'newsletter'
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running',  -- running | ok | error
  stats jsonb not null default '{}'::jsonb,
  log text
);

create table if not exists public.ai_articles (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  run_id uuid references public.ai_runs(id) on delete set null,
  status text not null default 'draft'
    check (status in ('draft','approved','rejected','published')),
  topic text not null,
  angle text,
  keyword text,
  score numeric,
  why text,                                -- why the agent picked this topic now
  title text,
  slug text,
  excerpt text,
  meta_description text,
  content text,                            -- EN html
  category text,
  read_time text,
  translations jsonb not null default '{}'::jsonb,   -- {pt:{title,excerpt,content,meta_description}}
  faq jsonb not null default '[]'::jsonb,
  sources jsonb not null default '[]'::jsonb,        -- [{title,url,publisher,date}]
  trend_signals jsonb not null default '[]'::jsonb,  -- headlines/trends that triggered it
  to_verify jsonb not null default '[]'::jsonb,      -- claims a human must confirm
  dossier jsonb not null default '{}'::jsonb,        -- extracted facts per source
  model_info jsonb not null default '{}'::jsonb,
  review_notes text,
  published_post_id uuid
);
create index if not exists ai_articles_status_idx on public.ai_articles(status, created_at desc);

create table if not exists public.ai_newsletters (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  run_id uuid references public.ai_runs(id) on delete set null,
  status text not null default 'draft'
    check (status in ('draft','approved','sent','rejected')),
  period_label text,
  subject text,
  preheader text,
  html text,                               -- EN email html
  translations jsonb not null default '{}'::jsonb,   -- {pt:{subject,preheader,html}}
  article_ids uuid[] not null default '{}',
  trends jsonb not null default '[]'::jsonb,
  sources jsonb not null default '[]'::jsonb,
  review_notes text,
  sent_at timestamptz
);

alter table public.ai_runs enable row level security;
alter table public.ai_articles enable row level security;
alter table public.ai_newsletters enable row level security;

-- Studio users (any authenticated backoffice login) can read and edit.
-- No anon access: drafts are never public.
drop policy if exists "studio all ai_runs" on public.ai_runs;
create policy "studio all ai_runs" on public.ai_runs
  for all to authenticated using (true) with check (true);
drop policy if exists "studio all ai_articles" on public.ai_articles;
create policy "studio all ai_articles" on public.ai_articles
  for all to authenticated using (true) with check (true);
drop policy if exists "studio all ai_newsletters" on public.ai_newsletters;
create policy "studio all ai_newsletters" on public.ai_newsletters
  for all to authenticated using (true) with check (true);

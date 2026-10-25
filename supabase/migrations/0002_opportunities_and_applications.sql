-- Zyphnaro — Phase 2 migration: opportunities, saved items, applications,
-- notifications, and source connections.
--
-- Design notes (read before running):
--
-- 1. `opportunities` is a SHARED table — every signed-in user reads the same
--    pool of listings. `saved_opportunities`, `applications`,
--    `notifications`, and `source_connections` are all PRIVATE per user via
--    Row Level Security.
--
-- 2. Match score is intentionally NOT a column here. It depends on who's
--    looking (their skills, seniority, location preference), so it's
--    computed live in SupabaseOpportunityRepository using the existing pure
--    match-engine (src/lib/engines/match-engine.ts) against the current
--    user's profile. This means match% updates automatically if a user
--    edits their skills — no stale cached score.
--
-- 3. Trust score IS a column — trust is a property of the listing/company
--    itself, not of the viewer, so it's computed once (by the trust-engine,
--    or manually for seeded data) and stored.
--
-- 4. `cv_fit` and `ai_analysis` are stored as static JSONB for now. These
--    become genuinely personalized once the real AI integration
--    (/docs/ai-integration.md) is wired up — that's a later phase, not this
--    one. Treat their content as illustrative/templated until then.
--
-- 5. This is a pragmatic v1: company/author/salary are JSONB blobs rather
--    than fully normalized tables, to keep this migration shippable. See
--    /docs/database-schema.md for the fully-normalized target shape if you
--    want to split these out later — nothing here blocks that migration.

create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  external_id text not null,
  title text not null,
  description text not null,
  company jsonb not null default '{}'::jsonb,
  author jsonb,
  location text,
  work_type text not null check (work_type in ('remote', 'hybrid', 'onsite')),
  employment_type text not null check (employment_type in ('full-time', 'part-time', 'contract', 'freelance', 'internship')),
  seniority text not null default 'junior' check (seniority in ('intern', 'junior', 'mid', 'senior', 'lead')),
  salary jsonb,
  skills text[] not null default '{}',
  posted_at timestamptz not null default now(),
  detected_at timestamptz not null default now(),
  original_url text not null,
  trust jsonb not null default '{"score": 70, "level": "potential-concern", "signals": [], "concerns": []}'::jsonb,
  cv_fit jsonb not null default '{}'::jsonb,
  ai_analysis jsonb not null default '{}'::jsonb,
  status text not null default 'new' check (status in ('new', 'saved', 'applied', 'closed')),
  created_at timestamptz not null default now(),
  unique (source, external_id)
);

-- Shared read access: any signed-in user can browse the opportunity pool.
alter table public.opportunities enable row level security;

create policy "Any signed-in user can read opportunities"
  on public.opportunities for select
  to authenticated
  using (true);

-- Writes to `opportunities` happen through the ingestion pipeline (a
-- service-role script or background job), not directly from the client —
-- so no insert/update policy for regular users is defined here on purpose.

create index if not exists opportunities_posted_at_idx on public.opportunities (posted_at desc);
create index if not exists opportunities_skills_idx on public.opportunities using gin (skills);


create table if not exists public.saved_opportunities (
  user_id uuid not null references auth.users (id) on delete cascade,
  opportunity_id uuid not null references public.opportunities (id) on delete cascade,
  saved_at timestamptz not null default now(),
  primary key (user_id, opportunity_id)
);

alter table public.saved_opportunities enable row level security;

create policy "Users manage their own saved opportunities"
  on public.saved_opportunities for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  opportunity_id uuid references public.opportunities (id) on delete set null,
  title text not null,
  company text not null,
  match_score int,
  stage text not null default 'saved' check (stage in ('saved', 'preparing', 'applied', 'interview', 'offer', 'rejected')),
  saved_at timestamptz not null default now(),
  applied_at timestamptz,
  recruiter text,
  next_action text,
  location text
);

alter table public.applications enable row level security;

create policy "Users manage their own applications"
  on public.applications for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('match', 'concern', 'cv', 'interview', 'application')),
  priority text not null default 'normal' check (priority in ('normal', 'high')),
  title text not null,
  body text not null,
  opportunity_id uuid references public.opportunities (id) on delete set null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

create policy "Users manage their own notifications"
  on public.notifications for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Enables Supabase Realtime subscriptions on this table (see
-- /docs/backend-integration.md, "Realtime" section, for a later phase).
alter publication supabase_realtime add table public.notifications;


create table if not exists public.source_connections (
  user_id uuid not null references auth.users (id) on delete cascade,
  source_id text not null,
  status text not null default 'available' check (status in ('connected', 'available', 'active', 'limited', 'planned')),
  opportunities_discovered int not null default 0,
  last_sync timestamptz,
  primary key (user_id, source_id)
);

alter table public.source_connections enable row level security;

create policy "Users manage their own source connections"
  on public.source_connections for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

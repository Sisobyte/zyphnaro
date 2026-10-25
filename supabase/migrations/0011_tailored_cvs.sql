-- Zyphnaro — persists AI-generated tailored CVs.
--
-- LiveCVTailor (on the opportunity detail page) already calls Gemini/mock
-- for real and shows a genuine result — it just had nowhere to save it, so
-- the result vanished on refresh, and /tailored-cvs was a fully separate,
-- disconnected mock page. This table is what "Save" now writes to.
--
-- Denormalized the same way `applications` already is (title/company/score
-- stored directly on the row, not joined from `opportunities` on every
-- read) — consistent with the pattern the rest of this schema uses, and it
-- means a tailored CV still displays correctly even if the source listing
-- is later removed (opportunity_id -> set null, see the FK below).

create table if not exists public.tailored_cvs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  opportunity_id uuid references public.opportunities (id) on delete set null,

  opportunity_title text not null,
  company text not null,

  -- The user's real match score for the opportunity at the time of tailoring
  -- (from the match engine, not invented) and a second real AI call scoring
  -- the CV again with the tailored highlights folded in — a genuine
  -- before/after, not a fabricated "improvement".
  original_score int not null,
  tailored_score int not null,

  highlighted_skills text[] not null default '{}',
  recommended_changes text[] not null default '{}',
  project_recommendations text[] not null default '{}',
  summary text not null default '',

  created_at timestamptz not null default now()
);

alter table public.tailored_cvs enable row level security;

create policy "Users manage their own tailored CVs"
  on public.tailored_cvs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists tailored_cvs_user_id_idx on public.tailored_cvs (user_id, created_at desc);

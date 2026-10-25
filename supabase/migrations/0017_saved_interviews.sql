-- Zyphnaro — saved practice interviews.
--
-- The results page used to offer "Save Results" as a browser print dialog, so
-- nothing was actually kept. This table stores each interview the person chooses
-- to save: the settings, the final result, and every question with their answer
-- and the evaluation, so they can reopen it later from Interview Practice.
--
-- `result` and `turns` are JSON snapshots of what was shown at the time (the
-- shapes InterviewResult and InterviewTurn[] in src/lib/types/interview.ts), so
-- an old interview keeps displaying correctly even if the scoring changes.

create table if not exists public.saved_interviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  mode text not null,
  difficulty text not null,
  role text not null default '',
  readiness int not null,

  result jsonb not null,
  turns jsonb not null default '[]'::jsonb,

  created_at timestamptz not null default now()
);

alter table public.saved_interviews enable row level security;

create policy "Users manage their own saved interviews"
  on public.saved_interviews for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists saved_interviews_user_idx on public.saved_interviews (user_id, created_at desc);

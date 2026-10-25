-- Zyphnaro — initial migration: profiles table + auth wiring.
-- Run this in the Supabase SQL editor (or via `supabase db push` if you use
-- the Supabase CLI) once your project exists.
--
-- This is Phase 1 of /docs/backend-integration.md — just enough schema for
-- real authentication + a profile record per user. Later phases add
-- opportunities, applications, notifications, etc. (see /docs/database-schema.md).

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text,
  headline text,
  avatar_url text,
  primary_role text default 'Frontend Developer',
  seniority text default 'junior' check (seniority in ('intern', 'junior', 'mid', 'senior', 'lead')),
  years_experience int default 0,
  location text,
  preferred_locations text[] default '{}',
  remote_preference text default 'remote-first' check (remote_preference in ('remote-only', 'remote-first', 'hybrid', 'onsite')),
  employment_types text[] default '{}',
  skills text[] default '{}',
  salary_min int,
  salary_max int,
  salary_currency text default 'USD',
  salary_period text default 'month',
  portfolio_url text,
  github_url text,
  linkedin_url text,
  availability text,
  cv_score int default 0,
  cv_file_name text,
  cv_uploaded_at timestamptz,
  plan text default 'free' check (plan in ('free', 'pro', 'career-agent')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Automatically create a `profiles` row whenever a new user signs up,
-- pulling the display name out of the signup metadata Zyphnaro sends
-- (see options.data.name in src/app/signup/page.tsx).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, new.raw_user_meta_data ->> 'name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Keep updated_at current on every profile edit.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();





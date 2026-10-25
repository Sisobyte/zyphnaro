-- Onboarding flag
alter table public.profiles
  add column if not exists onboarding_completed boolean not null default false;

-- New signups shouldn't be labelled with a job title they never chose
alter table public.profiles
  alter column primary_role set default null;

-- add a phone number column to the profiles table, so users can optionally provide it during onboarding
  alter table public.profiles
  add column if not exists phone text;

-- Existing accounts shouldn't be forced through onboarding again.
-- Run this once, now, before real users exist.
update public.profiles set onboarding_completed = true;

-- Make the API pick up the new column immediately
notify pgrst, 'reload schema';
-- Zyphnaro — admin area (Phase 1).
--
-- Adds: admin roles, daily user activity (for "active users"), app-wide
-- settings (kill switches / banner), sync history, announcements, an admin
-- audit log, and a few read-only reporting functions.
--
-- SECURITY MODEL
--   * Every new table has RLS ON and NO policies. That means the browser
--     (anon / authenticated roles) can read and write NOTHING in them. Only the
--     server, using the service-role key after checking the caller's admin role
--     (src/lib/admin/guard.ts), can touch them.
--   * Every new function is SECURITY DEFINER but is revoked from public, anon
--     and authenticated, and granted to service_role only.
--
-- AFTER RUNNING, make yourself the first owner (replace the email):
--
--   insert into public.admin_roles (user_id, role)
--   select id, 'owner' from auth.users where email = 'you@example.com'
--   on conflict (user_id) do update set role = 'owner';
--
-- Safe to run more than once.

-- --- Roles ------------------------------------------------------------------
create table if not exists public.admin_roles (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  role       text not null check (role in ('owner', 'support', 'viewer')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- --- Daily activity ---------------------------------------------------------
create table if not exists public.user_activity (
  user_id   uuid not null references auth.users (id) on delete cascade,
  day       date not null default ((now() at time zone 'utc')::date),
  hits      int  not null default 1,
  last_seen timestamptz not null default now(),
  primary key (user_id, day)
);
create index if not exists user_activity_day_idx on public.user_activity (day);

-- --- App settings (switches the admin can flip) -----------------------------
create table if not exists public.app_settings (
  key        text primary key,
  value      jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (key, value) values
  ('maintenance', '{"enabled": false, "message": ""}'),
  ('signups',     '{"enabled": true}'),
  ('ai',          '{"enabled": true}'),
  ('sync',        '{"paused": false, "pausedSources": []}'),
  ('banner',      '{"enabled": false, "text": "", "level": "info"}')
on conflict (key) do nothing;

-- --- Sync history -----------------------------------------------------------
create table if not exists public.sync_runs (
  id            uuid primary key default gen_random_uuid(),
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  trigger       text not null default 'manual',
  per_source    jsonb not null default '[]'::jsonb,
  total_fetched int not null default 0,
  written       int not null default 0,
  notified      int not null default 0,
  notify_stats  jsonb,
  error         text
);
create index if not exists sync_runs_started_idx on public.sync_runs (started_at desc);

-- --- Announcements ----------------------------------------------------------
create table if not exists public.announcements (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  body             text not null,
  audience         jsonb not null default '{"type": "all"}'::jsonb,
  priority         text not null default 'normal' check (priority in ('normal', 'high')),
  recipients       int not null default 0,
  created_by       uuid references auth.users (id) on delete set null,
  created_by_email text,
  created_at       timestamptz not null default now()
);
create index if not exists announcements_created_idx on public.announcements (created_at desc);

-- --- Audit log --------------------------------------------------------------
create table if not exists public.admin_audit_log (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references auth.users (id) on delete set null,
  actor_email text,
  action      text not null,
  target      text,
  details     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists admin_audit_created_idx on public.admin_audit_log (created_at desc);

-- --- Lock the tables down ---------------------------------------------------
alter table public.admin_roles     enable row level security;
alter table public.user_activity   enable row level security;
alter table public.app_settings    enable row level security;
alter table public.sync_runs       enable row level security;
alter table public.announcements   enable row level security;
alter table public.admin_audit_log enable row level security;

revoke all on public.admin_roles, public.user_activity, public.app_settings,
              public.sync_runs, public.announcements, public.admin_audit_log
  from anon, authenticated;

-- --- Announcements arrive as notifications ----------------------------------
-- Drop whatever check limits notifications.type, then allow 'announcement'.
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.notifications'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%type%'
  loop
    execute format('alter table public.notifications drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.notifications
  add constraint notifications_type_check
  check (type in ('match', 'concern', 'cv', 'interview', 'application', 'announcement'));

-- --- Reporting functions ----------------------------------------------------
create or replace function public.touch_user_activity(p_user uuid)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.user_activity (user_id) values (p_user)
  on conflict (user_id, day)
  do update set hits = public.user_activity.hits + 1, last_seen = now();
$$;

create or replace function public.admin_overview()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'totalUsers',  (select count(*) from auth.users),
    'new1d',       (select count(*) from auth.users where created_at > now() - interval '1 day'),
    'new7d',       (select count(*) from auth.users where created_at > now() - interval '7 days'),
    'new30d',      (select count(*) from auth.users where created_at > now() - interval '30 days'),
    'unconfirmed', (select count(*) from auth.users where email_confirmed_at is null),
    'disabled',    (select count(*) from auth.users where banned_until is not null and banned_until > now()),
    'dau', (select count(distinct user_id) from public.user_activity where day = (now() at time zone 'utc')::date),
    'wau', (select count(distinct user_id) from public.user_activity where day > (now() at time zone 'utc')::date - 7),
    'mau', (select count(distinct user_id) from public.user_activity where day > (now() at time zone 'utc')::date - 30),
    'onboarded',   (select count(*) from public.profiles where onboarding_completed),
    'withCv',      (select count(*) from public.profiles where cv_file_name is not null),
    'plans', (
      select coalesce(jsonb_object_agg(plan, c), '{}'::jsonb)
      from (select coalesce(plan, 'free') as plan, count(*) as c from public.profiles group by 1) p
    ),
    'jobsTotal', (select count(*) from public.opportunities),
    'jobsBySource', (
      select coalesce(jsonb_agg(jsonb_build_object('source', source, 'count', c, 'latest', latest) order by c desc), '[]'::jsonb)
      from (select source, count(*) as c, max(detected_at) as latest from public.opportunities group by source) s
    ),
    'applications',  (select count(*) from public.applications),
    'savedJobs',     (select count(*) from public.saved_opportunities),
    'interviews',    (select count(*) from public.saved_interviews),
    'tailoredCvs',   (select count(*) from public.tailored_cvs),
    'signupsByDay', (
      select coalesce(jsonb_agg(jsonb_build_object('day', d, 'count', c) order by d), '[]'::jsonb)
      from (
        select g::date as d,
               (select count(*) from auth.users u where u.created_at::date = g::date) as c
        from generate_series((now() at time zone 'utc')::date - 29, (now() at time zone 'utc')::date, interval '1 day') g
      ) x
    ),
    'activeByDay', (
      select coalesce(jsonb_agg(jsonb_build_object('day', d, 'count', c) order by d), '[]'::jsonb)
      from (
        select g::date as d,
               (select count(distinct user_id) from public.user_activity a where a.day = g::date) as c
        from generate_series((now() at time zone 'utc')::date - 29, (now() at time zone 'utc')::date, interval '1 day') g
      ) x
    )
  );
$$;

create or replace function public.admin_list_users(
  p_search text default '',
  p_limit  int  default 25,
  p_offset int  default 0,
  p_filter text default 'all'
)
returns table (
  id uuid, email text, name text, plan text, created_at timestamptz,
  last_sign_in_at timestamptz, email_confirmed boolean, banned boolean,
  onboarded boolean, has_cv boolean, last_seen timestamptz,
  saved_count bigint, applications_count bigint, interviews_count bigint,
  admin_role text, total_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with base as (
    select
      u.id,
      u.email::text as email,
      p.name,
      coalesce(p.plan, 'free') as plan,
      u.created_at,
      u.last_sign_in_at,
      (u.email_confirmed_at is not null) as email_confirmed,
      (u.banned_until is not null and u.banned_until > now()) as banned,
      coalesce(p.onboarding_completed, false) as onboarded,
      (p.cv_file_name is not null) as has_cv,
      (select max(a.last_seen) from public.user_activity a where a.user_id = u.id) as last_seen,
      ar.role as admin_role
    from auth.users u
    left join public.profiles p on p.id = u.id
    left join public.admin_roles ar on ar.user_id = u.id
    where p_search = ''
       or u.email ilike '%' || p_search || '%'
       or p.name  ilike '%' || p_search || '%'
  ), filtered as (
    select * from base
    where case p_filter
      when 'disabled'    then banned
      when 'unconfirmed' then not email_confirmed
      when 'inactive'    then (last_seen is null or last_seen < now() - interval '14 days')
      when 'paid'        then plan <> 'free'
      else true
    end
  )
  select
    f.id, f.email, f.name, f.plan, f.created_at, f.last_sign_in_at, f.email_confirmed,
    f.banned, f.onboarded, f.has_cv, f.last_seen,
    (select count(*) from public.saved_opportunities s where s.user_id = f.id),
    (select count(*) from public.applications ap where ap.user_id = f.id),
    (select count(*) from public.saved_interviews si where si.user_id = f.id),
    f.admin_role,
    count(*) over ()
  from filtered f
  order by f.created_at desc
  limit least(greatest(p_limit, 1), 100) offset greatest(p_offset, 0);
$$;

create or replace function public.admin_user_emails(p_ids uuid[])
returns table (id uuid, email text)
language sql
stable
security definer
set search_path = public
as $$
  select u.id, u.email::text from auth.users u where u.id = any (p_ids);
$$;

create or replace function public.admin_find_user_by_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select u.id from auth.users u where lower(u.email) = lower(p_email) limit 1;
$$;

-- Ends every session for a user (their refresh tokens go with them).
create or replace function public.admin_revoke_sessions(p_user uuid)
returns void
language sql
security definer
set search_path = public
as $$
  delete from auth.sessions where user_id = p_user;
$$;

revoke all on function public.touch_user_activity(uuid)                    from public, anon, authenticated;
revoke all on function public.admin_overview()                             from public, anon, authenticated;
revoke all on function public.admin_list_users(text, int, int, text)       from public, anon, authenticated;
revoke all on function public.admin_user_emails(uuid[])                    from public, anon, authenticated;
revoke all on function public.admin_find_user_by_email(text)               from public, anon, authenticated;
revoke all on function public.admin_revoke_sessions(uuid)                  from public, anon, authenticated;

grant execute on function public.touch_user_activity(uuid)                 to service_role;
grant execute on function public.admin_overview()                          to service_role;
grant execute on function public.admin_list_users(text, int, int, text)    to service_role;
grant execute on function public.admin_user_emails(uuid[])                 to service_role;
grant execute on function public.admin_find_user_by_email(text)            to service_role;
grant execute on function public.admin_revoke_sessions(uuid)               to service_role;

notify pgrst, 'reload schema';

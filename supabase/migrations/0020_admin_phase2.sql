-- Zyphnaro — admin area (Phase 2): AI usage, error health, feedback, trends.
-- Run AFTER 0019_admin.sql. Safe to run more than once.
--
-- Same security model as 0019: RLS on, no policies (browser can't touch these
-- tables), functions callable by service_role only.

-- --- AI usage ---------------------------------------------------------------
create table if not exists public.ai_usage (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users (id) on delete set null,
  feature       text not null,
  model         text,
  input_tokens  int not null default 0,
  output_tokens int not null default 0,
  duration_ms   int,
  ok            boolean not null default true,
  error         text,
  created_at    timestamptz not null default now()
);
create index if not exists ai_usage_created_idx on public.ai_usage (created_at desc);
create index if not exists ai_usage_user_idx on public.ai_usage (user_id, created_at desc);

-- --- Errors -----------------------------------------------------------------
create table if not exists public.app_errors (
  id         uuid primary key default gen_random_uuid(),
  source     text not null check (source in ('server', 'client', 'ai', 'sync')),
  route      text,
  message    text not null,
  user_id    uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists app_errors_created_idx on public.app_errors (created_at desc);

-- --- Feedback ---------------------------------------------------------------
create table if not exists public.feedback (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users (id) on delete set null,
  email      text,
  category   text not null default 'other' check (category in ('bug', 'idea', 'praise', 'other')),
  message    text not null,
  page       text,
  status     text not null default 'new' check (status in ('new', 'read', 'resolved')),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists feedback_status_idx on public.feedback (status, created_at desc);

alter table public.ai_usage   enable row level security;
alter table public.app_errors enable row level security;
alter table public.feedback   enable row level security;
revoke all on public.ai_usage, public.app_errors, public.feedback from anon, authenticated;

-- --- Reporting functions ----------------------------------------------------
create or replace function public.admin_ai_usage(p_days int default 30)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with u as (
    select * from public.ai_usage where created_at > now() - make_interval(days => least(greatest(p_days, 1), 365))
  )
  select jsonb_build_object(
    'calls',        (select count(*) from u),
    'failed',       (select count(*) from u where not ok),
    'inputTokens',  (select coalesce(sum(input_tokens), 0) from u),
    'outputTokens', (select coalesce(sum(output_tokens), 0) from u),
    'users',        (select count(distinct user_id) from u),
    'byFeature', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'feature', feature, 'calls', c, 'failed', f, 'inputTokens', i, 'outputTokens', o, 'avgMs', ms) order by c desc), '[]'::jsonb)
      from (select feature, count(*) c, count(*) filter (where not ok) f,
                   coalesce(sum(input_tokens),0) i, coalesce(sum(output_tokens),0) o,
                   coalesce(round(avg(duration_ms)),0) ms
            from u group by feature) x
    ),
    'byDay', (
      select coalesce(jsonb_agg(jsonb_build_object('day', d, 'calls', c, 'tokens', t) order by d), '[]'::jsonb)
      from (select created_at::date d, count(*) c, coalesce(sum(input_tokens + output_tokens),0) t from u group by 1) x
    ),
    'topUsers', (
      select coalesce(jsonb_agg(jsonb_build_object('userId', user_id, 'calls', c, 'tokens', t) order by c desc), '[]'::jsonb)
      from (select user_id, count(*) c, coalesce(sum(input_tokens + output_tokens),0) t
            from u where user_id is not null group by user_id order by count(*) desc limit 10) x
    )
  );
$$;

create or replace function public.admin_health(p_days int default 7)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with e as (
    select * from public.app_errors where created_at > now() - make_interval(days => least(greatest(p_days, 1), 90))
  )
  select jsonb_build_object(
    'total',   (select count(*) from e),
    'last24h', (select count(*) from public.app_errors where created_at > now() - interval '1 day'),
    'bySource', (
      select coalesce(jsonb_object_agg(source, c), '{}'::jsonb) from (select source, count(*) c from e group by source) x
    ),
    'byDay', (
      select coalesce(jsonb_agg(jsonb_build_object('day', d, 'count', c) order by d), '[]'::jsonb)
      from (select created_at::date d, count(*) c from e group by 1) x
    ),
    'top', (
      select coalesce(jsonb_agg(jsonb_build_object('source', source, 'route', route, 'message', message, 'count', c, 'last', last) order by c desc), '[]'::jsonb)
      from (select source, route, left(message, 200) message, count(*) c, max(created_at) last
            from e group by source, route, left(message, 200) order by count(*) desc limit 15) x
    ),
    'recent', (
      select coalesce(jsonb_agg(jsonb_build_object('id', id, 'source', source, 'route', route, 'message', left(message, 300), 'at', created_at) order by created_at desc), '[]'::jsonb)
      from (select * from public.app_errors order by created_at desc limit 25) r
    )
  );
$$;

-- Aggregates only: nothing here identifies a person.
create or replace function public.admin_trends()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'topRoles', (
      select coalesce(jsonb_agg(jsonb_build_object('name', primary_role, 'count', c) order by c desc), '[]'::jsonb)
      from (select primary_role, count(*) c from public.profiles
            where primary_role is not null and primary_role <> '' group by 1 order by 2 desc limit 10) x
    ),
    'seniority', (
      select coalesce(jsonb_agg(jsonb_build_object('name', seniority, 'count', c) order by c desc), '[]'::jsonb)
      from (select seniority, count(*) c from public.profiles where seniority is not null group by 1) x
    ),
    'topSkills', (
      select coalesce(jsonb_agg(jsonb_build_object('name', s, 'count', c) order by c desc), '[]'::jsonb)
      from (select s, count(*) c from public.profiles, unnest(skills) s group by s order by count(*) desc limit 15) x
    ),
    'mostSaved', (
      select coalesce(jsonb_agg(jsonb_build_object('title', title, 'count', c) order by c desc), '[]'::jsonb)
      from (select o.title, count(*) c from public.saved_opportunities so
            join public.opportunities o on o.id = so.opportunity_id
            group by o.id, o.title order by count(*) desc limit 10) x
    ),
    'pipeline', (
      select coalesce(jsonb_agg(jsonb_build_object('name', stage, 'count', c)), '[]'::jsonb)
      from (select stage, count(*) c from public.applications group by stage) x
    ),
    -- Of people who signed up in each of the last 8 weeks, how many came back
    -- on any later day.
    'retention', (
      select coalesce(jsonb_agg(jsonb_build_object('week', wk, 'signups', n, 'returned', r) order by wk), '[]'::jsonb)
      from (
        select date_trunc('week', u.created_at)::date wk, count(*) n,
               count(*) filter (where exists (
                 select 1 from public.user_activity a
                 where a.user_id = u.id and a.day > u.created_at::date)) r
        from auth.users u
        where u.created_at > now() - interval '8 weeks'
        group by 1
      ) x
    )
  );
$$;

revoke all on function public.admin_ai_usage(int) from public, anon, authenticated;
revoke all on function public.admin_health(int)   from public, anon, authenticated;
revoke all on function public.admin_trends()      from public, anon, authenticated;
grant execute on function public.admin_ai_usage(int) to service_role;
grant execute on function public.admin_health(int)   to service_role;
grant execute on function public.admin_trends()      to service_role;

notify pgrst, 'reload schema';

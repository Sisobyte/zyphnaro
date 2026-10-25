-- Zyphnaro — server-side ranking + search for opportunities.
--
-- WHY THIS EXISTS
-- Before this, the browser downloaded up to 1,000 listings and scored them
-- itself. That was slow, and it meant ranking only covered the most recent
-- 1,000 of (now) 3,500+ rows, so a strong match could be silently left out.
--
-- This function scores EVERY listing inside Postgres against the caller's
-- profile, applies the page's search + filter + sort, and returns only the
-- top N rows (plus the total number that matched). The browser then receives
-- a few hundred rows instead of thousands, no matter how big the table grows.
--
-- IMPORTANT — the scoring below mirrors src/lib/engines/match-engine.ts
-- (computeOpportunityMatch): skills 45%, seniority 25%, role 20%, location 10%.
-- The app still runs the TypeScript engine on the returned rows to build the
-- full breakdown shown on cards, so the two must stay in step. If you change
-- the weights or rules in one place, change the other.
--
-- SECURITY: `security invoker` (the default) means Row Level Security is
-- enforced as the calling user — same access as a plain select on
-- `opportunities`. Nothing here bypasses RLS.

-- Safe numeric cast for values pulled out of JSONB (trust score, salary max).
-- Returns 0 instead of raising an error if a value isn't a plain number, so
-- one malformed row can never break the whole query.
create or replace function public.safe_numeric(v text)
returns numeric
language sql
immutable
as $$
  select case when v ~ '^-?[0-9]+(\.[0-9]+)?$' then v::numeric else 0 end
$$;

create or replace function public.rank_opportunities(
  p_skills       text[]  default '{}',      -- candidate skills, LOWERCASED
  p_role_words   text[]  default '{}',      -- words of the candidate's primary role, LOWERCASED
  p_seniority    text    default 'mid',
  p_remote_pref  text    default 'hybrid',  -- remote-only | remote-first | hybrid | onsite
  p_locations    text[]  default '{}',      -- preferred locations, LOWERCASED
  p_query        text    default '',        -- free-text search (title / company / skills)
  p_filter       text    default 'all',     -- all | remote | full-time | freelance | internship | junior | senior | high-match | fresh | high-trust
  p_sort         text    default 'best-match', -- best-match | newest | highest-trust | highest-salary
  p_limit        integer default 300
)
returns table (
  id              uuid,
  source          text,
  external_id     text,
  title           text,
  company         jsonb,
  author          jsonb,
  location        text,
  work_type       text,
  employment_type text,
  seniority       text,
  salary          jsonb,
  skills          text[],
  posted_at       timestamptz,
  detected_at     timestamptz,
  original_url    text,
  trust           jsonb,
  cv_fit          jsonb,
  status          text,
  score           integer,   -- overall match score, same formula as the TS engine
  total_count     bigint     -- rows matching search + filter BEFORE the limit
)
language sql
stable
security invoker
set search_path = public
as $$
  with a as (
    -- Layer 1: skills + seniority + role-word hits per listing.
    select
      o.id, o.source, o.external_id, o.title, o.company, o.author, o.location,
      o.work_type, o.employment_type, o.seniority, o.salary, o.skills,
      o.posted_at, o.detected_at, o.original_url, o.trust, o.cv_fit, o.status,
      (case
         when cardinality(o.skills) = 0 then 40  -- no skills extracted = no evidence of fit (see match-engine.ts)
         else round(
           100.0
           * (select count(*) from unnest(o.skills) sk where lower(sk) = any (p_skills))
           / cardinality(o.skills)
         )
       end)::int as skills_score,
      greatest(
        20,
        100 - abs(
          coalesce(array_position(array['intern','junior','mid','senior','lead'], o.seniority), 3)
          - coalesce(array_position(array['intern','junior','mid','senior','lead'], p_seniority), 3)
        ) * 20
      )::int as exp_score,
      (select count(*) from unnest(p_role_words) w where position(w in lower(o.title)) > 0)::int as role_hits
    from public.opportunities o
  ),
  b as (
    -- Layer 2: role fit + location fit, then the weighted overall score.
    select
      a.*,
      (case
         when cardinality(p_role_words) = 0 then a.skills_score
         else round(a.role_hits::numeric / cardinality(p_role_words) * 60 + a.skills_score * 0.4)
       end)::int as role_score,
      (case
         when a.work_type = 'remote' and p_remote_pref <> 'onsite' then 100
         when p_remote_pref = 'remote-only' and a.work_type <> 'remote' then 30
         when coalesce(a.location, '') <> ''
              and exists (select 1 from unnest(p_locations) l where position(l in lower(a.location)) > 0) then 90
         else 60
       end)::int as loc_score
    from a
  ),
  c as (
    select
      b.*,
      round(b.skills_score * 0.45 + b.exp_score * 0.25 + b.role_score * 0.2 + b.loc_score * 0.1)::int as overall,
      -- Escape LIKE wildcards so a search for "100%" or "c_" is taken literally.
      replace(replace(replace(trim(p_query), '\', '\\'), '%', '\%'), '_', '\_') as q
    from b
  ),
  f as (
    -- Layer 3: search + filter (applied to ALL rows, not just the top N).
    select c.*, count(*) over () as total
    from c
    where
      (trim(p_query) = ''
        or c.title ilike '%' || c.q || '%'
        or (c.company ->> 'name') ilike '%' || c.q || '%'
        or exists (select 1 from unnest(c.skills) sk where sk ilike '%' || c.q || '%'))
      and (case p_filter
             when 'remote'      then c.work_type = 'remote'
             when 'full-time'   then c.employment_type = 'full-time'
             when 'freelance'   then c.employment_type in ('freelance', 'contract')
             when 'internship'  then c.employment_type = 'internship'
             when 'junior'      then c.seniority in ('junior', 'intern')
             when 'senior'      then c.seniority in ('senior', 'lead')
             when 'high-match'  then c.overall >= 85
             when 'fresh'       then c.posted_at > now() - interval '24 hours'
             when 'high-trust'  then public.safe_numeric(c.trust ->> 'score') >= 85
             else true
           end)
  )
  select
    f.id, f.source, f.external_id, f.title, f.company, f.author, f.location,
    f.work_type, f.employment_type, f.seniority, f.salary, f.skills,
    f.posted_at, f.detected_at, f.original_url, f.trust, f.cv_fit, f.status,
    f.overall as score,
    f.total as total_count
  from f
  order by
    case when p_sort = 'newest'         then extract(epoch from f.posted_at) end desc nulls last,
    case when p_sort = 'highest-trust'  then public.safe_numeric(f.trust ->> 'score') end desc nulls last,
    case when p_sort = 'highest-salary' then public.safe_numeric(f.salary ->> 'max') end desc nulls last,
    case when p_sort not in ('newest', 'highest-trust', 'highest-salary') then f.overall end desc nulls last,
    f.posted_at desc
  limit greatest(p_limit, 1)
$$;

revoke all on function public.rank_opportunities(text[], text[], text, text, text[], text, text, text, integer) from public;
grant execute on function public.rank_opportunities(text[], text[], text, text, text[], text, text, text, integer) to authenticated;
grant execute on function public.safe_numeric(text) to authenticated;

-- Zyphnaro — match scoring v2.
--
-- Why: a Germany-only, German-language student job scored 75% for a Nigeria-based
-- virtual assistant, because every "remote" listing got full location credit and a
-- listing with a short keyword list could score near-perfect on skills.
--
-- Changes (all mirrored in src/lib/engines/match-engine.ts, keep the two in step):
--   1. Skills score is smoothed: (matched + 0.8) / (required + 2). No detected skills = 40.
--   2. Region check: a listing restricted to a region the candidate isn't in (e.g.
--      "Germany" for a Nigeria-based candidate) gets location score 30 and its overall
--      score is capped at 55, so it can't reach Matches (70%+). Open listings
--      (empty, "Worldwide", "Anywhere", "Remote") are unaffected. If the candidate's
--      location is unknown (no p_locations) no region check is applied.
--   3. p_locations now carries the profile location plus preferred locations plus
--      wider-region aliases (e.g. Africa, EMEA); the app builds it.
--
-- Same signatures as 0014, so `create or replace` is enough. Run AFTER 0014.

create or replace function public.rank_opportunities(
  p_skills       text[]  default '{}',      -- candidate skills, LOWERCASED
  p_role_words   text[]  default '{}',      -- words of the candidate's primary role, LOWERCASED
  p_seniority    text    default 'mid',
  p_remote_pref  text    default 'hybrid',  -- remote-only | remote-first | hybrid | onsite
  p_locations    text[]  default '{}',      -- preferred locations, LOWERCASED
  p_query        text    default '',        -- free-text search (title / company / skills)
  p_filter       text    default 'all',     -- all | remote | full-time | freelance | internship | junior | senior | high-match | fresh | high-trust
  p_sort         text    default 'best-match', -- best-match | newest | highest-trust | highest-salary
  p_limit        integer default 300,
  p_excluded_sources text[] default '{}'   -- sources the user has disconnected (hidden from every result)
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
      -- Smoothed overlap: (matched + 0.8) / (required + 2). Few detected skills are weak
      -- evidence, and none at all gives 40. Mirrors computeMatch() in match-engine.ts.
      round(
        100.0
        * ((select count(*) from unnest(o.skills) sk where lower(sk) = any (p_skills)) + 0.8)
        / (cardinality(o.skills) + 2)
      )::int as skills_score,
      greatest(
        20,
        100 - abs(
          coalesce(array_position(array['intern','junior','mid','senior','lead'], o.seniority), 3)
          - coalesce(array_position(array['intern','junior','mid','senior','lead'], p_seniority), 3)
        ) * 20
      )::int as exp_score,
      (select count(*) from unnest(p_role_words) w where position(w in lower(o.title)) > 0)::int as role_hits,
      -- Region check (mirrors isOpenLocation() in src/lib/engines/region.ts): "open" listings
      -- don't restrict who can apply; "loc_match" means the location names a place the
      -- candidate is in (p_locations = profile location + preferred locations + region aliases).
      (coalesce(btrim(o.location), '') = ''
        or lower(btrim(o.location)) ~ '^(remote|worldwide|anywhere|global|international|anywhere in the world)$'
        or lower(o.location) ~ '(worldwide|anywhere|global)') as loc_open,
      (coalesce(o.location, '') <> ''
        and exists (select 1 from unnest(p_locations) l where position(l in lower(o.location)) > 0)) as loc_match
    from public.opportunities o
    where not (o.source = any (p_excluded_sources))
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
         when cardinality(p_locations) = 0 then            -- candidate location unknown: no region check
           (case
              when a.work_type = 'remote' and p_remote_pref <> 'onsite' then 100
              when p_remote_pref = 'remote-only' and a.work_type <> 'remote' then 30
              else 60
            end)
         when p_remote_pref = 'remote-only' and a.work_type <> 'remote' and not a.loc_match then 30
         when a.loc_match then (case when a.work_type = 'remote' and p_remote_pref <> 'onsite' then 100 else 90 end)
         when a.loc_open  then (case when a.work_type = 'remote' and p_remote_pref <> 'onsite' then 100 else 60 end)
         else 30                                           -- restricted to a region the candidate isn't in
       end)::int as loc_score
    from a
  ),
  c as (
    select
      b.*,
      least(
        round(b.skills_score * 0.45 + b.exp_score * 0.25 + b.role_score * 0.2 + b.loc_score * 0.1),
        case when b.loc_score <= 30 then 55 else 100 end   -- region-restricted listings are capped (REGION_CAP)
      )::int as overall,
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

create or replace function public.match_score_distribution(
  p_skills      text[] default '{}',
  p_role_words  text[] default '{}',
  p_seniority   text   default 'mid',
  p_remote_pref text   default 'hybrid',
  p_locations   text[] default '{}',
  p_excluded_sources text[] default '{}'
)
returns table (range text, count bigint)
language sql
stable
security invoker
set search_path = public
as $$
  with a as (
    select
      -- Smoothed overlap: (matched + 0.8) / (required + 2). Few detected skills are weak
      -- evidence, and none at all gives 40. Mirrors computeMatch() in match-engine.ts.
      round(
        100.0
        * ((select count(*) from unnest(o.skills) sk where lower(sk) = any (p_skills)) + 0.8)
        / (cardinality(o.skills) + 2)
      )::int as skills_score,
      greatest(
        20,
        100 - abs(
          coalesce(array_position(array['intern','junior','mid','senior','lead'], o.seniority), 3)
          - coalesce(array_position(array['intern','junior','mid','senior','lead'], p_seniority), 3)
        ) * 20
      )::int as exp_score,
      (select count(*) from unnest(p_role_words) w where position(w in lower(o.title)) > 0)::int as role_hits,
      -- Region check (mirrors isOpenLocation() in src/lib/engines/region.ts): "open" listings
      -- don't restrict who can apply; "loc_match" means the location names a place the
      -- candidate is in (p_locations = profile location + preferred locations + region aliases).
      (coalesce(btrim(o.location), '') = ''
        or lower(btrim(o.location)) ~ '^(remote|worldwide|anywhere|global|international|anywhere in the world)$'
        or lower(o.location) ~ '(worldwide|anywhere|global)') as loc_open,
      (coalesce(o.location, '') <> ''
        and exists (select 1 from unnest(p_locations) l where position(l in lower(o.location)) > 0)) as loc_match,
      o.work_type, o.location
    from public.opportunities o
    where not (o.source = any (p_excluded_sources))
  ),
  b as (
    select
      a.*,
      (case
         when cardinality(p_role_words) = 0 then a.skills_score
         else round(a.role_hits::numeric / cardinality(p_role_words) * 60 + a.skills_score * 0.4)
       end)::int as role_score,
      (case
         when cardinality(p_locations) = 0 then            -- candidate location unknown: no region check
           (case
              when a.work_type = 'remote' and p_remote_pref <> 'onsite' then 100
              when p_remote_pref = 'remote-only' and a.work_type <> 'remote' then 30
              else 60
            end)
         when p_remote_pref = 'remote-only' and a.work_type <> 'remote' and not a.loc_match then 30
         when a.loc_match then (case when a.work_type = 'remote' and p_remote_pref <> 'onsite' then 100 else 90 end)
         when a.loc_open  then (case when a.work_type = 'remote' and p_remote_pref <> 'onsite' then 100 else 60 end)
         else 30                                           -- restricted to a region the candidate isn't in
       end)::int as loc_score
    from a
  ),
  scored as (
    select least(
        round(b.skills_score * 0.45 + b.exp_score * 0.25 + b.role_score * 0.2 + b.loc_score * 0.1),
        case when b.loc_score <= 30 then 55 else 100 end   -- region-restricted listings are capped (REGION_CAP)
      )::int as overall
    from b
  ),
  bucketed as (
    select
      (case
         when overall >= 90 then '90-100%'
         when overall >= 75 then '75-89%'
         when overall >= 60 then '60-74%'
         when overall >= 40 then '40-59%'
         else 'Below 40%'
       end) as range,
      -- Sort order for the bars; not returned, just used below.
      (case
         when overall >= 90 then 1
         when overall >= 75 then 2
         when overall >= 60 then 3
         when overall >= 40 then 4
         else 5
       end) as sort_order
    from scored
  )
  select range, count(*) as count
  from bucketed
  group by range, sort_order
  order by sort_order
$$;


revoke all on function public.rank_opportunities(text[], text[], text, text, text[], text, text, text, integer, text[]) from public;

grant execute on function public.rank_opportunities(text[], text[], text, text, text[], text, text, text, integer, text[]) to authenticated;
grant execute on function public.match_score_distribution(text[], text[], text, text, text[], text[]) to authenticated;

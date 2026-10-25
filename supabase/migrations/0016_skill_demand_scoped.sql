-- Zyphnaro — skill demand that respects the source switch and the user's field.
--
-- Before: skill_demand() counted every skill in every listing. Two problems:
--   * it ignored sources the user had switched off (migration 0014), and
--   * it was the same list for everyone, so a virtual assistant was told to
--     learn Python and Go because those appear in many engineering listings.
--
-- Now:
--   p_excluded_sources  sources the user disconnected (hidden, as everywhere else)
--   p_role_stems        lowercase word stems of the user's role (see roleStems() in
--                       src/lib/engines/role-terms.ts). When given, only listings whose
--                       TITLE contains at least one stem are counted. Empty = all listings.
--
-- Run AFTER 0010 and 0014. The old no-argument version is dropped.

drop function if exists public.skill_demand();

create or replace function public.skill_demand(
  p_excluded_sources text[] default '{}',
  p_role_stems       text[] default '{}'
)
returns table (skill text, demand_count bigint)
language sql
stable
security invoker
set search_path = public
as $$
  with scoped as (
    select o.skills
    from public.opportunities o
    where not (o.source = any (p_excluded_sources))
      and (
        cardinality(p_role_stems) = 0
        or exists (select 1 from unnest(p_role_stems) w where position(w in lower(o.title)) > 0)
      )
  ),
  counts as (
    select s as skill, lower(s) as skill_key, count(*) as demand_count
    from scoped, unnest(scoped.skills) as s
    group by s
  ),
  ranked as (
    -- Merge different spellings ("Node.js" / "node.js") by lowercased key, keeping
    -- the most common exact spelling as the label.
    select
      skill, skill_key, demand_count,
      sum(demand_count) over (partition by skill_key) as total_count,
      row_number() over (partition by skill_key order by demand_count desc, skill) as rn
    from counts
  )
  select skill, total_count as demand_count
  from ranked
  where rn = 1
  order by total_count desc
$$;

grant execute on function public.skill_demand(text[], text[]) to authenticated;

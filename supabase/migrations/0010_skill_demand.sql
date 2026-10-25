-- Zyphnaro — real, ranking-independent skill demand for the Skill Gaps page.
--
-- WHY THIS EXISTS
-- The Skill Gaps page was already computing gaps from real data
-- (useOpportunities() + the real user profile) — it was never mock. But
-- migration 0009 changed useOpportunities() to return the user's top-ranked
-- (best-match) opportunities instead of the most recent ones. Best-match
-- ranking weighs skill overlap heavily, so a listing that DOESN'T share the
-- user's skills is now less likely to be in that top slice at all — which
-- quietly undercounts exactly the gaps this page exists to surface. A gap
-- is, by definition, a skill the user's own ranking penalizes.
--
-- This function counts skill demand across EVERY listing in the database,
-- independent of any one user's ranking, so the page reflects the real
-- market rather than a self-reinforcing slice of it.

create or replace function public.skill_demand()
returns table (skill text, demand_count bigint)
language sql
stable
security invoker
set search_path = public
as $$
  with counts as (
    -- One row per (exact skill spelling) with how often it appears.
    select s as skill, lower(s) as skill_key, count(*) as demand_count
    from public.opportunities, unnest(skills) as s
    group by s
  ),
  ranked as (
    -- Different postings can spell a skill differently ("Node.js" vs
    -- "node.js"); merge those by lowercased key, but keep whichever exact
    -- spelling is most common so the UI shows a real, natural label rather
    -- than a forced lowercase/uppercase version nobody actually wrote.
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

grant execute on function public.skill_demand() to authenticated;

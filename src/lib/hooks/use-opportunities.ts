"use client";

import { useCurrentUser } from "@/lib/hooks/use-user";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { opportunityRepository, applicationRepository, DEFAULT_OPPORTUNITY_LIMIT } from "@/lib/repositories";
import type { Opportunity, OpportunitySearchParams, OpportunitySearchResult } from "@/lib/types";

// Every opportunity list lives under the ["opportunities", ...] key prefix, so
// one invalidateQueries({ queryKey: ["opportunities"] }) (used by the realtime
// banner) refreshes all of them, and the optimistic Save update below can patch
// all of them at once.

// The user's top-ranked opportunities across ALL listings (best match first).
export function useOpportunities(limit: number = DEFAULT_OPPORTUNITY_LIMIT) {
  return useQuery({
    queryKey: ["opportunities", "top", limit],
    queryFn: () => opportunityRepository.getOpportunities(limit),
  });
}

// Search + filter + sort, executed in the database over ALL listings.
export function useOpportunitySearch(params: OpportunitySearchParams) {
  return useQuery({
    queryKey: ["opportunities", "search", params.query, params.filter, params.sort, params.limit],
    queryFn: () => opportunityRepository.searchOpportunities(params),
    // Keep showing the previous results while a new search/filter loads, so
    // the list doesn't flash to skeletons on every keystroke or filter click.
    placeholderData: keepPreviousData,
  });
}

// Cheap counts (no rows) for headers and dashboard tiles.
export function useOpportunityStats() {
  return useQuery({
    queryKey: ["opportunity-stats"],
    queryFn: () => opportunityRepository.getStats(),
    staleTime: 60_000,
  });
}

// Skill demand across EVERY listing, independent of any one user's match
// ranking — used by the Skill Gaps page. See migration 0010's comment for
// why this has to be separate from the ranked opportunity list.
export function useSkillDemand(scope: "all" | "field" = "all") {
  const { data: user } = useCurrentUser();
  return useQuery({
    // The role is part of the key so changing it on the profile refreshes the "field" list.
    queryKey: ["skill-demand", scope, scope === "field" ? user?.primaryRole ?? "" : ""],
    queryFn: () => opportunityRepository.getSkillDemand(scope),
    staleTime: 60_000,
    enabled: scope === "all" || !!user,
  });
}

// The user's real match-score distribution across EVERY listing, and the
// most commonly posted exact job titles market-wide — see migration 0012.
export function useMatchDistribution() {
  return useQuery({
    queryKey: ["match-distribution"],
    queryFn: () => opportunityRepository.getMatchDistribution(),
    staleTime: 60_000,
  });
}

export function useTopTitles(limit = 6) {
  return useQuery({
    queryKey: ["top-titles", limit],
    queryFn: () => opportunityRepository.getTopTitles(limit),
    staleTime: 60_000,
  });
}

// Real count (score >= 80), independent of any loaded slice — see migration
// 0012. Used by both the Dashboard and Analytics "Strong Matches" tiles.
export function useStrongMatchCount() {
  return useQuery({
    queryKey: ["strong-match-count"],
    queryFn: () => opportunityRepository.getStrongMatchCount(),
    staleTime: 60_000,
  });
}

export function useOpportunity(id: string) {
  return useQuery({
    queryKey: ["opportunity", id],
    queryFn: () => opportunityRepository.getOpportunityById(id),
    enabled: Boolean(id),
  });
}

// The cached lists are either a plain array (top matches) or a
// { items, total } object (search results). Patches the saved flag in either.
type CachedList = Opportunity[] | OpportunitySearchResult | undefined;
function withSaved(data: CachedList, id: string, saved: boolean): CachedList {
  const patch = (list: Opportunity[]) => list.map((o) => (o.id === id ? { ...o, saved } : o));
  if (!data) return data;
  if (Array.isArray(data)) return patch(data);
  return { ...data, items: patch(data.items) };
}

export function useSaveOpportunity() {
  const client = useQueryClient();
  return useMutation({
    // Takes the full opportunity (not just its id) because saving also
    // creates a real row on the Applications board, which needs the title,
    // company, match score, and location.
    mutationFn: async ({ opportunity, save }: { opportunity: Opportunity; save: boolean }) => {
      // The bookmark and the Applications-board row are independent writes,
      // so run them together instead of one after the other.
      if (save) {
        await Promise.all([
          opportunityRepository.saveOpportunity(opportunity.id),
          applicationRepository.createSavedApplication({
            opportunityId: opportunity.id,
            title: opportunity.title,
            company: opportunity.company.name,
            matchScore: opportunity.match.overall,
            location: opportunity.location,
          }),
        ]);
      } else {
        await Promise.all([
          opportunityRepository.unsaveOpportunity(opportunity.id),
          applicationRepository.deleteSavedApplication(opportunity.id),
        ]);
      }
    },

    // Optimistic update: flip the bookmark in EVERY cached list immediately so
    // the button responds on click, instead of waiting for the network round
    // trip(s) and a refetch. Rolled back below if the save fails.
    onMutate: async ({ opportunity, save }) => {
      await client.cancelQueries({ queryKey: ["opportunities"] });
      await client.cancelQueries({ queryKey: ["opportunity", opportunity.id] });

      const previousLists = client.getQueriesData<CachedList>({ queryKey: ["opportunities"] });
      const previousOne = client.getQueryData<Opportunity | null>(["opportunity", opportunity.id]);

      client.setQueriesData<CachedList>({ queryKey: ["opportunities"] }, (old) => withSaved(old, opportunity.id, save));
      client.setQueryData<Opportunity | null>(["opportunity", opportunity.id], (old) =>
        old ? { ...old, saved: save } : old
      );

      return { previousLists, previousOne };
    },

    onError: (_error, { opportunity }, context) => {
      context?.previousLists.forEach(([key, data]) => client.setQueryData(key, data));
      client.setQueryData(["opportunity", opportunity.id], context?.previousOne);
    },

    // Only the Applications board needs a refetch — the opportunity caches
    // were already updated optimistically and are correct on success.
    onSettled: () => {
      client.invalidateQueries({ queryKey: ["applications"] });
    },
  });
}

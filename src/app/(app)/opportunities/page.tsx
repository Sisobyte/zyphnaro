"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { OpportunityCard } from "@/components/opportunities/opportunity-card";
import { OpportunityFilters, type FilterKey, type SortKey } from "@/components/opportunities/opportunity-filters";
import { useOpportunitySearch, useOpportunityStats, useSaveOpportunity } from "@/lib/hooks/use-opportunities";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { useRealtimeNewOpportunities } from "@/lib/hooks/use-realtime-new-opportunities";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Radar, Sparkles } from "lucide-react";

export default function OpportunitiesPage() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl border border-z-border bg-white" />}>
      <OpportunitiesPageWithParams />
    </Suspense>
  );
}

function OpportunitiesPageWithParams() {
  const searchParams = useSearchParams();
  // Remounting on a `key` change resets local state (search) from the URL
  // whenever the global top-bar search sends a new ?q= while already on
  // this page — cleaner than syncing via an effect, since useState's
  // initializer just runs fresh on every mount.
  const q = searchParams.get("q") ?? "";
  return <OpportunitiesPageInner key={q} initialQuery={q} />;
}

// How many results each "page" shows, and the most we'll ever load at once.
// Ranking, search and filtering all run in the database over EVERY listing;
// these only limit how many rows are sent to the browser.
const PAGE_SIZE = 300;
const MAX_LIMIT = 1500;

function OpportunitiesPageInner({ initialQuery }: { initialQuery: string }) {
  const client = useQueryClient();
  const saveMutation = useSaveOpportunity();
  const { newCount, dismiss } = useRealtimeNewOpportunities();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState(initialQuery);
  const [sort, setSort] = useState<SortKey>("best-match");
  const [limit, setLimit] = useState(PAGE_SIZE);

  // One database query per pause in typing, not one per keystroke.
  const debouncedSearch = useDebouncedValue(search, 300);
  const { data, isLoading, isFetching } = useOpportunitySearch({ query: debouncedSearch, filter, sort, limit });
  const { data: stats } = useOpportunityStats();

  const filtered = data?.items ?? [];
  const total = data?.total ?? 0;

  // Changing the search, filter or sort starts again from the top of the results.
  const changeFilter = (key: FilterKey) => {
    setFilter(key);
    setLimit(PAGE_SIZE);
  };
  const changeSearch = (value: string) => {
    setSearch(value);
    setLimit(PAGE_SIZE);
  };
  const changeSort = (value: SortKey) => {
    setSort(value);
    setLimit(PAGE_SIZE);
  };

  const refreshForNewOpportunities = () => {
    dismiss();
    client.invalidateQueries({ queryKey: ["opportunities"] });
    client.invalidateQueries({ queryKey: ["opportunity-stats"] });
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-z-ink sm:text-2xl">Discover Opportunities</h1>
        <p className="mt-1 text-sm text-z-ink-faint">
          {isLoading
            ? "Loading opportunities…"
            : `${total.toLocaleString()} opportunit${total === 1 ? "y" : "ies"} found · ${(stats?.postedToday ?? 0).toLocaleString()} new today`}
        </p>
      </div>

      <OpportunityFilters
        active={filter}
        onChange={changeFilter}
        search={search}
        onSearchChange={changeSearch}
        sort={sort}
        onSortChange={changeSort}
      />

      {newCount > 0 && (
        <Card className="flex items-center justify-between gap-3 border-z-brand-50 bg-z-brand-50/50 p-3.5">
          <span className="inline-flex items-center gap-2 text-sm text-z-ink">
            <Sparkles className="h-4 w-4 text-z-brand" />
            {newCount} new opportunit{newCount === 1 ? "y" : "ies"} just came in
          </span>
          <Button size="sm" onClick={refreshForNewOpportunities}>
            Refresh
          </Button>
        </Card>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl bg-white border border-z-border" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-12 text-center">
          <Radar className="h-8 w-8 text-z-ink-faint" />
          <p className="text-sm font-medium text-z-ink">No opportunities match these filters.</p>
          <p className="text-sm text-z-ink-faint">Try widening your filters or search for a different skill.</p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((o) => (
              <OpportunityCard key={o.id} opportunity={o} onSave={() => saveMutation.mutate({ opportunity: o, save: !o.saved })} />
            ))}
          </div>

          {total > filtered.length && (
            <div className="flex flex-col items-center gap-2 pt-2">
              <p className="text-xs text-z-ink-faint">
                Showing {filtered.length.toLocaleString()} of {total.toLocaleString()}
                {limit >= MAX_LIMIT ? " — narrow it down with search or a filter to see the rest." : "."}
              </p>
              {limit < MAX_LIMIT && (
                <Button variant="secondary" size="sm" disabled={isFetching} onClick={() => setLimit((l) => Math.min(l + PAGE_SIZE, MAX_LIMIT))}>
                  {isFetching ? "Loading…" : "Show more"}
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

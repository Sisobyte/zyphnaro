"use client";

import { Star } from "lucide-react";
import { OpportunityCard } from "@/components/opportunities/opportunity-card";
import { Card } from "@/components/ui/card";
import { useOpportunities, useSaveOpportunity } from "@/lib/hooks/use-opportunities";

// A listing counts as a "match" from this score upwards.
const MATCH_THRESHOLD = 70;
// The database ranks EVERY listing by match score and returns the best ones
// first, so asking for the top 500 is enough to capture all 70%+ matches
// unless there are more than 500 of them (the page says so if that happens).
const MATCHES_LIMIT = 500;

export default function MatchesPage() {
  const { data: opportunities = [], isLoading } = useOpportunities(MATCHES_LIMIT);
  const saveMutation = useSaveOpportunity();

  const matches = opportunities
    .filter((o) => o.match.overall >= MATCH_THRESHOLD)
    .sort((a, b) => b.match.overall - a.match.overall);
  const mayBeMore = matches.length >= MATCHES_LIMIT;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="inline-flex items-center gap-2 text-xl font-semibold text-z-ink sm:text-2xl">
          <Star className="h-5 w-5 text-z-warning" /> My Matches
        </h1>
        <p className="mt-1 text-sm text-z-ink-faint">
          {isLoading
            ? "Finding your best matches…"
            : `${matches.length}${mayBeMore ? "+" : ""} opportunit${matches.length === 1 ? "y" : "ies"} scoring ${MATCH_THRESHOLD}% or higher against your profile${mayBeMore ? ` (showing your top ${MATCHES_LIMIT})` : ""}.`}
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl border border-z-border bg-white" />
          ))}
        </div>
      ) : matches.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-sm font-medium text-z-ink">No strong matches yet.</p>
          <p className="mt-1 text-sm text-z-ink-faint">
            Connect a source or update your career preferences to start discovering opportunities.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {matches.map((o) => (
            <OpportunityCard key={o.id} opportunity={o} onSave={() => saveMutation.mutate({ opportunity: o, save: !o.saved })} />
          ))}
        </div>
      )}
    </div>
  );
}

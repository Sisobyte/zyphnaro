"use client";

import Link from "next/link";
import { Sparkles, Radar, Star, Flame, Briefcase, ShieldAlert, ArrowRight, Hand } from "lucide-react";
import { MetricCard } from "@/components/shared/metric-card";
import { ActNowCard } from "@/components/opportunities/act-now-card";
import { OpportunityCard } from "@/components/opportunities/opportunity-card";
import { Card } from "@/components/ui/card";
import { CircularScore } from "@/components/ui/circular-score";
import { buttonVariants } from "@/components/ui/button";
import { useOpportunities, useOpportunityStats, useStrongMatchCount, useSaveOpportunity } from "@/lib/hooks/use-opportunities";
import { useCurrentUser } from "@/lib/hooks/use-user";
import { useApplications } from "@/lib/hooks/use-applications";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  // Top-ranked opportunities (best match first) for the cards and match counts…
  const { data: opportunities = [] } = useOpportunities();
  // …and cheap database-side counts for the totals, so headline numbers cover
  // EVERY listing rather than just the top slice loaded above.
  const { data: stats } = useOpportunityStats();
  const { data: user } = useCurrentUser();
  const { data: applications = [] } = useApplications();
  // Real database-wide count (score >= 80), not an approximation from the
  // loaded top-300 slice above — see migration 0012.
  const { data: strongMatches = 0 } = useStrongMatchCount();
  const saveMutation = useSaveOpportunity();

  const sorted = [...opportunities].sort((a, b) => b.match.overall - a.match.overall);
  const actNow = sorted
    .filter((o) => o.match.overall >= 85 && o.trust.score >= 80)
    .slice(0, 3);
  const topOpportunities = sorted.slice(0, 3);

  const totalOpportunities = stats?.total ?? opportunities.length;
  const newSinceYesterday = stats?.detectedLast48h ?? 0;
  const awaitingResponse = applications.filter((a) => a.stage === "applied").length;
  const flaggedForReview = stats?.flagged ?? 0;

  const firstName = user?.name.split(" ")[0] ?? "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3.5">
        {/* Same tinted tile as the metric cards below, with a soft glow. */}
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-z-brand-50 text-z-brand-600 shadow-[0_0_0_4px_rgba(61,90,254,0.08),0_6px_22px_rgba(61,90,254,0.35)]"
          aria-hidden="true"
        >
          <Hand className="z-wave h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-z-ink sm:text-2xl">
            {greeting}, {firstName}
          </h1>
          <p className="mt-0.5 text-sm text-z-ink-faint">Here&apos;s what&apos;s happening with your career search.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <MetricCard label="New Opportunities" value={totalOpportunities.toLocaleString()} icon={Radar} tone="brand" hint={`${newSinceYesterday} since yesterday`} />
        <MetricCard label="Strong Matches" value={strongMatches} icon={Star} tone="success" hint="80%+ match score" />
        <MetricCard label="Act Now" value={actNow.length} icon={Flame} tone="warning" hint="Posted within the hour" />
        <MetricCard label="Applications" value={applications.length} icon={Briefcase} tone="teal" hint={`${awaitingResponse} awaiting response`} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-z-ink">
                <Flame className="h-4 w-4 text-z-warning" /> Act Now
              </h2>
              <Link href="/opportunities" className="inline-flex items-center gap-1 text-xs font-medium text-z-brand hover:underline">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {actNow.length === 0 ? (
              <Card className="p-6 text-center text-sm text-z-ink-faint">
                Nothing urgent right now — check back soon or update your preferences to widen the radar.
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {actNow.map((o) => (
                  <ActNowCard key={o.id} opportunity={o} />
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-z-ink">Top Opportunities for You</h2>
              <Link href="/opportunities" className="inline-flex items-center gap-1 text-xs font-medium text-z-brand hover:underline">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {topOpportunities.map((o) => (
                <OpportunityCard key={o.id} opportunity={o} onSave={() => saveMutation.mutate({ opportunity: o, save: !o.saved })} />
              ))}
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-4">
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[15px] font-semibold text-z-ink">Your CV</h3>
              <Sparkles className="h-4 w-4 text-z-brand" />
            </div>
            <div className="flex items-center gap-4">
              {user?.cvScore == null ? (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-z-border text-center text-[10px] leading-tight text-z-ink-faint">
                  Not
                  <br />
                  analyzed
                </div>
              ) : (
                <CircularScore value={user.cvScore} label="score" />
              )}
              <p className="text-sm text-z-ink-soft">
                {user?.cvScore == null
                  ? "Run a CV analysis to see your real score here."
                  : "Good. Your CV is ready for 3 of the new opportunities we found."}
              </p>
            </div>
            <Link href="/cv-analyzer" className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "mt-4 w-full")}>
              View CV Analysis
            </Link>
          </Card>

          <Card className="p-5">
            <div className="mb-3 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-z-teal" />
              <h3 className="text-[15px] font-semibold text-z-ink">Safety</h3>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-z-ink-soft">Verified opportunities</span>
              <span className="font-semibold text-z-success">{(totalOpportunities - flaggedForReview).toLocaleString()}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-z-ink-soft">Flagged for review</span>
              <span className="font-semibold text-z-warning">{flaggedForReview}</span>
            </div>
            <Link href="/opportunities?filter=high-trust" className="mt-4 block text-xs font-medium text-z-brand hover:underline">
              Review flagged opportunities →
            </Link>
          </Card>

          <Card className="p-5">
            <h3 className="mb-3 text-[15px] font-semibold text-z-ink">Applications</h3>
            <div className="flex items-center justify-between text-sm">
              <span className="text-z-ink-soft">Awaiting responses</span>
              <span className="font-semibold text-z-ink">{awaitingResponse}</span>
            </div>
            <Link href="/applications" className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "mt-4 w-full")}>
              Open board
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}

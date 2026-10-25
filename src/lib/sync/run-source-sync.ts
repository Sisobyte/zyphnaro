// Shared sync logic — used by both the manual script
// (scripts/sync-sources.ts) and the scheduled Vercel Cron route
// (src/app/api/cron/sync-sources/route.ts), so there's exactly one place
// that knows how to fetch + normalize + upsert real listings.

import type { NotifyStats } from "./notify-matches";
import { assessJob } from "@/lib/assessment/job-assessment";
import { createClient } from "@supabase/supabase-js";
import { AdzunaSource } from "@/lib/services/sources/adzuna-source";
import { GreenhouseSource } from "@/lib/services/sources/greenhouse-source";
import { LeverSource } from "@/lib/services/sources/lever-source";
import { JoobleSources } from "@/lib/services/sources/jooble-source";
import { MyJobMagSources } from "@/lib/services/sources/myjobmag-source";
import { RemotiveSource } from "@/lib/services/sources/remotive-source";
import { RemoteOkSource } from "@/lib/services/sources/remoteok-source";
import { HimalayasSource } from "@/lib/services/sources/himalayas-source";
import { HackerNewsSource } from "@/lib/services/sources/hackernews-source";
import type { JobSource } from "@/lib/services/sources/job-source";
import type { NormalizedOpportunityInput } from "@/lib/services/sources/types";
import { notifyMatchesForOpportunities } from "./notify-matches";

// JoobleSources and MyJobMagSources each expand to one JobSource per
// configured country (see jooble-regions.ts / myjobmag-feeds.ts) — adding
// another African market there automatically adds it here too, with no
// change needed in this file.
const sources: JobSource[] = [
  AdzunaSource,
  GreenhouseSource,
  LeverSource,
  ...JoobleSources,
  ...MyJobMagSources,
  // Remote-job feeds. Remotive and Himalayas ask not to have their jobs shown on
  // third-party job sites — see the TERMS notes at the top of each adapter and
  // remove the entry here if you don't get their OK.
  RemotiveSource,
  RemoteOkSource,
  HimalayasSource,
  HackerNewsSource,
];

// How many rows go to Postgres per request. Sending all ~3,500 listings in a
// single upsert runs past Supabase's statement timeout, so they are written
// in smaller groups instead. If a batch of 200 still times out, lower this
// to 100.
const BATCH_SIZE = 200;

function toRow(o: NormalizedOpportunityInput) {
  return {
    source: o.source,
    external_id: o.externalId,
    title: o.title,
    description: o.description,
    company: o.company,
    author: o.author ?? null,
    location: o.location ?? null,
    work_type: o.workType,
    employment_type: o.employmentType,
    seniority: o.seniority,
    salary: o.salary ?? null,
    skills: o.skills,
    posted_at: o.postedAt,
    detected_at: o.detectedAt,
    original_url: o.originalUrl,
    trust: o.trust,
    // Normalized reading of the listing (responsibilities, essential vs preferred
    // skills, junior-label review flag, unverified requirements), computed once
    // here. Stored in the existing JSON column: no schema change.
    ai_analysis: { jobAssessment: assessJob({ title: o.title, description: o.description, skills: o.skills, seniority: o.seniority }) },
  };
}

export interface SourceSyncResult {
  perSource: { name: string; fetched: number; error?: string }[];
  totalFetched: number;
  written: number;
  notified: number;
  /** Why alerts were or weren't sent. Only set when the sync wrote to the database. */
  notifyStats?: NotifyStats;
  skippedWrite: boolean;
}

export async function runSourceSync(options: { dryRun?: boolean } = {}): Promise<SourceSyncResult> {
  const perSource: SourceSyncResult["perSource"] = [];
  const allRows: ReturnType<typeof toRow>[] = [];

  for (const source of sources) {
    try {
      const raw = await source.fetchOpportunities();
      const normalized = raw.map((r) => source.normalizeOpportunity(r));
      perSource.push({ name: source.name, fetched: normalized.length });
      allRows.push(...normalized.map(toRow));
    } catch (e) {
      // Node's fetch() wraps connection-level failures (DNS, TLS, network
      // block) as a generic "fetch failed" with the real cause nested one
      // level deeper in `.cause` — surface it, or "fetch failed" alone is
      // nearly undiagnosable.
      let message = e instanceof Error ? e.message : String(e);
      if (e instanceof Error && e.cause) {
        const cause = e.cause as { message?: string; code?: string };
        const causeText = `${cause.code ?? ""} ${cause.message ?? String(e.cause)}`.trim();
        message += ` (cause: ${causeText})`;
      }
      perSource.push({ name: source.name, fetched: 0, error: message });
    }
  }

  if (options.dryRun || allRows.length === 0) {
    return { perSource, totalFetched: allRows.length, written: 0, notified: 0, skippedWrite: true };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return { perSource, totalFetched: allRows.length, written: 0, notified: 0, skippedWrite: true };
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // The same job can show up twice in one run, and Postgres rejects an
  // upsert that touches the same conflict key twice, so keep one row per
  // (source, external_id).
  const uniqueRows = Array.from(
    new Map(allRows.map((r) => [`${r.source}:${r.external_id}`, r])).values()
  );

  // Write in batches so no single request runs past the statement timeout.
  // Upserts are idempotent: if a run fails partway, the batches already
  // written stay saved and re-running just updates them and carries on.
  const runStartedAt = new Date(Date.now() - 5_000).toISOString();
  const writtenIds: string[] = [];
  for (let i = 0; i < uniqueRows.length; i += BATCH_SIZE) {
    const chunk = uniqueRows.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase
      .from("opportunities")
      .upsert(chunk, { onConflict: "source,external_id" })
      .select("id");

    if (error) {
      throw new Error(`Supabase upsert failed (rows ${i}-${i + chunk.length}): ${error.message}`);
    }

    writtenIds.push(...(data ?? []).map((r) => r.id as string));
    console.log(`[sync] upserted ${writtenIds.length}/${uniqueRows.length}`);
  }

  // Phase 7, Part B: check the synced opportunities against every user's
  // real profile and create notification rows for strong matches. Wrapped
  // so a failure here never rolls back or blocks the sync itself — worst
  // case, this run's matches get caught on the next sync instead.
  let notified = 0;
  let notifyStats: NotifyStats | undefined;
  try {
    // Only jobs inserted by THIS run are "newly posted". Re-seen jobs (upserted
    // again) are not, so people aren't alerted about old listings every day.
    const newIds: string[] = [];
    for (let from = 0; ; from += 1000) {
      const { data: fresh, error: freshError } = await supabase
        .from("opportunities")
        .select("id")
        .gte("created_at", runStartedAt)
        .order("id")
        .range(from, from + 999);
      if (freshError) throw new Error(`Failed to find new opportunities: ${freshError.message}`);
      newIds.push(...(fresh ?? []).map((r) => r.id as string));
      if (!fresh || fresh.length < 1000) break;
    }
    const result = await notifyMatchesForOpportunities(supabase, newIds);
    notified = result.notified;
    notifyStats = result;
  } catch (e) {
    console.error("[sync] notifyMatchesForOpportunities failed:", e instanceof Error ? e.message : e);
  }

  return { perSource, totalFetched: allRows.length, written: writtenIds.length, notified, notifyStats, skippedWrite: false };
}
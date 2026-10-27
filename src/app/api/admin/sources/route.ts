import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSettings } from "@/lib/admin/settings";
import { SOURCE_NAMES } from "@/lib/sync/run-source-sync";

// Source health: per-source job counts, last sync outcome, and recent runs.
export async function GET() {
  const g = await requireAdmin("view");
  if (!g.ok) return g.response;
  const admin = createAdminClient();
  const [settings, runs, overview] = await Promise.all([
    getSettings({ fresh: true }),
    admin.from("sync_runs").select("*").order("started_at", { ascending: false }).limit(20),
    admin.rpc("admin_overview"),
  ]);
  if (runs.error) return NextResponse.json({ error: "Couldn't load sync history. Have you run migration 0019?" }, { status: 500 });

  const counts = new Map<string, { count: number; latest: string | null }>();
  for (const s of ((overview.data as { jobsBySource?: { source: string; count: number; latest: string | null }[] } | null)?.jobsBySource ?? [])) {
    counts.set(s.source, { count: s.count, latest: s.latest });
  }
  const lastRun = runs.data?.[0] as { per_source?: { name: string; fetched: number; error?: string }[] } | undefined;

  return NextResponse.json({
    syncPaused: settings.sync.paused,
    sources: SOURCE_NAMES.map((name) => {
      const last = lastRun?.per_source?.find((p) => p.name === name);
      return {
        name,
        paused: settings.sync.pausedSources.includes(name),
        // Stored job rows use a lowercase source key, which may differ from the display name.
        jobs: counts.get(name)?.count ?? counts.get(name.toLowerCase())?.count ?? null,
        lastFetched: last?.fetched ?? null,
        lastError: last?.error ?? null,
      };
    }),
    jobsBySource: (overview.data as { jobsBySource?: unknown } | null)?.jobsBySource ?? [],
    runs: runs.data ?? [],
  });
}

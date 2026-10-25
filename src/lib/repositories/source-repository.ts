import type { JobSourceInfo } from "@/lib/types";
import { mockSources } from "@/lib/mock/sources";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";
import { SOURCE_CATALOG } from "@/lib/sources/catalog";

export interface SourceRepository {
  getSources(): Promise<JobSourceInfo[]>;
  toggleConnection(id: string): Promise<void>;
  // Names of sources the user has switched off ("available" = disconnected).
  // Their opportunities are hidden from this user's lists, matches and stats.
  getExcludedSourceNames(): Promise<string[]>;
}

const state = new Map<string, JobSourceInfo>(mockSources.map((s) => [s.id, { ...s }]));

// BACKEND INTEGRATION:
// Mock implementation — used automatically whenever Supabase isn't
// configured (see the export at the bottom of this file).
export class MockSourceRepository implements SourceRepository {
  async getSources(): Promise<JobSourceInfo[]> {
    await delay();
    return Array.from(state.values());
  }

  async toggleConnection(id: string): Promise<void> {
    await delay();
    const s = state.get(id);
    if (!s) return;
    if (s.status === "available") {
      s.status = "connected";
      s.lastSync = "just now";
    } else if (s.status === "connected") {
      s.status = "available";
      s.lastSync = undefined;
    }
  }

  async getExcludedSourceNames(): Promise<string[]> {
    return Array.from(state.values())
      .filter((s) => s.status === "available")
      .map((s) => s.name);
  }
}

function delay(ms = 150) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type SourceConnectionRow = {
  source_id: string;
  status: JobSourceInfo["status"];
  opportunities_discovered: number;
  last_sync: string | null;
};

// BACKEND INTEGRATION:
// Real implementation. Merges the static SOURCE_CATALOG (app config) with
// each user's own `source_connections` row (their toggle state). A source
// the user has never touched simply has no row yet, so it falls back to
// the catalog's honest default status. See /docs/source-integrations.md
// for what "connecting" a given source actually requires per-provider —
// this repository only persists the toggle; it does not yet perform any
// real OAuth handshake (that's a later, source-by-source piece of work).
export class SupabaseSourceRepository implements SourceRepository {
  // Real per-source numbers, counted straight from the `opportunities` table
  // (shared/global, readable by any signed-in user). The sync script writes
  // listings there but never touched `source_connections.opportunities_discovered`,
  // which is why every card used to say "0 discovered". Counting live means it
  // can never drift out of date. `head: true` returns just the count, no rows.
  private async getDiscoveredStats(): Promise<Map<string, { count: number; latest: string | null }>> {
    const supabase = createClient();
    const entries = await Promise.all(
      SOURCE_CATALOG.map(async (entry) => {
        const { count } = await supabase
          .from("opportunities")
          .select("id", { count: "exact", head: true })
          .eq("source", entry.name);

        let latest: string | null = null;
        if ((count ?? 0) > 0) {
          const { data } = await supabase
            .from("opportunities")
            .select("detected_at")
            .eq("source", entry.name)
            .order("detected_at", { ascending: false })
            .limit(1);
          latest = (data?.[0]?.detected_at as string | undefined) ?? null;
        }
        return [entry.id, { count: count ?? 0, latest }] as const;
      })
    );
    return new Map(entries);
  }

  async getSources(): Promise<JobSourceInfo[]> {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const userId = session?.user?.id ?? null;

    const [rows, stats] = await Promise.all([
      userId
        ? supabase
            .from("source_connections")
            .select("*")
            .eq("user_id", userId)
            .then(({ data }) => (data ?? []) as SourceConnectionRow[])
        : Promise.resolve([] as SourceConnectionRow[]),
      this.getDiscoveredStats(),
    ]);
    const byId = new Map(rows.map((r) => [r.source_id, r]));

    return SOURCE_CATALOG.map((entry) => {
      const row = byId.get(entry.id);
      const stat = stats.get(entry.id);
      const lastSyncIso = row?.last_sync ?? stat?.latest ?? null;
      return {
        id: entry.id,
        name: entry.name,
        description: entry.description,
        requiresAuth: entry.requiresAuth,
        status: row?.status ?? entry.defaultStatus,
        opportunitiesDiscovered: stat?.count ?? 0,
        lastSync: lastSyncIso ? new Date(lastSyncIso).toLocaleString() : undefined,
      };
    });
  }

  async toggleConnection(id: string): Promise<void> {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not signed in");

    const { data: existing } = await supabase
      .from("source_connections")
      .select("status")
      .eq("user_id", user.id)
      .eq("source_id", id)
      .maybeSingle();

    const catalogEntry = SOURCE_CATALOG.find((s) => s.id === id);
    const currentStatus = existing?.status ?? catalogEntry?.defaultStatus ?? "available";
    const nextStatus = currentStatus === "connected" ? "available" : "connected";

    const { error } = await supabase.from("source_connections").upsert({
      user_id: user.id,
      source_id: id,
      status: nextStatus,
      last_sync: nextStatus === "connected" ? new Date().toISOString() : null,
    });
    if (error) throw error;
  }

  // A source the user has disconnected is "available" (see toggleConnection).
  // Per-user filter only: the shared `opportunities` rows are never deleted.
  // Deliberately light: reads only the user's own `source_connections` rows
  // and merges them with catalog defaults — no per-source counting, because
  // this runs before every opportunity query.
  async getExcludedSourceNames(): Promise<string[]> {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const userId = session?.user?.id ?? null;
    if (!userId) return [];

    const { data } = await supabase.from("source_connections").select("source_id, status").eq("user_id", userId);
    const byId = new Map((data ?? []).map((r) => [r.source_id as string, r.status as string]));
    return SOURCE_CATALOG.filter((entry) => (byId.get(entry.id) ?? entry.defaultStatus) === "available").map(
      (entry) => entry.name
    );
  }
}

export const sourceRepository: SourceRepository = isSupabaseConfigured
  ? new SupabaseSourceRepository()
  : new MockSourceRepository();

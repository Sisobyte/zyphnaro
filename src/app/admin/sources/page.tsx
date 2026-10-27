"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Play, Pause } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { adminFetch, formatDateTime } from "@/lib/admin/client";
import { useAdmin } from "@/components/admin/admin-context";
import { PageTitle, ErrorNote, Empty } from "@/components/admin/ui";

type Src = { name: string; paused: boolean; jobs: number | null; lastFetched: number | null; lastError: string | null };
type Run = { id: string; started_at: string; finished_at: string | null; trigger: string; total_fetched: number; written: number; notified: number; error: string | null; per_source: { name: string; fetched: number; error?: string }[] };
type Data = { syncPaused: boolean; sources: Src[]; runs: Run[] };

export default function SourcesPage() {
  const admin = useAdmin();
  const qc = useQueryClient();
  const canEdit = admin.can("sources");
  const { data, error } = useQuery({ queryKey: ["admin", "sources"], queryFn: () => adminFetch<Data>("/api/admin/sources") });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "sources"] });
  const togglePause = useMutation({
    mutationFn: async (name: string) => {
      const current = data?.sources.filter((s) => s.paused).map((s) => s.name) ?? [];
      const next = current.includes(name) ? current.filter((n) => n !== name) : [...current, name];
      return adminFetch("/api/admin/controls", { method: "PUT", body: JSON.stringify({ key: "sync", value: { paused: data?.syncPaused ?? false, pausedSources: next } }) });
    },
    onSuccess: refresh,
  });
  const runNow = useMutation({ mutationFn: () => adminFetch<{ fetched: number; written: number; notified: number }>("/api/admin/sources/sync", { method: "POST" }), onSettled: refresh });

  return (
    <>
      <PageTitle
        title="Sources & sync"
        subtitle="Where jobs come from and whether the last sync worked."
        action={canEdit && <Button disabled={runNow.isPending} onClick={() => runNow.mutate()}><Play className="h-4 w-4" />{runNow.isPending ? "Running… (can take a minute)" : "Run sync now"}</Button>}
      />
      <ErrorNote error={error ?? runNow.error ?? togglePause.error} />
      {runNow.data && <p className="mb-4 rounded-lg bg-z-success-bg px-3 py-2 text-sm text-z-success">Fetched {runNow.data.fetched}, saved {runNow.data.written}, alerts sent {runNow.data.notified}.</p>}
      {data?.syncPaused && <p className="mb-4 rounded-lg bg-z-warning-bg px-3 py-2 text-sm text-z-warning">Scheduled syncing is paused (Controls page).</p>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data?.sources.map((s) => (
          <Card key={s.name} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-z-ink">{s.name}</p>
              {s.paused ? <Badge variant="warning">Paused</Badge> : s.lastError ? <Badge variant="danger">Error</Badge> : <Badge variant="success">OK</Badge>}
            </div>
            <p className="mt-2 text-xs text-z-ink-soft">Jobs stored: <span className="font-medium text-z-ink">{s.jobs ?? "—"}</span></p>
            <p className="text-xs text-z-ink-soft">Last run fetched: <span className="font-medium text-z-ink">{s.lastFetched ?? "—"}</span></p>
            {s.lastError && !s.paused && <p className="mt-1 break-words text-xs text-z-danger">{s.lastError}</p>}
            {canEdit && (
              <Button variant="secondary" size="sm" className="mt-3" disabled={togglePause.isPending} onClick={() => togglePause.mutate(s.name)}>
                {s.paused ? <><Play className="h-3.5 w-3.5" /> Resume</> : <><Pause className="h-3.5 w-3.5" /> Pause</>}
              </Button>
            )}
          </Card>
        ))}
      </div>
      <p className="mt-2 text-xs text-z-ink-faint">Pausing a source stops fetching from it. Jobs already stored stay visible.</p>

      <Card className="mt-6">
        <CardHeader><CardTitle>Recent syncs</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {data?.runs.length === 0 && <Empty>No syncs recorded yet.</Empty>}
          {data?.runs.map((r) => {
            const failed = r.per_source.filter((p) => p.error && p.error !== "Paused by an admin");
            return (
              <div key={r.id} className="rounded-lg border border-z-border p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-z-ink">{formatDateTime(r.started_at)}</span>
                  <span className="flex gap-1.5">
                    <Badge variant="neutral">{r.trigger}</Badge>
                    {r.error ? <Badge variant="danger">Failed</Badge> : failed.length ? <Badge variant="warning">{failed.length} source error{failed.length > 1 ? "s" : ""}</Badge> : <Badge variant="success">OK</Badge>}
                  </span>
                </div>
                <p className="mt-1 text-xs text-z-ink-soft">Fetched {r.total_fetched} · saved {r.written} · alerts {r.notified}</p>
                {r.error && <p className="mt-1 break-words text-xs text-z-danger">{r.error}</p>}
                {failed.map((p) => <p key={p.name} className="mt-1 break-words text-xs text-z-danger">{p.name}: {p.error}</p>)}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </>
  );
}

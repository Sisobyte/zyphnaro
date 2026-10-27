"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { adminFetch, formatDateTime } from "@/lib/admin/client";
import { PageTitle, Stat, ErrorNote, Empty } from "@/components/admin/ui";

type Data = {
  total: number; last24h: number; bySource: Record<string, number>;
  top: { source: string; route: string | null; message: string; count: number; last: string }[];
  recent: { id: string; source: string; route: string | null; message: string; at: string }[];
};
const tone = (s: string) => (s === "server" || s === "client" ? "danger" : s === "ai" ? "violet" : "warning") as "danger" | "violet" | "warning";
const LABEL: Record<string, string> = { server: "Server", client: "Browser crash", ai: "AI", sync: "Job sync" };

export default function HealthPage() {
  const { data, error, isLoading } = useQuery({ queryKey: ["admin", "health"], queryFn: () => adminFetch<Data>("/api/admin/health"), refetchInterval: 60_000 });
  return (
    <>
      <PageTitle title="Health" subtitle="Problems the app has recorded in the last 7 days: AI failures, job-sync failures and page crashes." />
      <ErrorNote error={error} />
      {isLoading && <p className="text-sm text-z-ink-faint">Loading…</p>}
      {data && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Errors (7 days)" value={data.total} />
            <Stat label="Last 24 hours" value={data.last24h} />
            {Object.entries(data.bySource).map(([s, c]) => <Stat key={s} label={LABEL[s] ?? s} value={c} />)}
          </div>

          <Card>
            <CardHeader><CardTitle>Most common problems</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {data.top.length === 0 && <Empty>No errors recorded. Good news, or nothing has been recorded yet.</Empty>}
              {data.top.map((t, i) => (
                <div key={i} className="rounded-lg border border-z-border p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-2"><Badge variant={tone(t.source)}>{LABEL[t.source] ?? t.source}</Badge>{t.route && <span className="text-xs text-z-ink-faint">{t.route}</span>}</span>
                    <span className="text-xs text-z-ink-faint">{t.count}× · last {formatDateTime(t.last)}</span>
                  </div>
                  <p className="mt-1.5 break-words text-xs text-z-ink-soft">{t.message}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Latest</CardTitle></CardHeader>
            <CardContent className="space-y-1.5">
              {data.recent.map((r) => (
                <div key={r.id} className="flex flex-col gap-0.5 border-b border-z-border pb-1.5 text-xs last:border-0 sm:flex-row sm:gap-3">
                  <span className="shrink-0 text-z-ink-faint sm:w-28">{formatDateTime(r.at)}</span>
                  <span className="shrink-0 font-medium text-z-ink sm:w-28">{LABEL[r.source] ?? r.source}</span>
                  <span className="break-words text-z-ink-soft">{r.message}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}

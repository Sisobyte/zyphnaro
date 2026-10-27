"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { adminFetch, formatDate } from "@/lib/admin/client";
import { PageTitle, ErrorNote, Empty } from "@/components/admin/ui";

type Item = { name?: string; title?: string; count: number };
type Data = {
  topRoles: Item[]; seniority: Item[]; topSkills: Item[]; mostSaved: Item[]; pipeline: Item[];
  retention: { week: string; signups: number; returned: number }[];
};

function Bars({ items, empty = "Nothing yet." }: { items: Item[]; empty?: string }) {
  if (!items.length) return <Empty>{empty}</Empty>;
  const max = Math.max(...items.map((i) => i.count), 1);
  return (
    <div className="space-y-2">
      {items.map((i) => {
        const label = i.name ?? i.title ?? "";
        return (
          <div key={label} className="text-sm">
            <div className="flex justify-between gap-3"><span className="truncate text-z-ink-soft capitalize">{label}</span><span className="shrink-0 font-medium tabular-nums text-z-ink">{i.count}</span></div>
            <div className="mt-1 h-1.5 rounded-full bg-z-surface"><div className="h-1.5 rounded-full bg-z-brand" style={{ width: `${(i.count / max) * 100}%` }} /></div>
          </div>
        );
      })}
    </div>
  );
}

export default function TrendsPage() {
  const { data, error, isLoading } = useQuery({ queryKey: ["admin", "trends"], queryFn: () => adminFetch<Data>("/api/admin/trends") });
  return (
    <>
      <PageTitle title="Trends" subtitle="What your users are like and what they do. Totals only, nobody is named." />
      <ErrorNote error={error} />
      {isLoading && <p className="text-sm text-z-ink-faint">Loading…</p>}
      {data && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card><CardHeader><CardTitle>Roles users are targeting</CardTitle></CardHeader><CardContent><Bars items={data.topRoles} /></CardContent></Card>
          <Card><CardHeader><CardTitle>Skills users have</CardTitle></CardHeader><CardContent><Bars items={data.topSkills} /></CardContent></Card>
          <Card><CardHeader><CardTitle>Experience level</CardTitle></CardHeader><CardContent><Bars items={data.seniority} /></CardContent></Card>
          <Card><CardHeader><CardTitle>Applications by stage</CardTitle></CardHeader><CardContent><Bars items={data.pipeline} empty="No applications tracked yet." /></CardContent></Card>
          <Card><CardHeader><CardTitle>Most saved jobs</CardTitle></CardHeader><CardContent><Bars items={data.mostSaved} empty="No saved jobs yet." /></CardContent></Card>
          <Card>
            <CardHeader><CardTitle>Did new users come back?</CardTitle></CardHeader>
            <CardContent>
              {data.retention.length === 0 ? <Empty>No signups in the last 8 weeks.</Empty> : (
                <div className="space-y-2 text-sm">
                  {data.retention.map((r) => (
                    <div key={r.week} className="flex items-center justify-between gap-3">
                      <span className="text-z-ink-soft">Week of {formatDate(r.week)}</span>
                      <span className="font-medium tabular-nums text-z-ink">{r.returned} of {r.signups} came back{r.signups ? ` (${Math.round((r.returned / r.signups) * 100)}%)` : ""}</span>
                    </div>
                  ))}
                  <p className="pt-1 text-xs text-z-ink-faint">&quot;Came back&quot; means opened the app on a later day. Counting starts when activity tracking was switched on, so older weeks look low.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}

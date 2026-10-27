"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { adminFetch, formatDate } from "@/lib/admin/client";
import { PageTitle, Stat, ErrorNote, Empty } from "@/components/admin/ui";

type Data = {
  days: number; aiEnabled: boolean; calls: number; failed: number; inputTokens: number; outputTokens: number; users: number; estimatedCost: number | null;
  byFeature: { feature: string; calls: number; failed: number; inputTokens: number; outputTokens: number; avgMs: number }[];
  byDay: { day: string; calls: number; tokens: number }[];
  topUsers: { userId: string; email: string | null; calls: number; tokens: number }[];
};
const n = (v: number) => v.toLocaleString();

export default function AiUsagePage() {
  const [days, setDays] = useState(30);
  const { data, error, isLoading } = useQuery({ queryKey: ["admin", "ai", days], queryFn: () => adminFetch<Data>(`/api/admin/ai-usage?days=${days}`), placeholderData: (p) => p });

  return (
    <>
      <PageTitle
        title="AI usage"
        subtitle="How often the AI features are used and how many tokens they consume."
        action={<Select value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-36" aria-label="Period"><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option></Select>}
      />
      <ErrorNote error={error} />
      {isLoading && <p className="text-sm text-z-ink-faint">Loading…</p>}
      {data && (
        <div className="space-y-6">
          {!data.aiEnabled && <p className="rounded-lg bg-z-warning-bg px-3 py-2 text-sm text-z-warning">AI features are switched off (Controls page).</p>}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="AI calls" value={n(data.calls)} />
            <Stat label="Failed" value={n(data.failed)} hint={data.calls ? `${Math.round((data.failed / data.calls) * 100)}% of calls` : undefined} />
            <Stat label="Tokens used" value={n(data.inputTokens + data.outputTokens)} hint={`${n(data.inputTokens)} in · ${n(data.outputTokens)} out`} />
            <Stat label="People using AI" value={n(data.users)} />
          </div>
          <Card className="p-4 text-sm text-z-ink-soft">
            <p>
              <span className="font-medium text-z-ink">Estimated cost: </span>
              {data.estimatedCost === null ? (
                <>not set up. Add <code className="rounded bg-z-surface px-1">AI_PRICE_INPUT_PER_M</code> and <code className="rounded bg-z-surface px-1">AI_PRICE_OUTPUT_PER_M</code> (your model&apos;s price in US dollars per million tokens) to your environment variables to see it. Check the prices on your Google AI billing page.</>
              ) : (
                <>about ${data.estimatedCost.toFixed(2)} for this period, worked out from the prices you set. Your Google AI bill is the real figure.</>
              )}
            </p>
          </Card>

          <Card>
            <CardHeader><CardTitle>Calls per day</CardTitle></CardHeader>
            <CardContent>
              {data.byDay.length === 0 ? <Empty>No AI calls recorded yet. They appear once people use AI features with the new version live.</Empty> : (
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.byDay} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                      <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="day" tickFormatter={(d: string) => d.slice(5)} tick={{ fontSize: 11 }} minTickGap={24} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip labelFormatter={(d) => formatDate(String(d))} />
                      <Bar isAnimationActive={false} dataKey="calls" fill="#3d5afe" radius={[3, 3, 0, 0]} name="Calls" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>By feature</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {data.byFeature.map((f) => (
                <div key={f.feature} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-z-border p-3 text-sm">
                  <div>
                    <p className="font-medium text-z-ink">{f.feature}</p>
                    <p className="text-xs text-z-ink-faint">{n(f.inputTokens + f.outputTokens)} tokens · avg {(f.avgMs / 1000).toFixed(1)}s</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {f.failed > 0 && <Badge variant="danger">{f.failed} failed</Badge>}
                    <span className="font-semibold tabular-nums text-z-ink">{n(f.calls)}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Heaviest users</CardTitle></CardHeader>
            <CardContent className="space-y-1.5 text-sm">
              {data.topUsers.length === 0 && <Empty>Nothing yet.</Empty>}
              {data.topUsers.map((u) => (
                <div key={u.userId} className="flex items-center justify-between gap-3">
                  <span className="truncate text-z-ink-soft">{u.email ?? u.userId}</span>
                  <span className="shrink-0 font-medium tabular-nums text-z-ink">{n(u.calls)} calls · {n(u.tokens)} tokens</span>
                </div>
              ))}
              <p className="pt-2 text-xs text-z-ink-faint">Counts only. What people typed or uploaded is never stored here.</p>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}

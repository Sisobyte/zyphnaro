"use client";

import { useQuery } from "@tanstack/react-query";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { adminFetch, formatDate } from "@/lib/admin/client";
import { PageTitle, Stat, ErrorNote } from "@/components/admin/ui";

type Overview = {
  totalUsers: number; new1d: number; new7d: number; new30d: number; unconfirmed: number; disabled: number;
  dau: number; wau: number; mau: number; onboarded: number; withCv: number;
  plans: Record<string, number>;
  jobsTotal: number; jobsBySource: { source: string; count: number; latest: string | null }[];
  applications: number; savedJobs: number; interviews: number; tailoredCvs: number;
  signupsByDay: { day: string; count: number }[]; activeByDay: { day: string; count: number }[];
};

const pct = (n: number, d: number) => (d > 0 ? `${Math.round((n / d) * 100)}%` : "—");

function Trend({ title, data, color }: { title: string; data: { day: string; count: number }[]; color: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <span className="text-xs text-z-ink-faint">Last 30 days</span>
      </CardHeader>
      <CardContent>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" tickFormatter={(d: string) => d.slice(5)} tick={{ fontSize: 11 }} minTickGap={24} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip labelFormatter={(d) => formatDate(String(d))} />
              <Area type="monotone" dataKey="count" stroke={color} fill={color} fillOpacity={0.15} strokeWidth={2} name="Users" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminOverviewPage() {
  const { data, error, isLoading } = useQuery({ queryKey: ["admin", "overview"], queryFn: () => adminFetch<Overview>("/api/admin/overview"), refetchInterval: 60_000 });

  return (
    <>
      <PageTitle title="Overview" subtitle="How the product is doing right now." />
      <ErrorNote error={error} />
      {isLoading && <p className="text-sm text-z-ink-faint">Loading…</p>}
      {data && (
        <div className="space-y-6">
          <section>
            <h2 className="mb-2 text-sm font-semibold text-z-ink">People</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat label="Total users" value={data.totalUsers} />
              <Stat label="New today" value={data.new1d} />
              <Stat label="New (7 days)" value={data.new7d} />
              <Stat label="New (30 days)" value={data.new30d} />
              <Stat label="Active today" value={data.dau} hint="DAU" />
              <Stat label="Active (7 days)" value={data.wau} hint="WAU" />
              <Stat label="Active (30 days)" value={data.mau} hint="MAU" />
              <Stat label="Disabled / unconfirmed" value={`${data.disabled} / ${data.unconfirmed}`} />
            </div>
            <p className="mt-2 text-xs text-z-ink-faint">
              &quot;Active&quot; means opened the app that day. It starts counting from when this was switched on, so early numbers are low.
            </p>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <Trend title="New signups" data={data.signupsByDay} color="#3d5afe" />
            <Trend title="Active users" data={data.activeByDay} color="#0f8f8a" />
          </div>

          <section className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Onboarding & setup</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="Finished onboarding" value={`${data.onboarded} (${pct(data.onboarded, data.totalUsers)})`} />
                <Row label="Uploaded a CV" value={`${data.withCv} (${pct(data.withCv, data.totalUsers)})`} />
                <Row label="Saved jobs" value={data.savedJobs} />
                <Row label="Applications tracked" value={data.applications} />
                <Row label="Interview answers saved" value={data.interviews} />
                <Row label="Tailored CVs" value={data.tailoredCvs} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Plans</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {Object.entries(data.plans).map(([plan, n]) => (
                  <Row key={plan} label={plan} value={`${n} (${pct(n, data.totalUsers)})`} />
                ))}
                <div className="mt-3 rounded-lg bg-z-surface p-3 text-xs text-z-ink-soft">
                  <Badge variant="neutral" className="mr-2">Coming soon</Badge>
                  Income and revenue appear here once billing is built. Today this only counts who is on which plan.
                </div>
              </CardContent>
            </Card>
          </section>

          <Card>
            <CardHeader>
              <CardTitle>Jobs in the database</CardTitle>
              <span className="text-sm font-semibold tabular-nums text-z-ink">{data.jobsTotal.toLocaleString()}</span>
            </CardHeader>
            <CardContent className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
              {data.jobsBySource.map((s) => (
                <Row key={s.source} label={s.source} value={`${s.count.toLocaleString()} · ${formatDate(s.latest)}`} />
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="capitalize text-z-ink-soft">{label}</span>
      <span className="text-right font-medium tabular-nums text-z-ink">{value}</span>
    </div>
  );
}

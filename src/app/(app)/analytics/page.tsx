"use client";

import {
  BarChart3,
  Radar as RadarIcon,
  Star,
  Bookmark,
  Send,
  CalendarClock,
  Award,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { MetricCard } from "@/components/shared/metric-card";
import { ChartCard } from "@/components/shared/chart-card";
import {
  useOpportunityStats,
  useStrongMatchCount,
  useMatchDistribution,
  useSkillDemand,
  useTopTitles,
} from "@/lib/hooks/use-opportunities";
import { useApplications } from "@/lib/hooks/use-applications";
import { useSources } from "@/lib/hooks/use-sources";
import type { ApplicationStage } from "@/lib/types";

const pieColors = ["#3d5afe", "#0f8f8a", "#6d5bd0", "#b7791f", "#178a5c", "#c0362c"];

// Current count per stage on the Applications board — a real snapshot, not a
// cumulative "how many ever reached this stage" funnel. The app only stores
// an application's CURRENT stage (plus saved_at/applied_at), not its full
// history, so a true cumulative funnel isn't something the data can honestly
// support yet. Labeled below as "current stage", not "funnel", for that reason.
const STAGE_ORDER: { stage: ApplicationStage; label: string }[] = [
  { stage: "saved", label: "Saved" },
  { stage: "preparing", label: "Preparing" },
  { stage: "applied", label: "Applied" },
  { stage: "interview", label: "Interview" },
  { stage: "offer", label: "Offer" },
  { stage: "rejected", label: "Rejected" },
];

export default function AnalyticsPage() {
  const { data: stats } = useOpportunityStats();
  const { data: strongMatches = 0 } = useStrongMatchCount();
  const { data: matchDistribution = [] } = useMatchDistribution();
  const { data: skillDemand = [] } = useSkillDemand();
  const { data: topTitles = [] } = useTopTitles(6);
  const { data: applications = [] } = useApplications();
  const { data: sources = [] } = useSources();

  const saved = applications.filter((a) => a.stage === "saved").length;
  const interviews = applications.filter((a) => a.stage === "interview").length;
  const offers = applications.filter((a) => a.stage === "offer").length;

  // Of applications you actually acted on beyond saving, what fraction got
  // any real response (interview, offer, or a rejection) vs. sitting with
  // no reply at all.
  const submitted = applications.filter((a) => a.stage !== "saved" && a.stage !== "preparing").length;
  const responded = applications.filter((a) => ["interview", "offer", "rejected"].includes(a.stage)).length;
  const responseRate = submitted > 0 ? Math.round((responded / submitted) * 100) : 0;

  // Applications over time: grouped by the week each was saved — the one
  // timestamp every application actually has, regardless of its current stage.
  const applicationsOverTime = buildWeeklySeries(applications.map((a) => a.savedAt));

  const stageCounts = STAGE_ORDER.map(({ stage, label }) => ({
    stage: label,
    count: applications.filter((a) => a.stage === stage).length,
  }));

  const topSkills = skillDemand.slice(0, 6);

  const sourceBreakdown = sources.filter((s) => s.opportunitiesDiscovered > 0).map((s) => ({
    source: s.name,
    count: s.opportunitiesDiscovered,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="inline-flex items-center gap-2 text-xl font-semibold text-z-ink sm:text-2xl">
          <BarChart3 className="h-5 w-5 text-z-brand" /> Analytics
        </h1>
        <p className="mt-1 text-sm text-z-ink-faint">Track how your career search is performing over time.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <MetricCard label="Opportunities discovered" value={stats?.total ?? 0} icon={RadarIcon} tone="brand" />
        <MetricCard label="Strong matches" value={strongMatches} icon={Star} tone="success" hint="80%+ score" />
        <MetricCard label="Saved" value={saved} icon={Bookmark} tone="teal" />
        <MetricCard label="Applications" value={applications.length} icon={Send} tone="brand" />
        <MetricCard label="Interviews" value={interviews} icon={CalendarClock} tone="warning" />
        <MetricCard label="Offers" value={offers} icon={Award} tone="success" />
        <MetricCard label="Response rate" value={`${responseRate}%`} icon={BarChart3} tone="teal" hint="of applications you submitted" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Applications over time" description="Applications added per week, by when you saved them.">
          <div className="h-64">
            {applicationsOverTime.every((p) => p.value === 0) ? (
              <EmptyChart message="No applications tracked yet." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={applicationsOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--z-border)" />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: "var(--z-ink-faint)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: "var(--z-ink-faint)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--z-border)", fontSize: 12 }} />
                  <Line type="monotone" dataKey="value" stroke="var(--z-brand)" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>

        <ChartCard title="Match score distribution" description="How every discovered opportunity scores against your profile.">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={matchDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--z-border)" />
                <XAxis dataKey="range" tick={{ fontSize: 11, fill: "var(--z-ink-faint)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "var(--z-ink-faint)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--z-border)", fontSize: 12 }} />
                <Bar dataKey="count" fill="var(--z-brand)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Applications by stage" description="Where your tracked applications currently sit on the board (not cumulative).">
          <div className="h-64">
            {applications.length === 0 ? (
              <EmptyChart message="No applications tracked yet." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stageCounts} layout="vertical" margin={{ left: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--z-border)" />
                  <XAxis type="number" tick={{ fontSize: 12, fill: "var(--z-ink-faint)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis dataKey="stage" type="category" tick={{ fontSize: 12, fill: "var(--z-ink-soft)" }} axisLine={false} tickLine={false} width={90} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--z-border)", fontSize: 12 }} />
                  <Bar dataKey="count" fill="var(--z-teal)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>

        <ChartCard title="Top skills requested" description="Skills appearing most often across every discovered opportunity.">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topSkills} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--z-border)" />
                <XAxis type="number" tick={{ fontSize: 12, fill: "var(--z-ink-faint)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis dataKey="skill" type="category" tick={{ fontSize: 12, fill: "var(--z-ink-soft)" }} axisLine={false} tickLine={false} width={90} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--z-border)", fontSize: 12 }} />
                <Bar dataKey="count" fill="var(--z-violet)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Most common titles" description="Exact job titles posted most often, across every source.">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topTitles}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--z-border)" />
                <XAxis dataKey="title" tick={{ fontSize: 10, fill: "var(--z-ink-faint)" }} axisLine={false} tickLine={false} interval={0} angle={-15} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 12, fill: "var(--z-ink-faint)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--z-border)", fontSize: 12 }} />
                <Bar dataKey="count" fill="var(--z-brand)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Opportunity sources" description="Where your discovered opportunities come from.">
          <div className="h-64">
            {sourceBreakdown.length === 0 ? (
              <EmptyChart message="No sources connected yet." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sourceBreakdown} dataKey="count" nameKey="source" innerRadius={55} outerRadius={85} paddingAngle={2}>
                    {sourceBreakdown.map((entry, i) => (
                      <Cell key={entry.source} fill={pieColors[i % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--z-border)", fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          {sourceBreakdown.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
              {sourceBreakdown.map((entry, i) => (
                <span key={entry.source} className="inline-flex items-center gap-1.5 text-xs text-z-ink-soft">
                  <span className="h-2 w-2 rounded-full" style={{ background: pieColors[i % pieColors.length] }} />
                  {entry.source}
                </span>
              ))}
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return <div className="flex h-full items-center justify-center text-sm text-z-ink-faint">{message}</div>;
}

// Buckets ISO timestamps into the last 6 calendar weeks (oldest first).
function buildWeeklySeries(isoDates: string[]): { label: string; value: number }[] {
  const WEEK_MS = 7 * 24 * 3600 * 1000;
  const now = Date.now();
  const buckets = Array.from({ length: 6 }, (_, i) => ({
    label: i === 5 ? "This week" : `${5 - i} wk${5 - i === 1 ? "" : "s"} ago`,
    start: now - (6 - i) * WEEK_MS,
    end: now - (5 - i) * WEEK_MS,
    value: 0,
  }));
  for (const iso of isoDates) {
    const t = new Date(iso).getTime();
    const bucket = buckets.find((b) => t >= b.start && t < b.end + 1);
    if (bucket) bucket.value += 1;
  }
  return buckets.map(({ label, value }) => ({ label, value }));
}

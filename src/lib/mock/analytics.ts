// BACKEND INTEGRATION:
// Replace this mock service with real aggregation queries against
// `opportunities`, `applications`, and `interview_sessions`.
// See /docs/backend-integration.md

import type {
  AnalyticsSummary,
  FunnelStage,
  MatchDistributionBucket,
  RoleDemand,
  SkillDemand,
  SourceBreakdown,
  TimeSeriesPoint,
} from "@/lib/types";

export const mockAnalyticsSummary: AnalyticsSummary = {
  opportunitiesDiscovered: 247,
  strongMatches: 43,
  saved: 28,
  applications: 17,
  interviews: 4,
  offers: 1,
  responseRate: 24,
};

export const mockApplicationsOverTime: TimeSeriesPoint[] = [
  { label: "Week 1", value: 2 },
  { label: "Week 2", value: 3 },
  { label: "Week 3", value: 1 },
  { label: "Week 4", value: 5 },
  { label: "Week 5", value: 2 },
  { label: "Week 6", value: 4 },
];

export const mockMatchDistribution: MatchDistributionBucket[] = [
  { range: "90-100%", count: 14 },
  { range: "75-89%", count: 21 },
  { range: "60-74%", count: 28 },
  { range: "40-59%", count: 19 },
  { range: "Below 40%", count: 9 },
];

export const mockFunnel: FunnelStage[] = [
  { stage: "Discovered", count: 247 },
  { stage: "Strong match", count: 43 },
  { stage: "Saved", count: 28 },
  { stage: "Applied", count: 17 },
  { stage: "Interview", count: 4 },
  { stage: "Offer", count: 1 },
];

export const mockTopSkills: SkillDemand[] = [
  { skill: "React", count: 118 },
  { skill: "TypeScript", count: 96 },
  { skill: "Next.js", count: 61 },
  { skill: "Tailwind CSS", count: 54 },
  { skill: "REST APIs", count: 47 },
  { skill: "Node.js", count: 39 },
];

export const mockTopRoles: RoleDemand[] = [
  { role: "Frontend Developer", count: 84 },
  { role: "React Developer", count: 52 },
  { role: "UI Engineer", count: 31 },
  { role: "Full-Stack Developer", count: 29 },
  { role: "Junior Software Engineer", count: 24 },
];

export const mockSourceBreakdown: SourceBreakdown[] = [
  { source: "Adzuna", count: 88 },
  { source: "Reddit", count: 62 },
  { source: "Greenhouse", count: 41 },
  { source: "Upwork", count: 34 },
  { source: "Lever", count: 27 },
  { source: "LinkedIn", count: 19 },
];

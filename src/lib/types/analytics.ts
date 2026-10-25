export interface AnalyticsSummary {
  opportunitiesDiscovered: number;
  strongMatches: number;
  saved: number;
  applications: number;
  interviews: number;
  offers: number;
  responseRate: number;
}

export interface TimeSeriesPoint {
  label: string;
  value: number;
}

export interface FunnelStage {
  stage: string;
  count: number;
}

export interface SkillDemand {
  skill: string;
  count: number;
}

export interface RoleDemand {
  role: string;
  count: number;
}

export interface SourceBreakdown {
  source: string;
  count: number;
}

export interface MatchDistributionBucket {
  range: string;
  count: number;
}

// Source adapter contract. Every job source (Reddit, Upwork, Adzuna,
// Greenhouse, Lever, LinkedIn, ...) implements this interface so the
// ingestion pipeline can treat them uniformly:
//
//   SOURCE APIs -> SOURCE ADAPTERS -> NORMALIZATION -> DUPLICATE DETECTION
//   -> OPPORTUNITY DATABASE -> AI ANALYSIS -> MATCH ENGINE -> TRUST ENGINE
//   -> FRESHNESS ENGINE -> NOTIFICATION ENGINE -> ZYPHNARO DASHBOARD
//
// See /docs/architecture.md and /docs/source-integrations.md

import type { NormalizedOpportunityInput } from "./types";

export interface RawOpportunity {
  [key: string]: unknown;
}

export interface JobSource {
  name: string;
  authenticate?(): Promise<void>;
  fetchOpportunities(): Promise<RawOpportunity[]>;
  normalizeOpportunity(data: RawOpportunity): NormalizedOpportunityInput;
}

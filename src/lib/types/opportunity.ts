// Normalized opportunity model. Every source adapter (Reddit, Upwork, Adzuna,
// Greenhouse, Lever, ...) eventually maps its raw response into this shape,
// so the rest of the app never needs to know where an opportunity came from.

import type { FitAssessment } from "@/lib/assessment/types";

export type WorkType = "remote" | "hybrid" | "onsite";

export type EmploymentType =
  | "full-time"
  | "part-time"
  | "contract"
  | "freelance"
  | "internship";

export type SeniorityLevel = "intern" | "junior" | "mid" | "senior" | "lead";

export type OpportunityStatus = "new" | "saved" | "applied" | "closed";

export interface Salary {
  min?: number;
  max?: number;
  currency?: string;
  period?: "hour" | "month" | "year" | "project";
}

export interface Company {
  name: string;
  website?: string;
  logo?: string;
  domainVerified?: boolean;
}

export interface Recruiter {
  name: string;
  role: string;
  company: string;
  source: string;
  profileUrl?: string;
  avatar?: string;
  identityConsistent?: boolean;
  responseRate?: number; // 0-100, share of messages that get a reply
  activity?: string; // human readable last-active summary
}

export interface MatchBreakdown {
  overall: number; // 0-100
  skills: number;
  experience: number;
  role: number;
  location: number;
  // True when the listing is limited to a region the candidate isn't in.
  regionRestricted?: boolean;
  reason: string;
}

export type TrustLevel = "low-concern" | "potential-concern" | "high-risk";

export interface TrustAnalysis {
  score: number; // 0-100
  level: TrustLevel;
  signals: string[]; // positive signals found
  concerns: string[]; // things worth double-checking
}

export interface CVFitAnalysis {
  jobMatch: number;
  cvMatch: number;
  atsReadiness: number;
  strongMatches: string[];
  weakOrMissing: string[];
  recommendations: string[];
}

export interface OpportunityAIAnalysis {
  matchScore: number;
  summary: string;
  whyYouMatch: string[];
  potentialConcerns: string[];
}

export interface Opportunity {
  id: string;
  source: string; // e.g. "Reddit", "LinkedIn", "Greenhouse"
  externalId: string;

  title: string;
  description: string;

  company: Company;
  author?: Recruiter;

  location?: string;
  workType: WorkType;
  employmentType: EmploymentType;
  seniority: SeniorityLevel;

  salary?: Salary;
  skills: string[];

  postedAt: string; // ISO timestamp — when the source says it was posted
  detectedAt: string; // ISO timestamp — when Zyphnaro discovered it

  originalUrl: string;

  match: MatchBreakdown;
  trust: TrustAnalysis;
  cvFit: CVFitAnalysis;
  aiAnalysis: OpportunityAIAnalysis;
  // Shared evidence-based reading of this job against the viewer's profile.
  // Absent on mock data.
  assessment?: FitAssessment;

  status: OpportunityStatus;
  saved: boolean;
}

// --- List / search API ------------------------------------------------------
// Shared by the repositories, the hooks and the Opportunities page. The
// filtering, sorting and searching itself happens in the DATABASE (see
// supabase/migrations/0009_rank_opportunities.sql), so the browser only ever
// receives the top slice of results instead of every listing.

export type OpportunityFilterKey =
  | "all"
  | "remote"
  | "full-time"
  | "freelance"
  | "internship"
  | "junior"
  | "senior"
  | "high-match"
  | "fresh"
  | "high-trust";

export type OpportunitySortKey = "best-match" | "newest" | "highest-trust" | "highest-salary";

export interface OpportunitySearchParams {
  query: string;
  filter: OpportunityFilterKey;
  sort: OpportunitySortKey;
  /** How many results to return (top of the sorted list). */
  limit: number;
}

export interface OpportunitySearchResult {
  items: Opportunity[];
  /** Total rows matching the search + filter, BEFORE the limit was applied. */
  total: number;
}

export interface OpportunityStats {
  /** Every listing in the database. */
  total: number;
  /** Listings posted in the last 24 hours. */
  postedToday: number;
  /** Listings detected in the last 48 hours. */
  detectedLast48h: number;
  /** Listings whose trust level is anything other than "low-concern". */
  flagged: number;
}

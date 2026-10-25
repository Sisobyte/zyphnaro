// What a source adapter actually produces: enough to write a row into the
// `opportunities` table. Deliberately narrower than the full Opportunity
// type — match score, CV fit, and status are computed downstream (by the
// match-engine and the viewing user's own data), not known by the source
// itself. Trust is included since it genuinely is a property of the
// listing, not the viewer.

import type { Company, Recruiter, Salary, TrustAnalysis, Opportunity } from "@/lib/types";

export interface NormalizedOpportunityInput {
  source: string;
  externalId: string;
  title: string;
  description: string;
  company: Company;
  author?: Recruiter;
  location?: string;
  workType: Opportunity["workType"];
  employmentType: Opportunity["employmentType"];
  seniority: Opportunity["seniority"];
  salary?: Salary;
  skills: string[];
  postedAt: string;
  detectedAt: string;
  originalUrl: string;
  trust: TrustAnalysis;
}

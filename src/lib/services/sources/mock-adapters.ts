// SOURCE INTEGRATION:
// Mock adapters for sources with no real access yet (Reddit's self-serve
// API registration has been closed since November 2025; Upwork and
// Freelancer both require an approved OAuth app plus per-user account
// connection — see /docs/source-integrations.md). Adzuna, Greenhouse, and
// Lever have real implementations instead — see adzuna-source.ts,
// greenhouse-source.ts, and lever-source.ts.

import type { JobSource, RawOpportunity } from "./job-source";
import type { NormalizedOpportunityInput } from "./types";
import { mockOpportunities } from "@/lib/mock/opportunities";

function makeMockAdapter(name: string): JobSource {
  return {
    name,
    async authenticate() {
      // SOURCE INTEGRATION: perform OAuth or API-key auth here.
    },
    async fetchOpportunities(): Promise<RawOpportunity[]> {
      // SOURCE INTEGRATION: call the real source API here.
      return mockOpportunities.filter((o) => o.source === name) as unknown as RawOpportunity[];
    },
    normalizeOpportunity(data: RawOpportunity): NormalizedOpportunityInput {
      // SOURCE INTEGRATION: map the source's raw response fields into
      // NormalizedOpportunityInput here.
      return data as unknown as NormalizedOpportunityInput;
    },
  };
}

export const RedditSource = makeMockAdapter("Reddit");
export const UpworkSource = makeMockAdapter("Upwork");
export const FreelancerSource = makeMockAdapter("Freelancer");

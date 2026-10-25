// SOURCE INTEGRATION:
// Real Adzuna adapter. Adzuna is a general job aggregator spanning every
// industry — this is deliberately an UNFILTERED broad search (no "what="
// keyword tying it to tech/engineering), so marketing, admin, analytics,
// healthcare, retail, and every other field surfaces here too. The user's
// own profile and the match-engine — not this adapter — decide what's
// relevant to any given person. See /docs/source-integrations.md
//
// API docs: https://developer.adzuna.com/docs — public, key-based, no
// OAuth. This sandbox's own network allowlist blocks api.adzuna.com
// (confirmed via a "x-deny-reason: host_not_allowed" response header on
// other sources — this sandbox restricts egress to a small domain list,
// unrelated to Adzuna itself), so this could not be tested live from here.
// The request shape below matches Adzuna's long-stable, publicly
// documented REST API.

import type { JobSource, RawOpportunity } from "./job-source";
import type { NormalizedOpportunityInput } from "./types";
import { extractSkillsFromText } from "@/lib/sources/skill-vocabulary";

const COUNTRY = process.env.ADZUNA_COUNTRY || "us";

interface AdzunaJob {
  id: string;
  title: string;
  description: string;
  company?: { display_name?: string };
  location?: { display_name?: string; area?: string[] };
  salary_min?: number;
  salary_max?: number;
  contract_time?: string; // "full_time" | "part_time"
  contract_type?: string; // "permanent" | "contract"
  redirect_url: string;
  created: string;
  category?: { label?: string };
}

function inferWorkType(text: string): NormalizedOpportunityInput["workType"] {
  const lower = text.toLowerCase();
  if (lower.includes("remote")) return "remote";
  if (lower.includes("hybrid")) return "hybrid";
  return "onsite";
}

function inferSeniority(title: string): NormalizedOpportunityInput["seniority"] {
  const t = title.toLowerCase();
  if (t.includes("intern")) return "intern";
  if (t.includes("junior") || t.includes("entry")) return "junior";
  if (t.includes("senior") || t.includes("sr.") || t.includes("sr ")) return "senior";
  if (t.includes("lead") || t.includes("principal") || t.includes("head of")) return "lead";
  return "mid";
}

function inferEmploymentType(job: AdzunaJob): NormalizedOpportunityInput["employmentType"] {
  if (job.contract_type === "contract") return "contract";
  if (job.contract_time === "part_time") return "part-time";
  return "full-time";
}

export const AdzunaSource: JobSource = {
  name: "Adzuna",

  async fetchOpportunities(): Promise<RawOpportunity[]> {
    // Read lazily, at call time, rather than as a module-level constant.
    // Reading env vars at import time is fragile — it can capture a value
    // (or lack of one) from before something like dotenv has finished
    // populating process.env, depending on module load order. Reading
    // inside the function guarantees this always sees the current value.
    const APP_ID = process.env.ADZUNA_APP_ID;
    const APP_KEY = process.env.ADZUNA_APP_KEY;
    if (!APP_ID || !APP_KEY) {
      throw new Error("ADZUNA_APP_ID / ADZUNA_APP_KEY not configured.");
    }
    const url = `https://api.adzuna.com/v1/api/jobs/${COUNTRY}/search/1?app_id=${APP_ID}&app_key=${APP_KEY}&results_per_page=50&content-type=application/json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Adzuna request failed: ${res.status} ${res.statusText}`);
    const data = await res.json();
    return (data.results ?? []) as RawOpportunity[];
  },

  normalizeOpportunity(raw: RawOpportunity): NormalizedOpportunityInput {
    const job = raw as unknown as AdzunaJob;
    const text = `${job.title} ${job.description}`;

    return {
      source: "Adzuna",
      externalId: job.id,
      title: job.title,
      description: job.description,
      company: { name: job.company?.display_name ?? "Unknown company" },
      location: job.location?.display_name,
      workType: inferWorkType(text),
      employmentType: inferEmploymentType(job),
      seniority: inferSeniority(job.title),
      salary:
        job.salary_min || job.salary_max
          ? { min: job.salary_min, max: job.salary_max, currency: "USD", period: "year" }
          : undefined,
      skills: extractSkillsFromText(text),
      postedAt: job.created,
      detectedAt: new Date().toISOString(),
      originalUrl: job.redirect_url,
      trust: {
        // Adzuna aggregates from many publishers; we don't have per-listing
        // domain/payment signals the way a direct company posting would.
        // A neutral, honestly-labeled default rather than a fabricated
        // high score. See /docs/source-integrations.md.
        score: 75,
        level: "low-concern",
        signals: ["Sourced from Adzuna's aggregated job listings"],
        concerns: [],
      },
    };
  },
};
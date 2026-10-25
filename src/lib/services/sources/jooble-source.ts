// SOURCE INTEGRATION:
// Real Jooble adapter. Jooble (https://jooble.org) is a general job
// aggregator with real, confirmed coverage in Nigeria (ng.jooble.org) —
// unlike Adzuna, which does not operate there. One JobSource is built per
// entry in jooble-regions.ts, so adding another African country later is a
// config change, not a code change — see that file's own header comment.
//
// Deliberately an UNFILTERED search (empty `keywords`) for the same reason
// Adzuna's adapter is unfiltered: the user's profile and the match-engine,
// not this adapter, should decide what's relevant to a given person.
//
// API docs: https://help.jooble.org/en/support/solutions/articles/60001448238
// (official REST API docs — request/response shape below matches this
// exactly). Registration: https://ng.jooble.org/api/about for the Nigeria
// key; swap the `ng` subdomain for another country's own domain to register
// there instead. This sandbox's network allowlist blocks jooble.org (it
// restricts egress to a small domain list, same situation as the Adzuna
// adapter), so this could not be tested against the live API from here.
//
// KNOWN LIMITATIONS (honestly, not hidden):
// - `snippet` is a truncated excerpt, not the full job description.
// - `salary` comes back as unstructured free text (e.g. "₦150,000/month")
//   rather than numeric min/max, so it's intentionally left unparsed here
//   rather than fed through a regex that would misparse half the time.
// - `link` routes through Jooble's own redirect, not directly to the
//   original posting — flagged as a trust signal below, the same honest
//   treatment Adzuna's adapter gives its own aggregated-source listings.

import type { JobSource, RawOpportunity } from "./job-source";
import type { NormalizedOpportunityInput } from "./types";
import { extractSkillsFromText } from "@/lib/sources/skill-vocabulary";
import { JOOBLE_REGIONS, type JoobleRegionConfig } from "@/lib/sources/jooble-regions";

interface JoobleJob {
  id: number | string;
  title: string;
  location?: string;
  snippet?: string;
  salary?: string;
  source?: string;
  type?: string; // "Full-time" | "Part-time" | "Temporary" | ... — not always present
  link: string;
  company?: string;
  updated?: string;
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
  if (t.includes("junior") || t.includes("entry") || t.includes("graduate")) return "junior";
  if (t.includes("senior") || t.includes("sr.") || t.includes("sr ")) return "senior";
  if (t.includes("lead") || t.includes("principal") || t.includes("head of")) return "lead";
  return "mid";
}

function inferEmploymentTypeFromTitle(title: string): NormalizedOpportunityInput["employmentType"] {
  const t = title.toLowerCase();
  if (t.includes("intern")) return "internship";
  if (t.includes("part-time") || t.includes("part time")) return "part-time";
  if (t.includes("contract") || t.includes("freelance")) return "contract";
  return "full-time";
}

// Jooble's `type` field is free text and not always present, so this falls
// back to title-based inference (above) rather than defaulting blindly to
// full-time.
function inferEmploymentType(type: string | undefined, title: string): NormalizedOpportunityInput["employmentType"] {
  const t = (type ?? "").toLowerCase();
  if (t.includes("intern")) return "internship";
  if (t.includes("part")) return "part-time";
  if (t.includes("contract") || t.includes("temporary") || t.includes("freelance")) return "contract";
  if (t.includes("full")) return "full-time";
  return inferEmploymentTypeFromTitle(title);
}

function buildJoobleSource(region: JoobleRegionConfig): JobSource {
  const sourceName = `Jooble ${region.label}`;
  const envKey = `JOOBLE_${region.code.toUpperCase()}_API_KEY`;

  return {
    name: sourceName,

    async fetchOpportunities(): Promise<RawOpportunity[]> {
      // Read lazily, at call time — see the Adzuna adapter's own comment on
      // why this isn't a module-level constant (env vars populated by
      // dotenv may not be ready yet at import time).
      const apiKey = process.env[envKey];
      if (!apiKey) {
        throw new Error(`${envKey} not configured.`);
      }
      const host = `${region.code}.jooble.org`;
      const res = await fetch(`https://${host}/api/${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keywords: "",
          location: region.location,
          ResultOnPage: 50,
          page: 1,
        }),
      });
      if (!res.ok) {
        throw new Error(`Jooble ${region.label} request failed: ${res.status} ${res.statusText}`);
      }
      const data = await res.json();
      return (data.jobs ?? []) as RawOpportunity[];
    },

    normalizeOpportunity(raw: RawOpportunity): NormalizedOpportunityInput {
      const job = raw as unknown as JoobleJob;
      const text = `${job.title} ${job.snippet ?? ""}`;

      return {
        source: sourceName,
        externalId: String(job.id),
        title: job.title,
        description: job.snippet ?? "",
        company: { name: job.company || "Unknown company" },
        location: job.location,
        workType: inferWorkType(text),
        employmentType: inferEmploymentType(job.type, job.title),
        seniority: inferSeniority(job.title),
        // See the KNOWN LIMITATIONS note at the top of this file.
        salary: undefined,
        skills: extractSkillsFromText(text),
        postedAt: job.updated && !Number.isNaN(Date.parse(job.updated)) ? job.updated : new Date().toISOString(),
        detectedAt: new Date().toISOString(),
        originalUrl: job.link,
        trust: {
          // Neutral, honestly-labeled default — Jooble itself aggregates
          // from many publishers, so there's no per-listing domain/payment
          // signal the way a direct company posting would have. Same
          // treatment as the Adzuna adapter's own trust default.
          score: 72,
          level: "low-concern",
          signals: [`Sourced from Jooble's aggregated ${region.label} job listings`],
          concerns: ["Apply link routes through Jooble rather than directly to the original posting"],
        },
      };
    },
  };
}

// One JobSource per region configured in jooble-regions.ts — each shows up
// as its own named source ("Jooble Nigeria", "Jooble South Africa", ...),
// so discovered counts and sync results stay broken out per country rather
// than merged into one ambiguous "Jooble" bucket.
export const JoobleSources: JobSource[] = JOOBLE_REGIONS.map(buildJoobleSource);

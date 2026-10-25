// SOURCE INTEGRATION:
// Remotive — public, key-free JSON API for curated remote jobs.
//   GET https://remotive.com/api/remote-jobs   (docs: github.com/remotive-com/remote-jobs-api)
//
// TERMS to respect (from Remotive's own README — recheck before relying on it):
//  - Fetch no more than ~4 times a day; more than 2 requests/minute is blocked.
//    This adapter makes ONE request per sync, and the cron runs once a day.
//  - Jobs are delayed 24 hours by Remotive.
//  - Credit Remotive and link to the job's own Remotive URL (originalUrl below
//    is that URL, and it is what the "Apply" button opens).
//  - Remotive asks that its jobs are not submitted to third-party job sites and
//    not used to collect sign-ups. Zyphnaro has sign-ups, so email
//    hello@remotive.com to confirm this use (a paid/private API exists too).
//
// The sandbox this was written in cannot reach remotive.com, so the field
// names below come from the README rather than a live response.

import type { JobSource, RawOpportunity } from "./job-source";
import type { NormalizedOpportunityInput } from "./types";
import { extractSkillsFromText } from "@/lib/sources/skill-vocabulary";
import { employmentFromText, htmlToText, parseSalaryText, seniorityFromTitle, USER_AGENT } from "./text-utils";

interface RemotiveJob {
  id: number;
  url: string;
  title: string;
  company_name: string;
  category?: string;
  job_type?: string;
  publication_date?: string;
  candidate_required_location?: string;
  salary?: string;
  description?: string;
}

export const RemotiveSource: JobSource = {
  name: "Remotive",

  async fetchOpportunities(): Promise<RawOpportunity[]> {
    const res = await fetch("https://remotive.com/api/remote-jobs", {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`Remotive request failed: ${res.status} ${res.statusText}`);
    const data = (await res.json()) as { jobs?: RemotiveJob[] };
    return (data.jobs ?? []) as unknown as RawOpportunity[];
  },

  normalizeOpportunity(raw: RawOpportunity): NormalizedOpportunityInput {
    const job = raw as unknown as RemotiveJob;
    const description = htmlToText(job.description);
    const text = `${job.title} ${job.category ?? ""} ${description}`;
    const posted = job.publication_date && !Number.isNaN(Date.parse(job.publication_date)) ? job.publication_date : undefined;

    return {
      source: "Remotive",
      externalId: String(job.id),
      title: job.title,
      description,
      company: { name: job.company_name || "Unknown company" },
      location: job.candidate_required_location || "Worldwide",
      // Every Remotive listing is a remote role.
      workType: "remote",
      employmentType: employmentFromText(job.job_type),
      seniority: seniorityFromTitle(job.title),
      salary: parseSalaryText(job.salary),
      skills: extractSkillsFromText(text),
      postedAt: posted ?? new Date().toISOString(),
      detectedAt: new Date().toISOString(),
      originalUrl: job.url,
      trust: {
        score: 75,
        level: "low-concern",
        signals: ["Listed on Remotive, a curated remote job board"],
        concerns: [],
      },
    };
  },
};

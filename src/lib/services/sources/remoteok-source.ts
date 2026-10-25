// SOURCE INTEGRATION:
// Remote OK — public, key-free JSON feed: GET https://remoteok.com/api
//
// The first array element is a legal notice (no job fields), the rest are jobs.
// TERMS (stated in that notice — recheck before relying on it):
//  - Link back to the listing on Remote OK with a FOLLOWED link (no rel=nofollow)
//    and credit Remote OK as the source. originalUrl below is the Remote OK
//    listing page, and the "Apply" button opens it with rel="noreferrer" only.
//  - Do not use the Remote OK logo without written permission (this adapter
//    ignores logos entirely).
//  - Access can be suspended if the above is not followed.
//
// Salary fields are annual USD. 0 means "not stated".

import type { JobSource, RawOpportunity } from "./job-source";
import type { NormalizedOpportunityInput } from "./types";
import { extractSkillsFromText } from "@/lib/sources/skill-vocabulary";
import { employmentFromText, htmlToText, seniorityFromTitle, USER_AGENT } from "./text-utils";

interface RemoteOkJob {
  id?: string | number;
  slug?: string;
  date?: string;
  company?: string;
  position?: string;
  tags?: string[];
  description?: string;
  location?: string;
  salary_min?: number;
  salary_max?: number;
  apply_url?: string;
  url?: string;
  verified?: boolean;
}

export const RemoteOkSource: JobSource = {
  name: "Remote OK",

  async fetchOpportunities(): Promise<RawOpportunity[]> {
    // Remote OK rejects requests without a User-Agent.
    const res = await fetch("https://remoteok.com/api", {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`Remote OK request failed: ${res.status} ${res.statusText}`);
    const data = (await res.json()) as RemoteOkJob[];
    // Drop the legal-notice element and anything that isn't a real job.
    return data.filter((j) => j && j.position && j.id !== undefined) as unknown as RawOpportunity[];
  },

  normalizeOpportunity(raw: RawOpportunity): NormalizedOpportunityInput {
    const job = raw as unknown as RemoteOkJob;
    const title = job.position ?? "";
    const description = htmlToText(job.description);
    const tags = job.tags ?? [];
    const text = `${title} ${tags.join(" ")} ${description}`;
    const min = job.salary_min && job.salary_min > 0 ? job.salary_min : undefined;
    const max = job.salary_max && job.salary_max > 0 ? job.salary_max : undefined;
    const link = job.url || (job.slug ? `https://remoteok.com/remote-jobs/${job.slug}` : "https://remoteok.com");

    return {
      source: "Remote OK",
      externalId: String(job.id),
      title,
      description,
      company: { name: job.company || "Unknown company" },
      location: job.location || "Worldwide",
      workType: "remote",
      employmentType: employmentFromText(tags.join(" ")),
      seniority: seniorityFromTitle(title),
      salary: min || max ? { min, max, currency: "USD", period: "year" } : undefined,
      skills: extractSkillsFromText(text),
      postedAt: job.date && !Number.isNaN(Date.parse(job.date)) ? job.date : new Date().toISOString(),
      detectedAt: new Date().toISOString(),
      originalUrl: link,
      trust: {
        score: job.verified ? 80 : 70,
        level: "low-concern",
        signals: job.verified ? ["Listed on Remote OK (verified)"] : ["Listed on Remote OK"],
        concerns: [],
      },
    };
  },
};

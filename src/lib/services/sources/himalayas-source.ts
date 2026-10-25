// SOURCE INTEGRATION:
// Himalayas — public, key-free JSON API for remote jobs.
//   GET https://himalayas.app/jobs/api?limit=20&cursor=...   (newest first)
// Docs: himalayas.app/api  ·  OpenAPI: himalayas.app/docs/openapi.json
//
// FACTS (from the live response and docs):
//  - Max 20 jobs per request; page with the `nextCursor` value from the response.
//  - The whole feed is ~120,000 jobs, so this adapter pulls only the newest
//    HIMALAYAS_MAX_PAGES pages (default 10 = 200 jobs). Raise the env var for more.
//  - Rate limited: HTTP 429 means stop. The adapter keeps what it already has.
//  - No CORS headers, so it only works from the server (which this is).
//  - pubDate is a Unix timestamp in SECONDS; salaryPeriod is "annual"/"hourly"/...
//
// TERMS (from the docs — recheck): credit Himalayas and link to the job's own
// Himalayas page (originalUrl is that page). Himalayas asks that its jobs are not
// submitted to third-party job sites, so email them to confirm this use.

import type { JobSource, RawOpportunity } from "./job-source";
import type { NormalizedOpportunityInput } from "./types";
import type { Salary } from "@/lib/types";
import { extractSkillsFromText } from "@/lib/sources/skill-vocabulary";
import { employmentFromText, htmlToText, seniorityFromTitle, sleep, USER_AGENT } from "./text-utils";

interface HimalayasJob {
  title: string;
  excerpt?: string;
  companyName?: string;
  companySlug?: string;
  employmentType?: string;
  minSalary?: number | null;
  maxSalary?: number | null;
  salaryPeriod?: string | null;
  currency?: string | null;
  seniority?: string[];
  locationRestrictions?: string[];
  categories?: string[];
  description?: string;
  pubDate?: number;
  applicationLink?: string;
  guid?: string;
}

interface HimalayasPage {
  jobs?: HimalayasJob[];
  nextCursor?: string;
}

function seniorityFromList(list: string[] | undefined, title: string): NormalizedOpportunityInput["seniority"] {
  const s = (list ?? []).join(" ").toLowerCase();
  if (/intern/.test(s)) return "intern";
  if (/entry|junior/.test(s)) return "junior";
  if (/manager|director|executive|lead|principal/.test(s)) return "lead";
  if (/senior/.test(s)) return "senior";
  if (/mid/.test(s)) return "mid";
  return seniorityFromTitle(title);
}

function salaryFrom(job: HimalayasJob): Salary | undefined {
  const min = job.minSalary ?? undefined;
  const max = job.maxSalary ?? undefined;
  if (!min && !max) return undefined;
  const p = (job.salaryPeriod ?? "").toLowerCase();
  const period: Salary["period"] = p.startsWith("hour") ? "hour" : p.startsWith("month") ? "month" : "year";
  return { min: min || undefined, max: max || undefined, currency: job.currency ?? undefined, period };
}

export const HimalayasSource: JobSource = {
  name: "Himalayas",

  async fetchOpportunities(): Promise<RawOpportunity[]> {
    const maxPages = Math.max(1, Number(process.env.HIMALAYAS_MAX_PAGES) || 10);
    const all: HimalayasJob[] = [];
    let cursor: string | undefined;

    for (let page = 0; page < maxPages; page++) {
      const url = new URL("https://himalayas.app/jobs/api");
      url.searchParams.set("limit", "20");
      if (cursor) url.searchParams.set("cursor", cursor);

      const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } });
      if (res.status === 429) {
        console.warn(`[Himalayas] Rate limited after ${all.length} jobs — keeping what was fetched.`);
        break;
      }
      if (!res.ok) {
        if (all.length > 0) {
          console.warn(`[Himalayas] Stopped at page ${page + 1}: ${res.status} ${res.statusText}`);
          break;
        }
        throw new Error(`Himalayas request failed: ${res.status} ${res.statusText}`);
      }
      const data = (await res.json()) as HimalayasPage;
      all.push(...(data.jobs ?? []));
      cursor = data.nextCursor;
      if (!cursor) break;
      await sleep(400);
    }
    return all as unknown as RawOpportunity[];
  },

  normalizeOpportunity(raw: RawOpportunity): NormalizedOpportunityInput {
    const job = raw as unknown as HimalayasJob;
    const description = htmlToText(job.description) || job.excerpt || "";
    const text = `${job.title} ${(job.categories ?? []).join(" ")} ${description}`;
    const link = job.applicationLink || job.guid || "https://himalayas.app/jobs";

    return {
      source: "Himalayas",
      // guid is the job's own URL, which is unique and stable.
      externalId: job.guid || link,
      title: job.title,
      description,
      company: { name: job.companyName || "Unknown company" },
      location: job.locationRestrictions && job.locationRestrictions.length > 0
        ? job.locationRestrictions.join(", ")
        : "Worldwide",
      workType: "remote",
      employmentType: employmentFromText(job.employmentType),
      seniority: seniorityFromList(job.seniority, job.title),
      salary: salaryFrom(job),
      skills: extractSkillsFromText(text),
      postedAt: job.pubDate ? new Date(job.pubDate * 1000).toISOString() : new Date().toISOString(),
      detectedAt: new Date().toISOString(),
      originalUrl: link,
      trust: {
        score: 80,
        level: "low-concern",
        signals: ["Listed on Himalayas with a company profile"],
        concerns: [],
      },
    };
  },
};

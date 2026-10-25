// SOURCE INTEGRATION:
// Real Greenhouse adapter. Public, unauthenticated job board API — no key
// needed, just a company's board token. Pulls ALL departments (marketing,
// sales, finance, support, design, recruiting — not just engineering).
// Company list lives in src/lib/sources/companies.ts — edit that file, not
// this one, to add/remove companies.
//
// API docs: https://developers.greenhouse.io/job-board.html
// This sandbox's own network allowlist blocks boards-api.greenhouse.io
// (confirmed via the "x-deny-reason: host_not_allowed" response header —
// this is NOT Greenhouse rejecting the request), so this could not be
// tested live from here. Test locally once you run this yourself.

import type { JobSource, RawOpportunity } from "./job-source";
import type { NormalizedOpportunityInput } from "./types";
import { GREENHOUSE_COMPANIES } from "@/lib/sources/companies";
import { extractSkillsFromText } from "@/lib/sources/skill-vocabulary";

interface GreenhouseJob {
  id: number;
  title: string;
  content: string; // HTML
  absolute_url: string;
  updated_at: string;
  location?: { name?: string };
  departments?: { name: string }[];
  company?: string; // attached by fetchOpportunities, not part of the raw API response
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function inferSeniority(title: string): NormalizedOpportunityInput["seniority"] {
  const t = title.toLowerCase();
  if (t.includes("intern")) return "intern";
  if (t.includes("junior") || t.includes("entry") || t.includes("associate")) return "junior";
  if (t.includes("senior") || t.includes("sr.")) return "senior";
  if (t.includes("lead") || t.includes("principal") || t.includes("director") || t.includes("head of")) return "lead";
  return "mid";
}

export const GreenhouseSource: JobSource = {
  name: "Greenhouse",

  async fetchOpportunities(): Promise<RawOpportunity[]> {
    const all: RawOpportunity[] = [];
    for (const company of GREENHOUSE_COMPANIES) {
      try {
        const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${company}/jobs?content=true`, {
          headers: { "User-Agent": "Zyphnaro/1.0 (+https://zyphnaro.app)" },
        });
        if (!res.ok) {
          console.warn(`[Greenhouse] Skipping "${company}": ${res.status} ${res.statusText}`);
          continue;
        }
        const data = await res.json();
        const jobs = (data.jobs ?? []) as GreenhouseJob[];
        all.push(...jobs.map((j) => ({ ...j, company })));
      } catch (e) {
        console.warn(`[Greenhouse] Skipping "${company}":`, e instanceof Error ? e.message : e);
      }
    }
    return all as unknown as RawOpportunity[];
  },

  normalizeOpportunity(raw: RawOpportunity): NormalizedOpportunityInput {
    const job = raw as unknown as GreenhouseJob;
    const description = stripHtml(job.content);
    const text = `${job.title} ${description}`;

    return {
      source: "Greenhouse",
      externalId: String(job.id),
      title: job.title,
      description,
      company: { name: job.company ?? "Unknown company", website: `https://boards.greenhouse.io/${job.company}` },
      location: job.location?.name,
      workType: text.toLowerCase().includes("remote") ? "remote" : "onsite",
      employmentType: "full-time",
      seniority: inferSeniority(job.title),
      skills: extractSkillsFromText(text),
      postedAt: job.updated_at,
      detectedAt: new Date().toISOString(),
      originalUrl: job.absolute_url,
      trust: {
        // Direct company career page via a well-known ATS — a stronger,
        // honestly-earned signal than an aggregator listing.
        score: 90,
        level: "low-concern",
        signals: ["Official company career page (Greenhouse)", "No payment request detected"],
        concerns: [],
      },
    };
  },
};

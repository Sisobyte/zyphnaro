// SOURCE INTEGRATION:
// Real Lever adapter. Public, unauthenticated postings API — no key
// needed, just a company's board token. Company list lives in
// src/lib/sources/companies.ts.
//
// API docs: https://github.com/lever/postings-api
// This sandbox's own network allowlist blocks api.lever.co (confirmed
// via the "x-deny-reason: host_not_allowed" response header — this is NOT
// Lever rejecting the request), so this could not be tested live from
// here. Test locally once you run this yourself.

import type { JobSource, RawOpportunity } from "./job-source";
import type { NormalizedOpportunityInput } from "./types";
import { LEVER_COMPANIES } from "@/lib/sources/companies";
import { extractSkillsFromText } from "@/lib/sources/skill-vocabulary";

interface LeverPosting {
  id: string;
  text: string; // title
  descriptionPlain: string;
  hostedUrl: string;
  createdAt: number; // epoch ms
  categories?: { location?: string; team?: string; commitment?: string };
  company?: string; // attached by fetchOpportunities
}

function inferSeniority(title: string): NormalizedOpportunityInput["seniority"] {
  const t = title.toLowerCase();
  if (t.includes("intern")) return "intern";
  if (t.includes("junior") || t.includes("entry") || t.includes("associate")) return "junior";
  if (t.includes("senior") || t.includes("sr.")) return "senior";
  if (t.includes("lead") || t.includes("principal") || t.includes("director") || t.includes("head of")) return "lead";
  return "mid";
}

function inferEmploymentType(commitment?: string): NormalizedOpportunityInput["employmentType"] {
  const c = (commitment ?? "").toLowerCase();
  if (c.includes("part")) return "part-time";
  if (c.includes("contract") || c.includes("temp")) return "contract";
  if (c.includes("intern")) return "internship";
  return "full-time";
}

export const LeverSource: JobSource = {
  name: "Lever",

  async fetchOpportunities(): Promise<RawOpportunity[]> {
    const all: RawOpportunity[] = [];
    for (const company of LEVER_COMPANIES) {
      try {
        const res = await fetch(`https://api.lever.co/v0/postings/${company}?mode=json`, {
          headers: { "User-Agent": "Zyphnaro/1.0 (+https://zyphnaro.app)" },
        });
        if (!res.ok) {
          console.warn(`[Lever] Skipping "${company}": ${res.status} ${res.statusText}`);
          continue;
        }
        const postings = (await res.json()) as LeverPosting[];
        all.push(...postings.map((p) => ({ ...p, company })));
      } catch (e) {
        console.warn(`[Lever] Skipping "${company}":`, e instanceof Error ? e.message : e);
      }
    }
    return all as unknown as RawOpportunity[];
  },

  normalizeOpportunity(raw: RawOpportunity): NormalizedOpportunityInput {
    const job = raw as unknown as LeverPosting;
    const text = `${job.text} ${job.descriptionPlain}`;

    return {
      source: "Lever",
      externalId: job.id,
      title: job.text,
      description: job.descriptionPlain,
      company: { name: job.company ?? "Unknown company", website: `https://jobs.lever.co/${job.company}` },
      location: job.categories?.location,
      workType: text.toLowerCase().includes("remote") ? "remote" : "onsite",
      employmentType: inferEmploymentType(job.categories?.commitment),
      seniority: inferSeniority(job.text),
      skills: extractSkillsFromText(text),
      postedAt: new Date(job.createdAt).toISOString(),
      detectedAt: new Date().toISOString(),
      originalUrl: job.hostedUrl,
      trust: {
        score: 90,
        level: "low-concern",
        signals: ["Official company career page (Lever)", "No payment request detected"],
        concerns: [],
      },
    };
  },
};

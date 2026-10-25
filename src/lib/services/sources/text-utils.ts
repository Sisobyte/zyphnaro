// Small helpers shared by the remote-job adapters (Remotive, Remote OK,
// Himalayas, Hacker News). Kept in one place so the title/seniority rules
// that were already fixed once (word-boundary matching, see myjobmag-source.ts)
// aren't re-invented, and re-broken, in each adapter.

import type { NormalizedOpportunityInput } from "./types";
import type { Salary } from "@/lib/types";

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  mdash: "—", ndash: "–", hellip: "…", rsquo: "'", lsquo: "'", rdquo: '"', ldquo: '"',
};

// Turns an HTML fragment into plain text. Block-level tags become spaces so
// words from neighbouring paragraphs/list items don't glue together, then
// entities (named and numeric) are decoded.
export function htmlToText(html: string | null | undefined): string {
  if (!html) return "";
  return html
    .replace(/<\s*(br|\/p|\/div|\/li|\/h[1-6]|p|li)\b[^>]*>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => safeChar(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => safeChar(parseInt(d, 10)))
    .replace(/&([a-z]+);/gi, (m, n) => NAMED_ENTITIES[n.toLowerCase()] ?? m)
    .replace(/\s+/g, " ")
    .trim();
}

function safeChar(code: number): string {
  try {
    return String.fromCodePoint(code);
  } catch {
    return " ";
  }
}

// Seniority from the TITLE only, using whole-word matches. Plain substring
// checks misfire on real titles: "intern" inside "Internal", "lead" inside
// "Lead Generation".
export function seniorityFromTitle(title: string): NormalizedOpportunityInput["seniority"] {
  const t = title.toLowerCase();
  if (/\bintern(s|ship)?\b/.test(t)) return "intern";
  if (/\b(junior|jr\.?|entry[- ]level|graduate|trainee)\b/.test(t)) return "junior";
  if (/\b(senior|sr\.?|staff)\b/.test(t)) return "senior";
  const isLead = /\blead\b/.test(t) && !/\blead\s+generation\b/.test(t);
  if (isLead || /\b(principal|head of|director|vp|chief|manager)\b/.test(t)) return "lead";
  return "mid";
}

// Free-text employment type ("Full Time", "full_time", "contract", ...).
export function employmentFromText(text: string | null | undefined): NormalizedOpportunityInput["employmentType"] {
  const t = (text ?? "").toLowerCase().replace(/[_-]/g, " ");
  if (/\bintern(s|ship)?\b/.test(t)) return "internship";
  if (/\bpart time\b/.test(t)) return "part-time";
  if (/\bfreelance\b/.test(t)) return "freelance";
  if (/\b(contract|contractor|temporary)\b/.test(t)) return "contract";
  return "full-time";
}

// Parses a human salary string such as "$100,000 - $120,000", "80k-100k USD"
// or "€45/hour". Returns undefined unless one or two plausible numbers are
// found — an unreadable range is left out rather than guessed.
export function parseSalaryText(text: string | null | undefined): Salary | undefined {
  if (!text) return undefined;
  const nums: number[] = [];
  for (const m of text.matchAll(/(\d[\d,]*(?:\.\d+)?)\s*([kK])?/g)) {
    let n = parseFloat(m[1].replace(/,/g, ""));
    if (Number.isNaN(n)) continue;
    if (m[2]) n *= 1000;
    nums.push(n);
  }
  if (nums.length === 0 || nums.length > 2) return undefined;
  const lower = text.toLowerCase();
  const currency = /€|eur/.test(lower) ? "EUR" : /£|gbp/.test(lower) ? "GBP" : /\$|usd/.test(lower) ? "USD" : undefined;
  const period: Salary["period"] = /hour|\/hr|per hr/.test(lower) ? "hour" : /month|\/mo\b/.test(lower) ? "month" : "year";
  const [a, b] = nums;
  return { min: Math.min(a, b ?? a), max: Math.max(a, b ?? a), currency, period };
}

// Polite pause between paged requests.
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const USER_AGENT = "Zyphnaro/1.0 (+https://zyphnaro.app)";

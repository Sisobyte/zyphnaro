// SOURCE INTEGRATION:
// Real MyJobMag adapter. MyJobMag publishes official RSS feeds — a
// publisher-sanctioned, structured format, not scraping — confirmed
// directly on their own feeds page, URL confirmed in myjobmag-feeds.ts.
//
// IMPORTANT: this is NOT a generic RSS 2.0 feed with <title>/<description>.
// MyJobMag uses their own custom item schema with dedicated fields per job
// attribute (<position>, <company>, <experience>, <location>, <contract>,
// <working_hours>, etc.) — confirmed by fetching the real feed directly
// (the sandbox this was first built in couldn't reach myjobmag.com; a real
// sample of the feed was supplied afterward and this file was rewritten
// against it, replacing an earlier version built on a generic-RSS guess).
//
// One JobSource is built per entry in myjobmag-feeds.ts, the same pattern
// jooble-source.ts uses, so adding another MyJobMag country is a config
// change, not a code change — AS LONG AS that country's feed uses the same
// custom schema as Nigeria's (not yet confirmed for Ghana/Kenya/SA).
//
// REAL FIELDS USED (all CDATA-wrapped):
//   id           — MyJobMag's own numeric job id. Used as externalId —
//                   stable and simpler than deriving one from the URL.
//   position     — the role title alone, e.g. "Human Resource Manager".
//                   Used directly as Opportunity.title — no title/company
//                   splitting needed, unlike a generic RSS feed.
//   company      — company name, already separate from the title.
//   location /
//   region       — already a plain place name, e.g. "Lagos". Real data, not
//                   a regex guess at a trailing "(City)" in a title.
//   experience   — a free-text range, e.g. "2 - 3 years" or "10 -  years"
//                   (sometimes empty: " -  years"). The MINIMUM number is
//                   extracted and used as the primary seniority signal —
//                   more reliable than guessing from the job title alone.
//                   Falls back to title keywords when experience is empty
//                   or unparseable.
//   contract /
//   working_hours — contract is usually just "Permanent"; working_hours
//                   carries both the full/part-time signal AND, as a
//                   trailing modifier, the work type: "Full Time , Remote",
//                   "Full Time , Onsite", "Full Time , Hybrid", or no
//                   modifier at all (treated as onsite — the default for
//                   Nigerian listings that don't state otherwise).
//   description  — the FULL job description, not a short snippet. Much
//                   richer signal for skill extraction than assumed.
//
// NOT mapped to anything (no matching field on Opportunity): introduction,
// studies, industry, city_area, postcode, contact_*, expiryDate.
//
// KNOWN DATA-QUALITY ISSUE IN THE SOURCE ITSELF (not something to silently
// "fix" with guesswork): a handful of company introductions contain visibly
// mangled text — e.g. "NigeriaÃƒÂƒÃ‚Â¢ÃƒÂ‚Ã‚Â€ÃƒÂ‚Ã‚Â™s premier..." instead of
// "Nigeria's premier...". This is a multiply-re-encoded UTF-8 artifact in
// MyJobMag's own feed, confirmed present in the raw XML, not an artifact of
// this parser. introduction isn't used anywhere here, so it doesn't
// propagate — flagging it here in case a future field addition pulls from
// introduction and inherits the problem.

import { XMLParser } from "fast-xml-parser";
import type { JobSource, RawOpportunity } from "./job-source";
import type { NormalizedOpportunityInput } from "./types";
import { extractSkillsFromText } from "@/lib/sources/skill-vocabulary";
import { MYJOBMAG_FEEDS, type MyJobMagFeedConfig } from "@/lib/sources/myjobmag-feeds";

interface MyJobMagItem {
  id: string | { __cdata?: string };
  link: string | { __cdata?: string };
  position: string | { __cdata?: string };
  company: string | { __cdata?: string };
  experience?: string | { __cdata?: string };
  description?: string | { __cdata?: string };
  contract?: string | { __cdata?: string };
  working_hours?: string | { __cdata?: string };
  location?: string | { __cdata?: string };
  region?: string | { __cdata?: string };
  pubDate?: string | { __cdata?: string };
}

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  cdataPropName: "__cdata",
  isArray: (name) => name === "item",
});

function textOf(value: string | { __cdata?: string } | undefined): string {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  return (value.__cdata ?? "").trim();
}

// Descriptions carry HTML entities (&#39;, &mdash;, &quot;...) and this
// feed's tab/newline-formatted bullet lists, but — unlike a typical RSS
// feed — no actual HTML tags were observed in the real sample. The tag
// strip stays in as a defensive no-op in case some listings do include
// markup; it's cheap and correct either way.
function cleanText(raw: string): string {
  return raw
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Extracts the MINIMUM years from strings like "2 - 3 years", "10 -  years",
// or the empty " -  years". Returns null when no number is present at all,
// so the caller can fall back to title-keyword inference instead of
// silently defaulting to 0 (which would misclassify every listing with
// unstated experience as entry-level).
function parseMinYears(experience: string): number | null {
  const match = experience.match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

// Plain .includes("intern") also matches inside "Internal", "International",
// and "Internet" — all common in real titles ("Assistant Internal Control
// Manager", caught in testing, was incorrectly classified as an internship).
// Word-boundary matching, permitting only the real suffixes "intern" can
// legitimately take ("Intern", "Interns", "Internship"), excludes all three
// false positives while still catching every genuine case.
function isInternshipSignal(text: string): boolean {
  return /\bintern(s|ship)?\b/.test(text);
}

function seniorityFromYears(years: number): NormalizedOpportunityInput["seniority"] {
  if (years >= 10) return "lead";
  if (years >= 6) return "senior";
  if (years >= 2) return "mid";
  return "junior";
}

// An EXPLICIT level word in the title is the strongest possible signal and
// always wins — including over years, which only approximates a level.
// Caught in testing: "Senior Product Designer (UX)" with experience "5 -
// years" was landing on "mid" because years-first logic (5 < the 6-year
// "senior" threshold) silently overrode the word "Senior" sitting right in
// the title. Title keywords now take priority; years is the fallback for
// titles with no explicit level word at all — e.g. "Group Chief Financial
// Officer" has no generic seniority keyword, so its real 12-18 years
// correctly lands it at "lead" via the years path instead.
function inferSeniority(title: string, experience: string): NormalizedOpportunityInput["seniority"] {
  const t = title.toLowerCase();
  if (isInternshipSignal(t)) return "intern";
  if (t.includes("junior") || t.includes("entry") || t.includes("graduate") || t.includes("trainee")) return "junior";
  if (t.includes("senior") || t.includes("sr.")) return "senior";
  // Plain .includes("lead") also matches inside "Lead Generation" — a
  // marketing function, not a seniority level — which was caught in
  // testing on "Digital Marketing & Lead Generation Executive" incorrectly
  // landing on "lead". Excluding that specific phrase while still catching
  // genuine cases like "Lead Internal Auditor" or "Team Lead, ...".
  const hasLeadSeniority = /\blead\b/.test(t) && !/\blead\s+generation\b/.test(t);
  if (hasLeadSeniority || t.includes("principal") || t.includes("head of") || t.includes("chief") || t.includes("director"))
    return "lead";

  const years = parseMinYears(experience);
  if (years !== null) return seniorityFromYears(years);
  return "mid";
}

// working_hours carries the work-type as a trailing modifier, e.g.
// "Full Time , Remote". No modifier present (just "Full Time") is treated
// as onsite — the default for Nigerian listings that don't state
// otherwise, not an explicit signal from the source.
function inferWorkType(workingHours: string): NormalizedOpportunityInput["workType"] {
  const t = workingHours.toLowerCase();
  if (t.includes("remote")) return "remote";
  if (t.includes("hybrid")) return "hybrid";
  return "onsite";
}

function inferEmploymentType(
  contract: string,
  workingHours: string,
  title: string
): NormalizedOpportunityInput["employmentType"] {
  const c = contract.toLowerCase();
  const w = workingHours.toLowerCase();
  const t = title.toLowerCase();
  if (isInternshipSignal(t) || isInternshipSignal(c)) return "internship";
  if (w.includes("part") || c.includes("part")) return "part-time";
  if (c.includes("contract") || c.includes("temporary") || c.includes("freelance") || c.includes("consult")) return "contract";
  // Covers "Permanent" (the observed default) and anything else unstated.
  return "full-time";
}

function buildMyJobMagSource(feed: MyJobMagFeedConfig): JobSource {
  const sourceName = `MyJobMag ${feed.label}`;

  return {
    name: sourceName,

    async fetchOpportunities(): Promise<RawOpportunity[]> {
      const feedUrl = process.env[feed.envKeyOverride] || feed.defaultUrl;
      const res = await fetch(feedUrl);
      if (!res.ok) {
        throw new Error(`MyJobMag ${feed.label} request failed: ${res.status} ${res.statusText}`);
      }
      const xml = await res.text();
      const parsed = xmlParser.parse(xml);
      const items = parsed?.rss?.channel?.item ?? [];
      return items as RawOpportunity[];
    },

    normalizeOpportunity(raw: RawOpportunity): NormalizedOpportunityInput {
      const item = raw as unknown as MyJobMagItem;

      const title = textOf(item.position);
      const company = textOf(item.company) || "Unknown company";
      const experience = textOf(item.experience);
      const contract = textOf(item.contract);
      const workingHours = textOf(item.working_hours);
      const description = cleanText(textOf(item.description));
      const location = textOf(item.location) || textOf(item.region) || undefined;
      const link = textOf(item.link);
      const id = textOf(item.id);
      const pubDateRaw = textOf(item.pubDate);

      const text = `${title} ${description}`;

      return {
        source: sourceName,
        externalId: id || link,
        title,
        description,
        company: { name: company },
        location,
        workType: inferWorkType(workingHours),
        employmentType: inferEmploymentType(contract, workingHours, title),
        seniority: inferSeniority(title, experience),
        // No structured salary field in this feed (the <salary> tag was
        // empty in every sample observed) — left unparsed rather than
        // guessed.
        salary: undefined,
        skills: extractSkillsFromText(text),
        postedAt: pubDateRaw && !Number.isNaN(Date.parse(pubDateRaw)) ? pubDateRaw : new Date().toISOString(),
        detectedAt: new Date().toISOString(),
        originalUrl: link,
        trust: {
          // A direct publisher feed, not a multi-source aggregator — same
          // tier as Greenhouse/Lever's own direct-posting trust default.
          score: 80,
          level: "low-concern",
          signals: [`Sourced directly from MyJobMag ${feed.label}'s official RSS feed`],
          concerns: [],
        },
      };
    },
  };
}

// One JobSource per feed configured in myjobmag-feeds.ts.
export const MyJobMagSources: JobSource[] = MYJOBMAG_FEEDS.map(buildMyJobMagSource);
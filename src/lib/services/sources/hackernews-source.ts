// SOURCE INTEGRATION:
// Hacker News — the monthly "Ask HN: Who is hiring?" thread. Free, no key.
//
//   1. Find the newest threads:  https://hn.algolia.com/api/v1/search_by_date
//        ?tags=story,author_whoishiring        (title must start "Ask HN: Who is hiring?",
//        which skips the "Who wants to be hired?" and freelancer threads)
//   2. Fetch a thread with all comments: https://hn.algolia.com/api/v1/items/{id}
//        Each TOP-LEVEL comment is one job post; replies are ignored.
//
// Shape confirmed against the live October 2026 thread: items/{id} returns
// { author, children: [{ id, created_at, created_at_i, author, text (HTML),
// parent_id, story_id, type, children }] }.
//
// HONEST LIMITS: these are free-text comments written by anyone, not structured
// listings. The common convention is a first line like
//   "Company | Role | Location | REMOTE | Full-time | https://..."
// and this adapter parses that by splitting on "|". Posts that don't follow it
// still come through, with whatever could be read (company = first segment, role
// falls back to "Multiple roles"). Salary is never extracted. Trust is lower than
// ATS-sourced jobs because anyone can post.
//
// If the thread is under 5 days old (few posts so far) the previous month's
// thread is included too.

import type { JobSource, RawOpportunity } from "./job-source";
import type { NormalizedOpportunityInput } from "./types";
import { extractSkillsFromText } from "@/lib/sources/skill-vocabulary";
import { employmentFromText, htmlToText, seniorityFromTitle, USER_AGENT } from "./text-utils";

interface HnComment {
  id: number;
  created_at: string;
  author: string | null;
  text: string | null;
  story_id?: number;
}

const ROLE_WORDS =
  /\b(engineer|developer|designer|manager|scientist|analyst|architect|devops|sre|recruiter|researcher|writer|marketer|marketing|sales|product|support|operations|ops|founder|intern|lead|head|director|cto|full[- ]?stack|front[- ]?end|back[- ]?end|mobile|ios|android|data|ml|ai|qa|security)\b/i;
const WORK_WORDS = /\b(remote|onsite|on-site|on site|hybrid)\b/i;
const EMPLOYMENT_WORDS = /\b(full[- ]?time|part[- ]?time|contract(or)?|intern(ship)?|freelance)\b/i;

// The first "line" of a post: HN separates paragraphs with <p>, so the header
// is the text before the first paragraph break.
function firstLine(html: string): string {
  const head = html.split(/<p>|<br\s*\/?>/i)[0] ?? html;
  return htmlToText(head);
}

export function parseHnPost(html: string): {
  company: string;
  role: string;
  location?: string;
  workType: NormalizedOpportunityInput["workType"];
  employmentType: NormalizedOpportunityInput["employmentType"];
} {
  const header = firstLine(html);
  const segments = header.split("|").map((s) => s.trim()).filter(Boolean);
  // Posts that skip the "|" convention often start "Acme is hiring ..." or "Acme, a ...":
  // keep just the name before the first such break.
  const rawCompany = segments.length > 1 ? segments[0] : (segments[0] ?? "").split(/\s+(?:is|are|—|-|–)\s+|[,:(]/)[0];
  const company = (rawCompany || "Unknown company").replace(/\s+\(YC [A-Z]\d{2}\)/i, "").trim().slice(0, 80);
  const rest = segments.slice(1).filter((s) => !/^https?:\/\//i.test(s));

  const roleSeg = rest.find((s) => ROLE_WORDS.test(s) && !WORK_WORDS.test(s) && s.length <= 120);
  // Location: the first remaining short segment that isn't the role, an
  // employment type, or a bare work-type word.
  const locSeg = rest.find(
    (s) =>
      s !== roleSeg &&
      s.length <= 60 &&
      !EMPLOYMENT_WORDS.test(s) &&
      !/^(remote|onsite|on-site|on site|hybrid)$/i.test(s)
  );
  const workHaystack = rest.join(" | ");
  const workType: NormalizedOpportunityInput["workType"] = /\bhybrid\b/i.test(workHaystack)
    ? "hybrid"
    : /\bremote\b/i.test(workHaystack) && !/\bonsite\b|\bon-site\b/i.test(workHaystack)
      ? "remote"
      : /\bonsite\b|\bon-site\b|\bon site\b/i.test(workHaystack)
        ? "onsite"
        : /\bremote\b/i.test(htmlToText(html).slice(0, 400))
          ? "remote"
          : "onsite";

  return {
    company,
    role: roleSeg ?? "Multiple roles",
    location: locSeg,
    workType,
    employmentType: employmentFromText(rest.find((s) => EMPLOYMENT_WORDS.test(s)) ?? ""),
  };
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } });
  if (!res.ok) throw new Error(`Hacker News request failed: ${res.status} ${res.statusText} (${url})`);
  return (await res.json()) as T;
}

export const HackerNewsSource: JobSource = {
  name: "Hacker News",

  async fetchOpportunities(): Promise<RawOpportunity[]> {
    const search = await getJson<{ hits: { objectID: string; title: string; created_at: string }[] }>(
      "https://hn.algolia.com/api/v1/search_by_date?tags=story,author_whoishiring&hitsPerPage=6"
    );
    const threads = (search.hits ?? []).filter((h) => /^ask hn: who is hiring\?/i.test(h.title));
    if (threads.length === 0) return [];

    const chosen = [threads[0]];
    const ageDays = (Date.now() - Date.parse(threads[0].created_at)) / 86_400_000;
    if (ageDays < 5 && threads[1]) chosen.push(threads[1]);

    const out: HnComment[] = [];
    for (const t of chosen) {
      const item = await getJson<{ children?: HnComment[] }>(`https://hn.algolia.com/api/v1/items/${t.objectID}`);
      for (const c of item.children ?? []) {
        // Deleted/dead comments have no text; skip them.
        if (c.text) out.push({ ...c, story_id: Number(t.objectID) });
      }
    }
    return out as unknown as RawOpportunity[];
  },

  normalizeOpportunity(raw: RawOpportunity): NormalizedOpportunityInput {
    const c = raw as unknown as HnComment;
    const html = c.text ?? "";
    const post = parseHnPost(html);
    const description = htmlToText(html);
    const text = `${post.role} ${description}`;

    return {
      source: "Hacker News",
      externalId: String(c.id),
      title: post.role === "Multiple roles" ? `${post.company} is hiring` : post.role,
      description,
      company: { name: post.company },
      location: post.location,
      workType: post.workType,
      employmentType: post.employmentType,
      seniority: seniorityFromTitle(post.role),
      salary: undefined,
      skills: extractSkillsFromText(text),
      postedAt: c.created_at,
      detectedAt: new Date().toISOString(),
      // The post itself; the apply link/email is inside the description text.
      originalUrl: `https://news.ycombinator.com/item?id=${c.id}`,
      trust: {
        score: 65,
        level: "low-concern",
        signals: ["Posted in the monthly Hacker News 'Who is hiring?' thread"],
        concerns: ["Free-text community post; details were read automatically, so check the original"],
      },
    };
  },
};

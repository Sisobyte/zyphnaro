// Job postings (Adzuna, Greenhouse, Lever, Jooble, MyJobMag, Remotive, Remote OK,
// Himalayas, Hacker News) don't return a structured skills list, just free-text
// title and description. This vocabulary is matched against that text to give each
// posting a skills list, deliberately spanning many fields (not just engineering).
//
// This is keyword matching, not NLP/AI. Three things to know:
//  1. The list lives in skill-catalog.ts (every field, with aliases). It only finds skills that are IN that catalog. A skill missing here never shows
//     up anywhere (matching, Skill Gaps, Analytics), however common it is in real
//     postings. Extend the list freely, then re-run `npm run sync:sources` so
//     existing listings are re-read.
//  2. Words that are also ordinary English ("Go", "Swift", "Excel", "Ruby", "Rust")
//     are matched with stricter rules (see PATTERN_OVERRIDES), or they would
//     "appear" in most listings ("go the extra mile", "excel in this role").
//  3. When a posting mentions more than `max` skills, the ones mentioned MOST OFTEN
//     are kept (ties go to list order), not just whichever come first in this list.
//
// Deliberately NOT in the list: "Communication", "Operations" and "Writing". They
// appear in nearly every posting, so they say nothing about fit and used to crowd
// out real skills on the Skill Gaps page.

import { SKILL_CATALOG } from "./skill-catalog";

// Canonical skill names in catalog order, plus a lookup from every alias
// (lower-cased) to its canonical name.
const ALIAS_TO_CANONICAL = new Map<string, string>();
const ALIASES_BY_SKILL: [canonical: string, aliases: string[]][] = [];
for (const entries of Object.values(SKILL_CATALOG)) {
  for (const entry of entries) {
    const [canonical, ...aliases] = entry.split("|").map((x) => x.trim()).filter(Boolean);
    if (!canonical) continue;
    ALIAS_TO_CANONICAL.set(canonical.toLowerCase(), canonical);
    for (const a of aliases) ALIAS_TO_CANONICAL.set(a.toLowerCase(), canonical);
    if (!ALIASES_BY_SKILL.some(([c]) => c === canonical)) ALIASES_BY_SKILL.push([canonical, [canonical, ...aliases]]);
  }
}

export const SKILL_VOCABULARY: string[] = ALIASES_BY_SKILL.map(([c]) => c);

/** Maps any known spelling ("MS Excel", "reactjs") to its canonical name. Unknown skills are returned trimmed, unchanged. */
export function canonicalizeSkill(skill: string): string {
  const t = skill.trim();
  return ALIAS_TO_CANONICAL.get(t.toLowerCase()) ?? t;
}

/** Canonicalize, lower-case and de-duplicate a list of skills (for comparing a CV with listings). */
export function normalizeSkillList(skills: string[]): string[] {
  return Array.from(new Set(skills.map((s) => canonicalizeSkill(s).toLowerCase()).filter(Boolean)));
}

/** The canonical skill names, for prompts. */
export function skillNamesForPrompt(): string {
  return SKILL_VOCABULARY.join(", ");
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Skills whose name is also an everyday word get a hand-written pattern instead
// of the default case-insensitive whole-word match.
const PATTERN_OVERRIDES: Record<string, RegExp> = {
  // "Go" the language: "Golang", or "Go" inside a list ("Python, Go, Java",
  // "Go/Rust", "Java and Go"). Never "go the extra mile" or "go-to-market".
  Go: new RegExp(
    String.raw`\b[Gg]olang\b|(?<=[,/(:]\s*)Go(?![A-Za-z0-9-])(?!\s+(?:to|get|live|for|with|beyond|above|the|where|after|ahead)\b)|(?<=\b(?:and|or)\s+)Go(?![A-Za-z0-9-])(?!\s+(?:to|get|live|for|with|beyond|above|the|where|after|ahead)\b)`,
    "g"
  ),
  // The spreadsheet, not the verb ("excel in a fast-paced environment").
  Excel: /(?<![A-Za-z0-9])Excel(?![A-Za-z0-9])(?!\s+(?:at|in|on|with|as|by|to|your|within|every|beyond|and\s+(?:grow|lead)))/g,
  // The language, not "swift decisions".
  Swift: /(?<![A-Za-z0-9])Swift(?:UI)?(?![A-Za-z0-9])(?!\s+(?:decision|action|response|resolution|and\s+efficient))/g,
  Ruby: /(?<![A-Za-z0-9])Ruby(?![A-Za-z0-9])/g,
  Rust: /(?<![A-Za-z0-9])Rust(?![A-Za-z0-9])/g,
  "Google Cloud": /(?<![A-Za-z0-9])(?:Google Cloud|GCP)(?![A-Za-z0-9])/gi,
};

const SKILL_PATTERNS: [skill: string, pattern: RegExp][] = ALIASES_BY_SKILL.map(([skill, names]) => [
  skill,
  PATTERN_OVERRIDES[skill] ??
    // (?<![a-zA-Z0-9]) / (?![a-zA-Z0-9]) rather than \b: \b fails to anchor after a
    // trailing symbol (e.g. "Node.js", "CI/CD").
    new RegExp(
      names.map((n) => `(?<![a-zA-Z0-9])${escapeRegExp(n.toLowerCase())}(?![a-zA-Z0-9])`).join("|"),
      "gi"
    ),
]);

export function extractSkillsFromText(text: string, max = 8): string[] {
  const found: { skill: string; count: number; order: number }[] = [];
  SKILL_PATTERNS.forEach(([skill, pattern], order) => {
    const hits = text.match(pattern);
    if (hits && hits.length > 0) found.push({ skill, count: hits.length, order });
  });
  // Most-mentioned first; ties keep vocabulary order.
  found.sort((a, b) => b.count - a.count || a.order - b.order);
  return found.slice(0, max).map((f) => f.skill);
}

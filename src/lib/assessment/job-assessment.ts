// Reads a listing ONCE and produces normalized requirements: which skills are
// essential vs preferred, which responsibilities it carries, whether a
// "junior" label hides senior duties, and which eligibility requirements
// (language, work permit ...) nobody has checked yet.
//
// It is rule-based and conservative on purpose: it flags things for a person
// to read, it never re-grades the level or declares a job unsuitable.

import { extractSkillsFromText } from "@/lib/sources/skill-vocabulary";
import type { SeniorityLevel } from "@/lib/types/opportunity";
import { SIGNALS } from "./signals";
import type { JobAssessment, JobSignal, LeadershipDemand, UnverifiedKind, UnverifiedRequirement } from "./types";

export interface AssessJobInput {
  title: string;
  description?: string;
  skills: string[];
  seniority: SeniorityLevel;
}

const TITLE_LEVEL_WORD = /\b(intern(?:s|ship)?|junior|jr\.?|entry[- ]level|graduate|trainee|senior|sr\.?|staff|lead|principal|head of|director|vp|chief|manager)\b/i;

// Section headings. Longer phrases first so "preferred qualifications" wins over "qualifications".
const ESSENTIAL_HEADINGS =
  String.raw`minimum qualifications|basic qualifications|required qualifications|required skills|must[- ]haves?|what you(?:'|’)ll need|what you bring|what we(?:'|’)re looking for|who you are|about you|your profile|you have|requirements|qualifications`;
const PREFERRED_HEADINGS =
  String.raw`preferred qualifications|preferred skills|preferred experience|nice[- ]to[- ]haves?|bonus points|bonus skills|good to have|desirable|extra credit`;
const OTHER_HEADINGS =
  String.raw`responsibilities|what you(?:'|’)ll do|the role|about us|about the company|about the team|benefits|what we offer|perks|how to apply|our culture|compensation|why join`;

const HEADING_RE = new RegExp(
  String.raw`(?<![a-z])(${PREFERRED_HEADINGS}|${ESSENTIAL_HEADINGS}|${OTHER_HEADINGS})(?![a-z])`,
  "gi"
);
const PREFERRED_SENTENCE = /\b(?:is|are)\s+(?:a\s+)?(?:plus|bonus|nice to have|an advantage|desirable|preferred)\b|\ba plus\b|\bnice to have\b/i;

type Section = "essential" | "preferred" | "other" | "none";

function classifyHeading(h: string): Section {
  const t = h.toLowerCase();
  if (new RegExp(`^(?:${PREFERRED_HEADINGS})$`, "i").test(t)) return "preferred";
  if (new RegExp(`^(?:${ESSENTIAL_HEADINGS})$`, "i").test(t)) return "essential";
  return "other";
}

function splitSections(text: string): { section: Section; text: string }[] {
  const out: { section: Section; text: string }[] = [];
  let last = 0;
  let current: Section = "none";
  for (const m of text.matchAll(HEADING_RE)) {
    const at = m.index ?? 0;
    if (at > last) out.push({ section: current, text: text.slice(last, at) });
    current = classifyHeading(m[1]);
    last = at + m[0].length;
  }
  if (last < text.length) out.push({ section: current, text: text.slice(last) });
  return out;
}

function classifySkills(text: string, listed: string[]): JobAssessment["requirements"] {
  const listedKeys = new Map(listed.map((s) => [s.toLowerCase(), s]));
  const essential = new Set<string>();
  const preferred = new Set<string>();
  let structured = false;

  for (const part of splitSections(text)) {
    if (part.section === "essential") structured = true;
    if (part.section === "preferred") structured = true;
    const sentences = part.text.split(/(?<=[.!?;])\s+|\n+|\s[•·]\s/);
    for (const sentence of sentences) {
      const bucket: Section = PREFERRED_SENTENCE.test(sentence) ? "preferred" : part.section;
      if (bucket !== "essential" && bucket !== "preferred") continue;
      for (const skill of extractSkillsFromText(sentence, 40)) {
        const key = listedKeys.get(skill.toLowerCase());
        if (!key) continue;
        (bucket === "essential" ? essential : preferred).add(key);
      }
    }
  }
  for (const s of essential) preferred.delete(s);
  const unspecified = listed.filter((s) => !essential.has(s) && !preferred.has(s));
  return { essential: [...essential], preferred: [...preferred], unspecified, structured };
}

function findSignals(text: string): JobSignal[] {
  const lower = text.toLowerCase();
  const found: JobSignal[] = [];
  for (const def of SIGNALS) {
    const m = lower.match(def.job);
    if (m) found.push({ id: def.id, label: def.label, evidence: m[0].trim() });
  }
  return found;
}

function findYears(text: string): number | undefined {
  const re = /(\d{1,2})\s*(?:\+|plus|or more)?\s*(?:-\s*\d+\s*)?years?(?:'|’)?\s*(?:of\s+)?(?:[\w-]+\s+){0,3}experience/gi;
  const years = [...text.matchAll(re)].map((m) => Number(m[1])).filter((n) => n > 0 && n < 40);
  return years.length ? Math.min(...years) : undefined;
}

const UNVERIFIED: { kind: UnverifiedKind; re: RegExp }[] = [
  {
    kind: "language",
    re: /\b(?:fluent|fluency|proficien(?:t|cy)|native|business[- ]level|professional)\s+(?:level\s+)?(?:in\s+)?(?:written and spoken\s+)?(?:english|french|german|spanish|portuguese|arabic|dutch|italian|mandarin|chinese|japanese|korean|russian|hindi|swahili|yoruba|hausa)\b/i,
  },
  {
    kind: "work-authorization",
    re: /\b(?:work permit|work authori[sz]ation|right to work|visa sponsorship|authori[sz]ed to work|eligible to work|security clearance|must be (?:a )?(?:citizen|resident)|(?:us|u\.s\.|uk|eu) citizen(?:ship)?)\b/i,
  },
  { kind: "enrolment", re: /\b(?:currently enrolled|must be (?:a )?(?:current )?student|enrolled in (?:a|an)\s+\w+)/i },
  { kind: "licence", re: /\b(?:valid|current)\s+(?:driver(?:'|’)?s?\s+)?licen[sc]e\b|\b(?:licen[sc]e|certification) (?:is )?required\b|\bmust (?:hold|have) (?:a |an )?(?:valid )?(?:[\w-]+\s+){0,2}(?:licen[sc]e|certification)\b/i },
];

function findUnverified(text: string): UnverifiedRequirement[] {
  const out: UnverifiedRequirement[] = [];
  for (const { kind, re } of UNVERIFIED) {
    const m = text.match(re);
    if (m) out.push({ kind, text: m[0].trim().replace(/\s+/g, " ") });
  }
  return out;
}

const LEVEL_DEFAULT: SeniorityLevel = "mid";

export function assessJob(input: AssessJobInput): JobAssessment {
  const description = (input.description ?? "").replace(/\s+/g, " ").trim();
  const descriptionAvailable = description.length >= 40;
  const text = `${input.title}. ${description}`;

  const labelOrigin = TITLE_LEVEL_WORD.test(input.title) || input.seniority !== LEVEL_DEFAULT ? "title" : "assumed";

  const signals = descriptionAvailable ? findSignals(description) : [];
  const yearsRequired = descriptionAvailable ? findYears(description) : undefined;
  const leadershipDemand: LeadershipDemand = signals.length >= 2 ? "substantial" : signals.length === 1 ? "some" : "none";

  const juniorLabel = input.seniority === "junior" || input.seniority === "intern";
  const seniorYears = yearsRequired !== undefined && yearsRequired >= 5;
  const reviewFlag = juniorLabel && (signals.length >= 2 || (seniorYears && signals.length >= 1));
  const reviewReason = reviewFlag
    ? `Labelled ${input.seniority}, but the description asks for ${signals.map((s) => s.label).join(", ")}${
        seniorYears ? ` and ${yearsRequired}+ years of experience` : ""
      }. The label may not match the real scope.`
    : undefined;

  return {
    version: 1,
    labelLevel: input.seniority,
    labelOrigin,
    descriptionAvailable,
    signals,
    leadershipDemand,
    yearsRequired,
    reviewFlag,
    reviewReason,
    requirements: descriptionAvailable
      ? classifySkills(text, input.skills)
      : { essential: [], preferred: [], unspecified: [...input.skills], structured: false },
    unverified: descriptionAvailable ? findUnverified(description) : [],
  };
}

// What the live AI is given, and how its answer is checked afterwards.
//
// The AI receives the SAME normalized facts the quick analysis uses and may
// only add reasoning on top. It does not produce a score. If it disagrees
// with a fact it has to say so, with a reason, in a separate list, so the
// facts shown to the user never silently change.

import type { FitAssessment } from "./types";

export interface AIEvidence {
  level: { label: string; origin: "title" | "assumed"; reviewFlag: boolean; reviewReason?: string };
  requirements: { essential: string[]; preferred: string[]; unspecified: string[]; structured: boolean };
  responsibilities: string[];
  yearsRequired?: number;
  candidate: {
    level: string;
    evidence: string;
    listedSkills: string[];
    demonstratedSkills: string[];
    leadershipShown: string[];
    roles: string[];
  };
  scores: { skillMatch: number; experienceMatch: number | null; overall: number };
  strengths: string[];
  concerns: { status: string; text: string }[];
}

export function toAIEvidence(fit: FitAssessment): AIEvidence {
  return {
    level: { label: fit.job.labelLevel, origin: fit.job.labelOrigin, reviewFlag: fit.job.reviewFlag, reviewReason: fit.job.reviewReason },
    requirements: fit.job.requirements,
    responsibilities: fit.job.signals.map((s) => s.label),
    yearsRequired: fit.job.yearsRequired,
    candidate: {
      level: fit.candidate.level,
      evidence: fit.candidate.state,
      listedSkills: fit.candidate.listedSkills.slice(0, 60),
      demonstratedSkills: fit.candidate.demonstratedSkills.slice(0, 60),
      leadershipShown: fit.candidate.leadership,
      roles: fit.candidate.roleTitles.slice(0, 10),
    },
    scores: fit.scores,
    strengths: fit.strengths,
    concerns: fit.concerns.map((c) => ({ status: c.status, text: c.text })),
  };
}

export interface AIReasoning {
  provider: "gemini" | "none";
  summary: string;
  insights: string[];
  recruiterQuestions: string[];
  disagreements: { topic: string; claim: string; reason: string }[];
}

export interface ReconciledReasoning extends AIReasoning {
  /** How many AI lines were dropped for breaking the rules (scores, hiring odds, contradicting the evidence). */
  dropped: number;
}

const FORBIDDEN = /\d\s?%|\bpercent\b|\bprobabilit|\bchances?\s+(?:of|to)\b|\blikely to (?:be hired|get (?:the|an?) (?:job|offer|interview))|\bguarantee/i;

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Removes AI lines that give their own numbers/hiring odds, or that state the
 * opposite of what the profile evidence shows (e.g. "you lack Docker" when
 * Docker is on the profile). Dropped lines are counted, not hidden silently:
 * the UI says how many were removed.
 */
export function reconcileAIReasoning(fit: FitAssessment, ai: AIReasoning): ReconciledReasoning {
  let dropped = 0;
  const have = new Set([...fit.candidate.listedSkills, ...fit.candidate.demonstratedSkills]);
  const jobSkills = [...fit.job.requirements.essential, ...fit.job.requirements.preferred, ...fit.job.requirements.unspecified];
  const owned = jobSkills.filter((s) => have.has(s.toLowerCase()));
  const absent = fit.job.requirements.essential.filter((s) => !have.has(s.toLowerCase()));

  const contradicts = (line: string): boolean => {
    for (const s of owned) {
      const n = escape(s);
      if (new RegExp(`(?:lack|lacks|missing|no experience (?:with|in)|doesn't have|does not have|without)\\b[^.]{0,40}(?<![a-z0-9])${n}(?![a-z0-9])`, "i").test(line)) return true;
    }
    for (const s of absent) {
      const n = escape(s);
      if (new RegExp(`(?:strong|proficient|experienced|expert|skilled|extensive)\\b[^.]{0,30}(?<![a-z0-9])${n}(?![a-z0-9])`, "i").test(line)) return true;
    }
    return false;
  };

  const clean = (lines: string[], max: number): string[] => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const raw of lines) {
      const line = raw.trim();
      if (!line) continue;
      const key = line.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      if (FORBIDDEN.test(line) || contradicts(line)) {
        dropped++;
        continue;
      }
      if (out.length < max) out.push(line);
    }
    return out;
  };

  let summary = ai.summary.trim();
  if (FORBIDDEN.test(summary) || contradicts(summary)) {
    dropped++;
    summary = "";
  }
  const insights = clean(ai.insights, 6);
  const recruiterQuestions = clean(ai.recruiterQuestions, 5);
  const disagreements = ai.disagreements
    .filter((d) => {
      const ok = d.topic.trim() && d.claim.trim() && d.reason.trim().length >= 12 && !FORBIDDEN.test(`${d.claim} ${d.reason}`);
      if (!ok) dropped++;
      return ok;
    })
    .slice(0, 4);

  return { provider: ai.provider, summary, insights, recruiterQuestions, disagreements, dropped };
}

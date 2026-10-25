// What the candidate's CV and saved profile actually SHOW, as opposed to what
// they list. A skill in the skills list is a claim; a skill that appears in a
// job entry or project is demonstrated. The profile (extracted from the CV) is
// the only evidence base: nothing is inferred beyond it.

import { canonicalizeSkill, extractSkillsFromText } from "@/lib/sources/skill-vocabulary";
import type { SeniorityLevel } from "@/lib/types/opportunity";
import { SIGNALS } from "./signals";
import type { CandidateEvidence, EvidenceState, SignalId } from "./types";

/** The slice of UserProfile the assessment reads (keeps tests and callers light). */
export interface CandidateInput {
  seniority: SeniorityLevel;
  skills: string[];
  experience?: { title: string; description: string; skills: string[] }[];
  projects?: { name: string; description: string; skills: string[] }[];
}

function canon(list: string[]): string[] {
  return [...new Set(list.map((s) => canonicalizeSkill(s).toLowerCase()).filter(Boolean))];
}

export function buildCandidateEvidence(user: CandidateInput): CandidateEvidence {
  const experience = (user.experience ?? []).filter((e) => e.title || e.description);
  const projects = (user.projects ?? []).filter((p) => p.name || p.description);
  const listed = canon(user.skills);

  const demonstrated = new Set<string>();
  for (const e of experience) {
    canon(e.skills ?? []).forEach((s) => demonstrated.add(s));
    canon(extractSkillsFromText(e.description ?? "", 40)).forEach((s) => demonstrated.add(s));
  }
  for (const p of projects) {
    canon(p.skills ?? []).forEach((s) => demonstrated.add(s));
    canon(extractSkillsFromText(p.description ?? "", 40)).forEach((s) => demonstrated.add(s));
  }

  const history = [...experience.map((e) => `${e.title}. ${e.description}`), ...projects.map((p) => `${p.name}. ${p.description}`)]
    .join(" \n ")
    .toLowerCase();
  const leadership: SignalId[] = SIGNALS.filter((s) => s.candidate.test(history)).map((s) => s.id);

  let state: EvidenceState;
  if (listed.length === 0 && experience.length === 0 && projects.length === 0) state = "none";
  else if (experience.length === 0 && projects.length === 0) state = "skills-only";
  else if (experience.length > 0 && experience.every((e) => (e.description ?? "").trim().length >= 40)) state = "full";
  else state = "partial";

  return {
    state,
    level: user.seniority,
    listedSkills: listed,
    demonstratedSkills: [...demonstrated],
    leadership,
    roleTitles: experience.map((e) => e.title).filter(Boolean),
  };
}

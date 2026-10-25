// Match engine.
//
// Scores a listing against a candidate from: skill overlap (45%), seniority
// (25%), role fit (20%) and location fit (10%). It is a transparent formula,
// not AI. The SAME rules are implemented in SQL in
// supabase/migrations/0015_match_scoring_v2.sql, which ranks the whole job
// table. If you change a rule here, change it there too, or the list order
// and the score shown on a card will disagree.
//
// What it does NOT know: language requirements, student/enrolment
// requirements, visa rules, or skills outside the keyword vocabulary in
// src/lib/sources/skill-vocabulary.ts. Region restrictions ARE checked (see
// the location score and the cap below).

import { isOpenLocation } from "./region";

export interface MatchInput {
  candidateSkills: string[];
  requiredSkills: string[];
  candidateSeniority: string;
  roleSeniority: string;
}

export interface MatchOutput {
  overall: number;
  skills: number;
  experience: number;
  reason: string;
}

const SENIORITY_ORDER = ["intern", "junior", "mid", "senior", "lead"];

export function computeMatch(input: MatchInput): MatchOutput {
  const candidate = new Set(input.candidateSkills.map((s) => s.toLowerCase()));
  const required = input.requiredSkills.map((s) => s.toLowerCase());
  const overlap = required.filter((s) => candidate.has(s));
  // Smoothed overlap: (matched + 0.8) / (required + 2). A listing with only one
  // or two detected skills is weak evidence, so it can't score a "perfect" 100,
  // and a listing with no detected skills scores 40 ("no evidence of fit"), the
  // same value the database uses. Larger skill lists move toward the raw ratio.
  const skillsScore = Math.round(((overlap.length + 0.8) / (required.length + 2)) * 100);

  const candidateLevel = SENIORITY_ORDER.indexOf(input.candidateSeniority);
  const roleLevel = SENIORITY_ORDER.indexOf(input.roleSeniority);
  const gap = roleLevel - candidateLevel;
  const experienceScore = Math.max(20, 100 - Math.abs(gap) * 20);

  const overall = Math.round(skillsScore * 0.6 + experienceScore * 0.4);

  const missing = required.filter((s) => !candidate.has(s));
  // Neutral wording: "Strong overlap" was printed even for 1 of 6.
  const reason = required.length === 0
    ? "No skills could be read from this listing, so the skills score is a default, not a comparison."
    : missing.length
    ? `Your profile lists ${overlap.length} of the ${required.length} skills found in this listing. Not on your profile: ${missing.join(", ")}.`
    : `Your profile lists all ${required.length} skills found in this listing.`;

  return { overall, skills: skillsScore, experience: experienceScore, reason };
}

export interface OpportunityMatchInput extends MatchInput {
  // Lowercase place terms for the candidate (see candidateRegionTerms in
  // ./region.ts). Empty means the candidate's location is unknown.
  candidatePreferredLocations: string[];
  candidateRemotePreference: "remote-only" | "remote-first" | "hybrid" | "onsite";
  opportunityWorkType: "remote" | "hybrid" | "onsite";
  opportunityLocation?: string;
  candidatePrimaryRole: string;
  opportunityTitle: string;
}

export interface OpportunityMatchOutput {
  overall: number;
  skills: number;
  experience: number;
  role: number;
  location: number;
  // True when the listing is restricted to a region the candidate isn't in.
  // The overall score is then capped (see REGION_CAP).
  regionRestricted: boolean;
  reason: string;
}

// A listing restricted to a region the candidate isn't in can't score above
// this, however well the skills line up. It keeps such jobs out of Matches (70%+).
export const REGION_CAP = 55;

// Extends computeMatch() with role-fit and location-fit sub-scores, used to
// build the full MatchBreakdown shown on opportunity cards. Role fit and
// location fit are intentionally simple heuristics (keyword overlap /
// remote-preference matching) rather than an ML model — good enough to be
// explainable and non-random, upgradeable later without changing callers.
export function computeOpportunityMatch(input: OpportunityMatchInput): OpportunityMatchOutput {
  const base = computeMatch(input);

  const roleWords = input.candidatePrimaryRole.toLowerCase().split(/\s+/).filter(Boolean);
  const titleLower = input.opportunityTitle.toLowerCase();
  const roleWordHits = roleWords.filter((w) => titleLower.includes(w)).length;
  const role = roleWords.length
    ? Math.round((roleWordHits / roleWords.length) * 60 + base.skills * 0.4)
    : base.skills;

  const terms = input.candidatePreferredLocations.map((l) => l.toLowerCase());
  const loc = (input.opportunityLocation ?? "").toLowerCase();
  const open = isOpenLocation(input.opportunityLocation);
  const matchesCandidate = !!loc && terms.some((t) => loc.includes(t));
  const remoteOk = input.opportunityWorkType === "remote" && input.candidateRemotePreference !== "onsite";

  let location: number;
  if (terms.length === 0) {
    // Candidate location unknown: no region check (original behaviour).
    if (remoteOk) location = 100;
    else if (input.candidateRemotePreference === "remote-only" && input.opportunityWorkType !== "remote") location = 30;
    else location = 60;
  } else if (input.candidateRemotePreference === "remote-only" && input.opportunityWorkType !== "remote" && !matchesCandidate) {
    location = 30;
  } else if (matchesCandidate) {
    location = remoteOk ? 100 : 90;
  } else if (open) {
    location = remoteOk ? 100 : 60;
  } else {
    // Restricted to somewhere the candidate isn't (e.g. "Germany").
    location = 30;
  }
  const regionRestricted = location <= 30;

  const weighted = Math.round(base.skills * 0.45 + base.experience * 0.25 + role * 0.2 + location * 0.1);
  const overall = regionRestricted ? Math.min(weighted, REGION_CAP) : weighted;
  const reason = regionRestricted
    ? `${base.reason} This listing is limited to ${input.opportunityLocation || "another region"}, which doesn't match your location.`
    : base.reason;

  return { overall, skills: base.skills, experience: base.experience, role, location, regionRestricted, reason };
}

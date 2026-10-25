// Shared shapes for the job/candidate assessment. Everything the app shows
// about "how well do I fit this job" (quick analysis, concerns, recommendations)
// and everything the live AI is told comes from these types, so the two can't
// drift apart.

import type { SeniorityLevel } from "@/lib/types/opportunity";

export type SignalId =
  | "strategy"
  | "architecture"
  | "mentoring"
  | "people-management"
  | "org-standards"
  | "budget-ownership";

/** A responsibility the listing asks the hire to carry, with the words it was found in. */
export interface JobSignal {
  id: SignalId;
  label: string;
  evidence: string;
}

export type UnverifiedKind = "language" | "work-authorization" | "enrolment" | "licence";

export interface UnverifiedRequirement {
  kind: UnverifiedKind;
  /** The phrase in the listing, trimmed. */
  text: string;
}

/**
 * Where the level label came from.
 *  - "title":   the job title contains a level word (Junior, Senior, Lead ...).
 *  - "assumed": the title says nothing, so "mid" is Zyphnaro's default, NOT
 *               information from the source.
 */
export type LabelOrigin = "title" | "assumed";

export type LeadershipDemand = "none" | "some" | "substantial";

export interface JobAssessment {
  version: 1;
  /** Level stored on the listing. Never changed by the assessment. */
  labelLevel: SeniorityLevel;
  labelOrigin: LabelOrigin;
  descriptionAvailable: boolean;
  signals: JobSignal[];
  leadershipDemand: LeadershipDemand;
  /** Years of experience the text asks for, when it says (lowest figure). */
  yearsRequired?: number;
  /**
   * True when the listing is labelled intern/junior but the description asks for
   * substantial senior responsibilities. This is a prompt to read the listing,
   * not a re-grading: the label above is untouched.
   */
  reviewFlag: boolean;
  reviewReason?: string;
  requirements: {
    essential: string[];
    preferred: string[];
    /** Detected in the listing but the text doesn't say whether they are required. */
    unspecified: string[];
    /** True when the listing has Requirements / Nice-to-have style sections. */
    structured: boolean;
  };
  unverified: UnverifiedRequirement[];
}

export type ConcernKind =
  | "seniority-mismatch"
  | "level-label-review"
  | "missing-essential"
  | "missing-skills-unranked"
  | "insufficient-leadership"
  | "region"
  | "listing-unreadable"
  | "incomplete-profile"
  | UnverifiedKind;

/**
 * evidence-gap: the profile/listing evidence points at a real gap.
 * to-verify:    Zyphnaro can't check this automatically. NOT a confirmed problem.
 */
export type ConcernStatus = "evidence-gap" | "to-verify";

export interface Concern {
  id: string;
  kind: ConcernKind;
  status: ConcernStatus;
  text: string;
}

export type EvidenceState = "none" | "skills-only" | "partial" | "full";

export interface CandidateEvidence {
  state: EvidenceState;
  level: SeniorityLevel;
  listedSkills: string[];
  /** Skills that appear in a job or project entry, not just in the skills list. */
  demonstratedSkills: string[];
  leadership: SignalId[];
  roleTitles: string[];
}

export interface Recommendations {
  /** Skills the profile lists for this job but doesn't show in any role/project. */
  strengthen: string[];
  /** Missing skills worth learning, essential first. */
  learn: string[];
  /** Gaps a technology course can't close (leading, mentoring, owning architecture). */
  experience: string[];
  recruiterQuestions: string[];
}

export type AssessmentQuality = "ok" | "limited" | "insufficient";

export interface FitAssessment {
  version: 1;
  job: JobAssessment;
  candidate: CandidateEvidence;
  scores: {
    /** Share of the skills found in the listing that the profile lists (same number as the match tiles). */
    skillMatch: number;
    /** Evidence-based; null when the profile doesn't have enough to judge. */
    experienceMatch: number | null;
    /** The headline match score shown everywhere else. */
    overall: number;
  };
  strengths: string[];
  concerns: Concern[];
  recommendations: Recommendations;
  /** "insufficient" means: don't ask the AI, say there isn't enough information. */
  quality: AssessmentQuality;
  qualityNote?: string;
}

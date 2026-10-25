// The single place that turns (job reading + candidate evidence + headline
// match) into what the user sees: strengths, concerns, recommendations and an
// experience-evidence score. The quick analysis AND the live AI both start
// from this object, so they cannot disagree about facts.
//
// Scores are never presented as a chance of being hired. They estimate how
// well the evidence on the profile lines up with what the listing asks for.

import type { SeniorityLevel } from "@/lib/types/opportunity";
import { buildCandidateEvidence, type CandidateInput } from "./candidate-evidence";
import { assessJob, type AssessJobInput } from "./job-assessment";
import { signalLabel } from "./signals";
import type { Concern, FitAssessment, JobAssessment, Recommendations, SignalId } from "./types";

const ORDER: SeniorityLevel[] = ["intern", "junior", "mid", "senior", "lead"];
const levelIndex = (l: SeniorityLevel) => ORDER.indexOf(l);

export interface FitInput {
  job: AssessJobInput;
  /** Pre-computed job reading (e.g. stored at ingestion). Recomputed when absent or from an older version. */
  jobAssessment?: JobAssessment | null;
  candidate: CandidateInput;
  /** The headline match already shown on cards. Reused, never recomputed here. */
  match: { overall: number; skills: number; regionRestricted?: boolean };
  /** Listing location, used only to word the region concern. */
  location?: string;
}

function list(items: string[], max = 6): string {
  return items.length <= max ? items.join(", ") : `${items.slice(0, max).join(", ")} and ${items.length - max} more`;
}

export function assessFit(input: FitInput): FitAssessment {
  const job = input.jobAssessment && input.jobAssessment.version === 1 ? input.jobAssessment : assessJob(input.job);
  const cand = buildCandidateEvidence(input.candidate);

  const listed = new Set(cand.listedSkills);
  const shown = new Set(cand.demonstratedSkills);
  const has = (s: string) => listed.has(s.toLowerCase()) || shown.has(s.toLowerCase());
  const { essential, preferred, unspecified, structured } = job.requirements;

  const missingEssential = essential.filter((s) => !has(s));
  const missingPreferred = preferred.filter((s) => !has(s));
  const missingUnspecified = unspecified.filter((s) => !has(s));
  const matched = input.job.skills.filter(has);
  const listedOnly = input.job.skills.filter((s) => has(s) && !shown.has(s.toLowerCase()));

  const concerns: Concern[] = [];
  const add = (c: Omit<Concern, "id">) => concerns.push({ ...c, id: `${c.kind}-${concerns.length}` });

  // 1. Profile too thin to judge. One honest concern instead of fake precision.
  if (cand.state === "none") {
    add({ kind: "incomplete-profile", status: "to-verify", text: "Your profile has no skills or work history yet, so fit can't be judged. Upload your CV or fill in your profile." });
  } else if (cand.state === "skills-only") {
    add({ kind: "incomplete-profile", status: "to-verify", text: "Your profile lists skills but no work history or projects, so experience can't be checked against this role." });
  }

  // 2. Level.
  const gap = levelIndex(job.labelLevel) - levelIndex(cand.level);
  if (job.labelOrigin === "title" && cand.state !== "none") {
    if (gap >= 2) {
      add({ kind: "seniority-mismatch", status: "evidence-gap", text: `The title says ${job.labelLevel}; your profile reads as ${cand.level}. That is a ${gap}-level step up.` });
    } else if (gap <= -2) {
      add({ kind: "seniority-mismatch", status: "evidence-gap", text: `The title says ${job.labelLevel}; your profile reads as ${cand.level}. The role may be below your level.` });
    }
  }
  if (job.reviewFlag && job.reviewReason) {
    add({ kind: "level-label-review", status: "to-verify", text: job.reviewReason });
  }

  // 3. Skills, weighted by how much the listing says they matter.
  if (cand.state === "none") {
    // Nothing to compare: the incomplete-profile concern above says so once.
  } else if (input.job.skills.length === 0) {
    if (job.descriptionAvailable) {
      add({ kind: "listing-unreadable", status: "to-verify", text: "No skills could be read from this listing, so the skill score is a rough default. Read the description." });
    }
  } else if (missingEssential.length > 0) {
    add({ kind: "missing-essential", status: "evidence-gap", text: `Essential in the listing but not on your profile: ${list(missingEssential)}.` });
  } else if (!structured && missingUnspecified.length > 0) {
    add({ kind: "missing-skills-unranked", status: "evidence-gap", text: `Listed in the job but not on your profile: ${list(missingUnspecified)}. The listing doesn't say which are essential.` });
  }

  // 4. Leadership and ownership the role asks for.
  const needed = job.signals.map((s) => s.id);
  const evidenced = needed.filter((id) => cand.leadership.includes(id));
  const unevidenced = needed.filter((id) => !cand.leadership.includes(id));
  if (needed.length > 0 && unevidenced.length > 0 && (job.leadershipDemand === "substantial" || evidenced.length === 0)) {
    const names = list(unevidenced.map(signalLabel));
    if (cand.state === "none" || cand.state === "skills-only") {
      // Already covered by the incomplete-profile concern; don't claim a gap we can't see.
    } else {
      add({ kind: "insufficient-leadership", status: "evidence-gap", text: `The listing asks for ${names}. Your profile doesn't show this yet.` });
    }
  }

  // 5. Region.
  if (input.match.regionRestricted) {
    add({ kind: "region", status: "evidence-gap", text: `This listing is limited to ${input.location || "another region"}, which doesn't match your location. Check you're eligible before applying.` });
  }

  // 6. Requirements nobody has checked.
  const unverifiedText: Record<string, string> = {
    language: "language requirement",
    "work-authorization": "work-permit or eligibility requirement",
    enrolment: "study or enrolment requirement",
    licence: "licence or certification requirement",
  };
  for (const u of job.unverified) {
    add({ kind: u.kind, status: "to-verify", text: `Not checked: the listing mentions a ${unverifiedText[u.kind]} ("${u.text}"). Zyphnaro can't confirm this from your profile.` });
  }

  // --- Strengths -----------------------------------------------------------
  const strengths: string[] = [];
  if (matched.length > 0) {
    const essentialHit = essential.filter(has);
    strengths.push(
      structured && essentialHit.length > 0
        ? `You cover ${essentialHit.length} of ${essential.length} essential skills: ${list(essentialHit)}.`
        : `Your profile covers ${matched.length} of the ${input.job.skills.length} skills found in this listing: ${list(matched)}.`
    );
  }
  const demonstratedHits = input.job.skills.filter((s) => shown.has(s.toLowerCase()));
  if (demonstratedHits.length > 0) strengths.push(`Shown in your work history or projects, not just listed: ${list(demonstratedHits)}.`);
  if (evidenced.length > 0) strengths.push(`Your history shows ${list(evidenced.map(signalLabel))}, which this role asks for.`);
  if (gap >= -1 && gap <= 1 && job.labelOrigin === "title" && cand.state !== "none") strengths.push(`The level (${job.labelLevel}) is close to yours (${cand.level}).`);

  // --- Experience evidence (separate from the skills overlap) -------------
  let experienceMatch: number | null = null;
  if (cand.state === "full" || cand.state === "partial") {
    const base = essential.length > 0 ? essential : input.job.skills;
    const demoRatio = base.length === 0 ? null : base.filter((s) => shown.has(s.toLowerCase())).length / base.length;
    const levelFit = Math.max(20, 100 - Math.abs(gap) * 20);
    const leadCoverage = needed.length === 0 ? null : evidenced.length / needed.length;
    const leadScore = leadCoverage === null ? null : 15 + 85 * leadCoverage;

    const parts: [number, number][] = [];
    if (demoRatio !== null) parts.push([demoRatio * 100, 0.4]);
    parts.push([levelFit, 0.3]);
    if (leadScore !== null && job.leadershipDemand !== "none") parts.push([leadScore, 0.3]);
    const weight = parts.reduce((a, [, w]) => a + w, 0);
    experienceMatch = Math.round(parts.reduce((a, [v, w]) => a + v * w, 0) / weight);
  }

  // --- Recommendations ------------------------------------------------------
  const rec: Recommendations = { strengthen: [], learn: [], experience: [], recruiterQuestions: [] };
  rec.strengthen = listedOnly.slice(0, 6);
  rec.learn = [...missingEssential, ...(structured ? missingPreferred : []), ...(!structured ? missingUnspecified : [])].slice(0, 6);
  if (unevidenced.length > 0 && cand.state !== "none" && cand.state !== "skills-only") {
    for (const id of unevidenced as SignalId[]) {
      rec.experience.push(
        `"${signalLabel(id)}" is experience, not a technology: no course covers it. Look for a way to take it on in your current work, or describe a real example in your CV if you already have one.`
      );
    }
  }
  if (job.reviewFlag) rec.recruiterQuestions.push("Is this role scoped as junior? The description mentions " + list(job.signals.map((s) => s.label)) + ". What would I be expected to own in the first year?");
  if (!structured && input.job.skills.length > 1) rec.recruiterQuestions.push("Which of the listed skills are essential and which are nice to have?");
  for (const u of job.unverified) {
    const q: Record<string, string> = {
      language: `The listing mentions "${u.text}". What level is actually needed day to day?`,
      "work-authorization": `The listing mentions "${u.text}". Do you sponsor, or hire from my location?`,
      enrolment: `The listing mentions "${u.text}". Does this apply to my situation?`,
      licence: `The listing mentions "${u.text}". Is it required before starting, or can it be obtained after hiring?`,
    };
    rec.recruiterQuestions.push(q[u.kind]);
  }
  if (input.match.regionRestricted) rec.recruiterQuestions.push("The listing is tied to a region I'm not in. Can I be hired remotely or relocate?");
  if (unevidenced.length > 0) rec.recruiterQuestions.push(`How much of the role is ${list(unevidenced.map(signalLabel), 3)}, and what does support look like?`);

  // --- Quality gate ---------------------------------------------------------
  let quality: FitAssessment["quality"] = "ok";
  let qualityNote: string | undefined;
  if (cand.state === "none") {
    quality = "insufficient";
    qualityNote = "Your profile has no skills or work history, so there is nothing to compare with this job.";
  } else if (input.job.skills.length === 0 && !job.descriptionAvailable) {
    quality = "insufficient";
    qualityNote = "This listing has no readable description or skills, so there is nothing to compare your profile with.";
  } else if (cand.state === "skills-only" || !job.descriptionAvailable) {
    quality = "limited";
    qualityNote = cand.state === "skills-only"
      ? "Only your skills list is available, so experience can't be assessed."
      : "The full job description isn't loaded, so responsibilities and eligibility weren't checked.";
  }

  return {
    version: 1,
    job,
    candidate: cand,
    scores: { skillMatch: input.match.skills, experienceMatch, overall: input.match.overall },
    strengths,
    concerns,
    recommendations: rec,
    quality,
    qualityNote,
  };
}

export function concernCounts(a: Pick<FitAssessment, "concerns">) {
  const gaps = a.concerns.filter((c) => c.status === "evidence-gap").length;
  return { total: a.concerns.length, gaps, toVerify: a.concerns.length - gaps };
}

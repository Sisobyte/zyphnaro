import { describe, expect, it } from "vitest";
import { assessFit, assessJob, concernCounts, reconcileAIReasoning, toAIEvidence, type AIReasoning } from "..";
import { computeOpportunityMatch } from "@/lib/engines/match-engine";
import * as F from "./fixtures";

const match = (skills: number, overall = 70) => ({ overall, skills });

describe("job reading", () => {
  it("genuine junior role: no senior responsibilities, no review flag, label kept", () => {
    const j = assessJob(F.JUNIOR_GENUINE);
    expect(j.signals).toEqual([]);
    expect(j.reviewFlag).toBe(false);
    expect(j.labelLevel).toBe("junior");
    expect(j.labelOrigin).toBe("title");
    expect(j.requirements.essential).toEqual(expect.arrayContaining(["React", "HTML", "CSS", "Git"]));
    expect(j.requirements.preferred).toEqual(expect.arrayContaining(["Next.js", "Figma"]));
  });

  it("junior-labelled role with architectural leadership: flagged for review, NOT promoted", () => {
    const j = assessJob(F.JUNIOR_LABEL_SENIOR_DUTIES);
    expect(j.signals.map((s) => s.id)).toEqual(expect.arrayContaining(["architecture", "strategy", "mentoring", "people-management", "org-standards"]));
    expect(j.reviewFlag).toBe(true);
    expect(j.reviewReason).toMatch(/Labelled junior/);
    expect(j.labelLevel).toBe("junior"); // the source label is preserved
    expect(j.yearsRequired).toBe(6);
  });

  it("does not treat 'mentorship from senior engineers' or 'team lead' reporting lines as duties", () => {
    const j = assessJob(job("Graduate Analyst", "junior", "You will report to the team lead and receive mentorship from senior analysts. Learn from the team every day while supporting reports."));
    expect(j.signals).toEqual([]);
  });

  it("marks 'mid' as assumed when the title has no level word", () => {
    expect(assessJob(job("Frontend Developer", "mid", "Build interfaces with React and TypeScript for our product team daily.")).labelOrigin).toBe("assumed");
    expect(assessJob(job("Mid-level Frontend Developer", "mid", "Build interfaces with React and TypeScript for our product team daily.")).labelOrigin).toBe("assumed");
  });

  it("separates essential from preferred and leaves unranked skills unspecified", () => {
    const j = assessJob(job("Backend Developer", "mid", "We use Docker. Requirements: Node.js and PostgreSQL. Experience with Kafka is a plus."));
    expect(j.requirements.essential).toEqual(expect.arrayContaining(["Node.js", "PostgreSQL"]));
    expect(j.requirements.preferred).toContain("Kafka");
    expect(j.requirements.unspecified).toContain("Docker");
  });

  it("reports an unstructured listing as such", () => {
    const j = assessJob(job("Backend Developer", "mid", "We build services with Node.js and PostgreSQL for customers in fintech across Europe."));
    expect(j.requirements.structured).toBe(false);
    expect(j.requirements.essential).toEqual([]);
  });

  it("detects eligibility requirements without judging them", () => {
    const j = assessJob(F.SENIOR_BACKEND_ARCHITECT);
    expect(j.unverified.map((u) => u.kind).sort()).toEqual(["language", "work-authorization"]);
  });

  it("is quiet when there is no description (list rows)", () => {
    const j = assessJob({ title: "Senior Dev", seniority: "senior", skills: ["React"], description: "" });
    expect(j.descriptionAvailable).toBe(false);
    expect(j.signals).toEqual([]);
    expect(j.unverified).toEqual([]);
  });
});

describe("fit assessment", () => {
  it("genuine junior role + junior candidate: no concerns, evidence-based experience score", () => {
    const a = assessFit({ job: F.JUNIOR_GENUINE, candidate: F.JUNIOR_CANDIDATE, match: match(80) });
    expect(a.concerns).toEqual([]);
    expect(a.scores.experienceMatch).toBeGreaterThanOrEqual(80);
    expect(a.quality).toBe("ok");
  });

  it("junior-labelled senior-duty role: flags the label and the missing leadership evidence for a junior candidate", () => {
    const a = assessFit({ job: F.JUNIOR_LABEL_SENIOR_DUTIES, candidate: F.JUNIOR_CANDIDATE, match: match(30, 40) });
    const kinds = a.concerns.map((c) => c.kind);
    expect(kinds).toEqual(expect.arrayContaining(["level-label-review", "insufficient-leadership", "missing-essential"]));
    expect(a.concerns.find((c) => c.kind === "level-label-review")?.status).toBe("to-verify");
    expect(a.scores.experienceMatch).toBeLessThan(55);
    expect(a.job.labelLevel).toBe("junior");
    expect(a.recommendations.recruiterQuestions.join(" ")).toMatch(/scoped as junior/);
  });

  it("strong frontend candidate vs backend architect role: skills overlap is not experience suitability", () => {
    // Skill overlap looks decent (Node.js listed); the evidence is not.
    const a = assessFit({ job: F.SENIOR_BACKEND_ARCHITECT, candidate: F.FRONTEND_SENIOR, match: match(60, 62) });
    expect(a.scores.skillMatch).toBe(60);
    expect(a.scores.experienceMatch).not.toBeNull();
    expect(a.scores.experienceMatch!).toBeLessThan(a.scores.skillMatch);
    const missing = a.concerns.find((c) => c.kind === "missing-essential");
    expect(missing?.text).toMatch(/PostgreSQL/);
    expect(missing?.text).toMatch(/Kafka/);
    expect(missing?.text).not.toMatch(/Kubernetes/); // preferred is not an essential gap
    const lead = a.concerns.find((c) => c.kind === "insufficient-leadership");
    expect(lead?.text).toMatch(/architecture/);
    expect(lead?.text).not.toMatch(/mentoring/); // candidate has shown mentoring
    expect(a.candidate.leadership).toContain("mentoring");
    expect(a.recommendations.learn).toEqual(expect.arrayContaining(["PostgreSQL", "Kafka"]));
    expect(a.recommendations.experience.join(" ")).toMatch(/not a technology|experience, not a technology/);
  });

  it("separates unchecked requirements from confirmed gaps", () => {
    const a = assessFit({ job: F.SENIOR_BACKEND_ARCHITECT, candidate: F.FRONTEND_SENIOR, match: match(60) });
    const lang = a.concerns.find((c) => c.kind === "language");
    expect(lang?.status).toBe("to-verify");
    expect(lang?.text).toMatch(/^Not checked/);
    expect(a.concerns.find((c) => c.kind === "missing-essential")?.status).toBe("evidence-gap");
  });

  it("a skill only in the skills list is listed-only, not demonstrated", () => {
    const a = assessFit({
      job: F.job("Frontend Developer", "mid", "Requirements: React and TypeScript and GraphQL. Build product interfaces for a growing team."),
      candidate: { seniority: "mid", skills: ["React", "TypeScript", "GraphQL"], experience: [{ title: "Developer", description: "Built interfaces in React for customers and partners every day.", skills: ["React"] }], projects: [] },
      match: match(90),
    });
    expect(a.recommendations.strengthen).toEqual(expect.arrayContaining(["TypeScript", "GraphQL"]));
    expect(a.recommendations.strengthen).not.toContain("React");
    expect(a.scores.experienceMatch!).toBeLessThan(90);
  });

  it("missing preferred skills never become concerns", () => {
    const a = assessFit({
      job: F.job("Backend Developer", "mid", "Requirements: Node.js. Nice to have: Kafka and Kubernetes. Build services for our platform."),
      candidate: { seniority: "mid", skills: ["Node.js"], experience: [{ title: "Developer", description: "Built Node.js services for the payments team over three years.", skills: ["Node.js"] }], projects: [] },
      match: match(70),
    });
    expect(a.concerns.map((c) => c.kind)).not.toContain("missing-essential");
    expect(a.recommendations.learn).toEqual(expect.arrayContaining(["Kafka", "Kubernetes"]));
  });

  it("missing profile: insufficient, no invented score, one honest concern", () => {
    const a = assessFit({ job: F.JUNIOR_GENUINE, candidate: F.EMPTY_PROFILE, match: match(40) });
    expect(a.quality).toBe("insufficient");
    expect(a.scores.experienceMatch).toBeNull();
    expect(a.concerns.map((c) => c.kind)).toEqual(["incomplete-profile"]);
  });

  it("incomplete profile (skills only): experience is unclear, quality limited, no fabricated leadership gap", () => {
    const a = assessFit({ job: F.SENIOR_BACKEND_ARCHITECT, candidate: F.SKILLS_ONLY, match: match(50) });
    expect(a.quality).toBe("limited");
    expect(a.scores.experienceMatch).toBeNull();
    expect(a.concerns.map((c) => c.kind)).not.toContain("insufficient-leadership");
    expect(a.concerns.map((c) => c.kind)).toContain("incomplete-profile");
  });

  it("the displayed concern count equals the concerns shown", () => {
    for (const [j, c] of [[F.JUNIOR_GENUINE, F.JUNIOR_CANDIDATE], [F.JUNIOR_LABEL_SENIOR_DUTIES, F.JUNIOR_CANDIDATE], [F.SENIOR_BACKEND_ARCHITECT, F.FRONTEND_SENIOR]] as const) {
      const a = assessFit({ job: j, candidate: c, match: match(60) });
      const counts = concernCounts(a);
      expect(counts.total).toBe(a.concerns.length);
      expect(counts.gaps + counts.toVerify).toBe(counts.total);
      expect(new Set(a.concerns.map((x) => x.id)).size).toBe(a.concerns.length);
    }
  });

  it("re-analysis is deterministic and unaffected by AI output", () => {
    const run = () => assessFit({ job: F.SENIOR_BACKEND_ARCHITECT, candidate: F.FRONTEND_SENIOR, match: match(60) });
    const first = run();
    const second = run();
    expect(second).toEqual(first);
    const before = JSON.stringify(first);
    reconcileAIReasoning(first, { provider: "gemini", summary: "x", insights: [], recruiterQuestions: [], disagreements: [] });
    expect(JSON.stringify(first)).toBe(before);
  });

  it("uses a stored ingestion-time reading when present, and ignores a stale version", () => {
    const stored = assessJob(F.JUNIOR_LABEL_SENIOR_DUTIES);
    const a = assessFit({ job: F.JUNIOR_GENUINE, jobAssessment: stored, candidate: F.JUNIOR_CANDIDATE, match: match(60) });
    expect(a.job.reviewFlag).toBe(true);
    const stale = { ...stored, version: 0 } as unknown as typeof stored;
    expect(assessFit({ job: F.JUNIOR_GENUINE, jobAssessment: stale, candidate: F.JUNIOR_CANDIDATE, match: match(60) }).job.reviewFlag).toBe(false);
  });

  it("headline score is reused as given, never recomputed", () => {
    const m = computeOpportunityMatch({
      candidateSkills: ["react"], requiredSkills: ["react", "node.js"], candidateSeniority: "senior", roleSeniority: "senior",
      candidatePreferredLocations: [], candidateRemotePreference: "remote-first", opportunityWorkType: "remote",
      candidatePrimaryRole: "frontend developer", opportunityTitle: "Senior Frontend Developer",
    });
    const a = assessFit({ job: F.job("Senior Frontend Developer", "senior", "Requirements: React and Node.js for our product."), candidate: F.FRONTEND_SENIOR, match: m });
    expect(a.scores.overall).toBe(m.overall);
    expect(a.scores.skillMatch).toBe(m.skills);
  });
});

describe("live AI reconciliation", () => {
  const fit = assessFit({ job: F.SENIOR_BACKEND_ARCHITECT, candidate: F.FRONTEND_SENIOR, match: match(60) });
  const ai = (over: Partial<AIReasoning>): AIReasoning => ({ provider: "gemini", summary: "A senior architecture role.", insights: [], recruiterQuestions: [], disagreements: [], ...over });

  it("hands the AI the same facts the quick analysis shows", () => {
    const e = toAIEvidence(fit);
    expect(e.scores).toEqual(fit.scores);
    expect(e.concerns.map((c) => c.text)).toEqual(fit.concerns.map((c) => c.text));
    expect(e.requirements).toEqual(fit.job.requirements);
    expect(JSON.stringify(e)).not.toMatch(/matchScore/);
  });

  it("drops its own numbers and hiring odds", () => {
    const r = reconcileAIReasoning(fit, ai({ insights: ["You are an 85% match.", "You have a good chance of getting hired.", "Your React depth is a clear asset."] }));
    expect(r.insights).toEqual(["Your React depth is a clear asset."]);
    expect(r.dropped).toBe(2);
  });

  it("drops lines that contradict the evidence (claims a skill the profile lacks / denies one it has)", () => {
    const r = reconcileAIReasoning(fit, ai({ insights: ["You are experienced in Kafka.", "You lack Node.js experience.", "Kafka is central here, and your profile doesn't show it."] }));
    expect(r.insights).toEqual(["Kafka is central here, and your profile doesn't show it."]);
    expect(r.dropped).toBe(2);
  });

  it("keeps a disagreement only when it carries a reason", () => {
    const r = reconcileAIReasoning(fit, ai({ disagreements: [
      { topic: "Level", claim: "This reads as staff level.", reason: "The listing says 'own the architecture across our services'." },
      { topic: "Skills", claim: "Docker is essential.", reason: "" },
    ] }));
    expect(r.disagreements).toHaveLength(1);
    expect(r.dropped).toBe(1);
  });

  it("an unavailable provider yields an explicit empty result, not invented text", () => {
    const r = reconcileAIReasoning(fit, { provider: "none", summary: "", insights: [], recruiterQuestions: [], disagreements: [] });
    expect(r.provider).toBe("none");
    expect(r.insights).toEqual([]);
    expect(r.summary).toBe("");
  });
});

function job(title: string, seniority: "intern" | "junior" | "mid" | "senior" | "lead", description: string) {
  return F.job(title, seniority, description);
}

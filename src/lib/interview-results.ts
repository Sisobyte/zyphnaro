import { strengthFromScore } from "@/lib/interview-scoring";
import type { InterviewResult, InterviewTurn } from "@/lib/types";

const avg = (nums: number[]) => (nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0);

// Marks from sessions saved before numeric scoring existed.
const LEGACY_SCORE = { weak: 25, solid: 60, strong: 85 } as const;

function turnScore(t: InterviewTurn): number {
  const e = t.evaluation;
  if (!e) return 0;
  return e.score ?? LEGACY_SCORE[e.strength];
}

/**
 * Honest result for a session.
 *  - Readiness is the average mark across ALL planned questions. A question you
 *    skipped, or never reached because you ended early or time ran out, counts
 *    as 0, so quitting after one good answer can't look like a high score.
 *  - The four breakdown bars are the averages of the dimension marks the
 *    evaluator gave for the answers you actually gave (no invented numbers).
 */
export function computeInterviewResult(turns: InterviewTurn[], plannedQuestions?: number): InterviewResult {
  const scored = turns.filter((t) => t.evaluation);
  const planned = Math.max(plannedQuestions ?? scored.length, scored.length);
  const scores = scored.map(turnScore);
  const readiness = planned ? Math.round(scores.reduce((a, b) => a + b, 0) / planned) : 0;

  const dim = (key: "technical" | "communication" | "problemSolving" | "roleKnowledge") =>
    Math.round(avg(scored.map((t) => t.evaluation!.dimensions?.[key] ?? turnScore(t))));

  const unique = (xs: string[]) => xs.filter((v, i, arr) => arr.indexOf(v) === i);
  const strengths = unique(scored.filter((t) => strengthFromScore(turnScore(t)) === "strong").map((t) => t.question.category));
  const weakAreas = unique(scored.filter((t) => turnScore(t) < 60).map((t) => t.question.category));
  const skipped = planned - scored.length;

  return {
    readiness,
    answered: scored.length,
    planned,
    technicalKnowledge: dim("technical"),
    communication: dim("communication"),
    problemSolving: dim("problemSolving"),
    roleKnowledge: dim("roleKnowledge"),
    strengths,
    weakAreas: skipped > 0 ? [...weakAreas, `${skipped} question${skipped > 1 ? "s" : ""} not answered`] : weakAreas,
    recommendedPractice: weakAreas.length
      ? weakAreas.map((w) => `Practice more questions on ${w.toLowerCase()}`)
      : readiness >= 75
      ? ["Keep practising to maintain your level"]
      : ["Answer every question in full, with a concrete example"],
    questionsToRevisit: scored.filter((t) => turnScore(t) < 60).map((t) => t.question.prompt),
  };
}

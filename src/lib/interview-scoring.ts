import type { InterviewEvaluation } from "@/lib/types";

// Score bands used everywhere (AI evaluator, mock evaluator, results page).
export function strengthFromScore(score: number): InterviewEvaluation["strength"] {
  if (score < 45) return "weak";
  if (score < 75) return "solid";
  return "strong";
}

// Phrases that mean "I'm not answering", whatever the language of the rest.
const GIVE_UP = /^(i\s*(do\s*not|don'?t|dont)\s*know|no\s*idea|idk|not\s*sure|pass|skip|nothing|n\/?a|none|no|yes|ok(ay)?|\.+|-+)[\s.!?]*$/i;

/**
 * True for blank answers, "I don't know", a single word, or keyboard mashing.
 * These score 0 without asking the AI, so an empty answer can never be
 * flattered into a passing mark (and it saves an API call).
 */
export function isNonAnswer(answer: string): boolean {
  const t = answer.trim();
  if (t.length < 15) return true;
  if (GIVE_UP.test(t)) return true;
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length < 4) return true;
  // Gibberish: very few distinct words, or no vowels at all.
  if (new Set(words.map((w) => w.toLowerCase())).size < 3) return true;
  if (!/[aeiouyàâäéèêëîïôöùûüáíóúñ]/i.test(t)) return true;
  return false;
}

export const NON_ANSWER_EVALUATION: InterviewEvaluation = {
  strength: "weak",
  score: 0,
  dimensions: { technical: 0, communication: 0, problemSolving: 0, roleKnowledge: 0 },
  feedback:
    "You didn't really answer this question. Even a short attempt helps: say what you know, then walk through one concrete example.",
  followUpTriggered: true,
};

import { ThumbsUp, AlertCircle, ListChecks } from "lucide-react";
import { Card } from "@/components/ui/card";
import { CircularScore } from "@/components/ui/circular-score";
import { InterviewScoreBar } from "@/components/interview/interview-score";
import type { InterviewResult, InterviewTurn } from "@/lib/types";

// Shared by the live results page and the saved-interview page so a saved
// interview looks exactly like it did when it finished.
export function InterviewResultView({ result }: { result: InterviewResult }) {
  return (
    <>
      <Card className="flex flex-col items-center gap-3 p-6">
        <CircularScore
          value={result.readiness}
          size={120}
          label="Overall readiness"
          color={result.readiness >= 70 ? "var(--z-success)" : result.readiness >= 45 ? "var(--z-warning)" : "var(--z-danger)"}
        />
        {result.planned ? (
          <p className="text-xs text-z-ink-faint">
            Based on {result.answered ?? 0} of {result.planned} questions. Unanswered questions score 0.
          </p>
        ) : null}
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="mb-4 text-[15px] font-semibold text-z-ink">Breakdown</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InterviewScoreBar label="Technical Knowledge" value={result.technicalKnowledge} />
          <InterviewScoreBar label="Communication" value={result.communication} />
          <InterviewScoreBar label="Problem Solving" value={result.problemSolving} />
          <InterviewScoreBar label="Role Knowledge" value={result.roleKnowledge} />
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-2 inline-flex items-center gap-1.5 text-sm font-semibold text-z-success">
            <ThumbsUp className="h-4 w-4" /> Strengths
          </h3>
          <ul className="space-y-1.5 text-sm text-z-ink-soft">
            {result.strengths.length === 0 && <li>No clear strengths yet. Aim for specific, example-led answers.</li>}
            {result.strengths.map((s) => (
              <li key={s}>• {s}</li>
            ))}
          </ul>
        </Card>
        <Card className="p-5">
          <h3 className="mb-2 inline-flex items-center gap-1.5 text-sm font-semibold text-z-warning">
            <AlertCircle className="h-4 w-4" /> Weak Areas
          </h3>
          <ul className="space-y-1.5 text-sm text-z-ink-soft">
            {result.weakAreas.length === 0 && <li>No weak areas in this session.</li>}
            {result.weakAreas.map((s) => (
              <li key={s}>• {s}</li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="mb-2 inline-flex items-center gap-1.5 text-sm font-semibold text-z-ink">
          <ListChecks className="h-4 w-4 text-z-brand" /> Recommended Practice
        </h3>
        <ul className="space-y-1.5 text-sm text-z-ink-soft">
          {result.recommendedPractice.map((s) => (
            <li key={s}>• {s}</li>
          ))}
        </ul>
        {result.questionsToRevisit.length > 0 && (
          <>
            <h4 className="mb-1.5 mt-4 text-xs font-semibold uppercase tracking-wide text-z-ink-faint">Questions to revisit</h4>
            <ul className="space-y-1.5 text-sm text-z-ink-soft">
              {result.questionsToRevisit.map((q) => (
                <li key={q} className="italic">
                  &ldquo;{q}&rdquo;
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </>
  );
}

// Every question with the person's answer, the mark and the feedback.
export function InterviewTranscript({ turns }: { turns: InterviewTurn[] }) {
  if (turns.length === 0) return null;
  return (
    <Card className="p-5">
      <h3 className="mb-3 text-[15px] font-semibold text-z-ink">Your answers</h3>
      <ol className="space-y-5">
        {turns.map((t, i) => (
          <li key={`${t.question.id}-${i}`} className="text-sm">
            <p className="font-medium text-z-ink">
              {i + 1}. {t.question.prompt}
            </p>
            <p className="mt-1.5 whitespace-pre-wrap rounded-lg bg-z-surface p-3 text-z-ink-soft">{t.answer}</p>
            {t.evaluation && (
              <p className="mt-1.5 text-xs text-z-ink-faint">
                {typeof t.evaluation.score === "number" && (
                  <span className="mr-1.5 font-semibold text-z-ink">{t.evaluation.score}/100</span>
                )}
                {t.evaluation.feedback}
              </p>
            )}
          </li>
        ))}
      </ol>
    </Card>
  );
}

"use client";

import { useState } from "react";
import { Sparkles, Lightbulb, MessageCircleQuestion, Scale } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { reconcileAIReasoning, toAIEvidence, type FitAssessment, type ReconciledReasoning } from "@/lib/assessment";
import type { Opportunity } from "@/lib/types";

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "done"; result: ReconciledReasoning }
  | { kind: "unavailable"; message: string };

// Live AI reasoning. It is given the same facts as the assessment above and
// adds explanation only: no score of its own. If it fails, or there isn't
// enough information, the card says so; nothing is made up.
export function LiveOpportunityAnalysis({ opportunity, assessment }: { opportunity: Opportunity; assessment: FitAssessment }) {
  const [state, setState] = useState<State>({ kind: "idle" });
  const insufficient = assessment.quality === "insufficient";

  const run = async () => {
    setState({ kind: "loading" });
    try {
      const res = await fetch("/api/ai/analyze-opportunity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opportunityTitle: opportunity.title,
          opportunityDescription: opportunity.description,
          evidence: toAIEvidence(assessment),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "AI reasoning is unavailable right now.");
      setState({ kind: "done", result: reconcileAIReasoning(assessment, data.result) });
    } catch (e) {
      setState({ kind: "unavailable", message: e instanceof Error ? e.message : "AI reasoning is unavailable right now." });
    }
  };

  const loading = state.kind === "loading";
  const result = state.kind === "done" ? state.result : null;
  const empty = result && result.provider === "none";
  const nothing = result && !empty && !result.summary && result.insights.length === 0;

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-z-ink">
          <Sparkles className="h-4 w-4 text-z-brand" /> AI reasoning
        </h3>
        <Button size="sm" onClick={run} disabled={loading || insufficient}>
          {loading ? "Thinking…" : result ? "Run again" : "Explain with AI"}
        </Button>
      </div>

      {state.kind === "idle" && !insufficient && (
        <p className="text-xs text-z-ink-faint">
          The AI reads the same evidence as the assessment above and explains it in plain language. It does not change
          the scores, and it can&apos;t see anything that isn&apos;t on your profile or in the listing.
        </p>
      )}
      {insufficient && (
        <p className="rounded-lg bg-z-surface px-3 py-2 text-xs text-z-ink-soft">
          Not enough information for AI reasoning. {assessment.qualityNote}
        </p>
      )}
      {state.kind === "unavailable" && (
        <p className="rounded-lg bg-z-danger-bg px-3 py-2 text-xs text-z-danger">
          AI reasoning unavailable. {state.message} The assessment above doesn&apos;t depend on it.
        </p>
      )}
      {empty && (
        <p className="rounded-lg bg-z-surface px-3 py-2 text-xs text-z-ink-soft">
          AI reasoning unavailable: no AI provider is configured. The assessment above is rule-based and unaffected.
        </p>
      )}
      {nothing && (
        <p className="rounded-lg bg-z-surface px-3 py-2 text-xs text-z-ink-soft">
          The AI had nothing reliable to add to the assessment above.
        </p>
      )}

      {result && !empty && !nothing && (
        <div className="mt-2 space-y-4">
          {result.summary && <p className="text-sm text-z-ink-soft">{result.summary}</p>}
          {result.insights.length > 0 && (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-z-ink">
                <Lightbulb className="h-4 w-4 text-z-brand" /> Reasoning
              </p>
              <ul className="space-y-1.5 text-sm text-z-ink-soft">
                {result.insights.map((t) => (
                  <li key={t} className="flex gap-2">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-z-brand" /> {t}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {result.recruiterQuestions.length > 0 && (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-z-ink">
                <MessageCircleQuestion className="h-4 w-4 text-z-brand" /> More to ask the recruiter
              </p>
              <ul className="space-y-1.5 text-sm text-z-ink-soft">
                {result.recruiterQuestions.map((t) => (
                  <li key={t} className="flex gap-2">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-z-brand" /> {t}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {result.disagreements.length > 0 && (
            <div className="rounded-lg border border-z-border p-3">
              <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-z-ink">
                <Scale className="h-4 w-4 text-z-warning" /> Where the AI reads it differently
              </p>
              <ul className="space-y-2 text-sm text-z-ink-soft">
                {result.disagreements.map((d) => (
                  <li key={`${d.topic}-${d.claim}`}>
                    <span className="font-medium text-z-ink">{d.topic}:</span> {d.claim}{" "}
                    <span className="text-z-ink-faint">Reason: {d.reason}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-z-ink-faint">The assessment above is unchanged. Check these yourself.</p>
            </div>
          )}
          {result.dropped > 0 && (
            <p className="text-xs text-z-ink-faint">
              {result.dropped} AI statement{result.dropped === 1 ? "" : "s"} removed because they gave their own
              numbers or contradicted your profile.
            </p>
          )}
        </div>
      )}
    </Card>
  );
}

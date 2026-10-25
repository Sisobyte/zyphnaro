"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, Info, Save, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SkillBadge } from "@/components/shared/skill-badge";
import { useCurrentUser } from "@/lib/hooks/use-user";
import { useSaveTailoredCV } from "@/lib/hooks/use-tailored-cvs";
import type { CVAIResult, Opportunity, TailoredCVResult } from "@/lib/types";

export function LiveCVTailor({ opportunity }: { opportunity: Opportunity }) {
  const { data: user } = useCurrentUser();
  const saveMutation = useSaveTailoredCV();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TailoredCVResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  const run = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    // AI INTEGRATION:
    // Calls the server-side /api/cv/tailor route, which fetches the
    // caller's real uploaded CV from Storage (if any) and hands it to
    // Gemini alongside this request when configured. See /docs/ai-integration.md
    try {
      const res = await fetch("/api/cv/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cvSkills: user.skills,
          opportunityTitle: opportunity.title,
          opportunitySkills: opportunity.skills,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Tailoring failed.");
      setResult(data.tailoredCV as TailoredCVResult);
      setSavedId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!user || !result) return;
    setError(null);
    try {
      // A real, second AI call — not an invented "+18%" — scoring the CV
      // again with the tailored highlights folded in, against this same
      // opportunity. originalScore is the user's real current match score
      // for this opportunity (the same score shown everywhere else on this
      // page), not a separate guess.
      const tailoredSkillSet = Array.from(new Set([...user.skills, ...result.highlightedSkills]));
      const res = await fetch("/api/cv/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cvSkills: tailoredSkillSet,
          cvExperienceSummary: result.summary,
          targetOpportunitySkills: opportunity.skills,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Scoring the tailored CV failed.");
      const tailoredScore = (data.analysis as CVAIResult).score;

      const saved = await saveMutation.mutateAsync({
        opportunityId: opportunity.id,
        opportunityTitle: opportunity.title,
        company: opportunity.company.name,
        originalScore: opportunity.match.overall,
        tailoredScore,
        highlightedSkills: result.highlightedSkills,
        recommendedChanges: result.recommendedChanges,
        projectRecommendations: result.projectRecommendations,
        summary: result.summary,
      });
      setSavedId(saved.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Saving failed.");
    }
  };

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-z-ink">
          <Sparkles className="h-4 w-4 text-z-brand" /> Generate Tailored CV with AI
        </h3>
        <Button size="sm" onClick={run} disabled={loading || !user}>
          {loading ? "Generating…" : result ? "Regenerate" : "Generate"}
        </Button>
      </div>

      {!result && !error && !loading && (
        <p className="text-xs text-z-ink-faint">
          This is a live, on-demand preview — it isn&apos;t saved yet. Zyphnaro only restructures and emphasizes
          information you actually provided; it never invents experience.
        </p>
      )}

      {error && <p className="rounded-lg bg-z-danger-bg px-3 py-2 text-xs text-z-danger">{error}</p>}

      {result && (
        <div className="mt-2 flex flex-col gap-3">
          {savedId ? (
            <div className="flex items-center justify-between gap-2 rounded-lg bg-z-success-bg p-2.5 text-xs text-z-success">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> Saved to your tailored CVs.
              </span>
              <Link href={`/tailored-cvs/${savedId}`} className="font-medium underline">
                View
              </Link>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2 rounded-lg bg-z-brand-50/50 p-2.5 text-xs text-z-ink-soft">
              <span className="inline-flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 shrink-0 text-z-brand" />
                Not saved yet — refreshing will clear it.
              </span>
              <Button
                size="sm"
                variant="secondary"
                onClick={save}
                disabled={saveMutation.isPending}
                className="shrink-0"
              >
                <Save className="h-3.5 w-3.5" /> {saveMutation.isPending ? "Saving…" : "Save"}
              </Button>
            </div>
          )}
          <div>
            <p className="mb-1.5 text-sm font-medium text-z-ink">Tailored summary</p>
            <p className="text-sm text-z-ink-soft">{result.summary}</p>
          </div>
          <div>
            <p className="mb-1.5 text-sm font-medium text-z-ink">Highlighted skills</p>
            <div className="flex flex-wrap gap-1.5">
              {result.highlightedSkills.map((s) => (
                <SkillBadge key={s} skill={s} />
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-sm font-medium text-z-ink">Recommended changes</p>
            <ul className="space-y-1.5 text-sm text-z-ink-soft">
              {result.recommendedChanges.map((c) => (
                <li key={c} className="flex gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-z-brand" /> {c}
                </li>
              ))}
            </ul>
          </div>
          {result.projectRecommendations.length > 0 && (
            <div>
              <p className="mb-1.5 text-sm font-medium text-z-ink">Lead with these projects</p>
              <ul className="space-y-1 text-sm text-z-ink-soft">
                {result.projectRecommendations.map((p) => (
                  <li key={p}>• {p}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

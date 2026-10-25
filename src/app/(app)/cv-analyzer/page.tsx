"use client";

import { useState } from "react";
import Link from "next/link";
import { ScanSearch, CheckCircle2, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { CircularScore } from "@/components/ui/circular-score";
import { SkillBadge } from "@/components/shared/skill-badge";
import { useOpportunities } from "@/lib/hooks/use-opportunities";
import { useTailoredCVs } from "@/lib/hooks/use-tailored-cvs";
import { useCurrentUser } from "@/lib/hooks/use-user";
import { userRepository } from "@/lib/repositories";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import type { CVAIResult } from "@/lib/types";

export default function CVAnalyzerPage() {
  const { data: opportunities = [] } = useOpportunities();
  const { data: user } = useCurrentUser();
  const { data: tailoredCVs = [] } = useTailoredCVs();
  const client = useQueryClient();

  const [selectedOpp, setSelectedOpp] = useState("");
  const [loading, setLoading] = useState(false);
  const [jobResult, setJobResult] = useState<CVAIResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // General (not job-specific) CV quality — this is what makes `cvScore` on
  // the profile real. /api/cv/analyze already supports running with no
  // targetOpportunitySkills for exactly this case.
  const [generalResult, setGeneralResult] = useState<CVAIResult | null>(null);
  const [generalLoading, setGeneralLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const runGeneralAnalysis = async () => {
    if (!user) return;
    setGeneralLoading(true);
    setGeneralError(null);
    try {
      const res = await fetch("/api/cv/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cvSkills: user.skills, cvExperienceSummary: user.headline }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Analysis failed.");
      const analysis = data.analysis as CVAIResult;
      setGeneralResult(analysis);
      // Persist so the score shown here, on Profile, and on the Dashboard
      // all agree — this is the only place `cvScore` is ever written.
      await userRepository.updateProfile({ cvScore: analysis.score });
      await client.invalidateQueries({ queryKey: ["current-user"] });
    } catch (e) {
      setGeneralError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setGeneralLoading(false);
    }
  };

  const runAnalysis = async () => {
    if (!selectedOpp || !user) return;
    const opp = opportunities.find((o) => o.id === selectedOpp);
    if (!opp) return;
    setLoading(true);
    setJobResult(null);
    setAnalysisError(null);
    // AI INTEGRATION:
    // Calls the server-side /api/cv/analyze route rather than an AI
    // provider directly — the API key never reaches the browser. That
    // route resolves to GeminiAIService when configured, MockAIService
    // otherwise. See /docs/ai-integration.md
    try {
      const res = await fetch("/api/cv/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cvSkills: user.skills,
          cvExperienceSummary: user.headline,
          targetOpportunitySkills: opp.skills,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Analysis failed.");
      setJobResult(data.analysis as CVAIResult);
    } catch (e) {
      setAnalysisError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  // Shown before the first run, or as a fallback if re-analysis fails —
  // whatever was last actually computed and saved to the profile.
  const lastScore = generalResult?.score ?? user?.cvScore ?? null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="inline-flex items-center gap-2 text-xl font-semibold text-z-ink sm:text-2xl">
          <ScanSearch className="h-5 w-5 text-z-brand" /> CV Analyzer
        </h1>
        <p className="mt-1 text-sm text-z-ink-faint">See how your CV matches job requirements and get AI-powered suggestions.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card className="p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-[15px] font-semibold text-z-ink">Current CV Score</h2>
              <Button size="sm" variant="secondary" onClick={runGeneralAnalysis} disabled={generalLoading || !user}>
                <RefreshCw className={cn("h-3.5 w-3.5", generalLoading && "animate-spin")} />
                {generalLoading ? "Analyzing…" : lastScore === null ? "Analyze my CV" : "Re-analyze"}
              </Button>
            </div>

            {generalError && (
              <p className="mb-3 rounded-lg bg-z-danger-bg px-3 py-2 text-xs text-z-danger">{generalError}</p>
            )}

            {lastScore === null ? (
              <p className="text-sm text-z-ink-faint">
                Run an analysis to get a real score for your CV — nothing is shown until it&apos;s actually computed.
              </p>
            ) : (
              <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
                <CircularScore value={lastScore} size={104} label="out of 100" />
                <div className="flex-1 space-y-3">
                  {generalResult ? (
                    <>
                      <div>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="text-z-ink-soft">ATS compatibility</span>
                          <span className="font-medium text-z-ink">{generalResult.atsCompatibility}</span>
                        </div>
                      </div>
                      <ul className="space-y-1.5">
                        {generalResult.feedback.map((f) => (
                          <li key={f} className="flex gap-2 text-sm text-z-ink-soft">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-z-brand" /> {f}
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <p className="text-xs text-z-ink-faint">
                      This is your last saved score. Re-analyze to refresh the ATS compatibility and feedback below.
                    </p>
                  )}
                </div>
              </div>
            )}
          </Card>

          {generalResult && (generalResult.missingKeywords.length > 0 || generalResult.strongKeywords.length > 0) && (
            <Card className="p-5 sm:p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-sm font-medium text-z-warning">Missing Keywords</p>
                  <div className="flex flex-wrap gap-1.5">
                    {generalResult.missingKeywords.map((k) => (
                      <SkillBadge key={k} skill={k} muted />
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium text-z-success">Strong Keywords</p>
                  <div className="flex flex-wrap gap-1.5">
                    {generalResult.strongKeywords.map((k) => (
                      <SkillBadge key={k} skill={k} />
                    ))}
                  </div>
                </div>
              </div>
              <p className="mt-4 text-xs text-z-ink-faint">
                Want a version tailored to one specific job? Select an opportunity on the right, then open its CV Fit
                tab to generate and save a tailored CV.
              </p>
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <Card className="p-5">
            <h3 className="mb-1 text-[15px] font-semibold text-z-ink">Analyze for a specific job</h3>
            <p className="mb-3 text-xs text-z-ink-faint">Compare your CV against one opportunity for a targeted score.</p>
            <Select value={selectedOpp} onChange={(e) => setSelectedOpp(e.target.value)}>
              <option value="">Select an opportunity…</option>
              {opportunities.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.title} · {o.company.name}
                </option>
              ))}
            </Select>
            <Button onClick={runAnalysis} disabled={!selectedOpp || loading} className="mt-3 w-full" size="sm">
              {loading ? "Analyzing…" : "Analyze CV"}
            </Button>

            {analysisError && (
              <p className="mt-3 rounded-lg bg-z-danger-bg px-3 py-2 text-xs text-z-danger">{analysisError}</p>
            )}

            {jobResult && (
              <div className="mt-4 rounded-lg border border-z-border bg-z-surface p-3">
                <p className="text-sm font-semibold text-z-ink">{jobResult.score}% match to this role</p>
                <p className="mt-1 text-xs text-z-ink-faint">ATS compatibility: {jobResult.atsCompatibility}%</p>
                {jobResult.missingKeywords.length > 0 && (
                  <p className="mt-2 text-xs text-z-ink-soft">
                    Missing: <span className="font-medium">{jobResult.missingKeywords.join(", ")}</span>
                  </p>
                )}
                <ul className="mt-2 space-y-1">
                  {jobResult.feedback.map((f) => (
                    <li key={f} className="text-xs text-z-ink-soft">
                      • {f}
                    </li>
                  ))}
                </ul>
                {selectedOpp && (
                  <Link
                    href={`/opportunities/${selectedOpp}`}
                    className={cn(buttonVariants({ variant: "primary", size: "sm" }), "mt-3 w-full")}
                  >
                    Open opportunity to tailor CV
                  </Link>
                )}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h3 className="mb-2 text-[15px] font-semibold text-z-ink">Tailored CVs</h3>
            {tailoredCVs.length === 0 ? (
              <p className="text-xs text-z-ink-faint">
                None saved yet. Generate one from an opportunity&apos;s CV Fit tab, then hit Save.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-z-border p-3 text-center">
                  <p className="text-xs text-z-ink-faint">Most recent</p>
                  <p className="mt-1 text-xl font-semibold text-z-ink">{tailoredCVs[0].originalScore}</p>
                </div>
                <div className="rounded-lg border border-z-success/30 bg-z-success-bg p-3 text-center">
                  <p className="text-xs text-z-ink-faint">Tailored</p>
                  <p className="mt-1 text-xl font-semibold text-z-success">{tailoredCVs[0].tailoredScore}</p>
                </div>
              </div>
            )}
            <Link href="/tailored-cvs" className="mt-3 block text-center text-xs font-medium text-z-brand hover:underline">
              View tailored CVs ({tailoredCVs.length}) →
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}

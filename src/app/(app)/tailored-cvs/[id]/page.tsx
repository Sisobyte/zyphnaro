"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Info, Download } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SkillBadge } from "@/components/shared/skill-badge";
import { useTailoredCV } from "@/lib/hooks/use-tailored-cvs";
import { useCurrentUser } from "@/lib/hooks/use-user";
import { useOpportunity } from "@/lib/hooks/use-opportunities";

export default function TailoredCVDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: tcv, isLoading } = useTailoredCV(id);
  const { data: user } = useCurrentUser();
  const { data: opportunity } = useOpportunity(tcv?.opportunityId ?? "");

  if (isLoading) return <div className="h-64 animate-pulse rounded-2xl border border-z-border bg-white" />;

  if (!tcv) {
    return (
      <Card className="p-10 text-center">
        <p className="text-sm font-medium text-z-ink">Tailored CV not found.</p>
        <Link href="/tailored-cvs" className="mt-3 inline-block text-sm text-z-brand hover:underline">
          Back to tailored CVs
        </Link>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Link href="/tailored-cvs" className="inline-flex w-fit items-center gap-1.5 text-sm text-z-ink-faint hover:text-z-ink">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to tailored CVs
      </Link>

      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-z-ink sm:text-2xl">
          Tailored CV — {tcv.opportunityTitle}
        </h1>
        <p className="text-sm text-z-ink-faint">{tcv.company}</p>
      </div>

      <Card className="flex items-start gap-2.5 border-z-brand-50 bg-z-brand-50/40 p-4">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-z-brand" />
        <p className="text-sm text-z-ink-soft">
          Zyphnaro only restructures and emphasizes information you actually provided.
        </p>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card className="p-5">
            <h2 className="mb-3 text-[15px] font-semibold text-z-ink">Recommended Changes</h2>
            <ul className="space-y-2">
              {tcv.recommendedChanges.map((c) => (
                <li key={c} className="flex gap-2 text-sm text-z-ink-soft">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-z-brand" /> {c}
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-[15px] font-semibold text-z-ink">Tailored CV Preview</h2>
            <div id="tailored-cv-print-target" className="rounded-lg border border-z-border p-4 text-sm">
              <p className="font-semibold text-z-ink">{user?.name}</p>
              <p className="text-z-ink-faint">{user?.location}</p>
              <p className="mt-3 text-z-ink-soft">{tcv.summary}</p>

              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-z-ink-faint">Skills</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {tcv.highlightedSkills.map((s) => (
                  <SkillBadge key={s} skill={s} />
                ))}
                {(user?.skills ?? [])
                  .filter((s) => !tcv.highlightedSkills.includes(s))
                  .map((s) => (
                    <SkillBadge key={s} skill={s} muted />
                  ))}
              </div>

              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-z-ink-faint">Experience</p>
              {(user?.experience ?? []).map((exp) => (
                <div key={exp.id} className="mt-2">
                  <p className="font-medium text-z-ink">
                    {exp.title} · {exp.company}
                  </p>
                  <p className="text-z-ink-soft">{exp.description}</p>
                </div>
              ))}

              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-z-ink-faint">Featured Projects</p>
              {(user?.projects ?? [])
                .filter((p) => tcv.projectRecommendations.includes(p.name))
                .map((p) => (
                  <div key={p.id} className="mt-2">
                    <p className="font-medium text-z-ink">{p.name}</p>
                    <p className="text-z-ink-soft">{p.description}</p>
                  </div>
                ))}
            </div>
            <Button size="sm" variant="secondary" className="mt-4" onClick={() => window.print()}>
              <Download className="h-3.5 w-3.5" /> Download PDF
            </Button>
            <p className="mt-1.5 text-xs text-z-ink-faint">
              Opens your browser&apos;s print dialog — choose &quot;Save as PDF&quot; as the destination.
            </p>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card className="p-5">
            <h3 className="mb-2 text-[15px] font-semibold text-z-ink">Score Comparison</h3>
            <div className="flex items-center gap-3">
              <div className="flex-1 rounded-lg bg-z-surface p-3 text-center">
                <p className="text-xs text-z-ink-faint">Original</p>
                <p className="text-xl font-semibold text-z-ink">{tcv.originalScore}</p>
              </div>
              <div className="flex-1 rounded-lg bg-z-success-bg p-3 text-center">
                <p className="text-xs text-z-ink-faint">Tailored</p>
                <p className="text-xl font-semibold text-z-success">{tcv.tailoredScore}</p>
              </div>
            </div>
          </Card>

          {opportunity && (
            <Card className="p-5">
              <h3 className="mb-2 text-[15px] font-semibold text-z-ink">Target Opportunity</h3>
              <p className="text-sm font-medium text-z-ink">{opportunity.title}</p>
              <p className="text-xs text-z-ink-faint">{opportunity.company.name}</p>
              <Link href={`/opportunities/${opportunity.id}`} className="mt-2 inline-block text-xs font-medium text-z-brand hover:underline">
                View opportunity →
              </Link>
            </Card>
          )}

          <Card className="p-5">
            <h3 className="mb-2 text-[15px] font-semibold text-z-ink">Project Recommendations</h3>
            <ul className="space-y-1.5 text-sm text-z-ink-soft">
              {tcv.projectRecommendations.map((p) => (
                <li key={p}>• {p}</li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

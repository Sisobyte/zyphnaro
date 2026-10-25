"use client";

import Link from "next/link";
import { FileEdit, ArrowRight, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { SkillBadge } from "@/components/shared/skill-badge";
import { useTailoredCVs } from "@/lib/hooks/use-tailored-cvs";
import { timeAgo } from "@/lib/utils";

export default function TailoredCVsPage() {
  const { data: tailoredCVs = [], isLoading } = useTailoredCVs();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="inline-flex items-center gap-2 text-xl font-semibold text-z-ink sm:text-2xl">
          <FileEdit className="h-5 w-5 text-z-brand" /> Tailored CVs
        </h1>
        <p className="mt-1 text-sm text-z-ink-faint">Job-specific versions of your CV, generated from opportunities you&apos;re considering.</p>
      </div>

      <Card className="flex items-start gap-2.5 border-z-brand-50 bg-z-brand-50/40 p-4">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-z-brand" />
        <p className="text-sm text-z-ink-soft">
          Zyphnaro only restructures and emphasizes information you actually provided. It never invents experience,
          skills, or qualifications you don&apos;t have.
        </p>
      </Card>

      {isLoading ? (
        <div className="h-48 animate-pulse rounded-2xl border border-z-border bg-white" />
      ) : tailoredCVs.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-sm font-medium text-z-ink">No tailored CVs yet.</p>
          <p className="mt-1 text-sm text-z-ink-faint">
            Open an opportunity&apos;s CV Fit tab, generate one, then hit Save.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {tailoredCVs.map((tcv) => (
            <Link key={tcv.id} href={`/tailored-cvs/${tcv.id}`}>
              <Card className="flex h-full flex-col gap-3 p-5 transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-z-ink">{tcv.opportunityTitle}</p>
                    <p className="text-xs text-z-ink-faint">{tcv.company}</p>
                  </div>
                  <span className="text-xs text-z-ink-faint">{timeAgo(tcv.createdAt)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-z-surface px-2.5 py-1.5 text-center">
                    <p className="text-xs text-z-ink-faint">Original</p>
                    <p className="text-sm font-semibold text-z-ink">{tcv.originalScore}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-z-ink-faint" />
                  <div className="rounded-lg bg-z-success-bg px-2.5 py-1.5 text-center">
                    <p className="text-xs text-z-ink-faint">Tailored</p>
                    <p className="text-sm font-semibold text-z-success">{tcv.tailoredScore}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {tcv.highlightedSkills.map((s) => (
                    <SkillBadge key={s} skill={s} />
                  ))}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

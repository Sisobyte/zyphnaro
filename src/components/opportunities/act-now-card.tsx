"use client";

import Link from "next/link";
import { Flame, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { SkillBadge } from "@/components/shared/skill-badge";
import { TrustScore } from "@/components/shared/trust-score";
import { CVScore } from "@/components/shared/cv-score";
import { timeAgo, cn } from "@/lib/utils";
import type { Opportunity } from "@/lib/types";

export function ActNowCard({ opportunity }: { opportunity: Opportunity }) {
  return (
    <Card className="flex flex-col gap-3 border-z-warning/30 bg-gradient-to-b from-z-warning-bg/40 to-white p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-z-warning">
          <Flame className="h-3.5 w-3.5" /> Act now
        </span>
        <span className="text-xs font-semibold text-z-success">{opportunity.match.overall}% Match</span>
      </div>

      <div>
        <Link href={`/opportunities/${opportunity.id}`} className="text-[15px] font-semibold text-z-ink hover:text-z-brand">
          {opportunity.title}
        </Link>
        <p className="mt-0.5 text-sm text-z-ink-soft">{opportunity.company.name}</p>
      </div>

      <p className="text-xs text-z-ink-faint">
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-3 w-3" /> {opportunity.location}
        </span>{" "}
        · Posted {timeAgo(opportunity.postedAt)}
      </p>

      <div className="flex flex-wrap gap-1.5">
        {opportunity.skills.slice(0, 4).map((s) => (
          <SkillBadge key={s} skill={s} />
        ))}
      </div>

      <p className="rounded-lg bg-white/70 p-2.5 text-xs leading-relaxed text-z-ink-soft">
        &ldquo;{opportunity.match.reason}&rdquo;
      </p>

      <div className="flex items-center gap-3 text-xs">
        <TrustScore value={opportunity.trust.score} />
        <CVScore value={opportunity.cvFit.cvMatch} />
      </div>

      <div className="flex items-center gap-2 pt-1">
        <Link href={`/opportunities/${opportunity.id}`} className={cn(buttonVariants({ variant: "primary", size: "sm" }), "min-w-0 flex-1 truncate")}>
          View Opportunity
        </Link>
        <Link
          href={`/opportunities/${opportunity.id}?tab=analysis`}
          className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "min-w-0 flex-1 truncate")}
        >
          Analyze CV
        </Link>
      </div>
    </Card>
  );
}

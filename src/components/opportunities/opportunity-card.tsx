"use client";

import Link from "next/link";
import { Bookmark, MapPin, Briefcase } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SkillBadge } from "@/components/shared/skill-badge";
import { TrustScore } from "@/components/shared/trust-score";
import { CVScore } from "@/components/shared/cv-score";
import { FreshnessBadge } from "@/components/shared/freshness-badge";
import { formatSalary } from "@/lib/utils";
import type { Opportunity } from "@/lib/types";
import { cn } from "@/lib/utils";

export function OpportunityCard({
  opportunity,
  onSave,
  compact = false,
}: {
  opportunity: Opportunity;
  onSave?: (id: string) => void;
  compact?: boolean;
}) {
  const matchTone =
    opportunity.match.overall >= 90
      ? "success"
      : opportunity.match.overall >= 75
      ? "brand"
      : opportunity.match.overall >= 50
      ? "warning"
      : "danger";
  const salary = formatSalary(opportunity.salary);

  return (
    <Card className="flex flex-col gap-3 p-4 transition-shadow hover:shadow-md sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <Badge variant={matchTone as "success" | "brand" | "warning" | "danger"} className="text-[13px] font-semibold">
          {opportunity.match.overall}% MATCH
        </Badge>
        <FreshnessBadge postedAt={opportunity.postedAt} />
      </div>

      <div>
        <Link href={`/opportunities/${opportunity.id}`} className="text-[15px] font-semibold text-z-ink hover:text-z-brand">
          {opportunity.title}
        </Link>
        <p className="mt-0.5 text-sm text-z-ink-soft">{opportunity.company.name}</p>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-z-ink-faint">
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-3 w-3" /> {opportunity.location ?? "Remote"}
        </span>
        <span className="inline-flex items-center gap-1">
          <Briefcase className="h-3 w-3" /> {opportunity.employmentType.replace("-", " ")}
        </span>
        {salary && <span className="font-medium text-z-ink-soft">{salary}</span>}
      </div>

      {!compact && (
        <div className="flex flex-wrap gap-1.5">
          {opportunity.skills.slice(0, 4).map((s) => (
            <SkillBadge key={s} skill={s} />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between border-t border-z-border pt-3">
        <div className="flex items-center gap-3">
          <TrustScore value={opportunity.trust.score} />
          <CVScore value={opportunity.cvFit.cvMatch} />
        </div>
        <span className="text-[11px] text-z-ink-faint">{opportunity.source}</span>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <Link
          href={`/opportunities/${opportunity.id}`}
          className={cn(buttonVariants({ variant: "primary", size: "sm" }), "flex-1")}
        >
          View
        </Link>
        <Button
          size="sm"
          variant={opportunity.saved ? "subtle" : "secondary"}
          onClick={() => onSave?.(opportunity.id)}
          className={cn(opportunity.saved && "text-z-brand-600")}
        >
          <Bookmark className={cn("h-3.5 w-3.5", opportunity.saved && "fill-current")} />
          {opportunity.saved ? "Saved" : "Save"}
        </Button>
        <Link
          href={`/opportunities/${opportunity.id}?tab=analysis`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Analyze
        </Link>
      </div>
    </Card>
  );
}

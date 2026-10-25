"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MatchScore } from "@/components/shared/match-score";
import { timeAgo } from "@/lib/utils";
import type { Application, ApplicationStage } from "@/lib/types";

export function ApplicationCard({
  application,
  draggable,
  onDragStart,
  stages,
  onMove,
}: {
  application: Application;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  // When given, the card shows a "Move to" menu. This is the way to change a
  // stage on touch screens, where drag-and-drop doesn't work, and it's also
  // keyboard and screen-reader friendly.
  stages?: { stage: ApplicationStage; label: string }[];
  onMove?: (stage: ApplicationStage) => void;
}) {
  return (
    <Card
      draggable={draggable}
      onDragStart={onDragStart}
      className="cursor-grab flex flex-col gap-2 p-3.5 active:cursor-grabbing"
    >
      <Link href={`/opportunities/${application.opportunityId}`} className="text-sm font-semibold text-z-ink hover:text-z-brand">
        {application.title}
      </Link>
      <p className="text-xs text-z-ink-faint">{application.company}</p>
      <div className="flex items-center justify-between">
        <MatchScore value={application.matchScore} />
        {application.location && (
          <Badge variant="neutral" className="font-normal">
            {application.location}
          </Badge>
        )}
      </div>
      <p className="text-[11px] text-z-ink-faint">
        {application.appliedAt ? `Applied ${timeAgo(application.appliedAt)}` : `Saved ${timeAgo(application.savedAt)}`}
      </p>
      {application.nextAction && (
        <p className="rounded-md bg-z-surface px-2 py-1.5 text-[11px] text-z-ink-soft">{application.nextAction}</p>
      )}
      {stages && onMove && (
        <label className="flex items-center gap-2 text-[11px] text-z-ink-faint">
          Move to
          <select
            value={application.stage}
            onChange={(e) => onMove(e.target.value as ApplicationStage)}
            aria-label={`Move ${application.title} to another stage`}
            className="min-h-9 flex-1 rounded-md border border-z-border bg-white px-2 py-1 text-xs text-z-ink"
          >
            {stages.map((s) => (
              <option key={s.stage} value={s.stage}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      )}
    </Card>
  );
}

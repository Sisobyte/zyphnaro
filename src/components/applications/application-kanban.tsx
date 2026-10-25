"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { ApplicationCard } from "./application-card";
import { useApplications, useMoveApplication } from "@/lib/hooks/use-applications";
import type { Application, ApplicationStage } from "@/lib/types";
import { cn } from "@/lib/utils";

const columns: { stage: ApplicationStage; label: string; tone: string }[] = [
  { stage: "saved", label: "Saved", tone: "bg-z-surface text-z-ink-soft" },
  { stage: "preparing", label: "Preparing", tone: "bg-z-warning-bg text-z-warning" },
  { stage: "applied", label: "Applied", tone: "bg-z-brand-50 text-z-brand-600" },
  { stage: "interview", label: "Interview", tone: "bg-z-violet-bg text-z-violet" },
  { stage: "offer", label: "Offer", tone: "bg-z-success-bg text-z-success" },
  { stage: "rejected", label: "Rejected", tone: "bg-z-danger-bg text-z-danger" },
];

export function ApplicationKanban() {
  const { data: applications = [] } = useApplications();
  const moveMutation = useMoveApplication();
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<ApplicationStage | null>(null);
  // Phones show one stage at a time (tabs); sm and up show every column.
  const [active, setActive] = useState<ApplicationStage>("saved");

  const tabs = useRef<HTMLDivElement>(null);
  useEffect(() => {
    tabs.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [active]);

  const grouped = (stage: ApplicationStage) => applications.filter((a) => a.stage === stage);

  const handleDrop = (stage: ApplicationStage) => {
    if (dragId) moveMutation.mutate({ id: dragId, stage });
    setDragId(null);
    setOverStage(null);
  };

  const move = (id: string, stage: ApplicationStage) => {
    moveMutation.mutate({ id, stage });
    setActive(stage); // follow the card so it doesn't seem to vanish
  };

  return (
    <div>
    <div ref={tabs} role="tablist" aria-label="Application stages" className="z-scroll-light -mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1 sm:hidden">
      {columns.map((col) => (
        <button
          key={col.stage}
          role="tab"
          aria-selected={active === col.stage}
          onClick={() => setActive(col.stage)}
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium",
            active === col.stage ? "border-z-brand bg-z-brand-50 text-z-brand-600" : "border-z-border bg-white text-z-ink-soft"
          )}
        >
          {col.label}
          <span className="rounded-full bg-z-surface px-1.5 text-[11px] text-z-ink-faint">{grouped(col.stage).length}</span>
        </button>
      ))}
    </div>
    <div className="z-scroll-light flex gap-4 sm:overflow-x-auto sm:pb-4">
      {columns.map((col) => {
        const items = grouped(col.stage);
        return (
          <div
            key={col.stage}
            onDragOver={(e) => {
              e.preventDefault();
              setOverStage(col.stage);
            }}
            onDrop={() => handleDrop(col.stage)}
            className={cn(
              "w-full flex-col gap-3 rounded-2xl border border-z-border bg-z-surface/60 p-3 transition-colors sm:flex sm:w-72 sm:shrink-0",
              active === col.stage ? "flex" : "hidden",
              overStage === col.stage && "border-z-brand bg-z-brand-50/40"
            )}
          >
            <div className="flex items-center justify-between px-1">
              <span className={cn("rounded-md px-2 py-1 text-xs font-semibold", col.tone)}>{col.label}</span>
              <span className="text-xs text-z-ink-faint">{items.length}</span>
            </div>
            <div className="flex flex-col gap-2.5">
              {items.length === 0 ? (
                <Card className="border-dashed p-4 text-center text-xs text-z-ink-faint">Nothing here yet. Drag a card here, or use Move to on a card.</Card>
              ) : (
                items.map((app: Application) => (
                  <ApplicationCard
                    key={app.id}
                    application={app}
                    draggable
                    onDragStart={() => setDragId(app.id)}
                    stages={columns}
                    onMove={(stage) => stage !== app.stage && move(app.id, stage)}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
    </div>
  );
}

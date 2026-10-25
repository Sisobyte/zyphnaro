"use client";

import { Plug, RefreshCcw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { JobSourceInfo } from "@/lib/types";

const statusCopy: Record<JobSourceInfo["status"], { label: string; variant: "success" | "neutral" | "brand" | "warning" | "outline" }> = {
  connected: { label: "Connected", variant: "success" },
  available: { label: "Available", variant: "neutral" },
  limited: { label: "Limited", variant: "warning" },
  planned: { label: "Planned", variant: "outline" },
};

export function SourceCard({ source, onToggle }: { source: JobSourceInfo; onToggle: (id: string) => void }) {
  const status = statusCopy[source.status];
  const canConnect = source.status === "available" || source.status === "connected";

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-z-brand-50 text-z-brand-600">
            <Plug className="h-4 w-4" />
          </div>
          <p className="text-sm font-semibold text-z-ink">{source.name}</p>
        </div>
        <Badge variant={status.variant}>{status.label}</Badge>
      </div>
      <p className="text-xs text-z-ink-faint">{source.description}</p>
      <div className="flex items-center justify-between text-xs text-z-ink-soft">
        <span>{source.opportunitiesDiscovered} discovered</span>
        {source.lastSync && (
          <span className="inline-flex items-center gap-1 text-z-ink-faint">
            <RefreshCcw className="h-3 w-3" /> {source.lastSync}
          </span>
        )}
      </div>
      {canConnect ? (
        <Button size="sm" variant={source.status === "connected" ? "secondary" : "primary"} onClick={() => onToggle(source.id)}>
          {source.status === "connected" ? "Disconnect" : "Connect"}
        </Button>
      ) : (
        <Button size="sm" variant="ghost" disabled>
          {source.status === "planned" ? "Coming soon" : "Requires approval"}
        </Button>
      )}
    </Card>
  );
}

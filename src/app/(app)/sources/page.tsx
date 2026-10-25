"use client";

import { Plug, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { SourceCard } from "@/components/sources/source-card";
import { useSources, useToggleSource } from "@/lib/hooks/use-sources";

export default function SourcesPage() {
  const { data: sources = [], isLoading } = useSources();
  const toggleMutation = useToggleSource();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="inline-flex items-center gap-2 text-xl font-semibold text-z-ink sm:text-2xl">
          <Plug className="h-5 w-5 text-z-brand" /> Opportunity Sources
        </h1>
        <p className="mt-1 text-sm text-z-ink-faint">Connect your accounts to find more opportunities across multiple platforms.</p>
      </div>

      <Card className="flex items-start gap-2.5 border-z-brand-50 bg-z-brand-50/40 p-4">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-z-brand" />
        <p className="text-sm text-z-ink-soft">
          Available integrations depend on the source&apos;s API, permissions and platform policies. Some sources
          (like LinkedIn) currently only expose limited public data.
        </p>
      </Card>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-2xl border border-z-border bg-white" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sources.map((s) => (
            <SourceCard key={s.id} source={s} onToggle={(id) => toggleMutation.mutate(id)} />
          ))}
        </div>
      )}
    </div>
  );
}

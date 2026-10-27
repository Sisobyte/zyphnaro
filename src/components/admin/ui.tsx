"use client";

import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

export function PageTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold text-z-ink sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-z-ink-soft">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Stat({ label, value, hint, className }: { label: string; value: React.ReactNode; hint?: string; className?: string }) {
  return (
    <Card className={cn("p-4", className)}>
      <p className="text-xs font-medium text-z-ink-faint">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-z-ink">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-z-ink-faint">{hint}</p>}
    </Card>
  );
}

export function ErrorNote({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <p role="alert" className="mb-4 rounded-lg bg-z-danger-bg px-3 py-2 text-sm text-z-danger">
      {error instanceof Error ? error.message : String(error)}
    </p>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg border border-dashed border-z-border-strong p-6 text-center text-sm text-z-ink-faint">{children}</p>;
}

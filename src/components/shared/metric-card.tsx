import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  icon: Icon,
  tone = "brand",
  hint,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: "brand" | "success" | "warning" | "teal";
  hint?: string;
}) {
  const toneMap: Record<string, string> = {
    brand: "bg-z-brand-50 text-z-brand-600",
    success: "bg-z-success-bg text-z-success",
    warning: "bg-z-warning-bg text-z-warning",
    teal: "bg-z-teal-bg text-z-teal",
  };
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-z-ink-faint">{label}</p>
          <p className="mt-1.5 text-2xl font-semibold text-z-ink">{value}</p>
          {hint && <p className="mt-1 text-xs text-z-ink-faint">{hint}</p>}
        </div>
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", toneMap[tone])}>
          <Icon className="h-4.5 w-4.5" />
        </div>
      </div>
    </Card>
  );
}

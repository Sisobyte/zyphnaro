import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TrustLevel } from "@/lib/types";

const levelCopy: Record<TrustLevel, string> = {
  "low-concern": "Low concern",
  "potential-concern": "Potential concern",
  "high-risk": "High risk",
};

export function TrustScore({ value, level, size = "sm" }: { value: number; level?: TrustLevel; size?: "sm" | "md" }) {
  const tone = value >= 80 ? "text-z-teal" : value >= 50 ? "text-z-warning" : "text-z-danger";
  return (
    <span className={cn("inline-flex items-center gap-1 font-medium", tone, size === "md" ? "text-sm" : "text-xs")}>
      <ShieldCheck className={size === "md" ? "h-3.5 w-3.5" : "h-3 w-3"} />
      Trust {value}
      {level && <span className="text-z-ink-faint font-normal">· {levelCopy[level]}</span>}
    </span>
  );
}

import { Target } from "lucide-react";
import { cn } from "@/lib/utils";

export function MatchScore({ value, size = "sm" }: { value: number; size?: "sm" | "md" }) {
  const tone =
    value >= 90 ? "text-z-success" : value >= 75 ? "text-z-brand" : value >= 50 ? "text-z-warning" : "text-z-danger";
  return (
    <span className={cn("inline-flex items-center gap-1 font-semibold", tone, size === "md" ? "text-sm" : "text-xs")}>
      <Target className={size === "md" ? "h-3.5 w-3.5" : "h-3 w-3"} />
      {value}% Match
    </span>
  );
}

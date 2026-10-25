import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export function CVScore({ value, size = "sm" }: { value: number; size?: "sm" | "md" }) {
  const tone = value >= 80 ? "text-z-success" : value >= 60 ? "text-z-brand" : "text-z-warning";
  return (
    <span className={cn("inline-flex items-center gap-1 font-medium", tone, size === "md" ? "text-sm" : "text-xs")}>
      <FileText className={size === "md" ? "h-3.5 w-3.5" : "h-3 w-3"} />
      CV {value}
    </span>
  );
}

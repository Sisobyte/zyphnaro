import { cn } from "@/lib/utils";

export function InterviewProgress({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-1.5 flex-1 rounded-full",
            i < current ? "bg-z-brand" : i === current ? "bg-z-brand/50" : "bg-z-border"
          )}
        />
      ))}
    </div>
  );
}

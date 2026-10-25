import { Progress } from "@/components/ui/progress";

export function InterviewScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-z-ink-soft">{label}</span>
        <span className="font-medium text-z-ink">{value}%</span>
      </div>
      <Progress value={value} />
    </div>
  );
}

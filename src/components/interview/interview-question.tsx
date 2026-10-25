import { Bot } from "lucide-react";
import { Card } from "@/components/ui/card";

export function InterviewQuestionPanel({ prompt, category }: { prompt: string; category: string }) {
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-z-navy-900 text-white">
          <Bot className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-z-ink-faint">{category}</p>
          <p className="mt-1 text-[15px] leading-relaxed text-z-ink">{prompt}</p>
        </div>
      </div>
    </Card>
  );
}

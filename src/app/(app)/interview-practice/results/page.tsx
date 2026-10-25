"use client";

import { useState } from "react";
import Link from "next/link";
import { Award, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { InterviewResultView, InterviewTranscript } from "@/components/interview/interview-result-view";
import { useSaveInterview } from "@/lib/hooks/use-saved-interviews";
import { cn } from "@/lib/utils";
import type { InterviewDifficulty, InterviewMode, InterviewResult, InterviewTurn } from "@/lib/types";

function readSession<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export default function InterviewResultsPage() {
  const [result] = useState(() => readSession<InterviewResult>("zyphnaro-interview-result"));
  const [turns] = useState(() => readSession<InterviewTurn[]>("zyphnaro-interview-turns") ?? []);
  const [meta] = useState(
    () => readSession<{ mode: InterviewMode; difficulty: InterviewDifficulty; role: string }>("zyphnaro-interview-meta")
  );
  const save = useSaveInterview();
  const saved = save.isSuccess;

  if (!result) {
    return (
      <Card className="p-10 text-center">
        <p className="text-sm font-medium text-z-ink">No recent interview results found.</p>
        <Link href="/interview-practice" className="mt-3 inline-block text-sm text-z-brand hover:underline">
          Start a new practice interview
        </Link>
      </Card>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="text-center">
        <h1 className="inline-flex items-center justify-center gap-2 text-xl font-semibold text-z-ink sm:text-2xl">
          <Award className="h-5 w-5 text-z-brand" /> Interview Results
        </h1>
        <p className="mt-1 text-sm text-z-ink-faint">Here&apos;s how you did in this practice session.</p>
      </div>

      <InterviewResultView result={result} />
      <InterviewTranscript turns={turns} />

      {save.isError && (
        <p className="rounded-lg bg-z-danger-bg px-3 py-2 text-xs text-z-danger">
          {save.error instanceof Error ? save.error.message : "Couldn't save this interview."} Please try again.
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Link href="/interview-practice" className={cn(buttonVariants({ variant: "primary" }), "flex-1")}>
          Practice Weak Areas
        </Link>
        {saved ? (
          <Link href="/interview-practice/saved" className={cn(buttonVariants({ variant: "secondary" }), "flex-1")}>
            <Check className="h-4 w-4" /> Saved. View saved interviews
          </Link>
        ) : (
          <Button
            variant="secondary"
            className="flex-1"
            disabled={save.isPending}
            onClick={() =>
              save.mutate({
                mode: meta?.mode ?? "technical",
                difficulty: meta?.difficulty ?? "realistic",
                role: meta?.role ?? "",
                result,
                turns,
              })
            }
          >
            {save.isPending ? "Saving…" : "Save Interview"}
          </Button>
        )}
      </div>
    </div>
  );
}

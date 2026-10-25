"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { InterviewResultView, InterviewTranscript } from "@/components/interview/interview-result-view";
import { useSavedInterview } from "@/lib/hooks/use-saved-interviews";

export default function SavedInterviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading } = useSavedInterview(id);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Link href="/interview-practice/saved" className="inline-flex items-center gap-1 text-xs text-z-ink-faint hover:text-z-brand">
        <ArrowLeft className="h-3.5 w-3.5" /> Saved interviews
      </Link>

      {isLoading && <div className="h-64 animate-pulse rounded-2xl border border-z-border bg-white" />}

      {!isLoading && !data && (
        <Card className="p-10 text-center text-sm text-z-ink-soft">
          This saved interview wasn&apos;t found. It may have been deleted.
        </Card>
      )}

      {data && (
        <>
          <div>
            <h1 className="text-xl font-semibold capitalize text-z-ink sm:text-2xl">
              {data.mode.replace("-", " ")} interview{data.role ? ` · ${data.role}` : ""}
            </h1>
            <p className="mt-1 text-sm text-z-ink-faint">
              {new Date(data.createdAt).toLocaleString(undefined, { dateStyle: "long", timeStyle: "short" })} · {data.difficulty}
            </p>
          </div>
          <InterviewResultView result={data.result} />
          <InterviewTranscript turns={data.turns} />
        </>
      )}
    </div>
  );
}

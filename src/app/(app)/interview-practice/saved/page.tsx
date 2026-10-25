"use client";

import Link from "next/link";
import { ArrowLeft, History, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useDeleteSavedInterview, useSavedInterviews } from "@/lib/hooks/use-saved-interviews";
import { cn } from "@/lib/utils";

const modeLabels: Record<string, string> = {
  technical: "Technical",
  behavioral: "Behavioral",
  "role-focused": "Role-focused",
  company: "Company",
  "full-mock": "Full mock",
};

function scoreColor(n: number) {
  return n >= 70 ? "text-z-success" : n >= 45 ? "text-z-warning" : "text-z-danger";
}

export default function SavedInterviewsPage() {
  const { data, isLoading, isError, refetch } = useSavedInterviews();
  const del = useDeleteSavedInterview();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <div>
        <Link href="/interview-practice" className="mb-2 inline-flex items-center gap-1 text-xs text-z-ink-faint hover:text-z-brand">
          <ArrowLeft className="h-3.5 w-3.5" /> Interview Practice
        </Link>
        <h1 className="inline-flex items-center gap-2 text-xl font-semibold text-z-ink sm:text-2xl">
          <History className="h-5 w-5 text-z-brand" /> Saved interviews
        </h1>
        <p className="mt-1 text-sm text-z-ink-faint">Open one to review your answers and feedback.</p>
      </div>

      {isLoading && <div className="h-40 animate-pulse rounded-2xl border border-z-border bg-white" />}

      {isError && (
        <Card className="p-6 text-center text-sm text-z-ink-soft">
          Couldn&apos;t load your saved interviews.{" "}
          <button onClick={() => refetch()} className="font-medium text-z-brand hover:underline">
            Try again
          </button>
        </Card>
      )}

      {data && data.length === 0 && (
        <Card className="p-10 text-center">
          <p className="text-sm font-medium text-z-ink">No saved interviews yet.</p>
          <p className="mt-1 text-xs text-z-ink-faint">Finish a practice interview and press &ldquo;Save Interview&rdquo; on the results page.</p>
          <Link href="/interview-practice" className="mt-3 inline-block text-sm text-z-brand hover:underline">
            Start a practice interview
          </Link>
        </Card>
      )}

      {data && data.length > 0 && (
        <ul className="flex flex-col gap-3">
          {data.map((s) => (
            <li key={s.id}>
              <Card className="flex items-center gap-4 p-4">
                <Link href={`/interview-practice/saved/${s.id}`} className="flex min-w-0 flex-1 items-center gap-4">
                  <span className={cn("w-14 shrink-0 text-center text-2xl font-semibold", scoreColor(s.readiness))}>
                    {s.readiness}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-z-ink">
                      {modeLabels[s.mode] ?? s.mode} interview{s.role ? ` · ${s.role}` : ""}
                    </span>
                    <span className="block text-xs text-z-ink-faint">
                      {new Date(s.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })} · {s.difficulty} ·{" "}
                      {s.result.answered ?? s.turns.length} answered
                    </span>
                  </span>
                </Link>
                <button
                  aria-label="Delete this saved interview"
                  disabled={del.isPending}
                  onClick={() => {
                    if (window.confirm("Delete this saved interview? This can't be undone.")) del.mutate(s.id);
                  }}
                  className="rounded-md p-2 text-z-ink-faint hover:bg-z-surface hover:text-z-danger disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

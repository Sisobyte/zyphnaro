"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/report-error";

// Catches unexpected errors in a page so people see a calm message and a retry
// button instead of a blank screen. The details are only logged.
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
    reportClientError(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="text-sm text-z-ink-soft">
        We couldn&apos;t load this page. Your data is safe. Please try again.
      </p>
      <button onClick={reset} className="rounded-lg bg-z-navy-800 px-4 py-2 text-sm font-medium text-white">
        Try again
      </button>
    </div>
  );
}

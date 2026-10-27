"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/report-error";

// Last-resort fallback when the root layout itself fails. It must render its
// own <html> and <body>.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportClientError(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0 }}>
        <div style={{ textAlign: "center", padding: 16 }}>
          <h1 style={{ fontSize: 20 }}>Something went wrong</h1>
          <p style={{ color: "#555" }}>Please reload the page.</p>
          <button onClick={reset} style={{ padding: "8px 16px", borderRadius: 8, border: 0, background: "#0f1b33", color: "#fff" }}>
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}

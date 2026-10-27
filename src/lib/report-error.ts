// Sends a crash to the server so the admin Health page can show it. Best effort.
export function reportClientError(error: Error & { digest?: string }) {
  try {
    void fetch("/api/errors/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: `${error.message}${error.digest ? ` (digest ${error.digest})` : ""}`, path: window.location.pathname }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}

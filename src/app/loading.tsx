export default function Loading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-live="polite">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-z-border border-t-z-navy-700" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}

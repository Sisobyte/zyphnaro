import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-xl font-semibold">Page not found</h1>
      <p className="text-sm text-z-ink-soft">That page doesn&apos;t exist or has moved.</p>
      <Link href="/dashboard" className="rounded-lg bg-z-navy-800 px-4 py-2 text-sm font-medium text-white">
        Back to dashboard
      </Link>
    </div>
  );
}

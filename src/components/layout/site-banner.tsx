import { cn } from "@/lib/utils";

export function SiteBanner({ text, level }: { text: string; level: "info" | "warning" }) {
  return (
    <div role="status" className={cn("px-4 py-2 text-center text-sm", level === "warning" ? "bg-z-warning-bg text-z-warning" : "bg-z-brand-50 text-z-brand-600")}>
      {text}
    </div>
  );
}

export function MaintenanceScreen({ message }: { message: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-z-surface p-6 text-center">
      <div className="max-w-md">
        <h1 className="text-xl font-semibold text-z-ink">We&apos;ll be right back</h1>
        <p className="mt-2 text-sm text-z-ink-soft">{message || "Zyphnaro is down for maintenance. Please check back in a little while."}</p>
      </div>
    </div>
  );
}

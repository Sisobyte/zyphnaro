"use client";

import { cn } from "@/lib/utils";

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        // overflow-hidden matters here: without it, the knob's square
        // bounding box can visually poke past the track's rounded corners
        // instead of being clipped to the pill shape.
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors overflow-hidden",
        checked ? "bg-z-brand" : "bg-z-border-strong"
      )}
    >
      <span
        className={cn(
          "h-5 w-5 shrink-0 rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  );
}
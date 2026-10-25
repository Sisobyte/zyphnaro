"use client";

import { cn } from "@/lib/utils";
import { Search } from "lucide-react";
import { Select } from "@/components/ui/select";
import type { OpportunityFilterKey, OpportunitySortKey } from "@/lib/types";

// The canonical definitions live in @/lib/types so the repositories and the
// database query share them; re-exported here so existing imports keep working.
export type FilterKey = OpportunityFilterKey;

const filters: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "remote", label: "Remote" },
  { key: "full-time", label: "Full-time" },
  { key: "freelance", label: "Freelance" },
  { key: "internship", label: "Internship" },
  { key: "junior", label: "Junior" },
  { key: "senior", label: "Senior" },
  { key: "high-match", label: "High Match" },
  { key: "fresh", label: "Fresh" },
  { key: "high-trust", label: "High Trust" },
];

export type SortKey = OpportunitySortKey;

export function OpportunityFilters({
  active,
  onChange,
  search,
  onSearchChange,
  sort,
  onSortChange,
}: {
  active: FilterKey;
  onChange: (key: FilterKey) => void;
  search: string;
  onSearchChange: (v: string) => void;
  sort: SortKey;
  onSortChange: (v: SortKey) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-z-ink-faint" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search opportunities, companies, skills..."
            className="h-10 w-full rounded-lg border border-z-border-strong bg-white pl-9 pr-3 text-sm text-z-ink placeholder:text-z-ink-faint focus:border-z-brand focus:outline-none focus:ring-2 focus:ring-z-brand/30"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="whitespace-nowrap text-xs text-z-ink-faint">Sort</span>
          <Select value={sort} onChange={(e) => onSortChange(e.target.value as SortKey)} className="w-44">
            <option value="best-match">Best Match</option>
            <option value="newest">Newest</option>
            <option value="highest-trust">Highest Trust</option>
            <option value="highest-salary">Highest Salary</option>
          </Select>
        </div>
      </div>

      {/* Phones: one dropdown. */}
      <div className="flex items-center gap-2 sm:hidden">
        <span className="whitespace-nowrap text-xs text-z-ink-faint">Filter</span>
        <Select value={active} onChange={(e) => onChange(e.target.value as FilterKey)} className="w-full" aria-label="Filter opportunities">
          {filters.map((f) => (
            <option key={f.key} value={f.key}>
              {f.label}
            </option>
          ))}
        </Select>
      </div>

      {/* Tablet and desktop: the original chip row. */}
      <div className="z-scroll-light hidden gap-1.5 overflow-x-auto pb-1 sm:flex">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => onChange(f.key)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              active === f.key
                ? "border-z-brand bg-z-brand-50 text-z-brand-600"
                : "border-z-border-strong bg-white text-z-ink-soft hover:bg-z-surface"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}
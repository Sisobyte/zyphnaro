"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Briefcase, CornerDownLeft, FileEdit, MessagesSquare, Radar, Search } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { opportunityRepository } from "@/lib/repositories";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { useApplications } from "@/lib/hooks/use-applications";
import { useTailoredCVs } from "@/lib/hooks/use-tailored-cvs";
import { useSavedInterviews } from "@/lib/hooks/use-saved-interviews";
import { scoreTarget, searchStatic, staticTargets } from "@/lib/search-index";

interface Row {
  id: string;
  group: string;
  label: string;
  hint?: string;
  href: string;
  icon: LucideIcon;
}

const GROUP_ORDER = ["Pages", "Actions", "Jobs", "Your applications", "Your tailored CVs", "Your saved interviews", "Search"];

// Opens with Ctrl/Cmd+K or by clicking the search bar. Finds pages and actions
// instantly, and also looks inside the person's own data (jobs, applications,
// tailored CVs, saved interviews). Enter opens the highlighted result.
export function GlobalSearch({ variant }: { variant: "bar" | "icon" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActive(0);
  }, []);

  // Ctrl/Cmd+K from anywhere in the app.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 0);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(t);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const q = query.trim();
  const debounced = useDebouncedValue(q, 250);

  // Live job search runs in the database, and only once there are 2+ letters.
  const jobs = useQuery({
    queryKey: ["global-search-jobs", debounced],
    queryFn: () => opportunityRepository.searchOpportunities({ query: debounced, filter: "all", sort: "best-match", limit: 5 }),
    enabled: open && debounced.length >= 2,
    staleTime: 30_000,
  });

  // The person's own data is already cached by the pages that use it; these
  // only fetch while the search is open.
  const apps = useApplications();
  const cvs = useTailoredCVs();
  const interviews = useSavedInterviews();

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    const modeLabel = (m: string) => m.replace("-", " ");

    if (!q) {
      // Nothing typed: offer the pages, so the bar works like a menu too.
      staticTargets
        .filter((t) => t.kind === "page")
        .forEach((t) => out.push({ id: t.id, group: "Pages", label: t.label, hint: t.hint, href: t.href, icon: t.icon }));
      return out;
    }

    searchStatic(q, 8).forEach((t) =>
      out.push({ id: t.id, group: t.kind === "page" ? "Pages" : "Actions", label: t.label, hint: t.hint, href: t.href, icon: t.icon })
    );

    (jobs.data?.items ?? []).forEach((o) =>
      out.push({
        id: `job:${o.id}`,
        group: "Jobs",
        label: o.title,
        hint: `${o.company.name} · ${o.match.overall}% match`,
        href: `/opportunities/${o.id}`,
        icon: Radar,
      })
    );

    (apps.data ?? [])
      .filter((a) => scoreTarget({ label: a.title, hint: a.company }, q) > 0)
      .slice(0, 3)
      .forEach((a) =>
        out.push({ id: `app:${a.id}`, group: "Your applications", label: a.title, hint: `${a.company} · ${a.stage}`, href: `/opportunities/${a.opportunityId}`, icon: Briefcase })
      );

    (cvs.data ?? [])
      .filter((c) => scoreTarget({ label: c.opportunityTitle, hint: c.company }, q) > 0)
      .slice(0, 3)
      .forEach((c) =>
        out.push({ id: `cv:${c.id}`, group: "Your tailored CVs", label: c.opportunityTitle, hint: c.company, href: `/tailored-cvs/${c.id}`, icon: FileEdit })
      );

    (interviews.data ?? [])
      .filter((s) => scoreTarget({ label: `${modeLabel(s.mode)} interview`, hint: s.role }, q) > 0)
      .slice(0, 3)
      .forEach((s) =>
        out.push({
          id: `si:${s.id}`,
          group: "Your saved interviews",
          label: `${modeLabel(s.mode)} interview${s.role ? ` · ${s.role}` : ""}`,
          hint: `Scored ${s.readiness} · ${new Date(s.createdAt).toLocaleDateString()}`,
          href: `/interview-practice/saved/${s.id}`,
          icon: MessagesSquare,
        })
      );

    out.push({ id: "all-jobs", group: "Search", label: `Search all jobs for "${q}"`, href: `/opportunities?q=${encodeURIComponent(q)}`, icon: Search });

    return out.sort((a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group));
  }, [q, jobs.data, apps.data, cvs.data, interviews.data]);

  // Keep the highlighted row in range and in view.
  const safeActive = Math.min(active, Math.max(0, rows.length - 1));
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${safeActive}"]`)?.scrollIntoView({ block: "nearest" });
  }, [safeActive]);

  const go = (row: Row | undefined) => {
    if (!row) return;
    close();
    router.push(row.href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(Math.min(safeActive + 1, rows.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(Math.max(safeActive - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(rows[safeActive]);
    } else if (e.key === "Escape") {
      close();
    }
  };

  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
  const loadingJobs = q.length >= 2 && (jobs.isFetching || debounced !== q);

  return (
    <>
      {variant === "bar" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="relative flex h-9 w-full max-w-md items-center rounded-lg border border-z-border-strong bg-z-surface pl-9 pr-3 text-left text-sm text-z-ink-faint transition-colors hover:bg-white"
          aria-label="Search the whole app"
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <span className="truncate">Search pages, jobs, CVs, interviews…</span>
          <kbd className="ml-auto hidden rounded border border-z-border-strong bg-white px-1.5 py-0.5 text-[10px] font-medium text-z-ink-faint sm:inline">
            {isMac ? "⌘" : "Ctrl"} K
          </kbd>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-z-ink-soft"
          aria-label="Search the whole app"
        >
          <Search className="h-[18px] w-[18px]" />
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center px-3 pt-[10vh] sm:pt-[14vh]" role="dialog" aria-modal="true" aria-label="Search">
          <div className="absolute inset-0 bg-z-navy-950/50 backdrop-blur-[2px]" onClick={close} />
          <div className="relative flex max-h-[70vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-z-border bg-white shadow-2xl">
            <div className="flex items-center gap-2.5 border-b border-z-border px-4">
              <Search className="h-4 w-4 shrink-0 text-z-ink-faint" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                onKeyDown={onKeyDown}
                role="combobox"
                aria-expanded="true"
                aria-controls="global-search-list"
                aria-activedescendant={rows[safeActive] ? `gs-${safeActive}` : undefined}
                placeholder="Search pages, jobs, CVs, interviews, settings…"
                className="h-12 w-full bg-transparent text-sm text-z-ink placeholder:text-z-ink-faint focus:outline-none"
              />
              {loadingJobs && <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-z-border border-t-z-brand" aria-label="Searching" />}
              <kbd className="hidden shrink-0 rounded border border-z-border-strong px-1.5 py-0.5 text-[10px] text-z-ink-faint sm:inline">Esc</kbd>
            </div>

            <ul ref={listRef} id="global-search-list" role="listbox" className="z-scroll-light overflow-y-auto p-2">
              {rows.length === 0 && <li className="px-3 py-8 text-center text-sm text-z-ink-faint">Nothing found.</li>}
              {rows.map((row, i) => {
                const showHeading = row.group !== rows[i - 1]?.group;
                const Icon = row.icon;
                const isActive = i === safeActive;
                return (
                  <li key={row.id} role="presentation">
                    {showHeading && <p className="px-3 pb-1 pt-3 text-xs font-medium text-z-ink-faint first:pt-1">{row.group}</p>}
                    <button
                      id={`gs-${i}`}
                      data-index={i}
                      role="option"
                      aria-selected={isActive}
                      onMouseMove={() => setActive(i)}
                      onClick={() => go(row)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm",
                        isActive ? "bg-z-brand-50 text-z-ink" : "text-z-ink-soft"
                      )}
                    >
                      <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-md", isActive ? "bg-white text-z-brand" : "bg-z-surface text-z-ink-faint")}>
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-z-ink">{row.label}</span>
                        {row.hint && <span className="block truncate text-xs text-z-ink-faint">{row.hint}</span>}
                      </span>
                      {isActive && <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-z-brand" />}
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="flex items-center gap-4 border-t border-z-border bg-z-surface px-4 py-2 text-[11px] text-z-ink-faint">
              <span>↑ ↓ to move</span>
              <span>Enter to open</span>
              <span className="ml-auto inline-flex items-center gap-1">
                Jobs show your best matches first <ArrowRight className="h-3 w-3" />
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

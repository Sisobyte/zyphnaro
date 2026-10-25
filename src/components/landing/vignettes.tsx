// Small, faithful pictures of the real app screens used on the landing page.
// They are static illustrations with example data, built from the same colours,
// spacing and wording as the app so the page shows what signing up gives you.

import { Check, CircleAlert, ShieldCheck, Mic, Bell, Radar, ScanSearch } from "lucide-react";
import { cn } from "@/lib/utils";

function Bar({ label, value, note, tone = "bg-z-brand" }: { label: string; value: number; note?: string; tone?: string }) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-sm">
        <span className="text-z-ink-soft">{label}</span>
        <span className="font-semibold tabular-nums text-z-ink">
          {value}
          {note && <span className="ml-1.5 text-xs font-normal text-z-ink-faint">{note}</span>}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-z-border">
        <div className={cn("h-full rounded-full", tone)} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

// How a match score is built, using the app's real weights.
export function MatchReport() {
  return (
    <div className="rounded-2xl border border-z-border bg-white p-5 shadow-[0_18px_50px_-20px_rgba(18,23,43,0.25)] sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[15px] font-semibold text-z-ink">Operations Assistant</p>
          <p className="text-sm text-z-ink-faint">Delta Freight, hybrid in Abuja</p>
        </div>
        <p className="z-display text-4xl font-semibold tabular-nums text-z-ink">74</p>
      </div>

      <div className="mt-5 space-y-3.5">
        <Bar label="Skills" value={80} note="counts for 45%" />
        <Bar label="Level" value={55} note="counts for 25%" tone="bg-z-warning" />
        <Bar label="Role fit" value={85} note="counts for 20%" />
        <Bar label="Location" value={100} note="counts for 10%" />
      </div>

      <div className="mt-5 grid gap-4 border-t border-z-border pt-4 sm:grid-cols-2">
        <div>
          <p className="mb-1.5 text-sm font-semibold text-z-success">Why you match</p>
          <ul className="space-y-1 text-sm text-z-ink-soft">
            <li className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-z-success" />Scheduling and Logistics are on your CV</li>
            <li className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-z-success" />Hybrid in a city you can reach</li>
          </ul>
        </div>
        <div>
          <p className="mb-1.5 text-sm font-semibold text-z-warning">Worth checking</p>
          <ul className="space-y-1 text-sm text-z-ink-soft">
            <li className="flex gap-2"><CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-z-warning" />Asks for 3 years. Your CV shows 2</li>
            <li className="flex gap-2"><CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-z-warning" />Missing: Inventory Control</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export function RegionCap() {
  return (
    <div className="rounded-xl border border-z-warning/30 bg-z-warning-bg/60 p-4 text-sm text-z-ink-soft">
      <p className="font-semibold text-z-ink">Open to residents of Germany only</p>
      <p className="mt-1">
        Skills may fit perfectly, but if you can&apos;t work there the score is capped at 55 and the card says why, so a job you
        can&apos;t take never sits at the top of your list.
      </p>
    </div>
  );
}

export function TrustReport() {
  return (
    <div className="rounded-2xl border border-z-border bg-white p-5 shadow-[0_18px_50px_-20px_rgba(18,23,43,0.25)] sm:p-6">
      <div className="flex items-center gap-4">
        <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-[7px] border-z-teal/25 border-t-z-teal">
          <span className="z-display text-2xl font-semibold text-z-teal">94</span>
        </div>
        <div>
          <p className="flex items-center gap-1.5 text-[15px] font-semibold text-z-ink">
            <ShieldCheck className="h-4 w-4 text-z-teal" /> Low concern
          </p>
          <p className="text-sm text-z-ink-faint">Based on where the listing came from and what it says.</p>
        </div>
      </div>
      <ul className="mt-4 divide-y divide-z-border text-sm">
        {[
          ["Posted on the company's own career page", true],
          ["A real company profile is attached", true],
          ["The apply link goes to the original posting", true],
          ["No request for payment found", true],
          ["Salary is not stated", false],
        ].map(([text, ok]) => (
          <li key={text as string} className="flex items-center gap-2.5 py-2 text-z-ink-soft">
            {ok ? <Check className="h-3.5 w-3.5 shrink-0 text-z-teal" /> : <CircleAlert className="h-3.5 w-3.5 shrink-0 text-z-warning" />}
            {text as string}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CvReport() {
  return (
    <div className="rounded-2xl border border-z-border bg-white p-5 shadow-[0_18px_50px_-20px_rgba(18,23,43,0.25)] sm:p-6">
      <div className="flex items-center gap-2 text-sm font-semibold text-z-ink">
        <ScanSearch className="h-4 w-4 text-z-brand" /> Your CV against Executive Assistant at Kestrel Advisory
      </div>
      <div className="mt-4 grid grid-cols-2 gap-6">
        <div>
          <p className="text-xs text-z-ink-faint">Your CV as it is</p>
          <p className="z-display text-4xl font-semibold tabular-nums text-z-ink-soft">62</p>
        </div>
        <div>
          <p className="text-xs text-z-ink-faint">Tailored for this job</p>
          <p className="z-display text-4xl font-semibold tabular-nums text-z-success">81</p>
        </div>
      </div>
      <div className="mt-4 space-y-2 border-t border-z-border pt-4 text-sm text-z-ink-soft">
        <p className="font-semibold text-z-ink">Suggested changes</p>
        <p className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-z-brand" />Lead with calendar and travel coordination, which the job asks for first</p>
        <p className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-z-brand" />Move your Excel reporting project above the volunteer work</p>
        <p className="flex gap-2"><CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-z-warning" />The job mentions Concur. It isn&apos;t on your CV, so it isn&apos;t added</p>
      </div>
    </div>
  );
}

export function InterviewReport() {
  return (
    <div className="rounded-2xl border border-white/10 bg-z-navy-900 p-5 text-z-slate-300 sm:p-6">
      <div className="flex items-center gap-2 text-xs text-z-slate-400">
        <Mic className="h-3.5 w-3.5 text-z-mint" /> Question 2 of 4
        <span className="ml-auto flex items-center gap-1 rounded-full border border-white/15 p-0.5">
          <span className="rounded-full bg-z-brand px-2 py-0.5 text-[11px] font-medium text-white">Female voice</span>
          <span className="px-2 py-0.5 text-[11px]">Male voice</span>
        </span>
      </div>
      <p className="mt-3 text-[15px] leading-relaxed text-white">
        A client emails you at 6 pm asking for a report you promised for the next morning, and you haven&apos;t started. What do you do?
      </p>
      <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.04] p-3 text-sm leading-relaxed">
        I would tell them it is on my list and send it when I can. I would work on it after dinner.
      </div>
      <div className="mt-4 flex items-start gap-4 border-t border-white/10 pt-4">
        <p className="z-display text-4xl font-semibold tabular-nums text-[#f0b863]">41</p>
        <p className="text-sm leading-relaxed">
          Honest feedback: this doesn&apos;t say when the client will get it, how you will check the draft, or what you would drop to
          make time. Give a time, then the steps.
        </p>
      </div>
    </div>
  );
}

const boardColumns = [
  { name: "Saved", cards: [["Customer Support Associate", "Lumen Retail"]] },
  { name: "Preparing", cards: [["Executive Assistant", "Kestrel Advisory"], ["Virtual Assistant", "Harbor Studio"]] },
  { name: "Applied", cards: [["Operations Assistant", "Delta Freight"]] },
  { name: "Interview", cards: [["Accounts Officer", "Cedarway Group"]] },
];

export function Board() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {boardColumns.map((c) => (
        <div key={c.name} className="rounded-xl bg-z-surface p-2.5">
          <p className="px-1 pb-2 text-xs font-semibold text-z-ink-soft">
            {c.name} <span className="font-normal text-z-ink-faint">{c.cards.length}</span>
          </p>
          <div className="space-y-2">
            {c.cards.map(([t, co]) => (
              <div key={t} className="rounded-lg border border-z-border bg-white p-2.5">
                <p className="text-[13px] font-medium leading-snug text-z-ink">{t}</p>
                <p className="text-xs text-z-ink-faint">{co}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function AlertCard() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-z-border bg-white p-4 shadow-[0_18px_50px_-20px_rgba(18,23,43,0.25)]">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-z-brand-50 text-z-brand-600">
        <Bell className="h-4 w-4" />
      </div>
      <div>
        <p className="text-sm font-semibold text-z-ink">New 87% match: Virtual Assistant</p>
        <p className="mt-0.5 text-sm text-z-ink-soft">Harbor Studio, remote, found today. Matches your skills: Scheduling, Email Management, Excel.</p>
      </div>
    </div>
  );
}

const demoSources = [
  { name: "Adzuna", on: true },
  { name: "Greenhouse", on: true },
  { name: "Lever", on: true },
  { name: "Jooble", on: true },
  { name: "MyJobMag", on: true },
  { name: "Remotive", on: true },
  { name: "Remote OK", on: false },
  { name: "Himalayas", on: true },
  { name: "Hacker News", on: false },
];

export function SourceSwitches() {
  return (
    <ul className="divide-y divide-z-border rounded-2xl border border-z-border bg-white shadow-[0_18px_50px_-20px_rgba(18,23,43,0.25)]">
      {demoSources.map((s) => (
        <li key={s.name} className="flex items-center gap-3 px-4 py-2.5 text-sm">
          <Radar className="h-3.5 w-3.5 text-z-ink-faint" />
          <span className="text-z-ink">{s.name}</span>
          <span className={cn("ml-auto text-xs", s.on ? "text-z-success" : "text-z-ink-faint")}>{s.on ? "On" : "Off"}</span>
          <span className={cn("relative h-5 w-9 rounded-full p-0.5", s.on ? "bg-z-brand" : "bg-z-border-strong")}>
            <span className={cn("block h-4 w-4 rounded-full bg-white shadow-sm", s.on && "translate-x-4")} />
          </span>
        </li>
      ))}
    </ul>
  );
}

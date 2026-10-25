"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { PROFESSIONS } from "./landing-data";

// The hero. A radar plots every listing Zyphnaro "read" as a dot. Most stay dim
// (set aside). The few that fit light up, and the closer a lit dot sits to the
// centre, the better it fits. Pick a profession to see how the radar changes.
//
// Everything here is an example. The page says so next to the demo.

const SWEEP_SECONDS = 9;
const MATCH_ANGLES = [36, 128, 214, 306];

// Deterministic scatter (no randomness, so the server and every browser agree).
// Integer-only generator, built once when the module loads.
const NOISE = (() => {
  let seed = 20261022;
  const next = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  return Array.from({ length: 80 }, () => ({ angle: next() * 360, radius: Math.sqrt(next()) * 0.88 + 0.08 }));
})();

function polar(angleDeg: number, radius: number) {
  const a = (angleDeg * Math.PI) / 180;
  return { left: `${(50 + radius * 50 * Math.sin(a)).toFixed(2)}%`, top: `${(50 - radius * 50 * Math.cos(a)).toFixed(2)}%` };
}

export function HeroStage({ children }: { children: React.ReactNode }) {
  const [pid, setPid] = useState(PROFESSIONS[0].id);
  const [focus, setFocus] = useState(0);
  const profession = PROFESSIONS.find((p) => p.id === pid) ?? PROFESSIONS[0];

  return (
    <>
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-5 pb-10 pt-12 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,480px)] lg:gap-12 lg:pt-16">
        <div>{children}</div>

        <div>
          <div className="mb-3 flex flex-wrap items-center gap-1.5" role="group" aria-label="Choose a profession to preview">
            <span className="mr-1 text-xs text-z-slate-400">Preview it for</span>
            {PROFESSIONS.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setPid(p.id);
                  setFocus(0);
                }}
                aria-pressed={p.id === pid}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                  p.id === pid
                    ? "border-z-brand bg-z-brand text-white"
                    : "border-white/15 text-z-slate-300 hover:border-white/35 hover:text-white"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div
            className="relative mx-auto aspect-square w-full max-w-[480px] overflow-hidden rounded-full border border-white/15 bg-[radial-gradient(circle_at_center,rgba(61,90,254,0.14),rgba(10,14,26,0)_68%)]"
            role="img"
            aria-label={`Radar preview: ${profession.read.toLocaleString()} listings read, ${profession.matches.length} worth your time`}
          >
            {[0.75, 0.5, 0.25].map((r) => (
              <div key={r} className="absolute rounded-full border border-white/10" style={{ inset: `${(1 - r) * 50}%` }} />
            ))}
            <div className="absolute inset-y-0 left-1/2 w-px bg-white/10" />
            <div className="absolute inset-x-0 top-1/2 h-px bg-white/10" />

            {/* The beam */}
            <div
              className="z-radar-sweep absolute inset-0 rounded-full"
              style={{ background: "conic-gradient(from 0deg, rgba(61,90,254,0) 0deg, rgba(61,90,254,0) 285deg, rgba(61,90,254,0.42) 360deg)" }}
            />

            {NOISE.map((n, i) => (
              <span
                key={i}
                className="z-radar-blip absolute h-[5px] w-[5px] rounded-full bg-z-slate-300"
                style={{ ...polar(n.angle, n.radius), animationDelay: `${((n.angle / 360) * SWEEP_SECONDS).toFixed(2)}s`, opacity: 0.16, transform: "translate(-50%, -50%)" }}
              />
            ))}

            {profession.matches.map((m, i) => {
              const radius = 0.16 + ((100 - m.score) / 100) * 1.05;
              const angle = MATCH_ANGLES[i];
              const pos = polar(angle, Math.min(radius, 0.82));
              const delay = `${((angle / 360) * SWEEP_SECONDS).toFixed(2)}s`;
              const isFocus = focus === i;
              return (
                <div key={`${profession.id}-${i}`}>
                  <span className="z-radar-ring absolute h-5 w-5 rounded-full border border-z-mint" style={{ ...pos, animationDelay: delay, opacity: 0 }} />
                  <button
                    onClick={() => setFocus(i)}
                    onMouseEnter={() => setFocus(i)}
                    aria-label={`${m.title}, ${m.score}% match`}
                    className="absolute -translate-x-1/2 -translate-y-1/2"
                    style={pos}
                  >
                    <span
                      className={cn(
                        "block rounded-full bg-z-mint transition-all",
                        isFocus ? "h-3.5 w-3.5 shadow-[0_0_0_4px_rgba(45,212,167,0.25),0_0_18px_rgba(45,212,167,0.8)]" : "h-2.5 w-2.5 shadow-[0_0_10px_rgba(45,212,167,0.6)]"
                      )}
                    />
                    <span
                      className={cn(
                        "absolute left-full top-1/2 ml-2 -translate-y-1/2 whitespace-nowrap rounded bg-z-navy-900/90 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
                        isFocus ? "text-z-mint" : "text-z-slate-300"
                      )}
                    >
                      {m.score}%
                    </span>
                  </button>
                </div>
              );
            })}

            <div className="absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-z-brand text-[10px] font-semibold text-white shadow-[0_0_0_5px_rgba(61,90,254,0.25)]">
              You
            </div>
          </div>

          <p className="mx-auto mt-3 max-w-[480px] text-center text-xs leading-relaxed text-z-slate-400">
            Each dot is a listing we read. Lit dots are worth your time, and the closer to you, the better the fit. Example results with invented companies.
          </p>
        </div>
      </div>

      {/* The ranked list the radar produces */}
      <div className="mx-auto max-w-6xl px-5 pb-16">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-white/15 pb-3">
          <h2 className="z-display text-xl font-semibold text-white sm:text-2xl">
            {profession.read.toLocaleString()} listings read. {profession.matches.length} worth your time today.
          </h2>
          <p className="text-xs text-z-slate-400">
            {profession.inField} in your field, {profession.fit} fit your skills. Numbers differ for everyone.
          </p>
        </div>

        <ol>
          {profession.matches.map((m, i) => (
            <li key={`${profession.id}-${i}`}>
              <button
                onClick={() => setFocus(i)}
                onMouseEnter={() => setFocus(i)}
                className={cn(
                  "grid w-full grid-cols-[64px_1fr] items-start gap-x-4 gap-y-2 border-b border-white/10 px-2 py-4 text-left transition-colors md:grid-cols-[72px_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)]",
                  focus === i ? "bg-white/[0.05]" : "hover:bg-white/[0.03]"
                )}
              >
                <div>
                  <p className="z-display text-3xl font-semibold tabular-nums text-white">{m.score}</p>
                  <div className="mt-1 h-1 w-12 overflow-hidden rounded-full bg-white/10">
                    <div className={cn("h-full rounded-full", m.score >= 80 ? "bg-z-mint" : "bg-[#6f86ff]")} style={{ width: `${m.score}%` }} />
                  </div>
                </div>
                <div>
                  <p className="text-[15px] font-medium text-white">{m.title}</p>
                  <p className="text-sm text-z-slate-400">
                    {m.company}, {m.where}
                  </p>
                </div>
                <div className="col-start-2 flex flex-wrap gap-1.5 md:col-start-auto">
                  {m.skills.map((s) => (
                    <span key={s} className="rounded-md bg-z-brand/20 px-2 py-0.5 text-xs font-medium text-[#b6c1ff]">
                      {s}
                    </span>
                  ))}
                </div>
                <p className={cn("col-start-2 text-sm md:col-start-auto", m.watch ? "text-[#f0b863]" : "text-z-slate-400")}>
                  {m.watch ?? "Skills, level and location line up."}
                </p>
              </button>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-xs text-z-slate-400">
          Every match shows its reasons and anything worth checking before you apply.{" "}
          <Link href="/signup" className="font-medium text-white underline underline-offset-4 hover:text-z-mint">
            See yours
          </Link>
        </p>
      </div>
    </>
  );
}

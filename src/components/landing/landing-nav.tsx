"use client";

import Link from "next/link";
import { useState } from "react";
import { Radar, Menu, X } from "lucide-react";

const links = [
  { href: "#fields", label: "Every profession" },
  { href: "#matching", label: "Matching" },
  { href: "#sources", label: "Sources" },
  { href: "#how", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

export function LandingNav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-z-navy-950/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-5">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-z-brand text-white shadow-[0_0_18px_rgba(61,90,254,0.55)]">
            <Radar className="h-[18px] w-[18px]" />
          </div>
          <span className="z-display text-[17px] font-semibold text-white">Zyphnaro</span>
        </Link>

        <nav className="ml-4 hidden items-center gap-5 lg:flex" aria-label="Page sections">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-sm text-z-slate-300 transition-colors hover:text-white">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-3 md:flex">
          <Link href="/login" className="text-sm font-medium text-z-slate-300 hover:text-white">
            Sign in
          </Link>
          <Link href="/signup" className="rounded-lg bg-z-brand px-4 py-2 text-sm font-semibold text-white hover:bg-z-brand-600">
            Create free account
          </Link>
        </div>

        <button className="ml-auto text-white md:hidden" onClick={() => setOpen((o) => !o)} aria-label="Toggle menu" aria-expanded={open}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-white/10 bg-z-navy-950 px-5 py-4 md:hidden">
          <nav className="flex flex-col gap-3">
            {links.map((l) => (
              <a key={l.href} href={l.href} className="text-sm text-z-slate-300" onClick={() => setOpen(false)}>
                {l.label}
              </a>
            ))}
            <Link href="/login" className="text-sm font-medium text-z-slate-300" onClick={() => setOpen(false)}>
              Sign in
            </Link>
            <Link href="/signup" className="mt-1 w-fit rounded-lg bg-z-brand px-4 py-2 text-sm font-semibold text-white" onClick={() => setOpen(false)}>
              Create free account
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

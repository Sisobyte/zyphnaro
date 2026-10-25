import Link from "next/link";
import { Radar } from "lucide-react";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh bg-z-surface">
      <div className="hidden w-[42%] shrink-0 flex-col justify-between bg-z-navy-900 p-10 text-white lg:flex">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-z-brand text-white">
            <Radar className="h-4.5 w-4.5" />
          </div>
          <span className="text-[15px] font-semibold tracking-tight">Zyphnaro</span>
        </Link>
        <div>
          <p className="text-2xl font-semibold leading-snug">
            Don&apos;t just find opportunities.
            <br />
            Know which ones are worth pursuing.
          </p>
          <p className="mt-4 max-w-sm text-sm text-z-slate-400">
            Zyphnaro discovers, verifies, and scores opportunities against your profile —
            so you spend your time on the ones that actually matter.
          </p>
        </div>
        <p className="text-xs text-z-slate-400">© 2026 Zyphnaro. All rights reserved.</p>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm">
          <Link href="/" className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-z-brand text-white">
              <Radar className="h-4.5 w-4.5" />
            </div>
            <span className="text-[15px] font-semibold tracking-tight text-z-ink">Zyphnaro</span>
          </Link>
          <h1 className="text-xl font-semibold text-z-ink">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-z-ink-faint">{subtitle}</p>}
          <div className="mt-6">{children}</div>
          {footer && <div className="mt-6 text-center text-sm text-z-ink-faint">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Megaphone, RefreshCw, SlidersHorizontal, UserCog, ScrollText, ArrowLeft, ShieldCheck, Sparkles, Activity, MessageSquare, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { ROLE_LABEL, can, type AdminRole, type Permission } from "@/lib/admin/roles";
import { AdminProvider } from "./admin-context";

const NAV: { href: string; label: string; icon: typeof Users; needs: Permission }[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, needs: "view" },
  { href: "/admin/users", label: "Users", icon: Users, needs: "view" },
  { href: "/admin/announcements", label: "Announcements", icon: Megaphone, needs: "view" },
  { href: "/admin/ai-usage", label: "AI usage", icon: Sparkles, needs: "view" },
  { href: "/admin/health", label: "Health", icon: Activity, needs: "view" },
  { href: "/admin/feedback", label: "Feedback", icon: MessageSquare, needs: "view" },
  { href: "/admin/trends", label: "Trends", icon: TrendingUp, needs: "view" },
  { href: "/admin/sources", label: "Sources & sync", icon: RefreshCw, needs: "view" },
  { href: "/admin/controls", label: "Controls", icon: SlidersHorizontal, needs: "view" },
  { href: "/admin/team", label: "Team", icon: UserCog, needs: "team" },
  { href: "/admin/audit", label: "Audit log", icon: ScrollText, needs: "audit" },
];

export function AdminShell({
  admin,
  children,
}: {
  admin: { id: string; email: string | null; role: AdminRole };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const items = NAV.filter((n) => can(admin.role, n.needs));
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  return (
    <AdminProvider value={admin}>
      <div className="min-h-dvh bg-z-surface lg:flex">
        {/* Desktop sidebar */}
        <aside className="hidden w-60 shrink-0 flex-col border-r border-z-border bg-white lg:flex">
          <div className="flex items-center gap-2 px-5 py-5">
            <ShieldCheck className="h-5 w-5 text-z-brand" />
            <span className="text-sm font-semibold text-z-ink">Zyphnaro Admin</span>
          </div>
          <nav className="flex flex-1 flex-col gap-0.5 px-3">
            {items.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm",
                  isActive(href) ? "bg-z-brand-50 font-medium text-z-brand-600" : "text-z-ink-soft hover:bg-z-surface hover:text-z-ink"
                )}
              >
                <Icon className="h-4 w-4" /> {label}
              </Link>
            ))}
          </nav>
          <div className="border-t border-z-border p-4">
            <p className="truncate text-xs text-z-ink-soft">{admin.email}</p>
            <p className="text-xs text-z-ink-faint">{ROLE_LABEL[admin.role]}</p>
            <Link href="/dashboard" className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-z-brand hover:underline">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to app
            </Link>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Mobile header + scrolling tab bar */}
          <header className="sticky top-0 z-30 border-b border-z-border bg-white lg:hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-z-brand" />
                <span className="text-sm font-semibold text-z-ink">Admin</span>
                <span className="rounded-md bg-z-brand-50 px-1.5 py-0.5 text-[11px] font-medium text-z-brand-600">{ROLE_LABEL[admin.role]}</span>
              </div>
              <Link href="/dashboard" className="inline-flex items-center gap-1 text-xs font-medium text-z-brand">
                <ArrowLeft className="h-3.5 w-3.5" /> App
              </Link>
            </div>
            <nav className="z-scroll-light flex gap-1 overflow-x-auto px-3 pb-2">
              {items.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium",
                    isActive(href) ? "border-z-brand bg-z-brand-50 text-z-brand-600" : "border-z-border-strong bg-white text-z-ink-soft"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" /> {label}
                </Link>
              ))}
            </nav>
          </header>

          <main className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">{children}</main>
        </div>
      </div>
    </AdminProvider>
  );
}

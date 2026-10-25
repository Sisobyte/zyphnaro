"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Radar, Bell } from "lucide-react";
import { navGroups } from "@/lib/nav-config";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/lib/hooks/use-user";
import { Avatar } from "@/components/shared/avatar";
import { useNotifications } from "@/lib/hooks/use-notifications";
import { UserMenu } from "./user-menu";
import { GlobalSearch } from "./global-search";

export function MobileHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { data: user } = useCurrentUser();
  const { data: notifications = [] } = useNotifications();
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-z-border bg-white px-4 lg:hidden">
        <button
          onClick={() => setOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-z-ink-soft"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-z-brand text-white">
            <Radar className="h-3.5 w-3.5" />
          </div>
          <span className="text-[15px] font-semibold text-z-ink">Zyphnaro</span>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <GlobalSearch variant="icon" />
          <Link href="/notifications" className="relative flex h-9 w-9 items-center justify-center rounded-lg text-z-ink-soft">
            <Bell className="h-[18px] w-[18px]" />
            {unread > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-z-danger ring-2 ring-white" />}
          </Link>
          <UserMenu
            placement="down"
            align="end"
            trigger={
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-z-brand-50 text-[11px] font-semibold text-z-brand-600">
                <Avatar url={user?.avatarUrl} initials={user?.avatarInitials ?? "…"} />
              </span>
            }
          />
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="z-scroll absolute inset-y-0 left-0 flex w-72 flex-col overflow-y-auto bg-z-navy-900 text-z-slate-300">
            <div className="flex items-center justify-between px-5 py-5">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-z-brand text-white">
                  <Radar className="h-4.5 w-4.5" />
                </div>
                <span className="text-[15px] font-semibold text-white">Zyphnaro</span>
              </div>
              <button onClick={() => setOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-lg text-z-slate-300">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 px-3 pb-4">
              {navGroups.map((group) => (
                <div key={group.label} className="mb-5">
                  <p className="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-z-slate-400/70">
                    {group.label}
                  </p>
                  <div className="flex flex-col gap-0.5">
                    {group.items.map((item) => {
                      const active = pathname === item.href || pathname.startsWith(item.href + "/");
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setOpen(false)}
                          className={cn(
                            "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
                            active ? "bg-z-navy-700 text-white font-medium" : "text-z-slate-300 hover:bg-z-navy-800 hover:text-white"
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
            <UserMenu
              dark
              placement="up"
              trigger={
                <div className="flex items-center gap-2.5 border-t border-z-navy-700 px-5 py-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-z-brand/20 text-xs font-semibold text-z-brand">
                    <Avatar url={user?.avatarUrl} initials={user?.avatarInitials ?? "…"} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{user?.name ?? "Loading…"}</p>
                    <p className="truncate text-xs text-z-slate-400">{user?.primaryRole ?? ""}</p>
                  </div>
                </div>
              }
            />
          </div>
        </div>
      )}
    </>
  );
}

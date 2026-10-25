"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Radar } from "lucide-react";
import { navGroups } from "@/lib/nav-config";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/lib/hooks/use-user";
import { Avatar } from "@/components/shared/avatar";
import { UserMenu } from "./user-menu";

export function Sidebar() {
  const pathname = usePathname();
  const { data: user } = useCurrentUser();

  return (
    <aside className="z-scroll hidden h-dvh w-64 shrink-0 flex-col overflow-y-auto border-r border-z-navy-700 bg-z-navy-900 text-z-slate-300 lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-z-brand text-white">
          <Radar className="h-4.5 w-4.5" />
        </div>
        <div>
          <p className="text-[15px] font-semibold text-white tracking-tight">Zyphnaro</p>
        </div>
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
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
                      active
                        ? "bg-z-navy-700 text-white font-medium"
                        : "text-z-slate-300 hover:bg-z-navy-800 hover:text-white"
                    )}
                  >
                    <Icon className={cn("h-4 w-4 shrink-0", active ? "text-white" : "text-z-slate-400")} />
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
        trigger={
          <div className="flex items-center gap-2.5 border-t border-z-navy-700 px-5 py-4 hover:bg-z-navy-800">
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
    </aside>
  );
}

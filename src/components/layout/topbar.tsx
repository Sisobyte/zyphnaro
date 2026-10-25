"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useCurrentUser } from "@/lib/hooks/use-user";
import { useNotifications } from "@/lib/hooks/use-notifications";
import { Avatar } from "@/components/shared/avatar";
import { UserMenu } from "./user-menu";
import { GlobalSearch } from "./global-search";

export function TopBar() {
  const { data: user } = useCurrentUser();
  const { data: notifications = [] } = useNotifications();
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <header className="sticky top-0 z-20 hidden h-16 shrink-0 items-center gap-4 border-b border-z-border bg-white/90 px-6 backdrop-blur lg:flex">
      <GlobalSearch variant="bar" />
      <div className="ml-auto flex items-center gap-3">
        <Link
          href="/notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-z-ink-soft hover:bg-z-surface"
        >
          <Bell className="h-[18px] w-[18px]" />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-z-danger ring-2 ring-white" />
          )}
        </Link>
        <UserMenu
          placement="down"
          align="end"
          trigger={
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-z-brand-50 text-xs font-semibold text-z-brand-600">
              <Avatar url={user?.avatarUrl} initials={user?.avatarInitials ?? "…"} />
            </span>
          }
        />
      </div>
    </header>
  );
}

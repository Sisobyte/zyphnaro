"use client";

import { useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NotificationItem } from "@/components/notifications/notification-item";
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from "@/lib/hooks/use-notifications";
import { cn } from "@/lib/utils";

type Filter = "all" | "match" | "concern" | "cv" | "interview" | "application";

const tabs: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "match", label: "Matches" },
  { key: "concern", label: "Safety" },
  { key: "cv", label: "CV" },
  { key: "application", label: "Applications" },
];

export default function NotificationsPage() {
  const { data: notifications = [] } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = filter === "all" ? notifications : notifications.filter((n) => n.type === filter);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="inline-flex items-center gap-2 text-xl font-semibold text-z-ink sm:text-2xl">
            <Bell className="h-5 w-5 text-z-brand" /> Notifications
          </h1>
          <p className="mt-1 text-sm text-z-ink-faint">{unreadCount} unread</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={() => markAll.mutate()}>
            <CheckCheck className="h-3.5 w-3.5" /> Mark all read
          </Button>
        )}
      </div>

      <div className="z-scroll-light flex gap-1.5 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium",
              filter === t.key ? "border-z-brand bg-z-brand-50 text-z-brand-600" : "border-z-border-strong text-z-ink-soft hover:bg-z-surface"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card className="p-10 text-center text-sm text-z-ink-faint">Nothing here yet.</Card>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((n) => (
            <NotificationItem key={n.id} notification={n} onRead={(id) => markRead.mutate(id)} />
          ))}
        </div>
      )}
    </div>
  );
}

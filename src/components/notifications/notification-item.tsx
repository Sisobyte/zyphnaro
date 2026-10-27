"use client";

import Link from "next/link";
import { Flame, ShieldAlert, FileText, CalendarClock, Briefcase, Megaphone } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn, timeAgo } from "@/lib/utils";
import type { Notification } from "@/lib/types";

const iconMap = {
  match: Flame,
  concern: ShieldAlert,
  cv: FileText,
  interview: CalendarClock,
  application: Briefcase,
  announcement: Megaphone,
};

const toneMap = {
  match: "bg-z-warning-bg text-z-warning",
  concern: "bg-z-danger-bg text-z-danger",
  cv: "bg-z-brand-50 text-z-brand-600",
  interview: "bg-z-violet-bg text-z-violet",
  application: "bg-z-success-bg text-z-success",
  announcement: "bg-z-brand-50 text-z-brand-600",
};

export function NotificationItem({ notification, onRead }: { notification: Notification; onRead: (id: string) => void }) {
  const Icon = iconMap[notification.type];
  const content = (
    <Card
      onClick={() => !notification.read && onRead(notification.id)}
      className={cn(
        "flex cursor-pointer items-start gap-3 p-4 transition-colors hover:bg-z-surface",
        !notification.read && "border-z-brand-50 bg-z-brand-50/30"
      )}
    >
      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", toneMap[notification.type])}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-z-ink">{notification.title}</p>
          {notification.priority === "high" && (
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-z-danger" />
          )}
        </div>
        <p className="mt-0.5 text-sm text-z-ink-soft">{notification.body}</p>
        <p className="mt-1 text-xs text-z-ink-faint">{timeAgo(notification.createdAt)}</p>
      </div>
      {!notification.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-z-brand" />}
    </Card>
  );

  if (notification.opportunityId) {
    return <Link href={`/opportunities/${notification.opportunityId}`}>{content}</Link>;
  }
  return content;
}

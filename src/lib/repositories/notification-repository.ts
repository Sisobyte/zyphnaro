import type { Notification } from "@/lib/types";
import { mockNotifications } from "@/lib/mock/notifications";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";

export interface NotificationRepository {
  getNotifications(): Promise<Notification[]>;
  markAsRead(id: string): Promise<void>;
  markAllAsRead(): Promise<void>;
}

const state = new Map<string, Notification>(
  mockNotifications.map((n) => [n.id, { ...n }])
);

// BACKEND INTEGRATION:
// Mock implementation — used automatically whenever Supabase isn't
// configured (see the export at the bottom of this file).
export class MockNotificationRepository implements NotificationRepository {
  async getNotifications(): Promise<Notification[]> {
    await delay();
    return Array.from(state.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async markAsRead(id: string): Promise<void> {
    await delay();
    const n = state.get(id);
    if (n) n.read = true;
  }

  async markAllAsRead(): Promise<void> {
    await delay();
    state.forEach((n) => (n.read = true));
  }
}

function delay(ms = 80) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type NotificationRow = {
  id: string;
  type: Notification["type"];
  priority: Notification["priority"];
  title: string;
  body: string;
  opportunity_id: string | null;
  read: boolean;
  created_at: string;
};

function rowToNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    type: row.type,
    priority: row.priority,
    title: row.title,
    body: row.body,
    opportunityId: row.opportunity_id ?? undefined,
    read: row.read,
    createdAt: row.created_at,
  };
}

// BACKEND INTEGRATION:
// Real implementation, scoped to the signed-in user by Row Level Security.
// This table also has Realtime enabled in the migration — see
// /docs/backend-integration.md's "Realtime" section for wiring up live
// push instead of query refetching (a later phase, not done yet).
export class SupabaseNotificationRepository implements NotificationRepository {
  async getNotifications(): Promise<Notification[]> {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data as NotificationRow[]).map(rowToNotification);
  }

  async markAsRead(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from("notifications").update({ read: true }).eq("id", id);
    if (error) throw error;
  }

  async markAllAsRead(): Promise<void> {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("notifications").update({ read: true }).eq("user_id", user.id);
    if (error) throw error;
  }
}

export const notificationRepository: NotificationRepository = isSupabaseConfigured
  ? new SupabaseNotificationRepository()
  : new MockNotificationRepository();

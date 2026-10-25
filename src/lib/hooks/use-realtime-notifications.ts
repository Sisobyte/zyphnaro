"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";
import { useCurrentUser } from "./use-user";

// Phase 7, Part A/B: subscribes to new rows in `notifications` for the
// current user via Supabase Realtime, so the bell badge and notifications
// list update live instead of only on the next refetch. No-ops entirely in
// mock mode. Mounted once, app-wide, in AppShell.
export function useRealtimeNotifications() {
  const client = useQueryClient();
  const { data: user } = useCurrentUser();

  useEffect(() => {
    if (!isSupabaseConfigured || !user) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => {
          client.invalidateQueries({ queryKey: ["notifications"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, client]);
}

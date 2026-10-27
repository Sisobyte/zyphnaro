"use client";

import { useEffect } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/config";

// Tells the server "this person opened the app today" (once per browser per day)
// so the admin can count daily/weekly/monthly active users.
export function ActivityPing() {
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const day = new Date().toISOString().slice(0, 10);
    try {
      if (localStorage.getItem("zyphnaro-ping") === day) return;
    } catch {
      /* storage blocked: ping anyway */
    }
    fetch("/api/activity/ping", { method: "POST" })
      .then((r) => {
        if (r.ok) {
          try { localStorage.setItem("zyphnaro-ping", day); } catch { /* ignore */ }
        }
      })
      .catch(() => {});
  }, []);
  return null;
}

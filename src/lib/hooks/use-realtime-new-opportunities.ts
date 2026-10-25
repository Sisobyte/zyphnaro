"use client";

import { useEffect, useState } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";

// Phase 7, Part A: subscribes to new rows in `opportunities` via Supabase
// Realtime. Deliberately does NOT auto-reorder the list a person might be
// mid-browsing — just tracks a count so the page can show a gentle
// "N new opportunities" banner and let them choose when to refresh.
export function useRealtimeNewOpportunities() {
  const [newCount, setNewCount] = useState(0);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const supabase = createClient();
    const channel = supabase
      .channel("opportunities-inserts")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "opportunities" }, () => {
        setNewCount((c) => c + 1);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const dismiss = () => setNewCount(0);

  return { newCount, dismiss };
}

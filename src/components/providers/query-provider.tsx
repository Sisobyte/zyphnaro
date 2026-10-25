"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { UserProfile } from "@/lib/types";

// Queries whose results depend on the profile (skills, role, location...).
const PROFILE_DEPENDENT = [
  "opportunities",
  "opportunity",
  "opportunity-stats",
  "match-distribution",
  "strong-match-count",
  "skill-demand",
  "top-titles",
];

function profileFingerprint(u: Partial<UserProfile> | undefined): string {
  if (!u) return "";
  return JSON.stringify([u.id, u.primaryRole, u.location, u.yearsExperience, u.remotePreference, [...(u.skills ?? [])].sort()]);
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
      })
  );

  // 1. Never show one person's cached data to the next person who signs in on
  //    the same browser tab. Query keys don't contain the user id, so the whole
  //    cache is dropped whenever the signed-in user changes or signs out.
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let currentId: string | null | undefined;
    const supabase = createClient();
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      const nextId = session?.user?.id ?? null;
      if (event === "SIGNED_OUT" || (currentId !== undefined && currentId !== nextId)) {
        client.clear();
      }
      currentId = nextId;
    });
    return () => data.subscription.unsubscribe();
  }, [client]);

  // 2. When the profile changes (new skills, role, location...), rankings and
  //    match scores are stale: refetch them straight away instead of waiting
  //    for staleTime to expire.
  useEffect(() => {
    let last = "";
    return client.getQueryCache().subscribe((event) => {
      if (event.type !== "updated" || event.action.type !== "success") return;
      if (event.query.queryKey[0] !== "current-user") return;
      const next = profileFingerprint(event.query.state.data as UserProfile | undefined);
      if (last && next !== last) {
        PROFILE_DEPENDENT.forEach((key) => client.invalidateQueries({ queryKey: [key] }));
      }
      last = next;
    });
  }, [client]);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

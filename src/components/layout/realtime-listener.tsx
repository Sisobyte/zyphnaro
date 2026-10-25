"use client";

import { useRealtimeNotifications } from "@/lib/hooks/use-realtime-notifications";

// Mounted once, app-wide, in AppShell. Renders nothing — just keeps the
// Realtime notifications subscription alive for as long as the person is
// in the (app) section. See /docs/backend-integration.md, "Phase 7".
export function RealtimeListener() {
  useRealtimeNotifications();
  return null;
}

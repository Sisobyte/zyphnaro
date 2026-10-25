// BACKEND INTEGRATION:
// Replace this mock service with the Supabase/API implementation.
// In production, rows are inserted here by the notification engine and
// pushed to the client via Supabase Realtime. See /docs/backend-integration.md

import type { Notification } from "@/lib/types";

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();
const hoursAgo = (h: number) => minutesAgo(h * 60);
const daysAgo = (d: number) => hoursAgo(d * 24);

export const mockNotifications: Notification[] = [
  {
    id: "notif-1",
    type: "match",
    priority: "high",
    title: "96% match detected",
    body: "Junior React Developer at TechFlow Solutions was posted 4 minutes ago.",
    createdAt: minutesAgo(4),
    read: false,
    opportunityId: "opp-1",
  },
  {
    id: "notif-2",
    type: "concern",
    priority: "high",
    title: "Potential concern detected",
    body: "\"React Website — Quick Turnaround\" contains an unusual payment request before work begins.",
    createdAt: hoursAgo(3),
    read: false,
    opportunityId: "opp-7",
  },
  {
    id: "notif-3",
    type: "cv",
    priority: "normal",
    title: "CV improvement suggestion",
    body: "Your CV is missing keywords frequently requested for Frontend Developer roles: Next.js, Jest, CI/CD.",
    createdAt: hoursAgo(6),
    read: false,
  },
  {
    id: "notif-4",
    type: "interview",
    priority: "high",
    title: "Interview reminder",
    body: "Your interview with NestFlow is coming up — practice a mock session to warm up.",
    createdAt: hoursAgo(9),
    read: true,
  },
  {
    id: "notif-5",
    type: "match",
    priority: "normal",
    title: "97% match detected",
    body: "Frontend Developer at Acme Digital was posted 6 minutes ago.",
    createdAt: minutesAgo(6),
    read: false,
    opportunityId: "opp-4",
  },
  {
    id: "notif-6",
    type: "application",
    priority: "normal",
    title: "Application update",
    body: "Your application to Solaris Labs has moved to the Interview stage.",
    createdAt: daysAgo(1),
    read: true,
    opportunityId: "opp-3",
  },
  {
    id: "notif-7",
    type: "cv",
    priority: "normal",
    title: "Tailored CV ready",
    body: "A tailored CV for the UI Engineer role at Fieldstone Systems is ready to review.",
    createdAt: daysAgo(2),
    read: true,
  },
  {
    id: "notif-8",
    type: "match",
    priority: "normal",
    title: "93% match detected",
    body: "Junior Frontend Engineer at Orbital Finance was posted 2 hours ago.",
    createdAt: hoursAgo(2),
    read: false,
    opportunityId: "opp-14",
  },
];

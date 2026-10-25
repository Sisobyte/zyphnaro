// BACKEND INTEGRATION:
// This is a placeholder for real session state. Replace with Supabase Auth's
// session (e.g. supabase.auth.getSession() / onAuthStateChange) once wired up.
// See /docs/backend-integration.md
//
// Note: nothing currently gates the (app) routes behind this flag — any
// route is reachable directly by URL in this prototype. A real integration
// should add middleware or a layout-level redirect for unauthenticated users.

const SESSION_KEY = "zyphnaro-session";

export function setMockSession(name?: string) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SESSION_KEY, name ?? "1");
}

export function clearMockSession() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(SESSION_KEY);
}

export function hasMockSession(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(sessionStorage.getItem(SESSION_KEY));
}

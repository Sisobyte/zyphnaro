// Where the auth callback may send someone after signing them in. Only
// same-site paths are accepted, so a crafted link can't redirect to another site.
export function safeNextPath(value: string): string {
  return value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") ? value : "/onboarding";
}

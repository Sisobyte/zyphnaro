// Server-only Supabase client that uses the SERVICE ROLE key, which bypasses
// Row Level Security. Never import this from a Client Component. Use it only
// in route handlers for actions a normal user can't do themselves (such as
// deleting their own auth account), and only after checking who is asking.

import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

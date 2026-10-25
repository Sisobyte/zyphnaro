// Server-side Supabase client, for use in Server Components, Route
// Handlers, and Server Actions. Reads/writes the session via cookies.
// See /docs/backend-integration.md

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseUrl, supabaseAnonKey, isSupabaseConfigured } from "./config";

export async function createClient() {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local — see /docs/backend-integration.md"
    );
  }
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl!, supabaseAnonKey!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component that can't set cookies directly.
          // Safe to ignore as long as proxy.ts is also refreshing the
          // session on every request (it is — see proxy.ts).
        }
      },
    },
  });
}

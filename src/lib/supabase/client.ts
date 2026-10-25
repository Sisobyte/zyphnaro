// Browser-side Supabase client, for use in Client Components ("use client").
// See /docs/backend-integration.md

import { createBrowserClient } from "@supabase/ssr";
import { supabaseUrl, supabaseAnonKey, isSupabaseConfigured } from "./config";

export function createClient() {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local — see /docs/backend-integration.md"
    );
  }
  return createBrowserClient(supabaseUrl!, supabaseAnonKey!);
}

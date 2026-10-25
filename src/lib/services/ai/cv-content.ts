// Server-only helper: fetches the current signed-in user's real CV file
// from Supabase Storage (as base64) for GeminiAIService's multimodal
// input. Uses the request-scoped server Supabase client, so Storage RLS
// naturally restricts this to the caller's own file — no service-role key
// needed here. Returns null if Supabase isn't configured, no CV is on
// file, or the user isn't signed in — callers should fall back to a
// skills-only prompt in that case (see the API routes that use this).

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function getUserCvBase64(): Promise<{ base64: string; mimeType: string } | null> {
  if (!isSupabaseConfigured) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("cv_storage_path").eq("id", user.id).single();
  const path = profile?.cv_storage_path as string | undefined;
  if (!path) return null;

  const { data: file, error } = await supabase.storage.from("cv-documents").download(path);
  if (error || !file) return null;

  const buffer = Buffer.from(await file.arrayBuffer());
  return { base64: buffer.toString("base64"), mimeType: "application/pdf" };
}

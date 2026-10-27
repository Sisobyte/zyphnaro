import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Permanently removes a user: their Storage files first (the database cascade
 * doesn't cover those), then the auth user, which cascades to everything else.
 * Used by both self-service deletion and the admin "delete account" action.
 */
export async function deleteUserCompletely(admin: SupabaseClient, uid: string): Promise<void> {
  for (const bucket of ["cv-documents", "avatars"]) {
    const { data: files } = await admin.storage.from(bucket).list(uid);
    const paths = (files ?? []).map((f) => `${uid}/${f.name}`);
    if (paths.length) {
      const { error } = await admin.storage.from(bucket).remove(paths);
      if (error) console.error(`[delete-user] couldn't remove ${bucket} files:`, error.message);
    }
  }
  const { error } = await admin.auth.admin.deleteUser(uid);
  if (error) throw error;
}

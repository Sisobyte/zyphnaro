import { createAdminClient } from "@/lib/supabase/admin";

/** Records an admin action. Never throws: a logging failure must not undo the action. */
export async function audit(
  actor: { id: string; email: string | null },
  action: string,
  target: string | null,
  details: Record<string, unknown> = {}
) {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("admin_audit_log").insert({
      actor_id: actor.id,
      actor_email: actor.email,
      action,
      target,
      details,
    });
    if (error) console.error("[audit] insert failed:", error.message);
  } catch (e) {
    console.error("[audit] failed:", e instanceof Error ? e.message : e);
  }
}

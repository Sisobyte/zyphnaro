import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, readJson } from "@/lib/admin/guard";
import { canActOnUser, isAdminRole, type Permission } from "@/lib/admin/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { audit } from "@/lib/admin/audit";
import { deleteUserCompletely } from "@/lib/admin/delete-user";

const bodySchema = z.object({
  action: z.enum(["disable", "enable", "signout", "resend", "delete"]),
  confirm: z.string().optional(),
});

const PERMISSION: Record<z.infer<typeof bodySchema>["action"], Permission> = {
  disable: "user.manage",
  enable: "user.manage",
  signout: "user.manage",
  resend: "user.manage",
  delete: "user.delete",
};

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return NextResponse.json({ error: "Bad user id." }, { status: 400 });
  const parsed = bodySchema.safeParse(await readJson(req, 2_000));
  if (!parsed.success) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  const { action, confirm } = parsed.data;

  const g = await requireAdmin(PERMISSION[action]);
  if (!g.ok) return g.response;
  const { ctx } = g;

  const admin = createAdminClient();
  const { data: roleRow } = await admin.from("admin_roles").select("role").eq("user_id", id).maybeSingle();
  const targetRole = roleRow && isAdminRole(roleRow.role) ? roleRow.role : null;
  const allowed = canActOnUser({ actorRole: ctx.role, actorId: ctx.id, targetId: id, targetRole, permission: PERMISSION[action] });
  if (!allowed.ok) return NextResponse.json({ error: allowed.reason }, { status: 403 });

  const { data: target, error: lookupError } = await admin.auth.admin.getUserById(id);
  if (lookupError || !target.user) return NextResponse.json({ error: "User not found." }, { status: 404 });
  const email = target.user.email ?? null;

  try {
    switch (action) {
      case "disable": {
        const { error } = await admin.auth.admin.updateUserById(id, { ban_duration: "876000h" });
        if (error) throw error;
        await admin.rpc("admin_revoke_sessions", { p_user: id });
        break;
      }
      case "enable": {
        const { error } = await admin.auth.admin.updateUserById(id, { ban_duration: "none" });
        if (error) throw error;
        break;
      }
      case "signout": {
        const { error } = await admin.rpc("admin_revoke_sessions", { p_user: id });
        if (error) throw error;
        break;
      }
      case "resend": {
        if (!email) return NextResponse.json({ error: "This user has no email." }, { status: 400 });
        if (target.user.email_confirmed_at) return NextResponse.json({ error: "Their email is already confirmed." }, { status: 400 });
        const { error } = await admin.auth.resend({ type: "signup", email });
        if (error) return NextResponse.json({ error: error.message }, { status: 429 });
        break;
      }
      case "delete": {
        if (!email || confirm?.trim().toLowerCase() !== email.toLowerCase()) {
          return NextResponse.json({ error: "Type the user's email to confirm." }, { status: 400 });
        }
        await deleteUserCompletely(admin, id);
        break;
      }
    }
  } catch (e) {
    console.error(`[admin/users] ${action} failed:`, e);
    return NextResponse.json({ error: "That didn't work. Please try again." }, { status: 500 });
  }

  await audit(ctx, `user.${action}`, email ?? id, { userId: id });
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { requireAdmin, readJson } from "@/lib/admin/guard";
import { canManageTeamMember, isAdminRole, type AdminRole } from "@/lib/admin/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { audit } from "@/lib/admin/audit";

const assignable = z.enum(["support", "viewer"]);

export async function GET() {
  const g = await requireAdmin("team");
  if (!g.ok) return g.response;
  const admin = createAdminClient();
  const { data, error } = await admin.from("admin_roles").select("user_id,role,created_at").order("created_at");
  if (error) return NextResponse.json({ error: "Couldn't load the team." }, { status: 500 });
  const ids = (data ?? []).map((r) => r.user_id as string);
  const { data: emails } = ids.length ? await admin.rpc("admin_user_emails", { p_ids: ids }) : { data: [] };
  const emailById = new Map(((emails ?? []) as { id: string; email: string }[]).map((e) => [e.id, e.email]));
  return NextResponse.json({
    members: (data ?? []).map((r) => ({ userId: r.user_id, role: r.role, createdAt: r.created_at, email: emailById.get(r.user_id as string) ?? null })),
  });
}

const addSchema = z.object({ email: z.email().max(200), role: assignable });

// Adds a teammate. If they already have an account they're given the role. If
// not, an account is created with a one-time temporary password, shown ONCE to
// the owner to pass on (no email is sent: that needs SMTP).
export async function POST(req: Request) {
  const g = await requireAdmin("team");
  if (!g.ok) return g.response;
  const parsed = addSchema.safeParse(await readJson(req, 2_000));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email and a role." }, { status: 400 });
  const email = parsed.data.email.trim().toLowerCase();
  const role: AdminRole = parsed.data.role;
  const admin = createAdminClient();

  try {
    const { data: existingId } = await admin.rpc("admin_find_user_by_email", { p_email: email });
    let userId = (existingId as string | null) ?? null;
    let tempPassword: string | null = null;

    if (userId) {
      const { data: cur } = await admin.from("admin_roles").select("role").eq("user_id", userId).maybeSingle();
      const check = canManageTeamMember({
        actorRole: g.ctx.role, actorId: g.ctx.id, targetId: userId,
        targetRole: cur && isAdminRole(cur.role) ? cur.role : null, newRole: role,
      });
      if (!check.ok) return NextResponse.json({ error: check.reason }, { status: 403 });
    } else {
      tempPassword = `Zy-${randomBytes(9).toString("base64url")}9a`;
      const { data: created, error } = await admin.auth.admin.createUser({ email, password: tempPassword, email_confirm: true });
      if (error || !created.user) throw error ?? new Error("create failed");
      userId = created.user.id;
    }

    const { error: roleError } = await admin
      .from("admin_roles")
      .upsert({ user_id: userId, role, created_by: g.ctx.id });
    if (roleError) throw roleError;

    await audit(g.ctx, "team.add", email, { role, createdAccount: !!tempPassword });
    return NextResponse.json({ ok: true, email, role, tempPassword });
  } catch (e) {
    console.error("[admin/team] add failed:", e);
    return NextResponse.json({ error: "Couldn't add that person." }, { status: 500 });
  }
}

const changeSchema = z.object({ userId: z.uuid(), role: assignable.optional(), remove: z.boolean().optional() });

export async function PATCH(req: Request) {
  const g = await requireAdmin("team");
  if (!g.ok) return g.response;
  const parsed = changeSchema.safeParse(await readJson(req, 2_000));
  if (!parsed.success || (!parsed.data.role && !parsed.data.remove)) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  const { userId, role, remove } = parsed.data;
  const admin = createAdminClient();

  const { data: cur } = await admin.from("admin_roles").select("role").eq("user_id", userId).maybeSingle();
  if (!cur) return NextResponse.json({ error: "That person isn't on the team." }, { status: 404 });
  const check = canManageTeamMember({
    actorRole: g.ctx.role, actorId: g.ctx.id, targetId: userId,
    targetRole: isAdminRole(cur.role) ? cur.role : null, newRole: role,
  });
  if (!check.ok) return NextResponse.json({ error: check.reason }, { status: 403 });

  const { error } = remove
    ? await admin.from("admin_roles").delete().eq("user_id", userId)
    : await admin.from("admin_roles").update({ role }).eq("user_id", userId);
  if (error) return NextResponse.json({ error: "Couldn't save." }, { status: 500 });
  await audit(g.ctx, remove ? "team.remove" : "team.role", userId, { role: remove ? null : role });
  return NextResponse.json({ ok: true });
}

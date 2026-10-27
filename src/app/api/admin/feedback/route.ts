import { NextResponse } from "next/server";
import { requireAdmin, readJson } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { feedbackUpdateSchema, FEEDBACK_STATUSES } from "@/lib/feedback";
import { audit } from "@/lib/admin/audit";

export async function GET(req: Request) {
  const g = await requireAdmin("view");
  if (!g.ok) return g.response;
  const status = new URL(req.url).searchParams.get("status") ?? "";
  const admin = createAdminClient();
  let q = admin.from("feedback").select("id,email,category,message,page,status,admin_note,created_at").order("created_at", { ascending: false }).limit(100);
  if ((FEEDBACK_STATUSES as readonly string[]).includes(status)) q = q.eq("status", status);
  const [list, counts] = await Promise.all([q, admin.from("feedback").select("status")]);
  if (list.error) return NextResponse.json({ error: "Couldn't load feedback. Have you run migration 0020?" }, { status: 500 });
  const tally: Record<string, number> = { new: 0, read: 0, resolved: 0 };
  for (const r of counts.data ?? []) tally[(r as { status: string }).status] = (tally[(r as { status: string }).status] ?? 0) + 1;
  return NextResponse.json({ items: list.data ?? [], counts: tally });
}

// Support and owners can triage feedback.
export async function PATCH(req: Request) {
  const g = await requireAdmin("user.manage");
  if (!g.ok) return g.response;
  const parsed = feedbackUpdateSchema.safeParse(await readJson(req, 5_000));
  if (!parsed.success || (!parsed.data.status && parsed.data.note === undefined)) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  const { id, status, note } = parsed.data;
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (status) patch.status = status;
  if (note !== undefined) patch.admin_note = note || null;
  const { error } = await createAdminClient().from("feedback").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: "Couldn't save." }, { status: 500 });
  await audit(g.ctx, "feedback.update", id, { status: status ?? null, noteChanged: note !== undefined });
  return NextResponse.json({ ok: true });
}

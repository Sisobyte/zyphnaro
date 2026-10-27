import { NextResponse } from "next/server";
import { requireAdmin, readJson } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { announcementSchema, resolveAudience, sendAnnouncement } from "@/lib/admin/announce";
import { audit } from "@/lib/admin/audit";
import { clearSettingsCache } from "@/lib/admin/settings";

export async function GET() {
  const g = await requireAdmin("view");
  if (!g.ok) return g.response;
  const { data, error } = await createAdminClient()
    .from("announcements")
    .select("id,title,body,audience,priority,recipients,created_by_email,created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ error: "Couldn't load announcements." }, { status: 500 });
  return NextResponse.json({ announcements: data ?? [] });
}

// POST ?preview=1 returns only how many people it would reach.
export async function POST(req: Request) {
  const g = await requireAdmin("announce");
  if (!g.ok) return g.response;
  const parsed = announcementSchema.safeParse(await readJson(req));
  if (!parsed.success) return NextResponse.json({ error: "Check the title, message and audience." }, { status: 400 });
  const { title, body, audience, priority, showBanner } = parsed.data;
  const admin = createAdminClient();

  try {
    const ids = await resolveAudience(admin, audience);
    if (new URL(req.url).searchParams.get("preview")) return NextResponse.json({ recipients: ids.length });
    if (ids.length === 0 && !showBanner) return NextResponse.json({ error: "No one matches that audience." }, { status: 400 });

    const sent = await sendAnnouncement(admin, ids, { title, body, priority });
    await admin.from("announcements").insert({
      title, body, audience, priority, recipients: sent,
      created_by: g.ctx.id, created_by_email: g.ctx.email,
    });
    if (showBanner) {
      await admin.from("app_settings").upsert({
        key: "banner",
        value: { enabled: true, text: `${title}: ${body}`.slice(0, 300), level: "info" },
        updated_by: g.ctx.id,
        updated_at: new Date().toISOString(),
      });
      clearSettingsCache();
    }
    await audit(g.ctx, "announcement.send", title, { audience, recipients: sent, showBanner });
    return NextResponse.json({ ok: true, recipients: sent });
  } catch (e) {
    console.error("[admin/announcements]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Couldn't send." }, { status: 500 });
  }
}

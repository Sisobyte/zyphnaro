import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, readJson } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSettings, clearSettingsCache } from "@/lib/admin/settings";
import { audit } from "@/lib/admin/audit";

export async function GET() {
  const g = await requireAdmin("view");
  if (!g.ok) return g.response;
  return NextResponse.json(await getSettings({ fresh: true }));
}

// Each key has its own strict shape, so a bad value can't be stored.
const schema = z.discriminatedUnion("key", [
  z.object({ key: z.literal("maintenance"), value: z.object({ enabled: z.boolean(), message: z.string().trim().max(300) }) }),
  z.object({ key: z.literal("signups"), value: z.object({ enabled: z.boolean() }) }),
  z.object({ key: z.literal("ai"), value: z.object({ enabled: z.boolean() }) }),
  z.object({ key: z.literal("sync"), value: z.object({ paused: z.boolean(), pausedSources: z.array(z.string().max(100)).max(100) }) }),
  z.object({
    key: z.literal("banner"),
    value: z.object({ enabled: z.boolean(), text: z.string().trim().max(300), level: z.enum(["info", "warning"]) }),
  }),
]);

export async function PUT(req: Request) {
  const g = await requireAdmin("controls");
  if (!g.ok) return g.response;
  const parsed = schema.safeParse(await readJson(req, 10_000));
  if (!parsed.success) return NextResponse.json({ error: "Bad value." }, { status: 400 });
  const { key, value } = parsed.data;

  const { error } = await createAdminClient()
    .from("app_settings")
    .upsert({ key, value, updated_by: g.ctx.id, updated_at: new Date().toISOString() });
  if (error) return NextResponse.json({ error: "Couldn't save." }, { status: 500 });
  clearSettingsCache();
  await audit(g.ctx, `control.${key}`, key, { value });
  return NextResponse.json(await getSettings({ fresh: true }));
}

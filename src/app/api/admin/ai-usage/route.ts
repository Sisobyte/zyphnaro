import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { estimateCost } from "@/lib/admin/ai-usage";
import { getSettings } from "@/lib/admin/settings";

export async function GET(req: Request) {
  const g = await requireAdmin("view");
  if (!g.ok) return g.response;
  const days = [7, 30, 90].includes(Number(new URL(req.url).searchParams.get("days"))) ? Number(new URL(req.url).searchParams.get("days")) : 30;
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("admin_ai_usage", { p_days: days });
  if (error) {
    console.error("[admin/ai-usage]", error.message);
    return NextResponse.json({ error: "Couldn't load AI usage. Have you run migration 0020?" }, { status: 500 });
  }
  const d = data as { inputTokens: number; outputTokens: number; topUsers: { userId: string; calls: number; tokens: number }[] };
  const ids = d.topUsers.map((u) => u.userId);
  const { data: emails } = ids.length ? await admin.rpc("admin_user_emails", { p_ids: ids }) : { data: [] };
  const emailById = new Map(((emails ?? []) as { id: string; email: string }[]).map((e) => [e.id, e.email]));
  const settings = await getSettings();
  return NextResponse.json({
    ...d,
    days,
    aiEnabled: settings.ai.enabled,
    estimatedCost: estimateCost(d.inputTokens, d.outputTokens),
    topUsers: d.topUsers.map((u) => ({ ...u, email: emailById.get(u.userId) ?? null })),
  });
}

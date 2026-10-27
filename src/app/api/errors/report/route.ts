import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { recordError } from "@/lib/admin/ai-usage";

// Browsers report crashes here so the admin Health page can show them.
// Rate-limited per IP in memory; messages are cut short; nothing from the
// request is trusted beyond being text to store.
const hits = new Map<string, number[]>();

export async function POST(req: Request) {
  if (!isSupabaseConfigured) return NextResponse.json({ ok: true });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  if (recent.length >= 5) return NextResponse.json({ ok: true });
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 2000) hits.clear();

  let body: { message?: unknown; path?: unknown } = {};
  try {
    const text = await req.text();
    if (text.length > 5_000) return NextResponse.json({ ok: true });
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ ok: true });
  }
  const message = typeof body.message === "string" ? body.message : "";
  if (!message) return NextResponse.json({ ok: true });
  const path = typeof body.path === "string" ? body.path : null;

  let userId: string | null = null;
  try {
    const { data } = await (await createClient()).auth.getUser();
    userId = data.user?.id ?? null;
  } catch {
    /* anonymous */
  }
  await recordError({ source: "client", route: path, message, userId });
  return NextResponse.json({ ok: true });
}

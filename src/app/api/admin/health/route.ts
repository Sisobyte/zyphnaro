import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const g = await requireAdmin("view");
  if (!g.ok) return g.response;
  const { data, error } = await createAdminClient().rpc("admin_health", { p_days: 7 });
  if (error) {
    console.error("[admin/health]", error.message);
    return NextResponse.json({ error: "Couldn't load health. Have you run migration 0020?" }, { status: 500 });
  }
  return NextResponse.json(data);
}

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const g = await requireAdmin("view");
  if (!g.ok) return g.response;
  const { data, error } = await createAdminClient().rpc("admin_trends");
  if (error) {
    console.error("[admin/trends]", error.message);
    return NextResponse.json({ error: "Couldn't load trends. Have you run migration 0020?" }, { status: 500 });
  }
  return NextResponse.json(data);
}

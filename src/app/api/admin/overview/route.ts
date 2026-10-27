import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const g = await requireAdmin("view");
  if (!g.ok) return g.response;
  const { data, error } = await createAdminClient().rpc("admin_overview");
  if (error) {
    console.error("[admin/overview]", error.message);
    return NextResponse.json({ error: "Couldn't load the numbers. Have you run migration 0019?" }, { status: 500 });
  }
  return NextResponse.json(data);
}

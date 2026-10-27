import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  const g = await requireAdmin("audit");
  if (!g.ok) return g.response;
  const page = Math.max(0, Number(new URL(req.url).searchParams.get("page") ?? 0) || 0);
  const { data, error } = await createAdminClient()
    .from("admin_audit_log")
    .select("id,actor_email,action,target,details,created_at")
    .order("created_at", { ascending: false })
    .range(page * 50, page * 50 + 49);
  if (error) return NextResponse.json({ error: "Couldn't load the audit log." }, { status: 500 });
  return NextResponse.json({ entries: data ?? [], page });
}

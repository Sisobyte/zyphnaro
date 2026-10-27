import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";

const FILTERS = ["all", "disabled", "unconfirmed", "inactive", "paid"];

export async function GET(req: Request) {
  const g = await requireAdmin("view");
  if (!g.ok) return g.response;
  const url = new URL(req.url);
  const search = (url.searchParams.get("search") ?? "").trim().slice(0, 100);
  const filter = FILTERS.includes(url.searchParams.get("filter") ?? "") ? url.searchParams.get("filter")! : "all";
  const page = Math.max(0, Number(url.searchParams.get("page") ?? 0) || 0);
  const pageSize = 25;

  const { data, error } = await createAdminClient().rpc("admin_list_users", {
    p_search: search,
    p_limit: pageSize,
    p_offset: page * pageSize,
    p_filter: filter,
  });
  if (error) {
    console.error("[admin/users]", error.message);
    return NextResponse.json({ error: "Couldn't load users." }, { status: 500 });
  }
  const rows = (data ?? []) as Array<Record<string, unknown>>;
  const total = rows.length ? Number(rows[0].total_count) : 0;
  return NextResponse.json({
    total,
    page,
    pageSize,
    users: rows.map((r) => {
      const u = { ...r };
      delete u.total_count;
      return u;
    }),
  });
}

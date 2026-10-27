// Server-side gate for everything under /admin and /api/admin.
//
// The role is read from the database with the service-role key, using the user
// id from the verified session. Nothing the browser sends can grant a role.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { can, isAdminRole, type AdminRole, type Permission } from "./roles";

export type AdminContext = { id: string; email: string | null; role: AdminRole };

/** The signed-in person's admin role, or null if they aren't an admin. */
export async function getAdminContext(): Promise<AdminContext | null> {
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return null;
  const admin = createAdminClient();
  const { data: row } = await admin.from("admin_roles").select("role").eq("user_id", user.id).maybeSingle();
  if (!row || !isAdminRole(row.role)) return null;
  return { id: user.id, email: user.email ?? null, role: row.role };
}

export type AdminGuard =
  | { ok: true; ctx: AdminContext }
  | { ok: false; response: NextResponse };

/** For route handlers: returns 404 for non-admins (the area doesn't reveal itself), 403 for too-low role. */
export async function requireAdmin(permission: Permission): Promise<AdminGuard> {
  const ctx = await getAdminContext();
  if (!ctx) return { ok: false, response: NextResponse.json({ error: "Not found." }, { status: 404 }) };
  if (!can(ctx.role, permission)) {
    return { ok: false, response: NextResponse.json({ error: "Your role can't do that." }, { status: 403 }) };
  }
  return { ok: true, ctx };
}

/** Reads and size-checks a JSON body for admin routes. */
export async function readJson(req: Request, maxBytes = 50_000): Promise<unknown | null> {
  try {
    const text = await req.text();
    if (text.length > maxBytes) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}

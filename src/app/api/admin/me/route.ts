import { NextResponse } from "next/server";
import { getAdminContext } from "@/lib/admin/guard";
import { permissionsFor } from "@/lib/admin/roles";

export async function GET() {
  const ctx = await getAdminContext();
  if (!ctx) return NextResponse.json({ admin: false });
  return NextResponse.json({ admin: true, role: ctx.role, email: ctx.email, permissions: permissionsFor(ctx.role) });
}

"use client";

import { createContext, useContext } from "react";
import { can, type AdminRole, type Permission } from "@/lib/admin/roles";

type Ctx = { id: string; email: string | null; role: AdminRole };
const AdminCtx = createContext<Ctx | null>(null);

export const AdminProvider = AdminCtx.Provider;

export function useAdmin() {
  const ctx = useContext(AdminCtx);
  if (!ctx) throw new Error("useAdmin must be used inside the admin area");
  return { ...ctx, can: (p: Permission) => can(ctx.role, p) };
}

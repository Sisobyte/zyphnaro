import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAdminContext } from "@/lib/admin/guard";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { AdminShell } from "@/components/admin/admin-shell";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// Everyone who isn't an admin gets the normal 404 page, so the area doesn't
// advertise that it exists. The role is read from the database on the server.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured) {
    return (
      <div className="mx-auto max-w-lg p-8 text-sm text-z-ink-soft">
        <h1 className="mb-2 text-lg font-semibold text-z-ink">Admin needs Supabase</h1>
        The admin area reads real users and settings, so it only works once Supabase is connected (see .env.local).
      </div>
    );
  }
  const ctx = await getAdminContext();
  if (!ctx) notFound();
  return <AdminShell admin={ctx}>{children}</AdminShell>;
}

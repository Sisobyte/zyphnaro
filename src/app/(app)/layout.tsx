import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSettings } from "@/lib/admin/settings";
import { getAdminContext } from "@/lib/admin/guard";
import { MaintenanceScreen } from "@/components/layout/site-banner";

export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  // Mock mode: skip the check so the app still works without Supabase.
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.onboarding_completed) redirect("/onboarding");
  }

  // Maintenance mode: everyone but admins sees the maintenance screen.
  if (settings.maintenance.enabled && !(await getAdminContext())) {
    return <MaintenanceScreen message={settings.maintenance.message} />;
  }

  const banner = settings.banner.enabled && settings.banner.text ? { text: settings.banner.text, level: settings.banner.level } : null;
  return <AppShell banner={banner}>{children}</AppShell>;
}
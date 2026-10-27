import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";

// Called once per browser session/day from the app shell. Records "this person
// was active today" so the admin can show daily/weekly/monthly active users.
// The user id comes from the session, never the request.
export async function POST() {
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ ok: true });
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return NextResponse.json({ ok: false }, { status: 401 });
    const { error } = await createAdminClient().rpc("touch_user_activity", { p_user: data.user.id });
    if (error) console.error("[activity/ping]", error.message);
  } catch (e) {
    console.error("[activity/ping]", e instanceof Error ? e.message : e);
  }
  return NextResponse.json({ ok: true });
}

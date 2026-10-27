import { NextResponse } from "next/server";
import { getSettings } from "@/lib/admin/settings";

// The few switches the whole app (even signed-out visitors) needs to know about.
// Nothing sensitive here. Cached for a short time by the CDN and by getSettings().
export async function GET() {
  const s = await getSettings();
  return NextResponse.json(
    {
      maintenance: s.maintenance,
      signupsEnabled: s.signups.enabled,
      aiEnabled: s.ai.enabled,
      banner: s.banner,
    },
    { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } }
  );
}

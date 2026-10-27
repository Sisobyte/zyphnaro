import { NextResponse } from "next/server";
import { runSourceSync } from "@/lib/sync/run-source-sync";

// Vercel Cron hits this route on the schedule defined in vercel.json.
// Vercel automatically sends `Authorization: Bearer ${CRON_SECRET}` on
// cron-triggered requests — set CRON_SECRET yourself in your Vercel
// project's environment variables (and in .env.local for local testing)
// so nobody else can trigger this by just visiting the URL.
// See /docs/backend-integration.md, "Phase 6 quickstart".

// Fetching from three sources sequentially can take a while — raise the
// default function timeout. Hobby plans cap this lower than Pro; if this
// route times out on Hobby, reduce the number of companies in
// src/lib/sources/companies.ts rather than relying on a longer duration.
export const maxDuration = 60;

export async function GET(req: Request) {
  // Fail CLOSED: with no CRON_SECRET configured, nobody can trigger a sync
  // (it used to be open to anyone when the variable was missing).
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron/sync-sources] CRON_SECRET is not set; refusing to run.");
    return NextResponse.json({ error: "Cron is not configured." }, { status: 503 });
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runSourceSync({ trigger: "cron" });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[cron/sync-sources] failed:", error);
    return NextResponse.json(
      { ok: false, error: "Sync failed. See server logs." },
      { status: 500 }
    );
  }
}

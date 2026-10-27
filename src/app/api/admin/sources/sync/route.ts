import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/guard";
import { runSourceSync } from "@/lib/sync/run-source-sync";
import { audit } from "@/lib/admin/audit";

export const maxDuration = 60;

// "Run sync now". May overrun the function time limit on small plans; the run is
// still recorded in history if it finishes.
export async function POST() {
  const g = await requireAdmin("sources");
  if (!g.ok) return g.response;
  try {
    const r = await runSourceSync({ trigger: "admin", ignoreGlobalPause: true });
    await audit(g.ctx, "sync.run", null, { fetched: r.totalFetched, written: r.written, notified: r.notified });
    return NextResponse.json({ ok: true, fetched: r.totalFetched, written: r.written, notified: r.notified });
  } catch (e) {
    console.error("[admin/sources/sync]", e);
    await audit(g.ctx, "sync.run.failed", null, {});
    return NextResponse.json({ error: "The sync failed. See the sync history and server logs." }, { status: 500 });
  }
}

// Manual/on-demand runner for the shared sync logic
// (src/lib/sync/run-source-sync.ts) — the same logic the scheduled Vercel
// Cron route uses (src/app/api/cron/sync-sources/route.ts). Useful for
// testing locally before relying on the daily cron, or for triggering an
// extra sync between scheduled runs.
//
// Run with: npm run sync:sources
// Add --dry-run to fetch and normalize without writing to the database.

import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

// Imported dynamically, AFTER loadEnv() above has run, rather than as a
// static top-of-file import. Static imports are hoisted and evaluated
// before any other code in this file runs (including the loadEnv() call
// above), which would let modules further down the import chain read
// process.env before .env.local has actually been loaded into it.
async function main() {
  const { runSourceSync } = await import("../src/lib/sync/run-source-sync");

  const dryRun = process.argv.includes("--dry-run");
  const result = await runSourceSync({ dryRun });

  console.log("\nPer-source results:");
  for (const s of result.perSource) {
    console.log(s.error ? `  [${s.name}] FAILED: ${s.error}` : `  [${s.name}] fetched ${s.fetched}`);
  }
  console.log(`\nTotal normalized listings: ${result.totalFetched}`);

  if (dryRun) {
    console.log("[dry run] Not written to the database.");
    return;
  }
  if (result.skippedWrite) {
    console.log(
      result.totalFetched === 0
        ? "Nothing to write."
        : "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local — nothing was written."
    );
    return;
  }
  console.log(`Synced ${result.written} opportunities.`);
  console.log(`Sent ${result.notified} new match notifications.`);
  const st = result.notifyStats;
  if (st) {
    console.log(`\nNotification details:`);
    console.log(`  New jobs added by this run: ${st.newJobs} (only these can trigger alerts)`);
    console.log(`  People checked: ${st.profiles}`);
    const s = st.skipped;
    console.log(
      `  Skipped (person x job): too old ${s.tooOld}, alerts switched off ${s.alertsOff}, no profile skills ${s.noSkills}, ` +
        `source switched off ${s.sourceOff}, no shared skill ${s.noSkillOverlap}, below minimum score ${s.belowThreshold}`
    );
    if (st.newJobs === 0) console.log("  No job was new this run, so there was nothing to alert on.");
  }
}

main();
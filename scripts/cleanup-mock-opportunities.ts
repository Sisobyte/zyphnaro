// Removes the demo opportunities that `npm run seed:opportunities` wrote into
// the real `opportunities` table, so only genuinely synced listings
// (Adzuna / Greenhouse / Lever) remain.
//
// SAFETY:
//  - DRY RUN by default. It only prints what it would delete. Nothing is
//    removed unless you pass --confirm.
//  - It only ever matches the exact (source, external_id) pairs defined in
//    src/lib/mock/opportunities.ts — the same pairs the seed script wrote.
//    Real synced listings use provider-issued IDs and won't collide.
//  - Applications you created from those fake jobs are removed too (their
//    link to the job is set to null by the database otherwise, leaving
//    orphaned cards on the board). Saved bookmarks cascade automatically.
//
// Run with:
//   npm run cleanup:mock              (preview only)
//   npm run cleanup:mock -- --confirm (actually delete)

import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";
import { mockOpportunities } from "../src/lib/mock/opportunities";

loadEnv({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CONFIRM = process.argv.includes("--confirm");

async function main() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local.");
    process.exit(1);
  }
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // 1. Find which of the 14 known mock pairs actually exist in the database.
  const found: { id: string; source: string; external_id: string; title: string }[] = [];
  for (const m of mockOpportunities) {
    const { data, error } = await supabase
      .from("opportunities")
      .select("id, source, external_id, title")
      .eq("source", m.source)
      .eq("external_id", m.externalId);
    if (error) throw new Error(`Lookup failed for ${m.source}/${m.externalId}: ${error.message}`);
    if (data) found.push(...data);
  }

  if (found.length === 0) {
    console.log("No seeded mock opportunities found in the database. Nothing to clean up.");
    console.log("(If you still see fake-looking data, it's coming from a page that imports mock data directly, not from the database.)");
    return;
  }

  console.log(`Found ${found.length} seeded mock opportunit${found.length === 1 ? "y" : "ies"}:`);
  for (const f of found) console.log(`  - ${f.source}/${f.external_id}: ${f.title}`);

  const ids = found.map((f) => f.id);

  // 2. Show what depends on them.
  const { data: apps, error: appsErr } = await supabase
    .from("applications")
    .select("id, stage, title")
    .in("opportunity_id", ids);
  if (appsErr) throw new Error(`Applications lookup failed: ${appsErr.message}`);

  const { count: savedCount } = await supabase
    .from("saved_opportunities")
    .select("opportunity_id", { count: "exact", head: true })
    .in("opportunity_id", ids);

  console.log(`\nApplications linked to these jobs: ${apps?.length ?? 0}`);
  for (const a of apps ?? []) console.log(`  - [${a.stage}] ${a.title}`);
  console.log(`Saved bookmarks linked to these jobs: ${savedCount ?? 0}`);

  if (!CONFIRM) {
    console.log("\n[dry run] Nothing was deleted. Re-run with --confirm to delete the above.");
    return;
  }

  // 3. Delete dependents first, then the opportunities.
  if ((apps?.length ?? 0) > 0) {
    const { error } = await supabase.from("applications").delete().in("opportunity_id", ids);
    if (error) throw new Error(`Deleting applications failed: ${error.message}`);
  }
  const { error: delErr } = await supabase.from("opportunities").delete().in("id", ids);
  if (delErr) throw new Error(`Deleting opportunities failed: ${delErr.message}`);

  console.log(`\nDeleted ${found.length} mock opportunities and ${apps?.length ?? 0} linked applications.`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

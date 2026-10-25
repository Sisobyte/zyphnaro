// One-time (or re-runnable) seed script: pushes the existing mock
// opportunity dataset into the real `opportunities` table so the app isn't
// empty on day one. Uses the SERVICE ROLE key (bypasses RLS) since regular
// users have no insert policy on this table by design — see
// supabase/migrations/0002_opportunities_and_applications.sql.
//
// Run with: npm run seed:opportunities
// Add --dry-run to print the rows instead of writing them (useful to sanity
// check the mapping without touching your database).
//
// Safe to re-run: upserts on the (source, external_id) unique constraint,
// so running it twice updates existing rows instead of duplicating them.

import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";
import { mockOpportunities } from "../src/lib/mock/opportunities";
import type { Opportunity } from "../src/lib/types";

loadEnv({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DRY_RUN = process.argv.includes("--dry-run");

function toRow(o: Opportunity) {
  return {
    source: o.source,
    external_id: o.externalId,
    title: o.title,
    description: o.description,
    company: o.company,
    author: o.author ?? null,
    location: o.location ?? null,
    work_type: o.workType,
    employment_type: o.employmentType,
    seniority: o.seniority,
    salary: o.salary ?? null,
    skills: o.skills,
    posted_at: o.postedAt,
    detected_at: o.detectedAt,
    original_url: o.originalUrl,
    trust: o.trust,
    cv_fit: o.cvFit,
    ai_analysis: o.aiAnalysis,
    status: "new" as const,
  };
}

async function main() {
  const rows = mockOpportunities.map(toRow);

  if (DRY_RUN) {
    console.log(`[dry run] Would upsert ${rows.length} opportunities:`);
    console.log(rows.map((r) => `  - ${r.source}/${r.external_id}: ${r.title}`).join("\n"));
    return;
  }

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in your environment.\n" +
        "Add them to .env.local, or run with --dry-run to preview without connecting."
    );
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data, error } = await supabase
    .from("opportunities")
    .upsert(rows, { onConflict: "source,external_id" })
    .select("id, title");

  if (error) {
    console.error("Seed failed:", error.message);
    process.exit(1);
  }

  console.log(`Seeded ${data?.length ?? 0} opportunities.`);
}

main();

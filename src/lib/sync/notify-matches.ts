// Phase 7, Part B: after new/updated opportunities are synced, check them
// against every user's real profile and create a real notification row for
// strong matches — this is what Realtime notifications actually push to
// people's screens. Without this step, Realtime on `notifications` has
// nothing to ever deliver.
//
// Cost note, stated plainly: this checks every synced opportunity against
// every user's profile (an N×M scan), which is fine at friends-testing
// scale but would need batching/queueing at real scale. Not optimized for
// that yet — see /docs/backend-integration.md, "Phase 7 quickstart".

import { canonicalizeSkill } from "@/lib/sources/skill-vocabulary";
import type { SupabaseClient } from "@supabase/supabase-js";
import { computeOpportunityMatch } from "@/lib/engines/match-engine";
import { candidateRegionTerms } from "@/lib/engines/region";
import { SOURCE_CATALOG } from "@/lib/sources/catalog";

// Fallback only: each person's own "Minimum match score to notify" setting
// (profiles.min_match_score) is used when it has a value.
const MATCH_NOTIFY_THRESHOLD = 85;

// Only jobs posted recently are worth an alert; an old listing that is simply
// new to our database isn't "newly posted".
const MAX_JOB_AGE_DAYS = 14;

// Most alerts one person can get from a single sync run. If more jobs match,
// the highest-scoring ones are sent, so nobody is flooded.
const MAX_ALERTS_PER_USER_PER_RUN = 10;

// `.in("id", [...])` puts every id in the request URL. A full sync passes
// thousands of ids, which makes the URL far too long and the request fails,
// so ids are looked up in small groups instead.
const ID_CHUNK_SIZE = 100;

// Supabase returns at most 1,000 rows per select by default, so larger reads
// are fetched a page at a time.
const PAGE_SIZE = 1000;

// Notification rows are inserted in groups so one huge insert can't time out.
const INSERT_CHUNK_SIZE = 500;

interface ProfileRow {
  id: string;
  min_match_score: number | null;
  skills: string[] | null;
  seniority: string | null;
  preferred_locations: string[] | null;
  location: string | null;
  remote_preference: string | null;
  primary_role: string | null;
  notify_high_match: boolean | null;
}

interface OpportunityRow {
  id: string;
  source: string;
  title: string;
  company: { name?: string } | null;
  skills: string[] | null;
  seniority: string;
  work_type: "remote" | "hybrid" | "onsite";
  location: string | null;
  posted_at: string;
}

interface NotificationInsert {
  user_id: string;
  type: "match";
  priority: "normal" | "high";
  title: string;
  body: string;
  opportunity_id: string;
  read: boolean;
}

function chunk<T>(items: T[], size: number): T[][] {
  const groups: T[][] = [];
  for (let i = 0; i < items.length; i += size) groups.push(items.slice(i, i + size));
  return groups;
}

async function fetchAllProfiles(supabase: SupabaseClient): Promise<ProfileRow[]> {
  const all: ProfileRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, min_match_score, skills, seniority, preferred_locations, location, remote_preference, primary_role, notify_high_match")
      .order("id")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`Failed to load profiles: ${error.message}`);
    all.push(...((data ?? []) as ProfileRow[]));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return all;
}

// Every (user, opportunity) pair that already has a notification, so nobody
// is told about the same job twice across sync runs.
async function fetchExistingPairs(supabase: SupabaseClient, opportunityIds: string[]): Promise<Set<string>> {
  const pairs = new Set<string>();
  for (const ids of chunk(opportunityIds, ID_CHUNK_SIZE)) {
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await supabase
        .from("notifications")
        .select("user_id, opportunity_id")
        .in("opportunity_id", ids)
        .order("id")
        .range(from, from + PAGE_SIZE - 1);
      if (error) throw new Error(`Failed to load existing notifications: ${error.message}`);
      for (const n of data ?? []) pairs.add(`${n.user_id}:${n.opportunity_id}`);
      if (!data || data.length < PAGE_SIZE) break;
    }
  }
  return pairs;
}

// Names of the sources each person has switched OFF ("available" = disconnected,
// the same rule the Opportunities and Matches pages use), so someone who turned
// a source off isn't alerted about its jobs.
async function fetchExcludedSourcesByUser(supabase: SupabaseClient): Promise<Map<string, Set<string>>> {
  const statusByUser = new Map<string, Map<string, string>>();
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("source_connections")
      .select("user_id, source_id, status")
      .order("user_id")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`Failed to load source connections: ${error.message}`);
    for (const r of data ?? []) {
      const m = statusByUser.get(r.user_id) ?? new Map<string, string>();
      m.set(r.source_id, r.status);
      statusByUser.set(r.user_id, m);
    }
    if (!data || data.length < PAGE_SIZE) break;
  }
  return new Map(
    Array.from(statusByUser, ([userId, statuses]) => [
      userId,
      new Set(
        SOURCE_CATALOG.filter((e) => (statuses.get(e.id) ?? e.defaultStatus) === "available").map((e) => e.name)
      ),
    ])
  );
}

export interface NotifyStats {
  notified: number;
  /** How many jobs this run added to the database. Only these can trigger alerts. */
  newJobs: number;
  profiles: number;
  /** Counts of (person, job) pairs skipped, by reason, to explain a low `notified`. */
  skipped: { tooOld: number; alertsOff: number; noSkills: number; sourceOff: number; noSkillOverlap: number; belowThreshold: number };
}

export async function notifyMatchesForOpportunities(supabase: SupabaseClient, opportunityIds: string[]): Promise<NotifyStats> {
  const stats: NotifyStats = {
    notified: 0,
    newJobs: opportunityIds.length,
    profiles: 0,
    skipped: { tooOld: 0, alertsOff: 0, noSkills: 0, sourceOff: 0, noSkillOverlap: 0, belowThreshold: 0 },
  };
  if (opportunityIds.length === 0) return stats;

  const profiles = await fetchAllProfiles(supabase);
  stats.profiles = profiles.length;
  if (profiles.length === 0) return stats;

  const alreadyNotified = await fetchExistingPairs(supabase, opportunityIds);
  const excludedByUser = await fetchExcludedSourcesByUser(supabase);
  const oldestAllowed = Date.now() - MAX_JOB_AGE_DAYS * 24 * 60 * 60 * 1000;
  // Everyone's candidate alerts across all groups, so the per-person cap applies to the whole run.
  const candidates = new Map<string, (NotificationInsert & { score: number })[]>();

  for (const ids of chunk(opportunityIds, ID_CHUNK_SIZE)) {
    const { data: opportunities, error } = await supabase
      .from("opportunities")
      .select("id, source, title, company, skills, seniority, work_type, location, posted_at")
      .in("id", ids);
    if (error) throw new Error(`Failed to load opportunities: ${error.message}`);
    if (!opportunities?.length) continue;

    for (const opp of opportunities as OpportunityRow[]) {
      if (new Date(opp.posted_at).getTime() < oldestAllowed) {
        stats.skipped.tooOld += profiles.length;
        continue;
      }
      const required = (opp.skills ?? []).map((x) => x.toLowerCase());

      for (const profile of profiles) {
        const key = `${profile.id}:${opp.id}`;
        if (alreadyNotified.has(key)) continue;
        if (profile.notify_high_match === false) {
          stats.skipped.alertsOff++;
          continue;
        }
        if (!profile.skills?.length) {
          stats.skipped.noSkills++;
          continue;
        }
        if (excludedByUser.get(profile.id)?.has(opp.source)) {
          stats.skipped.sourceOff++;
          continue;
        }

        // The job has to be related to the person's CV: at least one of its
        // skills must be one of theirs, whatever the other score components say.
        const mine = new Set(profile.skills.map((x) => canonicalizeSkill(x).toLowerCase()));
        const matchedSkills = (opp.skills ?? []).filter((x) => mine.has(x.toLowerCase()));
        if (required.length === 0 || matchedSkills.length === 0) {
          stats.skipped.noSkillOverlap++;
          continue;
        }

        const match = computeOpportunityMatch({
          candidateSkills: profile.skills.map(canonicalizeSkill),
          requiredSkills: opp.skills ?? [],
          candidateSeniority: profile.seniority ?? "junior",
          roleSeniority: opp.seniority,
          candidatePreferredLocations: candidateRegionTerms(profile.location, profile.preferred_locations ?? []),
          candidateRemotePreference: (profile.remote_preference as never) ?? "remote-first",
          opportunityWorkType: opp.work_type,
          opportunityLocation: opp.location ?? undefined,
          candidatePrimaryRole: profile.primary_role ?? "",
          opportunityTitle: opp.title,
        });

        if (match.overall >= (profile.min_match_score ?? MATCH_NOTIFY_THRESHOLD)) {
          const where = opp.work_type === "remote" ? "Remote" : opp.location || opp.work_type;
          const list = candidates.get(profile.id) ?? [];
          list.push({
            user_id: profile.id,
            type: "match",
            priority: match.overall >= 93 ? "high" : "normal",
            title: `New ${match.overall}% match: ${opp.title}`,
            body: `${opp.company?.name ?? "A company"} · ${where} · via ${opp.source}. Matches your skills: ${matchedSkills
              .slice(0, 4)
              .join(", ")}.`,
            opportunity_id: opp.id,
            read: false,
            score: match.overall,
          });
          candidates.set(profile.id, list);
          alreadyNotified.add(key); // guard against duplicates within this same run
        } else {
          stats.skipped.belowThreshold++;
        }
      }
    }
  }

  // Best matches first, capped per person, then inserted in groups.
  const toInsert: NotificationInsert[] = [];
  for (const list of candidates.values()) {
    list
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_ALERTS_PER_USER_PER_RUN)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .forEach(({ score, ...row }) => toInsert.push(row));
  }
  for (const rows of chunk(toInsert, INSERT_CHUNK_SIZE)) {
    const { error: insertError } = await supabase.from("notifications").insert(rows);
    if (insertError) throw new Error(`Failed to insert match notifications: ${insertError.message}`);
    stats.notified += rows.length;
  }

  return stats;
}
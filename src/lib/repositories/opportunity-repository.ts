import { canonicalizeSkill, normalizeSkillList } from "@/lib/sources/skill-vocabulary";
import { assessFit, type JobAssessment } from "@/lib/assessment";
import type {
  Company,
  MatchBreakdown,
  Opportunity,
  OpportunitySearchParams,
  OpportunitySearchResult,
  OpportunityStats,
  MatchDistributionBucket,
  RoleDemand,
  Recruiter,
  Salary,
  TrustAnalysis,
  CVFitAnalysis,
  OpportunityAIAnalysis,
  UserProfile,
} from "@/lib/types";
import { mockOpportunities } from "@/lib/mock/opportunities";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";
import { computeOpportunityMatch } from "@/lib/engines/match-engine";
import { candidateRegionTerms } from "@/lib/engines/region";
import { roleStems } from "@/lib/engines/role-terms";
import { userRepository } from "./user-repository";
import { sourceRepository } from "./source-repository";

// Default number of top-ranked opportunities returned when no explicit limit
// is given. The ranking itself covers EVERY listing; this only caps how many
// rows are sent to the browser.
export const DEFAULT_OPPORTUNITY_LIMIT = 300;

export interface OpportunityRepository {
  // The user's top-ranked opportunities (best match first), across ALL
  // listings — not just the most recent ones.
  getOpportunities(limit?: number): Promise<Opportunity[]>;
  // Search + filter + sort run in the database over ALL listings; returns the
  // top `limit` results plus the total number that matched.
  searchOpportunities(params: OpportunitySearchParams): Promise<OpportunitySearchResult>;
  // Cheap counts for headers/dashboards (no rows transferred).
  getStats(): Promise<OpportunityStats>;
  // Skill demand across EVERY listing, independent of any user's match
  // ranking (see migration 0010 — used by the Skill Gaps page).
  // scope "field" counts only listings whose title matches the user's role;
  // "all" counts every listing. Both skip sources the user switched off.
  getSkillDemand(scope?: "all" | "field"): Promise<{ skill: string; count: number }[]>;
  // The user's real match-score distribution across EVERY listing, and the
  // most commonly posted exact job titles market-wide (see migration 0012 —
  // both used by the Analytics page).
  getMatchDistribution(): Promise<MatchDistributionBucket[]>;
  getTopTitles(limit?: number): Promise<RoleDemand[]>;
  // Real count, independent of ranking/limits — "Strong Matches" on the
  // Dashboard and Analytics tiles (score >= 80, matching the "high-match"
  // filter — see migration 0012).
  getStrongMatchCount(): Promise<number>;
  getOpportunityById(id: string): Promise<Opportunity | null>;
  saveOpportunity(id: string): Promise<void>;
  unsaveOpportunity(id: string): Promise<void>;
}

// In-memory store so save/unsave feels persistent within a session without
// a real database.
const state = new Map<string, Opportunity>(
  mockOpportunities.map((o) => [o.id, { ...o }])
);

// BACKEND INTEGRATION:
// Mock implementation — used automatically whenever Supabase isn't
// configured (see the export at the bottom of this file).
export class MockOpportunityRepository implements OpportunityRepository {
  // Opportunities from sources the user has disconnected are hidden.
  private async visible(): Promise<Opportunity[]> {
    const excluded = new Set(await sourceRepository.getExcludedSourceNames());
    return Array.from(state.values()).filter((o) => !excluded.has(o.source));
  }

  async getOpportunities(limit = DEFAULT_OPPORTUNITY_LIMIT): Promise<Opportunity[]> {
    await delay();
    return (await this.visible())
      .sort((a, b) => b.match.overall - a.match.overall)
      .slice(0, limit);
  }

  async searchOpportunities(params: OpportunitySearchParams): Promise<OpportunitySearchResult> {
    await delay();
    const now = Date.now();
    const q = params.query.trim().toLowerCase();

    const matching = (await this.visible()).filter((o) => {
      if (q) {
        const haystack = [o.title, o.company.name, ...o.skills].join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      switch (params.filter) {
        case "remote":
          return o.workType === "remote";
        case "full-time":
          return o.employmentType === "full-time";
        case "freelance":
          return o.employmentType === "freelance" || o.employmentType === "contract";
        case "internship":
          return o.employmentType === "internship";
        case "junior":
          return o.seniority === "junior" || o.seniority === "intern";
        case "senior":
          return o.seniority === "senior" || o.seniority === "lead";
        case "high-match":
          return o.match.overall >= 85;
        case "fresh":
          return now - new Date(o.postedAt).getTime() < 24 * 3600 * 1000;
        case "high-trust":
          return o.trust.score >= 85;
        default:
          return true;
      }
    });

    matching.sort((a, b) => {
      switch (params.sort) {
        case "newest":
          return new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime();
        case "highest-trust":
          return b.trust.score - a.trust.score;
        case "highest-salary":
          return (b.salary?.max ?? 0) - (a.salary?.max ?? 0);
        default:
          return b.match.overall - a.match.overall;
      }
    });

    return { items: matching.slice(0, params.limit), total: matching.length };
  }

  async getStats(): Promise<OpportunityStats> {
    await delay();
    const now = Date.now();
    const all = await this.visible();
    return {
      total: all.length,
      postedToday: all.filter((o) => now - new Date(o.postedAt).getTime() < 24 * 3600 * 1000).length,
      detectedLast48h: all.filter((o) => now - new Date(o.detectedAt).getTime() < 48 * 3600 * 1000).length,
      flagged: all.filter((o) => o.trust.level !== "low-concern").length,
    };
  }

  async getSkillDemand(scope: "all" | "field" = "all"): Promise<{ skill: string; count: number }[]> {
    await delay();
    const stems = scope === "field" ? roleStems((await userRepository.getCurrentUser()).primaryRole) : [];
    const demand = new Map<string, { skill: string; count: number }>();
    for (const o of await this.visible()) {
      if (stems.length > 0 && !stems.some((st) => o.title.toLowerCase().includes(st))) continue;
      for (const skill of o.skills) {
        const key = skill.toLowerCase();
        const existing = demand.get(key);
        if (existing) existing.count += 1;
        else demand.set(key, { skill, count: 1 });
      }
    }
    return Array.from(demand.values()).sort((a, b) => b.count - a.count);
  }

  async getMatchDistribution(): Promise<MatchDistributionBucket[]> {
    await delay();
    const buckets: MatchDistributionBucket[] = [
      { range: "90-100%", count: 0 },
      { range: "75-89%", count: 0 },
      { range: "60-74%", count: 0 },
      { range: "40-59%", count: 0 },
      { range: "Below 40%", count: 0 },
    ];
    for (const o of await this.visible()) {
      const s = o.match.overall;
      const i = s >= 90 ? 0 : s >= 75 ? 1 : s >= 60 ? 2 : s >= 40 ? 3 : 4;
      buckets[i].count += 1;
    }
    return buckets;
  }

  async getTopTitles(limit = 6): Promise<RoleDemand[]> {
    await delay();
    const counts = new Map<string, number>();
    for (const o of await this.visible()) counts.set(o.title, (counts.get(o.title) ?? 0) + 1);
    return Array.from(counts.entries())
      .map(([role, count]) => ({ role, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  async getStrongMatchCount(): Promise<number> {
    await delay();
    return (await this.visible()).filter((o) => o.match.overall >= 80).length;
  }

  async getOpportunityById(id: string): Promise<Opportunity | null> {
    await delay();
    return state.get(id) ?? null;
  }

  async saveOpportunity(id: string): Promise<void> {
    await delay();
    const opp = state.get(id);
    if (opp) {
      opp.saved = true;
      if (opp.status === "new") opp.status = "saved";
    }
  }

  async unsaveOpportunity(id: string): Promise<void> {
    await delay();
    const opp = state.get(id);
    if (opp) {
      opp.saved = false;
      if (opp.status === "saved") opp.status = "new";
    }
  }
}

function delay(ms = 120) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- Supabase row shape --------------------------------------------------
// See supabase/migrations/0002_opportunities_and_applications.sql. Note
// match is NOT a DB column — it's computed live per viewer, below.
type OpportunityRow = {
  id: string;
  source: string;
  external_id: string;
  title: string;
  // Not returned by rank_opportunities() — the list UI never shows it and
  // it's the heaviest field on the row. The detail page fetches it in full.
  description?: string;
  company: Company;
  author: Recruiter | null;
  location: string | null;
  work_type: Opportunity["workType"];
  employment_type: Opportunity["employmentType"];
  seniority: Opportunity["seniority"];
  salary: Salary | null;
  skills: string[];
  posted_at: string;
  detected_at: string;
  original_url: string;
  trust: TrustAnalysis;
  // Partial, not the full type — real synced opportunities are written
  // with these as `{}` (see the comment in rowToOpportunity below).
  cv_fit: Partial<CVFitAnalysis> | null;
  ai_analysis?: (Partial<OpportunityAIAnalysis> & { jobAssessment?: JobAssessment }) | null;
  // Only present on rows returned by rank_opportunities() (migration 0009).
  score?: number;
  total_count?: number | string;
  status: Opportunity["status"];
};

// Reads the signed-in user's id from the locally stored session — no network
// round trip (auth.getUser() calls the auth server every time). Safe here
// because every write below is still enforced by RLS on the server.
async function getSessionUserId(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}

// BACKEND INTEGRATION:
// Real implementation. `opportunities` itself is shared/global (any
// signed-in user can read it — see the migration's RLS policy); "saved"
// status is joined in per-user from `saved_opportunities`. Match score is
// computed live from the current user's real profile via the match-engine
// (src/lib/engines/match-engine.ts) rather than read from a column, so it
// updates automatically as a user's skills change. The profile is fetched
// ONCE per request and reused for every row (it used to be re-fetched per
// row, which meant thousands of network calls for one page load). Trust,
// CV fit, and AI analysis are still static content on the row — see the
// migration's comments for why, and /docs/ai-integration.md.
export class SupabaseOpportunityRepository implements OpportunityRepository {
  private buildMatch(row: OpportunityRow, user: UserProfile): MatchBreakdown {
    return computeOpportunityMatch({
      candidateSkills: user.skills.map(canonicalizeSkill),
      requiredSkills: row.skills,
      candidateSeniority: user.seniority,
      roleSeniority: row.seniority,
      candidatePreferredLocations: candidateRegionTerms(user.location, user.preferredLocations),
      candidateRemotePreference: user.remotePreference,
      opportunityWorkType: row.work_type,
      opportunityLocation: row.location ?? undefined,
      candidatePrimaryRole: user.primaryRole,
      opportunityTitle: row.title,
    });
  }

  private rowToOpportunity(row: OpportunityRow, savedIds: Set<string>, user: UserProfile): Opportunity {
    const match = this.buildMatch(row, user);

    // One shared reading of the job against this viewer's profile. The detail
    // page, the quick analysis and the live AI all start from it.
    const assessment = assessFit({
      job: { title: row.title, description: row.description, skills: row.skills, seniority: row.seniority },
      jobAssessment: row.ai_analysis?.jobAssessment ?? null,
      candidate: user,
      match,
      location: row.location ?? undefined,
    });
    const matchedSkills = row.skills.filter((s) => assessment.candidate.listedSkills.includes(s.toLowerCase()));
    const missingSkills = row.skills.filter((s) => !assessment.candidate.listedSkills.includes(s.toLowerCase()));
    const whyYouMatch = assessment.strengths;
    const concerns = assessment.concerns.map((c) => c.text);

    return {
      id: row.id,
      source: row.source,
      externalId: row.external_id,
      title: row.title,
      description: row.description ?? "",
      company: row.company,
      author: row.author ?? undefined,
      location: row.location ?? undefined,
      workType: row.work_type,
      employmentType: row.employment_type,
      seniority: row.seniority,
      salary: row.salary ?? undefined,
      skills: row.skills,
      postedAt: row.posted_at,
      detectedAt: row.detected_at,
      originalUrl: row.original_url,
      match,
      trust: row.trust,
      // Real, freshly-synced opportunities (Adzuna/Greenhouse/Lever) are
      // written with cv_fit/ai_analysis intentionally left as `{}` — real
      // analysis for these comes from the "Live AI Analysis" / "Generate
      // Tailored CV" panels on demand (see scripts/sync-sources.ts). Safe
      // defaults here keep the UI from throwing on `undefined.map()`.
      cvFit: {
        jobMatch: row.cv_fit?.jobMatch ?? match.overall,
        cvMatch: row.cv_fit?.cvMatch ?? match.skills,
        atsReadiness: row.cv_fit?.atsReadiness ?? 0,
        strongMatches: row.cv_fit?.strongMatches ?? matchedSkills,
        weakOrMissing: row.cv_fit?.weakOrMissing ?? missingSkills,
        recommendations: row.cv_fit?.recommendations ?? [...assessment.recommendations.strengthen.map((k) => `Show ${k} in a role or project, not only in your skills list.`), ...assessment.recommendations.learn.map((k) => `Build evidence for ${k}.`)],
      },
      aiAnalysis: {
        matchScore: row.ai_analysis?.matchScore ?? match.overall,
        summary: row.ai_analysis?.summary ?? "No pre-computed analysis yet — use Live AI Analysis below for a real, on-demand breakdown.",
        whyYouMatch: row.ai_analysis?.whyYouMatch ?? whyYouMatch,
        potentialConcerns: row.ai_analysis?.potentialConcerns ?? concerns,
      },
      assessment,
      status: row.status,
      saved: savedIds.has(row.id),
    };
  }

  private async getSavedIds(): Promise<Set<string>> {
    const userId = await getSessionUserId();
    if (!userId) return new Set();
    const supabase = createClient();
    const { data } = await supabase.from("saved_opportunities").select("opportunity_id").eq("user_id", userId);
    return new Set((data ?? []).map((r) => r.opportunity_id as string));
  }

  // Builds the arguments for rank_opportunities() from the user's profile.
  // Everything the database needs to score a listing the same way the
  // TypeScript match engine does (see migration 0009). Skills/roles/locations
  // are lowercased because the function compares case-insensitively.
  private rankArgs(user: UserProfile) {
    return {
      p_skills: normalizeSkillList(user.skills),
      p_role_words: user.primaryRole.toLowerCase().split(/\s+/).filter(Boolean),
      p_seniority: user.seniority,
      p_remote_pref: user.remotePreference,
      // Profile location + preferred locations + wider-region aliases (e.g. Africa).
      p_locations: candidateRegionTerms(user.location, user.preferredLocations),
    };
  }

  private async rank(
    user: UserProfile,
    extra: { query: string; filter: string; sort: string; limit: number },
    excludedSources: string[]
  ): Promise<OpportunityRow[]> {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("rank_opportunities", {
      ...this.rankArgs(user),
      p_query: extra.query,
      p_filter: extra.filter,
      p_sort: extra.sort,
      p_limit: extra.limit,
      p_excluded_sources: excludedSources,
    });
    if (error) {
      // PGRST202 = "function not found" — i.e. migration 0009 hasn't been run yet.
      if (error.code === "PGRST202" || /could not find the function/i.test(error.message)) {
        throw new Error(
          "The rank_opportunities database function is missing. Run supabase/migrations/0014_source_toggle_filter.sql (and 0009 before it) in the Supabase SQL editor, then refresh."
        );
      }
      throw error;
    }
    return (data ?? []) as OpportunityRow[];
  }

  async getOpportunities(limit = DEFAULT_OPPORTUNITY_LIMIT): Promise<Opportunity[]> {
    // The profile is needed first (it drives the ranking); after that the
    // ranked rows and the user's saved ids are independent, so run them together.
    const user = await userRepository.getCurrentUser();
    const [excludedSources, savedIds] = await Promise.all([
      sourceRepository.getExcludedSourceNames(),
      this.getSavedIds(),
    ]);
    const rows = await this.rank(user, { query: "", filter: "all", sort: "best-match", limit }, excludedSources);
    return rows.map((row) => this.rowToOpportunity(row, savedIds, user));
  }

  async searchOpportunities(params: OpportunitySearchParams): Promise<OpportunitySearchResult> {
    const user = await userRepository.getCurrentUser();
    const [excludedSources, savedIds] = await Promise.all([
      sourceRepository.getExcludedSourceNames(),
      this.getSavedIds(),
    ]);
    const rows = await this.rank(
      user,
      { query: params.query, filter: params.filter, sort: params.sort, limit: params.limit },
      excludedSources
    );
    return {
      items: rows.map((row) => this.rowToOpportunity(row, savedIds, user)),
      total: rows.length > 0 ? Number(rows[0].total_count ?? rows.length) : 0,
    };
  }

  // Counts only (`head: true` returns no rows), all four run at once.
  async getStats(): Promise<OpportunityStats> {
    const supabase = createClient();
    const hoursAgo = (h: number) => new Date(Date.now() - h * 3600 * 1000).toISOString();
    const count = (q: PromiseLike<{ count: number | null }>) => q.then((r) => r.count ?? 0);

    // Counts exclude sources the user has disconnected, like every other view.
    const excluded = await sourceRepository.getExcludedSourceNames();
    const base = () => {
      const q = supabase.from("opportunities").select("id", { count: "exact", head: true });
      return excluded.length > 0
        ? q.not("source", "in", `(${excluded.map((n) => `"${n.replace(/"/g, "")}"`).join(",")})`)
        : q;
    };

    const [total, postedToday, detectedLast48h, flagged] = await Promise.all([
      count(base()),
      count(base().gte("posted_at", hoursAgo(24))),
      count(base().gte("detected_at", hoursAgo(48))),
      count(base().neq("trust->>level", "low-concern")),
    ]);
    return { total, postedToday, detectedLast48h, flagged };
  }

  async getSkillDemand(scope: "all" | "field" = "all"): Promise<{ skill: string; count: number }[]> {
    const supabase = createClient();
    const [excludedSources, user] = await Promise.all([
      sourceRepository.getExcludedSourceNames(),
      scope === "field" ? userRepository.getCurrentUser() : Promise.resolve(null),
    ]);
    const { data, error } = await supabase.rpc("skill_demand", {
      p_excluded_sources: excludedSources,
      p_role_stems: user ? roleStems(user.primaryRole) : [],
    });
    if (error) {
      if (error.code === "PGRST202" || /could not find the function/i.test(error.message)) {
        throw new Error(
          "The skill_demand database function is missing. Run supabase/migrations/0016_skill_demand_scoped.sql (after 0010 and 0014) in the Supabase SQL editor, then refresh."
        );
      }
      throw error;
    }
    return (data ?? []).map((row: { skill: string; demand_count: number | string }) => ({
      skill: row.skill,
      count: Number(row.demand_count),
    }));
  }

  async getMatchDistribution(): Promise<MatchDistributionBucket[]> {
    const [user, excludedSources] = await Promise.all([
      userRepository.getCurrentUser(),
      sourceRepository.getExcludedSourceNames(),
    ]);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("match_score_distribution", {
      ...this.rankArgs(user),
      p_excluded_sources: excludedSources,
    });
    if (error) {
      if (error.code === "PGRST202" || /could not find the function/i.test(error.message)) {
        throw new Error(
          "The match_score_distribution database function is missing. Run supabase/migrations/0012_analytics.sql in the Supabase SQL editor, then refresh."
        );
      }
      throw error;
    }
    return (data ?? []).map((row: { range: string; count: number | string }) => ({
      range: row.range,
      count: Number(row.count),
    }));
  }

  async getTopTitles(limit = 6): Promise<RoleDemand[]> {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("top_opportunity_titles", { p_limit: limit });
    if (error) {
      if (error.code === "PGRST202" || /could not find the function/i.test(error.message)) {
        throw new Error(
          "The top_opportunity_titles database function is missing. Run supabase/migrations/0012_analytics.sql in the Supabase SQL editor, then refresh."
        );
      }
      throw error;
    }
    return (data ?? []).map((row: { title: string; count: number | string }) => ({
      role: row.title,
      count: Number(row.count),
    }));
  }

  async getStrongMatchCount(): Promise<number> {
    const [user, excludedSources] = await Promise.all([
      userRepository.getCurrentUser(),
      sourceRepository.getExcludedSourceNames(),
    ]);
    const rows = await this.rank(
      user,
      { query: "", filter: "high-match", sort: "best-match", limit: 1 },
      excludedSources
    );
    return rows.length > 0 ? Number(rows[0].total_count ?? 0) : 0;
  }

  async getOpportunityById(id: string): Promise<Opportunity | null> {
    const supabase = createClient();
    const [rowResult, user, savedIds] = await Promise.all([
      supabase.from("opportunities").select("*").eq("id", id).single(),
      userRepository.getCurrentUser(),
      this.getSavedIds(),
    ]);
    if (rowResult.error || !rowResult.data) return null;

    return this.rowToOpportunity(rowResult.data as OpportunityRow, savedIds, user);
  }

  async saveOpportunity(id: string): Promise<void> {
    const userId = await getSessionUserId();
    if (!userId) throw new Error("Not signed in");
    const supabase = createClient();
    const { error } = await supabase.from("saved_opportunities").upsert({ user_id: userId, opportunity_id: id });
    if (error) throw error;
  }

  async unsaveOpportunity(id: string): Promise<void> {
    const userId = await getSessionUserId();
    if (!userId) throw new Error("Not signed in");
    const supabase = createClient();
    const { error } = await supabase
      .from("saved_opportunities")
      .delete()
      .eq("user_id", userId)
      .eq("opportunity_id", id);
    if (error) throw error;
  }
}

export const opportunityRepository: OpportunityRepository = isSupabaseConfigured
  ? new SupabaseOpportunityRepository()
  : new MockOpportunityRepository();
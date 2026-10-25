import type { TailoredCV } from "@/lib/types";
import { mockTailoredCVs } from "@/lib/mock/cv";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";

export interface CreateTailoredCVInput {
  opportunityId: string;
  opportunityTitle: string;
  company: string;
  originalScore: number;
  tailoredScore: number;
  highlightedSkills: string[];
  recommendedChanges: string[];
  projectRecommendations: string[];
  summary: string;
}

export interface TailoredCVRepository {
  getTailoredCVs(): Promise<TailoredCV[]>;
  getTailoredCVById(id: string): Promise<TailoredCV | null>;
  // Called by the Save button on a live-generated tailored CV (see
  // LiveCVTailor). Persists it so it survives a refresh and shows up on
  // /tailored-cvs, instead of only existing as an unsaved on-page preview.
  createTailoredCV(input: CreateTailoredCVInput): Promise<TailoredCV>;
}

function delay(ms = 300) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const state = new Map<string, TailoredCV>(mockTailoredCVs.map((t) => [t.id, { ...t }]));

export class MockTailoredCVRepository implements TailoredCVRepository {
  async getTailoredCVs(): Promise<TailoredCV[]> {
    await delay();
    return Array.from(state.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getTailoredCVById(id: string): Promise<TailoredCV | null> {
    await delay();
    return state.get(id) ?? null;
  }

  async createTailoredCV(input: CreateTailoredCVInput): Promise<TailoredCV> {
    await delay();
    const tcv: TailoredCV = {
      id: `tcv-${Math.random().toString(36).slice(2, 10)}`,
      opportunityId: input.opportunityId,
      opportunityTitle: input.opportunityTitle,
      company: input.company,
      originalScore: input.originalScore,
      tailoredScore: input.tailoredScore,
      createdAt: new Date().toISOString(),
      highlightedSkills: input.highlightedSkills,
      recommendedChanges: input.recommendedChanges,
      projectRecommendations: input.projectRecommendations,
      summary: input.summary,
    };
    state.set(tcv.id, tcv);
    return tcv;
  }
}

type TailoredCVRow = {
  id: string;
  opportunity_id: string | null;
  opportunity_title: string;
  company: string;
  original_score: number;
  tailored_score: number;
  created_at: string;
  highlighted_skills: string[];
  recommended_changes: string[];
  project_recommendations: string[];
  summary: string;
};

function rowToTailoredCV(row: TailoredCVRow): TailoredCV {
  return {
    id: row.id,
    opportunityId: row.opportunity_id ?? "",
    opportunityTitle: row.opportunity_title,
    company: row.company,
    originalScore: row.original_score,
    tailoredScore: row.tailored_score,
    createdAt: row.created_at,
    highlightedSkills: row.highlighted_skills,
    recommendedChanges: row.recommended_changes,
    projectRecommendations: row.project_recommendations,
    summary: row.summary,
  };
}

// Reads the signed-in user's id from the locally stored session — no network
// round trip. RLS still enforces ownership server-side either way.
async function getSessionUserId(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}

// BACKEND INTEGRATION:
// Real implementation. See migration 0011 for the table this reads/writes —
// rows are denormalized (title/company/scores stored directly), the same
// pattern `applications` already uses, so a tailored CV still displays
// correctly even if the source opportunity is later removed.
export class SupabaseTailoredCVRepository implements TailoredCVRepository {
  async getTailoredCVs(): Promise<TailoredCV[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("tailored_cvs")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data as TailoredCVRow[]).map(rowToTailoredCV);
  }

  async getTailoredCVById(id: string): Promise<TailoredCV | null> {
    const supabase = createClient();
    const { data, error } = await supabase.from("tailored_cvs").select("*").eq("id", id).maybeSingle();
    if (error || !data) return null;
    return rowToTailoredCV(data as TailoredCVRow);
  }

  async createTailoredCV(input: CreateTailoredCVInput): Promise<TailoredCV> {
    const supabase = createClient();
    const userId = await getSessionUserId();
    if (!userId) throw new Error("Not signed in");

    const { data, error } = await supabase
      .from("tailored_cvs")
      .insert({
        user_id: userId,
        opportunity_id: input.opportunityId,
        opportunity_title: input.opportunityTitle,
        company: input.company,
        original_score: input.originalScore,
        tailored_score: input.tailoredScore,
        highlighted_skills: input.highlightedSkills,
        recommended_changes: input.recommendedChanges,
        project_recommendations: input.projectRecommendations,
        summary: input.summary,
      })
      .select("*")
      .single();
    if (error) throw error;
    return rowToTailoredCV(data as TailoredCVRow);
  }
}

export const tailoredCVRepository: TailoredCVRepository = isSupabaseConfigured
  ? new SupabaseTailoredCVRepository()
  : new MockTailoredCVRepository();

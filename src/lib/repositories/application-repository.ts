import type { Application, ApplicationStage } from "@/lib/types";
import { mockApplications } from "@/lib/mock/applications";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";

export interface CreateSavedApplicationInput {
  opportunityId: string;
  title: string;
  company: string;
  matchScore: number;
  location?: string;
}

export interface ApplicationRepository {
  getApplications(): Promise<Application[]>;
  moveApplication(id: string, stage: ApplicationStage): Promise<void>;
  // Called by the Save button on an opportunity. Creates a real row on the
  // Applications board in the "saved" column. Must be a no-op if a row for
  // this opportunity already exists (don't duplicate, and don't reset an
  // application the user has already moved further along).
  createSavedApplication(input: CreateSavedApplicationInput): Promise<void>;
  // Called when a user un-saves an opportunity. Only removes the row if it's
  // still sitting in "saved" — never deletes an application the user has
  // already progressed (preparing/applied/interview/offer/rejected).
  deleteSavedApplication(opportunityId: string): Promise<void>;
}

const state = new Map<string, Application>(
  mockApplications.map((a) => [a.id, { ...a }])
);

// BACKEND INTEGRATION:
// Mock implementation — used automatically whenever Supabase isn't
// configured (see the export at the bottom of this file).
export class MockApplicationRepository implements ApplicationRepository {
  async getApplications(): Promise<Application[]> {
    await delay();
    return Array.from(state.values());
  }

  async moveApplication(id: string, stage: ApplicationStage): Promise<void> {
    await delay();
    const app = state.get(id);
    if (app) app.stage = stage;
  }

  async createSavedApplication(input: CreateSavedApplicationInput): Promise<void> {
    await delay();
    const already = Array.from(state.values()).some((a) => a.opportunityId === input.opportunityId);
    if (already) return;
    const id = `app-${Math.random().toString(36).slice(2, 10)}`;
    state.set(id, {
      id,
      opportunityId: input.opportunityId,
      title: input.title,
      company: input.company,
      matchScore: input.matchScore,
      stage: "saved",
      savedAt: new Date().toISOString(),
      location: input.location,
    });
  }

  async deleteSavedApplication(opportunityId: string): Promise<void> {
    await delay();
    for (const [id, app] of state.entries()) {
      if (app.opportunityId === opportunityId && app.stage === "saved") {
        state.delete(id);
        break;
      }
    }
  }
}

function delay(ms = 100) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type ApplicationRow = {
  id: string;
  opportunity_id: string | null;
  title: string;
  company: string;
  match_score: number | null;
  stage: ApplicationStage;
  saved_at: string;
  applied_at: string | null;
  recruiter: string | null;
  next_action: string | null;
  location: string | null;
};

function rowToApplication(row: ApplicationRow): Application {
  return {
    id: row.id,
    opportunityId: row.opportunity_id ?? "",
    title: row.title,
    company: row.company,
    matchScore: row.match_score ?? 0,
    stage: row.stage,
    savedAt: row.saved_at,
    appliedAt: row.applied_at ?? undefined,
    recruiter: row.recruiter ?? undefined,
    nextAction: row.next_action ?? undefined,
    location: row.location ?? undefined,
  };
}

// Reads the signed-in user's id from the locally stored session — no network
// round trip (auth.getUser() calls the auth server on every call, which made
// each Save/drag noticeably slower). RLS still enforces ownership server-side.
async function getSessionUserId(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}

// BACKEND INTEGRATION:
// Real implementation — every row is scoped to the signed-in user via
// Row Level Security (see the migration), so no explicit user_id filter is
// even required here, but it's included for clarity and defense in depth.
export class SupabaseApplicationRepository implements ApplicationRepository {
  async getApplications(): Promise<Application[]> {
    const supabase = createClient();
    const userId = await getSessionUserId();
    if (!userId) return [];

    const { data, error } = await supabase
      .from("applications")
      .select("*")
      .eq("user_id", userId)
      .order("saved_at", { ascending: false });
    if (error) throw error;
    return (data as ApplicationRow[]).map(rowToApplication);
  }

  async moveApplication(id: string, stage: ApplicationStage): Promise<void> {
    const supabase = createClient();
    const patch: Record<string, unknown> = { stage };
    if (stage === "applied") patch.applied_at = new Date().toISOString();
    const { error } = await supabase.from("applications").update(patch).eq("id", id);
    if (error) throw error;
  }

  async createSavedApplication(input: CreateSavedApplicationInput): Promise<void> {
    const supabase = createClient();
    const userId = await getSessionUserId();
    if (!userId) throw new Error("Not signed in");

    // Upsert on the (user_id, opportunity_id) unique constraint (see
    // migration 0007) and ignore the conflict entirely if a row already
    // exists — that means this opportunity is already being tracked, and we
    // must never overwrite a stage the user has already progressed past.
    const { error } = await supabase.from("applications").upsert(
      {
        user_id: userId,
        opportunity_id: input.opportunityId,
        title: input.title,
        company: input.company,
        match_score: input.matchScore,
        location: input.location ?? null,
        stage: "saved",
      },
      { onConflict: "user_id,opportunity_id", ignoreDuplicates: true }
    );
    if (error) throw error;
  }

  async deleteSavedApplication(opportunityId: string): Promise<void> {
    const supabase = createClient();
    const userId = await getSessionUserId();
    if (!userId) throw new Error("Not signed in");

    const { error } = await supabase
      .from("applications")
      .delete()
      .eq("user_id", userId)
      .eq("opportunity_id", opportunityId)
      .eq("stage", "saved");
    if (error) throw error;
  }
}

export const applicationRepository: ApplicationRepository = isSupabaseConfigured
  ? new SupabaseApplicationRepository()
  : new MockApplicationRepository();

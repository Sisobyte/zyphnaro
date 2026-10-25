import type { InterviewDifficulty, InterviewMode, InterviewResult, InterviewTurn, SavedInterview } from "@/lib/types";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";

export interface SaveInterviewInput {
  mode: InterviewMode;
  difficulty: InterviewDifficulty;
  role: string;
  result: InterviewResult;
  turns: InterviewTurn[];
}

export interface SavedInterviewRepository {
  list(): Promise<SavedInterview[]>;
  getById(id: string): Promise<SavedInterview | null>;
  save(input: SaveInterviewInput): Promise<SavedInterview>;
  remove(id: string): Promise<void>;
}

const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms));

// Demo mode (no Supabase): kept in memory for this browser session only.
const memory = new Map<string, SavedInterview>();

export class MockSavedInterviewRepository implements SavedInterviewRepository {
  async list() {
    await delay();
    return Array.from(memory.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async getById(id: string) {
    await delay();
    return memory.get(id) ?? null;
  }
  async save(input: SaveInterviewInput) {
    await delay();
    const saved: SavedInterview = {
      id: `si-${Math.random().toString(36).slice(2, 10)}`,
      mode: input.mode,
      difficulty: input.difficulty,
      role: input.role,
      readiness: input.result.readiness,
      createdAt: new Date().toISOString(),
      result: input.result,
      turns: input.turns,
    };
    memory.set(saved.id, saved);
    return saved;
  }
  async remove(id: string) {
    await delay();
    memory.delete(id);
  }
}

type Row = {
  id: string;
  mode: InterviewMode;
  difficulty: InterviewDifficulty;
  role: string;
  readiness: number;
  result: InterviewResult;
  turns: InterviewTurn[];
  created_at: string;
};

const toSaved = (r: Row): SavedInterview => ({
  id: r.id,
  mode: r.mode,
  difficulty: r.difficulty,
  role: r.role,
  readiness: r.readiness,
  createdAt: r.created_at,
  result: r.result,
  turns: r.turns ?? [],
});

// See migration 0017. Row Level Security limits every query to the signed-in user.
export class SupabaseSavedInterviewRepository implements SavedInterviewRepository {
  async list() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("saved_interviews")
      .select("id, mode, difficulty, role, readiness, result, turns, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data as Row[]).map(toSaved);
  }
  async getById(id: string) {
    const supabase = createClient();
    const { data, error } = await supabase.from("saved_interviews").select("*").eq("id", id).maybeSingle();
    if (error || !data) return null;
    return toSaved(data as Row);
  }
  async save(input: SaveInterviewInput) {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) throw new Error("Please sign in to save this interview.");
    const { data, error } = await supabase
      .from("saved_interviews")
      .insert({
        user_id: session.user.id,
        mode: input.mode,
        difficulty: input.difficulty,
        role: input.role,
        readiness: input.result.readiness,
        result: input.result,
        turns: input.turns,
      })
      .select("*")
      .single();
    if (error) throw error;
    return toSaved(data as Row);
  }
  async remove(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("saved_interviews").delete().eq("id", id);
    if (error) throw error;
  }
}

export const savedInterviewRepository: SavedInterviewRepository = isSupabaseConfigured
  ? new SupabaseSavedInterviewRepository()
  : new MockSavedInterviewRepository();

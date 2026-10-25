import type { UserProfile, ExperienceEntry, Project, EducationEntry, RelatedRole } from "@/lib/types";
import { mockUser } from "@/lib/mock/users";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";

export interface UserRepository {
  getCurrentUser(): Promise<UserProfile>;
  updateProfile(patch: Partial<UserProfile>): Promise<UserProfile>;
}

let currentUser: UserProfile = { ...mockUser };

// BACKEND INTEGRATION:
// Mock implementation — used automatically whenever Supabase isn't
// configured (see the export at the bottom of this file).
export class MockUserRepository implements UserRepository {
  async getCurrentUser(): Promise<UserProfile> {
    await delay();
    return { ...currentUser };
  }

  async updateProfile(patch: Partial<UserProfile>): Promise<UserProfile> {
    await delay();
    currentUser = { ...currentUser, ...patch };
    return { ...currentUser };
  }
}

function delay(ms = 100) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Maps between the `profiles` table (snake_case) and the full UserProfile
// shape the UI expects. experience/projects/education are real, stored as
// JSONB arrays (migration 0006) — CV extraction (Gemini) can populate
// these for real now. relatedRoles is real too, stored as a JSONB array
// (migration 0008) — Role Explorer's "Add role"/"Remove" persist here.
// Falls back to empty, not mock data — a real signed-up user should never
// see a hardcoded stranger's fake data as their own default.
// See /docs/database-schema.md for the fully-normalized target schema.
type ProfileRow = {
  id: string;
  name: string | null;
  headline: string | null;
  avatar_url: string | null;
  primary_role: string | null;
  seniority: UserProfile["seniority"] | null;
  years_experience: number | null;
  location: string | null;
  preferred_locations: string[] | null;
  remote_preference: UserProfile["remotePreference"] | null;
  employment_types: UserProfile["employmentTypes"] | null;
  skills: string[] | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  salary_period: string | null;
  portfolio_url: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  availability: string | null;
  // NULL means never analyzed — see migration 0013. Distinct from a real,
  // computed score of 0.
  cv_score: number | null;
  min_match_score: number | null;
  notify_high_match: boolean | null;
  cv_file_name: string | null;
  cv_storage_path: string | null;
  cv_uploaded_at: string | null;
  plan: UserProfile["plan"] | null;
  experience: ExperienceEntry[] | null;
  projects: Project[] | null;
  education: EducationEntry[] | null;
  onboarding_completed: boolean | null;
  phone: string | null;
  related_roles: RelatedRole[] | null;
};

// A genuinely empty, neutral profile — used as the base for a real signed-up
// user whenever a field has no real value yet. Deliberately NOT mockUser:
// two different real people should never see the same stranger's fake bio
// as their own default.
function blankProfile(id: string, name: string): UserProfile {
  return {
    id,
    name,
    headline: "",
    avatarInitials: name.slice(0, 2).toUpperCase(),
    primaryRole: "Not specified",
    relatedRoles: [],
    seniority: "junior",
    yearsExperience: 0,
    skills: [],
    experience: [],
    projects: [],
    education: [],
    location: "",
    preferredLocations: [],
    remotePreference: "remote-first",
    employmentTypes: [],
    salaryExpectation: { min: 0, max: 0, currency: "USD", period: "month" },
    availability: "",
    cvScore: null,
    minMatchScore: 80,
    plan: "free",
  };
}

function rowToProfile(row: ProfileRow, email: string): UserProfile {
  return {
    ...blankProfile(row.id, row.name ?? email),
    experience: row.experience ?? [],
    projects: row.projects ?? [],
    education: row.education ?? [],
    relatedRoles: row.related_roles ?? [],
    id: row.id,
    name: row.name ?? email,
    headline: row.headline ?? "",
    avatarInitials: (row.name ?? email).slice(0, 2).toUpperCase(),
    avatarUrl: row.avatar_url ?? undefined,
    primaryRole: row.primary_role ?? "Not specified",
    seniority: row.seniority ?? "junior",
    yearsExperience: row.years_experience ?? 0,
    location: row.location ?? "",
    preferredLocations: row.preferred_locations ?? [],
    remotePreference: row.remote_preference ?? "remote-first",
    employmentTypes: row.employment_types ?? [],
    skills: row.skills ?? [],
    salaryExpectation: {
      min: row.salary_min ?? 0,
      max: row.salary_max ?? 0,
      currency: row.salary_currency ?? "USD",
      period: row.salary_period ?? "month",
    },
    portfolioUrl: row.portfolio_url ?? undefined,
    githubUrl: row.github_url ?? undefined,
    linkedinUrl: row.linkedin_url ?? undefined,
    availability: row.availability ?? "",
    // No ?? 0 here on purpose — null (never analyzed) must stay null, not
    // collapse into the same value a real 0 score would have.
    cvScore: row.cv_score,
    minMatchScore: row.min_match_score ?? 80,
    notifyHighMatch: row.notify_high_match ?? true,
    cvFileName: row.cv_file_name ?? undefined,
    cvStoragePath: row.cv_storage_path ?? undefined,
    cvUploadedAt: row.cv_uploaded_at ?? undefined,
    plan: row.plan ?? "free",
    onboardingCompleted: row.onboarding_completed ?? false,
    phone: row.phone ?? undefined,
  };
}

function profilePatchToRow(patch: Partial<UserProfile>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.headline !== undefined) row.headline = patch.headline;
  if (patch.avatarUrl !== undefined) row.avatar_url = patch.avatarUrl ?? null;
  if (patch.primaryRole !== undefined) row.primary_role = patch.primaryRole;
  if (patch.seniority !== undefined) row.seniority = patch.seniority;
  if (patch.yearsExperience !== undefined) row.years_experience = patch.yearsExperience;
  if (patch.location !== undefined) row.location = patch.location;
  if (patch.preferredLocations !== undefined) row.preferred_locations = patch.preferredLocations;
  if (patch.remotePreference !== undefined) row.remote_preference = patch.remotePreference;
  if (patch.employmentTypes !== undefined) row.employment_types = patch.employmentTypes;
  if (patch.skills !== undefined) row.skills = patch.skills;
  if (patch.salaryExpectation !== undefined) {
    row.salary_min = patch.salaryExpectation.min;
    row.salary_max = patch.salaryExpectation.max;
    row.salary_currency = patch.salaryExpectation.currency;
    row.salary_period = patch.salaryExpectation.period;
  }
  if (patch.portfolioUrl !== undefined) row.portfolio_url = patch.portfolioUrl;
  if (patch.githubUrl !== undefined) row.github_url = patch.githubUrl;
  if (patch.linkedinUrl !== undefined) row.linkedin_url = patch.linkedinUrl;
  if (patch.availability !== undefined) row.availability = patch.availability;
  if (patch.cvFileName !== undefined) row.cv_file_name = patch.cvFileName ?? null;
  if (patch.cvStoragePath !== undefined) row.cv_storage_path = patch.cvStoragePath ?? null;
  if (patch.cvUploadedAt !== undefined) row.cv_uploaded_at = patch.cvUploadedAt ?? null;
  if (patch.plan !== undefined) row.plan = patch.plan;
  if (patch.minMatchScore !== undefined) row.min_match_score = patch.minMatchScore;
  if (patch.notifyHighMatch !== undefined) row.notify_high_match = patch.notifyHighMatch;
  if (patch.experience !== undefined) row.experience = patch.experience;
  if (patch.projects !== undefined) row.projects = patch.projects;
  if (patch.education !== undefined) row.education = patch.education;
  if (patch.onboardingCompleted !== undefined) row.onboarding_completed = patch.onboardingCompleted;
  if (patch.phone !== undefined) row.phone = patch.phone;
  if (patch.relatedRoles !== undefined) row.related_roles = patch.relatedRoles;
  // Was missing entirely — CV Analyzer's updateProfile({ cvScore }) call
  // silently did nothing against real Supabase (MockUserRepository masked
  // this, since it applies any patch via a plain object spread).
  if (patch.cvScore !== undefined) row.cv_score = patch.cvScore;
  return row;
}

// BACKEND INTEGRATION:
// Real implementation, reading/writing the `profiles` table for the
// currently authenticated user. Row Level Security (see the migration)
// guarantees this can only ever touch the caller's own row.
export class SupabaseUserRepository implements UserRepository {
  async getCurrentUser(): Promise<UserProfile> {
    const supabase = createClient();
    // Read the signed-in user from the locally stored session rather than
    // auth.getUser(), which makes a network call to the auth server on every
    // invocation — and this runs on every page load. RLS on `profiles` still
    // guarantees a caller can only ever read their own row.
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) throw new Error("Not signed in");

    const { data: row, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (error || !row) {
      // Trigger hasn't created the row yet (rare race right after signup) —
      // fall back to a minimal profile so the UI doesn't break.
      return blankProfile(user.id, user.email ?? "");
    }
    return rowToProfile(row as ProfileRow, user.email ?? "");
  }

  async updateProfile(patch: Partial<UserProfile>): Promise<UserProfile> {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not signed in");

    const row = profilePatchToRow(patch);
    const { error } = await supabase.from("profiles").update(row).eq("id", user.id);
    if (error) throw error;
    return this.getCurrentUser();
  }
}

export const userRepository: UserRepository = isSupabaseConfigured
  ? new SupabaseUserRepository()
  : new MockUserRepository();
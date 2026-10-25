import type { EmploymentType, SeniorityLevel } from "./opportunity";

export interface RelatedRole {
  title: string;
  relation: "related" | "adjacent";
  overlapPercent: number;
  reason: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  skills: string[];
  url?: string;
}

export interface ExperienceEntry {
  id: string;
  title: string;
  company: string;
  startDate: string;
  endDate?: string; // undefined = present
  description: string;
  skills: string[];
}

export interface EducationEntry {
  id: string;
  school: string;
  credential: string;
  startYear: string;
  endYear?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  headline: string;
  avatarInitials: string;
  avatarUrl?: string;
  primaryRole: string;
  relatedRoles: RelatedRole[];
  seniority: SeniorityLevel;
  yearsExperience: number;

  skills: string[];
  experience: ExperienceEntry[];
  projects: Project[];
  education: EducationEntry[];

  location: string;
  preferredLocations: string[];
  remotePreference: "remote-only" | "remote-first" | "hybrid" | "onsite";
  employmentTypes: EmploymentType[];
  salaryExpectation: { min: number; max: number; currency: string; period: string };

  portfolioUrl?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  availability: string;

  // null = never analyzed. Distinct from a real, computed score of 0.
  cvScore: number | null;
  minMatchScore: number;
  cvFileName?: string;
  cvStoragePath?: string;
  cvUploadedAt?: string;
  plan: "free" | "pro" | "career-agent";
  /** Send an in-app alert when a newly posted job matches this profile. Default on. */
  notifyHighMatch?: boolean;
  onboardingCompleted?: boolean;
  phone?: string;
}
export type ApplicationStage =
  | "saved"
  | "preparing"
  | "applied"
  | "interview"
  | "offer"
  | "rejected";

export interface Application {
  id: string;
  opportunityId: string;
  title: string;
  company: string;
  matchScore: number;
  stage: ApplicationStage;
  savedAt: string;
  appliedAt?: string;
  recruiter?: string;
  nextAction?: string;
  location?: string;
}

export interface CVAnalysisBreakdown {
  atsCompatibility: number;
  skillsCoverage: number;
  experienceRelevance: number;
  projectRelevance: number;
  keywords: number;
  structure: number;
  clarity: number;
}

export interface CVAnalysis {
  overallScore: number;
  breakdown: CVAnalysisBreakdown;
  missingKeywords: string[];
  strongKeywords: string[];
  feedback: string[];
}

export interface TailoredCV {
  id: string;
  opportunityId: string;
  opportunityTitle: string;
  company: string;
  originalScore: number;
  tailoredScore: number;
  createdAt: string;
  highlightedSkills: string[];
  recommendedChanges: string[];
  projectRecommendations: string[];
  summary: string;
}

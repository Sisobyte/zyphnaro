// Provider-independent AI contracts. The UI and the rest of the app depend
// only on these types, never on a specific AI provider's SDK or response
// shape. Swapping MockAIService for a real provider implementation should
// never require touching a component.

import type { AIEvidence, AIReasoning } from "@/lib/assessment/ai-evidence";
import type { InterviewDifficulty, InterviewEvaluation, InterviewMode, InterviewQuestion } from "./interview";

export interface OpportunityAIInput {
  opportunityTitle: string;
  opportunityDescription: string;
  // The SAME normalized facts the quick analysis uses (job requirements, the
  // candidate's evidence, level reading, scores, concerns). The AI adds
  // reasoning on top of these and never produces its own score.
  evidence: AIEvidence;
}

// Reasoning only. There is deliberately no matchScore: the displayed score is
// computed by Zyphnaro's rules so quick and live analysis can't disagree.
export type OpportunityAIResult = AIReasoning;

export interface CVAIInput {
  cvSkills: string[];
  cvExperienceSummary: string;
  targetOpportunitySkills?: string[];
  // Present only when a real CV file is available (Supabase Storage) and a
  // real AI provider is configured — lets GeminiAIService read the actual
  // PDF natively instead of just the skill list. MockAIService ignores
  // these fields entirely.
  cvFileBase64?: string;
  cvFileMimeType?: string;
}

export interface CVAIResult {
  score: number;
  atsCompatibility: number;
  missingKeywords: string[];
  strongKeywords: string[];
  feedback: string[];
}

export interface TailorCVInput {
  cvSkills: string[];
  opportunityTitle: string;
  opportunitySkills: string[];
  cvFileBase64?: string;
  cvFileMimeType?: string;
}

export interface TailoredCVResult {
  highlightedSkills: string[];
  recommendedChanges: string[];
  projectRecommendations: string[];
  summary: string;
}

export interface RecruiterMessageInput {
  channel: "linkedin" | "email" | "dm";
  recruiterName: string;
  company: string;
  opportunityTitle: string;
  userName: string;
  userHeadline: string;
}

export interface InterviewQuestionInput {
  mode: InterviewMode;
  difficulty: InterviewDifficulty;
  role: string;
  previousTurns: number;
  lastAnswerWasWeak?: boolean;
}

export interface InterviewAnswerInput {
  question: InterviewQuestion;
  answer: string;
}

export interface CVExtractionInput {
  cvFileBase64: string;
  cvFileMimeType: string;
}

export interface ExtractedExperience {
  title: string;
  company: string;
  startDate: string;
  endDate?: string; // omitted/undefined = present
  description: string;
  skills: string[];
}

export interface ExtractedProject {
  name: string;
  description: string;
  skills: string[];
}

export interface ExtractedEducation {
  school: string;
  credential: string;
  startYear: string;
  endYear?: string;
}

export interface CVExtractionResult {
  suggestedRole: string;
  skills: string[];
  summary: string;
  yearsExperience?: number;
  experience: ExtractedExperience[];
  projects: ExtractedProject[];
  education: ExtractedEducation[];
}

// The interface every AI provider implementation (Mock, Anthropic, OpenAI,
// Gemini, ...) must satisfy. UI code depends on this interface only.
export interface AIService {
  analyzeOpportunity(input: OpportunityAIInput): Promise<OpportunityAIResult>;
  analyzeCV(input: CVAIInput): Promise<CVAIResult>;
  tailorCV(input: TailorCVInput): Promise<TailoredCVResult>;
  generateRecruiterMessage(input: RecruiterMessageInput): Promise<string>;
  generateInterviewQuestion(input: InterviewQuestionInput): Promise<InterviewQuestion>;
  evaluateInterviewAnswer(input: InterviewAnswerInput): Promise<InterviewEvaluation>;
  extractProfileFromCV(input: CVExtractionInput): Promise<CVExtractionResult>;
}
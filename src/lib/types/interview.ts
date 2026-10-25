export type InterviewMode =
  | "technical"
  | "behavioral"
  | "role-focused"
  | "company"
  | "full-mock";

export type InterviewDifficulty = "friendly" | "realistic" | "challenging";

export interface InterviewSetup {
  mode: InterviewMode;
  difficulty: InterviewDifficulty;
  durationMinutes: 10 | 20 | 30;
  role?: string;
  company?: string;
}

export interface InterviewQuestion {
  id: string;
  prompt: string;
  followUp?: string;
  category: string;
}

export interface InterviewTurn {
  question: InterviewQuestion;
  answer: string;
  evaluation?: InterviewEvaluation;
}

export interface InterviewDimensions {
  technical: number;
  communication: number;
  problemSolving: number;
  roleKnowledge: number;
}

export interface InterviewEvaluation {
  /** Derived from `score`: under 45 weak, under 75 solid, otherwise strong. */
  strength: "weak" | "solid" | "strong";
  /** 0-100 honest mark for this answer. Absent only on sessions saved before scoring existed. */
  score?: number;
  dimensions?: InterviewDimensions;
  feedback: string;
  followUpTriggered: boolean;
}

export interface SavedInterview {
  id: string;
  mode: InterviewMode;
  difficulty: InterviewDifficulty;
  role: string;
  readiness: number;
  createdAt: string;
  result: InterviewResult;
  turns: InterviewTurn[];
}

export interface InterviewResult {
  readiness: number;
  /** Questions actually answered, and how many the session planned. */
  answered?: number;
  planned?: number;
  technicalKnowledge: number;
  communication: number;
  problemSolving: number;
  roleKnowledge: number;
  strengths: string[];
  weakAreas: string[];
  recommendedPractice: string[];
  questionsToRevisit: string[];
}

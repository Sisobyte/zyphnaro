// Zod schemas for every structured AI response. GeminiAIService parses each
// model response as JSON and validates it against the matching schema
// before it's ever trusted or shown to the user — if validation fails, the
// caller gets a clear thrown error instead of malformed data reaching the
// UI. See /docs/ai-integration.md, "Structured AI output".

import { strengthFromScore } from "@/lib/interview-scoring";
import { z } from "zod";

// What the model returns. `provider` is added by the service, not the model.
export const opportunityAIResultSchema = z.object({
  summary: z.string(),
  insights: z.array(z.string()),
  recruiterQuestions: z.array(z.string()),
  disagreements: z.array(z.object({ topic: z.string(), claim: z.string(), reason: z.string() })),
});

export const cvAIResultSchema = z.object({
  score: z.number().min(0).max(100),
  atsCompatibility: z.number().min(0).max(100),
  missingKeywords: z.array(z.string()),
  strongKeywords: z.array(z.string()),
  feedback: z.array(z.string()),
});

export const tailoredCVResultSchema = z.object({
  highlightedSkills: z.array(z.string()),
  recommendedChanges: z.array(z.string()),
  projectRecommendations: z.array(z.string()),
  summary: z.string(),
});

export const interviewQuestionSchema = z.object({
  id: z.string(),
  category: z.string(),
  prompt: z.string(),
  followUp: z.string().optional(),
});

const pct = z.number().transform((n) => Math.max(0, Math.min(100, Math.round(n))));

export const interviewEvaluationSchema = z
  .object({
    score: pct,
    dimensions: z.object({
      technical: pct,
      communication: pct,
      problemSolving: pct,
      roleKnowledge: pct,
    }),
    feedback: z.string(),
    followUpTriggered: z.boolean(),
  })
  .transform((e) => ({ ...e, strength: strengthFromScore(e.score) }));

const extractedExperienceSchema = z.object({
  title: z.string(),
  company: z.string(),
  startDate: z.string(),
  endDate: z.string().optional(),
  description: z.string(),
  skills: z.array(z.string()),
});

const extractedProjectSchema = z.object({
  name: z.string(),
  description: z.string(),
  skills: z.array(z.string()),
});

const extractedEducationSchema = z.object({
  school: z.string(),
  credential: z.string(),
  startYear: z.string(),
  endYear: z.string().optional(),
});

export const cvExtractionResultSchema = z.object({
  suggestedRole: z.string(),
  skills: z.array(z.string()),
  summary: z.string(),
  yearsExperience: z.number().optional(),
  experience: z.array(extractedExperienceSchema).default([]),
  projects: z.array(extractedProjectSchema).default([]),
  education: z.array(extractedEducationSchema).default([]),
});
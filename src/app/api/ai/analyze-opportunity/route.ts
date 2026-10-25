import { NextResponse } from "next/server";
import { z } from "zod";
import { aiService } from "@/lib/services/ai";
import { guardAiRequest, aiFailure, SMALL_BODY } from "@/lib/api/guard";

// AI INTEGRATION: see /docs/ai-integration.md
//
// The browser sends the normalized evidence (job requirements, candidate
// evidence, scores, concerns) that the on-page assessment already shows. The
// model reasons over exactly those facts and returns no score. Everything is
// validated and size-capped here because it ends up inside a prompt.

const strs = (max: number) => z.array(z.string().max(400)).max(max);

const bodySchema = z.object({
  opportunityTitle: z.string().min(1).max(300),
  opportunityDescription: z.string().max(30_000),
  evidence: z.object({
    level: z.object({
      label: z.string().max(20),
      origin: z.enum(["title", "assumed"]),
      reviewFlag: z.boolean(),
      reviewReason: z.string().max(600).optional(),
    }),
    requirements: z.object({
      essential: strs(60),
      preferred: strs(60),
      unspecified: strs(60),
      structured: z.boolean(),
    }),
    responsibilities: strs(10),
    yearsRequired: z.number().min(0).max(60).optional(),
    candidate: z.object({
      level: z.string().max(20),
      evidence: z.string().max(20),
      listedSkills: strs(60),
      demonstratedSkills: strs(60),
      leadershipShown: strs(10),
      roles: strs(10),
    }),
    scores: z.object({
      skillMatch: z.number().min(0).max(100),
      experienceMatch: z.number().min(0).max(100).nullable(),
      overall: z.number().min(0).max(100),
    }),
    strengths: strs(12),
    concerns: z.array(z.object({ status: z.string().max(20), text: z.string().max(600) })).max(20),
  }),
});

export async function POST(req: Request) {
  const guard = await guardAiRequest(req, { name: "ai/analyze-opportunity", maxBytes: SMALL_BODY });
  if (!guard.ok) return guard.response;

  const parsed = bodySchema.safeParse(guard.body);
  if (!parsed.success) {
    return NextResponse.json({ error: "That analysis request wasn't valid." }, { status: 400 });
  }

  try {
    const result = await aiService.analyzeOpportunity(parsed.data);
    return NextResponse.json({ result });
  } catch (error) {
    return aiFailure("ai/analyze-opportunity", error, "AI reasoning is unavailable right now. The assessment above is unaffected.");
  }
}

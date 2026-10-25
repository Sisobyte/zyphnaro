import { NextResponse } from "next/server";
import { aiService } from "@/lib/services/ai";
import { guardAiRequest, aiFailure, SMALL_BODY } from "@/lib/api/guard";
import type { InterviewAnswerInput } from "@/lib/types";

// AI INTEGRATION: see /docs/ai-integration.md
export async function POST(req: Request) {
  const guard = await guardAiRequest<InterviewAnswerInput>(req, { name: "ai/interview/evaluate", maxBytes: SMALL_BODY });
  if (!guard.ok) return guard.response;
  const body = guard.body;
  try {
    const evaluation = await aiService.evaluateInterviewAnswer(body);
    return NextResponse.json({ evaluation });
  } catch (error) {
    return aiFailure("ai/interview/evaluate", error, "Couldn't evaluate that answer. Please try again.");
  }
}

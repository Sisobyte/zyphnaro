import { NextResponse } from "next/server";
import { aiService } from "@/lib/services/ai";
import { guardAiRequest, aiFailure, SMALL_BODY } from "@/lib/api/guard";
import type { InterviewQuestionInput } from "@/lib/types";

// AI INTEGRATION: see /docs/ai-integration.md
export async function POST(req: Request) {
  const guard = await guardAiRequest<InterviewQuestionInput>(req, { name: "ai/interview/question", maxBytes: SMALL_BODY });
  if (!guard.ok) return guard.response;
  const body = guard.body;
  try {
    const question = await aiService.generateInterviewQuestion(body);
    return NextResponse.json({ question });
  } catch (error) {
    return aiFailure("ai/interview/question", error, "Couldn't generate the next question. Please try again.");
  }
}

import { NextResponse } from "next/server";
import { aiService } from "@/lib/services/ai";
import { guardAiRequest, aiFailure, SMALL_BODY } from "@/lib/api/guard";
import type { RecruiterMessageInput } from "@/lib/types";

// AI INTEGRATION: see /docs/ai-integration.md
export async function POST(req: Request) {
  const guard = await guardAiRequest<RecruiterMessageInput>(req, { name: "recruiters/message", maxBytes: SMALL_BODY });
  if (!guard.ok) return guard.response;
  const body = guard.body;
  try {
    const message = await aiService.generateRecruiterMessage(body);
    return NextResponse.json({ message });
  } catch (error) {
    return aiFailure("recruiters/message", error, "Couldn't generate a message. Please try again.");
  }
}

import { NextResponse } from "next/server";
import { aiService } from "@/lib/services/ai";
import { getUserCvBase64 } from "@/lib/services/ai/cv-content";
import { trackAi } from "@/lib/admin/ai-usage";
import { guardAiRequest, aiFailure, SMALL_BODY } from "@/lib/api/guard";
import type { CVAIInput } from "@/lib/types";

// AI INTEGRATION: see /docs/ai-integration.md. The caller's real CV file is
// fetched server-side (Storage RLS restricts it to their own file) and
// attached so Gemini can read the actual document.
export async function POST(req: Request) {
  const guard = await guardAiRequest<CVAIInput>(req, {
    name: "cv/analyze",
    maxBytes: SMALL_BODY,
    limit: { max: 10, windowMs: 60_000 },
  });
  if (!guard.ok) return guard.response;
  trackAi("cv/analyze", guard.userId);

  const cv = await getUserCvBase64();

  try {
    // The file fields always come from the server, never from the client body.
    const analysis = await aiService.analyzeCV({
      ...guard.body,
      cvFileBase64: cv?.base64,
      cvFileMimeType: cv?.mimeType,
    });
    return NextResponse.json({ analysis });
  } catch (error) {
    return aiFailure("cv/analyze", error, "CV analysis failed. Please try again.");
  }
}

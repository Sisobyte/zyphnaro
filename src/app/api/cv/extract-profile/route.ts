import { NextResponse } from "next/server";
import { aiService } from "@/lib/services/ai";
import { trackAi } from "@/lib/admin/ai-usage";
import { guardAiRequest, aiFailure, CV_BODY } from "@/lib/api/guard";
import type { CVExtractionInput } from "@/lib/types";

// AI INTEGRATION:
// Real when GEMINI_API_KEY is set, mock otherwise. Takes the file bytes
// directly in the request body (rather than reading from Storage) so this
// works during onboarding, before the CV has necessarily been saved
// anywhere yet. See /docs/ai-integration.md
export async function POST(req: Request) {
  // Extraction is the most expensive call, so it gets a tighter limit.
  const guard = await guardAiRequest<CVExtractionInput>(req, {
    name: "cv/extract-profile",
    maxBytes: CV_BODY,
    limit: { max: 6, windowMs: 60_000 },
  });
  if (!guard.ok) return guard.response;
  trackAi("cv/extract-profile", guard.userId);
  const body = guard.body;

  if (typeof body.cvFileBase64 !== "string" || body.cvFileBase64.length === 0) {
    return NextResponse.json({ error: "No CV file was provided." }, { status: 400 });
  }
  if (body.cvFileMimeType !== "application/pdf") {
    return NextResponse.json({ error: "Only PDF files are supported." }, { status: 400 });
  }

  try {
    const result = await aiService.extractProfileFromCV(body);
    return NextResponse.json({ result });
  } catch (error) {
    return aiFailure("cv/extract-profile", error, "Couldn't read that CV. Please try again in a moment.");
  }
}

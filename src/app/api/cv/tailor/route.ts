import { NextResponse } from "next/server";
import { aiService } from "@/lib/services/ai";
import { getUserCvBase64 } from "@/lib/services/ai/cv-content";
import { guardAiRequest, aiFailure, SMALL_BODY } from "@/lib/api/guard";
import type { TailorCVInput } from "@/lib/types";

// AI INTEGRATION: see /docs/ai-integration.md. The caller's real CV file is
// fetched server-side (Storage RLS restricts it to their own file) and
// attached so Gemini can read the actual document.
export async function POST(req: Request) {
  const guard = await guardAiRequest<TailorCVInput>(req, {
    name: "cv/tailor",
    maxBytes: SMALL_BODY,
    limit: { max: 10, windowMs: 60_000 },
  });
  if (!guard.ok) return guard.response;

  const cv = await getUserCvBase64();

  try {
    // The file fields always come from the server, never from the client body.
    const tailoredCV = await aiService.tailorCV({
      ...guard.body,
      cvFileBase64: cv?.base64,
      cvFileMimeType: cv?.mimeType,
    });
    return NextResponse.json({ tailoredCV });
  } catch (error) {
    return aiFailure("cv/tailor", error, "CV tailoring failed. Please try again.");
  }
}

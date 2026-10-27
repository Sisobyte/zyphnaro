import { NextResponse } from "next/server";
import { guardAiRequest } from "@/lib/api/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { feedbackSchema } from "@/lib/feedback";

// Any signed-in person can send feedback. The user id and email come from the
// session, never from the request.
export async function POST(req: Request) {
  const guard = await guardAiRequest(req, {
    name: "feedback",
    maxBytes: 5_000,
    limit: { max: 5, windowMs: 60 * 60_000 },
    skipAiSwitch: true,
  });
  if (!guard.ok) return guard.response;
  if (!guard.userId) return NextResponse.json({ error: "Feedback needs a signed-in account." }, { status: 400 });

  const parsed = feedbackSchema.safeParse(guard.body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check your message." }, { status: 400 });

  try {
    const { data } = await (await createClient()).auth.getUser();
    const { error } = await createAdminClient().from("feedback").insert({
      user_id: guard.userId,
      email: data.user?.email ?? null,
      category: parsed.data.category,
      message: parsed.data.message,
      page: parsed.data.page ?? null,
    });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[feedback]", e);
    return NextResponse.json({ error: "Couldn't send that. Please try again." }, { status: 500 });
  }
}

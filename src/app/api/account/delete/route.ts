import { NextResponse } from "next/server";
import { guardAiRequest } from "@/lib/api/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteUserCompletely } from "@/lib/admin/delete-user";

// Permanently deletes the signed-in person's account and everything tied to it.
//
// Deleting the auth user cascades (ON DELETE CASCADE) to their profile,
// saved jobs, applications, notifications, source connections, tailored CVs
// and saved interviews. Files in Storage are NOT covered by that cascade, so
// they are removed first. The user id always comes from the session, never
// from the request body, so nobody can delete someone else's account.
export async function POST(req: Request) {
  const guard = await guardAiRequest<{ confirm?: string }>(req, {
    name: "account/delete",
    maxBytes: 1_000,
    limit: { max: 3, windowMs: 60 * 60_000 },
    skipAiSwitch: true,
  });
  if (!guard.ok) return guard.response;
  if (!guard.userId) return NextResponse.json({ error: "Account deletion needs a signed-in account." }, { status: 400 });
  if (guard.body.confirm !== "DELETE") {
    return NextResponse.json({ error: 'Type "DELETE" to confirm.' }, { status: 400 });
  }

  try {
    await deleteUserCompletely(createAdminClient(), guard.userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[account/delete] failed:", error);
    return NextResponse.json({ error: "Couldn't delete your account. Please try again or contact support." }, { status: 500 });
  }
}

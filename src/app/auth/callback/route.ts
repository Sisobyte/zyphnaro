import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/auth-redirect";

// Handles the redirect Supabase sends the browser to after a person clicks
// the "Confirm your email" link. Exchanges the one-time `code` in the URL
// for a real session (this is the step that was missing before — without
// it, Supabase considers the email confirmed, but this app never actually
// establishes a logged-in session or gets a chance to route the person to
// onboarding). See /docs/backend-integration.md, "Phase 1 quickstart".
export async function GET(request: Request) {

  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Where to go after the code is exchanged. Only same-site paths are allowed,
  // so a crafted link can't bounce someone to another website.
  const nextParam = searchParams.get("next") ?? "";
  const next = safeNextPath(nextParam);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }
  if (next === "/reset-password") {
    return NextResponse.redirect(`${origin}/forgot-password?error=link-expired`);
  }

  return NextResponse.redirect(`${origin}/login?error=confirmation-failed`);
}

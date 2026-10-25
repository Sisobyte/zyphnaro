import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseUrl, supabaseAnonKey, isSupabaseConfigured } from "@/lib/supabase/config";

// Routes reachable without a session. Everything else under the (app) route
// group requires one once Supabase is configured. The onboarding wizard is
// intentionally left accessible right after signup.
const PUBLIC_PATHS = ["/", "/login", "/signup", "/forgot-password", "/verify-code"];
const PUBLIC_PREFIXES = ["/auth/"]; // covers /auth/callback and /auth/confirm

export async function proxy(request: NextRequest) {
  // BACKEND INTEGRATION:
  // While Supabase isn't configured, skip auth entirely so the app keeps
  // working in full mock mode. Once NEXT_PUBLIC_SUPABASE_URL /
  // NEXT_PUBLIC_SUPABASE_ANON_KEY are set, real session checks kick in
  // automatically — no other code changes needed. See /docs/backend-integration.md
  
  if (!isSupabaseConfigured) {
    // In production a missing Supabase config must never silently turn auth off.
    if (process.env.NODE_ENV === "production") {
      return new NextResponse("Service not configured.", { status: 503 });
    }
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl!, supabaseAnonKey!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic =
    PUBLIC_PATHS.includes(path) ||
    PUBLIC_PREFIXES.some((prefix) => path.startsWith(prefix));

  if (!user && !isPublic) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (user && (path === "/login" || path === "/signup" || path === "/forgot-password")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api|.*\\..*).*)"],
};

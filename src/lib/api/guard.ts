// Shared protection for every route that calls the AI provider.
//
// Why this exists: src/proxy.ts deliberately skips /api/*, so without this an
// anonymous visitor could call these routes directly and spend your Gemini
// quota. Each route now calls `guardAiRequest()` first.
//
// It does four things, in order:
//   1. Requires a signed-in user (when Supabase is configured).
//   2. Rate-limits per user (or per IP if signed out in mock mode).
//   3. Rejects oversized bodies before parsing them.
//   4. Parses JSON safely, so a bad body returns 400 instead of crashing.
//
// RATE LIMIT CAVEAT: the counter lives in this server instance's memory. On
// Vercel each serverless instance has its own counter, so the limit is
// approximate (still enough to stop casual abuse and runaway loops). For a hard
// guarantee across instances, swap `hit()` for Upstash Redis or Vercel KV.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSettings } from "@/lib/admin/settings";

type Limit = { max: number; windowMs: number };

const DEFAULT_LIMIT: Limit = { max: 20, windowMs: 60_000 };
const buckets = new Map<string, number[]>();

function hit(key: string, { max, windowMs }: Limit): boolean {
  const now = Date.now();
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    buckets.set(key, recent);
    return false;
  }
  recent.push(now);
  buckets.set(key, recent);
  // Keep the map from growing forever.
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (v.every((t) => now - t >= windowMs)) buckets.delete(k);
  }
  return true;
}

function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export type GuardOptions = {
  /** Route name, so each route has its own counter. */
  name: string;
  /** Largest accepted request body in bytes. */
  maxBytes: number;
  limit?: Limit;
  /** Set for routes that don't call the AI provider (they still get auth + rate limit). */
  skipAiSwitch?: boolean;
};

export type GuardResult<T> =
  | { ok: true; body: T; userId: string | null }
  | { ok: false; response: NextResponse };

function fail(message: string, status: number, extra?: Record<string, string>) {
  return { ok: false as const, response: NextResponse.json({ error: message }, { status, headers: extra }) };
}

export async function guardAiRequest<T = unknown>(req: Request, opts: GuardOptions): Promise<GuardResult<T>> {
  let userId: string | null = null;

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return fail("Please sign in to use this feature.", 401);
    userId = data.user.id;
  }

  // Admin kill switch: when AI is turned off, AI routes stop before doing any work.
  if (!opts.skipAiSwitch) {
    const settings = await getSettings();
    if (!settings.ai.enabled) {
      return fail("AI features are temporarily turned off. Please try again later.", 503);
    }
  }

  const limit = opts.limit ?? DEFAULT_LIMIT;
  if (!hit(`${opts.name}:${userId ?? clientIp(req)}`, limit)) {
    return fail("You're going a bit fast. Please wait a minute and try again.", 429, {
      "Retry-After": String(Math.ceil(limit.windowMs / 1000)),
    });
  }

  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > opts.maxBytes) return fail("That request is too large.", 413);

  let text: string;
  try {
    text = await req.text();
  } catch {
    return fail("Couldn't read the request.", 400);
  }
  if (text.length > opts.maxBytes) return fail("That request is too large.", 413);

  try {
    const body = JSON.parse(text) as unknown;
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
      return fail("The request body must be a JSON object.", 400);
    }
    return { ok: true, body: body as T, userId };
  } catch {
    return fail("The request body isn't valid JSON.", 400);
  }
}

/**
 * Turns an unexpected error into a safe response. The real error goes to the
 * server log; the user gets a friendly message (never raw provider text, keys
 * or stack traces).
 */
export function aiFailure(route: string, error: unknown, friendly: string): NextResponse {
  console.error(`[${route}]`, error);
  return NextResponse.json({ error: friendly }, { status: 502 });
}

export const SMALL_BODY = 100_000; // ~100 KB of text fields
export const CV_BODY = 8_000_000; // 5 MB PDF is ~6.7 MB as base64

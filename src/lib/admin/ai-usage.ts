// Records AI calls and errors for the admin pages. Server-only.
// Recording must never break the feature it measures, so every function here
// swallows its own failures.

import { AsyncLocalStorage } from "node:async_hooks";
import { createAdminClient } from "@/lib/supabase/admin";

type AiContext = { feature: string; userId: string | null };
const store = new AsyncLocalStorage<AiContext>();

/** Call right after the guard in an AI route so usage is attributed to the feature and user. */
export function trackAi(feature: string, userId: string | null) {
  store.enterWith({ feature, userId });
}
export function getAiContext(): AiContext {
  return store.getStore() ?? { feature: "unknown", userId: null };
}

function enabled() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function recordError(e: { source: "server" | "client" | "ai" | "sync"; route?: string | null; message: string; userId?: string | null }) {
  if (!enabled()) return;
  try {
    await createAdminClient().from("app_errors").insert({
      source: e.source,
      route: e.route?.slice(0, 200) ?? null,
      message: e.message.slice(0, 500),
      user_id: e.userId ?? null,
    });
  } catch (err) {
    console.error("[errors] couldn't record:", err instanceof Error ? err.message : err);
  }
}

export async function recordAiUsage(u: {
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  durationMs?: number;
  ok: boolean;
  error?: string;
}) {
  if (!enabled()) return;
  const ctx = getAiContext();
  try {
    await createAdminClient().from("ai_usage").insert({
      user_id: ctx.userId,
      feature: ctx.feature,
      model: u.model ?? null,
      input_tokens: Math.max(0, Math.round(u.inputTokens ?? 0)),
      output_tokens: Math.max(0, Math.round(u.outputTokens ?? 0)),
      duration_ms: u.durationMs != null ? Math.round(u.durationMs) : null,
      ok: u.ok,
      error: u.error?.slice(0, 500) ?? null,
    });
    if (!u.ok) await recordError({ source: "ai", route: ctx.feature, message: u.error ?? "AI call failed", userId: ctx.userId });
  } catch (err) {
    console.error("[ai-usage] couldn't record:", err instanceof Error ? err.message : err);
  }
}

/**
 * Rough cost in US dollars. Only works if you tell it your model's prices
 * (per million tokens) in AI_PRICE_INPUT_PER_M and AI_PRICE_OUTPUT_PER_M.
 * Returns null when they aren't set, so the admin page never shows a made-up number.
 */
export function estimateCost(
  inputTokens: number,
  outputTokens: number,
  prices: { input?: string | number | null; output?: string | number | null } = {
    input: process.env.AI_PRICE_INPUT_PER_M,
    output: process.env.AI_PRICE_OUTPUT_PER_M,
  }
): number | null {
  const pin = Number(prices.input);
  const pout = Number(prices.output);
  if (!Number.isFinite(pin) || !Number.isFinite(pout) || prices.input == null || prices.output == null || prices.input === "" || prices.output === "") return null;
  return (inputTokens / 1_000_000) * pin + (outputTokens / 1_000_000) * pout;
}

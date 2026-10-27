// App-wide switches stored in `app_settings`. Reads are cached in memory for a
// short time so hot paths (every AI call, every page load) don't hit the
// database each time. The cache is per server instance; a change reaches all
// instances within CACHE_MS.

import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export type AppSettings = {
  maintenance: { enabled: boolean; message: string };
  signups: { enabled: boolean };
  ai: { enabled: boolean };
  sync: { paused: boolean; pausedSources: string[] };
  banner: { enabled: boolean; text: string; level: "info" | "warning" };
};

export const DEFAULT_SETTINGS: AppSettings = {
  maintenance: { enabled: false, message: "" },
  signups: { enabled: true },
  ai: { enabled: true },
  sync: { paused: false, pausedSources: [] },
  banner: { enabled: false, text: "", level: "info" },
};

export type SettingKey = keyof AppSettings;
export const SETTING_KEYS = Object.keys(DEFAULT_SETTINGS) as SettingKey[];

const CACHE_MS = 30_000;
let cache: { at: number; value: AppSettings } | null = null;

/** Merge stored rows over the defaults, ignoring malformed values. */
export function mergeSettings(rows: { key: string; value: unknown }[]): AppSettings {
  const out: AppSettings = structuredClone(DEFAULT_SETTINGS);
  for (const row of rows) {
    if (!SETTING_KEYS.includes(row.key as SettingKey)) continue;
    if (row.value === null || typeof row.value !== "object" || Array.isArray(row.value)) continue;
    const k = row.key as SettingKey;
    out[k] = { ...DEFAULT_SETTINGS[k], ...(row.value as object) } as never;
  }
  if (!Array.isArray(out.sync.pausedSources)) out.sync.pausedSources = [];
  return out;
}

export function clearSettingsCache() {
  cache = null;
}

/** Cached read. On any failure returns the last good value, else defaults (fail open). */
export async function getSettings(opts: { fresh?: boolean } = {}): Promise<AppSettings> {
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) return DEFAULT_SETTINGS;
  const now = Date.now();
  if (!opts.fresh && cache && now - cache.at < CACHE_MS) return cache.value;
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.from("app_settings").select("key,value");
    if (error) throw error;
    const value = mergeSettings(data ?? []);
    cache = { at: now, value };
    return value;
  } catch (e) {
    console.error("[settings] read failed:", e instanceof Error ? e.message : e);
    return cache?.value ?? DEFAULT_SETTINGS;
  }
}

import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

export const audienceSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("all") }),
  z.object({ type: z.literal("plan"), plans: z.array(z.enum(["free", "pro", "career-agent"])).min(1) }),
  z.object({ type: z.literal("inactive"), days: z.number().int().min(1).max(365) }),
]);
export type Audience = z.infer<typeof audienceSchema>;

export const announcementSchema = z.object({
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(1000),
  audience: audienceSchema,
  priority: z.enum(["normal", "high"]).default("normal"),
  showBanner: z.boolean().default(false),
});

async function pageAll<T>(fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await fetchPage(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

/** The user ids an announcement would reach. */
export async function resolveAudience(admin: SupabaseClient, audience: Audience): Promise<string[]> {
  if (audience.type === "plan") {
    const rows = await pageAll<{ id: string }>((a, b) =>
      admin.from("profiles").select("id").in("plan", audience.plans).order("id").range(a, b)
    );
    return rows.map((r) => r.id);
  }
  const everyone = await pageAll<{ id: string }>((a, b) => admin.from("profiles").select("id").order("id").range(a, b));
  const ids = everyone.map((r) => r.id);
  if (audience.type === "all") return ids;

  const cutoff = new Date(Date.now() - audience.days * 86_400_000).toISOString().slice(0, 10);
  const active = await pageAll<{ user_id: string }>((a, b) =>
    admin.from("user_activity").select("user_id").gte("day", cutoff).order("user_id").range(a, b)
  );
  const activeSet = new Set(active.map((r) => r.user_id));
  return ids.filter((id) => !activeSet.has(id));
}

/** Writes one in-app notification per recipient, in batches. Returns how many were written. */
export async function sendAnnouncement(
  admin: SupabaseClient,
  ids: string[],
  msg: { title: string; body: string; priority: "normal" | "high" }
): Promise<number> {
  let sent = 0;
  for (let i = 0; i < ids.length; i += 500) {
    const rows = ids.slice(i, i + 500).map((user_id) => ({
      user_id,
      type: "announcement",
      priority: msg.priority,
      title: msg.title,
      body: msg.body,
    }));
    const { error } = await admin.from("notifications").insert(rows);
    if (error) throw new Error(`Sent ${sent} of ${ids.length} before failing: ${error.message}`);
    sent += rows.length;
  }
  return sent;
}

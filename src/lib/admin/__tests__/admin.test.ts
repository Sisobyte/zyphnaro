import { describe, it, expect } from "vitest";
import { can, canActOnUser, canManageTeamMember, permissionsFor } from "../roles";
import { mergeSettings, DEFAULT_SETTINGS } from "../settings";
import { audienceSchema, announcementSchema } from "../announce";

describe("roles", () => {
  it("viewer is read-only", () => {
    expect(can("viewer", "view")).toBe(true);
    for (const p of ["user.manage", "announce", "user.delete", "controls", "sources", "team", "audit"] as const) expect(can("viewer", p)).toBe(false);
  });
  it("support helps users but can't delete or change controls", () => {
    expect(can("support", "user.manage")).toBe(true);
    expect(can("support", "announce")).toBe(true);
    expect(can("support", "user.delete")).toBe(false);
    expect(can("support", "controls")).toBe(false);
    expect(can("support", "team")).toBe(false);
  });
  it("owner can do everything; no role can do nothing", () => {
    expect(permissionsFor("owner")).toHaveLength(8);
    expect(can(null, "view")).toBe(false);
    expect(can(undefined, "view")).toBe(false);
  });
  it("nobody acts on themselves or on owners", () => {
    const base = { actorRole: "owner" as const, actorId: "a", permission: "user.delete" as const };
    expect(canActOnUser({ ...base, targetId: "a", targetRole: null }).ok).toBe(false);
    expect(canActOnUser({ ...base, targetId: "b", targetRole: "owner" }).ok).toBe(false);
    expect(canActOnUser({ ...base, targetId: "b", targetRole: "support" }).ok).toBe(true);
    expect(canActOnUser({ ...base, actorRole: "support", targetId: "b", targetRole: null }).ok).toBe(false);
  });
  it("only owners manage the team, never owners or themselves, never mint owners", () => {
    const base = { actorRole: "owner" as const, actorId: "a", targetId: "b", targetRole: null };
    expect(canManageTeamMember(base).ok).toBe(true);
    expect(canManageTeamMember({ ...base, actorRole: "support" }).ok).toBe(false);
    expect(canManageTeamMember({ ...base, targetId: "a" }).ok).toBe(false);
    expect(canManageTeamMember({ ...base, targetRole: "owner" }).ok).toBe(false);
    expect(canManageTeamMember({ ...base, newRole: "owner" }).ok).toBe(false);
  });
});

describe("settings", () => {
  it("falls back to defaults", () => {
    expect(mergeSettings([])).toEqual(DEFAULT_SETTINGS);
  });
  it("merges stored values and ignores junk", () => {
    const s = mergeSettings([
      { key: "ai", value: { enabled: false } },
      { key: "unknown", value: { x: 1 } },
      { key: "signups", value: "bad" },
      { key: "sync", value: { paused: true, pausedSources: "nope" } },
    ]);
    expect(s.ai.enabled).toBe(false);
    expect(s.signups.enabled).toBe(true);
    expect(s.sync.paused).toBe(true);
    expect(s.sync.pausedSources).toEqual([]);
  });
});

describe("announcement validation", () => {
  it("accepts good audiences and rejects bad ones", () => {
    expect(audienceSchema.safeParse({ type: "all" }).success).toBe(true);
    expect(audienceSchema.safeParse({ type: "plan", plans: ["pro"] }).success).toBe(true);
    expect(audienceSchema.safeParse({ type: "plan", plans: [] }).success).toBe(false);
    expect(audienceSchema.safeParse({ type: "plan", plans: ["gold"] }).success).toBe(false);
    expect(audienceSchema.safeParse({ type: "inactive", days: 0 }).success).toBe(false);
  });
  it("requires a title and message", () => {
    expect(announcementSchema.safeParse({ title: " ", body: "x", audience: { type: "all" } }).success).toBe(false);
    expect(announcementSchema.safeParse({ title: "Hi", body: "Hello", audience: { type: "all" } }).success).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { passwordRule } from "./password-policy";
import { safeNextPath } from "./auth-redirect";

describe("passwordRule", () => {
  it.each(["short1", "allletters", "12345678", "a".repeat(73) + "1"])("rejects %s", (p) => {
    expect(passwordRule.safeParse(p).success).toBe(false);
  });
  it.each(["goodpass1", "Zyphnaro2026", "pa55word-ok"])("accepts %s", (p) => {
    expect(passwordRule.safeParse(p).success).toBe(true);
  });
});

describe("safeNextPath", () => {
  it("allows same-site paths", () => {
    expect(safeNextPath("/reset-password")).toBe("/reset-password");
  });
  it.each(["https://evil.com", "//evil.com", "/\\evil.com", "", "reset-password"])("falls back for %s", (v) => {
    expect(safeNextPath(v)).toBe("/onboarding");
  });
});

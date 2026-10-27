import { describe, it, expect } from "vitest";
import { estimateCost } from "../ai-usage";
import { feedbackSchema, feedbackUpdateSchema } from "@/lib/feedback";

describe("estimateCost", () => {
  it("returns null when prices aren't set", () => {
    expect(estimateCost(1000, 1000, { input: undefined, output: undefined })).toBeNull();
    expect(estimateCost(1000, 1000, { input: "", output: "" })).toBeNull();
    expect(estimateCost(1000, 1000, { input: "abc", output: "1" })).toBeNull();
  });
  it("calculates from per-million prices", () => {
    expect(estimateCost(1_000_000, 500_000, { input: "0.3", output: "2.5" })).toBeCloseTo(1.55, 5);
    expect(estimateCost(0, 0, { input: 1, output: 1 })).toBe(0);
  });
});

describe("feedback validation", () => {
  it("accepts a normal message", () => {
    expect(feedbackSchema.safeParse({ category: "bug", message: "The button does nothing" }).success).toBe(true);
  });
  it("rejects empty, tiny, huge and unknown-category messages", () => {
    expect(feedbackSchema.safeParse({ category: "bug", message: "  " }).success).toBe(false);
    expect(feedbackSchema.safeParse({ category: "bug", message: "a".repeat(2001) }).success).toBe(false);
    expect(feedbackSchema.safeParse({ category: "spam", message: "hello there" }).success).toBe(false);
  });
  it("update needs a valid id and status", () => {
    expect(feedbackUpdateSchema.safeParse({ id: "nope", status: "read" }).success).toBe(false);
    expect(feedbackUpdateSchema.safeParse({ id: "7b0c9a4e-2c3d-4f55-9a77-0a1b2c3d4e5f", status: "done" }).success).toBe(false);
    expect(feedbackUpdateSchema.safeParse({ id: "7b0c9a4e-2c3d-4f55-9a77-0a1b2c3d4e5f", status: "resolved" }).success).toBe(true);
  });
});

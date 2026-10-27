import { z } from "zod";

export const FEEDBACK_CATEGORIES = ["bug", "idea", "praise", "other"] as const;
export const FEEDBACK_STATUSES = ["new", "read", "resolved"] as const;

export const feedbackSchema = z.object({
  category: z.enum(FEEDBACK_CATEGORIES),
  message: z.string().trim().min(3, "Please write a few words.").max(2000),
  page: z.string().trim().max(200).optional(),
});

export const feedbackUpdateSchema = z.object({
  id: z.uuid(),
  status: z.enum(FEEDBACK_STATUSES).optional(),
  note: z.string().trim().max(1000).optional(),
});

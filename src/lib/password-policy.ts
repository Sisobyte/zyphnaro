import { z } from "zod";

// One password rule for signup, reset and change-password, so a password that
// is accepted in one place is never rejected in another.
export const passwordRule = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(72, "Use 72 characters or fewer")
  .regex(/[A-Za-z]/, "Include at least one letter")
  .regex(/\d/, "Include at least one number");

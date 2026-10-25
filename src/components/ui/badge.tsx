import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        neutral: "bg-z-surface text-z-ink-soft border border-z-border",
        brand: "bg-z-brand-50 text-z-brand-600",
        success: "bg-z-success-bg text-z-success",
        warning: "bg-z-warning-bg text-z-warning",
        danger: "bg-z-danger-bg text-z-danger",
        teal: "bg-z-teal-bg text-z-teal",
        violet: "bg-z-violet-bg text-z-violet",
        outline: "border border-z-border-strong text-z-ink-soft",
      },
    },
    defaultVariants: { variant: "neutral" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

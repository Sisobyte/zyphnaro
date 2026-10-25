import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-z-brand focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        primary: "bg-z-brand text-white hover:bg-z-brand-600 shadow-sm",
        secondary: "bg-white text-z-ink border border-z-border-strong hover:bg-z-surface shadow-sm",
        ghost: "text-z-ink-soft hover:bg-z-surface hover:text-z-ink",
        outline: "border border-z-border-strong text-z-ink hover:bg-z-surface",
        danger: "bg-z-danger text-white hover:opacity-90",
        subtle: "bg-z-brand-50 text-z-brand-600 hover:bg-z-brand-50/80",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-9 px-4",
        lg: "h-11 px-5 text-[15px]",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export { buttonVariants };

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  )
);
Button.displayName = "Button";

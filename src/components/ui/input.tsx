import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-9 w-full rounded-lg border border-z-border-strong bg-white px-3 text-sm text-z-ink placeholder:text-z-ink-faint focus:outline-none focus:ring-2 focus:ring-z-brand/40 focus:border-z-brand",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

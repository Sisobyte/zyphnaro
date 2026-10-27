"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// A password field with an eye button that shows or hides what was typed.
// It forwards its ref, so it works with react-hook-form's register().
export const PasswordInput = React.forwardRef<HTMLInputElement, Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & { leftIcon?: React.ReactNode }>(
  ({ className, leftIcon, ...props }, ref) => {
    const [visible, setVisible] = React.useState(false);
    return (
      <div className="relative">
        {leftIcon && <span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-z-ink-faint">{leftIcon}</span>}
        <Input ref={ref} type={visible ? "text" : "password"} className={cn("pr-10", className)} {...props} />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-z-ink-faint hover:bg-z-surface hover:text-z-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-z-brand"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    );
  }
);
PasswordInput.displayName = "PasswordInput";

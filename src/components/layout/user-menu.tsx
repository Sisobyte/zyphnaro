"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { clearMockSession } from "@/lib/mock-session";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";

export function UserMenu({
  trigger,
  align = "start",
  dark = false,
  placement = "up",
}: {
  trigger: React.ReactNode;
  align?: "start" | "end";
  dark?: boolean;
  placement?: "up" | "down";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const logout = async () => {
    setOpen(false);
    if (isSupabaseConfigured) {
      // BACKEND INTEGRATION: real sign-out, clears the session cookie.
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
      return;
    }
    clearMockSession();
    router.push("/login");
  };

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} className="block w-full text-left">
        {trigger}
      </button>
      {open && (
        <div
          className={cn(
            "absolute z-40 w-48 rounded-lg border border-z-border bg-white p-1.5 shadow-lg",
            placement === "up" ? "bottom-full mb-2" : "top-full mt-2",
            align === "end" ? "right-0" : "left-0",
            dark && "border-z-navy-700 bg-z-navy-800"
          )}
        >
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-2 rounded-md px-2.5 py-2 text-sm",
              dark ? "text-z-slate-300 hover:bg-z-navy-700 hover:text-white" : "text-z-ink-soft hover:bg-z-surface hover:text-z-ink"
            )}
          >
            <User className="h-4 w-4" /> View profile
          </Link>
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-2 rounded-md px-2.5 py-2 text-sm",
              dark ? "text-z-slate-300 hover:bg-z-navy-700 hover:text-white" : "text-z-ink-soft hover:bg-z-surface hover:text-z-ink"
            )}
          >
            <Settings className="h-4 w-4" /> Settings
          </Link>
          <div className={cn("my-1 h-px", dark ? "bg-z-navy-700" : "bg-z-border")} />
          <button
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-z-danger hover:bg-z-danger-bg"
          >
            <LogOut className="h-4 w-4" /> Log out
          </button>
        </div>
      )}
    </div>
  );
}

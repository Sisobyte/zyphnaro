"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User, Settings, LogOut, ShieldCheck, MessageSquare } from "lucide-react";
import { FeedbackDialog } from "@/components/feedback/feedback-dialog";
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
  const [isAdmin, setIsAdmin] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  // Only admins see the Admin link. The server decides; this just asks once.
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;
    fetch("/api/admin/me")
      .then((r) => r.json())
      .then((d: { admin?: boolean }) => { if (!cancelled && d.admin) setIsAdmin(true); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

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
          {isSupabaseConfigured && (
            <button
              onClick={() => { setOpen(false); setFeedbackOpen(true); }}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm",
                dark ? "text-z-slate-300 hover:bg-z-navy-700 hover:text-white" : "text-z-ink-soft hover:bg-z-surface hover:text-z-ink"
              )}
            >
              <MessageSquare className="h-4 w-4" /> Send feedback
            </button>
          )}
          {isAdmin && (
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-2 rounded-md px-2.5 py-2 text-sm",
                dark ? "text-z-slate-300 hover:bg-z-navy-700 hover:text-white" : "text-z-ink-soft hover:bg-z-surface hover:text-z-ink"
              )}
            >
              <ShieldCheck className="h-4 w-4" /> Admin
            </Link>
          )}
          <div className={cn("my-1 h-px", dark ? "bg-z-navy-700" : "bg-z-border")} />
          <button
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-z-danger hover:bg-z-danger-bg"
          >
            <LogOut className="h-4 w-4" /> Log out
          </button>
        </div>
      )}
      <FeedbackDialog open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </div>
  );
}

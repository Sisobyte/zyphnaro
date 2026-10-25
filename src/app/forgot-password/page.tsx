"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { Mail, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/components/auth/auth-shell";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";
import { resetCodeEnabled } from "@/lib/auth-flags";

const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ForgotPasswordInner />
    </Suspense>
  );
}

function ForgotPasswordInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const expired = params.get("error") === "link-expired";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const value = email.trim();
    if (!EMAIL_OK.test(value)) {
      setError("Enter a valid email address.");
      return;
    }
    setBusy(true);
    if (isSupabaseConfigured) {
      const { error: err } = await createClient().auth.resetPasswordForEmail(value, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });
      // Only real failures (rate limit, network) are shown. Whether the address
      // has an account is never revealed.
      if (err && (err.status === 429 || /rate|limit|fetch|network/i.test(err.message))) {
        setBusy(false);
        setError(
          err.status === 429 || /rate|limit/i.test(err.message)
            ? "Too many reset emails requested. Please wait a few minutes and try again."
            : "Couldn't reach the server. Check your connection and try again."
        );
        return;
      }
    }
    setBusy(false);
    router.push(`/verify-code?email=${encodeURIComponent(value)}`);
  };

  return (
    <AuthShell
      title="Forgot your password?"
      subtitle={
        resetCodeEnabled
          ? "Enter your email and we'll send you a code and a reset link."
          : "Enter your email and we'll send you a link to reset it."
      }
      footer={
        <>
          Remembered it?{" "}
          <Link href="/login" className="font-medium text-z-brand hover:underline">
            Back to sign in
          </Link>
        </>
      }
    >
      {!isSupabaseConfigured && (
        <p className="mb-4 rounded-lg bg-z-warning-bg px-3 py-2 text-xs text-z-warning">
          Mock mode: no email is sent. Connect Supabase to test the real flow.
        </p>
      )}
      {expired && (
        <p className="mb-4 rounded-lg bg-z-danger-bg px-3 py-2 text-xs text-z-danger">
          That reset link is invalid or has expired. Request a new one below.
        </p>
      )}
      <form onSubmit={submit} className="flex flex-col gap-3.5" noValidate>
        <div>
          <label htmlFor="fp-email" className="mb-1 block text-xs font-medium text-z-ink-soft">
            Email
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-z-ink-faint" />
            <Input
              id="fp-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              className="pl-9"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>
        {error && <p className="rounded-lg bg-z-danger-bg px-3 py-2 text-xs text-z-danger">{error}</p>}
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Sending…" : (resetCodeEnabled ? "Send reset code" : "Send reset link")} <ArrowRight className="h-4 w-4" />
        </Button>
      </form>
    </AuthShell>
  );
}

"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { KeyRound, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/components/auth/auth-shell";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";
import { resetCodeEnabled } from "@/lib/auth-flags";

const RESEND_SECONDS = 60;

export default function VerifyCodePage() {
  return (
    <Suspense fallback={null}>
      <VerifyCodeInner />
    </Suspense>
  );
}

function VerifyCodeInner() {
  const router = useRouter();
  const email = useSearchParams().get("email") ?? "";
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [wait, setWait] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^\d{6,8}$/.test(code)) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    if (!isSupabaseConfigured) {
      router.push("/reset-password");
      return;
    }
    setBusy(true);
    const { error: err } = await createClient().auth.verifyOtp({ email, token: code, type: "recovery" });
    setBusy(false);
    if (err) {
      setError("That code is wrong or has expired. Check it and try again, or request a new one.");
      return;
    }
    router.push("/reset-password");
  };

  const resend = async () => {
    setError(null);
    setInfo(null);
    if (isSupabaseConfigured) {
      const { error: err } = await createClient().auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });
      if (err) {
        setError("Couldn't send another email right now. Please wait a few minutes and try again.");
        return;
      }
    }
    setInfo((resetCodeEnabled ? "If that address has an account, a new code is on its way." : "If that address has an account, a new link is on its way."));
    setWait(RESEND_SECONDS);
  };

  if (!email) {
    return (
      <AuthShell title="Start from your email" subtitle="We need your email address to send a code.">
        <Link href="/forgot-password" className="text-sm font-medium text-z-brand hover:underline">
          Go to forgot password
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Check your email"
      subtitle={
        resetCodeEnabled
          ? `If an account exists for ${email}, we've sent a code and a reset link.`
          : `If an account exists for ${email}, we've sent a reset link. Click it to choose a new password.`
      }
      footer={
        <>
          Wrong email?{" "}
          <Link href="/forgot-password" className="font-medium text-z-brand hover:underline">
            Change it
          </Link>
        </>
      }
    >
      <form onSubmit={verify} className="flex flex-col gap-3.5" noValidate>
        {resetCodeEnabled && (
        <div>
          <label htmlFor="otp" className="mb-1 block text-xs font-medium text-z-ink-soft">
            Code from the email
          </label>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-z-ink-faint" />
            <Input
              id="otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={8}
              placeholder="123456"
              className="pl-9 tracking-[0.3em]"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            />
          </div>
          <p className="mt-1 text-xs text-z-ink-faint">Or just click the link in the email. Either works.</p>
        </div>
        )}
        {error && <p className="rounded-lg bg-z-danger-bg px-3 py-2 text-xs text-z-danger">{error}</p>}
        {info && <p className="rounded-lg bg-z-success-bg px-3 py-2 text-xs text-z-success">{info}</p>}
        {resetCodeEnabled ? (
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "Checking…" : "Verify code"} <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <p className="rounded-lg bg-z-surface px-3 py-2 text-xs text-z-ink-soft">
            Open the email on this device and click the link. It can take a minute, so check spam too.
          </p>
        )}
        <button
          type="button"
          onClick={resend}
          disabled={wait > 0}
          className="text-center text-xs font-medium text-z-brand hover:underline disabled:cursor-not-allowed disabled:text-z-ink-faint disabled:no-underline"
        >
          {wait > 0 ? `Send again in ${wait}s` : resetCodeEnabled ? "Send a new code" : "Send the link again"}
        </button>
      </form>
    </AuthShell>
  );
}

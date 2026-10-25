"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Lock, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/components/auth/auth-shell";
import { passwordRule } from "@/lib/password-policy";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";

const schema = z
  .object({ password: passwordRule, confirm: z.string() })
  .refine((d) => d.password === d.confirm, { message: "Passwords don't match", path: ["confirm"] });
type Values = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState<"checking" | "yes" | "no">(isSupabaseConfigured ? "checking" : "yes");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  // A reset session exists only after the emailed link or code was used.
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    createClient()
      .auth.getSession()
      .then(({ data }) => setReady(data.session ? "yes" : "no"));
  }, []);

  const submit = handleSubmit(async (v) => {
    setError(null);
    setBusy(true);
    if (isSupabaseConfigured) {
      const { error: err } = await createClient().auth.updateUser({ password: v.password });
      if (err) {
        setBusy(false);
        setError(
          /same|different/i.test(err.message)
            ? "Choose a password you haven't used before."
            : "Couldn't update your password. Request a new reset link and try again."
        );
        return;
      }
    }
    setBusy(false);
    setDone(true);
    setTimeout(() => {
      router.push("/dashboard");
      router.refresh();
    }, 1500);
  });

  if (ready === "checking") return <AuthShell title="One moment…">{null}</AuthShell>;

  if (ready === "no") {
    return (
      <AuthShell title="Reset link needed" subtitle="This page opens from the link or code in your reset email.">
        <Link href="/forgot-password" className="text-sm font-medium text-z-brand hover:underline">
          Request a new reset email
        </Link>
      </AuthShell>
    );
  }

  if (done) {
    return (
      <AuthShell title="Password updated" subtitle="Taking you to your dashboard…">
        <p className="flex items-center gap-2 text-sm text-z-success">
          <CheckCircle2 className="h-4 w-4" /> You&apos;re signed in with your new password.
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Choose a new password" subtitle="At least 8 characters, with a letter and a number.">
      <form onSubmit={submit} className="flex flex-col gap-3.5" noValidate>
        {(["password", "confirm"] as const).map((name) => (
          <div key={name}>
            <label htmlFor={name} className="mb-1 block text-xs font-medium text-z-ink-soft">
              {name === "password" ? "New password" : "Confirm new password"}
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-z-ink-faint" />
              <Input id={name} type="password" autoComplete="new-password" className="pl-9" {...register(name)} />
            </div>
            {errors[name] && <p className="mt-1 text-xs text-z-danger">{errors[name]?.message}</p>}
          </div>
        ))}
        {error && <p className="rounded-lg bg-z-danger-bg px-3 py-2 text-xs text-z-danger">{error}</p>}
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Saving…" : "Update password"}
        </Button>
      </form>
    </AuthShell>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { passwordRule } from "@/lib/password-policy";
import { Mail, Lock, User, ArrowRight, MailCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/components/auth/auth-shell";
import { setMockSession } from "@/lib/mock-session";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";

const schema = z
  .object({
    name: z.string().min(2, "Enter your full name"),
    email: z.string().min(1, "Email is required").email("Enter a valid email address"),
    password: passwordRule,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);
  const [closed, setClosed] = useState(false);

  // An admin can close registration (Admin → Controls).
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    fetch("/api/public-settings")
      .then((r) => r.json())
      .then((d: { signupsEnabled?: boolean }) => setClosed(d.signupsEnabled === false))
      .catch(() => {});
  }, []);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    if (closed) {
      setFormError("Sign-ups are closed right now. Please check back soon.");
      return;
    }
    setLoading(true);

    if (isSupabaseConfigured) {
      // Real auth. The `handle_new_user` trigger (see the SQL migration in
      // /docs/backend-integration.md) creates the matching `profiles` row
      // from this metadata automatically.
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: { name: values.name },
          // Tells Supabase to send the confirmation link to our own
          // callback route (see src/app/auth/callback/route.ts) instead
          // of just redirecting to the bare Site URL with no session
          // exchange happening.
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      setLoading(false);
      if (error) {
        setFormError(error.message);
        return;
      }
      if (!data.session) {
        // Email confirmation is required before a session exists.
        setCheckEmail(true);
        return;
      }
      router.push("/onboarding");
      router.refresh();
      return;
    }

    // MOCK MODE: no Supabase configured yet.
    await new Promise((r) => setTimeout(r, 500));
    setMockSession(values.email);
    sessionStorage.setItem("zyphnaro-onboarding-name", values.name);
    sessionStorage.setItem("zyphnaro-onboarding-email", values.email);
    setLoading(false);
    router.push("/onboarding");
  });

  if (checkEmail) {
    return (
      <AuthShell title="Check your email" subtitle="We sent you a confirmation link to finish creating your account.">
        <div className="flex flex-col items-center gap-3 rounded-lg border border-z-border bg-z-surface p-6 text-center">
          <MailCheck className="h-8 w-8 text-z-brand" />
          <p className="text-sm text-z-ink-soft">
            Click the link in the email we sent you, then come back and sign in.
          </p>
          <Link href="/login" className="text-sm font-medium text-z-brand hover:underline">
            Back to sign in
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start building your personal career intelligence system."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-z-brand hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      {!isSupabaseConfigured && (
        <p className="mb-4 rounded-lg bg-z-warning-bg px-3 py-2 text-xs text-z-warning">
          Running in mock mode — no Supabase project connected yet. This creates a local demo session only.
        </p>
      )}

      <form onSubmit={onSubmit} className="flex flex-col gap-3.5">
        <div>
          <label className="mb-1 block text-xs font-medium text-z-ink-soft">Full name</label>
          <div className="relative">
            <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-z-ink-faint" />
            <Input placeholder="Your full name" className="pl-9" {...register("name")} />
          </div>
          {errors.name && <p className="mt-1 text-xs text-z-danger">{errors.name.message}</p>}
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-z-ink-soft">Email</label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-z-ink-faint" />
            <Input type="email" placeholder="you@example.com" className="pl-9" {...register("email")} />
          </div>
          {errors.email && <p className="mt-1 text-xs text-z-danger">{errors.email.message}</p>}
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-z-ink-soft">Password</label>
          <PasswordInput leftIcon={<Lock className="h-4 w-4" />} placeholder="••••••••" className="pl-9" {...register("password")} />
          {errors.password && <p className="mt-1 text-xs text-z-danger">{errors.password.message}</p>}
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-z-ink-soft">Confirm password</label>
          <PasswordInput leftIcon={<Lock className="h-4 w-4" />} placeholder="••••••••" className="pl-9" {...register("confirmPassword")} />
          {errors.confirmPassword && <p className="mt-1 text-xs text-z-danger">{errors.confirmPassword.message}</p>}
        </div>

        {formError && <p className="rounded-lg bg-z-danger-bg px-3 py-2 text-xs text-z-danger">{formError}</p>}

        <Button type="submit" disabled={loading} className="mt-1 w-full">
          {loading ? "Creating account…" : "Create account"} <ArrowRight className="h-4 w-4" />
        </Button>
      </form>

      <p className="mt-5 text-center text-xs text-z-ink-faint">
        By creating an account you agree to Zyphnaro&apos;s Terms and Privacy Policy.
      </p>
    </AuthShell>
  );
}

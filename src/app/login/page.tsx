"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/components/auth/auth-shell";
import { setMockSession } from "@/lib/mock-session";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";

const schema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    setLoading(true);

    if (isSupabaseConfigured) {
      // Real auth: Supabase issues a session cookie, proxy.ts takes it
      // from here. See /docs/backend-integration.md
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });
      setLoading(false);
      if (error) {
        setFormError(error.message);
        return;
      }
      router.push("/dashboard");
      router.refresh();
      return;
    }

    // MOCK MODE: no Supabase configured yet — simulate a session so the
    // rest of the app (logout menu, etc.) has something to work with.
    await new Promise((r) => setTimeout(r, 500));
    setMockSession(values.email);
    setLoading(false);
    router.push("/dashboard");
  });

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your Zyphnaro account."
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-z-brand hover:underline">
            Create one
          </Link>
        </>
      }
    >
      {!isSupabaseConfigured && (
        <p className="mb-4 rounded-lg bg-z-warning-bg px-3 py-2 text-xs text-z-warning">
          Running in mock mode — no Supabase project connected yet. Any email/password will work.
        </p>
      )}

      <form onSubmit={onSubmit} className="flex flex-col gap-3.5">
        <div>
          <label className="mb-1 block text-xs font-medium text-z-ink-soft">Email</label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-z-ink-faint" />
            <Input type="email" placeholder="you@example.com" className="pl-9" {...register("email")} />
          </div>
          {errors.email && <p className="mt-1 text-xs text-z-danger">{errors.email.message}</p>}
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="block text-xs font-medium text-z-ink-soft">Password</label>
            <Link href="/forgot-password" className="text-xs font-medium text-z-brand hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-z-ink-faint" />
            <Input type="password" placeholder="••••••••" className="pl-9" {...register("password")} />
          </div>
          {errors.password && <p className="mt-1 text-xs text-z-danger">{errors.password.message}</p>}
        </div>

        {formError && <p className="rounded-lg bg-z-danger-bg px-3 py-2 text-xs text-z-danger">{formError}</p>}

        <Button type="submit" disabled={loading} className="mt-1 w-full">
          {loading ? "Signing in…" : "Sign in"} <ArrowRight className="h-4 w-4" />
        </Button>
      </form>

      {!isSupabaseConfigured && (
        <>
          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-z-border" />
            <span className="text-xs text-z-ink-faint">or</span>
            <span className="h-px flex-1 bg-z-border" />
          </div>

          <button
            onClick={() => {
              setMockSession("demo-user");
              router.push("/dashboard");
            }}
            className="w-full rounded-lg border border-dashed border-z-border-strong px-3 py-2.5 text-center text-xs font-medium text-z-ink-faint hover:bg-z-surface"
          >
            Skip sign-in and view the demo dashboard →
          </button>
        </>
      )}
    </AuthShell>
  );
}

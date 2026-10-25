"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { passwordRule } from "@/lib/password-policy";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export function ChangePassword() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setDone(false);
    const rule = passwordRule.safeParse(next);
    if (!rule.success) return setError(rule.error.issues[0].message + ".");
    if (next !== confirm) return setError("The new passwords don't match.");
    if (next === current) return setError("Choose a password different from your current one.");

    setBusy(true);
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    const email = data.user?.email;
    if (!email) {
      setBusy(false);
      return setError("Please sign in again and retry.");
    }
    // Prove it's really the account owner before changing anything.
    const check = await supabase.auth.signInWithPassword({ email, password: current });
    if (check.error) {
      setBusy(false);
      return setError("Your current password is incorrect.");
    }
    const { error: err } = await supabase.auth.updateUser({ password: next });
    setBusy(false);
    if (err) return setError("Couldn't update your password. Please try again.");
    setCurrent("");
    setNext("");
    setConfirm("");
    setDone(true);
  };

  return (
    <Card>
      <CardHeader className="flex-col items-start gap-0.5">
        <CardTitle className="inline-flex items-center gap-1.5">
          <KeyRound className="h-4 w-4 text-z-brand" /> Password
        </CardTitle>
        <CardDescription>Change the password you sign in with.</CardDescription>
      </CardHeader>
      <CardContent>
        {!isSupabaseConfigured ? (
          <p className="text-sm text-z-ink-faint">Password changes are available once your account is connected.</p>
        ) : (
          <form onSubmit={submit} className="flex max-w-sm flex-col gap-3" noValidate>
            <Input type="password" autoComplete="current-password" placeholder="Current password" value={current} onChange={(e) => setCurrent(e.target.value)} />
            <Input type="password" autoComplete="new-password" placeholder="New password (8+ characters, a letter and a number)" value={next} onChange={(e) => setNext(e.target.value)} />
            <Input type="password" autoComplete="new-password" placeholder="Confirm new password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            {error && <p className="rounded-lg bg-z-danger-bg px-3 py-2 text-xs text-z-danger">{error}</p>}
            {done && <p className="rounded-lg bg-z-success-bg px-3 py-2 text-xs text-z-success">Password updated.</p>}
            <Button type="submit" disabled={busy || !current || !next || !confirm} className="w-fit">
              {busy ? "Updating…" : "Update password"}
            </Button>
            <p className="text-xs text-z-ink-faint">
              Forgot your current one? Sign out and use &ldquo;Forgot password?&rdquo; on the sign-in page.
            </p>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

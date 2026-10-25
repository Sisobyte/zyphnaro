"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { clearMockSession } from "@/lib/mock-session";

export function DeleteAccount() {
  const router = useRouter();
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const destroy = async () => {
    setBusy(true);
    setError(null);
    try {
      if (isSupabaseConfigured) {
        const res = await fetch("/api/account/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirm }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "Couldn't delete your account.");
        await createClient().auth.signOut({ scope: "local" });
      } else {
        clearMockSession();
      }
      client.clear();
      router.replace("/");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't delete your account.");
      setBusy(false);
    }
  };

  return (
    <Card className="border-z-danger/30">
      <CardHeader className="flex-col items-start gap-0.5">
        <CardTitle className="inline-flex items-center gap-1.5 text-z-danger">
          <Trash2 className="h-4 w-4" /> Delete account
        </CardTitle>
        <CardDescription>
          Permanently deletes your profile, CV, saved jobs, applications, tailored CVs, saved interviews and notifications. This can&apos;t be undone.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {!open ? (
          <Button variant="secondary" size="sm" className="w-fit text-z-danger" onClick={() => setOpen(true)}>
            Delete my account
          </Button>
        ) : (
          <>
            <label className="text-xs text-z-ink-soft" htmlFor="delete-confirm">
              Type <span className="font-semibold">DELETE</span> to confirm
            </label>
            <Input id="delete-confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" disabled={busy} />
            {error && <p className="rounded-lg bg-z-danger-bg px-3 py-2 text-xs text-z-danger">{error}</p>}
            <div className="flex gap-2">
              <Button
                size="sm"
                className="bg-z-danger text-white hover:bg-z-danger/90"
                disabled={confirm !== "DELETE" || busy}
                onClick={destroy}
              >
                {busy ? "Deleting…" : "Permanently delete"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => {
                  setOpen(false);
                  setConfirm("");
                  setError(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

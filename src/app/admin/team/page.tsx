"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, Copy } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { adminFetch, formatDate } from "@/lib/admin/client";
import { ROLE_DESCRIPTION, ROLE_LABEL, type AdminRole } from "@/lib/admin/roles";
import { useAdmin } from "@/components/admin/admin-context";
import { PageTitle, ErrorNote } from "@/components/admin/ui";

type Member = { userId: string; role: AdminRole; email: string | null; createdAt: string };

export default function TeamPage() {
  const admin = useAdmin();
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"support" | "viewer">("support");
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);

  const { data, error } = useQuery({ queryKey: ["admin", "team"], queryFn: () => adminFetch<{ members: Member[] }>("/api/admin/team") });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "team"] });

  const add = useMutation({
    mutationFn: () => adminFetch<{ email: string; tempPassword: string | null }>("/api/admin/team", { method: "POST", body: JSON.stringify({ email, role }) }),
    onSuccess: (d) => { setEmail(""); setCreated(d.tempPassword ? { email: d.email, password: d.tempPassword } : null); refresh(); },
  });
  const change = useMutation({
    mutationFn: (b: { userId: string; role?: "support" | "viewer"; remove?: boolean }) => adminFetch("/api/admin/team", { method: "PATCH", body: JSON.stringify(b) }),
    onSuccess: refresh,
  });

  return (
    <>
      <PageTitle title="Team" subtitle="Give teammates access to this area. Owners are created in the database, not here." />
      <ErrorNote error={error ?? add.error ?? change.error} />

      <Card className="mb-6">
        <CardHeader><CardTitle>Add a teammate</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@company.com" />
            <Select value={role} onChange={(e) => setRole(e.target.value as "support" | "viewer")} className="sm:w-40">
              <option value="support">Support</option>
              <option value="viewer">Viewer</option>
            </Select>
            <Button disabled={!email.includes("@") || add.isPending} onClick={() => { setCreated(null); add.mutate(); }}>{add.isPending ? "Adding…" : "Add"}</Button>
          </div>
          <p className="text-xs text-z-ink-faint">
            If they already have an account they get the role straight away. If not, an account is created with a temporary password shown once. No email is sent yet, so pass it on yourself and ask them to change it in Settings.
          </p>
          {created && (
            <div className="rounded-lg border border-z-warning/30 bg-z-warning-bg p-3 text-sm">
              <p className="font-medium text-z-ink">Account created for {created.email}</p>
              <p className="mt-1 text-xs text-z-ink-soft">Temporary password (shown only now):</p>
              <div className="mt-1 flex items-center gap-2">
                <code className="break-all rounded bg-white px-2 py-1 text-xs">{created.password}</code>
                <Button variant="secondary" size="sm" onClick={() => navigator.clipboard?.writeText(created.password)}><Copy className="h-3.5 w-3.5" /> Copy</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-2">
        {data?.members.map((m) => {
          const mine = m.userId === admin.id;
          const locked = mine || m.role === "owner";
          return (
            <Card key={m.userId} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-z-ink">{m.email ?? m.userId}{mine && <span className="ml-2 text-xs text-z-ink-faint">(you)</span>}</p>
                <p className="text-xs text-z-ink-faint">Added {formatDate(m.createdAt)} · {ROLE_DESCRIPTION[m.role]}</p>
              </div>
              {locked ? (
                <Badge variant="violet">{ROLE_LABEL[m.role]}</Badge>
              ) : (
                <div className="flex items-center gap-2">
                  <Select value={m.role} disabled={change.isPending} onChange={(e) => change.mutate({ userId: m.userId, role: e.target.value as "support" | "viewer" })} className="w-32">
                    <option value="support">Support</option>
                    <option value="viewer">Viewer</option>
                  </Select>
                  <Button variant="ghost" size="icon" aria-label="Remove from team" onClick={() => window.confirm(`Remove ${m.email} from the team? Their account stays.`) && change.mutate({ userId: m.userId, remove: true })}>
                    <Trash2 className="h-4 w-4 text-z-danger" />
                  </Button>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}

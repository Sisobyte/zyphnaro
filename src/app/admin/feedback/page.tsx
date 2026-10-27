"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { adminFetch, formatDateTime } from "@/lib/admin/client";
import { useAdmin } from "@/components/admin/admin-context";
import { PageTitle, ErrorNote, Empty } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

type Item = { id: string; email: string | null; category: string; message: string; page: string | null; status: "new" | "read" | "resolved"; admin_note: string | null; created_at: string };
type Data = { items: Item[]; counts: Record<string, number> };
const CAT: Record<string, "danger" | "brand" | "success" | "neutral"> = { bug: "danger", idea: "brand", praise: "success", other: "neutral" };
const TABS = [["", "All"], ["new", "New"], ["read", "Read"], ["resolved", "Resolved"]] as const;

export default function FeedbackPage() {
  const admin = useAdmin();
  const qc = useQueryClient();
  const [status, setStatus] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const canEdit = admin.can("user.manage");
  const { data, error } = useQuery({ queryKey: ["admin", "feedback", status], queryFn: () => adminFetch<Data>(`/api/admin/feedback?status=${status}`) });
  const save = useMutation({
    mutationFn: (b: { id: string; status?: string; note?: string }) => adminFetch("/api/admin/feedback", { method: "PATCH", body: JSON.stringify(b) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "feedback"] }),
  });

  return (
    <>
      <PageTitle title="Feedback" subtitle="What users have sent from the app's “Send feedback” button." />
      <div className="z-scroll-light mb-4 flex gap-1.5 overflow-x-auto">
        {TABS.map(([k, label]) => (
          <button key={k} onClick={() => setStatus(k)} className={cn("shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium", status === k ? "border-z-brand bg-z-brand-50 text-z-brand-600" : "border-z-border-strong bg-white text-z-ink-soft")}>
            {label}{k && data ? ` (${data.counts[k] ?? 0})` : ""}
          </button>
        ))}
      </div>
      <ErrorNote error={error ?? save.error} />
      {data?.items.length === 0 && <Empty>No feedback here yet.</Empty>}
      <div className="space-y-3">
        {data?.items.map((f) => (
          <Card key={f.id} className={cn("p-4", f.status === "new" && "border-z-brand/40")}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-2"><Badge variant={CAT[f.category] ?? "neutral"}>{f.category}</Badge>{f.status === "new" && <Badge variant="brand">New</Badge>}{f.status === "resolved" && <Badge variant="success">Resolved</Badge>}</span>
              <span className="text-xs text-z-ink-faint">{formatDateTime(f.created_at)}</span>
            </div>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm text-z-ink">{f.message}</p>
            <p className="mt-2 break-all text-xs text-z-ink-faint">{f.email ?? "unknown"}{f.page ? ` · from ${f.page}` : ""}</p>
            {canEdit && (
              <div className="mt-3 space-y-2">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input placeholder="Private note for the team" value={notes[f.id] ?? f.admin_note ?? ""} onChange={(e) => setNotes((n) => ({ ...n, [f.id]: e.target.value }))} maxLength={1000} />
                  <Button variant="secondary" size="sm" className="h-9" disabled={save.isPending || (notes[f.id] ?? f.admin_note ?? "") === (f.admin_note ?? "")} onClick={() => save.mutate({ id: f.id, note: notes[f.id] ?? "" })}>Save note</Button>
                </div>
                <div className="flex gap-2">
                  {f.status !== "read" && <Button variant="secondary" size="sm" disabled={save.isPending} onClick={() => save.mutate({ id: f.id, status: "read" })}>Mark read</Button>}
                  {f.status !== "resolved" && <Button size="sm" disabled={save.isPending} onClick={() => save.mutate({ id: f.id, status: "resolved" })}>Resolve</Button>}
                  {f.status !== "new" && <Button variant="ghost" size="sm" disabled={save.isPending} onClick={() => save.mutate({ id: f.id, status: "new" })}>Reopen</Button>}
                </div>
              </div>
            )}
            {!canEdit && f.admin_note && <p className="mt-2 text-xs text-z-ink-soft">Note: {f.admin_note}</p>}
          </Card>
        ))}
      </div>
    </>
  );
}

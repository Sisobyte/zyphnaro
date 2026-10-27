"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { adminFetch, formatDateTime } from "@/lib/admin/client";
import { useAdmin } from "@/components/admin/admin-context";
import { PageTitle, ErrorNote, Empty } from "@/components/admin/ui";

type Row = { id: string; title: string; body: string; audience: { type: string; plans?: string[]; days?: number }; priority: string; recipients: number; created_by_email: string | null; created_at: string };

const audienceText = (a: Row["audience"]) =>
  a.type === "all" ? "Everyone" : a.type === "plan" ? `Plans: ${a.plans?.join(", ")}` : `Inactive ${a.days}+ days`;

export default function AnnouncementsPage() {
  const admin = useAdmin();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [aud, setAud] = useState<"all" | "free" | "pro" | "career-agent" | "inactive">("all");
  const [days, setDays] = useState(14);
  const [high, setHigh] = useState(false);
  const [banner, setBanner] = useState(false);
  const [reach, setReach] = useState<number | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const history = useQuery({ queryKey: ["admin", "announcements"], queryFn: () => adminFetch<{ announcements: Row[] }>("/api/admin/announcements") });

  const payload = () => ({
    title, body, priority: high ? "high" : "normal", showBanner: banner,
    audience: aud === "all" ? { type: "all" } : aud === "inactive" ? { type: "inactive", days } : { type: "plan", plans: [aud] },
  });

  const preview = useMutation({
    mutationFn: () => adminFetch<{ recipients: number }>("/api/admin/announcements?preview=1", { method: "POST", body: JSON.stringify(payload()) }),
    onSuccess: (d) => setReach(d.recipients),
  });
  const send = useMutation({
    mutationFn: () => adminFetch<{ recipients: number }>("/api/admin/announcements", { method: "POST", body: JSON.stringify(payload()) }),
    onSuccess: (d) => {
      setDone(`Sent to ${d.recipients} ${d.recipients === 1 ? "person" : "people"}.`);
      setTitle(""); setBody(""); setReach(null); setBanner(false);
      qc.invalidateQueries({ queryKey: ["admin", "announcements"] });
    },
  });

  const canSend = admin.can("announce");
  const valid = title.trim().length > 0 && body.trim().length > 0;

  return (
    <>
      <PageTitle title="Announcements" subtitle="Appears in each person's notifications, with an optional banner across the app. Email comes later, once email sending is set up." />
      {canSend && (
        <Card className="mb-6">
          <CardHeader><CardTitle>New announcement</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1 block text-xs text-z-ink-faint">Title</label>
              <Input value={title} maxLength={120} onChange={(e) => { setTitle(e.target.value); setReach(null); setDone(null); }} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-z-ink-faint">Message ({body.length}/1000)</label>
              <textarea
                value={body}
                maxLength={1000}
                rows={4}
                onChange={(e) => { setBody(e.target.value); setDone(null); }}
                className="w-full rounded-lg border border-z-border-strong bg-white p-3 text-sm text-z-ink focus:border-z-brand focus:outline-none focus:ring-2 focus:ring-z-brand/40"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-z-ink-faint">Who gets it</label>
                <Select value={aud} onChange={(e) => { setAud(e.target.value as typeof aud); setReach(null); }}>
                  <option value="all">Everyone</option>
                  <option value="free">Free plan</option>
                  <option value="pro">Pro plan</option>
                  <option value="career-agent">Career Agent plan</option>
                  <option value="inactive">Inactive users</option>
                </Select>
              </div>
              {aud === "inactive" && (
                <div>
                  <label className="mb-1 block text-xs text-z-ink-faint">Not seen for (days)</label>
                  <Input type="number" min={1} max={365} value={days} onChange={(e) => { setDays(Math.min(365, Math.max(1, Number(e.target.value) || 1))); setReach(null); }} />
                </div>
              )}
            </div>
            <div className="flex items-center justify-between gap-3"><span className="text-sm text-z-ink">Mark as high priority</span><Switch checked={high} onChange={setHigh} label="High priority" /></div>
            <div className="flex items-center justify-between gap-3"><span className="text-sm text-z-ink">Also show as a banner across the app</span><Switch checked={banner} onChange={setBanner} label="Show banner" /></div>
            <ErrorNote error={preview.error ?? send.error} />
            {done && <p className="rounded-lg bg-z-success-bg px-3 py-2 text-sm text-z-success">{done}</p>}
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" disabled={!valid || preview.isPending} onClick={() => preview.mutate()}>Check who it reaches</Button>
              {reach !== null && <span className="text-sm text-z-ink-soft">{reach} {reach === 1 ? "person" : "people"}</span>}
              <Button
                className="ml-auto"
                disabled={!valid || reach === null || send.isPending}
                onClick={() => { if (window.confirm(`Send to ${reach} ${reach === 1 ? "person" : "people"}? This can't be unsent.`)) send.mutate(); }}
              >
                {send.isPending ? "Sending…" : "Send"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <h2 className="mb-2 text-sm font-semibold text-z-ink">History</h2>
      <ErrorNote error={history.error} />
      {history.data?.announcements.length === 0 && <Empty>Nothing sent yet.</Empty>}
      <div className="space-y-3">
        {history.data?.announcements.map((a) => (
          <Card key={a.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="text-sm font-semibold text-z-ink">{a.title}</p>
              <span className="text-xs text-z-ink-faint">{formatDateTime(a.created_at)}</span>
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm text-z-ink-soft">{a.body}</p>
            <p className="mt-2 text-xs text-z-ink-faint">{audienceText(a.audience)} · {a.recipients} recipients · {a.created_by_email ?? "unknown"}</p>
          </Card>
        ))}
      </div>
    </>
  );
}

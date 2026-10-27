"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { adminFetch } from "@/lib/admin/client";
import type { AppSettings } from "@/lib/admin/settings";
import { useAdmin } from "@/components/admin/admin-context";
import { PageTitle, ErrorNote } from "@/components/admin/ui";

type Put = { key: keyof AppSettings; value: unknown };

function Control({ title, desc, note, children }: { title: string; desc: string; note?: string; children: React.ReactNode }) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-z-ink">{title}</p>
          <p className="mt-0.5 text-sm text-z-ink-soft">{desc}</p>
          {note && <p className="mt-1.5 text-xs text-z-ink-faint">{note}</p>}
        </div>
        {children}
      </div>
    </Card>
  );
}

export default function ControlsPage() {
  const admin = useAdmin();
  const qc = useQueryClient();
  const canEdit = admin.can("controls");
  const { data, error } = useQuery({ queryKey: ["admin", "controls"], queryFn: () => adminFetch<AppSettings>("/api/admin/controls") });
  const save = useMutation({
    mutationFn: (p: Put) => adminFetch<AppSettings>("/api/admin/controls", { method: "PUT", body: JSON.stringify(p) }),
    onSuccess: (d) => qc.setQueryData(["admin", "controls"], d),
  });

  const [msg, setMsg] = useState<string | null>(null);
  const [bannerText, setBannerText] = useState<string | null>(null);
  const [bannerLevel, setBannerLevel] = useState<"info" | "warning" | null>(null);
  const maintMsg = msg ?? data?.maintenance.message ?? "";
  const bText = bannerText ?? data?.banner.text ?? "";
  const bLevel = bannerLevel ?? data?.banner.level ?? "info";

  return (
    <>
      <PageTitle title="Controls" subtitle={canEdit ? "Switches that change the whole app. Every change is logged." : "Read-only for your role. Only owners can change these."} />
      <ErrorNote error={error ?? save.error} />
      {data && (
        <div className="space-y-3">
          <Control
            title="Maintenance mode"
            desc="Shows everyone except admins a maintenance screen instead of the app."
            note="Admins can still sign in and use /admin."
          >
            <Switch checked={data.maintenance.enabled} label="Maintenance mode" onChange={(v) => canEdit && save.mutate({ key: "maintenance", value: { enabled: v, message: maintMsg } })} />
          </Control>
          <Card className="p-4 sm:p-5">
            <label className="mb-1 block text-xs text-z-ink-faint">Maintenance message (optional)</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input value={maintMsg} maxLength={300} onChange={(e) => setMsg(e.target.value)} disabled={!canEdit} placeholder="We're making improvements and will be back shortly." />
              <Button variant="secondary" disabled={!canEdit || save.isPending} onClick={() => save.mutate({ key: "maintenance", value: { enabled: data.maintenance.enabled, message: maintMsg } })}>Save</Button>
            </div>
          </Card>

          <Control
            title="Signups open"
            desc="When off, the app's sign-up page says registration is closed."
            note="This closes the sign-up page only. To block signups at the API level too, also turn off “Allow new users to sign up” in Supabase → Authentication."
          >
            <Switch checked={data.signups.enabled} label="Signups open" onChange={(v) => canEdit && save.mutate({ key: "signups", value: { enabled: v } })} />
          </Control>

          <Control
            title="AI features"
            desc="When off, every AI feature (analysis, CV tools, interview practice) refuses requests. Use it if costs spike or the provider has problems."
            note="Takes effect within about 30 seconds."
          >
            <Switch checked={data.ai.enabled} label="AI features" onChange={(v) => canEdit && save.mutate({ key: "ai", value: { enabled: v } })} />
          </Control>

          <Control
            title="Pause job syncing"
            desc="Stops the scheduled sync from fetching new jobs. “Run now” on the Sources page still works."
          >
            <Switch checked={!data.sync.paused} label="Syncing enabled" onChange={(v) => canEdit && save.mutate({ key: "sync", value: { paused: !v, pausedSources: data.sync.pausedSources } })} />
          </Control>

          <Card className="space-y-3 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-z-ink">Site banner</p>
                <p className="mt-0.5 text-sm text-z-ink-soft">A message across the top of the app for everyone.</p>
              </div>
              <Switch checked={data.banner.enabled} label="Banner on" onChange={(v) => canEdit && save.mutate({ key: "banner", value: { enabled: v, text: bText, level: bLevel } })} />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input value={bText} maxLength={300} onChange={(e) => setBannerText(e.target.value)} disabled={!canEdit} placeholder="Banner text" />
              <Select value={bLevel} onChange={(e) => setBannerLevel(e.target.value as "info" | "warning")} disabled={!canEdit} className="sm:w-32">
                <option value="info">Info</option>
                <option value="warning">Warning</option>
              </Select>
              <Button variant="secondary" disabled={!canEdit || save.isPending} onClick={() => save.mutate({ key: "banner", value: { enabled: data.banner.enabled, text: bText, level: bLevel } })}>Save</Button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}

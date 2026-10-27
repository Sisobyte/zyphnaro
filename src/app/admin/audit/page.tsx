"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { adminFetch, formatDateTime } from "@/lib/admin/client";
import { PageTitle, ErrorNote, Empty } from "@/components/admin/ui";

type Entry = { id: string; actor_email: string | null; action: string; target: string | null; details: Record<string, unknown>; created_at: string };

export default function AuditPage() {
  const [page, setPage] = useState(0);
  const { data, error } = useQuery({ queryKey: ["admin", "audit", page], queryFn: () => adminFetch<{ entries: Entry[] }>(`/api/admin/audit?page=${page}`), placeholderData: (p) => p });
  return (
    <>
      <PageTitle title="Audit log" subtitle="Every admin action: who did what, to whom, and when. It can't be edited from the app." />
      <ErrorNote error={error} />
      {data?.entries.length === 0 && <Empty>Nothing recorded yet.</Empty>}
      <div className="space-y-2">
        {data?.entries.map((e) => (
          <Card key={e.id} className="p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-z-ink">{e.action}</span>
              <span className="text-xs text-z-ink-faint">{formatDateTime(e.created_at)}</span>
            </div>
            <p className="mt-0.5 break-words text-xs text-z-ink-soft">{e.actor_email ?? "unknown"}{e.target ? ` → ${e.target}` : ""}</p>
            {Object.keys(e.details ?? {}).length > 0 && <p className="mt-1 break-all font-mono text-[11px] text-z-ink-faint">{JSON.stringify(e.details)}</p>}
          </Card>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-end gap-2">
        <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Newer</Button>
        <Button variant="secondary" size="sm" disabled={(data?.entries.length ?? 0) < 50} onClick={() => setPage((p) => p + 1)}>Older</Button>
      </div>
    </>
  );
}

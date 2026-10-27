"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, MoreVertical } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { adminFetch, formatDate } from "@/lib/admin/client";
import { canActOnUser, ROLE_LABEL, type AdminRole } from "@/lib/admin/roles";
import { useAdmin } from "@/components/admin/admin-context";
import { PageTitle, ErrorNote, Empty } from "@/components/admin/ui";

type U = {
  id: string; email: string | null; name: string | null; plan: string; created_at: string;
  last_sign_in_at: string | null; email_confirmed: boolean; banned: boolean; onboarded: boolean; has_cv: boolean;
  last_seen: string | null; saved_count: number; applications_count: number; interviews_count: number; admin_role: AdminRole | null;
};
type Action = "disable" | "enable" | "signout" | "resend" | "delete";

const ACTION_COPY: Record<Action, { label: string; body: string; danger?: boolean }> = {
  disable: { label: "Disable account", body: "They are signed out now and can't sign in until you enable the account again. Their data is kept.", danger: true },
  enable: { label: "Enable account", body: "They will be able to sign in again." },
  signout: { label: "Sign out everywhere", body: "Ends all their sessions. They can sign back in normally." },
  resend: { label: "Resend confirmation email", body: "Sends the sign-up confirmation link again. Uses Supabase's built-in email, which is rate-limited." },
  delete: { label: "Delete account", body: "Permanently deletes the account and everything tied to it, including uploaded files. This can't be undone.", danger: true },
};

export default function UsersPage() {
  const admin = useAdmin();
  const qc = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [pending, setPending] = useState<{ user: U; action: Action } | null>(null);
  const [menuFor, setMenuFor] = useState<U | null>(null);
  const [confirmText, setConfirmText] = useState("");

  const { data, error, isFetching } = useQuery({
    queryKey: ["admin", "users", search, filter, page],
    queryFn: () => adminFetch<{ total: number; pageSize: number; users: U[] }>(`/api/admin/users?search=${encodeURIComponent(search)}&filter=${filter}&page=${page}`),
    placeholderData: (prev) => prev,
  });

  const run = useMutation({
    mutationFn: ({ user, action }: { user: U; action: Action }) =>
      adminFetch(`/api/admin/users/${user.id}`, { method: "POST", body: JSON.stringify({ action, confirm: confirmText }) }),
    onSuccess: () => {
      setPending(null);
      setConfirmText("");
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      qc.invalidateQueries({ queryKey: ["admin", "overview"] });
    },
  });

  const actionsFor = (u: U): Action[] => {
    const permission = (a: Action) => (a === "delete" ? "user.delete" : "user.manage") as "user.delete" | "user.manage";
    const all: Action[] = [u.banned ? "enable" : "disable", "signout", ...(u.email_confirmed ? [] : (["resend"] as Action[])), "delete"];
    return all.filter((a) => canActOnUser({ actorRole: admin.role, actorId: admin.id, targetId: u.id, targetRole: u.admin_role, permission: permission(a) }).ok);
  };

  const total = data?.total ?? 0;
  const pageSize = data?.pageSize ?? 25;
  const pages = Math.max(1, Math.ceil(total / pageSize));

  const statusBadges = (u: U) => (
    <div className="flex flex-wrap gap-1">
      {u.banned && <Badge variant="danger">Disabled</Badge>}
      {!u.email_confirmed && <Badge variant="warning">Unconfirmed</Badge>}
      {u.admin_role && <Badge variant="violet">{ROLE_LABEL[u.admin_role]}</Badge>}
      {u.onboarded ? <Badge variant="success">Onboarded</Badge> : <Badge variant="neutral">Not onboarded</Badge>}
      {u.has_cv && <Badge variant="brand">CV</Badge>}
    </div>
  );

  return (
    <>
      <PageTitle title="Users" subtitle="Account facts and counts only. CV text and interview answers are not shown here, on purpose." />
      <form
        className="mb-4 flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => { e.preventDefault(); setPage(0); setSearch(searchInput.trim()); }}
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-z-ink-faint" />
          <Input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search by email or name" className="h-10 pl-9" />
        </div>
        <Select value={filter} onChange={(e) => { setFilter(e.target.value); setPage(0); }} className="h-10 sm:w-48" aria-label="Filter users">
          <option value="all">All users</option>
          <option value="inactive">Inactive 14+ days</option>
          <option value="unconfirmed">Unconfirmed email</option>
          <option value="disabled">Disabled</option>
          <option value="paid">On a paid plan</option>
        </Select>
        <Button type="submit" className="h-10">Search</Button>
      </form>
      <ErrorNote error={error} />

      {data && data.users.length === 0 && <Empty>No users match.</Empty>}

      {/* Phones: cards */}
      <div className="space-y-3 md:hidden">
        {data?.users.map((u) => (
          <Card key={u.id} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-z-ink">{u.name || "No name"}</p>
                <p className="truncate text-xs text-z-ink-soft">{u.email}</p>
              </div>
              {actionsFor(u).length > 0 && (
                <Button variant="ghost" size="icon" aria-label="Actions" onClick={() => setMenuFor(u)}><MoreVertical className="h-4 w-4" /></Button>
              )}
            </div>
            <div className="mt-2">{statusBadges(u)}</div>
            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
              <dt className="text-z-ink-faint">Plan</dt><dd className="text-right capitalize text-z-ink">{u.plan}</dd>
              <dt className="text-z-ink-faint">Joined</dt><dd className="text-right text-z-ink">{formatDate(u.created_at)}</dd>
              <dt className="text-z-ink-faint">Last seen</dt><dd className="text-right text-z-ink">{formatDate(u.last_seen ?? u.last_sign_in_at)}</dd>
              <dt className="text-z-ink-faint">Saved / applied / interviews</dt>
              <dd className="text-right text-z-ink">{u.saved_count} / {u.applications_count} / {u.interviews_count}</dd>
            </dl>
          </Card>
        ))}
      </div>

      {/* Tablet & desktop: table */}
      <Card className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-z-border text-xs text-z-ink-faint">
            <tr>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="px-3 py-3 font-medium">Plan</th>
              <th className="px-3 py-3 font-medium">Joined</th>
              <th className="px-3 py-3 font-medium">Last seen</th>
              <th className="px-3 py-3 text-right font-medium">Saved / applied / interviews</th>
              <th className="w-12 px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {data?.users.map((u) => (
              <tr key={u.id} className="border-b border-z-border last:border-0">
                <td className="max-w-[16rem] px-4 py-3">
                  <p className="truncate font-medium text-z-ink">{u.name || "No name"}</p>
                  <p className="truncate text-xs text-z-ink-soft">{u.email}</p>
                </td>
                <td className="px-3 py-3">{statusBadges(u)}</td>
                <td className="px-3 py-3 capitalize">{u.plan}</td>
                <td className="whitespace-nowrap px-3 py-3">{formatDate(u.created_at)}</td>
                <td className="whitespace-nowrap px-3 py-3">{formatDate(u.last_seen ?? u.last_sign_in_at)}</td>
                <td className="px-3 py-3 text-right tabular-nums">{u.saved_count} / {u.applications_count} / {u.interviews_count}</td>
                <td className="px-3 py-3">
                  {actionsFor(u).length > 0 && (
                    <Button variant="ghost" size="icon" aria-label="Actions" onClick={() => setMenuFor(u)}><MoreVertical className="h-4 w-4" /></Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="mt-4 flex items-center justify-between text-sm text-z-ink-soft">
        <span>{total.toLocaleString()} user{total === 1 ? "" : "s"}{isFetching ? " · updating…" : ""}</span>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span className="text-xs">Page {page + 1} of {pages}</span>
          <Button variant="secondary" size="sm" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      </div>

      {/* Action picker */}
      <Dialog open={!!menuFor} onClose={() => setMenuFor(null)} title={menuFor?.email ?? "User"} className="max-w-sm">
        <div className="flex flex-col p-2">
          {menuFor && actionsFor(menuFor).map((a) => (
            <button
              key={a}
              onClick={() => { setPending({ user: menuFor, action: a }); setMenuFor(null); setConfirmText(""); run.reset(); }}
              className={`rounded-lg px-3 py-2.5 text-left text-sm hover:bg-z-surface ${ACTION_COPY[a].danger ? "text-z-danger" : "text-z-ink"}`}
            >
              {ACTION_COPY[a].label}
            </button>
          ))}
        </div>
      </Dialog>

      {/* Confirm */}
      <Dialog open={!!pending} onClose={() => setPending(null)} title={pending ? ACTION_COPY[pending.action].label : ""} className="max-w-md">
        {pending && (
          <div className="space-y-4 p-5">
            <p className="text-sm text-z-ink-soft"><span className="font-medium text-z-ink">{pending.user.email}</span></p>
            <p className="text-sm text-z-ink-soft">{ACTION_COPY[pending.action].body}</p>
            {pending.action === "delete" && (
              <div>
                <label className="mb-1 block text-xs text-z-ink-faint">Type their email to confirm</label>
                <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoComplete="off" />
              </div>
            )}
            <ErrorNote error={run.error} />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setPending(null)}>Cancel</Button>
              <Button
                variant={ACTION_COPY[pending.action].danger ? "danger" : "primary"}
                disabled={run.isPending || (pending.action === "delete" && confirmText.trim().toLowerCase() !== (pending.user.email ?? "").toLowerCase())}
                onClick={() => run.mutate(pending)}
              >
                {run.isPending ? "Working…" : ACTION_COPY[pending.action].label}
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}

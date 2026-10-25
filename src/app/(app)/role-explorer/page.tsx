"use client";

import { useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { Compass, Plus, X, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCurrentUser } from "@/lib/hooks/use-user";
import { userRepository } from "@/lib/repositories";
import type { RelatedRole } from "@/lib/types";

export default function RoleExplorerPage() {
  const { data: user } = useCurrentUser();
  const client = useQueryClient();
  const [customRole, setCustomRole] = useState("");
  const [saving, setSaving] = useState(false);

  if (!user) return <div className="h-64 animate-pulse rounded-2xl border border-z-border bg-white" />;

  const related = user.relatedRoles.filter((r) => r.relation === "related");
  const adjacent = user.relatedRoles.filter((r) => r.relation === "adjacent");

  // BACKEND INTEGRATION:
  // Same direct userRepository.updateProfile() + invalidate("current-user")
  // pattern used by the Settings page — relatedRoles is a real, persisted
  // JSONB column on `profiles` now (migration 0008).
  const persistRoles = async (next: RelatedRole[]) => {
    setSaving(true);
    await userRepository.updateProfile({ relatedRoles: next });
    await client.invalidateQueries({ queryKey: ["current-user"] });
    setSaving(false);
  };

  const addRole = () => {
    const title = customRole.trim();
    if (!title) return;
    if (user.relatedRoles.some((r) => r.title.toLowerCase() === title.toLowerCase())) {
      setCustomRole("");
      return;
    }
    setCustomRole("");
    void persistRoles([
      ...user.relatedRoles,
      {
        title,
        relation: "adjacent",
        overlapPercent: 50,
        reason: "Added manually — overlap not yet analyzed by AI.",
      },
    ]);
  };

  const removeRole = (title: string) => {
    void persistRoles(user.relatedRoles.filter((r) => r.title !== title));
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="inline-flex items-center gap-2 text-xl font-semibold text-z-ink sm:text-2xl">
          <Compass className="h-5 w-5 text-z-brand" /> Role Explorer
        </h1>
        <p className="mt-1 text-sm text-z-ink-faint">Explore related roles and expand your opportunity radar beyond one job title.</p>
      </div>

      <Card className="p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-z-ink-faint">Primary role</p>
        <p className="mt-1 text-lg font-semibold text-z-ink">{user.primaryRole}</p>
        <p className="mt-1 text-sm text-z-ink-faint">
          {user.yearsExperience} years experience · {user.skills.slice(0, 4).join(", ")}
        </p>
      </Card>

      <section>
        <h2 className="mb-3 text-[15px] font-semibold text-z-ink">Related roles</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {related.map((r) => (
            <RoleCard key={r.title} role={r} onRemove={() => removeRole(r.title)} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-[15px] font-semibold text-z-ink">Adjacent roles</h2>
        <p className="mb-3 -mt-2 text-xs text-z-ink-faint">Roles with partial overlap — good for exploring career expansion.</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {adjacent.map((r) => (
            <RoleCard key={r.title} role={r} onRemove={() => removeRole(r.title)} />
          ))}
        </div>
      </section>

      <Card className="p-5">
        <h3 className="mb-2 text-[15px] font-semibold text-z-ink">Add a custom role</h3>
        <p className="mb-3 text-sm text-z-ink-faint">
          Zyphnaro will eventually use AI to identify how closely a custom role overlaps with your profile.
        </p>
        <div className="flex gap-2">
          <Input
            value={customRole}
            onChange={(e) => setCustomRole(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addRole();
            }}
            placeholder="e.g. Product Designer"
            className="max-w-xs"
          />
          <Button size="sm" variant="secondary" disabled={!customRole.trim() || saving} onClick={addRole}>
            <Plus className="h-4 w-4" /> Add role
          </Button>
        </div>
      </Card>
    </div>
  );
}

function RoleCard({ role, onRemove }: { role: { title: string; overlapPercent: number; reason: string }; onRemove: () => void }) {
  return (
    <Card className="flex flex-col gap-2 p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-z-ink">{role.title}</p>
        <button onClick={onRemove} className="text-z-ink-faint hover:text-z-danger" aria-label={`Remove ${role.title}`}>
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <Badge variant={role.overlapPercent >= 70 ? "success" : role.overlapPercent >= 40 ? "brand" : "neutral"} className="w-fit">
        {role.overlapPercent}% related
      </Badge>
      <p className="text-xs leading-relaxed text-z-ink-faint">{role.reason}</p>
      {/* Searches the database (title/company/skills) for this role, then
          ranks results by the user's real match score — same search the
          Opportunities page's own search box uses. */}
      <Link
        href={`/opportunities?q=${encodeURIComponent(role.title)}`}
        className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-z-brand hover:underline"
      >
        Explore <ArrowRight className="h-3 w-3" />
      </Link>
    </Card>
  );
}

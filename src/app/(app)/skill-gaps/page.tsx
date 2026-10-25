"use client";

import { normalizeSkillList } from "@/lib/sources/skill-vocabulary";
import { useState } from "react";
import { TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { SkillBadge } from "@/components/shared/skill-badge";
import { useSkillDemand } from "@/lib/hooks/use-opportunities";
import { useCurrentUser } from "@/lib/hooks/use-user";

export default function SkillGapsPage() {
  // Skill frequency across EVERY listing in the database — NOT the ranked
  // opportunity list. Ranking weighs skill overlap with the user's own
  // profile, so a skill the user is missing is, by definition, penalized out
  // of their top matches; computing gaps from that list would silently hide
  // the very gaps this page exists to find. See migration 0010.
  const { data: user } = useCurrentUser();
  // "My field" counts only listings whose title matches the user's role, so a
  // virtual assistant isn't told to learn Go. "All jobs" is the whole market.
  // Both skip sources the user has switched off.
  const [scope, setScope] = useState<"field" | "all">("field");
  const { data: demandList = [], isLoading } = useSkillDemand(scope);

  if (!user || isLoading) return <div className="h-64 animate-pulse rounded-2xl border border-z-border bg-white" />;

  const userSkills = new Set(normalizeSkillList(user.skills));
  const demand = new Map(demandList.map(({ skill, count }) => [skill, count]));

  const gaps = Array.from(demand.entries())
    .filter(([skill]) => !userSkills.has(skill.toLowerCase()))
    .sort((a, b) => b[1] - a[1]);

  const covered = Array.from(demand.entries())
    .filter(([skill]) => userSkills.has(skill.toLowerCase()))
    .sort((a, b) => b[1] - a[1]);

  const maxDemand = Math.max(...Array.from(demand.values()), 1);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="inline-flex items-center gap-2 text-xl font-semibold text-z-ink sm:text-2xl">
          <TrendingUp className="h-5 w-5 text-z-brand" /> Skill Gaps
        </h1>
        <p className="mt-1 text-sm text-z-ink-faint">
          {scope === "field" && user.primaryRole
            ? `Skills often requested in listings whose title matches "${user.primaryRole}" that aren't on your profile yet.`
            : "Skills often requested across all listings that aren't on your profile yet."}
        </p>
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant={scope === "field" ? "primary" : "secondary"} onClick={() => setScope("field")}>
            My field
          </Button>
          <Button size="sm" variant={scope === "all" ? "primary" : "secondary"} onClick={() => setScope("all")}>
            All jobs
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 text-[15px] font-semibold text-z-ink">Skills to consider adding</h2>
          {demandList.length === 0 ? (
            <p className="text-sm text-z-ink-faint">
              {scope === "field"
                ? "No listings match your role title yet. Check your primary role on your profile, or switch to All jobs."
                : "No listings to analyse yet. Run a sync or switch on a source on the Sources page."}
            </p>
          ) : gaps.length === 0 ? (
            <p className="text-sm text-z-ink-faint">No major gaps found — your skills cover most requested skills.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {gaps.slice(0, 8).map(([skill, count]) => (
                <div key={skill}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <SkillBadge skill={skill} muted />
                    <span className="text-z-ink-faint">{count} opportunities</span>
                  </div>
                  <Progress value={(count / maxDemand) * 100} barClassName="bg-z-warning" />
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-[15px] font-semibold text-z-ink">Skills already covered</h2>
          <div className="flex flex-col gap-3">
            {covered.slice(0, 8).map(([skill, count]) => (
              <div key={skill}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <SkillBadge skill={skill} />
                  <span className="text-z-ink-faint">{count} opportunities</span>
                </div>
                <Progress value={(count / maxDemand) * 100} barClassName="bg-z-success" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

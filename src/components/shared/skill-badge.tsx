import { cn } from "@/lib/utils";

const palette = [
  "bg-z-brand-50 text-z-brand-600",
  "bg-z-teal-bg text-z-teal",
  "bg-z-violet-bg text-z-violet",
  "bg-z-success-bg text-z-success",
  "bg-z-warning-bg text-z-warning",
];

function hashSkill(skill: string) {
  let hash = 0;
  for (let i = 0; i < skill.length; i++) hash = (hash * 31 + skill.charCodeAt(i)) % palette.length;
  return hash;
}

export function SkillBadge({ skill, muted = false, className }: { skill: string; muted?: boolean; className?: string }) {
  const tone = muted ? "bg-z-surface text-z-ink-soft border border-z-border" : palette[hashSkill(skill)];
  return (
    <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium", tone, className)}>
      {skill}
    </span>
  );
}

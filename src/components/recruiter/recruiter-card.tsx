import { ExternalLink, User } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Recruiter } from "@/lib/types";

export function RecruiterCard({ recruiter }: { recruiter: Recruiter }) {
  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-z-brand-50 text-z-brand-600">
          <User className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-z-ink">{recruiter.name}</p>
          <p className="truncate text-xs text-z-ink-faint">
            {recruiter.role} · {recruiter.company}
          </p>
        </div>
        {recruiter.identityConsistent && <Badge variant="teal">Verified</Badge>}
      </div>

      <div className="mt-3 space-y-1.5 text-xs text-z-ink-soft">
        <p>
          Source: <span className="font-medium text-z-ink">{recruiter.source}</span>
        </p>
        {recruiter.responseRate !== undefined && (
          <p>
            Response rate: <span className="font-medium text-z-ink">{recruiter.responseRate}%</span>
          </p>
        )}
        {recruiter.activity && <p className="text-z-ink-faint">{recruiter.activity}</p>}
      </div>

      {recruiter.profileUrl && (
        <a
          href={recruiter.profileUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-z-brand hover:underline"
        >
          View Profile <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </Card>
  );
}

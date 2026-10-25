"use client";

import { CheckCircle2, AlertTriangle, ListChecks, HelpCircle, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CircularScore } from "@/components/ui/circular-score";
import { concernCounts, type FitAssessment } from "@/lib/assessment";

const LEVEL_NOTE = {
  title: "from the job title",
  assumed: "assumed: the title doesn't say, so this is Zyphnaro's default",
} as const;

function Bullets({ items, dot }: { items: string[]; dot: string }) {
  return (
    <ul className="space-y-1.5 text-sm text-z-ink-soft">
      {items.map((t) => (
        <li key={t} className="flex gap-2">
          <span className={`mt-1.5 h-1 w-1 shrink-0 rounded-full ${dot}`} /> {t}
        </li>
      ))}
    </ul>
  );
}

// The one quick analysis. Every number, concern and recommendation here comes
// from the same FitAssessment the live AI is given.
export function FitAssessmentPanel({ assessment }: { assessment: FitAssessment }) {
  const { scores, job, concerns, recommendations: rec, strengths } = assessment;
  const counts = concernCounts(assessment);
  const experience = scores.experienceMatch;

  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-center gap-5">
        <CircularScore value={scores.overall} label="fit" color="var(--z-success)" />
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-semibold text-z-ink">How your profile lines up</h3>
          <p className="text-sm text-z-ink-faint">
            Overall fit blends skills, level, role and location. It estimates how well your profile fits what the
            listing asks for. It is not a prediction of whether you will be hired.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-z-surface p-3 text-center">
          <p className="text-lg font-semibold text-z-ink">{scores.skillMatch}%</p>
          <p className="text-xs text-z-ink-faint">Skill match</p>
          <p className="mt-0.5 text-[11px] text-z-ink-faint">skills you list vs the listing</p>
        </div>
        <div className="rounded-lg bg-z-surface p-3 text-center">
          <p className="text-lg font-semibold text-z-ink">{experience === null ? "Unclear" : `${experience}%`}</p>
          <p className="text-xs text-z-ink-faint">Experience evidence</p>
          <p className="mt-0.5 text-[11px] text-z-ink-faint">
            {experience === null ? "not enough work history" : "shown in roles and projects"}
          </p>
        </div>
        <div className="col-span-2 rounded-lg bg-z-surface p-3 text-center sm:col-span-1">
          <p className="text-lg font-semibold text-z-ink">{scores.overall}%</p>
          <p className="text-xs text-z-ink-faint">Overall fit</p>
          <p className="mt-0.5 text-[11px] text-z-ink-faint">skills 45 · level 25 · role 20 · place 10</p>
        </div>
      </div>

      {experience !== null && experience + 15 < scores.skillMatch && (
        <p className="mt-3 flex gap-2 rounded-lg bg-z-warning-bg px-3 py-2 text-xs text-z-warning">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Your skills overlap more than your work history shows. Matching keywords is not the same as having done the
          work, so read the concerns below.
        </p>
      )}
      {assessment.qualityNote && (
        <p className="mt-3 flex gap-2 rounded-lg bg-z-surface px-3 py-2 text-xs text-z-ink-soft">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {assessment.qualityNote}
        </p>
      )}

      <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        <div className="flex justify-between gap-3">
          <dt className="text-z-ink-faint">Level on the listing</dt>
          <dd className="text-right font-medium capitalize text-z-ink">{job.labelLevel}</dd>
        </div>
        <p className="text-xs text-z-ink-faint sm:self-center">Source label, {LEVEL_NOTE[job.labelOrigin]}.</p>
        {job.signals.length > 0 && (
          <div className="sm:col-span-2">
            <dt className="text-z-ink-faint">Zyphnaro&apos;s reading of the description</dt>
            <dd className="mt-1 flex flex-wrap gap-1.5">
              {job.signals.map((s) => (
                <Badge key={s.id} variant={job.reviewFlag ? "warning" : "neutral"} title={`"${s.evidence}"`}>
                  {s.label}
                </Badge>
              ))}
            </dd>
          </div>
        )}
      </dl>

      <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-z-success">
            <CheckCircle2 className="h-4 w-4" /> Why you match
          </p>
          {strengths.length === 0 ? (
            <p className="text-sm text-z-ink-faint">Nothing in this listing clearly matches your profile yet.</p>
          ) : (
            <Bullets items={strengths} dot="bg-z-success" />
          )}
        </div>
        <div>
          <p className="mb-1 flex items-center gap-1.5 text-sm font-medium text-z-warning">
            <AlertTriangle className="h-4 w-4" /> Potential concerns ({counts.total})
          </p>
          {counts.total > 0 && (
            <p className="mb-2 text-xs text-z-ink-faint">
              {counts.gaps} gap{counts.gaps === 1 ? "" : "s"} in your evidence · {counts.toVerify} to verify (not
              confirmed problems)
            </p>
          )}
          {concerns.length === 0 ? (
            <p className="text-sm text-z-ink-faint">No concerns found from the listing text and your profile.</p>
          ) : (
            <ul className="space-y-2 text-sm text-z-ink-soft">
              {concerns.map((c) => (
                <li key={c.id} className="flex gap-2">
                  {c.status === "to-verify" ? (
                    <HelpCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-z-ink-faint" />
                  ) : (
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-z-warning" />
                  )}
                  <span>{c.text}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {(rec.strengthen.length > 0 || rec.learn.length > 0 || rec.experience.length > 0 || rec.recruiterQuestions.length > 0) && (
        <div className="mt-5 border-t border-z-border pt-4">
          <p className="mb-3 flex items-center gap-1.5 text-sm font-medium text-z-ink">
            <ListChecks className="h-4 w-4 text-z-brand" /> What to do about it
          </p>
          <div className="space-y-4 text-sm">
            {rec.strengthen.length > 0 && (
              <div>
                <p className="mb-1 font-medium text-z-ink-soft">Show it, don&apos;t just list it</p>
                <p className="text-z-ink-soft">
                  You list {rec.strengthen.join(", ")}, but no job or project on your profile shows it. Add a bullet or
                  project that proves it.
                </p>
              </div>
            )}
            {rec.learn.length > 0 && (
              <div>
                <p className="mb-1 font-medium text-z-ink-soft">Skills to build</p>
                <p className="text-z-ink-soft">{rec.learn.join(", ")}</p>
              </div>
            )}
            {rec.experience.length > 0 && (
              <div>
                <p className="mb-1 font-medium text-z-ink-soft">Experience a course can&apos;t give you</p>
                <Bullets items={rec.experience} dot="bg-z-brand" />
              </div>
            )}
            {rec.recruiterQuestions.length > 0 && (
              <div>
                <p className="mb-1 font-medium text-z-ink-soft">Ask the recruiter</p>
                <Bullets items={rec.recruiterQuestions} dot="bg-z-brand" />
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

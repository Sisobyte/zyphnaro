"use client";

import { Suspense, use, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Bookmark,
  ExternalLink,
  MapPin,
  Briefcase,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CircularScore } from "@/components/ui/circular-score";
import { SkillBadge } from "@/components/shared/skill-badge";
import { MatchScore } from "@/components/shared/match-score";
import { RecruiterCard } from "@/components/recruiter/recruiter-card";
import { MessageGenerator } from "@/components/recruiter/message-generator";
import { FitAssessmentPanel } from "@/components/opportunities/fit-assessment-panel";
import { concernCounts } from "@/lib/assessment";
import { LiveOpportunityAnalysis } from "@/components/opportunities/live-opportunity-analysis";
import { LiveCVTailor } from "@/components/opportunities/live-cv-tailor";
import { useOpportunity, useSaveOpportunity } from "@/lib/hooks/use-opportunities";
import { formatSalary, timeAgo, cn } from "@/lib/utils";

const trustLevelCopy = {
  "low-concern": { label: "Low concern", tone: "text-z-teal" },
  "potential-concern": { label: "Potential concern", tone: "text-z-warning" },
  "high-risk": { label: "High risk", tone: "text-z-danger" },
};

export default function OpportunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl border border-z-border bg-white" />}>
      <OpportunityDetailInner params={params} />
    </Suspense>
  );
}

function OpportunityDetailInner({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: opportunity, isLoading } = useOpportunity(id);
  const saveMutation = useSaveOpportunity();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState(searchParams.get("tab") ?? "overview");

  if (isLoading) {
    return <div className="h-96 animate-pulse rounded-2xl border border-z-border bg-white" />;
  }

  if (!opportunity) {
    return (
      <Card className="p-10 text-center">
        <p className="text-sm font-medium text-z-ink">This opportunity is no longer available.</p>
        <p className="mt-1 text-sm text-z-ink-faint">It may have been closed or removed by the source.</p>
        <Link href="/opportunities" className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "mt-4 inline-flex")}>
          Back to opportunities
        </Link>
      </Card>
    );
  }

  const salary = formatSalary(opportunity.salary);
  const trustCopy = trustLevelCopy[opportunity.trust.level];

  return (
    <div className="flex flex-col gap-5">
      <Link href="/opportunities" className="inline-flex w-fit items-center gap-1.5 text-sm text-z-ink-faint hover:text-z-ink">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to opportunities
      </Link>

      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant="brand" className="font-semibold">
                <MatchScore value={opportunity.match.overall} />
              </Badge>
              <Badge variant="outline">{opportunity.source}</Badge>
              {opportunity.assessment?.job.reviewFlag && (
                <Badge variant="warning" title={opportunity.assessment.job.reviewReason}>
                  Level worth checking
                </Badge>
              )}
            </div>
            <h1 className="text-xl font-semibold text-z-ink sm:text-2xl">{opportunity.title}</h1>
            <p className="mt-1 text-sm font-medium text-z-ink-soft">{opportunity.company.name}</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-z-ink-faint">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {opportunity.location}
              </span>
              <span className="inline-flex items-center gap-1">
                <Briefcase className="h-3.5 w-3.5" /> {opportunity.workType} · {opportunity.employmentType.replace("-", " ")}
              </span>
              {salary && (
                <span className="inline-flex items-center gap-1">
                  <DollarSign className="h-3.5 w-3.5" /> {salary}
                </span>
              )}
              <span>Posted {timeAgo(opportunity.postedAt)}</span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <a href={opportunity.originalUrl} target="_blank" rel="noreferrer" className={cn(buttonVariants({ variant: "primary" }))}>
              Apply Now
            </a>
            <Button
              variant={opportunity.saved ? "subtle" : "secondary"}
              onClick={() => saveMutation.mutate({ opportunity, save: !opportunity.saved })}
            >
              <Bookmark className={cn("h-4 w-4", opportunity.saved && "fill-current")} />
              {opportunity.saved ? "Saved" : "Save"}
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="mb-4 w-full overflow-x-auto sm:w-fit">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="description">Job Description</TabsTrigger>
              <TabsTrigger value="analysis">AI Analysis</TabsTrigger>
              <TabsTrigger value="trust">Trust</TabsTrigger>
              <TabsTrigger value="cvfit">CV Fit</TabsTrigger>
              {opportunity.author && <TabsTrigger value="recruiter">Recruiter</TabsTrigger>}
            </TabsList>

            <TabsContent value="overview" className="flex flex-col gap-4">
              <Card className="p-5">
                <h3 className="mb-2 text-[15px] font-semibold text-z-ink">Why this matched</h3>
                <p className="text-sm text-z-ink-soft">{opportunity.match.reason}</p>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label: "Skills", value: opportunity.match.skills },
                    { label: "Level fit", value: opportunity.match.experience },
                    { label: "Role", value: opportunity.match.role },
                    { label: "Location", value: opportunity.match.location },
                  ].map((m) => (
                    <div key={m.label} className="rounded-lg bg-z-surface p-3 text-center">
                      <p className="text-lg font-semibold text-z-ink">{m.value}%</p>
                      <p className="text-xs text-z-ink-faint">{m.label}</p>
                    </div>
                  ))}
                </div>
              </Card>
              <Card className="p-5">
                <h3 className="mb-2 text-[15px] font-semibold text-z-ink">Skills</h3>
                <div className="flex flex-wrap gap-1.5">
                  {opportunity.skills.map((s) => (
                    <SkillBadge key={s} skill={s} />
                  ))}
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="description">
              <Card className="p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-[15px] font-semibold text-z-ink">Original Opportunity</h3>
                  <a
                    href={opportunity.originalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-z-brand hover:underline"
                  >
                    View original source <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <p className="whitespace-pre-line text-sm leading-relaxed text-z-ink-soft">{opportunity.description}</p>
              </Card>
            </TabsContent>

            <TabsContent value="analysis" className="flex flex-col gap-4">
              {opportunity.assessment ? (
                <>
                  <FitAssessmentPanel assessment={opportunity.assessment} />
                  <LiveOpportunityAnalysis opportunity={opportunity} assessment={opportunity.assessment} />
                </>
              ) : (
                <Card className="p-5">
                  <p className="text-sm text-z-ink-faint">No assessment is available for this listing.</p>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="trust" className="flex flex-col gap-4">
              <Card className="p-5">
                <div className="mb-4 flex items-center gap-4">
                  <CircularScore
                    value={opportunity.trust.score}
                    label={trustCopy.label}
                    color={opportunity.trust.score >= 80 ? "var(--z-teal)" : opportunity.trust.score >= 50 ? "var(--z-warning)" : "var(--z-danger)"}
                  />
                  <div>
                    <h3 className="text-[15px] font-semibold text-z-ink">Trust Score</h3>
                    <p className={cn("text-sm font-medium", trustCopy.tone)}>{trustCopy.label}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-z-teal">
                      <ShieldCheck className="h-4 w-4" /> Signals
                    </p>
                    {opportunity.trust.signals.length === 0 ? (
                      <p className="text-sm text-z-ink-faint">No positive signals detected yet.</p>
                    ) : (
                      <ul className="space-y-1.5 text-sm text-z-ink-soft">
                        {opportunity.trust.signals.map((s) => (
                          <li key={s} className="flex gap-2">
                            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-z-teal" /> {s}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-z-warning">
                      <ShieldAlert className="h-4 w-4" /> Potential concerns
                    </p>
                    {opportunity.trust.concerns.length === 0 ? (
                      <p className="text-sm text-z-ink-faint">Nothing to flag here.</p>
                    ) : (
                      <ul className="space-y-1.5 text-sm text-z-ink-soft">
                        {opportunity.trust.concerns.map((c) => (
                          <li key={c} className="flex gap-2">
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-z-warning" /> {c}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
                <p className="mt-4 rounded-lg bg-z-surface p-3 text-xs text-z-ink-faint">
                  Zyphnaro surfaces signals to help you evaluate an opportunity — it never definitively labels a listing
                  as a scam. Always use your own judgment before sharing personal or financial information.
                </p>
              </Card>
            </TabsContent>

            <TabsContent value="cvfit" className="flex flex-col gap-4">
              <Card className="p-5">
                <h3 className="mb-4 text-[15px] font-semibold text-z-ink">Your CV vs This Opportunity</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg bg-z-surface p-3 text-center">
                    <p className="text-lg font-semibold text-z-ink">{opportunity.cvFit.jobMatch}%</p>
                    <p className="text-xs text-z-ink-faint">Job Match</p>
                  </div>
                  <div className="rounded-lg bg-z-surface p-3 text-center">
                    <p className="text-lg font-semibold text-z-ink">{opportunity.cvFit.cvMatch}%</p>
                    <p className="text-xs text-z-ink-faint">CV Match</p>
                  </div>
                  <div className="rounded-lg bg-z-surface p-3 text-center">
                    <p className="text-lg font-semibold text-z-ink">{opportunity.cvFit.atsReadiness}%</p>
                    <p className="text-xs text-z-ink-faint">ATS Readiness</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <p className="mb-2 text-sm font-medium text-z-success">Strong Matches</p>
                    <div className="flex flex-wrap gap-1.5">
                      {opportunity.cvFit.strongMatches.map((s) => (
                        <SkillBadge key={s} skill={s} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-sm font-medium text-z-warning">Weak / Missing</p>
                    <div className="flex flex-wrap gap-1.5">
                      {opportunity.cvFit.weakOrMissing.map((s) => (
                        <SkillBadge key={s} skill={s} muted />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="mb-2 text-sm font-medium text-z-ink">How to improve</p>
                  <ul className="space-y-1.5 text-sm text-z-ink-soft">
                    {opportunity.cvFit.recommendations.map((r) => (
                      <li key={r} className="flex gap-2">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-z-brand" /> {r}
                      </li>
                    ))}
                  </ul>
                </div>
                <Link href="/tailored-cvs" className={cn(buttonVariants({ variant: "primary", size: "sm" }), "mt-4")}>
                  Create Tailored CV
                </Link>
              </Card>

              <LiveCVTailor opportunity={opportunity} />
            </TabsContent>

            {opportunity.author && (
              <TabsContent value="recruiter" className="flex flex-col gap-4">
                <RecruiterCard recruiter={opportunity.author} />
                <MessageGenerator recruiter={opportunity.author} opportunity={opportunity} />
              </TabsContent>
            )}
          </Tabs>
        </div>

        <div className="flex flex-col gap-4">
          <Card className="p-5">
            <h3 className="mb-3 text-[15px] font-semibold text-z-ink">Quick Info</h3>
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-z-ink-faint">Company</dt>
                <dd className="font-medium text-z-ink">{opportunity.company.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-z-ink-faint">Location</dt>
                <dd className="font-medium text-z-ink">{opportunity.location}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-z-ink-faint">Employment Type</dt>
                <dd className="font-medium capitalize text-z-ink">{opportunity.employmentType.replace("-", " ")}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-z-ink-faint">Level on listing</dt>
                <dd className="text-right font-medium capitalize text-z-ink">
                  {opportunity.seniority}
                  {opportunity.assessment && (
                    <span className="block text-[11px] font-normal normal-case text-z-ink-faint">
                      {opportunity.assessment.job.labelOrigin === "title" ? "from the title" : "assumed, not stated"}
                    </span>
                  )}
                </dd>
              </div>
              {salary && (
                <div className="flex justify-between">
                  <dt className="text-z-ink-faint">Salary Range</dt>
                  <dd className="font-medium text-z-ink">{salary}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-z-ink-faint">Fit concerns</dt>
                <dd className="font-medium text-z-ink">
                  {opportunity.assessment ? concernCounts(opportunity.assessment).total : 0}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-z-ink-faint">Trust concerns</dt>
                <dd className="font-medium text-z-ink">{opportunity.trust.concerns.length}</dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}

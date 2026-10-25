"use client";

import Link from "next/link";
import { UserCircle, MapPin, Link2, Globe, Briefcase, GraduationCap, FolderKanban } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SkillBadge } from "@/components/shared/skill-badge";
import { Avatar } from "@/components/shared/avatar";
import { ProfileSection } from "@/components/profile/profile-section";
import { EditHeadlineForm } from "@/components/profile/edit-headline-form";
import { CircularScore } from "@/components/ui/circular-score";
import { useCurrentUser } from "@/lib/hooks/use-user";
import { useQueryClient } from "@tanstack/react-query";
import { userRepository } from "@/lib/repositories";

export default function ProfilePage() {
  const { data: user } = useCurrentUser();
  const client = useQueryClient();

  if (!user) return <div className="h-96 animate-pulse rounded-2xl border border-z-border bg-white" />;

  const handleSaveHeadline = async (headline: string) => {
    await userRepository.updateProfile({ headline });
    client.invalidateQueries({ queryKey: ["current-user"] });
  };

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-z-brand-50 text-lg font-semibold text-z-brand-600">
            <Avatar url={user.avatarUrl} initials={user.avatarInitials} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-z-ink">{user.name}</h1>
            <p className="text-sm text-z-ink-faint">{user.primaryRole} · {user.location}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              {user.githubUrl && (
                <a href={user.githubUrl} className="inline-flex items-center gap-1 text-z-ink-soft hover:text-z-brand">
                  <Link2 className="h-3.5 w-3.5" /> GitHub
                </a>
              )}
              {user.linkedinUrl && (
                <a href={user.linkedinUrl} className="inline-flex items-center gap-1 text-z-ink-soft hover:text-z-brand">
                  <Link2 className="h-3.5 w-3.5" /> LinkedIn
                </a>
              )}
              {user.portfolioUrl && (
                <a href={user.portfolioUrl} className="inline-flex items-center gap-1 text-z-ink-soft hover:text-z-brand">
                  <Globe className="h-3.5 w-3.5" /> Portfolio
                </a>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-center">
          {user.cvScore === null ? (
            <Link href="/cv-analyzer" className="text-center text-xs text-z-ink-faint hover:text-z-brand hover:underline">
              Not analyzed yet
              <br />
              Analyze now →
            </Link>
          ) : (
            <CircularScore value={user.cvScore} label="CV score" />
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <ProfileSection title="Headline">
            <EditHeadlineForm user={user} onSave={handleSaveHeadline} />
          </ProfileSection>

          <ProfileSection title="Skills">
            <div className="flex flex-wrap gap-1.5">
              {user.skills.map((s) => (
                <SkillBadge key={s} skill={s} />
              ))}
            </div>
          </ProfileSection>

          <ProfileSection title="Experience">
            <div className="flex flex-col gap-4">
              {user.experience.map((exp) => (
                <div key={exp.id} className="flex gap-3 border-l-2 border-z-border pl-4">
                  <Briefcase className="mt-0.5 -ml-[21px] h-4 w-4 shrink-0 rounded-full bg-white text-z-brand" />
                  <div>
                    <p className="text-sm font-semibold text-z-ink">{exp.title}</p>
                    <p className="text-xs text-z-ink-faint">
                      {exp.company} · {exp.startDate} — {exp.endDate ?? "Present"}
                    </p>
                    <p className="mt-1 text-sm text-z-ink-soft">{exp.description}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {exp.skills.map((s) => (
                        <SkillBadge key={s} skill={s} muted />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ProfileSection>

          <ProfileSection title="Projects">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {user.projects.map((p) => (
                <div key={p.id} className="rounded-lg border border-z-border p-3">
                  <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-z-ink">
                    <FolderKanban className="h-3.5 w-3.5 text-z-brand" /> {p.name}
                  </p>
                  <p className="mt-1 text-xs text-z-ink-soft">{p.description}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {p.skills.map((s) => (
                      <SkillBadge key={s} skill={s} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ProfileSection>

          <ProfileSection title="Education">
            <div className="flex flex-col gap-2">
              {user.education.map((e) => (
                <div key={e.id} className="flex items-start gap-2">
                  <GraduationCap className="mt-0.5 h-4 w-4 shrink-0 text-z-brand" />
                  <div>
                    <p className="text-sm font-medium text-z-ink">{e.credential}</p>
                    <p className="text-xs text-z-ink-faint">
                      {e.school} · {e.startYear} — {e.endYear ?? "Present"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ProfileSection>
        </div>

        <div className="flex flex-col gap-4">
          <ProfileSection title="Related roles">
            <div className="flex flex-wrap gap-1.5">
              {user.relatedRoles.slice(0, 6).map((r) => (
                <Badge key={r.title} variant={r.relation === "related" ? "brand" : "neutral"}>
                  {r.title}
                </Badge>
              ))}
            </div>
          </ProfileSection>

          <ProfileSection title="Preferences">
            <dl className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-z-ink-faint">Remote preference</dt>
                <dd className="font-medium capitalize text-z-ink">{user.remotePreference.replace("-", " ")}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-z-ink-faint">Employment types</dt>
                <dd className="font-medium text-z-ink text-right">{user.employmentTypes.join(", ")}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-z-ink-faint">Salary expectation</dt>
                <dd className="font-medium text-z-ink">
                  ${user.salaryExpectation.min.toLocaleString()}–${user.salaryExpectation.max.toLocaleString()}/{user.salaryExpectation.period}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-z-ink-faint">Availability</dt>
                <dd className="font-medium text-z-ink">{user.availability}</dd>
              </div>
            </dl>
            <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-z-ink-faint">
              <MapPin className="h-3 w-3" /> Preferred: {user.preferredLocations.join(", ")}
            </p>
          </ProfileSection>

          <ProfileSection title="Plan">
            <p className="inline-flex items-center gap-1.5 text-sm">
              <UserCircle className="h-4 w-4 text-z-brand" />
              <span className="font-medium text-z-ink">Paid plans coming soon</span>
            </p>
            <a href="/pricing" className="mt-2 inline-block text-xs font-medium text-z-brand hover:underline">
              See what&apos;s coming →
            </a>
          </ProfileSection>
        </div>
      </div>
    </div>
  );
}

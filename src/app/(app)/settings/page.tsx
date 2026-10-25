"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Settings as SettingsIcon,
  User,
  SlidersHorizontal,
  Bell,
  Plug,
  Sparkles,
  Lock,
  CreditCard,
  FileEdit,
  X,
  Plus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { SkillBadge } from "@/components/shared/skill-badge";
import { AvatarUpload } from "@/components/settings/avatar-upload";
import { CVManager } from "@/components/settings/cv-manager";
import { ChangePassword } from "@/components/settings/change-password";
import { DeleteAccount } from "@/components/settings/delete-account";
import { useCurrentUser } from "@/lib/hooks/use-user";
import { userRepository } from "@/lib/repositories";

const roleOptions = [
  "Frontend Developer",
  "Backend Developer",
  "Full-Stack Developer",
  "UI Engineer",
  "Product Designer",
  "Data Analyst",
  "Product Manager",
  "QA Engineer",
  "DevOps Engineer",
  "Other",
];

export default function SettingsPage() {
  const { data: user } = useCurrentUser();
  const client = useQueryClient();

  const [aiPrefs, setAiPrefs] = useState({
    autoAnalyze: true,
    tone: "professional",
    aggressiveness: "balanced",
  });

  const [privacy, setPrivacy] = useState({
    shareAnonymizedData: false,
    profileDiscoverable: true,
  });

  // Profile form state — kept local until "Save changes" is pressed, then
  // written through the repository (see /docs/backend-integration.md).
  const [name, setName] = useState(user?.name ?? "");
  const [headline, setHeadline] = useState(user?.headline ?? "");
  const [role, setRole] = useState(user?.primaryRole ?? "");
  // Manual fallback: CV extraction estimates this on upload (see onboarding),
  // but that estimate is often wrong or missing, and until now there was no
  // way to set it at all — it stayed at 0 for every real user. Kept as a
  // string while typing so the field can be briefly empty instead of
  // snapping to 0 as soon as the person clears it.
  const [yearsExperience, setYearsExperience] = useState(String(user?.yearsExperience ?? 0));
  const [location, setLocation] = useState(user?.location ?? "");
  const [skills, setSkills] = useState<string[]>(user?.skills ?? []);
  const [newSkill, setNewSkill] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [saved, setSaved] = useState(false);

  // Opportunity Preferences state — this section previously used
  // `defaultValue` with no onChange and no Save button at all, so nothing
  // typed here ever persisted anywhere. Now a real controlled section,
  // same pattern as the Profile card above.
  const [remotePref, setRemotePref] = useState(user?.remotePreference ?? "remote-first");
  const [minMatchScore, setMinMatchScore] = useState(user?.minMatchScore ?? 80);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefsSaved, setPrefsSaved] = useState(false);

  // useState only reads its starting value on the first render. If this page
  // is opened directly (or refreshed), `user` hasn't loaded yet at that
  // point, so every field above would start blank and stay blank — and
  // pressing "Save changes" would then overwrite the real profile with
  // those blank values. This fills the form once the user actually arrives.
  // It depends on user?.id only, so the refetch after each save doesn't
  // reset whatever the person is currently typing. It must stay above the
  // early return below (React requires hooks to run on every render).
  // Intentional: fills the form once when the user first arrives (see comment above).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setHeadline(user.headline);
    setRole(user.primaryRole);
    setYearsExperience(String(user.yearsExperience));
    setLocation(user.location);
    setSkills(user.skills);
    setRemotePref(user.remotePreference);
    setMinMatchScore(user.minMatchScore);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!user) return <div className="h-96 animate-pulse rounded-2xl border border-z-border bg-white" />;

  const addSkill = () => {
    const trimmed = newSkill.trim();
    if (trimmed && !skills.includes(trimmed)) setSkills((s) => [...s, trimmed]);
    setNewSkill("");
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    // BACKEND INTEGRATION:
    // Replace this mock service with the Supabase/API implementation.
    // PATCH /profiles/:id — see /docs/backend-integration.md
    const parsedYears = Math.max(0, Math.round(Number(yearsExperience)) || 0);
    await userRepository.updateProfile({ name, headline, primaryRole: role, yearsExperience: parsedYears, location, skills });
    client.invalidateQueries({ queryKey: ["current-user"] });
    setSavingProfile(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const savePreferences = async () => {
    setSavingPrefs(true);
    await userRepository.updateProfile({
      remotePreference: remotePref as "remote-only" | "remote-first" | "hybrid" | "onsite",
      minMatchScore,
    });
    client.invalidateQueries({ queryKey: ["current-user"] });
    setSavingPrefs(false);
    setPrefsSaved(true);
    setTimeout(() => setPrefsSaved(false), 2000);
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="inline-flex items-center gap-2 text-xl font-semibold text-z-ink sm:text-2xl">
          <SettingsIcon className="h-5 w-5 text-z-brand" /> Settings
        </h1>
        <p className="mt-1 text-sm text-z-ink-faint">Manage your account, preferences and connected data.</p>
      </div>

      <Card>
        <CardHeader className="flex-col items-start gap-0.5">
          <CardTitle className="inline-flex items-center gap-1.5">
            <User className="h-4 w-4 text-z-brand" /> Profile
          </CardTitle>
          <CardDescription>What you do, your CV, and your role — visible to recruiters if you allow it.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <AvatarUpload initials={user.avatarInitials} currentUrl={user.avatarUrl} />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-z-ink-faint">Full name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-z-ink-faint">Location</label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-z-ink-faint">Headline</label>
            <Input value={headline} onChange={(e) => setHeadline(e.target.value)} />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-z-ink-faint">Primary role</label>
              <Select value={role} onChange={(e) => setRole(e.target.value)}>
                {[role, ...roleOptions.filter((r) => r !== role)].map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-z-ink-faint">Years of experience</label>
              <Input
                type="number"
                min={0}
                max={60}
                value={yearsExperience}
                onChange={(e) => setYearsExperience(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs text-z-ink-faint">Skills</label>
            <div className="flex flex-wrap gap-1.5">
              {skills.map((s) => (
                <span key={s} className="inline-flex items-center gap-1">
                  <SkillBadge skill={s} />
                  <button onClick={() => setSkills((arr) => arr.filter((x) => x !== s))} className="text-z-ink-faint hover:text-z-danger">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <Input
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                placeholder="Add a skill…"
                className="max-w-[200px]"
              />
              <Button size="sm" variant="secondary" onClick={addSkill} disabled={!newSkill.trim()}>
                <Plus className="h-3.5 w-3.5" /> Add
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <Button size="sm" onClick={saveProfile} disabled={savingProfile}>
              {savingProfile ? "Saving…" : "Save changes"}
            </Button>
            {saved && <span className="text-xs font-medium text-z-success">Saved</span>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-col items-start gap-0.5">
          <CardTitle className="inline-flex items-center gap-1.5">
            <FileEdit className="h-4 w-4 text-z-brand" /> CV & Documents
          </CardTitle>
          <CardDescription>Upload a new CV or discard the current one.</CardDescription>
        </CardHeader>
        <CardContent>
          <CVManager user={user} />
        </CardContent>
      </Card>


      <Card>
        <CardHeader className="flex-col items-start gap-0.5">
          <CardTitle className="inline-flex items-center gap-1.5">
            <SlidersHorizontal className="h-4 w-4 text-z-brand" /> Opportunity Preferences
          </CardTitle>
          <CardDescription>What kinds of opportunities Zyphnaro should prioritize.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-z-ink-faint">Remote preference</label>
              <Select
                value={remotePref}
                onChange={(e) => setRemotePref(e.target.value as "remote-only" | "remote-first" | "hybrid" | "onsite")}
              >
                <option value="remote-only">Remote only</option>
                <option value="remote-first">Remote first</option>
                <option value="hybrid">Hybrid</option>
                <option value="onsite">Onsite</option>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-z-ink-faint">Minimum match score to notify</label>
              <Select value={String(minMatchScore)} onChange={(e) => setMinMatchScore(Number(e.target.value))}>
                <option value="60">60%</option>
                <option value="70">70%</option>
                <option value="80">80%</option>
                <option value="90">90%</option>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button size="sm" onClick={savePreferences} disabled={savingPrefs}>
              {savingPrefs ? "Saving…" : "Save changes"}
            </Button>
            {prefsSaved && <span className="text-xs font-medium text-z-success">Saved</span>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-col items-start gap-0.5">
          <CardTitle className="inline-flex items-center gap-1.5">
            <Bell className="h-4 w-4 text-z-brand" /> Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <PrefRow
            label="New job match alerts"
            checked={user.notifyHighMatch ?? true}
            onChange={async (v) => {
              await userRepository.updateProfile({ notifyHighMatch: v });
              client.invalidateQueries({ queryKey: ["current-user"] });
            }}
          />
          <p className="-mt-1 text-xs text-z-ink-faint">
            Get a notification when a newly posted job matches your CV skills and your minimum match score below.
          </p>
          {["Trust & safety concerns", "CV improvement tips", "Interview reminders", "Weekly digest email"].map((label) => (
            <div key={label} className="flex items-center justify-between opacity-60">
              <span className="text-sm text-z-ink-soft">{label}</span>
              <span className="rounded-full bg-z-surface px-2.5 py-0.5 text-xs font-medium text-z-ink-faint">Coming soon</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-col items-start gap-0.5">
          <CardTitle className="inline-flex items-center gap-1.5">
            <Plug className="h-4 w-4 text-z-brand" /> Connected Sources
          </CardTitle>
          <CardDescription>Manage which platforms Zyphnaro scans for opportunities.</CardDescription>
        </CardHeader>
        <CardContent>
          <a href="/sources" className="text-sm font-medium text-z-brand hover:underline">
            Manage sources →
          </a>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-col items-start gap-0.5">
          <CardTitle className="inline-flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-z-brand" /> AI Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <PrefRow
            label="Auto-analyze new high-match opportunities"
            checked={aiPrefs.autoAnalyze}
            onChange={(v) => setAiPrefs((p) => ({ ...p, autoAnalyze: v }))}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-z-ink-faint">Recruiter message tone</label>
              <Select value={aiPrefs.tone} onChange={(e) => setAiPrefs((p) => ({ ...p, tone: e.target.value }))}>
                <option value="professional">Professional</option>
                <option value="friendly">Friendly</option>
                <option value="concise">Concise</option>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-z-ink-faint">Interview coaching style</label>
              <Select value={aiPrefs.aggressiveness} onChange={(e) => setAiPrefs((p) => ({ ...p, aggressiveness: e.target.value }))}>
                <option value="gentle">Gentle</option>
                <option value="balanced">Balanced</option>
                <option value="rigorous">Rigorous</option>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-col items-start gap-0.5">
          <CardTitle className="inline-flex items-center gap-1.5">
            <Lock className="h-4 w-4 text-z-brand" /> Privacy
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <PrefRow
            label="Allow anonymized data to improve matching"
            checked={privacy.shareAnonymizedData}
            onChange={(v) => setPrivacy((p) => ({ ...p, shareAnonymizedData: v }))}
          />
          <PrefRow
            label="Make profile discoverable to recruiters"
            checked={privacy.profileDiscoverable}
            onChange={(v) => setPrivacy((p) => ({ ...p, profileDiscoverable: v }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-col items-start gap-0.5">
          <CardTitle className="inline-flex items-center gap-1.5">
            <CreditCard className="h-4 w-4 text-z-brand" /> Subscription
          </CardTitle>
          <CardDescription>Paid plans are coming soon.</CardDescription>
        </CardHeader>
        <CardContent>
          <a href="/pricing" className="text-sm font-medium text-z-brand hover:underline">
            See what&apos;s coming →
          </a>
        </CardContent>
      </Card>

      <ChangePassword />

      <DeleteAccount />
    </div>
  );
}

function PrefRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-z-ink-soft">{label}</span>
      <Switch checked={checked} onChange={onChange} label={label} />
    </div>
  );
}
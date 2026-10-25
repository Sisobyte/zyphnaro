"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  Radar,
  User,
  Briefcase,
  FileUp,
  Plug,
  Check,
  ArrowRight,
  ArrowLeft,
  Upload,
  FileText,
  X,
  Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SkillBadge } from "@/components/shared/skill-badge";
import { SourceCard } from "@/components/sources/source-card";
import { cn } from "@/lib/utils";
import { userRepository } from "@/lib/repositories";
import { useSources, useToggleSource } from "@/lib/hooks/use-sources";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";
import type { CVExtractionResult } from "@/lib/types";

const steps = [
  { key: "basics", label: "Your details", icon: User },
  { key: "cv", label: "CV & portfolio", icon: FileUp },
  { key: "role", label: "Your job profile", icon: Briefcase },
  { key: "sources", label: "Connect sources", icon: Plug },
];

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function OnboardingPage() {
  const router = useRouter();
  const client = useQueryClient();
  const { data: sources = [] } = useSources();
  const toggleMutation = useToggleSource();

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [name, setName] = useState(() =>
    typeof window === "undefined" ? "" : sessionStorage.getItem("zyphnaro-onboarding-name") ?? ""
  );
  const [email, setEmail] = useState(() =>
    typeof window === "undefined" ? "" : sessionStorage.getItem("zyphnaro-onboarding-email") ?? ""
  );
  const [phone, setPhone] = useState("");

  // Open text, not a fixed dropdown — Zyphnaro is built around whatever
  // work someone actually wants, not a predefined list of job titles.
  const [role, setRole] = useState("");
  const [seniority, setSeniority] = useState<"intern" | "junior" | "mid" | "senior" | "lead">("junior");
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState("");

  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvError, setCvError] = useState<string | null>(null);
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");

  const [extracting, setExtracting] = useState(false);
  const [extraction, setExtraction] = useState<CVExtractionResult | null>(null);
  const [extractError, setExtractError] = useState<string | null>(null);

  // Real Supabase mode: the mock signup branch is the only place that fills
  // sessionStorage, so read the name and email from the signed-in session.
  // Values the person already typed are never overwritten.
  useEffect(() => {
    if (!isSupabaseConfigured) return; // mock mode already uses sessionStorage
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        const u = data.user;
        if (!u) return;
        setEmail((e) => e || u.email || "");
        setName((n) => n || (u.user_metadata?.name as string) || "");
      });
  }, []);

  const connectedCount = sources.filter((s) => s.status === "connected").length;

  const next = () => setStep((s) => Math.min(steps.length - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  const onSelectCv = (file: File | null) => {
    setCvError(null);
    setExtraction(null);
    setExtractError(null);
    if (!file) return;
    if (file.type !== "application/pdf") {
      setCvError("Please upload a PDF file — other formats aren't supported yet.");
      return;
    }
    setCvFile(file);
  };

  const extractFromCv = async () => {
    if (!cvFile) return;
    setExtracting(true);
    setExtractError(null);
    try {
      // AI INTEGRATION:
      // Calls the server-side /api/cv/extract-profile route — never an AI
      // provider directly. Resolves to GeminiAIService when configured,
      // MockAIService otherwise. See /docs/ai-integration.md
      const base64 = await fileToBase64(cvFile);
      const res = await fetch("/api/cv/extract-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cvFileBase64: base64, cvFileMimeType: "application/pdf" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't read that CV.");
      const result = data.result as CVExtractionResult;
      setExtraction(result);
      setRole(result.suggestedRole);
      setSkills(result.skills);
      if (result.yearsExperience !== undefined) {
        setSeniority(result.yearsExperience >= 6 ? "senior" : result.yearsExperience >= 3 ? "mid" : "junior");
      }
    } catch (e) {
      setExtractError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setExtracting(false);
    }
  };

  const addSkill = () => {
    const trimmed = newSkill.trim();
    if (trimmed && !skills.includes(trimmed)) setSkills((s) => [...s, trimmed]);
    setNewSkill("");
  };

  const finish = async () => {
    setSaving(true);
    setSaveError(null);

    // BACKEND INTEGRATION:
    // The CV chosen in step 2 was only ever used for AI extraction up to
    // this point (sent inline as base64, never persisted) — this is the
    // step that actually uploads it to Storage, same as CVManager in
    // Settings does. Without this, the file the person just picked never
    // gets saved anywhere, and Settings would show "no CV uploaded" even
    // though extraction clearly ran. See /docs/backend-integration.md
    let cvFields: { cvFileName?: string; cvStoragePath?: string; cvUploadedAt?: string } = {};
    if (cvFile && isSupabaseConfigured) {
      try {
        const supabase = createClient();
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();
        if (authUser) {
          const path = `${authUser.id}/resume.pdf`;
          const { error: uploadError } = await supabase.storage
            .from("cv-documents")
            .upload(path, cvFile, { upsert: true, contentType: "application/pdf" });
          if (!uploadError) {
            cvFields = { cvFileName: cvFile.name, cvStoragePath: path, cvUploadedAt: new Date().toISOString() };
          }
        }
      } catch {
        // Non-fatal — profile setup still completes even if the upload
        // failed; the person can upload again from Settings.
      }
    } else if (cvFile && !isSupabaseConfigured) {
      // MOCK MODE: no real storage to upload to — record the filename only,
      // matching CVManager's own mock-mode behavior.
      cvFields = { cvFileName: cvFile.name, cvUploadedAt: new Date().toISOString() };
    }

    // AI-extracted experience/projects/education need a client-generated
    // id (the app's ExperienceEntry/Project/EducationEntry types require
    // one; the AI extraction result doesn't produce one on its own).
    const extractedFields = extraction
      ? {
          experience: extraction.experience.map((e) => ({ id: crypto.randomUUID(), ...e })),
          projects: extraction.projects.map((p) => ({ id: crypto.randomUUID(), ...p })),
          education: extraction.education.map((ed) => ({ id: crypto.randomUUID(), ...ed })),
          // Was previously only read to pick a seniority level (above) and
          // then discarded — never actually saved, so `years_experience`
          // stayed at its default 0 for every real user regardless of what
          // their CV said.
          ...(extraction.yearsExperience !== undefined ? { yearsExperience: extraction.yearsExperience } : {}),
        }
      : {};

    try {
      await userRepository.updateProfile({
        name: name || undefined,
        phone: phone || undefined,
        primaryRole: role || "Not specified",
        seniority,
        skills: skills.length ? skills : undefined,
        portfolioUrl: portfolioUrl || undefined,
        githubUrl: githubUrl || undefined,
        linkedinUrl: linkedinUrl || undefined,
        ...cvFields,
        ...extractedFields,
        // Marks onboarding as done so the (app) layout stops redirecting
        // this person back here.
        onboardingCompleted: true,
      });
    } catch {
      // If the save fails, stay on this page. Otherwise the (app) layout
      // would send the person straight back to onboarding with no
      // explanation.
      setSaving(false);
      setSaveError("Couldn't save your profile. Check your connection and try again.");
      return;
    }

    client.invalidateQueries({ queryKey: ["current-user"] });
    await new Promise((r) => setTimeout(r, 400));
    router.push("/dashboard");
  };

  return (
    <div className="min-h-dvh bg-z-surface px-4 py-8 sm:py-12">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-z-brand text-white">
            <Radar className="h-4.5 w-4.5" />
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-z-ink">Zyphnaro</span>
        </div>

        <div>
          <h1 className="text-xl font-semibold text-z-ink sm:text-2xl">Let&apos;s build your job profile</h1>
          <p className="mt-1 text-sm text-z-ink-faint">
            Zyphnaro isn&apos;t just for developers — tell us what kind of work you want, whatever field it&apos;s in.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {steps.map((s, i) => {
            const Icon = s.icon;
            const active = i === step;
            const done = i < step;
            return (
              <div key={s.key} className="flex flex-1 items-center gap-2">
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                    done
                      ? "border-z-brand bg-z-brand text-white"
                      : active
                      ? "border-z-brand bg-z-brand-50 text-z-brand-600"
                      : "border-z-border-strong bg-white text-z-ink-faint"
                  )}
                >
                  {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                {i < steps.length - 1 && (
                  <div className={cn("h-0.5 flex-1 rounded-full", done ? "bg-z-brand" : "bg-z-border")} />
                )}
              </div>
            );
          })}
        </div>
        <p className="-mt-4 text-xs font-medium text-z-ink-faint">
          Step {step + 1} of {steps.length} · {steps[step].label}
        </p>

        <Card className="p-5 sm:p-6">
          {step === 0 && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-z-ink-soft">Full name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-z-ink-soft">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  // In real auth mode this is the login email and can't be
                  // changed here, so lock it once it has been filled in.
                  disabled={isSupabaseConfigured && !!email}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-z-ink-soft">
                  Phone number <span className="font-normal text-z-ink-faint">(optional)</span>
                </label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 000 0000" />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-z-ink-soft">Upload your CV</label>
                {cvFile ? (
                  <div className="flex items-center justify-between rounded-lg border border-z-border bg-z-surface p-3">
                    <span className="inline-flex items-center gap-2 text-sm text-z-ink">
                      <FileText className="h-4 w-4 text-z-brand" /> {cvFile.name}
                    </span>
                    <button
                      onClick={() => {
                        setCvFile(null);
                        setExtraction(null);
                      }}
                      className="text-z-ink-faint hover:text-z-danger"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-z-border-strong p-6 text-center hover:bg-z-surface">
                    <Upload className="h-5 w-5 text-z-ink-faint" />
                    <span className="text-sm font-medium text-z-ink">Click to upload your CV</span>
                    <span className="text-xs text-z-ink-faint">PDF only, up to 5MB</span>
                    <input
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={(e) => onSelectCv(e.target.files?.[0] ?? null)}
                    />
                  </label>
                )}
                {cvError && <p className="mt-1.5 text-xs text-z-danger">{cvError}</p>}
              </div>

              {cvFile && !extraction && (
                <Button variant="secondary" size="sm" onClick={extractFromCv} disabled={extracting} className="w-fit">
                  <Sparkles className="h-3.5 w-3.5" /> {extracting ? "Reading your CV…" : "Extract role & skills from CV"}
                </Button>
              )}
              {extractError && <p className="text-xs text-z-danger">{extractError}</p>}
              {extraction && (
                <div className="rounded-lg border border-z-success/30 bg-z-success-bg/40 p-3">
                  <p className="text-xs font-medium text-z-success">
                    Extracted from your CV — suggested role, skills and experience level pre-filled on the next step.
                    You can edit any of it.
                  </p>
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-medium text-z-ink-soft">
                  Portfolio URL <span className="font-normal text-z-ink-faint">(optional)</span>
                </label>
                <Input value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} placeholder="https://yourportfolio.com" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-z-ink-soft">
                  GitHub URL <span className="font-normal text-z-ink-faint">(optional)</span>
                </label>
                <Input value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} placeholder="https://github.com/you" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-z-ink-soft">
                  LinkedIn URL <span className="font-normal text-z-ink-faint">(optional)</span>
                </label>
                <Input value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/you" />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-z-ink-soft">
                  What kind of work are you looking for?
                </label>
                <Input
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g. Digital Marketing, Data Analysis, Virtual Assistant, Frontend Development…"
                />
                <p className="mt-1 text-xs text-z-ink-faint">
                  Zyphnaro works for any field — describe it in your own words, not from a fixed list.
                </p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-z-ink-soft">Experience level</label>
                <div className="flex flex-wrap gap-1.5">
                  {(["intern", "junior", "mid", "senior", "lead"] as const).map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setSeniority(lvl)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-medium capitalize",
                        seniority === lvl
                          ? "border-z-brand bg-z-brand-50 text-z-brand-600"
                          : "border-z-border-strong text-z-ink-soft hover:bg-z-surface"
                      )}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-z-ink-soft">Skills</label>
                {skills.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {skills.map((s) => (
                      <span key={s} className="inline-flex items-center gap-1">
                        <SkillBadge skill={s} />
                        <button onClick={() => setSkills((arr) => arr.filter((x) => x !== s))} className="text-z-ink-faint hover:text-z-danger">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                    placeholder="Add a skill…"
                    className="max-w-50"
                  />
                  <Button size="sm" variant="secondary" onClick={addSkill} disabled={!newSkill.trim()}>
                    Add
                  </Button>
                </div>
              </div>
              <p className="text-xs text-z-ink-faint">
                Don&apos;t worry about getting this perfect — you can explore related and adjacent roles later in Role Explorer.
              </p>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-z-ink-soft">
                Zyphnaro finds opportunities from these sources. They&apos;re all switched on to start with. Turn off any you
                don&apos;t want, and a source&apos;s jobs disappear from your lists. You can change this any time on the Sources page.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {sources
                  // Only sources that can actually be switched on or off. Planned and
                  // limited ones can't be connected yet, so they don't belong here.
                  .filter((s) => s.status === "connected" || s.status === "available")
                  .map((s) => (
                    <SourceCard key={s.id} source={s} onToggle={(id) => toggleMutation.mutate(id)} />
                  ))}
              </div>
              <p className="text-xs text-z-ink-faint">
                {connectedCount === 0
                  ? "All sources are off. You won't see any opportunities until you switch at least one on."
                  : `${connectedCount} source${connectedCount === 1 ? "" : "s"} switched on.`}
              </p>
            </div>
          )}
        </Card>

        {saveError && <p className="rounded-lg bg-z-danger-bg px-3 py-2 text-xs text-z-danger">{saveError}</p>}

        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={back} disabled={step === 0}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          {step < steps.length - 1 ? (
            <Button onClick={next}>
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={finish} disabled={saving}>
              {saving ? "Setting up…" : "Finish setup"} <Check className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
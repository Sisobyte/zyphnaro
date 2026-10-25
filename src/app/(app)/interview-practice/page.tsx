"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { History, MessagesSquare, Code2, Users, Target, Building2, Layers, Keyboard, Mic } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { InterviewDifficulty, InterviewMode } from "@/lib/types";

const modes: { key: InterviewMode; label: string; icon: typeof Code2; description: string }[] = [
  { key: "technical", label: "Technical Interview", icon: Code2, description: "React, TypeScript and problem solving." },
  { key: "behavioral", label: "Behavioral Interview", icon: Users, description: "How you work with others and handle challenges." },
  { key: "role-focused", label: "Role-Focused Interview", icon: Target, description: "Questions specific to your target role." },
  { key: "company", label: "Company Interview", icon: Building2, description: "Motivation and product-sense questions." },
  { key: "full-mock", label: "Full Mock Interview", icon: Layers, description: "A complete end-to-end interview simulation." },
];

const difficulties: { key: InterviewDifficulty; label: string }[] = [
  { key: "friendly", label: "Friendly" },
  { key: "realistic", label: "Realistic" },
  { key: "challenging", label: "Challenging" },
];

const durations: (10 | 20 | 30)[] = [10, 20, 30];

const responseMethods: { key: "text" | "voice"; label: string; icon: typeof Keyboard; description: string }[] = [
  { key: "text", label: "Type my answers", icon: Keyboard, description: "Classic text-based practice." },
  { key: "voice", label: "Speak my answers", icon: Mic, description: "The AI reads questions aloud — you answer by voice." },
];

export default function InterviewPracticePage() {
  const router = useRouter();
  const [mode, setMode] = useState<InterviewMode>("technical");
  const [difficulty, setDifficulty] = useState<InterviewDifficulty>("realistic");
  const [duration, setDuration] = useState<10 | 20 | 30>(20);
  const [responseMethod, setResponseMethod] = useState<"text" | "voice">("text");

  const start = () => {
    const params = new URLSearchParams({ mode, difficulty, duration: String(duration), method: responseMethod });
    router.push(`/interview-practice/session?${params.toString()}`);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="inline-flex items-center gap-2 text-xl font-semibold text-z-ink sm:text-2xl">
            <MessagesSquare className="h-5 w-5 text-z-brand" /> Interview Practice
          </h1>
          <p className="mt-1 text-sm text-z-ink-faint">Practice like the real interview.</p>
        </div>
        <Link
          href="/interview-practice/saved"
          className="inline-flex items-center gap-1.5 rounded-lg border border-z-border-strong bg-white px-3 py-2 text-sm font-medium text-z-ink-soft hover:bg-z-surface"
        >
          <History className="h-4 w-4" /> View saved interviews
        </Link>
      </div>

      <section>
        <h2 className="mb-3 text-[15px] font-semibold text-z-ink">Interview type</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {modes.map((m) => {
            const Icon = m.icon;
            const active = mode === m.key;
            return (
              <button key={m.key} onClick={() => setMode(m.key)} className="text-left">
                <Card
                  className={cn(
                    "flex h-full flex-col gap-2 p-4 transition-colors",
                    active && "border-z-brand bg-z-brand-50/40"
                  )}
                >
                  <Icon className={cn("h-5 w-5", active ? "text-z-brand" : "text-z-ink-faint")} />
                  <p className="text-sm font-semibold text-z-ink">{m.label}</p>
                  <p className="text-xs text-z-ink-faint">{m.description}</p>
                </Card>
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <section>
          <h2 className="mb-3 text-[15px] font-semibold text-z-ink">Difficulty</h2>
          <div className="flex gap-2">
            {difficulties.map((d) => (
              <button
                key={d.key}
                onClick={() => setDifficulty(d.key)}
                className={cn(
                  "flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium",
                  difficulty === d.key
                    ? "border-z-brand bg-z-brand-50 text-z-brand-600"
                    : "border-z-border-strong text-z-ink-soft hover:bg-z-surface"
                )}
              >
                {d.label}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-[15px] font-semibold text-z-ink">Duration</h2>
          <div className="flex gap-2">
            {durations.map((d) => (
              <button
                key={d}
                onClick={() => setDuration(d)}
                className={cn(
                  "flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium",
                  duration === d
                    ? "border-z-brand bg-z-brand-50 text-z-brand-600"
                    : "border-z-border-strong text-z-ink-soft hover:bg-z-surface"
                )}
              >
                {d} minutes
              </button>
            ))}
          </div>
        </section>
      </div>

      <section>
        <h2 className="mb-3 text-[15px] font-semibold text-z-ink">How do you want to answer?</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {responseMethods.map((m) => {
            const Icon = m.icon;
            const active = responseMethod === m.key;
            return (
              <button key={m.key} onClick={() => setResponseMethod(m.key)} className="text-left">
                <Card
                  className={cn(
                    "flex h-full items-start gap-3 p-4 transition-colors",
                    active && "border-z-brand bg-z-brand-50/40"
                  )}
                >
                  <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", active ? "text-z-brand" : "text-z-ink-faint")} />
                  <div>
                    <p className="text-sm font-semibold text-z-ink">{m.label}</p>
                    <p className="text-xs text-z-ink-faint">{m.description}</p>
                  </div>
                </Card>
              </button>
            );
          })}
        </div>
      </section>

      <Button onClick={start} size="lg" className="w-full sm:w-fit">
        Start Interview
      </Button>
    </div>
  );
}

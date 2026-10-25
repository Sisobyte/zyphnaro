"use client";

import { useState } from "react";
import { Sparkles, Copy, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/lib/hooks/use-user";
import type { Recruiter, Opportunity } from "@/lib/types";

const channels = [
  { key: "linkedin" as const, label: "LinkedIn message" },
  { key: "email" as const, label: "Email" },
  { key: "dm" as const, label: "Short DM" },
];

export function MessageGenerator({ recruiter, opportunity }: { recruiter: Recruiter; opportunity: Opportunity }) {
  const { data: user } = useCurrentUser();
  const [channel, setChannel] = useState<(typeof channels)[number]["key"]>("linkedin");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    if (!user) return;
    setLoading(true);
    setMessage(null);
    setError(null);
    // AI INTEGRATION:
    // Calls the server-side /api/recruiters/message route rather than an
    // AI provider directly — the API key never reaches the browser. That
    // route resolves to GeminiAIService when configured, MockAIService
    // otherwise. See /docs/ai-integration.md
    try {
      const res = await fetch("/api/recruiters/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel,
          recruiterName: recruiter.name.split(" ")[0],
          company: opportunity.company.name,
          opportunityTitle: opportunity.title,
          userName: user.name,
          userHeadline: user.headline,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't generate a message.");
      setMessage(data.message as string);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const copy = () => {
    if (!message) return;
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-z-brand" />
        <h3 className="text-[15px] font-semibold text-z-ink">Generate recruiter message</h3>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {channels.map((c) => (
          <button
            key={c.key}
            onClick={() => {
              setChannel(c.key);
              setMessage(null);
            }}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium",
              channel === c.key
                ? "border-z-brand bg-z-brand-50 text-z-brand-600"
                : "border-z-border-strong text-z-ink-soft hover:bg-z-surface"
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      <Button onClick={generate} disabled={loading || !user} className="mt-3 w-full" size="sm">
        {loading ? "Generating…" : "Generate message"}
      </Button>

      {error && <p className="mt-3 rounded-lg bg-z-danger-bg px-3 py-2 text-xs text-z-danger">{error}</p>}

      {message && (
        <div className="mt-3 rounded-lg border border-z-border bg-z-surface p-3">
          <pre className="whitespace-pre-wrap font-sans text-sm text-z-ink">{message}</pre>
          <button
            onClick={copy}
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-z-brand hover:underline"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      )}
    </Card>
  );
}

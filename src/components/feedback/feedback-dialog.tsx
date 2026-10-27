"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { FEEDBACK_CATEGORIES } from "@/lib/feedback";

const LABEL: Record<(typeof FEEDBACK_CATEGORIES)[number], string> = {
  bug: "Something is broken",
  idea: "I have an idea",
  praise: "Something I like",
  other: "Something else",
};

export function FeedbackDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const [category, setCategory] = useState<(typeof FEEDBACK_CATEGORIES)[number]>("idea");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    onClose();
    if (state === "sent") { setState("idle"); setMessage(""); }
  };

  const send = async () => {
    setState("sending");
    setError(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, message, page: pathname }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Couldn't send that.");
      setState("sent");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send that.");
      setState("idle");
    }
  };

  return (
    <Dialog open={open} onClose={close} title="Send feedback" className="max-w-md">
      {state === "sent" ? (
        <div className="space-y-4 p-5">
          <p className="text-sm text-z-ink">Thank you. The team reads every message.</p>
          <div className="flex justify-end"><Button onClick={close}>Close</Button></div>
        </div>
      ) : (
        <div className="space-y-3 p-5">
          <Select value={category} onChange={(e) => setCategory(e.target.value as typeof category)} aria-label="Type of feedback">
            {FEEDBACK_CATEGORIES.map((c) => <option key={c} value={c}>{LABEL[c]}</option>)}
          </Select>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={2000}
            rows={5}
            placeholder="Tell us what happened or what you'd like to see."
            className="w-full rounded-lg border border-z-border-strong bg-white p-3 text-sm text-z-ink focus:border-z-brand focus:outline-none focus:ring-2 focus:ring-z-brand/40"
          />
          {error && <p role="alert" className="text-sm text-z-danger">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={close}>Cancel</Button>
            <Button disabled={message.trim().length < 3 || state === "sending"} onClick={send}>{state === "sending" ? "Sending…" : "Send"}</Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}

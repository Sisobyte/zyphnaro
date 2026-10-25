"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Timer, LogOut, Mic, Square, Volume2, Keyboard } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InterviewQuestionPanel } from "@/components/interview/interview-question";
import { InterviewProgress } from "@/components/interview/interview-progress";
import { useCurrentUser } from "@/lib/hooks/use-user";
import { useSpeechSynthesis } from "@/lib/hooks/use-speech-synthesis";
import { useSpeechRecognition } from "@/lib/hooks/use-speech-recognition";
import { computeInterviewResult } from "@/lib/interview-results";
import { cn } from "@/lib/utils";
import type {
  InterviewAnswerInput,
  InterviewDifficulty,
  InterviewEvaluation,
  InterviewMode,
  InterviewQuestion,
  InterviewQuestionInput,
  InterviewTurn,
} from "@/lib/types";

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// AI INTEGRATION:
// These call the server-side /api/ai/interview/* routes rather than an AI
// provider directly — the API key never reaches the browser. Those routes
// resolve to GeminiAIService when configured, MockAIService otherwise.
// See /docs/ai-integration.md
async function requestQuestion(input: InterviewQuestionInput): Promise<InterviewQuestion> {
  const res = await fetch("/api/ai/interview/question", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Couldn't generate the next question.");
  return data.question as InterviewQuestion;
}

async function requestEvaluation(input: InterviewAnswerInput): Promise<InterviewEvaluation> {
  const res = await fetch("/api/ai/interview/evaluate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Couldn't evaluate that answer.");
  return data.evaluation as InterviewEvaluation;
}

export default function InterviewSessionPage() {
  return (
    <Suspense fallback={<div className="mx-auto h-96 max-w-2xl animate-pulse rounded-2xl border border-z-border bg-white" />}>
      <InterviewSessionInner />
    </Suspense>
  );
}

function InterviewSessionInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { data: user } = useCurrentUser();
  const tts = useSpeechSynthesis();
  const stt = useSpeechRecognition();

  const mode = (params.get("mode") as InterviewMode) ?? "technical";
  const difficulty = (params.get("difficulty") as InterviewDifficulty) ?? "realistic";
  const durationMinutes = Number(params.get("duration") ?? 20);
  const totalQuestions = Math.max(3, Math.min(6, Math.round(durationMinutes / 5)));
  const requestedVoice = params.get("method") === "voice";

  // Voice mode silently falls back to text if the browser doesn't support
  // speech recognition, but the person can also switch manually at any time.
  const [useVoice, setUseVoice] = useState(requestedVoice);

  const [turns, setTurns] = useState<InterviewTurn[]>([]);
  const [current, setCurrent] = useState<InterviewQuestion | null>(null);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(true);
  const [ending, setEnding] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(durationMinutes * 60);
  const [sessionError, setSessionError] = useState<string | null>(null);

  // Refs let the timer's interval callback (set up once) always read the
  // latest in-progress state without re-subscribing every render.
  const turnsRef = useRef<InterviewTurn[]>([]);
  const endedRef = useRef(false);

  const finishInterview = (finalTurns: InterviewTurn[]) => {
    if (endedRef.current) return;
    endedRef.current = true;
    setEnding(true);
    tts.stop();
    if (stt.listening) stt.stop();
    const result = computeInterviewResult(finalTurns, totalQuestions);
    sessionStorage.setItem("zyphnaro-interview-result", JSON.stringify(result));
    sessionStorage.setItem("zyphnaro-interview-turns", JSON.stringify(finalTurns));
    sessionStorage.setItem(
      "zyphnaro-interview-meta",
      JSON.stringify({ mode, difficulty, role: user?.primaryRole ?? "" })
    );
    router.push("/interview-practice/results");
  };

  useEffect(() => {
    requestQuestion({ mode, difficulty, role: user?.primaryRole ?? "Frontend Developer", previousTurns: 0 })
      .then((q) => {
        setCurrent(q);
        setLoading(false);
      })
      .catch((e) => {
        setSessionError(e instanceof Error ? e.message : "Couldn't start the interview.");
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          finishInterview(turnsRef.current);
        }
        return Math.max(0, s - 1);
      });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The AI interviewer reads each new question aloud in voice mode —
  // synchronizing the question panel with the browser's speech synthesis.
  useEffect(() => {
    if (useVoice && current && tts.isSupported) {
      tts.speak(current.prompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, useVoice]);

  const toggleRecording = () => {
    if (stt.listening) {
      stt.stop();
      if (stt.transcript.trim()) setAnswer(stt.transcript.trim());
    } else {
      tts.stop();
      stt.reset();
      stt.start();
    }
  };

  const submitAnswer = async () => {
    if (!current || !answer.trim()) return;
    if (stt.listening) stt.stop();
    setLoading(true);
    setSessionError(null);
    try {
      const evaluation = await requestEvaluation({ question: current, answer });
      const newTurn: InterviewTurn = { question: current, answer, evaluation };
      const nextTurns = [...turns, newTurn];
      setTurns(nextTurns);
      turnsRef.current = nextTurns;
      setAnswer("");
      stt.reset();

      if (nextTurns.length >= totalQuestions) {
        finishInterview(nextTurns);
        return;
      }

      const nextQuestion = await requestQuestion({
        mode,
        difficulty,
        role: user?.primaryRole ?? "Frontend Developer",
        previousTurns: nextTurns.length,
        lastAnswerWasWeak: evaluation.strength === "weak",
      });
      setCurrent(nextQuestion);
    } catch (e) {
      setSessionError(e instanceof Error ? e.message : "Something went wrong — your answer wasn't lost, try again.");
    } finally {
      setLoading(false);
    }
  };

  const endEarly = () => finishInterview(turns);
  const liveText = stt.listening ? stt.transcript : answer;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <div className="flex items-center justify-between">
        <InterviewProgress current={turns.length} total={totalQuestions} />
        <span className="ml-4 inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-z-ink-soft">
          <Timer className="h-4 w-4" /> {formatTime(secondsLeft)}
        </span>
      </div>

      {current && <InterviewQuestionPanel prompt={current.prompt} category={current.category} />}

      {sessionError && (
        <p className="rounded-lg bg-z-danger-bg px-3 py-2 text-xs text-z-danger">{sessionError}</p>
      )}

      {useVoice && tts.isSupported && current && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <button
            onClick={() => tts.speak(current.prompt)}
            disabled={tts.speaking}
            className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-z-brand hover:underline disabled:opacity-50"
          >
            <Volume2 className="h-3.5 w-3.5" /> {tts.speaking ? "Speaking…" : "Replay question"}
          </button>
          <div className="inline-flex items-center gap-1 text-xs text-z-ink-soft" role="group" aria-label="Interviewer voice">
            <span className="mr-1">Interviewer voice:</span>
            {(["female", "male"] as const).map((g) => (
              <button
                key={g}
                onClick={() => {
                  tts.setGender(g);
                  tts.stop();
                }}
                aria-pressed={tts.gender === g}
                className={cn(
                  "rounded-full border px-2.5 py-0.5 font-medium capitalize transition-colors",
                  tts.gender === g
                    ? "border-z-brand bg-z-brand text-white"
                    : "border-z-border-strong bg-white text-z-ink-soft hover:border-z-brand"
                )}
              >
                {g}
              </button>
            ))}
          </div>
          {!tts.hasMatchingVoice && (
            <span className="text-xs text-z-ink-faint">
              No {tts.gender} voice is installed on this device, so the pitch is adjusted instead.
            </span>
          )}
        </div>
      )}

      <Card className="p-4">
        {useVoice && stt.isSupported ? (
          <div className="flex flex-col items-center gap-3 py-2">
            <button
              onClick={toggleRecording}
              disabled={loading || ending}
              className={cn(
                "flex h-16 w-16 items-center justify-center rounded-full text-white transition-colors",
                stt.listening ? "bg-z-danger animate-pulse" : "bg-z-brand hover:bg-z-brand-600"
              )}
              aria-label={stt.listening ? "Stop recording" : "Start recording"}
            >
              {stt.listening ? <Square className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
            </button>
            <p className="text-xs text-z-ink-faint">{stt.listening ? "Listening… tap to stop" : "Tap to answer by voice"}</p>
            <div className="min-h-16 w-full rounded-lg border border-z-border-strong bg-z-surface p-3 text-sm text-z-ink">
              {liveText || <span className="text-z-ink-faint">Your answer will appear here as you speak…</span>}
            </div>
            <button
              onClick={() => setUseVoice(false)}
              className="inline-flex items-center gap-1 text-xs text-z-ink-faint hover:text-z-brand"
            >
              <Keyboard className="h-3 w-3" /> Switch to typing instead
            </button>
          </div>
        ) : (
          <>
            {useVoice && !stt.isSupported && (
              <p className="mb-2 rounded-lg bg-z-warning-bg px-3 py-2 text-xs text-z-warning">
                Voice input isn&apos;t supported in this browser. Please type your answer instead.
              </p>
            )}
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              disabled={loading || ending}
              placeholder="Type your answer here…"
              rows={7}
              className="w-full resize-none rounded-lg border border-z-border-strong bg-white p-3 text-sm text-z-ink placeholder:text-z-ink-faint focus:border-z-brand focus:outline-none focus:ring-2 focus:ring-z-brand/30"
            />
            {tts.isSupported && requestedVoice && !useVoice && (
              <button
                onClick={() => setUseVoice(true)}
                className="mt-2 inline-flex items-center gap-1 text-xs text-z-ink-faint hover:text-z-brand"
              >
                <Mic className="h-3 w-3" /> Switch back to voice
              </button>
            )}
          </>
        )}

        <div className="mt-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={endEarly} disabled={ending}>
            <LogOut className="h-3.5 w-3.5" /> End interview
          </Button>
          <Button onClick={submitAnswer} disabled={loading || ending || !answer.trim()} size="sm">
            {loading ? "Thinking…" : turns.length + 1 >= totalQuestions ? "Finish" : "Next question"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

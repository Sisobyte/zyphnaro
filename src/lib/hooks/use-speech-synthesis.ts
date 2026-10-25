"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type VoiceGender = "female" | "male";

const STORAGE_KEY = "zyphnaro-interviewer-voice";

// Browsers don't say whether a voice is male or female, so this matches the
// well-known voice names that ship with Windows, macOS, Android and Chrome.
const FEMALE_NAMES = /(female|samantha|victoria|karen|moira|tessa|fiona|allison|ava|susan|zira|hazel|aria|jenny|emma|michelle|libby|sonia|natasha|catherine|serena|kate|joanna|salli|ivy|kimberly|nicole|amy|google us english)/i;
const MALE_NAMES = /(\bmale\b|daniel|alex|fred|tom|david|mark|guy|ryan|james|george|richard|oliver|thomas|arthur|aaron|eric|christopher|brian|matthew|joey|justin|russell)/i;

function isEnglish(v: SpeechSynthesisVoice) {
  return v.lang?.toLowerCase().startsWith("en");
}

function pickVoice(voices: SpeechSynthesisVoice[], gender: VoiceGender): SpeechSynthesisVoice | null {
  const english = voices.filter(isEnglish);
  const pool = english.length ? english : voices;
  const wanted = gender === "female" ? FEMALE_NAMES : MALE_NAMES;
  const other = gender === "female" ? MALE_NAMES : FEMALE_NAMES;
  // "Female" also appears inside "Google UK English Female"; make sure a voice
  // matching the other gender's pattern isn't picked by mistake.
  const matches = pool.filter((v) => wanted.test(v.name) && !(other.test(v.name) && !wanted.test(v.name)));
  // Prefer natural/online voices when the browser offers them.
  return matches.find((v) => /natural|neural|online/i.test(v.name)) ?? matches[0] ?? null;
}

function readStoredGender(): VoiceGender {
  try {
    return localStorage.getItem(STORAGE_KEY) === "male" ? "male" : "female";
  } catch {
    return "female";
  }
}

/**
 * Wraps the browser's built-in SpeechSynthesis API so the AI interviewer can
 * read questions aloud, with a female or male voice. This is a real browser
 * API (no external service or API key needed) and degrades gracefully where
 * unsupported. Available voices depend on the person's device and browser; if
 * no voice of the chosen gender is installed, pitch is shifted so the two
 * choices still sound clearly different.
 */
export function useSpeechSynthesis() {
  const [isSupported] = useState(() => typeof window !== "undefined" && "speechSynthesis" in window);
  const [speaking, setSpeaking] = useState(false);
  const [gender, setGenderState] = useState<VoiceGender>("female");
  const [hasMatchingVoice, setHasMatchingVoice] = useState(true);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const genderRef = useRef<VoiceGender>("female");

  // Voices load asynchronously in most browsers.
  useEffect(() => {
    if (!isSupported) return;
    const stored = readStoredGender();
    genderRef.current = stored;
    const load = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
      setHasMatchingVoice(pickVoice(voicesRef.current, genderRef.current) !== null || voicesRef.current.length === 0);
    };
    // Deferred so the state updates don't run synchronously inside the effect.
    const t = setTimeout(() => {
      setGenderState(stored);
      load();
    }, 0);
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => {
      clearTimeout(t);
      window.speechSynthesis.removeEventListener("voiceschanged", load);
    };
  }, [isSupported]);

  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const g = genderRef.current;
    const voice = pickVoice(voicesRef.current.length ? voicesRef.current : window.speechSynthesis.getVoices(), g);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
      utterance.pitch = 1;
    } else {
      utterance.pitch = g === "female" ? 1.25 : 0.7;
    }
    utterance.rate = 0.98;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, []);

  const stop = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    }
  }, []);

  const setGender = useCallback((next: VoiceGender) => {
    genderRef.current = next;
    setGenderState(next);
    setHasMatchingVoice(pickVoice(voicesRef.current, next) !== null || voicesRef.current.length === 0);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private mode or blocked storage: the choice just won't be remembered.
    }
  }, []);

  useEffect(() => {
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { isSupported, speaking, speak, stop, gender, setGender, hasMatchingVoice };
}

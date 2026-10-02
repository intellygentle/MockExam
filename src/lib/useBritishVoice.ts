"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Browser speech with a British (en-GB) voice, for the Word Vault Listening &
 * Story Challenge.
 *
 * The spec's Section 3 rules are enforced here as far as a browser allows:
 *   - prefer Google UK English, Microsoft Libby/Sonia/Ryan, Daniel, Serena,
 *     Kate or Martha; otherwise any other en-GB voice;
 *   - if no en-GB voice exists, report it rather than silently using a US /
 *     Nigerian / other accent;
 *   - voices load late, so getVoices() is called again on voiceschanged.
 *
 * Every utterance is one short sentence or chunk (some network voices cut out
 * after ~15 seconds). Callers start speech from a user gesture.
 */

const PREFERRED_NAMES = [
  "Google UK English",
  "Microsoft Libby",
  "Microsoft Sonia",
  "Microsoft Ryan",
  "Daniel",
  "Serena",
  "Kate",
  "Martha",
];

/** Loose en-GB test — accepts both "en-GB" and Android's "en_GB". */
export function isBritishVoice(voice: SpeechSynthesisVoice): boolean {
  const lang = (voice.lang || "").toLowerCase().replace("_", "-");
  return lang === "en-gb";
}

function pickPreferred(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const british = voices.filter(isBritishVoice);
  if (british.length === 0) return null;
  for (const name of PREFERRED_NAMES) {
    const match = british.find((v) => (v.name || "").toLowerCase().includes(name.toLowerCase()));
    if (match) return match;
  }
  return british[0];
}

export type SpeakOptions = {
  /** Speech rate (0.9 dictation-normal, 0.7 slow, 0.85 gap first time). */
  rate?: number;
  /** Called when the utterance finishes or fails. */
  onEnd?: () => void;
};

export function useBritishVoice() {
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Load voices now, and again whenever the browser reports new ones.
  useEffect(() => {
    if (!supported) return;
    const load = () => {
      const list = window.speechSynthesis.getVoices() || [];
      if (list.length === 0) return;
      setVoices(list);
      setVoice((current) => {
        if (current && list.some((v) => v.voiceURI === current.voiceURI)) return current;
        return pickPreferred(list);
      });
    };
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    // Some browsers only populate voices after a short delay.
    const timer = window.setTimeout(load, 600);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", load);
      window.clearTimeout(timer);
    };
  }, [supported]);

  useEffect(() => {
    return () => {
      if (supported) window.speechSynthesis.cancel();
    };
  }, [supported]);

  const britishVoices = voices.filter(isBritishVoice);
  const hasVoice = !!voice;

  const cancel = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setSpeaking(false);
    setPaused(false);
  }, [supported]);

  const speak = useCallback(
    (text: string, options: SpeakOptions = {}) => {
      if (!supported || !voice || !text.trim()) {
        options.onEnd?.();
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-GB";
      utterance.voice = voice;
      utterance.rate = options.rate ?? 0.9;
      utterance.pitch = 1;
      utterance.onend = () => {
        utteranceRef.current = null;
        setSpeaking(false);
        options.onEnd?.();
      };
      utterance.onerror = () => {
        utteranceRef.current = null;
        setSpeaking(false);
        options.onEnd?.();
      };
      utteranceRef.current = utterance;
      setSpeaking(true);
      setPaused(false);
      window.speechSynthesis.speak(utterance);
    },
    [supported, voice]
  );

  const pause = useCallback(() => {
    if (!supported || !window.speechSynthesis.speaking) return;
    window.speechSynthesis.pause();
    setPaused(true);
  }, [supported]);

  const resume = useCallback(() => {
    if (!supported || !window.speechSynthesis.paused) return;
    window.speechSynthesis.resume();
    setPaused(false);
  }, [supported]);

  return {
    supported,
    voices,
    britishVoices,
    voice,
    setVoice,
    hasVoice,
    speak,
    cancel,
    pause,
    resume,
    speaking,
    paused,
  };
}

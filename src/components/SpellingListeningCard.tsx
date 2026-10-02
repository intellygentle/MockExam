"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle, ArrowLeft, BadgeCheck, Check, Gauge, Headphones, Loader2,
  Play, RotateCcw, Sparkles, Target, Trophy, Volume2,
} from "lucide-react";
import { useBritishVoice } from "@/lib/useBritishVoice";
import BritishVoiceCheck from "@/components/BritishVoiceCheck";

/** One Activity A item as delivered by the API (no target word, no IPA). */
type CardItem = { id: number; category: number; categoryName: string; sentence: string };

type Progress = {
  learnedWords: number;
  totalWords: number;
  percent: number;
  mastered: boolean;
  started: boolean;
  learnedIds: number[];
};

type Reveal = {
  sentence: string;
  target: string;
  targetIndex: number;
  ipa: string;
  typicalError: string;
};

type CheckResponse = {
  result: "perfect" | "word_correct" | "incorrect" | "incomplete";
  wordCorrect: boolean;
  mistakes: string[];
  note: string;
  canRetry: boolean;
  reveal: Reveal | null;
};

type ItemRecord = {
  id: number;
  category: number;
  categoryName: string;
  attempts: number;
  firstTyped: string;
  lastTyped: string;
  firstWordCorrect: boolean;
  firstPerfect: boolean;
  reveal: Reveal | null;
};

type DrillSet = {
  id: number;
  title: string;
  description: string;
  question_count: number;
};

type Phase = "loading" | "voice" | "ready" | "running" | "done";
type Mode = "section" | "full" | "review";

const CATEGORY_LABELS: Record<number, string> = {
  1: "Vowels silently dropped or added",
  2: "Silent letters",
  3: "Unexpected letter combinations",
  4: "“ie / ei” and doubled-letter confusions",
  5: "Everyday words often misspelled by sound",
  6: "British spelling patterns",
};

function shuffle<T>(list: T[]): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Render a sentence with the target token highlighted. */
function HighlightedSentence({ reveal }: { reveal: Reveal }) {
  const parts = reveal.sentence.split(/(\s+)/);
  let wordIndex = -1;
  return (
    <span>
      {parts.map((part, i) => {
        if (/^\s*$/.test(part)) return <span key={i}>{part}</span>;
        wordIndex++;
        const isTarget = wordIndex === reveal.targetIndex;
        return isTarget ? (
          <mark key={i} className="bg-policeGreen/25 text-policeGreen font-bold rounded px-1">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        );
      })}
    </span>
  );
}

export default function SpellingListeningCard({
  set,
  studentName,
  schoolName = "",
  onDone,
}: {
  set: DrillSet;
  studentName: string;
  schoolName?: string;
  onDone: () => void;
}) {
  const voice = useBritishVoice();

  const [phase, setPhase] = useState<Phase>("loading");
  const [items, setItems] = useState<CardItem[]>([]);
  const [progress, setProgress] = useState<Progress | null>(null);

  const [mode, setMode] = useState<Mode>("section");
  const [deck, setDeck] = useState<CardItem[]>([]);
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [checking, setChecking] = useState(false);
  const [feedback, setFeedback] = useState<CheckResponse | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const recordsRef = useRef<Map<number, ItemRecord>>(new Map());
  const [sessionDone, setSessionDone] = useState(false);

  // ── Load the card ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const name = studentName.trim() || "Anonymous";
        const res = await fetch(
          `/api/lesson-card/word-vault?drill_set_id=${set.id}&student_name=${encodeURIComponent(name)}`
        );
        if (res.ok) {
          const json = await res.json();
          if (cancelled) return;
          setItems(json.items || []);
          if (json.progress) setProgress(json.progress);
        }
      } catch { /* fall through to empty state */ }
      if (!cancelled) setPhase("voice");
    })();
    return () => { cancelled = true; };
  }, [set.id, studentName]);

  const item = phase === "running" ? deck[index] || null : null;

  const play = useCallback(
    (rate: number) => {
      if (!item) return;
      voice.speak(item.sentence, { rate });
    },
    [item, voice]
  );

  // Auto-play when a new item appears.
  useEffect(() => {
    if (phase !== "running" || !item) return;
    const timer = window.setTimeout(() => play(0.9), 350);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, index, item?.id]);

  const startSession = useCallback(
    (nextMode: Mode, custom?: CardItem[], category?: number) => {
      let pool = custom ?? items;
      if (!custom && nextMode === "section" && category) {
        pool = items.filter((i) => i.category === category);
      }
      if (!custom && nextMode === "review" && progress) {
        const learned = new Set(progress.learnedIds);
        pool = items.filter((i) => !learned.has(i.id));
      }
      if (pool.length === 0) return;
      recordsRef.current = new Map();
      setMode(nextMode);
      setDeck(shuffle(pool));
      setIndex(0);
      setTyped("");
      setAttempts(0);
      setFeedback(null);
      setFlash(null);
      setSessionDone(false);
      setPhase("running");
    },
    [items, progress]
  );

  const recordAttempt = useCallback(
    (current: CardItem, response: CheckResponse, typedNow: string) => {
      const existing = recordsRef.current.get(current.id);
      if (!existing) {
        recordsRef.current.set(current.id, {
          id: current.id,
          category: current.category,
          categoryName: current.categoryName,
          attempts: 1,
          firstTyped: typedNow,
          lastTyped: typedNow,
          firstWordCorrect: response.wordCorrect,
          firstPerfect: response.result === "perfect",
          reveal: response.reveal,
        });
      } else {
        existing.attempts += 1;
        existing.lastTyped = typedNow;
        if (response.reveal) existing.reveal = response.reveal;
      }
    },
    []
  );

  const check = useCallback(
    async (current: CardItem) => {
      const value = typed.trim();
      if (!value || checking || feedback) return;
      setChecking(true);
      try {
        const res = await fetch("/api/lesson-card/word-vault", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "check",
            studentName: studentName.trim() || "Anonymous",
            schoolName,
            drillSetId: set.id,
            wordId: current.id,
            typed: value,
            attempt: attempts + 1,
          }),
        });
        if (!res.ok) return;
        const json: CheckResponse = await res.json();
        if (json.result === "incomplete") {
          // Not marked — no attempt used up.
          setFeedback(json);
          return;
        }
        setAttempts((a) => a + 1);
        recordAttempt(current, json, value);
        setFeedback(json);
        if (json.result === "perfect") setFlash("Perfect! ✅");
        else if (json.result === "word_correct") setFlash("Word correct ✅");
        else setFlash("Not quite ❌");
        if (json.result === "incorrect" && json.canRetry) {
          window.setTimeout(() => voice.speak(current.sentence, { rate: 0.9 }), 500);
        }
      } finally {
        setChecking(false);
      }
    },
    [typed, checking, feedback, attempts, studentName, schoolName, set.id, recordAttempt, voice]
  );

  const next = useCallback(() => {
    if (index + 1 >= deck.length) {
      setSessionDone(true);
      setPhase("done");
      return;
    }
    setIndex((i) => i + 1);
    setTyped("");
    setAttempts(0);
    setFeedback(null);
    setFlash(null);
  }, [index, deck.length]);

  const submitSession = useCallback(async () => {
    const results = [...recordsRef.current.values()].map((r) => ({
      wordId: r.id,
      firstTyped: r.firstTyped,
      lastTyped: r.lastTyped,
    }));
    if (results.length === 0) return;
    try {
      const res = await fetch("/api/lesson-card/word-vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "record",
          studentName: studentName.trim() || "Anonymous",
          schoolName,
          drillSetId: set.id,
          results,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.progress) setProgress(json.progress);
      }
    } catch { /* progress saving is best-effort */ }
  }, [studentName, schoolName, set.id]);

  // Record the session once it finishes.
  useEffect(() => {
    if (phase === "done") void submitSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ── Keyboard: Enter checks / advances ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== "running") return;
      if (e.key === "Enter") {
        e.preventDefault();
        if (feedback) {
          if (feedback.result === "incomplete") {
            setFeedback(null);
            return;
          }
          if (feedback.canRetry) {
            setFeedback(null);
            setTyped("");
            return;
          }
          next();
        } else if (item) {
          void check(item);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, feedback, item, check, next]);

  const records = useMemo(() => [...recordsRef.current.values()], [sessionDone]);

  const attempted = records.length;
  const wordsFirstTry = records.filter((r) => r.firstWordCorrect).length;
  const sentencesPerfect = records.filter((r) => r.firstPerfect).length;
  const missed = records.filter((r) => !r.firstWordCorrect);

  // ── LOADING ──
  if (phase === "loading") {
    return (
      <div className="max-w-3xl mx-auto py-20 text-center px-4">
        <Loader2 size={32} className="text-sky-400 animate-spin mx-auto mb-4" />
        <p className="text-white/50 text-sm">Loading the listening dictation…</p>
      </div>
    );
  }

  if (phase === "voice") {
    return (
      <BritishVoiceCheck
        voice={voice}
        onContinue={() => setPhase("ready")}
        onBack={onDone}
      />
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto py-10 text-center px-4">
        <p className="text-white/50">No dictation items loaded for this card.</p>
        <button onClick={onDone} className="mt-4 px-6 py-2 rounded-xl bg-white/10 text-white/70 hover:bg-white/20 transition">
          <ArrowLeft size={16} className="inline mr-2" /> Back
        </button>
      </div>
    );
  }

  // ── READY ──
  if (phase === "ready") {
    const learned = progress?.learnedWords ?? 0;
    const total = progress?.totalWords ?? items.length;
    return (
      <div className="max-w-2xl mx-auto py-6 px-3 sm:px-0 space-y-4">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card space-y-5">
          <div className="text-center space-y-2">
            <div className="inline-flex p-4 bg-sky-500/10 rounded-full border border-sky-500/20">
              <Headphones size={38} className="text-sky-300" />
            </div>
            <h2 className="text-2xl font-heading font-bold text-white">{set.title}</h2>
            <p className="text-sm text-white/60 max-w-lg mx-auto">
              A British voice reads a sentence. Type the whole sentence from memory — the word and the
              sentence are never shown until you are marked.
            </p>
          </div>

          {progress && (
            <div className="bg-white/5 rounded-xl p-3">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="uppercase tracking-widest text-white/40 text-[10px]">Words mastered</span>
                <span className="text-sky-300 font-bold">{learned} / {total} ({progress.percent}%)</span>
              </div>
              <div className="h-2 bg-black/30 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-sky-400 to-policeGold rounded-full" style={{ width: `${progress.percent}%` }} />
              </div>
            </div>
          )}

          <p className="text-[10px] uppercase tracking-widest text-white/40 text-center">Choose a section</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {Object.entries(CATEGORY_LABELS).map(([n, label]) => {
              const cat = Number(n);
              const catItems = items.filter((i) => i.category === cat);
              return (
                <button
                  key={n}
                  onClick={() => startSession("section", undefined, cat)}
                  className="text-left px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 hover:border-sky-400/60 hover:bg-sky-500/10 transition"
                >
                  <p className="text-sm font-bold text-white">{n}. {label}</p>
                  <p className="text-[11px] text-white/40">{catItems.length} sentences</p>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              onClick={() => startSession("full")}
              className="flex items-center justify-center gap-2 py-3 rounded-xl bg-sky-500 text-white font-bold hover:brightness-110 transition text-sm"
            >
              <Play size={16} /> Full test — all {items.length}
            </button>
            <button
              onClick={() => startSession("review")}
              disabled={!progress || progress.learnedIds.length >= items.length}
              className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white/10 text-white/80 font-bold hover:bg-white/20 transition text-sm border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCcw size={16} /> Practise missed words
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── DONE ──
  if (phase === "done") {
    const pct = attempted ? Math.round((wordsFirstTry / attempted) * 100) : 0;
    const byCat = new Map<number, { name: string; total: number; correct: number }>();
    for (const r of records) {
      const entry = byCat.get(r.category) || { name: r.categoryName, total: 0, correct: 0 };
      entry.total += 1;
      if (r.firstWordCorrect) entry.correct += 1;
      byCat.set(r.category, entry);
    }
    return (
      <div className="max-w-3xl mx-auto py-6 px-3 sm:px-0 space-y-4">
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
          <div className="card text-center space-y-4">
            <div className="inline-flex p-5 bg-sky-500/10 rounded-full">
              <Trophy size={44} className="text-sky-300" />
            </div>
            <h2 className="text-2xl font-heading font-bold text-white">
              {sessionDone && missed.length === 0 ? "Perfect session! 🏆" : "Session complete 🎧"}
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="bg-white/5 rounded-xl p-3">
                <p className="text-2xl font-bold text-white">{attempted}</p>
                <p className="text-[9px] uppercase tracking-widest text-white/40">Sentences</p>
              </div>
              <div className="bg-policeGreen/10 border border-policeGreen/20 rounded-xl p-3">
                <p className="text-2xl font-bold text-policeGreen">{wordsFirstTry}</p>
                <p className="text-[9px] uppercase tracking-widest text-policeGreen/70">Words 1st try</p>
              </div>
              <div className="bg-policeGold/10 border border-policeGold/20 rounded-xl p-3">
                <p className="text-2xl font-bold text-policeGold">{sentencesPerfect}</p>
                <p className="text-[9px] uppercase tracking-widest text-policeGold/70">Perfect sentences</p>
              </div>
              <div className="bg-white/5 rounded-xl p-3">
                <p className="text-2xl font-bold text-white">{pct}%</p>
                <p className="text-[9px] uppercase tracking-widest text-white/40">Word accuracy</p>
              </div>
            </div>

            {progress && (
              <p className="text-sm text-white/60">
                <span className="text-sky-300 font-bold">{progress.learnedWords}</span> / {progress.totalWords} words
                mastered in this card ({progress.percent}%).
              </p>
            )}
          </div>

          <div className="card space-y-3">
            <h3 className="text-sm font-heading font-bold text-white">Per-category breakdown</h3>
            <div className="space-y-2">
              {[...byCat.entries()].map(([cat, entry]) => (
                <div key={cat} className="flex items-center gap-3">
                  <span className="text-xs text-white/60 w-40 truncate">{entry.name}</span>
                  <div className="flex-1 h-2 bg-black/30 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-sky-400 to-policeGreen rounded-full" style={{ width: `${Math.round((entry.correct / Math.max(entry.total, 1)) * 100)}%` }} />
                  </div>
                  <span className="text-xs text-white/70 tabular-nums w-16 text-right">{entry.correct}/{entry.total}</span>
                </div>
              ))}
            </div>
          </div>

          {missed.length > 0 && (
            <div className="card space-y-3">
              <h3 className="text-sm font-heading font-bold text-white flex items-center gap-2">
                <Sparkles size={15} className="text-policeRed" /> Words to review ({missed.length})
              </h3>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {missed.map((r) => (
                  <div key={r.id} className="bg-white/5 rounded-xl p-3 space-y-1">
                    {r.reveal ? (
                      <p className="text-sm text-white/80 leading-relaxed">
                        <HighlightedSentence reveal={r.reveal} />
                      </p>
                    ) : null}
                    <p className="text-xs text-white/50">
                      You typed: <span className="text-policeRed">{r.firstTyped}</span>
                      {r.reveal?.typicalError ? <> · classic miss: <span className="text-policeGold">{r.reveal.typicalError}</span></> : null}
                      {r.reveal?.ipa ? <> · {r.reveal.ipa}</> : null}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                const retry = missed.map((m) => items.find((i) => i.id === m.id)).filter(Boolean) as CardItem[];
                if (retry.length > 0) startSession("review", retry);
              }}
              disabled={missed.length === 0}
              className="flex items-center justify-center gap-2 py-3 rounded-xl bg-sky-500 text-white font-bold hover:brightness-110 transition text-sm disabled:opacity-50"
            >
              <RotateCcw size={16} /> Practise missed words
            </button>
            <button
              onClick={onDone}
              className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white/10 text-white/80 font-bold hover:bg-white/20 transition text-sm border border-white/10"
            >
              <ArrowLeft size={16} /> Back to the stack
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── RUNNING ──
  if (!item) return null;
  const locked = !!feedback && feedback.result !== "incomplete";

  return (
    <div className="max-w-3xl mx-auto space-y-4 py-4 px-3 sm:px-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-heading font-bold text-white truncate">{set.title}</h1>
          <p className="text-white/50 text-xs">
            Sentence {index + 1} of {deck.length}
            {mode !== "full" ? ` · ${item.categoryName}` : ""}
            {progress ? <> · <span className="text-sky-300 font-semibold">{progress.learnedWords}/{progress.totalWords} mastered</span></> : null}
          </p>
        </div>
        <button
          onClick={onDone}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 text-white/70 hover:bg-white/20 transition text-xs shrink-0"
        >
          <ArrowLeft size={14} /> <span className="hidden sm:inline">Back</span>
        </button>
      </div>

      <motion.div key={index} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="card space-y-5">
        <div className="text-center space-y-3">
          <p className="text-sm text-white/60">Listen, then type the whole sentence.</p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => play(0.9)}
              disabled={voice.speaking}
              className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-sky-500 text-white font-bold hover:brightness-110 transition text-lg disabled:opacity-60"
            >
              <Volume2 size={22} /> Play
            </button>
            <button
              onClick={() => play(0.7)}
              disabled={voice.speaking}
              className="flex items-center justify-center gap-2 px-5 py-4 rounded-2xl bg-white/10 text-white/80 font-bold hover:bg-white/20 transition text-sm border border-white/10 disabled:opacity-60"
            >
              <Gauge size={18} /> Slow
            </button>
          </div>
          {voice.speaking && (
            <p className="text-xs text-sky-300 flex items-center justify-center gap-2">
              <Loader2 size={13} className="animate-spin" /> Speaking…
            </p>
          )}
        </div>

        <textarea
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          disabled={locked}
          rows={2}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          placeholder="Type the whole sentence here…"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-base text-white placeholder-white/30 focus:outline-none focus:border-sky-400/60 resize-none disabled:opacity-70"
        />

        {flash && !locked && (
          <p className={`text-sm font-bold ${flash.includes("✅") ? "text-policeGreen" : "text-policeRed"}`}>{flash}</p>
        )}

        {feedback && (
          <div className={`rounded-xl p-4 space-y-2 border ${
            feedback.result === "perfect" ? "border-policeGreen/30 bg-policeGreen/5"
              : feedback.result === "word_correct" ? "border-policeGold/30 bg-policeGold/5"
              : feedback.result === "incomplete" ? "border-white/10 bg-white/5"
              : "border-policeRed/30 bg-policeRed/5"
          }`}>
            {feedback.result === "incomplete" && (
              <p className="text-sm text-white/70">
                Please type the whole sentence — that was fewer than half the words. Try again without using an attempt.
              </p>
            )}
            {feedback.result === "perfect" && (
              <p className="text-sm font-bold text-policeGreen flex items-center gap-2"><BadgeCheck size={15} /> Perfect — the whole sentence is right!</p>
            )}
            {feedback.result === "word_correct" && (
              <p className="text-sm font-bold text-policeGold flex items-center gap-2">
                <Target size={15} /> The target word is correct.
                {feedback.mistakes.length > 0 && <span className="font-normal text-white/60">Watch these words: {feedback.mistakes.join(", ")}.</span>}
              </p>
            )}
            {feedback.result === "incorrect" && feedback.canRetry && (
              <p className="text-sm font-bold text-policeRed flex items-center gap-2">
                <AlertTriangle size={15} /> Not quite. Listen again and check the spelling.
              </p>
            )}
            {feedback.note && <p className="text-xs text-policeGold">{feedback.note}</p>}
            {feedback.reveal && (
              <div className="pt-1 space-y-1">
                <p className="text-[10px] uppercase tracking-widest text-white/40">Correct sentence</p>
                <p className="text-sm text-white/85 leading-relaxed"><HighlightedSentence reveal={feedback.reveal} /></p>
                <p className="text-xs text-white/50">{feedback.reveal.ipa}{feedback.reveal.typicalError ? ` · classic miss: ${feedback.reveal.typicalError}` : ""}</p>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] uppercase tracking-widest text-white/35">
            Two attempts per sentence · press Enter to check
          </span>
          {!locked ? (
            <button
              onClick={() => check(item)}
              disabled={!typed.trim() || checking}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-policeGold text-policeBlue font-bold hover:brightness-110 transition text-sm disabled:opacity-50"
            >
              {checking ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Check
            </button>
          ) : feedback?.canRetry ? (
            <button
              onClick={() => { setFeedback(null); setTyped(""); }}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white/10 text-white font-bold hover:bg-white/20 transition text-sm border border-white/10"
            >
              <RotateCcw size={15} /> Try again
            </button>
          ) : (
            <button
              onClick={next}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-sky-500 text-white font-bold hover:brightness-110 transition text-sm"
            >
              {index + 1 >= deck.length ? "See results" : "Next"} →
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

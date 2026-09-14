"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, BookOpen, Timer, Check, X, ChevronRight, Delete,
  Trophy, RefreshCw, Sparkles, Layers, Volume2, Lock
} from "lucide-react";
import confetti from "canvas-confetti";

// ── TYPES ──

type DrillSet = {
  id: number;
  title: string;
  description: string;
  subject_id: number | null;
  level: string;
  time_limit_minutes: number;
  question_count: number;
  card_type?: string;
  subjectName: string;
};

type VocabWord = {
  id: number;
  word: string;      // may carry a parenthetical label, e.g. "separate (adj.)"
  meaning: string;   // phonetic transcription
};

export type SpellingCategory = {
  name: string;
  description: string;
};

type Phase = "select" | "study" | "test" | "result" | "alldone";

type Props = {
  set: DrillSet;
  words: VocabWord[];
  studentName: string;
  onDone: () => void;
  categories: SpellingCategory[];
};

const STUDY_SECONDS = 120;        // 2 minutes per category study page
const WORDS_PER_CATEGORY = 20;
const CORRECT_FLASH_MS = 1000;    // green flash before the next word
const WRONG_FLASH_MS = 2500;      // brief correction display before the next word
const MAX_LETTERS = 24;

// QWERTY rows for the on-screen keyboard — the ONLY way to enter letters
const KEY_ROWS = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["z", "x", "c", "v", "b", "n", "m"],
];

/** Strip parenthetical labels: "separate (adj.)" → "separate" */
const stripLabel = (w: string) => w.replace(/\s*\(.*?\)\s*/g, "").trim();

const storageKey = (setId: number, name: string) =>
  `spelling-progress-${setId}-${(name || "anonymous").trim().toLowerCase()}`;

const loadCompleted = (setId: number, name: string): number[] => {
  try {
    const raw = localStorage.getItem(storageKey(setId, name));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((n) => typeof n === "number") : [];
  } catch { return []; }
};

const saveCompleted = (setId: number, name: string, completed: number[]) => {
  try {
    localStorage.setItem(storageKey(setId, name), JSON.stringify(completed));
  } catch { /* storage unavailable */ }
};

// ── COMPONENT ──

export default function SpellingCard({ set, words, studentName, onDone, categories }: Props) {
  const [phase, setPhase] = useState<Phase>("select");
  const [completed, setCompleted] = useState<number[]>(() => loadCompleted(set.id, studentName));
  const [categoryIdx, setCategoryIdx] = useState(0);
  const [wordIdx, setWordIdx] = useState(0);
  const [guess, setGuess] = useState("");
  const [feedback, setFeedback] = useState<"idle" | "correct" | "wrong">("idle");
  const [processing, setProcessing] = useState(false);
  const [timeLeft, setTimeLeft] = useState(STUDY_SECONDS);
  const [score, setScore] = useState(0);
  const [missedWords, setMissedWords] = useState<VocabWord[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Score lives in a ref so the advance/finish timeouts (whose closures were
  // captured before the last increment) always read the up-to-date value.
  const scoreRef = useRef(0);

  // ── Stage-run tracking ──
  // Each stage test = one tracked run: a start row, one answer row per
  // spelled word (the student's spelling is stored as the selected option),
  // and a complete_stage row. Card-level mastery uses the separate
  // all-stages marker recorded via markCompleted.
  const attemptIdRef = useRef<number | null>(null);
  const runStartRef = useRef<number>(Date.now());

  const recordSpelling = (questionId: number | undefined, guess: string, correct: boolean) => {
    if (!questionId || !attemptIdRef.current) return;
    fetch("/api/drills/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "answer", attemptId: attemptIdRef.current, questionId, selectedOption: guess, correct }),
    }).catch(() => {});
  };

  const completeStageRun = () => {
    if (!attemptIdRef.current) return;
    const timeSpentSeconds = Math.round((Date.now() - runStartRef.current) / 1000);
    fetch("/api/drills/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "complete_stage", attemptId: attemptIdRef.current, timeSpentSeconds }),
    }).catch(() => {});
  };

  const categoryCount = Math.max(1, Math.ceil(words.length / WORDS_PER_CATEGORY));
  const categoryWords = words.slice(categoryIdx * WORDS_PER_CATEGORY, (categoryIdx + 1) * WORDS_PER_CATEGORY);
  const currentWord = categoryWords[wordIdx] ?? null;
  const currentCategory = categories[categoryIdx];

  // ── Study countdown: 2 minutes, then the test page opens automatically ──
  useEffect(() => {
    if (phase !== "study") return;
    let count = STUDY_SECONDS;
    setTimeLeft(count);
    timerRef.current = setInterval(() => {
      count--;
      if (count <= 0) {
        clearInterval(timerRef.current!);
        setTimeLeft(0);
        beginTest();
      } else {
        setTimeLeft(count);
      }
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, categoryIdx]);

  // ── Physical keyboard is disabled during the test ──
  // Students may ONLY spell using the on-screen letter buttons. Typing keys
  // (letters, digits, Enter, Backspace, Space) are swallowed; browser
  // shortcuts and function keys (Ctrl+R, F5, F12…) still work.
  useEffect(() => {
    if (phase !== "test") return;
    const block = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const isTypingKey =
        e.key.length === 1 || e.key === "Backspace" || e.key === "Enter" || e.key === " " || e.key === "Tab";
      if (isTypingKey) e.preventDefault();
    };
    document.addEventListener("keydown", block);
    return () => document.removeEventListener("keydown", block);
  }, [phase]);

  const beginTest = async () => {
    setWordIdx(0);
    setGuess("");
    setFeedback("idle");
    setProcessing(false);
    setScore(0);
    scoreRef.current = 0;
    setMissedWords([]);
    setPhase("test");
    // Start a tracked run for this stage
    attemptIdRef.current = null;
    runStartRef.current = Date.now();
    try {
      const res = await fetch("/api/drills/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", studentName, drillSetId: set.id, totalQuestions: categoryWords.length }),
      });
      const data = await res.json();
      if (data.attempt) attemptIdRef.current = data.attempt.id;
    } catch {}
  };

  const startCategory = (idx: number) => {
    setCategoryIdx(idx);
    setPhase("study");
  };

  // ── Record card completion (server-side mastery marker) ──
  const markCompleted = async () => {
    await fetch("/api/drills/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "complete_reading", studentName, drillSetId: set.id, totalQuestions: categoryCount }),
    });
  };

  // ── Finish a category ──
  // A stage only counts as completed — and only unlocks the next stage —
  // when the student spells EVERY word in it correctly. Any misspelling
  // means the stage must be redone from the start.
  const finishCategory = useCallback(() => {
    const perfect = scoreRef.current >= categoryWords.length;
    completeStageRun();

    if (!perfect) {
      // Failed the stage — the result screen tells the student to redo it
      setPhase("result");
      return;
    }

    const wasComplete = completed.length >= categoryCount;
    const nextCompleted = completed.includes(categoryIdx)
      ? completed
      : [...completed, categoryIdx].sort((a, b) => a - b);
    setCompleted(nextCompleted);
    saveCompleted(set.id, studentName, nextCompleted);

    if (nextCompleted.length >= categoryCount && !wasComplete) {
      setPhase("alldone");
      markCompleted();
      confetti({ particleCount: 200, spread: 130, origin: { y: 0.6 }, colors: ["#FFD700", "#28a745", "#ffffff"] });
    } else {
      setPhase("result");
    }
  }, [completed, categoryIdx, categoryCount, categoryWords.length, set.id, studentName]);

  // ── Submit the current spelling ──
  const handleSubmit = () => {
    if (!currentWord || processing || !guess.trim()) return;
    setProcessing(true);
    const answer = stripLabel(currentWord.word).toLowerCase();
    const isCorrect = guess.trim().toLowerCase() === answer;
    // Track the spelling attempt — the guess itself is stored so analytics
    // can show exactly how the word was misspelt
    recordSpelling(currentWord.id, guess.trim(), isCorrect);
    if (isCorrect) {
      setFeedback("correct");
      scoreRef.current += 1;
      setScore(scoreRef.current);
      setTimeout(() => advance(), CORRECT_FLASH_MS);
    } else {
      setFeedback("wrong");
      setMissedWords((prev) => [...prev, currentWord]);
      // The correction displays briefly, then the next word goes in
      setTimeout(() => advance(), WRONG_FLASH_MS);
    }
  };

  const advance = () => {
    const next = wordIdx + 1;
    if (next >= categoryWords.length) {
      finishCategory();
    } else {
      setWordIdx(next);
      setGuess("");
      setFeedback("idle");
      setProcessing(false);
    }
  };

  // ── Progressive unlocking ──
  // Stage 1 is always open; every later stage unlocks only when the stage
  // before it has been completed with a perfect run.
  const isUnlocked = (idx: number) => idx === 0 || completed.includes(idx - 1);

  const nextCategoryIdx = () => {
    for (let i = 0; i < categoryCount; i++) {
      if (!completed.includes(i) && isUnlocked(i)) return i;
    }
    return -1;
  };

  const formatMinutes = (secs: number) =>
    `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;

  // ── EMPTY STATE ──
  if (words.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-10 text-center px-4">
        <p className="text-white/50">No spelling words loaded.</p>
        <button onClick={onDone}
          className="mt-4 px-6 py-2 rounded-xl bg-white/10 text-white/70 hover:bg-white/20 transition">
          <ArrowLeft size={16} className="inline mr-2" /> Back
        </button>
      </div>
    );
  }

  // ── HEADER ──
  const header = (
    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
      className="flex items-start justify-between gap-2 sm:gap-4">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-sky-500/20 to-cyan-500/20 border border-sky-500/20 flex items-center justify-center shrink-0">
          <Volume2 size={24} className="text-sky-400" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-heading font-bold text-white truncate">{set.title}</h1>
          <p className="text-white/50 text-sm">
            {phase === "study"
              ? `Stage ${categoryIdx + 1} of ${categoryCount} • Study • 2 minutes`
              : phase === "test"
                ? `Stage ${categoryIdx + 1} of ${categoryCount} • Word ${wordIdx + 1} of ${categoryWords.length}`
                : phase === "result" || phase === "alldone"
                  ? `${completed.length}/${categoryCount} stages completed`
                  : `${categoryCount} stages • ${words.length} words`}
          </p>
        </div>
      </div>
      <button onClick={onDone}
        className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition text-xs sm:text-sm shrink-0">
        <ArrowLeft size={16} /> <span className="hidden sm:inline">Back</span>
      </button>
    </motion.div>
  );

  // ═══════════════════════════════════════════════
  // SELECT PHASE — category / stage chooser
  // ═══════════════════════════════════════════════
  if (phase === "select") {
    const nextIdx = nextCategoryIdx();
    const allDone = nextIdx === -1;

    return (
      <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6 py-4 sm:py-6 px-2 sm:px-0">
        {header}

        {allDone && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="card border-policeGreen/30 bg-policeGreen/5 text-center space-y-3">
            <div className="inline-flex p-4 bg-policeGreen/20 rounded-full">
              <Trophy size={36} className="text-policeGold" />
            </div>
            <h2 className="text-xl font-heading font-bold text-white">Word Vault Mastered! 🏆</h2>
            <p className="text-sm text-white/60">You have completed all {categoryCount} stages. Replay any stage to sharpen your spelling, or return to the arena.</p>
            <button onClick={() => { markCompleted(); onDone(); }}
              className="px-8 py-3 rounded-xl bg-policeGold text-policeBlue font-bold hover:brightness-110 transition inline-flex items-center gap-2 mx-auto">
              <BookOpen size={16} /> Return to Arena
            </button>
          </motion.div>
        )}

        <div className="card border-sky-500/20 bg-sky-500/[0.03]">
          <div className="flex items-center gap-2 mb-2">
            <Layers size={16} className="text-sky-300" />
            <p className="text-sm text-white/70 leading-relaxed">
              Six spelling stages, one vault — stages unlock one by one. Spell every word in a stage
              correctly to unlock the next one; miss a single word and you redo that stage from the start.
              Completed stages stay open for replay any time.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {Array.from({ length: categoryCount }, (_, i) => {
            const cat = categories[i];
            const isDone = completed.includes(i);
            const unlocked = isUnlocked(i);
            const isNext = nextIdx === i && unlocked;
            return (
              <motion.button key={i}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                onClick={() => unlocked && startCategory(i)}
                disabled={!unlocked}
                className={`w-full text-left rounded-xl border p-4 transition group ${
                  !unlocked
                    ? "bg-white/[0.02] border-white/5 opacity-60 cursor-not-allowed"
                    : isDone
                      ? "bg-policeGreen/10 border-policeGreen/30 hover:border-policeGreen/50"
                      : isNext
                        ? "bg-sky-500/10 border-sky-400/40 hover:border-sky-300/60"
                        : "bg-white/5 border-white/10 hover:border-sky-400/30"
                }`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                      !unlocked
                        ? "bg-white/5 text-white/30"
                        : isDone ? "bg-policeGreen/20 text-policeGreen" : "bg-sky-500/20 text-sky-300"
                    }`}>
                      {!unlocked ? <Lock size={16} /> : isDone ? <Check size={18} /> : i + 1}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm font-bold truncate ${unlocked ? "text-white" : "text-white/40"}`}>
                        {cat?.name || `Category ${i + 1}`}
                      </p>
                      <p className="text-xs text-white/50 line-clamp-1">
                        {!unlocked
                          ? "Complete the previous stage perfectly to unlock"
                          : cat?.description || `${WORDS_PER_CATEGORY} words`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isNext && (
                      <span className="hidden sm:inline-block text-[9px] uppercase tracking-widest font-bold text-sky-300 bg-sky-500/15 px-2 py-1 rounded-full">
                        Continue here
                      </span>
                    )}
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1.5 rounded-lg inline-flex items-center gap-1 ${
                      !unlocked
                        ? "bg-white/5 text-white/30"
                        : isDone ? "bg-policeGreen/20 text-policeGreen" : "bg-policeGold text-policeBlue"
                    }`}>
                      {!unlocked ? <><Lock size={10} /> Locked</> : isDone ? "Replay" : "Start"}
                    </span>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════
  // STUDY PHASE — 2-minute word + transcription list
  // ═══════════════════════════════════════════════
  if (phase === "study") {
    const studyProgress = (timeLeft / STUDY_SECONDS) * 100;

    return (
      <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6 py-4 sm:py-6 px-2 sm:px-0">
        {header}

        <div className="card border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-yellow-500/5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Timer size={16} className="text-amber-400" />
              <span className="text-sm sm:text-base text-amber-400 font-semibold tabular-nums">
                {timeLeft > 0 ? formatMinutes(timeLeft) : "0:00"}
              </span>
            </div>
            <span className="text-[10px] uppercase tracking-widest text-white/40">
              {currentCategory?.name || `Category ${categoryIdx + 1}`}
            </span>
          </div>
          <div className="mt-3 w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div className="h-full bg-amber-400 rounded-full"
              animate={{ width: `${studyProgress}%` }}
              transition={{ duration: 0.3 }} />
          </div>
          <p className="mt-4 text-sm text-white/70 leading-relaxed">
            Study the {categoryWords.length} words and their transcriptions — the test page opens
            automatically when the timer runs out. You will see only the transcription and must
            spell each word by clicking the on-screen letters. Spell <strong className="text-white">every word correctly</strong> —
            one misspelling and you redo this stage from the start before the next one unlocks.
          </p>
        </div>

        <div className="card border-white/10 divide-y divide-white/5">
          {categoryWords.map((w, i) => (
            <div key={w.id} className="flex gap-3 py-2.5 first:pt-0 last:pb-0 items-baseline justify-between">
              <div className="flex items-baseline gap-3 min-w-0">
                <span className="w-7 h-7 rounded-lg bg-sky-500/15 text-sky-300 flex items-center justify-center text-xs font-bold shrink-0 self-center">
                  {i + 1}
                </span>
                <p className="font-bold text-white truncate">{w.word}</p>
              </div>
              <p className="text-sm text-amber-200/90 font-mono shrink-0">{w.meaning}</p>
            </div>
          ))}
        </div>

        <button onClick={beginTest}
          className="w-full py-3 rounded-xl bg-sky-500 text-white font-bold hover:brightness-110 transition flex items-center justify-center gap-2">
          Start the Test Now <ChevronRight size={18} />
        </button>
      </div>
    );
  }

  // ═══════════════════════════════════════════════
  // TEST PHASE — transcription shown, spell via on-screen keyboard
  // ═══════════════════════════════════════════════
  if (phase === "test" && currentWord) {
    const testProgress = (wordIdx / categoryWords.length) * 100;

    return (
      <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6 py-4 sm:py-6 px-2 sm:px-0">
        {header}

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
          <motion.div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-cyan-500"
            animate={{ width: `${testProgress}%` }}
            transition={{ duration: 0.3 }} />
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div key={`${categoryIdx}-${wordIdx}`}
            initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.25 }}
            className={`card ${
              feedback === "correct"
                ? "border-policeGreen/40 bg-policeGreen/5"
                : feedback === "wrong"
                  ? "border-policeRed/40 bg-policeRed/5"
                  : "border-sky-500/30 bg-gradient-to-br from-sky-500/5 to-cyan-500/5"
            }`}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] uppercase tracking-widest text-white/40">
                {currentCategory?.name || `Category ${categoryIdx + 1}`}
              </span>
              <span className="text-[10px] text-white/40">{wordIdx + 1}/{categoryWords.length}</span>
            </div>

            {/* Transcription prompt */}
            <div className="text-center space-y-2 mb-6">
              <p className="text-xs sm:text-sm uppercase tracking-widest text-sky-300/70">Spell the word</p>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-mono font-bold text-white tracking-tight break-words px-2">
                {currentWord.meaning}
              </h2>
            </div>

            {/* Guess tiles */}
            <div className="min-h-[3.25rem] flex flex-wrap justify-center gap-1.5 mb-6">
              {guess.split("").map((letter, i) => (
                <motion.span key={i}
                  initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  className={`w-9 h-11 sm:w-10 sm:h-12 rounded-lg border flex items-center justify-center text-lg font-bold uppercase ${
                    feedback === "correct"
                      ? "bg-policeGreen/20 border-policeGreen/50 text-white"
                      : feedback === "wrong"
                        ? "bg-policeRed/20 border-policeRed/50 text-white"
                        : "bg-white/10 border-white/20 text-white"
                  }`}>
                  {letter}
                </motion.span>
              ))}
              {guess.length === 0 && (
                <span className="text-white/30 italic text-sm self-center">Click the letters below to spell…</span>
              )}
            </div>

            {/* Correction (shown briefly after a wrong submit) */}
            {feedback === "wrong" && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="mb-6 bg-policeRed/10 border border-policeRed/25 rounded-xl p-4 text-center space-y-1">
                <p className="text-sm text-policeRed font-semibold flex items-center justify-center gap-1.5">
                  <X size={15} /> Not quite — the correct spelling is:
                </p>
                <p className="text-xl font-bold text-white tracking-wide">{stripLabel(currentWord.word)}</p>
              </motion.div>
            )}
            {feedback === "correct" && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="mb-6 bg-policeGreen/10 border border-policeGreen/25 rounded-xl p-3 text-center">
                <p className="text-sm text-policeGreen font-semibold flex items-center justify-center gap-1.5">
                  <Check size={15} /> Correct!
                </p>
              </motion.div>
            )}

            {/* On-screen keyboard — the ONLY way to enter letters */}
            <div className="space-y-1.5 sm:space-y-2 select-none">
              {KEY_ROWS.map((row, ri) => (
                <div key={ri} className="flex justify-center gap-1 sm:gap-1.5">
                  {row.map((letter) => (
                    <button key={letter}
                      onClick={() => setGuess((g) => (g.length < MAX_LETTERS ? g + letter : g))}
                      disabled={processing}
                      className={`flex-1 max-w-[40px] h-11 sm:h-12 rounded-lg border text-base sm:text-lg font-bold uppercase transition ${
                        feedback === "correct"
                          ? "bg-policeGreen/10 border-policeGreen/20 text-white/70"
                          : "bg-white/10 border-white/15 text-white hover:bg-sky-500/25 hover:border-sky-400/50 active:scale-95"
                      } disabled:opacity-40 disabled:cursor-not-allowed`}>
                      {letter}
                    </button>
                  ))}
                </div>
              ))}
              <div className="flex gap-2 pt-1.5">
                <button onClick={() => setGuess((g) => g.slice(0, -1))}
                  disabled={processing}
                  aria-label="Backspace"
                  className="flex-1 py-3 rounded-lg bg-white/10 border border-white/15 text-white/70 hover:bg-white/20 transition text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5">
                  <Delete size={16} /> Clear Letter
                </button>
                <button onClick={handleSubmit}
                  disabled={processing || !guess.trim()}
                  className={`flex-[2] py-3 rounded-lg text-sm font-bold uppercase tracking-wider transition flex items-center justify-center gap-1.5 ${
                    processing || !guess.trim()
                      ? "bg-white/10 border border-white/15 text-white/40 cursor-not-allowed"
                      : "bg-policeGold text-policeBlue hover:brightness-110 active:scale-95"
                  }`}>
                  <Check size={15} /> Submit
                </button>
              </div>
            </div>

            <p className="mt-4 text-center text-[10px] text-white/30">
              ⌨️ Keyboard entry is disabled — use the on-screen letters only
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  // ═══════════════════════════════════════════════
  // RESULT PHASE — stage finished (passed or must redo)
  // ═══════════════════════════════════════════════
  if (phase === "result") {
    const nextIdx = nextCategoryIdx();
    const pct = Math.round((score / Math.max(categoryWords.length, 1)) * 100);
    const passed = score >= categoryWords.length;

    return (
      <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6 py-4 sm:py-6 px-2 sm:px-0">
        {header}
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className={`card text-center space-y-4 ${
            passed
              ? "border-sky-500/30 bg-sky-500/5"
              : "border-policeRed/30 bg-policeRed/5"
          }`}>
          <div className={`inline-flex p-5 rounded-full ${
            passed ? "bg-sky-500/20" : "bg-policeRed/15"
          }`}>
            {passed
              ? <Sparkles size={44} className="text-sky-300" />
              : <X size={44} className="text-policeRed" />}
          </div>

          {passed ? (
            <>
              <h2 className="text-2xl font-heading font-bold text-white">
                Stage {categoryIdx + 1} Complete!
              </h2>
              <p className="text-white/60">
                Perfect run — all {categoryWords.length} words spelt correctly ({pct}%).
                {nextIdx !== -1
                  ? ` Stage ${nextIdx + 1} is now unlocked.`
                  : ""}
              </p>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-heading font-bold text-white">
                So Close — Redo Stage {categoryIdx + 1}
              </h2>
              <p className="text-white/60">
                You spelt {score} of {categoryWords.length} words correctly ({pct}%), but a stage
                only counts when <strong className="text-white">every word is spelt correctly</strong>.
                Redo the stage and finish without a single misspelling to unlock the next one.
              </p>
            </>
          )}

          {missedWords.length > 0 && (
            <div className="text-left space-y-1.5 bg-white/[0.03] border border-white/10 rounded-xl p-3">
              <p className="text-[10px] uppercase tracking-widest text-white/40">
                {passed ? "Words to keep an eye on" : `Words you missed this run (${missedWords.length})`}
              </p>
              {missedWords.map((w) => (
                <p key={w.id} className="text-sm text-white/70">
                  <span className="font-bold text-white">{w.word}</span>{" "}
                  <span className="font-mono text-amber-200/80">{w.meaning}</span>
                </p>
              ))}
            </div>
          )}

          <div className="space-y-2.5 pt-2">
            {passed && nextIdx !== -1 && (
              <button onClick={() => startCategory(nextIdx)}
                className="w-full py-3 rounded-xl bg-sky-500 text-white font-bold hover:brightness-110 transition flex items-center justify-center gap-2">
                Continue to Stage {nextIdx + 1} <ChevronRight size={17} />
              </button>
            )}
            {!passed && (
              <button onClick={() => startCategory(categoryIdx)}
                className="w-full py-3 rounded-xl bg-policeRed text-white font-bold hover:brightness-110 transition flex items-center justify-center gap-2">
                <RefreshCw size={16} /> Redo Stage {categoryIdx + 1}
              </button>
            )}
            <button onClick={() => setPhase("select")}
              className="w-full py-3 rounded-xl bg-white/10 text-white/80 font-bold hover:bg-white/20 transition flex items-center justify-center gap-2">
              <Layers size={16} /> All Stages
            </button>
            <button onClick={onDone}
              className="w-full py-3 rounded-xl bg-white/5 text-white/60 font-bold hover:bg-white/10 transition flex items-center justify-center gap-2">
              <BookOpen size={16} /> Return to Arena
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════
  // ALL DONE PHASE — every stage completed
  // ═══════════════════════════════════════════════
  return (
    <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6 py-4 sm:py-6 px-2 sm:px-0">
      {header}
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        className="card border-policeGreen/30 bg-policeGreen/5 text-center space-y-4">
        <div className="inline-flex p-5 bg-policeGold/20 rounded-full">
          <Trophy size={48} className="text-policeGold" />
        </div>
        <h2 className="text-2xl font-heading font-bold text-white">Word Vault Mastered! 🏆</h2>
        <p className="text-white/60">
          You completed all {categoryCount} stages of the spelling vault — {words.length} words spelt.
          Final stage score: {score}/{categoryWords.length}.
        </p>
        <div className="space-y-2.5 pt-2">
          <button onClick={() => setPhase("select")}
            className="w-full py-3 rounded-xl bg-white/10 text-white/80 font-bold hover:bg-white/20 transition flex items-center justify-center gap-2">
            <RefreshCw size={16} /> Replay a Stage
          </button>
          <button onClick={() => { markCompleted(); onDone(); }}
            className="w-full py-3 rounded-xl bg-policeGold text-policeBlue font-bold hover:brightness-110 transition flex items-center justify-center gap-2">
            <BookOpen size={16} /> Return to Arena
          </button>
        </div>
      </motion.div>
    </div>
  );
}

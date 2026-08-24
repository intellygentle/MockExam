"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, BookOpen, Bookmark, Timer, Check, X, ChevronRight } from "lucide-react";

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
  word: string;
  meaning: string;
};

type Phase = "study" | "recall" | "correct" | "wrong" | "complete";

type Props = {
  set: DrillSet;
  words: VocabWord[];
  studentName: string;
  onDone: () => void;
};

const STUDY_SECONDS = 10;

export default function VocabularyCard({ set, words, studentName, onDone }: Props) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>("study");
  const [timeLeft, setTimeLeft] = useState(STUDY_SECONDS);
  const [userInput, setUserInput] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentWord = words[currentIdx] ?? null;
  const progress = words.length > 0 ? ((currentIdx) / words.length) * 100 : 0;

  // Study-phase countdown
  useEffect(() => {
    if (phase !== "study") return;
    setTimeLeft(STUDY_SECONDS);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, currentIdx]);

  // Auto-transition study → recall when timer hits 0
  useEffect(() => {
    if (phase === "study" && timeLeft === 0) {
      setPhase("recall");
    }
  }, [phase, timeLeft]);

  // Focus input when entering recall phase
  useEffect(() => {
    if (phase === "recall") {
      setUserInput("");
      setTimeout(() => {
        const input = document.getElementById("vocab-recall-input");
        if (input) input.focus();
      }, 100);
    }
  }, [phase]);

  const handleSubmit = useCallback(() => {
    if (!currentWord) return;
    const normalizedInput = userInput.trim().toLowerCase();
    const normalizedMeaning = currentWord.meaning.trim().toLowerCase();

    if (normalizedInput === normalizedMeaning) {
      setPhase("correct");
      setTimeout(() => {
        const next = currentIdx + 1;
        if (next >= words.length) {
          setPhase("complete");
        } else {
          setCurrentIdx(next);
          setPhase("study");
        }
      }, 1200);
    } else {
      setPhase("wrong");
      setTimeout(() => {
        // Reset to beginning on wrong answer
        setCurrentIdx(0);
        setPhase("study");
      }, 2000);
    }
  }, [userInput, currentWord, currentIdx, words.length]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit();
  };

  if (!currentWord && phase !== "complete") {
    return (
      <div className="max-w-2xl mx-auto py-10 text-center">
        <p className="text-white/50">No vocabulary words loaded.</p>
        <button onClick={onDone}
          className="mt-4 px-6 py-2 rounded-xl bg-white/10 text-white/70 hover:bg-white/20 transition">
          <ArrowLeft size={16} className="inline mr-2" /> Back
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-yellow-500/20 flex items-center justify-center border border-amber-500/20">
            <Bookmark size={24} className="text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-heading font-bold text-white">{set.title}</h1>
            <p className="text-white/50 text-sm">
              {words.length} word{words.length !== 1 ? "s" : ""} • Key Vocabulary
            </p>
          </div>
        </div>
        <button onClick={onDone}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-white/70 hover:bg-white/20 transition text-sm shrink-0">
          <ArrowLeft size={16} /> Back
        </button>
      </motion.div>

      {/* Progress bar */}
      {phase !== "complete" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
          <motion.div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-500"
            initial={{ width: `${progress}%` }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }} />
        </motion.div>
      )}

      {/* Study card — show word + meaning, countdown */}
      <AnimatePresence mode="wait">
        {phase === "study" && currentWord && (
          <motion.div key={`study-${currentIdx}`}
            initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.25 }} className="card border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-yellow-500/5">
            {/* Countdown */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Timer size={16} className="text-amber-400" />
                <span className="text-sm text-amber-400 font-semibold">{timeLeft}s</span>
              </div>
              <div className="w-full max-w-[200px] h-1.5 bg-white/10 rounded-full overflow-hidden ml-4">
                <motion.div className="h-full bg-amber-400 rounded-full"
                  initial={{ width: "100%" }}
                  animate={{ width: `${(timeLeft / STUDY_SECONDS) * 100}%` }}
                  transition={{ duration: 0.3 }} />
              </div>
              <span className="text-[10px] text-white/40 ml-4">
                {currentIdx + 1}/{words.length}
              </span>
            </div>

            <div className="text-center space-y-4">
              <p className="text-sm uppercase tracking-widest text-amber-400/70">Word</p>
              <h2 className="text-4xl sm:text-5xl font-heading font-extrabold text-white tracking-tight">
                {currentWord.word}
              </h2>
              <div className="w-16 h-px bg-amber-400/30 mx-auto" />
              <p className="text-sm uppercase tracking-widest text-white/40">Meaning</p>
              <p className="text-lg sm:text-xl text-white/80 leading-relaxed font-medium">
                {currentWord.meaning}
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 text-center">
              <p className="text-[11px] text-white/40">
                ⏳ Memorise carefully — you'll be asked to type it back
              </p>
            </div>
          </motion.div>
        )}

        {/* Recall card — student types the meaning */}
        {phase === "recall" && currentWord && (
          <motion.div key={`recall-${currentIdx}`}
            initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.25 }} className="card border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-yellow-500/5">
            <div className="text-center space-y-4">
              <p className="text-sm uppercase tracking-widest text-amber-400/70">Recall the meaning of</p>
              <h2 className="text-4xl sm:text-5xl font-heading font-extrabold text-white tracking-tight">
                {currentWord.word}
              </h2>
            </div>

            <div className="mt-6 space-y-3">
              <label className="block text-xs uppercase tracking-[0.2em] text-white/50">
                Type the meaning exactly as you saw it
              </label>
              <input
                id="vocab-recall-input"
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type the meaning here..."
                className="w-full bg-black/40 border border-white/10 focus:border-amber-400 rounded-xl px-4 py-3 text-white outline-none transition text-sm"
                autoComplete="off"
              />
              <button onClick={handleSubmit}
                disabled={!userInput.trim()}
                className="w-full py-3 rounded-xl bg-amber-500 text-white font-bold hover:brightness-110 transition disabled:opacity-40 disabled:cursor-not-allowed text-sm">
                Check Answer
              </button>
            </div>

            <div className="mt-4 text-center">
              <p className="text-[10px] text-white/30">Press Enter to submit</p>
            </div>
          </motion.div>
        )}

        {/* Correct feedback */}
        {phase === "correct" && currentWord && (
          <motion.div key="correct"
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }} className="card border-policeGreen/30 bg-policeGreen/5 text-center">
            <div className="inline-flex p-4 bg-policeGreen/20 rounded-full mb-4">
              <Check size={40} className="text-policeGreen" />
            </div>
            <h3 className="text-xl font-bold text-policeGreen">Correct!</h3>
            <p className="text-white/50 text-sm mt-1">
              <span className="text-white font-semibold">{currentWord.word}</span> — {currentWord.meaning}
            </p>
            <p className="text-[10px] text-white/30 mt-3">Advancing to next word...</p>
          </motion.div>
        )}

        {/* Wrong feedback */}
        {phase === "wrong" && currentWord && (
          <motion.div key="wrong"
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }} className="card border-policeRed/30 bg-policeRed/5 text-center">
            <div className="inline-flex p-4 bg-policeRed/20 rounded-full mb-4">
              <X size={40} className="text-policeRed" />
            </div>
            <h3 className="text-xl font-bold text-policeRed">Not quite!</h3>
            <div className="mt-3 space-y-1">
              <p className="text-white/60 text-sm">The correct meaning was:</p>
              <p className="text-white font-semibold text-lg">{currentWord.meaning}</p>
              <p className="text-white/40 text-xs mt-1">You typed: {userInput || "(empty)"}</p>
            </div>
            <p className="text-[10px] text-amber-400 mt-4 font-semibold">
              ⚠️ Starting over from the first word...
            </p>
          </motion.div>
        )}

        {/* Complete */}
        {phase === "complete" && (
          <motion.div key="complete"
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="card border-policeGreen/30 bg-policeGreen/5 text-center space-y-4">
            <div className="inline-flex p-5 bg-policeGreen/20 rounded-full">
              <Check size={48} className="text-policeGreen" />
            </div>
            <h2 className="text-2xl font-heading font-bold text-white">All Words Mastered! 🎉</h2>
            <p className="text-white/60">
              You successfully recalled all {words.length} vocabulary words.
            </p>
            <button onClick={onDone}
              className="mt-4 px-8 py-3 rounded-xl bg-policeGold text-policeBlue font-bold hover:brightness-110 transition flex items-center justify-center gap-2 mx-auto">
              <BookOpen size={16} /> Return to Arena
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
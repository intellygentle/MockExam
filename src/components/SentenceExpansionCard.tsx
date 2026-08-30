"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Check, X, Loader2, Trophy, ChevronRight,
  PenLine, PencilLine, RotateCcw
} from "lucide-react";

// ── TYPES ──

type DrillSet = {
  id: number;
  title: string;
  description: string;
  card_type?: string;
  question_count: number;
};

type SentenceExpansionData = {
  topic: string;
  conjunction: string;
  modelAnswer: string;
  keyTokens: string[];
};

type QuestionItem = {
  prompt: string;
  source: string;
  sentenceExpansion: SentenceExpansionData | null;
};

type Props = {
  set: DrillSet;
  studentName: string;
  onDone: () => void;
};

// ── COMPONENT ──

export default function SentenceExpansionCard({ set, studentName, onDone }: Props) {
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [input, setInput] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{ correct: boolean; nudge: string } | null>(null);
  const [allComplete, setAllComplete] = useState(false);
  const [startTime] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const current = questions[currentIdx] ?? null;
  const data = current?.sentenceExpansion ?? null;

  // Load card data
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(
          `/api/lesson-card/card?drill_set_id=${set.id}&student_name=${encodeURIComponent(studentName)}`
        );
        if (res.ok) {
          const json = await res.json();
          setQuestions(json.items || []);
        }
      } catch {}
      setLoading(false);
    };
    load();
  }, [set.id, studentName]);

  // Timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [startTime]);

  // Focus input when question changes
  useEffect(() => {
    if (!loading && !allComplete && current) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [currentIdx, loading, allComplete]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const handleCheck = useCallback(async () => {
    if (!input.trim() || checking) return;
    setChecking(true);
    setResult(null);
    try {
      const res = await fetch("/api/lesson-card/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          drillSetId: set.id,
          index: currentIdx,
          answer: input.trim(),
        }),
      });
      const json = await res.json();
      setResult(json);
      if (json.correct) {
        // Advance after brief delay
        setTimeout(() => {
          setResult(null);
          setInput("");
          const next = currentIdx + 1;
          if (next >= questions.length) {
            setAllComplete(true);
            if (timerRef.current) clearInterval(timerRef.current);
          } else {
            setCurrentIdx(next);
          }
        }, 1500);
      }
    } catch {}
    setChecking(false);
  }, [input, checking, currentIdx, set.id, questions.length]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleCheck();
    }
  };

  // ── LOADING ──
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center px-4">
        <Loader2 size={32} className="text-policeGold animate-spin mx-auto mb-4" />
        <p className="text-white/50 text-sm">Loading sentence expansion...</p>
      </div>
    );
  }

  // ── ALL COMPLETE ──
  if (allComplete) {
    if (timerRef.current) clearInterval(timerRef.current);
    return (
      <div className="max-w-3xl mx-auto py-10 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card text-center space-y-6"
        >
          <div className="inline-flex p-6 bg-policeGreen/10 rounded-full">
            <Trophy size={56} className="text-policeGreen" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-heading font-bold text-white">
            🎉 All Sentences Written!
          </h2>
          <p className="text-white/60 text-lg">
            You wrote {questions.length} original sentences using subordinating conjunctions correctly.
          </p>
          <div className="bg-white/5 rounded-xl p-4 inline-flex items-center gap-2">
            <span className="text-xs text-white/50 uppercase tracking-widest">Time</span>
            <span className="text-lg font-bold font-mono text-policeGold">{formatTime(elapsed)}</span>
          </div>
          <div className="pt-4">
            <button
              onClick={onDone}
              className="px-8 py-3 rounded-xl bg-policeGold text-policeBlue font-bold hover:brightness-110 transition"
            >
              Back to The Arena
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── NO DATA ──
  if (!current || !data) {
    return (
      <div className="max-w-4xl mx-auto py-10 text-center px-4">
        <p className="text-white/50">No questions loaded.</p>
        <button
          onClick={onDone}
          className="mt-4 px-6 py-2 rounded-xl bg-white/10 text-white/70 hover:bg-white/20 transition"
        >
          <ArrowLeft size={16} className="inline mr-2" /> Back
        </button>
      </div>
    );
  }

  // ── MAIN UI ──
  const progressPct = questions.length > 0 ? (currentIdx / questions.length) * 100 : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 py-4 sm:py-6 px-2 sm:px-0">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between gap-2 sm:gap-4"
      >
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center border shrink-0 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border-emerald-500/20">
            <PenLine size={24} className="text-emerald-400" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-heading font-bold text-white truncate">
              {set.title}
            </h1>
            <p className="text-white/50 text-xs sm:text-sm">
              Sentence {currentIdx + 1} of {questions.length} • Must be correct to advance
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <span className="text-xs font-mono text-white/50">{formatTime(elapsed)}</span>
          <button
            onClick={onDone}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 text-white/70 hover:bg-white/20 transition text-xs sm:text-sm"
          >
            <ArrowLeft size={14} /> <span className="hidden sm:inline">Back</span>
          </button>
        </div>
      </motion.div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500"
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Prompt card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIdx}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          className={`card transition-all ${
            result?.correct
              ? "border-policeGreen/30 bg-policeGreen/5"
              : result && !result.correct
                ? "border-policeRed/20 bg-policeRed/5"
                : "border-white/10"
          }`}
        >
          {/* Topic + Conjunction prompt */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-5">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <PencilLine size={14} className="text-emerald-400" />
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
                  {current.source}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white">
                Topic: <span className="text-emerald-400">{data.topic}</span>
              </h2>
            </div>
            <div className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 shrink-0">
              <span className="text-xs text-emerald-300 uppercase tracking-widest">Use:</span>
              <span className="ml-2 text-lg font-bold text-emerald-300 font-mono">
                {data.conjunction}
              </span>
            </div>
          </div>

          {/* Instruction */}
          <p className="text-white/50 text-sm mb-4">
            Write one original, correctly punctuated sentence about <strong className="text-white/80">{data.topic}</strong> using the conjunction <strong className="text-emerald-300">{data.conjunction}</strong>.
          </p>

          {/* Textarea */}
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => { setInput(e.target.value); setResult(null); }}
            onKeyDown={handleKeyDown}
            placeholder={`Write your sentence about "${data.topic}" using "${data.conjunction}"...`}
            disabled={checking || result?.correct}
            rows={3}
            className="w-full bg-black/40 border border-white/10 focus:border-emerald-500 rounded-xl px-4 py-3 text-white outline-none transition resize-none placeholder-white/20 disabled:opacity-60"
          />

          {/* Check button */}
          {!result?.correct && (
            <button
              onClick={handleCheck}
              disabled={!input.trim() || checking}
              className="mt-3 w-full py-3 rounded-xl bg-emerald-600 text-white font-bold hover:brightness-110 transition disabled:opacity-40 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2"
            >
              {checking ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Checking...
                </>
              ) : (
                <>
                  <Check size={16} /> Check My Sentence
                </>
              )}
            </button>
          )}

          {/* Result feedback */}
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mt-4 p-4 rounded-xl border ${
                result.correct
                  ? "bg-policeGreen/10 border-policeGreen/30"
                  : "bg-policeRed/10 border-policeRed/20"
              }`}
            >
              {result.correct ? (
                <div className="flex items-center gap-2 text-policeGreen">
                  <Check size={18} />
                  <span className="text-sm font-bold">Correct! Well written.</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-policeRed">
                    <X size={16} />
                    <span className="text-sm font-bold">Not quite right.</span>
                  </div>
                  <p className="text-sm text-white/70">{result.nudge}</p>
                </div>
              )}
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Hint panel */}
      <div className="card border-white/5 bg-white/[0.02]">
        <details>
          <summary className="text-xs text-white/40 cursor-pointer hover:text-white/60 transition select-none">
            📖 Comma Rules Reminder
          </summary>
          <div className="mt-3 space-y-2 text-xs text-white/50">
            <p><strong className="text-white/70">Fronted clause:</strong> If the conjunction starts the sentence, put a comma after the subordinate clause.</p>
            <p><strong className="text-white/70">Trailing whereas/although/though:</strong> Always put a comma before these, even when they appear in the middle.</p>
            <p><strong className="text-white/70">Trailing because/since/unless/after/before/once:</strong> Usually no comma needed.</p>
            <p><strong className="text-white/70">Only ONE conjunction per sentence</strong> — no double-conjunction errors.</p>
          </div>
        </details>
      </div>
    </div>
  );
}

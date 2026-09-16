"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Brain, Check, X, Loader2, Trophy, RotateCcw, Timer, Eye, EyeOff,
} from "lucide-react";

/** Seconds the term + meaning stay on screen before the meaning hides. */
const STUDY_SECONDS = 10;

type Item = {
  prompt: string;
  definition: string;
  stage: number;
};

type DrillSet = {
  id: number;
  title: string;
  description: string;
  question_count: number;
};

type Props = {
  set: DrillSet;
  studentName: string;
  schoolName?: string;
  onDone: () => void;
};

type Mode = "study" | "input" | "feedback" | "stage_done" | "done";

/** Compare definitions case- and punctuation-insensitively (exact words required). */
function normalizeDefinition(text: string): string {
  return (text || "")
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export default function DefinitionRecallCard({ set, studentName, schoolName = "", onDone }: Props) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Item[]>([]);
  const [mode, setMode] = useState<Mode>("study");
  const [stageIdx, setStageIdx] = useState(0);
  const [wordIdx, setWordIdx] = useState(0);
  const [typed, setTyped] = useState("");
  const [result, setResult] = useState<{ correct: boolean } | null>(null);
  const [countdown, setCountdown] = useState(STUDY_SECONDS);
  const [elapsed, setElapsed] = useState(0);
  const [startTime] = useState(Date.now());
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ── Load the card ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const name = studentName.trim() || "Anonymous";
        const res = await fetch(
          `/api/lesson-card/card?drill_set_id=${set.id}&student_name=${encodeURIComponent(name)}`
        );
        if (res.ok) {
          const json = await res.json();
          if (!cancelled) setItems(json.items || []);
        }
      } catch {}
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [set.id, studentName]);

  // ── Elapsed clock ──
  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(id);
  }, [startTime]);

  // ── Group items into ordered stages ──
  const stages = useMemo(() => {
    const map = new Map<number, Item[]>();
    for (const it of items) {
      const s = it.stage || 1;
      if (!map.has(s)) map.set(s, []);
      map.get(s)!.push(it);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([, list]) => list);
  }, [items]);

  const currentStage = stages[stageIdx] || [];
  const current = currentStage[wordIdx] || null;
  const stageNumber = stageIdx + 1;

  // ── 10-second study countdown, then reveal the input ──
  useEffect(() => {
    if (mode !== "study" || !current) return;
    setCountdown(STUDY_SECONDS);
    const id = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [mode, stageIdx, wordIdx, items.length, current]);

  useEffect(() => {
    if (mode === "study" && countdown <= 0) setMode("input");
  }, [countdown, mode]);

  // ── Focus the input once it appears ──
  useEffect(() => {
    if (mode === "input") setTimeout(() => inputRef.current?.focus(), 120);
  }, [mode, stageIdx, wordIdx]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const startStage = (index: number) => {
    setStageIdx(index);
    setWordIdx(0);
    setTyped("");
    setResult(null);
    setMode("study");
  };

  const finish = async () => {
    setMode("done");
    try {
      await fetch("/api/lesson-card/study", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName: studentName.trim() || "Anonymous",
          schoolName: schoolName.trim(),
          drillSetId: set.id,
        }),
      });
    } catch {}
  };

  const advance = () => {
    // Last word of the stage?
    if (wordIdx + 1 >= currentStage.length) {
      // Last stage? then the whole card is done.
      if (stageIdx + 1 >= stages.length) {
        void finish();
        return;
      }
      setTyped("");
      setResult(null);
      setMode("stage_done");
      return;
    }
    setWordIdx((w) => w + 1);
    setTyped("");
    setResult(null);
    setMode("study");
  };

  const handleCheck = () => {
    if (mode !== "input" || !current || !typed.trim()) return;
    const correct = normalizeDefinition(typed) === normalizeDefinition(current.definition);
    setResult({ correct });
    setMode("feedback");
    if (correct) setTimeout(() => advance(), 1300);
  };

  const restartStage = () => {
    setWordIdx(0);
    setTyped("");
    setResult(null);
    setMode("study");
  };

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
        <p className="text-white/50 text-sm">Loading definitions...</p>
      </div>
    );
  }

  // ── ALL DONE ──
  if (mode === "done") {
    return (
      <div className="max-w-3xl mx-auto py-10 px-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="card text-center space-y-6">
          <div className="inline-flex p-6 bg-policeGreen/10 rounded-full">
            <Trophy size={56} className="text-policeGreen" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-heading font-bold text-white">🎉 All 3 Stages Cleared!</h2>
          <p className="text-white/60 text-lg">
            You recalled all {items.length} definitions exactly, stage by stage.
          </p>
          <div className="bg-white/5 rounded-xl p-4 inline-flex items-center gap-2">
            <span className="text-xs text-white/50 uppercase tracking-widest">Time</span>
            <span className="text-lg font-bold font-mono text-policeGold">{formatTime(elapsed)}</span>
          </div>
          <div className="pt-4">
            <button onClick={onDone} className="px-8 py-3 rounded-xl bg-policeGold text-policeBlue font-bold hover:brightness-110 transition">
              Back to The Arena
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── NO DATA ──
  if (!current) {
    return (
      <div className="max-w-4xl mx-auto py-10 text-center px-4">
        <p className="text-white/50">No definitions loaded.</p>
        <button onClick={onDone} className="mt-4 px-6 py-2 rounded-xl bg-white/10 text-white/70 hover:bg-white/20 transition">
          <ArrowLeft size={16} className="inline mr-2" /> Back
        </button>
      </div>
    );
  }

  const totalBefore = stages.slice(0, stageIdx).reduce((sum, s) => sum + s.length, 0);
  const completedInStage = mode === "feedback" && result?.correct ? wordIdx + 1 : wordIdx;
  const progressPct = items.length ? ((totalBefore + completedInStage) / items.length) * 100 : 0;

  return (
    <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6 py-4 sm:py-6 px-2 sm:px-0">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center border shrink-0 bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border-violet-500/20">
            <Brain size={24} className="text-violet-300" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-heading font-bold text-white truncate">{set.title}</h1>
            <p className="text-white/50 text-xs sm:text-sm">
              Stage {stageNumber} of {stages.length} • Word {wordIdx + 1} of {currentStage.length}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <span className="text-xs font-mono text-white/50">{formatTime(elapsed)}</span>
          <button onClick={onDone} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 text-white/70 hover:bg-white/20 transition text-xs sm:text-sm">
            <ArrowLeft size={14} /> <span className="hidden sm:inline">Back</span>
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
        <motion.div className="h-full rounded-full bg-gradient-to-r from-violet-400 to-indigo-500" animate={{ width: `${progressPct}%` }} transition={{ duration: 0.3 }} />
      </div>

      {/* Stage complete interstitial */}
      {mode === "stage_done" ? (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card text-center space-y-5 border-policeGreen/30 bg-policeGreen/5">
          <div className="inline-flex p-5 bg-policeGreen/10 rounded-full">
            <Check size={44} className="text-policeGreen" />
          </div>
          <h2 className="text-2xl font-heading font-bold text-white">Stage {stageNumber} complete!</h2>
          <p className="text-white/60 text-sm">
            You recalled all {currentStage.length} definitions in this stage. Ready for Stage {stageNumber + 1} ({stages[stageIdx + 1]?.length} words)?
          </p>
          <button onClick={() => startStage(stageIdx + 1)} className="px-8 py-3 rounded-xl bg-policeGold text-policeBlue font-bold hover:brightness-110 transition">
            Start Stage {stageNumber + 1}
          </button>
        </motion.div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={`${stageIdx}-${wordIdx}-${mode}`}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className={`card transition-all ${
              mode === "feedback" && result?.correct
                ? "border-policeGreen/30 bg-policeGreen/5"
                : mode === "feedback" && result && !result.correct
                  ? "border-policeRed/20 bg-policeRed/5"
                  : "border-white/10"
            }`}
          >
            {/* Study phase */}
            {mode === "study" && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full bg-violet-500/15 text-violet-300">
                    <Eye size={11} /> Study this
                  </span>
                  <span className="flex items-center gap-1.5 text-sm font-bold text-policeGold">
                    <Timer size={16} /> {Math.max(countdown, 0)}s
                  </span>
                </div>
                <div className="text-center py-4">
                  <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white">{current.prompt}</h2>
                </div>
                <div className="bg-violet-500/5 border border-violet-500/20 rounded-2xl p-5">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-violet-300 font-semibold mb-2">Meaning</p>
                  <p className="text-base sm:text-lg text-white/90 leading-relaxed">{current.definition}</p>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-policeGold"
                    initial={{ width: "100%" }}
                    animate={{ width: "0%" }}
                    transition={{ duration: STUDY_SECONDS, ease: "linear" }}
                  />
                </div>
              </div>
            )}

            {/* Input phase */}
            {mode === "input" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300">
                    <EyeOff size={11} /> Meaning hidden — type it back
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white text-center py-3">{current.prompt}</h2>
                <textarea
                  ref={inputRef}
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type the meaning exactly, word for word..."
                  rows={4}
                  className="w-full bg-black/40 border border-white/10 focus:border-violet-500 rounded-xl px-4 py-3 text-white outline-none transition resize-none placeholder-white/20"
                />
                <button
                  onClick={handleCheck}
                  disabled={!typed.trim()}
                  className="w-full py-3 rounded-xl bg-violet-600 text-white font-bold hover:brightness-110 transition disabled:opacity-40 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2"
                >
                  <Check size={16} /> Check My Answer
                </button>
              </div>
            )}

            {/* Feedback phase */}
            {mode === "feedback" && result && (
              <div className="space-y-4">
                {result.correct ? (
                  <div className="flex items-center gap-2 text-policeGreen py-6 justify-center">
                    <Check size={22} />
                    <span className="text-lg font-bold">Correct! Exactly right.</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-policeRed">
                      <X size={18} />
                      <span className="text-base font-bold">Not exact — the stage restarts.</span>
                    </div>
                    <div className="bg-policeGreen/5 border border-policeGreen/20 rounded-2xl p-4">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-policeGreen font-semibold mb-2">Correct meaning</p>
                      <p className="text-sm text-white/90 leading-relaxed">{current.definition}</p>
                    </div>
                    <button
                      onClick={restartStage}
                      className="w-full py-3 rounded-xl bg-policeGold text-policeBlue font-bold hover:brightness-110 transition text-sm flex items-center justify-center gap-2"
                    >
                      <RotateCcw size={16} /> Restart Stage {stageNumber} from the top
                    </button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      <p className="text-center text-[10px] uppercase tracking-widest text-white/40">
        Read for 10s · meaning hides · type it exactly · one miss restarts the stage
      </p>
    </div>
  );
}

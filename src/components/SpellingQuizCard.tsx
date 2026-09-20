"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, BadgeCheck, Gauge, Loader2, RotateCcw, Sparkles, Target, Timer, Trophy, Zap,
} from "lucide-react";

/** Length of one timed run (seconds) — also returned by the card API. */
const DEFAULT_RUN_SECONDS = 300;
/** Correct answers in a row (across runs) a word needs before it is learned. */
const DEFAULT_MASTERY_TARGET = 3;

type Item = {
  /** The RP pronunciation shown for the word. */
  prompt: string;
  /** Section name, e.g. "Silent letters". */
  source: string;
  /** Disambiguating note such as "(verb)". */
  note: string;
  /** The two rival spellings. */
  options: { a: string; b: string };
  /** Which option is the real word. */
  correct: "a" | "b";
};

/** Per-word progress across every run this student has played. */
type Progress = {
  learnedWords: number;
  totalWords: number;
  percent: number;
  seenWords: number;
  notSeenWords: number;
  atStreak1: number;
  atStreak2: number;
  mastered: boolean;
  started: boolean;
};

type RunReport = {
  mastered: boolean;
  progress: Progress;
  learnedThisRun: string[];
  runStats: { attempted: number; correct: number; wrong: number; score: number };
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

type Phase = "loading" | "ready" | "running" | "done";

/** Fisher–Yates shuffle so every run presents a fresh order. */
function shuffle<T>(list: T[]): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function formatClock(totalSeconds: number): string {
  const m = Math.floor(Math.max(totalSeconds, 0) / 60);
  const s = Math.max(totalSeconds, 0) % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Progression panel: how many of the 120 words have been spelled correctly
 * three runs in a row. Shared by the start screen and the results screen.
 */
function ProgressionPanel({
  progress,
  target,
  heading,
}: {
  progress: Progress;
  target: number;
  heading: string;
}) {
  const remaining = Math.max(progress.totalWords - progress.learnedWords, 0);
  return (
    <div className={`card border space-y-3 ${progress.mastered ? "border-policeGreen/30 bg-policeGreen/5" : "border-sky-500/20 bg-sky-500/5"}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {progress.mastered ? (
            <BadgeCheck size={18} className="text-policeGreen shrink-0" />
          ) : (
            <Target size={18} className="text-sky-300 shrink-0" />
          )}
          <h3 className={`text-sm font-heading font-bold truncate ${progress.mastered ? "text-policeGreen" : "text-white"}`}>
            {progress.mastered ? "🏆 Card mastered — all words learned!" : heading}
          </h3>
        </div>
        <span className={`text-lg font-bold tabular-nums ${progress.mastered ? "text-policeGreen" : "text-sky-300"}`}>
          {progress.percent}%
        </span>
      </div>

      <div className="w-full h-2.5 bg-black/30 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${progress.mastered ? "bg-policeGreen" : "bg-gradient-to-r from-sky-400 to-policeGold"}`}
          initial={{ width: 0 }}
          animate={{ width: `${progress.percent}%` }}
          transition={{ duration: 0.6 }}
        />
      </div>

      <p className="text-sm text-white/70">
        <span className="font-bold text-white">{progress.learnedWords}</span> of{" "}
        <span className="font-bold text-white">{progress.totalWords}</span> words learned
        {!progress.mastered && (
          <> — <span className="text-policeGold font-semibold">{remaining}</span> still to go</>
        )}
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
        <div className="bg-white/5 rounded-lg p-2">
          <p className="text-sm font-bold text-policeGreen">{progress.learnedWords}</p>
          <p className="text-[9px] uppercase tracking-widest text-white/40">{target} in a row</p>
        </div>
        <div className="bg-white/5 rounded-lg p-2">
          <p className="text-sm font-bold text-policeGold">{progress.atStreak2}</p>
          <p className="text-[9px] uppercase tracking-widest text-white/40">{target - 1} in a row</p>
        </div>
        <div className="bg-white/5 rounded-lg p-2">
          <p className="text-sm font-bold text-white">{progress.atStreak1}</p>
          <p className="text-[9px] uppercase tracking-widest text-white/40">1 correct</p>
        </div>
        <div className="bg-white/5 rounded-lg p-2">
          <p className="text-sm font-bold text-white/70">{progress.notSeenWords}</p>
          <p className="text-[9px] uppercase tracking-widest text-white/40">Not seen yet</p>
        </div>
      </div>

      {!progress.mastered && (
        <p className="text-[11px] text-white/50 leading-relaxed">
          A word counts as learned after you spell it correctly{" "}
          <span className="text-white/80 font-semibold">{target} runs in a row</span>. One wrong tap
          resets that word to 0. Every run is shuffled, so keep going until no word is left behind.
        </p>
      )}
    </div>
  );
}

export default function SpellingQuizCard({ set, studentName, schoolName = "", onDone }: Props) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [items, setItems] = useState<Item[]>([]);
  const [deck, setDeck] = useState<Item[]>([]);
  const [runSeconds, setRunSeconds] = useState(DEFAULT_RUN_SECONDS);
  const [masteryTarget, setMasteryTarget] = useState(DEFAULT_MASTERY_TARGET);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(DEFAULT_RUN_SECONDS);
  const [picked, setPicked] = useState<"a" | "b" | null>(null);
  const [flash, setFlash] = useState<{ kind: "up" | "down"; key: number } | null>(null);
  const [locked, setLocked] = useState(false);
  const [missed, setMissed] = useState<{ shown: string; correct: string }[]>([]);
  const [clearedVault, setClearedVault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [report, setReport] = useState<RunReport | null>(null);

  const finishedRef = useRef(false);
  const deadlineRef = useRef(0);
  const advanceRef = useRef<number | null>(null);
  const picksRef = useRef<{ index: number; choice: "a" | "b" }[]>([]);

  // ── Load the card + this student's progress ──
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
          if (cancelled) return;
          const loaded: Item[] = (json.items || [])
            .filter((it: any) => it?.spellingOptions?.a && it?.spellingOptions?.b)
            .map((it: any) => ({
              prompt: it.prompt || "",
              source: it.source || "",
              note: it.note || "",
              options: { a: it.spellingOptions.a, b: it.spellingOptions.b },
              correct: it.correctOption === "b" ? "b" : "a",
            }));
          setItems(loaded);
          setDeck(shuffle(loaded));
          if (typeof json.runSeconds === "number" && json.runSeconds > 0) {
            setRunSeconds(json.runSeconds);
            setSecondsLeft(json.runSeconds);
          }
          if (typeof json.masteryTarget === "number" && json.masteryTarget > 0) {
            setMasteryTarget(json.masteryTarget);
          }
          if (json.progress) setProgress(json.progress);
        }
      } catch { /* fall through to the empty state */ }
      if (!cancelled) setPhase((p) => (p === "loading" ? "ready" : p));
    })();
    return () => { cancelled = true; };
  }, [set.id, studentName]);

  /** Send this run's picks to the server: it grades them and updates streaks. */
  const submitRun = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/lesson-card/spelling-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName: studentName.trim() || "Anonymous",
          schoolName: schoolName.trim(),
          drillSetId: set.id,
          picks: picksRef.current,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        setReport({
          mastered: !!json.mastered,
          progress: json.progress,
          learnedThisRun: json.learnedThisRun || [],
          runStats: json.runStats || { attempted: 0, correct: 0, wrong: 0, score: 0 },
        });
        if (json.progress) setProgress(json.progress);
      }
    } catch { /* progress saving is best-effort */ }
    setSaving(false);
  }, [set.id, studentName, schoolName]);

  const endRun = useCallback(
    (opts?: { cleared?: boolean }) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      if (advanceRef.current !== null) {
        window.clearTimeout(advanceRef.current);
        advanceRef.current = null;
      }
      setLocked(false);
      setFlash(null);
      setPicked(null);
      setClearedVault(!!opts?.cleared);
      setPhase("done");
      void submitRun();
    },
    [submitRun]
  );

  const startRun = useCallback(() => {
    finishedRef.current = false;
    picksRef.current = [];
    setReport(null);
    setDeck(shuffle(items));
    setIndex(0);
    setCorrect(0);
    setWrong(0);
    setMissed([]);
    setClearedVault(false);
    setPicked(null);
    setFlash(null);
    setLocked(false);
    setSecondsLeft(runSeconds);
    deadlineRef.current = Date.now() + runSeconds * 1000;
    setPhase("running");
  }, [items, runSeconds]);

  // ── The 5-minute countdown (deadline-based so it stays accurate) ──
  useEffect(() => {
    if (phase !== "running") return;
    deadlineRef.current = Date.now() + runSeconds * 1000;
    const id = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left <= 0) {
        window.clearInterval(id);
        endRun();
      }
    }, 200);
    return () => window.clearInterval(id);
    // endRun is stable enough for this run's lifetime
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, runSeconds]);

  const item = phase === "running" ? deck[index] || null : null;

  // ── Answer a question ──
  const pick = useCallback(
    (choice: "a" | "b", current: Item | null) => {
      if (phase !== "running" || locked || !current) return;
      const isRight = choice === current.correct;
      picksRef.current.push({ index, choice });
      setLocked(true);
      setPicked(choice);
      setFlash({ kind: isRight ? "up" : "down", key: Date.now() });
      if (isRight) {
        setCorrect((c) => c + 1);
      } else {
        setWrong((w) => w + 1);
        setMissed((m) => [...m, { shown: current.options[choice], correct: current.options[current.correct] }]);
      }
      const delay = isRight ? 420 : 620;
      advanceRef.current = window.setTimeout(() => {
        advanceRef.current = null;
        setFlash(null);
        setPicked(null);
        setLocked(false);
        if (index + 1 >= deck.length) {
          endRun({ cleared: true });
        } else {
          setIndex((i) => i + 1);
        }
      }, delay);
    },
    [phase, locked, index, deck.length, endRun]
  );

  // ── Keyboard play (A / B and 1 / 2) ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (phase === "ready" && (key === "enter" || key === " ")) {
        e.preventDefault();
        startRun();
        return;
      }
      if (phase !== "running") return;
      if (key === "a" || key === "1") pick("a", item);
      else if (key === "b" || key === "2") pick("b", item);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, pick, item, startRun]);

  // Clean up a pending advance if the card unmounts mid-question.
  useEffect(() => () => {
    if (advanceRef.current !== null) window.clearTimeout(advanceRef.current);
  }, []);

  const attempted = correct + wrong;
  const score = correct - wrong;
  const accuracy = attempted ? Math.round((correct / attempted) * 100) : 0;

  // ── Speed verdict for the results screen ──
  const verdict = useMemo(() => {
    if (attempted >= 60) {
      return {
        title: "Lightning fingers! ⚡",
        body: `You cleared ${attempted} words in five minutes — that's champion pace. Push for ${attempted + 10} next run.`,
        tone: "green" as const,
      };
    }
    if (attempted >= 40) {
      return {
        title: "Fast and sharp! 🚀",
        body: `You answered ${attempted} words. That's a strong pace — shave a moment off each tap and you'll break 50.`,
        tone: "green" as const,
      };
    }
    if (attempted >= 25) {
      return {
        title: "Good pace — now accelerate 💨",
        body: `You answered ${attempted} words. You're reading the spellings well; tap faster and you'll comfortably pass 40 next run.`,
        tone: "gold" as const,
      };
    }
    return {
      title: "Too slow — you must answer faster ⏱️",
      body:
        attempted === 0
          ? "You didn't get an answer in. Decide on the first glance and tap immediately — hesitation is what's costing you words."
          : `You only reached ${attempted} words. Read both spellings in one glance, trust your first instinct on the sound, and tap straight away. Speeding up is the only way to finish more of the ${items.length} questions.`,
      tone: "red" as const,
    };
  }, [attempted, items.length]);

  // ── LOADING ──
  if (phase === "loading") {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center px-4">
        <Loader2 size={32} className="text-sky-400 animate-spin mx-auto mb-4" />
        <p className="text-white/50 text-sm">Loading the spelling vault…</p>
      </div>
    );
  }

  // ── NOTHING LOADED ──
  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-10 text-center px-4">
        <p className="text-white/50">No quiz words loaded for this card.</p>
        <button
          onClick={onDone}
          className="mt-4 px-6 py-2 rounded-xl bg-white/10 text-white/70 hover:bg-white/20 transition"
        >
          <ArrowLeft size={16} className="inline mr-2" /> Back
        </button>
      </div>
    );
  }

  // ── READY ──
  if (phase === "ready") {
    return (
      <div className="max-w-2xl mx-auto py-6 px-3 sm:px-0 space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="card text-center space-y-5"
        >
          <div className="inline-flex p-5 bg-sky-500/10 rounded-full border border-sky-500/20">
            <Zap size={44} className="text-sky-300" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white">{set.title}</h2>
          <p className="text-white/60 text-sm max-w-lg mx-auto">
            {set.question_count || items.length} words · one pronunciation · two spellings that sound alike.
            Tap the one spelled correctly.
          </p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-white/5 rounded-xl p-3">
              <Timer size={16} className="text-policeGold mx-auto mb-1" />
              <p className="text-sm font-bold text-white">5 min</p>
              <p className="text-[9px] uppercase tracking-widest text-white/40">One run</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3">
              <Sparkles size={16} className="text-policeGreen mx-auto mb-1" />
              <p className="text-sm font-bold text-policeGreen">+1</p>
              <p className="text-[9px] uppercase tracking-widest text-white/40">Correct tap</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3">
              <Sparkles size={16} className="text-policeRed mx-auto mb-1" />
              <p className="text-sm font-bold text-policeRed">−1</p>
              <p className="text-[9px] uppercase tracking-widest text-white/40">Wrong tap</p>
            </div>
          </div>
          <ul className="text-left text-xs text-white/60 space-y-1.5 bg-white/5 rounded-xl p-4">
            <li>⏱️ The countdown starts the moment you tap Start.</li>
            <li>✅ A correct tap flashes green and the next word appears instantly.</li>
            <li>❌ A wrong tap flashes red — you lose a point and reset that word's {masteryTarget}-run streak.</li>
            <li>🔀 The order is shuffled every run, so you can't memorise positions.</li>
            <li>🏁 No single run can clear all {items.length} words — the card is only complete when every word is learned.</li>
          </ul>
          <button
            onClick={startRun}
            className="w-full sm:w-auto px-10 py-3.5 rounded-xl bg-sky-500 text-white font-bold hover:brightness-110 transition text-sm flex items-center justify-center gap-2 mx-auto"
          >
            <Zap size={16} /> Start the 5-minute run
          </button>
          <p className="text-[10px] uppercase tracking-widest text-white/40">
            Tip: press <span className="text-white/60">A</span> / <span className="text-white/60">B</span> (or 1 / 2) to answer with the keyboard
          </p>
        </motion.div>

        {progress && (
          <ProgressionPanel
            progress={progress}
            target={masteryTarget}
            heading="Your progress so far"
          />
        )}
      </div>
    );
  }

  // ── RESULTS ──
  if (phase === "done") {
    const toneClasses =
      verdict.tone === "green"
        ? "border-policeGreen/30 bg-policeGreen/5"
        : verdict.tone === "gold"
          ? "border-policeGold/30 bg-policeGold/5"
          : "border-policeRed/30 bg-policeRed/5";
    const toneText =
      verdict.tone === "green" ? "text-policeGreen" : verdict.tone === "gold" ? "text-policeGold" : "text-policeRed";
    const shownProgress = report?.progress || progress;
    const learnedThisRun = report?.learnedThisRun || [];
    const mastered = report?.mastered ?? false;

    return (
      <div className="max-w-3xl mx-auto py-6 px-3 sm:px-0">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
          <div className="card text-center space-y-5">
            <div className="inline-flex p-5 bg-sky-500/10 rounded-full">
              <Trophy size={48} className="text-sky-300" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white">
              {mastered
                ? "🏆 Card mastered — every word learned!"
                : clearedVault
                  ? "🏁 You cleared the whole deck in one run!"
                  : "⏰ Time's up!"}
            </h2>
            <p className="text-white/60 text-sm">
              5 minutes done — here's exactly how many questions you managed.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="bg-white/5 rounded-xl p-3">
                <p className="text-2xl font-bold text-white">{attempted}</p>
                <p className="text-[9px] uppercase tracking-widest text-white/40">Questions done</p>
              </div>
              <div className="bg-policeGreen/10 border border-policeGreen/20 rounded-xl p-3">
                <p className="text-2xl font-bold text-policeGreen">{correct}</p>
                <p className="text-[9px] uppercase tracking-widest text-policeGreen/70">Correct (+1)</p>
              </div>
              <div className="bg-policeRed/10 border border-policeRed/20 rounded-xl p-3">
                <p className="text-2xl font-bold text-policeRed">{wrong}</p>
                <p className="text-[9px] uppercase tracking-widest text-policeRed/70">Wrong (−1)</p>
              </div>
              <div className="bg-white/5 rounded-xl p-3">
                <p className={`text-2xl font-bold ${score >= 0 ? "text-policeGold" : "text-policeRed"}`}>
                  {score > 0 ? `+${score}` : score}
                </p>
                <p className="text-[9px] uppercase tracking-widest text-white/40">Score</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-white/5 rounded-xl p-3">
                <p className="text-lg font-bold text-white">{accuracy}%</p>
                <p className="text-[9px] uppercase tracking-widest text-white/40">Accuracy</p>
              </div>
              <div className="bg-white/5 rounded-xl p-3">
                <p className="text-lg font-bold text-white">
                  {(attempted / (runSeconds / 60)).toFixed(1)}
                  <span className="text-xs text-white/40 font-normal"> /min</span>
                </p>
                <p className="text-[9px] uppercase tracking-widest text-white/40">Answer speed</p>
              </div>
            </div>
          </div>

          {/* Progression across runs */}
          {saving && !shownProgress && (
            <div className="card flex items-center justify-center gap-2 text-white/60 text-sm">
              <Loader2 size={16} className="animate-spin" /> Saving your progress…
            </div>
          )}
          {shownProgress && (
            <ProgressionPanel
              progress={shownProgress}
              target={masteryTarget}
              heading={saving ? "Saving…" : "Progress across your runs"}
            />
          )}

          {/* Words learned this run */}
          {learnedThisRun.length > 0 ? (
            <div className="card space-y-3 border-policeGreen/20 bg-policeGreen/5">
              <h3 className="text-sm font-heading font-bold text-policeGreen flex items-center gap-2">
                <BadgeCheck size={15} /> Learned this run ({learnedThisRun.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {learnedThisRun.slice(0, 24).map((word) => (
                  <span key={word} className="text-xs bg-policeGreen/10 border border-policeGreen/20 text-policeGreen rounded-lg px-2.5 py-1 font-semibold">
                    {word}
                  </span>
                ))}
                {learnedThisRun.length > 24 && (
                  <span className="text-xs text-white/40 px-1 py-1">+{learnedThisRun.length - 24} more</span>
                )}
              </div>
              <p className="text-[11px] text-white/50">
                These words reached {masteryTarget} correct answers in a row. Keep them safe — a wrong tap
                sends a word all the way back to 0.
              </p>
            </div>
          ) : (
            attempted > 0 &&
            shownProgress &&
            !mastered && (
              <div className="card space-y-1 border-policeGold/20 bg-policeGold/5">
                <h3 className="text-sm font-heading font-bold text-policeGold flex items-center gap-2">
                  <Target size={15} /> No new words reached {masteryTarget} in a row
                </h3>
                <p className="text-[11px] text-white/60 leading-relaxed">
                  Every word you missed was reset to 0, so accuracy matters as much as speed. Answer a word
                  correctly in three separate runs and it stays learned.
                </p>
              </div>
            )
          )}

          {/* Coaching: speed */}
          <div className={`card border ${toneClasses} space-y-2`}>
            <div className="flex items-center gap-2">
              <Gauge size={18} className={toneText} />
              <h3 className={`font-heading font-bold ${toneText}`}>{verdict.title}</h3>
            </div>
            <p className="text-sm text-white/70 leading-relaxed">{verdict.body}</p>
            <p className="text-xs text-white/50">
              Next goal: beat <span className="text-white font-semibold">{attempted}</span> questions — roughly{" "}
              <span className="text-white font-semibold">{Math.max(attempted + 5, 25)}</span> to stay on track.
            </p>
          </div>

          {missed.length > 0 && (
            <div className="card space-y-3">
              <h3 className="text-sm font-heading font-bold text-white flex items-center gap-2">
                <Sparkles size={15} className="text-policeRed" /> Words you missed — reset to 0 ({missed.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {missed.slice(0, 24).map((m, i) => (
                  <span key={`${m.correct}-${i}`} className="text-xs bg-white/5 border border-white/10 rounded-lg px-2.5 py-1">
                    <span className="text-policeRed line-through mr-1.5">{m.shown}</span>
                    <span className="text-policeGreen font-semibold">{m.correct}</span>
                  </span>
                ))}
                {missed.length > 24 && (
                  <span className="text-xs text-white/40 px-1 py-1">+{missed.length - 24} more</span>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={startRun}
              className="flex items-center justify-center gap-2 py-3 rounded-xl bg-sky-500 text-white font-bold hover:brightness-110 transition text-sm"
            >
              <RotateCcw size={16} /> Run it again
            </button>
            <button
              onClick={onDone}
              className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white/10 text-white/80 font-bold hover:bg-white/20 transition text-sm border border-white/10"
            >
              <ArrowLeft size={16} /> Back to the Arena
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── RUNNING ──
  if (!item) {
    // Deck exhausted without a re-render catching it — end cleanly.
    return (
      <div className="max-w-3xl mx-auto py-16 text-center px-4">
        <button onClick={() => endRun({ cleared: true })} className="px-6 py-2 rounded-xl bg-sky-500 text-white font-bold">
          See my results
        </button>
      </div>
    );
  }

  const timePct = Math.max(0, Math.min(100, (secondsLeft / runSeconds) * 100));
  const urgent = secondsLeft <= 30;
  const buttons: { key: "a" | "b"; label: string }[] = [
    { key: "a", label: item.options.a },
    { key: "b", label: item.options.b },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-4 py-4 px-3 sm:px-0">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center border shrink-0 bg-gradient-to-br from-sky-500/20 to-amber-500/20 border-sky-500/20">
            <Zap size={22} className="text-sky-300" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-heading font-bold text-white truncate">{set.title}</h1>
            <p className="text-white/50 text-xs">
              Question {index + 1} of {deck.length} · +1 right · −1 wrong
              {progress && (
                <>
                  {" · "}
                  <span className="text-sky-300 font-semibold">
                    {progress.learnedWords}/{progress.totalWords} learned ({progress.percent}%)
                  </span>
                </>
              )}
            </p>
          </div>
        </div>
        <button
          onClick={() => endRun()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 text-white/70 hover:bg-white/20 transition text-xs shrink-0"
        >
          <ArrowLeft size={14} /> <span className="hidden sm:inline">Back</span>
        </button>
      </div>

      {/* Countdown + score strip */}
      <div className="flex items-center gap-3">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${urgent ? "border-policeRed/40 bg-policeRed/10" : "border-white/10 bg-white/5"}`}>
          <Timer size={15} className={urgent ? "text-policeRed" : "text-policeGold"} />
          <span className={`font-mono text-lg font-bold tabular-nums ${urgent ? "text-policeRed animate-pulse" : "text-policeGold"}`}>
            {formatClock(secondsLeft)}
          </span>
        </div>
        <div className="flex-1 flex items-center justify-end gap-2 text-sm font-bold">
          <span className="px-2.5 py-1 rounded-lg bg-policeGreen/10 border border-policeGreen/20 text-policeGreen">+{correct}</span>
          <span className="px-2.5 py-1 rounded-lg bg-policeRed/10 border border-policeRed/20 text-policeRed">−{wrong}</span>
          <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-white/80 tabular-nums">
            {score > 0 ? `+${score}` : score}
          </span>
        </div>
      </div>

      {/* Time bar */}
      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-[width] duration-200 ${urgent ? "bg-policeRed" : "bg-gradient-to-r from-sky-400 to-policeGold"}`}
          style={{ width: `${timePct}%` }}
        />
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.18 }}
          className="card relative space-y-5"
        >
          {/* Floating +1 / −1 */}
          <AnimatePresence>
            {flash && (
              <motion.div
                key={flash.key}
                initial={{ opacity: 0, y: 16, scale: 0.6 }}
                animate={{ opacity: 1, y: -14, scale: 1.2 }}
                exit={{ opacity: 0, y: -46, scale: 1 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                className={`pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 z-20 text-5xl font-heading font-bold ${
                  flash.kind === "up" ? "text-policeGreen drop-shadow-[0_0_18px_rgba(0,200,100,0.6)]" : "text-policeRed drop-shadow-[0_0_18px_rgba(255,60,60,0.6)]"
                }`}
              >
                {flash.kind === "up" ? "+1" : "−1"}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full bg-sky-500/15 text-sky-300 truncate">
              {item.source || "Spelling"}
            </span>
            <span className="text-[10px] uppercase tracking-widest text-white/40">Which spelling is correct?</span>
          </div>

          <div className="text-center py-2">
            <p className="text-3xl sm:text-4xl font-mono text-white tracking-wide">{item.prompt}</p>
            {item.note && <p className="text-sm text-policeGold mt-2">{item.note}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {buttons.map((b) => {
              const isPicked = picked === b.key;
              const isCorrect = b.key === item.correct;
              const revealCorrect = locked && isCorrect;
              const revealWrong = locked && isPicked && !isCorrect;
              return (
                <button
                  key={b.key}
                  onClick={() => pick(b.key, item)}
                  disabled={locked}
                  className={`group flex items-center gap-3 px-4 py-4 rounded-2xl border-2 text-left transition text-lg sm:text-xl font-bold ${
                    revealCorrect
                      ? "border-policeGreen bg-policeGreen/15 text-policeGreen"
                      : revealWrong
                        ? "border-policeRed bg-policeRed/15 text-policeRed"
                        : "border-white/10 bg-white/[0.03] text-white hover:border-sky-400/60 hover:bg-sky-500/10 active:scale-[0.98]"
                  } ${locked ? "cursor-default" : "cursor-pointer"}`}
                >
                  <span
                    className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-sm font-bold ${
                      revealCorrect
                        ? "bg-policeGreen/25 text-policeGreen"
                        : revealWrong
                          ? "bg-policeRed/25 text-policeRed"
                          : "bg-white/10 text-white/60 group-hover:bg-sky-500/20 group-hover:text-sky-300"
                    }`}
                  >
                    {b.key.toUpperCase()}
                  </span>
                  <span className="truncate">{b.label}</span>
                </button>
              );
            })}
          </div>

          <p className="text-center text-[10px] uppercase tracking-widest text-white/35">
            Read both spellings in one glance · tap immediately · press A / B on a keyboard
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock, Timer, Zap, Trophy, Target, ArrowRight, ArrowLeft,
  User, Shield, AlertTriangle,
  Loader2, RotateCcw, BookOpen, BrainCircuit,
  Hourglass, Flame, Sparkles, ChevronRight,
  TrendingUp, TrendingDown, Minus, BadgeCheck, PencilLine,
  type LucideIcon
} from "lucide-react";
import QuestionCard from "@/components/QuestionCard";
import LessonCard from "@/components/LessonCard";
import type { OptionKey, OptionsRecord } from "@/lib/questions";
import confetti from "canvas-confetti";

type DrillAttemptHistory = {
  tryNumber: number;
  completed: boolean;
  correctAnswers: number;
  totalQuestions: number;
  percentage: number;
  timeSpentSeconds: number;
  mastered: boolean;
};

type DrillSet = {
  id: number;
  title: string;
  description: string;
  subject_id: number | null;
  level: string;
  time_limit_minutes: number;
  question_count: number;
  card_type?: string;
  capitalization_slug?: string;
  subjectName: string;
  mastered: boolean;
  attemptHistory: DrillAttemptHistory[];
  bestAttempt: {
    id: number;
    completed: boolean;
    correctAnswers: number;
    totalQuestions: number;
    timeSpentSeconds: number;
    percentage: number;
    submissions?: number;
  } | null;
  totalAttempts: number;
  created_at: string;
};

type DrillQuestion = {
  id: number;
  question: string;
  options: OptionsRecord;
  correct: OptionKey;
  explanation: string;
  passage?: string;
  instruction?: string;
  category: string;
};

type Phase = "select" | "playing" | "lesson" | "results";

export default function DrillPage() {
  const [phase, setPhase] = useState<Phase>("select");
  const [studentName, setStudentName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [drillSets, setDrillSets] = useState<DrillSet[]>([]);
  const [selectedSet, setSelectedSet] = useState<DrillSet | null>(null);
  const [questions, setQuestions] = useState<DrillQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  // True when a mastered lesson card is reopened for a fresh re-practice
  const [lessonFresh, setLessonFresh] = useState(false);

  // Playing state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [warningsCount, setWarningsCount] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [questionTimers, setQuestionTimers] = useState<Map<number, number>>(new Map());
  // Results from attempts completed in this page session (for repractice feedback)
  const [sessionResults, setSessionResults] = useState<{ pct: number }[]>([]);
  // True while a drill is (re)starting — shows a spinner and blocks repeated clicks
  const [startingDrill, setStartingDrill] = useState(false);
  const sessionSetIdRef = useRef<number | null>(null);
  // Last in-flight answer POST, awaited before completing so the server has every answer
  const pendingAnswerRef = useRef<Promise<unknown> | null>(null);

  useEffect(() => {
    const name = localStorage.getItem("scholars-arena-name") || "";
    const school = localStorage.getItem("scholars-arena-school") || "";
    setStudentName(name);
    setSchoolName(school);
    loadDrillSets();
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (warningTimerRef.current) clearInterval(warningTimerRef.current);
    };
  }, []);

  const loadDrillSets = async () => {
    const name = localStorage.getItem("scholars-arena-name") || "";
    try {
      const res = await fetch(`/api/drills/sets?student_name=${encodeURIComponent(name)}`);
      if (res.ok) setDrillSets(await res.json());
    } catch {}
    setLoading(false);
  };

  const loadQuestions = async (setId: number) => {
    try {
      const { getSupabase } = await import("@/lib/supabaseClient");
      const supabase = await getSupabase();
      const { data: links } = await supabase
        .from("drill_set_questions")
        .select("question_id, question_number")
        .eq("drill_set_id", setId)
        .order("question_number");
      if (!links || links.length === 0) return [];

      const questionIds = links.map((l: any) => l.question_id);
      const { data: qData } = await supabase
        .from("questions")
        .select("*")
        .in("id", questionIds);

      const questionMap = new Map<number, any>();
      for (const q of qData || []) questionMap.set(q.id, q);

      return links.map((l: any) => {
        const q = questionMap.get(l.question_id);
        if (!q) return null;
        const opts: OptionsRecord = { a: q.option_a, b: q.option_b, c: q.option_c, d: q.option_d };
        if (q.option_e?.trim()) opts.e = q.option_e;
        return {
          id: q.id,
          question: q.question,
          options: opts,
          correct: q.correct_option,
          explanation: q.explanation || "",
          passage: q.passage || undefined,
          instruction: q.instruction || undefined,
          category: q.category || "",
        };
      }).filter(Boolean) as DrillQuestion[];
    } catch { return []; }
  };

  const handleStartLesson = (set: DrillSet, fresh = false) => {
    const name = studentName.trim() || localStorage.getItem("scholars-arena-name") || "Anonymous";
    localStorage.setItem("scholars-arena-name", name);
    setStudentName(name);
    if (schoolName.trim()) localStorage.setItem("scholars-arena-school", schoolName.trim());
    setSelectedSet(set);
    setLessonFresh(fresh);
    setPhase("lesson");
  };

  const handleStartDrill = async (setOverride?: DrillSet | null) => {
    const set = setOverride ?? selectedSet;
    if (!set || startingDrill) return;
    setStartingDrill(true);
    try {
      if (!studentName.trim() && !localStorage.getItem("scholars-arena-name")) {
        localStorage.setItem("scholars-arena-name", "Anonymous");
        setStudentName("Anonymous");
      }
      const name = studentName.trim() || localStorage.getItem("scholars-arena-name") || "Anonymous";
      localStorage.setItem("scholars-arena-name", name);
      if (schoolName.trim()) localStorage.setItem("scholars-arena-school", schoolName.trim());

      const qs = await loadQuestions(set.id);
      if (qs.length === 0) {
        alert("No questions found for this drill set.");
        return;
      }
      setQuestions(qs.sort(() => Math.random() - 0.5));
      setCurrentIndex(0);
      setCorrectCount(0);
      setElapsedSeconds(0);
      setWarningsCount(0);
      setShowWarning(false);
      setQuestionTimers(new Map());

      // Reset session retry tracking when switching to a different card
      if (sessionSetIdRef.current !== set.id) {
        sessionSetIdRef.current = set.id;
        setSessionResults([]);
      }

      // Create attempt
      try {
        const res = await fetch("/api/drills/attempts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "start",
            studentName: name,
            schoolName: schoolName.trim() || localStorage.getItem("scholars-arena-school") || "",
            drillSetId: set.id,
            totalQuestions: qs.length,
          }),
        });
        const data = await res.json();
        if (data.attempt) setAttemptId(data.attempt.id);
      } catch {}

      // Start timer (clear any stale interval first)
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);

      setPhase("playing");
    } finally {
      setStartingDrill(false);
    }
  };

  // Check for time warnings
  const timeLimitMins = selectedSet?.time_limit_minutes;
  useEffect(() => {
    if (phase !== "playing" || !timeLimitMins) return;
    const targetSeconds = timeLimitMins * 60;
    if (elapsedSeconds > targetSeconds && elapsedSeconds % 30 === 0 && elapsedSeconds > 0) {
      setShowWarning(true);
      setWarningsCount((prev) => prev + 1);
      setTimeout(() => setShowWarning(false), 5000);
    }
  }, [elapsedSeconds, phase, timeLimitMins]);

  const handleAnswer = async (correct: boolean, selectedOption?: string) => {
    if (correct) setCorrectCount((prev) => prev + 1);

    // Track time per question
    const now = Date.now();
    const startTime = questionTimers.get(currentIndex) || now;
    const timeTaken = Math.round((now - startTime) / 1000);

    if (attemptId && questions[currentIndex]) {
      pendingAnswerRef.current = fetch("/api/drills/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "answer",
          attemptId,
          questionId: questions[currentIndex].id,
          selectedOption: selectedOption || "",
          correct,
          timeTakenSeconds: timeTaken,
        }),
      }).catch(() => {});
    }
  };

  const handleNext = async () => {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= questions.length) {
      // Complete the attempt
      if (timerRef.current) clearInterval(timerRef.current);
      if (warningTimerRef.current) clearInterval(warningTimerRef.current);

      const totalCorrect = correctCount; // snapshot

      // Record this try for repractice feedback (try counter + improvement)
      const pct = Math.round((totalCorrect / Math.max(questions.length, 1)) * 100);
      setSessionResults((prev) => [...prev, { pct }]);

      if (attemptId) {
        try {
          // Make sure the last answer is recorded before completing
          if (pendingAnswerRef.current) await pendingAnswerRef.current;
          await fetch("/api/drills/attempts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "complete",
              attemptId,
              timeSpentSeconds: elapsedSeconds,
              timeWarningsCount: warningsCount,
            }),
          });
        } catch {}
      }

      setPhase("results");
      if (totalCorrect / questions.length >= 0.6) {
        confetti({ particleCount: 150, spread: 120, origin: { y: 0.6 }, colors: ["#FFD700", "#28a745", "#ffffff"] });
      }
      // Bigger celebration when the whole card is mastered (every question correct)
      if (totalCorrect === questions.length && questions.length > 0) {
        confetti({ particleCount: 260, spread: 160, origin: { y: 0.5 }, colors: ["#FFD700", "#28a745", "#ffffff", "#00d4ff"] });
      }
    } else {
      setCurrentIndex(nextIndex);
      setQuestionTimers((prev) => { const next = new Map(prev); next.set(nextIndex, Date.now()); return next; });
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const getTimeStatus = () => {
    if (!selectedSet) return { color: "text-white/60", bg: "bg-white/5", icon: Clock, label: "Time" };
    const target = selectedSet.time_limit_minutes * 60;
    const remaining = target - elapsedSeconds;
    if (remaining > 0) return { color: "text-policeGreen", bg: "bg-policeGreen/10", icon: Timer, label: "On Pace" };
    return { color: "text-policeRed", bg: "bg-policeRed/10", icon: Hourglass, label: "Over Time" };
  };

  const isLessonCard = (set: DrillSet) =>
    set.card_type === "capitalization" ||
    set.card_type === "sentence_types" ||
    set.card_type === "sentence_combining" ||
    set.card_type === "true_false";

  const lessonBadge = (set: DrillSet) => {
    if (set.card_type === "capitalization") {
      return { label: "✍️ Capitalization", classes: "bg-violet-500/15 text-violet-300" };
    }
    if (set.card_type === "sentence_types") {
      return { label: "🧩 Sentence Types", classes: "bg-teal-500/15 text-teal-300" };
    }
    if (set.card_type === "sentence_combining") {
      return { label: "🔗 Sentence Combining", classes: "bg-sky-500/15 text-sky-300" };
    }
    if (set.card_type === "true_false") {
      return { label: "⚖️ True or False", classes: "bg-emerald-500/15 text-emerald-300" };
    }
    return null;
  };

  // ── SELECT PHASE ──
  if (phase === "select") {
    return (
      <div className="max-w-4xl mx-auto space-y-8 py-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-4">
          <div className="inline-flex p-4 bg-gradient-to-br from-policeRed/20 to-orange-600/20 rounded-full border border-policeRed/20">
            <Flame size={40} className="text-orange-400" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-heading font-bold text-white tracking-tight">
            The Arena
          </h1>
          <p className="text-white/50 text-lg max-w-xl mx-auto">
            Timed drill practice. Complete each set before the clock runs out and track your speed!
          </p>
        </motion.div>

        {/* Name section */}
        {!studentName && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card space-y-4">
            <div className="flex items-center gap-2">
              <User size={18} className="text-policeGold" />
              <h2 className="text-lg font-heading font-bold text-white">Who are you?</h2>
            </div>
            <div className="flex gap-3">
              <input type="text" value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Your nickname..."
                className="flex-1 bg-black/40 border border-white/10 focus:border-policeGold rounded-xl px-4 py-3 text-white outline-none transition" />
              <input type="text" value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="School (optional)"
                className="flex-1 bg-black/40 border border-white/10 focus:border-policeGold rounded-xl px-4 py-3 text-white outline-none transition" />
            </div>
          </motion.div>
        )}

        {/* Privacy Notice */}
        <div className="bg-policeGold/10 border border-policeGold/20 rounded-xl p-4 flex items-start gap-3">
          <Shield size={18} className="text-policeGold shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-white/80 font-semibold">Your activity is tracked</p>
            <p className="text-xs text-white/50 mt-1">Your nickname, time spent, and scores are recorded for each drill set.</p>
          </div>
        </div>

        {/* Drill Sets */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <Loader2 size={32} className="text-policeGold animate-spin" />
            <p className="text-white/50 text-sm uppercase tracking-widest">Loading drill sets...</p>
          </div>
        ) : drillSets.length === 0 ? (
          <div className="card text-center py-16 space-y-4">
            <BookOpen size={48} className="text-white/20 mx-auto" />
            <h2 className="text-xl font-heading font-bold text-white">No Drill Sets Available</h2>
            <p className="text-white/60">No timed drills have been created yet. Check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {drillSets.map((set, idx) => (
              <motion.button key={set.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => setSelectedSet(selectedSet?.id === set.id ? null : set)}
                className={`text-left card transition-all active:scale-[0.98] ${
                  selectedSet?.id === set.id
                    ? "border-policeGold/50 bg-policeGold/5 shadow-[0_0_20px_rgba(255,215,0,0.1)]"
                    : "hover:border-white/20 hover:bg-white/[0.07]"
                }`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                      set.card_type === "capitalization"
                        ? "bg-gradient-to-br from-violet-500/20 to-indigo-500/20 text-violet-300"
                        : set.card_type === "sentence_types"
                          ? "bg-gradient-to-br from-teal-500/20 to-cyan-500/20 text-teal-300"
                          : set.card_type === "sentence_combining"
                            ? "bg-gradient-to-br from-sky-500/20 to-blue-500/20 text-sky-300"
                            : set.card_type === "true_false"
                              ? "bg-gradient-to-br from-emerald-500/20 to-green-500/20 text-emerald-300"
                              : "bg-gradient-to-br from-orange-500/20 to-policeRed/20 text-orange-400"
                    }`}>
                      {set.title[0]}
                    </div>
                    <div>
                      <h3 className="font-bold text-white">{set.title}</h3>
                      <span className="text-[10px] uppercase tracking-widest text-white/40">
                        {set.subjectName} • {set.level.toUpperCase()}
                      </span>
                      {lessonBadge(set) && (
                        <span className={`ml-2 text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full font-bold ${lessonBadge(set)!.classes}`}>
                          {lessonBadge(set)!.label}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={16} className={`text-white/30 transition ${selectedSet?.id === set.id ? "rotate-90 text-policeGold" : ""}`} />
                </div>

                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="bg-white/5 rounded-lg p-2 text-center">
                    <BrainCircuit size={14} className="text-blue-400 mx-auto mb-0.5" />
                    <p className="text-sm font-bold text-white">{set.question_count}</p>
                    <p className="text-[8px] uppercase tracking-widest text-white/40">{isLessonCard(set) ? (set.card_type === "true_false" ? "Statements" : "Sentences") : "Questions"}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2 text-center">
                    <Clock size={14} className="text-policeGold mx-auto mb-0.5" />
                    {isLessonCard(set) ? (
                      <>
                        <p className="text-sm font-bold text-white">Self</p>
                        <p className="text-[8px] uppercase tracking-widest text-white/40">Paced</p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-bold text-white">{set.time_limit_minutes}m</p>
                        <p className="text-[8px] uppercase tracking-widest text-white/40">Target</p>
                      </>
                    )}
                  </div>
                  <div className="bg-white/5 rounded-lg p-2 text-center">
                    <Trophy size={14} className="text-policeGreen mx-auto mb-0.5" />
                    <p className="text-sm font-bold text-white">{set.totalAttempts}</p>
                    <p className="text-[8px] uppercase tracking-widest text-white/40">Attempts</p>
                  </div>
                </div>

                {set.mastered ? (
                  <div className="text-[10px] rounded-lg px-2 py-1.5 font-semibold bg-policeGreen/10 text-policeGreen border border-policeGreen/20 flex items-center gap-1.5">
                    <BadgeCheck size={12} /> Mastered — lesson perfected!
                  </div>
                ) : set.bestAttempt && (
                  <div className={`text-[10px] rounded-lg px-2 py-1.5 font-semibold ${
                    set.bestAttempt.completed
                      ? "bg-policeGreen/10 text-policeGreen border border-policeGreen/20"
                      : "bg-policeGold/10 text-policeGold border border-policeGold/20"
                  }`}>
                    {set.bestAttempt.completed
                      ? isLessonCard(set)
                        ? <>Perfected in {set.bestAttempt.submissions ?? set.totalAttempts} {((set.bestAttempt.submissions ?? set.totalAttempts) === 1) ? "submission" : "submissions"}</>
                        : <>Best: {set.bestAttempt.percentage}% in {formatTime(set.bestAttempt.timeSpentSeconds)} — {set.totalAttempts} {set.totalAttempts === 1 ? "try" : "tries"}</>
                      : isLessonCard(set)
                        ? <>In progress — {set.bestAttempt.submissions ?? 0} submission{((set.bestAttempt.submissions ?? 0) === 1) ? "" : "s"}</>
                        : <>In progress...</>
                    }
                  </div>
                )}

                {selectedSet?.id === set.id && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-4 pt-4 border-t border-white/10">
                    {set.description && <p className="text-xs text-white/60 mb-4">{set.description}</p>}
                    {isLessonCard(set) ? (
                      set.mastered ? (
                        <div className="grid grid-cols-2 gap-2">
                          <button onClick={(e) => { e.stopPropagation(); handleStartLesson(set, true); }}
                            className="flex items-center justify-center gap-2 bg-policeGold text-policeBlue font-bold py-3 rounded-xl hover:brightness-110 transition text-sm">
                            <RotateCcw size={15} /> Practice Again
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleStartLesson(set, false); }}
                            className="flex items-center justify-center gap-2 bg-white/10 text-white font-bold py-3 rounded-xl hover:bg-white/20 transition border border-white/10 text-sm">
                            <BookOpen size={15} /> Review Lesson
                          </button>
                        </div>
                      ) : (
                        <button onClick={(e) => { e.stopPropagation(); handleStartLesson(set, false); }}
                          className="w-full flex items-center justify-center gap-2 bg-policeGold text-policeBlue font-bold py-3 rounded-xl hover:brightness-110 transition text-sm">
                          <PencilLine size={16} /> Start Lesson
                        </button>
                      )
                    ) : (
                      <button onClick={(e) => { e.stopPropagation(); handleStartDrill(set); }}
                        disabled={startingDrill}
                        className="w-full flex items-center justify-center gap-2 bg-policeGold text-policeBlue font-bold py-3 rounded-xl hover:brightness-110 transition text-sm disabled:opacity-60 disabled:cursor-not-allowed">
                        {startingDrill ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />} {startingDrill ? "Starting..." : "Start Drill"}
                      </button>
                    )}
                  </motion.div>
                )}
              </motion.button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── PLAYING PHASE ──
  if (phase === "playing" && questions.length > 0) {
    const currentQ = questions[currentIndex];
    const timeStatus = getTimeStatus();
    const targetSeconds = selectedSet ? selectedSet.time_limit_minutes * 60 : 0;
    const isOverTime = elapsedSeconds > targetSeconds && targetSeconds > 0;
    const progressPercent = ((currentIndex + 1) / questions.length) * 100;

    return (
      <div className="space-y-6 pb-10">
        {/* Timer & Stats Bar */}
        <div className="sticky top-0 z-30 bg-[#030712]/80 backdrop-blur-xl border-b border-white/10 -mx-4 px-4 py-3">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs uppercase tracking-widest bg-white/10 px-2 py-1 rounded-full text-white/50">
                Q {currentIndex + 1}/{questions.length}
              </span>
              <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 ${timeStatus.bg}`}>
                <timeStatus.icon size={14} className={timeStatus.color} />
                <span className={`text-sm font-bold font-mono ${timeStatus.color}`}>{formatTime(elapsedSeconds)}</span>
                {targetSeconds > 0 && (
                  <span className={`text-xs ${isOverTime ? "text-policeRed/60" : "text-white/40"}`}>/ {formatTime(targetSeconds)}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-policeGreen font-semibold bg-policeGreen/10 px-2 py-1 rounded-full">{correctCount} correct</span>
              <span className="text-xs uppercase tracking-widest bg-white/10 px-2 py-1 rounded-full text-white/50">
                {selectedSet?.title}
              </span>
            </div>
          </div>
          <div className="max-w-3xl mx-auto mt-2 w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${isOverTime ? "bg-policeRed" : "bg-gradient-to-r from-policeGold to-policeGreen"}`}
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Over-time Warning */}
        <AnimatePresence>
          {showWarning && isOverTime && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="max-w-3xl mx-auto bg-policeRed/10 border-2 border-policeRed/30 rounded-2xl p-4 flex items-start gap-3">
              <AlertTriangle size={20} className="text-policeRed shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-policeRed">Time's up! ⏰</p>
                <p className="text-xs text-white/70 mt-1">
                  You should have completed all questions in {formatTime(targetSeconds)}. 
                  You're at {formatTime(elapsedSeconds)}. Pick up the pace!
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Persistent over-time banner */}
        {isOverTime && !showWarning && (
          <div className="max-w-3xl mx-auto bg-policeRed/5 border border-policeRed/20 rounded-xl px-4 py-2 flex items-center gap-2 text-xs">
            <Hourglass size={14} className="text-policeRed" />
            <span className="text-policeRed font-semibold">Over target time ({formatTime(targetSeconds)})</span>
            <span className="text-white/40">— Keep going, you're at {formatTime(elapsedSeconds)}</span>
          </div>
        )}

        {/* Question */}
        <AnimatePresence mode="wait">
          <motion.div key={currentIndex}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}>
            <QuestionCard question={currentQ} stickers={[]} onAnswer={handleAnswer} onNext={handleNext} />
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  // ── LESSON CARD PHASE ──
  if (phase === "lesson" && selectedSet) {
    return (
      <LessonCard
        key={lessonFresh ? "fresh" : "review"}
        set={selectedSet}
        studentName={studentName}
        schoolName={schoolName}
        freshStart={lessonFresh}
        onDone={() => {
          setPhase("select");
          setSelectedSet(null);
          setLessonFresh(false);
          loadDrillSets();
        }}
      />
    );
  }

  // ── RESULTS PHASE ──
  if (phase === "results") {
    const total = questions.length;
    const missed = Math.max(total - correctCount, 0);
    const mastered = total > 0 && correctCount === total;
    const percentage = Math.round((correctCount / Math.max(total, 1)) * 100);
    const passed = percentage >= 60;
    const targetSeconds = selectedSet ? selectedSet.time_limit_minutes * 60 : 0;
    const isWithinTime = elapsedSeconds <= targetSeconds;

    // Try counter + improvement comparison against the previous try
    const dbScores = selectedSet?.attemptHistory ?? [];
    const allPct = [...dbScores.map((a) => a.percentage), ...sessionResults.map((r) => r.pct)];
    const tryNumber = allPct.length;
    const prevPct = allPct.length >= 2 ? allPct[allPct.length - 2] : null;

    let improvement: { icon: LucideIcon; color: string; title: string; body: string } | null = null;
    if (prevPct !== null) {
      if (percentage > prevPct) {
        improvement = {
          icon: TrendingUp,
          color: "text-policeGreen",
          title: `Big improvement! ${prevPct}% → ${percentage}%`,
          body: "You're getting sharper with every try. Keep this momentum and you'll master this card! 🔥",
        };
      } else if (percentage < prevPct) {
        improvement = {
          icon: TrendingDown,
          color: "text-orange-400",
          title: `Slight dip: ${prevPct}% → ${percentage}%`,
          body: "Don't worry — review the debriefs after each question and try again. You've scored better before, so you can do it again! 💪",
        };
      } else {
        improvement = {
          icon: Minus,
          color: "text-policeGold",
          title: `Same score as your last try (${percentage}%)`,
          body: "You're consistent — now let's make that final push to answer everything correctly! 🎯",
        };
      }
    }

    const goAllDrills = () => {
      setPhase("select");
      setSelectedSet(null);
      // The DB now has these attempts — clear session tracking so try numbers
      // don't double-count when the same card is re-entered from the list.
      sessionSetIdRef.current = null;
      setSessionResults([]);
      loadDrillSets();
    };

    return (
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-3xl mx-auto space-y-8">
        <div className="card relative overflow-hidden">
          <div className={`absolute top-0 left-0 w-full h-2 ${mastered ? "bg-gradient-to-r from-policeGreen via-policeGold to-policeGreen" : passed && isWithinTime ? "bg-gradient-to-r from-policeGreen via-policeGold to-policeGreen" : "bg-gradient-to-r from-orange-500 to-policeRed"}`}></div>
          <div className="text-center space-y-6 pt-8">
            <div className="inline-flex p-6 bg-white/5 rounded-full">
              {mastered ? <Trophy size={64} className="text-policeGold" /> :
               passed && isWithinTime ? <Target size={64} className="text-policeGreen" /> :
               <RotateCcw size={64} className="text-orange-400" />}
            </div>
            <div>
              <h2 className="text-3xl sm:text-4xl font-heading font-bold text-white mb-2">
                {mastered ? "🏆 Card Mastered!" :
                 passed ? "✅ Almost There!" :
                 "💪 Keep Pushing!"}
              </h2>
              <p className="text-white/60 text-lg">
                {selectedSet?.title} • {total} questions
              </p>
              <span className="inline-flex items-center gap-1.5 mt-3 text-[10px] uppercase tracking-widest bg-white/10 text-white/60 px-3 py-1 rounded-full">
                <Flame size={12} className="text-orange-400" /> Try #{tryNumber} of this card
              </span>
            </div>

            {/* Correct / Missed breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="bg-policeGreen/5 rounded-xl p-4 border border-policeGreen/20">
                <p className="text-[9px] uppercase tracking-widest text-white/50 mb-1">✓ Correct</p>
                <p className="text-2xl font-bold text-policeGreen">{correctCount}/{total}</p>
              </div>
              <div className={`rounded-xl p-4 border ${missed === 0 ? "bg-policeGreen/5 border-policeGreen/20" : "bg-policeRed/10 border-policeRed/20"}`}>
                <p className="text-[9px] uppercase tracking-widest text-white/50 mb-1">✗ Missed</p>
                <p className={`text-2xl font-bold ${missed === 0 ? "text-policeGreen" : "text-policeRed"}`}>{missed}</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <p className="text-[9px] uppercase tracking-widest text-white/50 mb-1">Percent</p>
                <p className={`text-2xl font-bold ${passed ? "text-policeGold" : "text-policeRed"}`}>{percentage}%</p>
              </div>
              <div className={`rounded-xl p-4 border ${isWithinTime ? "bg-policeGreen/5 border-policeGreen/20" : "bg-policeRed/5 border-policeRed/20"}`}>
                <p className="text-[9px] uppercase tracking-widest text-white/50 mb-1">Your Time</p>
                <p className={`text-2xl font-bold font-mono ${isWithinTime ? "text-policeGreen" : "text-policeRed"}`}>{formatTime(elapsedSeconds)}</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <p className="text-[9px] uppercase tracking-widest text-white/50 mb-1">Target</p>
                <p className="text-2xl font-bold text-white/70 font-mono">{formatTime(targetSeconds)}</p>
              </div>
            </div>

            {/* Mastery vs repractice call-to-action */}
            {mastered ? (
              <div className="bg-policeGreen/10 border border-policeGreen/30 rounded-2xl p-5">
                <p className="text-sm font-bold text-policeGreen">
                  🎉 Perfect score! You answered every single question correctly.
                </p>
                <p className="text-xs text-white/60 mt-1">
                  This card is now <span className="text-policeGreen font-semibold">successfully studied</span>. Keep this standard for the rest of your drills! 🏆
                </p>
              </div>
            ) : (
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-5">
                <p className="text-sm font-bold text-orange-400">
                  You missed {missed} {missed === 1 ? "question" : "questions"} out of {total}.
                </p>
                <p className="text-xs text-white/60 mt-1">
                  This card isn't studied yet — repractice until you answer <span className="text-orange-400 font-semibold">all {total} correctly</span> and master it! 🎯
                </p>
              </div>
            )}

            {/* Improvement feedback vs previous try */}
            {improvement && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-start gap-3 text-left">
                <improvement.icon size={20} className={`${improvement.color} shrink-0 mt-0.5`} />
                <div>
                  <p className={`text-sm font-bold ${improvement.color}`}>{improvement.title}</p>
                  <p className="text-xs text-white/60 mt-1">{improvement.body}</p>
                </div>
              </div>
            )}

            {/* Mastery progress bar when not yet mastered */}
            {!mastered && (
              <div className="text-left">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="uppercase tracking-widest text-white/50 text-[10px]">Mastery progress</span>
                  <span className="text-white/70 font-semibold">{correctCount}/{total} correct · {missed} to go</span>
                </div>
                <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-policeGold to-policeGreen"
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.6 }}
                  />
                </div>
                <p className="text-[11px] text-white/40 mt-2">
                  You need {missed} more correct {missed === 1 ? "answer" : "answers"} to master this card. Keep repracticing to boost your understanding! 🧠
                </p>
              </div>
            )}

            {!isWithinTime && (
              <div className="bg-policeRed/10 border border-policeRed/20 rounded-xl p-4 flex items-start gap-3">
                <Clock size={18} className="text-policeRed shrink-0 mt-0.5" />
                <div className="text-left">
                  <p className="text-sm font-bold text-policeRed">Exceeded time limit</p>
                  <p className="text-xs text-white/60 mt-1">
                    You took {formatTime(elapsedSeconds)} — {formatTime(elapsedSeconds - targetSeconds)} over the {formatTime(targetSeconds)} target. 
                    Try again for a faster time!
                  </p>
                </div>
              </div>
            )}

            {warningsCount > 0 && (
              <div className="bg-policeGold/10 border border-policeGold/20 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle size={18} className="text-policeGold shrink-0 mt-0.5" />
                <div className="text-left">
                  <p className="text-sm font-bold text-policeGold">{warningsCount} warning{warningsCount > 1 ? "s" : ""} received</p>
                  <p className="text-xs text-white/60 mt-1">Try to stay within the time limit next time!</p>
                </div>
              </div>
            )}

            {isWithinTime && passed && !mastered && (
              <div className="bg-policeGreen/10 border border-policeGreen/20 rounded-xl p-4 text-center">
                <Sparkles size={18} className="text-policeGreen mx-auto mb-1" />
                <p className="text-sm font-bold text-policeGreen">Excellent speed and accuracy — now go get that perfect score!</p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              {mastered ? (
                <>
                  <button onClick={goAllDrills}
                    disabled={startingDrill}
                    className="flex-1 flex items-center justify-center gap-2 bg-policeGold text-policeBlue font-bold py-4 rounded-xl hover:brightness-110 transition disabled:opacity-60 disabled:cursor-not-allowed">
                    <ArrowLeft size={18} /> All Drills
                  </button>
                  <button onClick={() => handleStartDrill(selectedSet)}
                    disabled={startingDrill}
                    className="flex-1 flex items-center justify-center gap-2 bg-white/10 text-white font-bold py-4 rounded-xl hover:bg-white/20 transition border border-white/10 disabled:opacity-60 disabled:cursor-not-allowed">
                    {startingDrill ? <Loader2 size={18} className="animate-spin" /> : <RotateCcw size={18} />} {startingDrill ? "Restarting..." : "Practice Again"}
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => handleStartDrill(selectedSet)}
                    disabled={startingDrill}
                    className={`flex-[2] flex items-center justify-center gap-2 bg-policeGold text-policeBlue font-bold py-4 rounded-xl hover:brightness-110 transition disabled:opacity-60 disabled:cursor-not-allowed ${startingDrill ? "" : "animate-pulse"}`}>
                    {startingDrill ? <Loader2 size={18} className="animate-spin" /> : <RotateCcw size={18} />} {startingDrill ? "Repracticing..." : "🔁 Repractice This Card"}
                  </button>
                  <button onClick={goAllDrills}
                    disabled={startingDrill}
                    className="flex-1 flex items-center justify-center gap-2 bg-white/10 text-white font-bold py-4 rounded-xl hover:bg-white/20 transition border border-white/10 disabled:opacity-60 disabled:cursor-not-allowed">
                    <ArrowLeft size={18} /> All Drills
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return null;
}

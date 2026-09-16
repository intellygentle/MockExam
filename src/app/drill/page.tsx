"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock, Timer, Zap, Trophy, Target, ArrowRight, ArrowLeft,
  User, Shield, AlertTriangle,
  Loader2, RotateCcw, BookOpen, BrainCircuit,
  Hourglass, Flame, Sparkles, ChevronRight, ChevronDown,
  TrendingUp, TrendingDown, Minus, BadgeCheck, PencilLine,
  Layers, PenLine, Crown, Volume2, type LucideIcon
} from "lucide-react";
import QuestionCard from "@/components/QuestionCard";
import LessonCard from "@/components/LessonCard";
import PassageCard from "@/components/PassageCard";
import VocabularyCard from "@/components/VocabularyCard";
import CombineCard from "@/components/CombineCard";
import ParaGapfillCard from "@/components/ParaGapfillCard";
import SentenceExpansionCard from "@/components/SentenceExpansionCard";
import DefinitionRecallCard from "@/components/DefinitionRecallCard";
import SpellingCard from "@/components/SpellingCard";
import RulesStudyScreen from "@/components/RulesStudyScreen";
import LessonBlocks, { type LessonBlock } from "@/components/LessonBlocks";
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
  lesson_content?: string;
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

type Phase = "select" | "playing" | "lesson" | "combine" | "passage" | "vocabulary" | "spelling" | "para_gapfill" | "sentence_expansion" | "definition_recall" | "rules_study" | "results";

type RulesNote = { title: string; description?: string; blocks: LessonBlock[] };

/** Parse the rules note attached to a timed quiz card (lesson_content JSON). */
const getRulesNote = (set: any): RulesNote | null => {
  if (!set?.lesson_content) return null;
  try {
    const parsed = JSON.parse(set.lesson_content);
    if (parsed?.rulesNote && Array.isArray(parsed.rulesNote.blocks) && parsed.rulesNote.blocks.length > 0) {
      return {
        title: parsed.rulesNote.title || set.title || "Rules Note",
        description: parsed.rulesNote.description || "",
        blocks: parsed.rulesNote.blocks,
      };
    }
  } catch { /* not a rules-note card */ }
  return null;
};

type StackDrillSet = {
  id: number;
  title: string;
  description: string;
  subject_id: number | null;
  level: string;
  time_limit_minutes: number;
  question_count: number;
  card_type?: string;
  capitalization_slug?: string;
  lesson_content?: string;
  subjectName: string;
  image_url?: string;
  mastered: boolean;
  totalAttempts: number;
};

type LessonStack = {
  id: number;
  title: string;
  description: string;
  icon: string;
  drillSets: StackDrillSet[];
};

export default function DrillPage() {
  const [phase, setPhase] = useState<Phase>("select");
  const [studentName, setStudentName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [nameSaved, setNameSaved] = useState(false);
  const [drillSets, setDrillSets] = useState<DrillSet[]>([]);
  const [stacks, setStacks] = useState<LessonStack[]>([]);
  const [expandedStackId, setExpandedStackId] = useState<number | null>(null);
  const [selectedSet, setSelectedSet] = useState<DrillSet | null>(null);
  const [questions, setQuestions] = useState<DrillQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  // True when a mastered lesson card is reopened for a fresh re-practice
  const [lessonFresh, setLessonFresh] = useState(false);
  // Passage questions (discussion prompts, not graded)
  const [passageQuestions, setPassageQuestions] = useState<{ id: number; question: string; instruction?: string }[]>([]);
  // Vocabulary words (word + meaning pairs for timed study/recall)
  const [vocabWords, setVocabWords] = useState<{ id: number; word: string; meaning: string }[]>([]);

  // Playing state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [warningsCount, setWarningsCount] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [showRules, setShowRules] = useState(false);
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
    if (name) setNameSaved(true);
    loadDrillSets();
    loadStacks();
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

  const loadStacks = async () => {
    const name = localStorage.getItem("scholars-arena-name") || "";
    try {
      const res = await fetch(`/api/stacks?student_name=${encodeURIComponent(name)}`);
      if (res.ok) setStacks(await res.json());
    } catch {}
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

  const handleStartVocab = async (set: DrillSet) => {
    const name = studentName.trim() || localStorage.getItem("scholars-arena-name") || "Anonymous";
    localStorage.setItem("scholars-arena-name", name);
    setStudentName(name);
    if (schoolName.trim()) localStorage.setItem("scholars-arena-school", schoolName.trim());
    setSelectedSet(set);

    // Load vocabulary words: question=word, explanation=meaning
    const qs = await loadQuestions(set.id);
    setVocabWords(
      qs.map((q: DrillQuestion) => ({
        id: q.id,
        word: q.question,
        meaning: q.explanation || "",
      }))
    );
    // Spelling Bee cards (word + transcription) use the SpellingCard flow
    setPhase(set.capitalization_slug === "spelling" ? "spelling" : "vocabulary");
  };

  const handleStartPassage = async (set: DrillSet) => {
    const name = studentName.trim() || localStorage.getItem("scholars-arena-name") || "Anonymous";
    localStorage.setItem("scholars-arena-name", name);
    setStudentName(name);
    if (schoolName.trim()) localStorage.setItem("scholars-arena-school", schoolName.trim());
    setSelectedSet(set);

    // Load passage questions (discussion prompts)
    const qs = await loadQuestions(set.id);
    setPassageQuestions(
      qs.map((q: DrillQuestion) => ({
        id: q.id,
        question: q.question,
        instruction: q.instruction,
      }))
    );
    setPhase("passage");
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

  const handleStartCombine = (set: DrillSet) => {
    const name = studentName.trim() || localStorage.getItem("scholars-arena-name") || "Anonymous";
    localStorage.setItem("scholars-arena-name", name);
    setStudentName(name);
    if (schoolName.trim()) localStorage.setItem("scholars-arena-school", schoolName.trim());
    setSelectedSet(set);
    setPhase("combine");
  };

  const handleStartParaGapfill = (set: DrillSet) => {
    const name = studentName.trim() || localStorage.getItem("scholars-arena-name") || "Anonymous";
    localStorage.setItem("scholars-arena-name", name);
    setStudentName(name);
    if (schoolName.trim()) localStorage.setItem("scholars-arena-school", schoolName.trim());
    setSelectedSet(set);
    setPhase("para_gapfill");
  };

  const handleStartSentenceExpansion = (set: DrillSet) => {
    const name = studentName.trim() || localStorage.getItem("scholars-arena-name") || "Anonymous";
    localStorage.setItem("scholars-arena-name", name);
    setStudentName(name);
    if (schoolName.trim()) localStorage.setItem("scholars-arena-school", schoolName.trim());
    setSelectedSet(set);
    setPhase("sentence_expansion");
  };

  const handleStartDefinitionRecall = (set: DrillSet) => {
    const name = studentName.trim() || localStorage.getItem("scholars-arena-name") || "Anonymous";
    localStorage.setItem("scholars-arena-name", name);
    setStudentName(name);
    if (schoolName.trim()) localStorage.setItem("scholars-arena-school", schoolName.trim());
    setSelectedSet(set);
    setPhase("definition_recall");
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
      setShowRules(false);
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

  // Entry point from the drills list: quiz cards that carry a rules note
  // (lesson_content → rulesNote) open the study screen first, so the rules
  // are read before the timed questions start. Regular quizzes start directly.
  const handleStartCard = async (set: DrillSet) => {
    if (getRulesNote(set)) {
      setSelectedSet(set);
      setPhase("rules_study");
      return;
    }
    await handleStartDrill(set);
  };

  // Read-only study card: record that the notes were studied, then return.
  const handleFinishStudy = async () => {
    if (!selectedSet || startingDrill) return;
    setStartingDrill(true);
    try {
      const name = studentName.trim() || localStorage.getItem("scholars-arena-name") || "Anonymous";
      localStorage.setItem("scholars-arena-name", name);
      setStudentName(name);
      await fetch("/api/lesson-card/study", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName: name,
          schoolName: schoolName.trim() || localStorage.getItem("scholars-arena-school") || "",
          drillSetId: selectedSet.id,
        }),
      });
    } catch {}
    setStartingDrill(false);
    setPhase("select");
    setSelectedSet(null);
    loadDrillSets();
    loadStacks();
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
    set.card_type === "true_false" ||
    set.card_type === "combine_seq" ||
    set.card_type === "error_correction" ||
    set.card_type === "para_gapfill" ||
    set.card_type === "sentence_expansion" ||
    set.card_type === "sentence_expansion_mcq" ||
    set.card_type === "word_table";

  const isCombineSeqCard = (set: any) =>
    set.card_type === "combine_seq";

  const isErrorCorrectionCard = (set: any) =>
    set.card_type === "error_correction";

  const isPassageCard = (set: any) =>
    set.card_type === "passage";

  const isVocabCard = (set: any) =>
    set.card_type === "vocabulary";

  const isParaGapfillCard = (set: any) =>
    set.card_type === "para_gapfill";

  const isSentenceExpansionCard = (set: any) =>
    set.card_type === "sentence_expansion";

  const isSentenceExpansionMcqCard = (set: any) =>
    set.card_type === "sentence_expansion_mcq";

  // Read-only notes card (lesson_content rulesNote, no questions to answer)
  const isStudyCard = (set: any) =>
    set.card_type === "study";

  // Sequential term/definition recall card (study 10s → type the meaning)
  const isDefinitionRecallCard = (set: any) =>
    set.card_type === "definition_recall";

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
    if (set.card_type === "combine_seq") {
      return { label: "✍️ Sentence Combining", classes: "bg-sky-500/15 text-sky-300" };
    }
    if (set.card_type === "error_correction") {
      return { label: "✏️ Error Correction", classes: "bg-orange-500/15 text-orange-300" };
    }
    if (set.card_type === "para_gapfill") {
      return { label: "📝 Paragraph Gap-Fill", classes: "bg-indigo-500/15 text-indigo-300" };
    }
    if (set.card_type === "sentence_expansion") {
      return { label: "✍️ Sentence Writing", classes: "bg-emerald-500/15 text-emerald-300" };
    }
    if (set.card_type === "sentence_expansion_mcq") {
      return { label: "📝 Sentence MCQ", classes: "bg-teal-500/15 text-teal-300" };
    }
    if (set.card_type === "word_table") {
      return { label: "🔤 Words Table", classes: "bg-orange-500/15 text-orange-300" };
    }
    if (set.card_type === "true_false") {
      return { label: "⚖️ True or False", classes: "bg-emerald-500/15 text-emerald-300" };
    }
    if (set.card_type === "study") {
      return { label: "📖 Study Notes", classes: "bg-blue-500/15 text-blue-300" };
    }
    if (set.card_type === "definition_recall") {
      return { label: "🧠 Definition Recall", classes: "bg-violet-500/15 text-violet-300" };
    }
    if (set.card_type === "passage") {
      return { label: "📖 Reading Passage", classes: "bg-rose-500/15 text-rose-300" };
    }
    if (set.card_type === "vocabulary") {
      if (set.capitalization_slug === "spelling") {
        return { label: "🐝 Spelling Bee", classes: "bg-sky-500/15 text-sky-300" };
      }
      if (set.capitalization_slug === "flash") {
        return { label: "⚡ Flash Vocabulary", classes: "bg-amber-500/15 text-amber-300" };
      }
      if (set.capitalization_slug === "matching") {
        return { label: "🔗 Matching Exercise", classes: "bg-teal-500/15 text-teal-300" };
      }
      if (set.capitalization_slug === "blanks") {
        return { label: "📝 Fill in the Blanks", classes: "bg-indigo-500/15 text-indigo-300" };
      }
      return { label: "📒 Key Vocabulary", classes: "bg-amber-500/15 text-amber-300" };
    }
    return null;
  };

  // ── SELECT PHASE ──
  if (phase === "select") {
    // Drill sets that already live inside a stack — hide them from "More Drills"
    const stackedIds = new Set(
      stacks.flatMap((s) => s.drillSets.map((d) => d.id))
    );
    const unstackedDrillSets = drillSets.filter((s) => !stackedIds.has(s.id));

    return (
      <div className="max-w-4xl mx-auto space-y-8 py-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-4">
          <div className="inline-flex p-4 bg-gradient-to-br from-policeRed/20 to-orange-600/20 rounded-full border border-policeRed/20">
            <Flame size={40} className="text-orange-400" />
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold text-white tracking-tight">
            The Arena
          </h1>
          <p className="text-white/50 text-base sm:text-lg max-w-xl mx-auto px-2">
            Timed drill practice. Complete each set before the clock runs out and track your speed!
          </p>
        </motion.div>

        {/* Name section */}
        {!nameSaved && !studentName.trim() && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card space-y-4">
            <div className="flex items-center gap-2">
              <User size={18} className="text-policeGold" />
              <h2 className="text-lg font-heading font-bold text-white">Who are you?</h2>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <input type="text" value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Your nickname..."
                className="flex-1 bg-black/40 border border-white/10 focus:border-policeGold rounded-xl px-4 py-3 text-white outline-none transition" />
              <input type="text" value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="School (optional)"
                className="flex-1 bg-black/40 border border-white/10 focus:border-policeGold rounded-xl px-4 py-3 text-white outline-none transition" />
            </div>
            <button
              onClick={() => {
                if (!studentName.trim()) return;
                localStorage.setItem("scholars-arena-name", studentName.trim());
                localStorage.setItem("scholars-arena-school", schoolName.trim());
                setNameSaved(true);
              }}
              disabled={!studentName.trim()}
              className="w-full py-2.5 rounded-xl bg-policeGold text-policeBlue font-bold hover:brightness-110 transition disabled:opacity-40 disabled:cursor-not-allowed text-sm">
              Save Name
            </button>
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

        {/* ── LESSON STACKS ── */}
        {stacks.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Layers size={18} className="text-policeGold" />
              <h2 className="text-lg font-heading font-bold text-white">Lesson Stacks</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {stacks.map((stack) => {
                const expanded = expandedStackId === stack.id;
                const masteredCount = stack.drillSets.filter((s) => s.mastered).length;
                const totalCount = stack.drillSets.length;
                const allMastered = totalCount > 0 && masteredCount === totalCount;

                return (
                  <motion.div
                    key={stack.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`card transition-all cursor-pointer ${
                      expanded
                        ? "border-policeGold/50 bg-policeGold/5 shadow-[0_0_20px_rgba(255,215,0,0.1)]"
                        : allMastered
                          ? "border-policeGreen/20 bg-policeGreen/5 hover:border-policeGreen/30"
                          : "hover:border-white/20 hover:bg-white/[0.07]"
                    }`}
                    onClick={() => setExpandedStackId(expanded ? null : stack.id)}
                  >
                    {/* Stack header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 ${
                          allMastered
                            ? "bg-policeGreen/20"
                            : "bg-gradient-to-br from-policeGold/20 to-amber-600/20"
                        }`}>
                          {stack.icon || "📚"}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-white truncate">{stack.title}</h3>
                          {stack.description && (
                            <p className="text-xs text-white/50 line-clamp-1">{stack.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-white/40">
                              {totalCount} lesson{totalCount !== 1 ? "s" : ""}
                            </span>
                            {totalCount > 0 && (
                              <span className={`text-[10px] font-semibold ${
                                "text-policeGold"
                              }`}>
                                {allMastered ? "Master of Stack" : `${masteredCount}/${totalCount} mastered`}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                         {allMastered && (
                           <Crown size={18} className="text-policeGold" />
                        )}
                        <ChevronDown
                          size={16}
                          className={`text-white/30 transition-transform ${
                            expanded ? "rotate-180 text-policeGold" : ""
                          }`}
                        />
                      </div>
                    </div>

                    {/* Mastery progress bar */}
                    {totalCount > 0 && (
                      <div className="mt-3 w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${
                            allMastered ? "bg-gradient-to-r from-policeGold via-amber-300 to-policeGold" : "bg-gradient-to-r from-policeGold to-amber-400"
                          }`}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.round((masteredCount / totalCount) * 100)}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                    )}

                    {/* Expanded lesson cards */}
                    <AnimatePresence>
                      {expanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-4 pt-4 border-t border-white/10 space-y-2.5">
                            {stack.drillSets.map((set) => (
                              <LessonSetCard
                                key={set.id}
                                set={set}
                                isLessonCard={isLessonCard}
                                isPassageCard={isPassageCard}
                                isVocabCard={isVocabCard}
                                isCombineSeqCard={isCombineSeqCard}
                                isErrorCorrectionCard={isErrorCorrectionCard}
                                isParaGapfillCard={isParaGapfillCard}
                                isSentenceExpansionCard={isSentenceExpansionCard}
                                isSentenceExpansionMcqCard={isSentenceExpansionMcqCard}
                                isDefinitionRecallCard={isDefinitionRecallCard}
                                hasRulesNote={!!getRulesNote(set)}
                                lessonBadge={lessonBadge}
                                onStartLesson={() => {
                                  const fullSet: DrillSet = {
                                    ...set,
                                    question_count: set.question_count,
                                    attemptHistory: [],
                                    bestAttempt: null,
                                    created_at: "",
                                  };
                                  handleStartLesson(fullSet);
                                }}
                                onStartCombine={() => {
                                  const fullSet: DrillSet = {
                                    ...set,
                                    question_count: set.question_count,
                                    attemptHistory: [],
                                    bestAttempt: null,
                                    created_at: "",
                                  };
                                  handleStartCombine(fullSet);
                                }}
                                onStartParaGapfill={() => {
                                  const fullSet: DrillSet = {
                                    ...set,
                                    question_count: set.question_count,
                                    attemptHistory: [],
                                    bestAttempt: null,
                                    created_at: "",
                                  };
                                  handleStartParaGapfill(fullSet);
                                }}
                                onStartSentenceExpansion={() => {
                                  const fullSet: DrillSet = {
                                    ...set,
                                    question_count: set.question_count,
                                    attemptHistory: [],
                                    bestAttempt: null,
                                    created_at: "",
                                  };
                                  handleStartSentenceExpansion(fullSet);
                                }}
                                onStartDefinitionRecall={() => {
                                  const fullSet: DrillSet = {
                                    ...set,
                                    question_count: set.question_count,
                                    attemptHistory: [],
                                    bestAttempt: null,
                                    created_at: "",
                                  };
                                  handleStartDefinitionRecall(fullSet);
                                }}
                                onStartDrill={async () => {
                                  const fullSet: DrillSet = {
                                    ...set,
                                    question_count: set.question_count,
                                    attemptHistory: [],
                                    bestAttempt: null,
                                    created_at: "",
                                  };
                                  await handleStartCard(fullSet);
                                }}
                                onStartPassage={async () => {
                                  const fullSet: DrillSet = {
                                    ...set,
                                    question_count: set.question_count,
                                    attemptHistory: [],
                                    bestAttempt: null,
                                    created_at: "",
                                  };
                                  await handleStartPassage(fullSet);
                                }}
                                onStartVocab={async () => {
                                  const fullSet: DrillSet = {
                                    ...set,
                                    question_count: set.question_count,
                                    attemptHistory: [],
                                    bestAttempt: null,
                                    created_at: "",
                                  };
                                  await handleStartVocab(fullSet);
                                }}
                                startingDrill={startingDrill}
                              />
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── DRILL SETS (unstacked) ── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <Loader2 size={32} className="text-policeGold animate-spin" />
            <p className="text-white/50 text-sm uppercase tracking-widest">Loading drill sets...</p>
          </div>
        ) : drillSets.length === 0 && stacks.length === 0 ? (
          <div className="card text-center py-16 space-y-4">
            <BookOpen size={48} className="text-white/20 mx-auto" />
            <h2 className="text-xl font-heading font-bold text-white">No Drill Sets Available</h2>
            <p className="text-white/60">No timed drills have been created yet. Check back soon!</p>
          </div>
        ) : unstackedDrillSets.length > 0 ? (
          <>
            {stacks.length > 0 && (
              <div className="flex items-center gap-2 pt-2">
                <Zap size={18} className="text-policeRed" />
                <h2 className="text-lg font-heading font-bold text-white">More Drills</h2>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
              {unstackedDrillSets.map((set, idx) => (
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
                              : set.card_type === "passage"
                                ? "bg-gradient-to-br from-rose-500/20 to-pink-500/20 text-rose-300"
                              : set.card_type === "vocabulary"
                                ? "bg-gradient-to-br from-amber-500/20 to-yellow-500/20 text-amber-300"
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
                      <p className="text-[8px] uppercase tracking-widest text-white/40">{isStudyCard(set) ? "Notes" : isVocabCard(set) ? "Vocab Words" : isPassageCard(set) ? "Discussion Qs" : isLessonCard(set) ? (set.card_type === "true_false" ? "Statements" : set.card_type === "word_table" ? "Forms" : "Sentences") : "Questions"}</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2 text-center">
                      <Clock size={14} className="text-policeGold mx-auto mb-0.5" />
                      {isVocabCard(set) ? (
                        <>
                          <p className="text-sm font-bold text-white">{set.time_limit_minutes}m</p>
                          <p className="text-[8px] uppercase tracking-widest text-white/40">Study</p>
                        </>
                      ) : isPassageCard(set) ? (
                        <>
                          <p className="text-sm font-bold text-white">Self</p>
                          <p className="text-[8px] uppercase tracking-widest text-white/40">Paced</p>
                        </>
                      ) : isLessonCard(set) ? (
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
                      {set.description && <p className="text-xs text-white/60 mb-4 line-clamp-3">{set.description}</p>}
                      {isVocabCard(set) ? (
                        <button onClick={(e) => { e.stopPropagation(); handleStartVocab(set); }}
                          className="w-full flex items-center justify-center gap-2 bg-amber-500 text-white font-bold py-2.5 sm:py-3 rounded-xl hover:brightness-110 transition text-xs sm:text-sm">
                          <BookOpen size={16} /> Study Vocabulary
                        </button>
                      ) : isPassageCard(set) ? (
                        <button onClick={(e) => { e.stopPropagation(); handleStartPassage(set); }}
                          className="w-full flex items-center justify-center gap-2 bg-rose-500 text-white font-bold py-2.5 sm:py-3 rounded-xl hover:brightness-110 transition text-xs sm:text-sm">
                          <BookOpen size={16} /> Read Passage
                        </button>
                      ) : isLessonCard(set) ? (
                        isSentenceExpansionCard(set) ? (
                          <button onClick={(e) => { e.stopPropagation(); handleStartSentenceExpansion(set); }}
                            className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white font-bold py-2.5 sm:py-3 rounded-xl hover:brightness-110 transition text-xs sm:text-sm">
                            <PenLine size={16} /> Write Sentences
                          </button>
                        ) : isParaGapfillCard(set) ? (
                          <button onClick={(e) => { e.stopPropagation(); handleStartParaGapfill(set); }}
                            className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold py-2.5 sm:py-3 rounded-xl hover:brightness-110 transition text-xs sm:text-sm">
                            <PencilLine size={16} /> Fill Blanks
                          </button>
                        ) : isCombineSeqCard(set) || isSentenceExpansionMcqCard(set) ? (
                          <button onClick={(e) => { e.stopPropagation(); handleStartCombine(set); }}
                            className="w-full flex items-center justify-center gap-2 bg-policeGold text-policeBlue font-bold py-2.5 sm:py-3 rounded-xl hover:brightness-110 transition text-xs sm:text-sm">
                            <PencilLine size={16} /> Start Combining
                          </button>
                        ) : set.mastered ? (
                          <div className="grid grid-cols-2 gap-2">
                            <button onClick={(e) => { e.stopPropagation(); handleStartLesson(set, true); }}
                              className="flex items-center justify-center gap-2 bg-policeGold text-policeBlue font-bold py-2.5 sm:py-3 rounded-xl hover:brightness-110 transition text-xs sm:text-sm">
                              <RotateCcw size={15} /> Practice Again
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleStartLesson(set, false); }}
                              className="flex items-center justify-center gap-2 bg-white/10 text-white font-bold py-2.5 sm:py-3 rounded-xl hover:bg-white/20 transition border border-white/10 text-xs sm:text-sm">
                              <BookOpen size={15} /> Review Lesson
                            </button>
                          </div>
                        ) : (
                          <button onClick={(e) => { e.stopPropagation(); handleStartLesson(set, false); }}
                            className="w-full flex items-center justify-center gap-2 bg-policeGold text-policeBlue font-bold py-2.5 sm:py-3 rounded-xl hover:brightness-110 transition text-xs sm:text-sm">
                            <PencilLine size={16} /> Start Lesson
                          </button>
                        )
                      ) : (
                        <button onClick={(e) => { e.stopPropagation(); handleStartCard(set); }}
                          disabled={startingDrill}
                          className="w-full flex items-center justify-center gap-2 bg-policeGold text-policeBlue font-bold py-2.5 sm:py-3 rounded-xl hover:brightness-110 transition text-xs sm:text-sm disabled:opacity-60 disabled:cursor-not-allowed">
                          {startingDrill ? <Loader2 size={16} className="animate-spin" /> : getRulesNote(set) ? <BookOpen size={16} /> : <Zap size={16} />} {startingDrill ? "Starting..." : getRulesNote(set) ? "Study Rules First" : "Start Drill"}
                        </button>
                      )}
                    </motion.div>
                  )}
                </motion.button>
              ))}
            </div>
          </>
        ) : null}
      </div>
    );
  }

  // ── RULES STUDY PHASE (quiz card with an attached rules note) ──
  if (phase === "rules_study" && selectedSet) {
    const rulesNote = getRulesNote(selectedSet);
    if (rulesNote) {
      return (
        <RulesStudyScreen
          key={selectedSet.id}
          title={rulesNote.title}
          description={rulesNote.description}
          blocks={rulesNote.blocks}
          questionCount={selectedSet.question_count}
          timeLimitMinutes={selectedSet.time_limit_minutes}
          starting={startingDrill}
          studyOnly={isStudyCard(selectedSet)}
          onStart={() => (isStudyCard(selectedSet) ? handleFinishStudy() : handleStartDrill())}
          onBack={() => {
            setPhase("select");
            setSelectedSet(null);
            loadDrillSets();
            loadStacks();
          }}
        />
      );
    }
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
        <div className="sticky top-0 z-30 bg-[#030712]/80 backdrop-blur-xl border-b border-white/10 -mx-4 px-3 sm:px-4 py-2.5 sm:py-3">
          <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-between gap-x-2 sm:gap-x-3 gap-y-1.5 sm:gap-y-2">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <button
                onClick={() => {
                  if (timerRef.current) clearInterval(timerRef.current);
                  if (warningTimerRef.current) clearInterval(warningTimerRef.current);
                  timerRef.current = null;
                  warningTimerRef.current = null;
                  sessionSetIdRef.current = null;
                  setSessionResults([]);
                  setAttemptId(null);
                  setQuestions([]);
                  setSelectedSet(null);
                  setPhase("select");
                  loadDrillSets();
                  loadStacks();
                }}
                className="flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-sm text-white/60 hover:text-white transition shrink-0"
              >
                <ArrowLeft size={16} /> <span className="hidden sm:inline">Back to Drills</span>
              </button>
              <span className="text-[10px] sm:text-xs uppercase tracking-widest bg-white/10 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-white/50">
                Q {currentIndex + 1}/{questions.length}
              </span>
              <div className={`flex items-center gap-1 sm:gap-1.5 rounded-full px-2 sm:px-3 py-1 sm:py-1.5 ${timeStatus.bg}`}>
                <timeStatus.icon size={14} className={timeStatus.color} />
                <span className={`text-xs sm:text-sm font-bold font-mono ${timeStatus.color}`}>{formatTime(elapsedSeconds)}</span>
                {targetSeconds > 0 && (
                  <span className={`text-[10px] sm:text-xs ${isOverTime ? "text-policeRed/60" : "text-white/40"}`}>/ {formatTime(targetSeconds)}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {getRulesNote(selectedSet) && (
                <button
                  onClick={() => setShowRules((v) => !v)}
                  className={`flex items-center gap-1 rounded-full px-2 sm:px-2.5 py-1 text-[10px] sm:text-xs font-bold uppercase tracking-widest transition ${
                    showRules ? "bg-amber-500/20 text-amber-300" : "bg-white/10 text-white/60 hover:bg-white/20 hover:text-white"
                  }`}
                  title="Open the rules note"
                >
                  <BookOpen size={12} /> Laws
                </button>
              )}
              <span className="text-[10px] sm:text-xs text-policeGreen font-semibold bg-policeGreen/10 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full">{correctCount} correct</span>
              <span className="hidden md:inline-flex text-xs uppercase tracking-widest bg-white/10 px-2 py-1 rounded-full text-white/50 truncate max-w-[220px]">
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

        {/* Rules note reference (quiz cards that carry one) */}
        {getRulesNote(selectedSet) && showRules && (
          <div className="max-w-3xl mx-auto card space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-xl bg-amber-500/15 text-amber-300 shrink-0">
                  <BookOpen size={18} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-heading font-bold text-white truncate">{getRulesNote(selectedSet)!.title}</h3>
                  <p className="text-[10px] uppercase tracking-widest text-white/40">Rules Reference — the clock keeps running</p>
                </div>
              </div>
              <button onClick={() => setShowRules(false)} className="p-2 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition shrink-0">
                <ChevronDown size={16} />
              </button>
            </div>
            <LessonBlocks blocks={getRulesNote(selectedSet)!.blocks} />
          </div>
        )}

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

  // ── VOCABULARY CARD PHASE ──
  if (phase === "vocabulary" && selectedSet) {
    // Parse exercise data from lesson_content JSON:
    // a plain array = fill-in-the-gap chunks; an object with matchQuestions =
    // matching exercise options.
    let gapChunks: { text: string; gapWord: string | null }[] | undefined;
    let matchQuestions: { word: string; options: string[]; answerIndex: number }[] | undefined;
    try {
      if (selectedSet.lesson_content) {
        const parsed = JSON.parse(selectedSet.lesson_content);
        if (Array.isArray(parsed)) {
          gapChunks = parsed;
        } else if (parsed && Array.isArray(parsed.matchQuestions)) {
          matchQuestions = parsed.matchQuestions;
        }
      }
    } catch { /* no embedded exercise */ }

    return (
      <VocabularyCard
        set={selectedSet}
        words={vocabWords}
        studentName={studentName}
        gapChunks={gapChunks}
        flashMode={selectedSet.capitalization_slug === "flash"}
        matchingMode={selectedSet.capitalization_slug === "matching"}
        blanksMode={selectedSet.capitalization_slug === "blanks"}
        matchQuestions={matchQuestions}
        onDone={() => {
          setPhase("select");
          setSelectedSet(null);
          setVocabWords([]);
          loadDrillSets();
        }}
      />
    );
  }

  // ── SPELLING BEE CARD PHASE ──
  if (phase === "spelling" && selectedSet) {
    // Parse the 6 category names/descriptions from lesson_content JSON
    let spellingCategories: { name: string; description: string }[] = [];
    try {
      if (selectedSet.lesson_content) {
        const parsed = JSON.parse(selectedSet.lesson_content);
        if (parsed && Array.isArray(parsed.categories)) {
          spellingCategories = parsed.categories;
        }
      }
    } catch { /* no category metadata */ }

    return (
      <SpellingCard
        set={selectedSet}
        words={vocabWords}
        studentName={studentName}
        categories={spellingCategories}
        onDone={() => {
          setPhase("select");
          setSelectedSet(null);
          setVocabWords([]);
          loadDrillSets();
          loadStacks();
        }}
      />
    );
  }

  // ── PASSAGE CARD PHASE ──
  if (phase === "passage" && selectedSet) {
    return (
      <PassageCard
        set={selectedSet}
        questions={passageQuestions}
        studentName={studentName}
        onDone={() => {
          setPhase("select");
          setSelectedSet(null);
          setPassageQuestions([]);
          loadDrillSets();
        }}
      />
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

  // ── COMBINE CARD PHASE ──
  if (phase === "combine" && selectedSet) {
    return (
      <CombineCard
        key={selectedSet.id}
        set={selectedSet}
        studentName={studentName}
        onDone={() => {
          setPhase("select");
          setSelectedSet(null);
          loadDrillSets();
        }}
      />
    );
  }

  // ── PARA GAPFILL PHASE ──
  if (phase === "para_gapfill" && selectedSet) {
    return (
      <ParaGapfillCard
        key={selectedSet.id}
        set={selectedSet}
        studentName={studentName}
        onDone={() => {
          setPhase("select");
          setSelectedSet(null);
          loadDrillSets();
        }}
      />
    );
  }

  // ── SENTENCE EXPANSION PHASE ──
  if (phase === "sentence_expansion" && selectedSet) {
    return (
      <SentenceExpansionCard
        key={selectedSet.id}
        set={selectedSet}
        studentName={studentName}
        onDone={() => {
          setPhase("select");
          setSelectedSet(null);
          loadDrillSets();
        }}
      />
    );
  }

  // ── DEFINITION RECALL PHASE ──
  if (phase === "definition_recall" && selectedSet) {
    return (
      <DefinitionRecallCard
        key={selectedSet.id}
        set={selectedSet}
        studentName={studentName}
        schoolName={schoolName}
        onDone={() => {
          setPhase("select");
          setSelectedSet(null);
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
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
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
                    className="flex-1 flex items-center justify-center gap-2 bg-policeGold text-policeBlue font-bold py-3 sm:py-4 rounded-xl hover:brightness-110 transition disabled:opacity-60 disabled:cursor-not-allowed text-xs sm:text-sm">
                    <ArrowLeft size={18} /> All Drills
                  </button>
                  <button onClick={() => handleStartDrill(selectedSet)}
                    disabled={startingDrill}
                    className="flex-1 flex items-center justify-center gap-2 bg-white/10 text-white font-bold py-3 sm:py-4 rounded-xl hover:bg-white/20 transition border border-white/10 disabled:opacity-60 disabled:cursor-not-allowed text-xs sm:text-sm">
                    {startingDrill ? <Loader2 size={18} className="animate-spin" /> : <RotateCcw size={18} />} {startingDrill ? "Restarting..." : "Practice Again"}
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => handleStartDrill(selectedSet)}
                    disabled={startingDrill}
                    className={`flex-[2] flex items-center justify-center gap-2 bg-policeGold text-policeBlue font-bold py-3 sm:py-4 rounded-xl hover:brightness-110 transition disabled:opacity-60 disabled:cursor-not-allowed text-xs sm:text-sm ${startingDrill ? "" : "animate-pulse"}`}>
                    {startingDrill ? <Loader2 size={18} className="animate-spin" /> : <RotateCcw size={18} />} {startingDrill ? "Repracticing..." : "🔁 Repractice This Card"}
                  </button>
                  <button onClick={goAllDrills}
                    disabled={startingDrill}
                    className="flex-1 flex items-center justify-center gap-2 bg-white/10 text-white font-bold py-3 sm:py-4 rounded-xl hover:bg-white/20 transition border border-white/10 disabled:opacity-60 disabled:cursor-not-allowed text-xs sm:text-sm">
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

// ── LESSON SET CARD (used inside stacks) ──
function LessonSetCard({
  set,
  isLessonCard,
  isPassageCard,
  isVocabCard,
  isCombineSeqCard,
  isErrorCorrectionCard,
  isParaGapfillCard,
  isSentenceExpansionCard,
  isSentenceExpansionMcqCard,
  isDefinitionRecallCard,
  hasRulesNote,
  lessonBadge,
  onStartLesson,
  onStartCombine,
  onStartParaGapfill,
  onStartSentenceExpansion,
  onStartDefinitionRecall,
  onStartDrill,
  onStartPassage,
  onStartVocab,
  startingDrill,
}: {
  set: StackDrillSet;
  isLessonCard: (s: any) => boolean;
  isPassageCard: (s: any) => boolean;
  isVocabCard: (s: any) => boolean;
  isCombineSeqCard: (s: any) => boolean;
  isErrorCorrectionCard: (s: any) => boolean;
  isParaGapfillCard: (s: any) => boolean;
  isSentenceExpansionCard: (s: any) => boolean;
  isSentenceExpansionMcqCard: (s: any) => boolean;
  isDefinitionRecallCard: (s: any) => boolean;
  hasRulesNote: boolean;
  lessonBadge: (s: any) => { label: string; classes: string } | null;
  onStartLesson: () => void;
  onStartCombine: () => void;
  onStartParaGapfill: () => void;
  onStartSentenceExpansion: () => void;
  onStartDefinitionRecall: () => void;
  onStartDrill: () => void;
  onStartPassage: () => void;
  onStartVocab: () => void;
  startingDrill: boolean;
}) {
  const badge = lessonBadge(set);

  return (
      <div
      className={`rounded-xl border p-3.5 transition-all ${
        set.mastered
          ? "bg-policeGreen/10 border-policeGreen/30"
          : "bg-white/5 border-white/10 hover:border-policeGold/30"
      }`}
      >
      {set.mastered && (
        <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-policeGold">
          <BadgeCheck size={12} /> Card Mastered
        </div>
      )}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-white truncate">{set.title}</h4>
                             {set.mastered && <BadgeCheck size={14} className="text-policeGold shrink-0" />}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {badge && (
              <span className={`text-[8px] uppercase tracking-widest px-1.5 py-0.5 rounded-full font-bold ${badge.classes}`}>
                {badge.label}
              </span>
            )}
            <span className="text-[10px] text-white/40">
              {set.card_type === "study" ? "Unit notes" : set.card_type === "definition_recall" ? <>{set.question_count} words • 3 stages</> : <>{set.question_count} {isVocabCard(set) ? (set.capitalization_slug === "spelling" ? "words • 6 stages" : "words") : isPassageCard(set) ? "discussion qs" : isLessonCard(set) ? (set.card_type === "true_false" ? "statements" : set.card_type === "word_table" ? "forms" : "sentences") : "questions"}</>}
            </span>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (isVocabCard({ card_type: set.card_type })) {
              onStartVocab();
            } else if (isPassageCard({ card_type: set.card_type })) {
              onStartPassage();
            } else if (isSentenceExpansionCard({ card_type: set.card_type })) {
              onStartSentenceExpansion();
            } else if (isDefinitionRecallCard({ card_type: set.card_type })) {
              onStartDefinitionRecall();
            } else if (isParaGapfillCard({ card_type: set.card_type })) {
              onStartParaGapfill();
            } else if (isCombineSeqCard({ card_type: set.card_type }) || isErrorCorrectionCard({ card_type: set.card_type }) || isSentenceExpansionMcqCard({ card_type: set.card_type })) {
              onStartCombine();
            } else if (isLessonCard({ card_type: set.card_type })) {
              onStartLesson();
            } else {
              onStartDrill();
            }
          }}
          disabled={startingDrill}
          className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
            set.mastered
              ? "bg-policeGreen/20 text-policeGreen hover:bg-policeGreen/30"
              : "bg-policeGold text-policeBlue hover:brightness-110"
          } disabled:opacity-60 disabled:cursor-not-allowed`}
        >
          {set.mastered ? (
            <>
              <RotateCcw size={13} />
              {set.capitalization_slug === "spelling" ? "Spell Again" : isVocabCard({ card_type: set.card_type }) ? "Study Again" : isPassageCard({ card_type: set.card_type }) ? "Read Again" : isSentenceExpansionCard({ card_type: set.card_type }) ? "Write Again" : isParaGapfillCard({ card_type: set.card_type }) ? "Practice Again" : isErrorCorrectionCard({ card_type: set.card_type }) ? "Practice Again" : isCombineSeqCard({ card_type: set.card_type }) ? "Practice Again" : isSentenceExpansionMcqCard({ card_type: set.card_type }) ? "Practice Again" : isDefinitionRecallCard({ card_type: set.card_type }) ? "Recall Again" : isLessonCard({ card_type: set.card_type }) ? "Practice" : hasRulesNote ? "Study Again" : "Retake"}
            </>
          ) : (
            <>
              {set.capitalization_slug === "spelling" ? <Volume2 size={13} /> : isVocabCard({ card_type: set.card_type }) ? <BookOpen size={13} /> : isPassageCard({ card_type: set.card_type }) ? <BookOpen size={13} /> : isDefinitionRecallCard({ card_type: set.card_type }) ? <BrainCircuit size={13} /> : isLessonCard({ card_type: set.card_type }) ? <PencilLine size={13} /> : hasRulesNote ? <BookOpen size={13} /> : <Zap size={13} />}
              {set.capitalization_slug === "spelling" ? "Spell" : isVocabCard({ card_type: set.card_type }) ? "Study" : isPassageCard({ card_type: set.card_type }) ? "Read" : isSentenceExpansionCard({ card_type: set.card_type }) ? "Write" : isParaGapfillCard({ card_type: set.card_type }) ? "Fill Blanks" : isErrorCorrectionCard({ card_type: set.card_type }) ? "Correct" : isCombineSeqCard({ card_type: set.card_type }) ? "Combine" : isSentenceExpansionMcqCard({ card_type: set.card_type }) ? "Choose" : isDefinitionRecallCard({ card_type: set.card_type }) ? "Recall" : isLessonCard({ card_type: set.card_type }) ? "Start" : hasRulesNote ? "Study" : "Drill"}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

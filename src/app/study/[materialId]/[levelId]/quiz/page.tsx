"use client";

import { useState, useEffect, use, useCallback } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";
import {
  ArrowLeft, Loader2, BrainCircuit,
  Trophy, Sparkles, ArrowRight, RotateCcw,
  Zap, Flag, Layers
} from "lucide-react";
import QuestionCard from "@/components/QuestionCard";
import type { OptionKey, OptionsRecord } from "@/lib/questions";
import toast from "react-hot-toast";

type QuizQuestion = {
  id: number;
  category: string;
  question: string;
  options: OptionsRecord;
  correct: OptionKey;
  explanation: string;
  passage?: string;
};

type MaterialLevel = {
  id: number;
  material_id: number;
  title: string;
  description: string;
  level_number: number;
  cardCount: number;
  questionCount: number;
};

type Sticker = { id: number; url: string; active: boolean };

export default function LevelQuizPage({
  params,
}: {
  params: Promise<{ materialId: string; levelId: string }>;
}) {
  const { materialId, levelId } = use(params);
  const router = useRouter();
  const [materialTitle, setMaterialTitle] = useState("");
  const [levels, setLevels] = useState<MaterialLevel[]>([]);
  const [currentLevel, setCurrentLevel] = useState<MaterialLevel | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Quiz state
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [quizPhase, setQuizPhase] = useState<"ready" | "playing" | "finished">("ready");
  const [studentName, setStudentName] = useState<string | null>(null);

  // Combined level choice
  const [previousLevels, setPreviousLevels] = useState<MaterialLevel[]>([]);
  const [selectedLevels, setSelectedLevels] = useState<number[]>([]);
  const [showLevelChoice, setShowLevelChoice] = useState(true);

  useEffect(() => {
    const name = localStorage.getItem("scholars-arena-name");
    setStudentName(name);
    loadData();
  }, [materialId, levelId]);

  const loadData = async () => {
    try {
      const res = await fetch(`/api/study/materials/${materialId}`);
      if (!res.ok) throw new Error("Material not found");

      const data = await res.json();
      setMaterialTitle(data.title);
      setLevels(data.levels || []);

      const current = (data.levels || []).find(
        (l: any) => l.id === parseInt(levelId)
      );
      setCurrentLevel(current || null);

      // Find completed previous levels that have questions
      const completedPrevLevels = [];
      const name = localStorage.getItem("scholars-arena-name");

      if (name && data.levels) {
        const supabaseModule = await import("@/lib/supabaseClient");
        const supabase = await supabaseModule.getSupabase();

        const { data: progress } = await supabase
          .from("student_material_progress")
          .select("*")
          .eq("student_name", name)
          .eq("material_id", parseInt(materialId));

        const completedIds = new Set(
          (progress || [])
            .filter((p: any) => p.completed)
            .map((p: any) => p.level_id)
        );

        for (const level of data.levels) {
          if (
            level.id !== parseInt(levelId) &&
            completedIds.has(level.id) &&
            level.questionCount > 0
          ) {
            completedPrevLevels.push(level);
          }
        }
      }

      setPreviousLevels(completedPrevLevels);

      // Default: just this level
      setSelectedLevels([parseInt(levelId)]);

      // Load stickers
      try {
        const supabaseModule = await import("@/lib/supabaseClient");
        const supabase = await supabaseModule.getSupabase();
        const { data: stickerData } = await supabase
          .from("stickers")
          .select("*")
          .eq("active", true);
        if (stickerData) setStickers(stickerData);
      } catch {}
    } catch (err: any) {
      toast.error(err.message || "Failed to load quiz");
    } finally {
      setLoading(false);
    }
  };

  const startQuiz = async (levelIds: number[]) => {
    if (levelIds.length === 0) {
      toast.error("No levels selected");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/study/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          levelIds,
          studentName,
        }),
      });

      if (!res.ok) throw new Error("Failed to load questions");

      const data = await res.json();

      if (!data.questions || data.questions.length === 0) {
        toast.error("No questions available for the selected level(s)");
        return;
      }

      // Shuffle questions
      const shuffled = [...data.questions].sort(() => Math.random() - 0.5);
      setQuestions(shuffled);
      setQuizPhase("playing");
      setShowLevelChoice(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to start quiz");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAnswer = useCallback(
    (correct: boolean) => {
      if (correct) {
        setScore((prev) => prev + 1);
      }
    },
    []
  );

  const handleNext = useCallback(() => {
    if (index < questions.length - 1) {
      setIndex((prev) => prev + 1);
    } else {
      // Quiz finished — score already includes current question's result via handleAnswer
      setQuizPhase("finished");

      // Fire confetti if good score
      const pct = (score / questions.length) * 100;
      if (pct >= 70) {
        confetti({
          particleCount: 150,
          spread: 120,
          origin: { y: 0.6 },
          colors: ["#FFD700", "#ffffff", "#28a745"],
        });
      }

      // Save test attempt
      saveTestAttempt(score);
    }
  }, [index, questions.length, score]);

  const saveTestAttempt = async (finalScore: number) => {
    if (!studentName) return;
    try {
      const { getSupabase } = await import("@/lib/supabaseClient");
      const supabase = await getSupabase();

      const totalQ = questions.length;

      await supabase.from("student_test_attempts").insert({
        student_name: studentName,
        material_id: parseInt(materialId),
        level_ids: selectedLevels,
        score: finalScore,
        total_questions: totalQ,
        passed: finalScore / totalQ >= 0.6,
      });
    } catch (err) {
      console.error("Failed to save test attempt:", err);
    }
  };

  const handleRestartQuiz = () => {
    setQuestions([]);
    setIndex(0);
    setScore(0);
    setQuizPhase("ready");
    setShowLevelChoice(true);
  };

  // ─── LOADING ───
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 size={32} className="text-policeGold animate-spin" />
        <p className="text-white/50 text-sm uppercase tracking-widest">Preparing quiz...</p>
      </div>
    );
  }

  const percentage = Math.round((score / Math.max(questions.length, 1)) * 100);
  const passed = percentage >= 60;

  // ─── LEVEL CHOICE SCREEN (Ready) ───
  if (quizPhase === "ready") {
    return (
      <div className="max-w-2xl mx-auto space-y-8 py-8">
        <button
          onClick={() => router.push(`/study/${materialId}`)}
          className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          {materialTitle}
        </button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <div className="inline-flex p-4 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full border border-blue-500/20">
            <BrainCircuit size={40} className="text-blue-400" />
          </div>
          <h1 className="text-3xl font-heading font-bold text-white">
            {currentLevel?.title || "Level"} Quiz
          </h1>
          <p className="text-white/60 max-w-md mx-auto">
            Time to test your knowledge! Choose which levels to include in this quiz.
          </p>
        </motion.div>

        {/* Level selection */}
        <div className="card space-y-4">
          <div className="flex items-center gap-2 text-sm text-white/70 font-semibold">
            <Layers size={16} className="text-policeGold" />
            Select levels to test on:
          </div>

          <div className="space-y-3">
            {/* Current level (always selected by default) */}
            {currentLevel && (
              <label
                className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition ${
                  selectedLevels.includes(currentLevel.id)
                    ? "border-policeGold bg-policeGold/10"
                    : "border-white/10 bg-white/5 hover:border-white/30"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedLevels.includes(currentLevel.id)}
                  onChange={() => {
                    if (selectedLevels.includes(currentLevel.id)) {
                      setSelectedLevels(
                        selectedLevels.filter((id) => id !== currentLevel.id)
                      );
                    } else {
                      setSelectedLevels([...selectedLevels, currentLevel.id]);
                    }
                  }}
                  className="w-5 h-5 rounded accent-policeGold"
                />
                <div className="flex-1">
                  <p className="font-semibold text-white">{currentLevel.title}</p>
                  <p className="text-xs text-white/50">
                    {currentLevel.questionCount} question{currentLevel.questionCount !== 1 ? "s" : ""}
                  </p>
                </div>
                <span className="text-[10px] uppercase tracking-widest bg-blue-500/10 text-blue-400 px-2 py-1 rounded-full font-semibold">
                  Current
                </span>
              </label>
            )}

            {/* Previous completed levels */}
            {previousLevels.map((level) => (
              <label
                key={level.id}
                className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition ${
                  selectedLevels.includes(level.id)
                    ? "border-policeGold bg-policeGold/10"
                    : "border-white/10 bg-white/5 hover:border-white/30"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedLevels.includes(level.id)}
                  onChange={() => {
                    if (selectedLevels.includes(level.id)) {
                      setSelectedLevels(
                        selectedLevels.filter((id) => id !== level.id)
                      );
                    } else {
                      setSelectedLevels([...selectedLevels, level.id]);
                    }
                  }}
                  className="w-5 h-5 rounded accent-policeGold"
                />
                <div className="flex-1">
                  <p className="font-semibold text-white">{level.title}</p>
                  <p className="text-xs text-white/50">
                    {level.questionCount} question{level.questionCount !== 1 ? "s" : ""}
                  </p>
                </div>
                <span className="text-[10px] uppercase tracking-widest bg-policeGreen/10 text-policeGreen px-2 py-1 rounded-full font-semibold">
                  Completed
                </span>
              </label>
            ))}

            {previousLevels.length === 0 && (
              <p className="text-sm text-white/40 text-center py-3">
                No previous levels with questions available to combine.
              </p>
            )}
          </div>

          {previousLevels.length > 0 && (
            <div className="bg-gradient-to-r from-policeGold/5 to-amber-500/5 border border-policeGold/20 rounded-xl p-4 text-sm text-white/70">
              <Sparkles size={16} className="inline text-policeGold mr-1" />
              {selectedLevels.length > 1
                ? `Great choice! Testing on ${selectedLevels.length} levels will give you a comprehensive review.`
                : "Combine with previous levels for a more comprehensive test!"}
            </div>
          )}

          <button
            onClick={() => startQuiz(selectedLevels)}
            disabled={submitting || selectedLevels.length === 0}
            className="w-full py-4 rounded-xl bg-policeGold text-policeBlue font-bold uppercase tracking-widest hover:brightness-110 transition disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                <Zap size={18} /> Start Quiz
              </>
            )}
          </button>
        </div>

        {!studentName && (
          <div className="text-center text-sm text-policeGold/70 bg-policeGold/10 p-4 rounded-xl border border-policeGold/20">
            Set your name on the Practice page to save your quiz results.
          </div>
        )}
      </div>
    );
  }

  // ─── PLAYING ───
  if (quizPhase === "playing" && questions.length > 0) {
    const question = questions[index];
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push(`/study/${materialId}`)}
            className="text-sm text-white/50 hover:text-white transition"
          >
            <ArrowLeft size={16} className="inline mr-1" />
            Quit Quiz
          </button>
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/50 bg-white/10 px-2 py-1 rounded-full">
              Question {index + 1} of {questions.length}
            </span>
            <span className="text-xs text-policeGold font-semibold bg-policeGold/10 px-2 py-1 rounded-full">
              {score} correct
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-policeGold rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${((index + 1) / questions.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        <QuestionCard
          key={question.id}
          question={question}
          stickers={stickers}
          onAnswer={handleAnswer}
          onNext={handleNext}
        />
      </div>
    );
  }

  // ─── FINISHED ───
  return (
    <div className="max-w-2xl mx-auto text-center space-y-8 py-10">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 200 }}
      >
        <div
          className={`inline-flex p-6 rounded-full border-2 mb-6 ${
            passed
              ? "bg-policeGreen/20 border-policeGreen/30"
              : "bg-orange-500/10 border-orange-500/20"
          }`}
        >
          {passed ? (
            <Trophy size={64} className="text-policeGreen" />
          ) : (
            <Flag size={64} className="text-orange-400" />
          )}
        </div>

        <h2 className="text-3xl sm:text-4xl font-heading font-bold text-white mb-3">
          {passed ? "Excellent Work! 🎉" : "Good Effort! 💪"}
        </h2>
        <p className="text-white/60 text-lg max-w-md mx-auto">
          {passed
            ? "You've mastered this material! Keep up the great work."
            : "Review the cards again and try the quiz once more!"}
        </p>

        {/* Score display */}
        <div className="mt-8 grid grid-cols-3 gap-4 max-w-xs mx-auto">
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <p className="text-2xl font-bold text-white">{score}</p>
            <p className="text-[10px] uppercase tracking-widest text-white/50">Correct</p>
          </div>
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <p className="text-2xl font-bold text-white">{questions.length - score}</p>
            <p className="text-[10px] uppercase tracking-widest text-white/50">Wrong</p>
          </div>
          <div
            className={`rounded-2xl p-4 border ${
              passed
                ? "bg-policeGreen/10 border-policeGreen/30"
                : "bg-orange-500/10 border-orange-500/20"
            }`}
          >
            <p
              className={`text-2xl font-bold ${
                passed ? "text-policeGreen" : "text-orange-400"
              }`}
            >
              {percentage}%
            </p>
            <p className="text-[10px] uppercase tracking-widest text-white/50">Score</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
          {!passed && (
            <button
              onClick={handleRestartQuiz}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-policeGold text-policeBlue font-bold hover:brightness-110 transition"
            >
              <RotateCcw size={16} /> Retry Quiz
            </button>
          )}
          <button
            onClick={() => router.push(`/study/${materialId}`)}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 text-white font-semibold border border-white/10 hover:bg-white/20 transition"
          >
            <ArrowLeft size={16} /> Back to Material
          </button>
          {passed && selectedLevels.length <= 1 && levels.length > 1 && (
            <button
              onClick={() => {
                const nextLevel = levels.find(
                  (l) => l.level_number === (currentLevel?.level_number || 0) + 1
                );
                if (nextLevel) {
                  router.push(`/study/${materialId}/${nextLevel.id}`);
                } else {
                  router.push(`/study/${materialId}`);
                }
              }}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-policeGreen/20 text-policeGreen font-semibold border border-policeGreen/30 hover:bg-policeGreen/30 transition"
            >
              Next Level <ArrowRight size={16} />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

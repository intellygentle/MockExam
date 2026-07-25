"use client";

import { useState, useEffect, use } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen, ArrowLeft, Layers, BrainCircuit, FileText,
  ChevronRight, Loader2, CheckCircle, Clock, Lock,
  Play, Trophy, Zap, GraduationCap, Sparkles,
  BarChart3, Circle, Check, RotateCcw
} from "lucide-react";

type MaterialLevel = {
  id: number;
  material_id: number;
  title: string;
  description: string;
  level_number: number;
  cards: MaterialCard[];
  cardCount: number;
  questionCount: number;
};

type MaterialCard = {
  id: number;
  level_id: number;
  front: string;
  back: string;
  card_number: number;
};

type StudyMaterial = {
  id: number;
  subject_id: number;
  title: string;
  description: string;
  level: string;
  created_at: string;
  levels: MaterialLevel[];
};

type StudentProgress = {
  level_id: number;
  completed: boolean;
  cards_studied: number;
};

export default function MaterialDetailPage({
  params,
}: {
  params: Promise<{ materialId: string }>;
}) {
  const { materialId } = use(params);
  const router = useRouter();
  const [material, setMaterial] = useState<StudyMaterial | null>(null);
  const [subjectName, setSubjectName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<Map<number, StudentProgress>>(new Map());
  const [studentName, setStudentName] = useState<string | null>(null);
  const [testAttempts, setTestAttempts] = useState<any[]>([]);

  useEffect(() => {
    const name = localStorage.getItem("scholars-arena-name");
    setStudentName(name);
    loadMaterial();
  }, [materialId]);

  const loadMaterial = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/study/materials/${materialId}`);
      if (!res.ok) throw new Error("Material not found");

      const data: StudyMaterial = await res.json();
      setMaterial(data);

      // Get subject name
      const supabaseModule = await import("@/lib/supabaseClient");
      const supabase = await supabaseModule.getSupabase();
      const { data: subjData } = await supabase
        .from("subjects")
        .select("name")
        .eq("id", data.subject_id)
        .single();
      if (subjData) setSubjectName(subjData.name);

      // Load progress if student is logged in
      const name = localStorage.getItem("scholars-arena-name");
      if (name) {
        const { data: progData } = await supabase
          .from("student_material_progress")
          .select("*")
          .eq("student_name", name)
          .eq("material_id", parseInt(materialId));

        if (progData) {
          const map = new Map<number, StudentProgress>();
          for (const p of progData) {
            map.set(p.level_id, p);
          }
          setProgress(map);
        }

        // Load test attempts
        const { data: attempts } = await supabase
          .from("student_test_attempts")
          .select("*")
          .eq("student_name", name)
          .eq("material_id", parseInt(materialId))
          .order("completed_at", { ascending: false })
          .limit(10);

        if (attempts) setTestAttempts(attempts);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load material");
    } finally {
      setLoading(false);
    }
  };

  const isLevelCompleted = (levelId: number) => {
    return progress.get(levelId)?.completed || false;
  };

  const getCardsStudied = (levelId: number) => {
    return progress.get(levelId)?.cards_studied || 0;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 size={32} className="text-policeGold animate-spin" />
        <p className="text-white/50 text-sm uppercase tracking-widest">Loading study material...</p>
      </div>
    );
  }

  if (error || !material) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20 space-y-4">
        <BookOpen size={48} className="text-white/20 mx-auto" />
        <h2 className="text-2xl font-bold text-white">Material Not Found</h2>
        <p className="text-white/60">{error || "This study material doesn't exist."}</p>
        <button
          onClick={() => router.push("/study")}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-policeGold text-policeBlue font-bold text-sm hover:brightness-110 transition"
        >
          <ArrowLeft size={16} /> Back to Study Hub
        </button>
      </div>
    );
  }

  const totalLevels = material.levels.length;
  const completedLevels = material.levels.filter((l) =>
    isLevelCompleted(l.id)
  ).length;
  const progressPercent =
    totalLevels > 0 ? Math.round((completedLevels / totalLevels) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* ─── BACK BUTTON ─── */}
      <button
        onClick={() => router.push("/study")}
        className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition group"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
        All Subjects
      </button>

      {/* ─── HEADER ─── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-policeGold/20 to-amber-600/20 p-3 rounded-xl border border-policeGold/20">
            <GraduationCap size={28} className="text-policeGold" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-widest bg-policeGold/10 text-policeGold px-2 py-0.5 rounded-full font-semibold">
                {subjectName || `Subject #${material.subject_id}`}
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-heading font-bold text-white mt-2">
              {material.title}
            </h1>
          </div>
        </div>

        {material.description && (
          <p className="text-white/60 max-w-2xl">{material.description}</p>
        )}

        {/* Progress bar */}
        <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm">
              <BarChart3 size={16} className="text-policeGold" />
              <span className="text-white/70 font-medium">Your Progress</span>
            </div>
            <span className="text-sm font-bold text-policeGold">
              {completedLevels}/{totalLevels} levels
            </span>
          </div>
          <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className={`h-full rounded-full ${
                progressPercent === 100
                  ? "bg-policeGreen"
                  : "bg-gradient-to-r from-policeGold to-amber-400"
              }`}
            />
          </div>
          {progressPercent === 100 && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 mt-3 text-policeGreen text-sm font-semibold"
            >
              <Trophy size={16} />
              All levels completed! Great work!
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* ─── LEVELS LIST ─── */}
      <div className="space-y-4">
        <h2 className="text-xl font-heading font-bold text-white flex items-center gap-2">
          <Layers size={20} className="text-policeGold" />
          Study Levels
        </h2>

        {material.levels.map((level, idx) => {
          const completed = isLevelCompleted(level.id);
          const cardsStudied = getCardsStudied(level.id);
          const isFirstIncomplete =
            !completed &&
            (idx === 0 || material.levels.slice(0, idx).every((l) => isLevelCompleted(l.id)));

          return (
            <motion.div
              key={level.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
              className={`rounded-2xl border p-5 transition-all ${
                completed
                  ? "bg-policeGreen/5 border-policeGreen/20"
                  : isFirstIncomplete
                  ? "bg-policeGold/5 border-policeGold/30 shadow-[0_0_20px_rgba(255,215,0,0.07)]"
                  : "bg-white/5 border-white/10 hover:border-white/20"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 min-w-0">
                  {/* Status indicator */}
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      completed
                        ? "bg-policeGreen/20 text-policeGreen"
                        : "bg-white/10 text-white/40"
                    }`}
                  >
                    {completed ? (
                      <CheckCircle size={22} />
                    ) : (
                      <span className="font-bold text-sm">{level.level_number}</span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <h3 className="font-bold text-white text-lg">{level.title}</h3>
                    {level.description && (
                      <p className="text-sm text-white/50 mt-1 line-clamp-2">
                        {level.description}
                      </p>
                    )}

                    {/* Stats */}
                    <div className="flex items-center gap-4 mt-3">
                      <span className="flex items-center gap-1.5 text-xs text-white/50">
                        <FileText size={12} />
                        {level.cardCount} card{level.cardCount !== 1 ? "s" : ""}
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-white/50">
                        <BrainCircuit size={12} />
                        {level.questionCount} question
                        {level.questionCount !== 1 ? "s" : ""}
                      </span>
                      {completed && (
                        <span className="flex items-center gap-1 text-xs text-policeGreen font-semibold">
                          <Check size={12} />
                          Completed
                        </span>
                      )}
                      {cardsStudied > 0 && !completed && (
                        <span className="flex items-center gap-1 text-xs text-policeGold font-semibold">
                          <Clock size={12} />
                          {cardsStudied}/{level.cardCount} studied
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Study button */}
                  <Link
                    href={`/study/${materialId}/${level.id}`}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
                      completed
                        ? "bg-policeGreen/20 text-policeGreen hover:bg-policeGreen/30 border border-policeGreen/30"
                        : "bg-policeGold text-policeBlue hover:brightness-110"
                    }`}
                  >
                    {completed ? (
                      <>
                        <RotateCcw size={14} /> Review
                      </>
                    ) : (
                      <>
                        <Play size={14} /> Study
                      </>
                    )}
                  </Link>
                </div>
              </div>

              {/* Quiz section (show if level has questions and is completed OR is first incomplete) */}
              {level.questionCount > 0 && completed && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/50 flex items-center gap-1">
                      <Zap size={12} className="text-blue-400" />
                      Quiz available — {level.questionCount} questions
                    </span>
                    <Link
                      href={`/study/${materialId}/${level.id}/quiz`}
                      className="flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 transition"
                    >
                      Take Quiz <ChevronRight size={14} />
                    </Link>
                  </div>
                </div>
              )}
              {level.questionCount > 0 && !completed && isFirstIncomplete && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/50 flex items-center gap-1">
                      <Lock size={12} />
                      Complete the cards above to unlock the quiz
                    </span>
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* ─── TEST ATTEMPTS HISTORY ─── */}
      {testAttempts.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-heading font-bold text-white mb-4 flex items-center gap-2">
            <Trophy size={18} className="text-policeGold" />
            Recent Quiz Results
          </h3>
          <div className="space-y-2">
            {testAttempts.map((attempt) => {
              const pct = Math.round(
                (attempt.score / attempt.total_questions) * 100
              );
              return (
                <div
                  key={attempt.id}
                  className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3 border border-white/10"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                        attempt.passed
                          ? "bg-policeGreen/20 text-policeGreen"
                          : "bg-policeRed/10 text-policeRed"
                      }`}
                    >
                      {attempt.passed ? "P" : "F"}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {attempt.score}/{attempt.total_questions}
                      </p>
                      <p className="text-[10px] text-white/40">
                        {attempt.level_ids.length} level
                        {attempt.level_ids.length > 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`font-bold font-mono text-sm ${
                      attempt.passed ? "text-policeGreen" : "text-policeRed"
                    }`}
                  >
                    {pct}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── NO QUESTIONS YET ─── */}
      {material.levels.every((l) => l.questionCount === 0) && (
        <div className="text-center py-8 text-white/40 text-sm">
          <BrainCircuit size={24} className="mx-auto mb-2 opacity-50" />
          Questions are being prepared for this material.
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  BookOpen, GraduationCap, Layers, User,
  ChevronRight, Loader2, BrainCircuit, ArrowRight,
  Sparkles, Library, FileText, Zap, RefreshCw,
  CheckCircle, Target, Trophy, ArrowLeft, Star,
  BookMarked, Swords
} from "lucide-react";
import QuestionCard from "@/components/QuestionCard";
import type { OptionKey, OptionsRecord } from "@/lib/questions";
import confetti from "canvas-confetti";

type SubjectWithMaterials = {
  id: number;
  name: string;
  department_id: number | null;
  level: string;
  materials: (StudyMaterial & {
    levelCount: number;
    totalCards: number;
    totalQuestions: number;
  })[];
  materialCount: number;
};

type StudyMaterial = {
  id: number;
  subject_id: number;
  title: string;
  description: string;
  level: string;
  created_at: string;
};

type PracticeQuestion = {
  id: number;
  category: string;
  question: string;
  options: OptionsRecord;
  correct: OptionKey;
  explanation: string;
  passage?: string;
  instruction?: string;
};

export default function StudyPage() {
  const [subjects, setSubjects] = useState<SubjectWithMaterials[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);

  // Practice mode state
  const [mode, setMode] = useState<"study" | "practice">("study");
  const [practicePhase, setPracticePhase] = useState<"select" | "playing" | "results">("select");
  const [practiceSubject, setPracticeSubject] = useState<{ ids: number[]; name: string } | null>(null);
  const [practiceQuestions, setPracticeQuestions] = useState<PracticeQuestion[]>([]);
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [practiceCorrect, setPracticeCorrect] = useState(0);
  const [practiceLoading, setPracticeLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const subjectsRes = await fetch("/api/study/subjects");
      if (!subjectsRes.ok) throw new Error("Failed to load study materials");

      const result: SubjectWithMaterials[] = await subjectsRes.json();
      setSubjects(result);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // Get student name for greeting
  const studentName =
    typeof window !== "undefined"
      ? localStorage.getItem("scholars-arena-name")
      : null;

  // Get only subjects that have at least 1 material
  const subjectsWithMaterials = subjects.filter(
    (s) => s.materialCount > 0
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* ─── HEADER ─── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <div className="inline-flex p-4 bg-gradient-to-br from-policeGold/20 to-amber-600/20 rounded-full border border-policeGold/20">
          <GraduationCap size={40} className="text-policeGold" />
        </div>
        <div>
          <h1 className="text-4xl sm:text-5xl font-heading font-bold text-white tracking-tight">
            {mode === "study" ? "Study Hub" : "Practice Hub"}
          </h1>
          <p className="text-white/50 mt-3 text-lg max-w-xl mx-auto">
            {mode === "study"
              ? "Master your subjects with structured study materials, keypoint cards, and targeted practice quizzes."
              : "Practice A-Level questions directly. Pick a subject and start testing your knowledge!"}
          </p>
        </div>

        {/* Mode Tabs */}
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setMode("study")}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold transition-all ${
              mode === "study"
                ? "bg-policeGold text-policeBlue shadow-lg shadow-policeGold/20"
                : "bg-white/10 text-white/60 hover:text-white border border-white/10"
            }`}
          >
            <BookMarked size={16} /> Study
          </button>
          <button
            onClick={() => { setMode("practice"); setPracticePhase("select"); }}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold transition-all ${
              mode === "practice"
                ? "bg-policeGold text-policeBlue shadow-lg shadow-policeGold/20"
                : "bg-white/10 text-white/60 hover:text-white border border-white/10"
            }`}
          >
            <Swords size={16} /> Practice
          </button>
        </div>
        {studentName && (
          <div className="flex items-center justify-center gap-2 text-sm text-white/60">
            <Sparkles size={14} className="text-policeGold" />
            <span>Welcome back, <strong className="text-white">{studentName}</strong></span>
          </div>
        )}
        {!studentName && (
          <Link
            href="/practice"
            className="inline-flex items-center gap-2 text-sm bg-policeGold/10 text-policeGold px-4 py-2 rounded-full border border-policeGold/20 hover:bg-policeGold/20 transition"
          >
            <User size={14} /> Set your name first
          </Link>
        )}
      </motion.div>

      {/* ─── PRACTICE MODE: SUBJECT SELECTION ─── */}
      {mode === "practice" && practicePhase === "select" && (
        <PracticeSubjectSelect
          onStart={async (subject) => {
            setPracticeSubject(subject);
            setPracticeLoading(true);
            try {
              const { getSupabase } = await import("@/lib/supabaseClient");
              const supabase = await getSupabase();
              // Only load questions linked to study materials (not regular SS3 exam questions)
              const { data: linkedQs } = await supabase
                .from("material_level_questions")
                .select("question_id");
              const studyQIds = (linkedQs || []).map(lq => lq.question_id);

              const { data: qData } = await supabase
                .from("questions")
                .select("*")
                .in("id", studyQIds.length > 0 ? studyQIds : [-1])
                .in("subject_id", subject.ids)
                .order("year", { ascending: false });

              if (qData && qData.length > 0) {
                const mapped = qData.map((q) => {
                  const opts: OptionsRecord = { a: q.option_a, b: q.option_b, c: q.option_c, d: q.option_d };
                  if (q.option_e && q.option_e.trim()) opts.e = q.option_e;
                  return {
                    id: q.id,
                    category: q.category,
                    question: q.question,
                    options: opts,
                    correct: q.correct_option,
                    explanation: q.explanation,
                    passage: q.passage || undefined,
                    instruction: q.instruction || undefined,
                  };
                }).sort(() => Math.random() - 0.5);
                setPracticeQuestions(mapped);
                setPracticeIndex(0);
                setPracticeCorrect(0);
                setPracticePhase("playing");
              } else {
                alert("No questions available for this subject yet.");
              }
            } catch { alert("Failed to load questions."); }
            finally { setPracticeLoading(false); }
          }}
          loading={practiceLoading}
        />
      )}

      {/* ─── PRACTICE MODE: QUIZ PLAYING ─── */}
      {mode === "practice" && practicePhase === "playing" && practiceQuestions.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setPracticePhase("select")}
              className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition group"
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
              {practiceSubject?.name || "All Subjects"}
            </button>
            <div className="flex items-center gap-3">
              <span className="text-xs text-white/50 bg-white/10 px-2 py-1 rounded-full">
                Question {practiceIndex + 1} of {practiceQuestions.length}
              </span>
              <span className="text-xs text-policeGold font-semibold bg-policeGold/10 px-2 py-1 rounded-full">
                {practiceCorrect} correct
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-policeGold rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${((practiceIndex + 1) / practiceQuestions.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          <QuestionCard
            key={practiceQuestions[practiceIndex].id}
            question={practiceQuestions[practiceIndex]}
            stickers={[]}
            onAnswer={(correct) => {
              if (correct) setPracticeCorrect(prev => prev + 1);
            }}
            onNext={() => {
              if (practiceIndex < practiceQuestions.length - 1) {
                setPracticeIndex(prev => prev + 1);
              } else {
                setPracticePhase("results");
              }
            }}
          />
        </div>
      )}

      {/* ─── PRACTICE MODE: RESULTS ─── */}
      {mode === "practice" && practicePhase === "results" && (
        <PracticeResults
          correct={practiceCorrect}
          total={practiceQuestions.length}
          subjectName={practiceSubject?.name || ""}
          onRetry={() => {
            setPracticeQuestions(prev => [...prev].sort(() => Math.random() - 0.5));
            setPracticeIndex(0);
            setPracticeCorrect(0);
            setPracticePhase("playing");
          }}
          onChangeSubject={() => {
            setPracticeSubject(null);
            setPracticePhase("select");
          }}
        />
      )}

      {/* ─── ERROR STATE ─── */}
      {error && mode === "study" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="card text-center py-12 border border-policeRed/30 bg-policeRed/5"
        >
          <Library size={48} className="text-policeRed/40 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Couldn't Load Study Materials</h2>
          <p className="text-white/60 mb-4">{error}</p>
          <button
            onClick={loadData}
            className="px-6 py-3 rounded-xl bg-policeGold text-policeBlue font-bold text-sm hover:brightness-110 transition"
          >
            Try Again
          </button>
        </motion.div>
      )}

      {/* ─── LOADING ─── */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 size={32} className="text-policeGold animate-spin" />
          <p className="text-white/50 text-sm uppercase tracking-widest">
            Loading study materials...
          </p>
        </div>
      )}

      {/* ─── EMPTY STATE ─── */}
      {!loading && !error && subjectsWithMaterials.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card text-center py-16 space-y-6"
        >
          <Library size={64} className="text-white/20 mx-auto" />
          <div>
            <h2 className="text-2xl font-heading font-bold text-white mb-2">
              No Study Materials Yet
            </h2>
            <p className="text-white/60 max-w-md mx-auto">
              Study materials are being prepared. Check back soon for structured
              guides, keypoint cards, and practice questions.
            </p>
          </div>
        </motion.div>
      )}

      {/* ─── SUBJECTS GRID ─── */}
      {!loading && !error && subjectsWithMaterials.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {subjectsWithMaterials.map((subject, idx) => (
              <motion.div
                key={subject.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Link
                  href={`/study?subject=${subject.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    setSelectedSubjectId(
                      selectedSubjectId === subject.id ? null : subject.id
                    );
                  }}
                  className="group block card hover:border-policeGold/50 hover:bg-white/[0.07] transition-all active:scale-[0.98]"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-policeGold/20 to-amber-600/20 flex items-center justify-center text-policeGold font-bold text-lg group-hover:scale-110 transition-transform">
                        {subject.name[0]}
                      </div>
                      <div>
                        <h3 className="font-bold text-white group-hover:text-policeGold transition-colors">
                          {subject.name}
                        </h3>
                      </div>
                    </div>
                    <ChevronRight
                      size={18}
                      className={`text-white/30 transition-all ${
                        selectedSubjectId === subject.id
                          ? "rotate-90 text-policeGold"
                          : "group-hover:text-policeGold group-hover:translate-x-1"
                      }`}
                    />
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div className="bg-white/5 rounded-xl p-3 text-center">
                      <Layers size={16} className="text-policeGold mx-auto mb-1" />
                      <p className="text-lg font-bold text-white">
                        {subject.materials.reduce(
                          (sum, m) => sum + m.levelCount,
                          0
                        )}
                      </p>
                      <p className="text-[9px] uppercase tracking-widest text-white/40">
                        Levels
                      </p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3 text-center">
                      <FileText size={16} className="text-policeGreen mx-auto mb-1" />
                      <p className="text-lg font-bold text-white">
                        {subject.materials.reduce(
                          (sum, m) => sum + m.totalCards,
                          0
                        )}
                      </p>
                      <p className="text-[9px] uppercase tracking-widest text-white/40">
                        Cards
                      </p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3 text-center">
                      <BrainCircuit size={16} className="text-blue-400 mx-auto mb-1" />
                      <p className="text-lg font-bold text-white">
                        {subject.materials.reduce(
                          (sum, m) => sum + m.totalQuestions,
                          0
                        )}
                      </p>
                      <p className="text-[9px] uppercase tracking-widest text-white/40">
                        Questions
                      </p>
                    </div>
                  </div>

                  {/* Material list (collapsible) */}
                  {selectedSubjectId === subject.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="space-y-2 pt-3 border-t border-white/10 mt-3"
                    >
                      {subject.materials.map((mat) => (
                        <Link
                          key={mat.id}
                          href={`/study/${mat.id}`}
                          className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-policeGold/10 border border-white/10 hover:border-policeGold/30 transition group/material"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <BookOpen
                              size={16}
                              className="text-policeGold shrink-0"
                            />
                            <span className="text-sm font-medium text-white truncate group-hover/material:text-policeGold transition-colors">
                              {mat.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] text-white/40 bg-white/10 px-2 py-0.5 rounded-full">
                              {mat.levelCount} levels
                            </span>
                            <ArrowRight
                              size={14}
                              className="text-white/30 group-hover/material:text-policeGold group-hover/material:translate-x-0.5 transition-all"
                            />
                          </div>
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </Link>
              </motion.div>
            ))}
          </div>
      )}

      {/* ─── FOOTER ─── */}
      {!loading && !error && subjectsWithMaterials.length > 0 && (
        <div className="text-center pt-8">
          <p className="text-xs text-white/30 uppercase tracking-[0.3em]">              {subjectsWithMaterials.length} subject
            {subjectsWithMaterials.length !== 1 ? "s" : ""} with study materials
          </p>
        </div>
      )}
    </div>
  );
}

// ─── PRACTICE RESULTS COMPONENT ───
function PracticeResults({ correct, total, subjectName, onRetry, onChangeSubject }: {
  correct: number;
  total: number;
  subjectName: string;
  onRetry: () => void;
  onChangeSubject: () => void;
}) {
  const percentage = Math.round((correct / Math.max(total, 1)) * 100);
  const passed = percentage >= 60;

  useEffect(() => {
    if (percentage >= 70) {
      confetti({
        particleCount: 150,
        spread: 120,
        origin: { y: 0.6 },
        colors: ["#FFD700", "#ffffff", "#28a745"],
      });
    }
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-2xl mx-auto text-center space-y-6"
    >
      <div className={`inline-flex p-6 rounded-full border-2 mb-4 ${
        passed ? "bg-policeGreen/20 border-policeGreen/30" : "bg-orange-500/10 border-orange-500/20"
      }`}>
        {passed
          ? <Trophy size={64} className="text-policeGreen" />
          : <Target size={64} className="text-orange-400" />
        }
      </div>
      <h2 className="text-3xl font-heading font-bold text-white">
        {passed ? "Well Done! 🎉" : "Keep Practicing! 💪"}
      </h2>
      <p className="text-white/60">{subjectName} • {total} questions</p>

      <div className="grid grid-cols-3 gap-4 max-w-xs mx-auto">
        <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
          <p className="text-2xl font-bold text-white">{correct}</p>
          <p className="text-[10px] uppercase tracking-widest text-white/50">Correct</p>
        </div>
        <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
          <p className="text-2xl font-bold text-white">{total - correct}</p>
          <p className="text-[10px] uppercase tracking-widest text-white/50">Wrong</p>
        </div>
        <div className={`rounded-2xl p-4 border ${passed ? "bg-policeGreen/10 border-policeGreen/30" : "bg-orange-500/10 border-orange-500/20"}`}>
          <p className={`text-2xl font-bold ${passed ? "text-policeGreen" : "text-orange-400"}`}>{percentage}%</p>
          <p className="text-[10px] uppercase tracking-widest text-white/50">Score</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
        <button onClick={onRetry}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-policeGold text-policeBlue font-bold hover:brightness-110 transition"
        >
          <RefreshCw size={16} /> Try Again
        </button>
        <button onClick={onChangeSubject}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 text-white font-semibold border border-white/10 hover:bg-white/20 transition"
        >
          <BookOpen size={16} /> Different Subject
        </button>
      </div>
    </motion.div>
  );
}

// ─── PRACTICE SUBJECT SELECT COMPONENT ───
function PracticeSubjectSelect({
  onStart,
  loading,
}: {
  onStart: (subject: { ids: number[]; name: string }) => void;
  loading: boolean;
}) {
  const [subjects, setSubjects] = useState<{ ids: number[]; name: string; count: number }[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { getSupabase } = await import("@/lib/supabaseClient");
        const supabase = await getSupabase();

        // Get ALL subjects (study deck subjects may not have level="ss3")
        const { data: allSubjects } = await supabase
          .from("subjects")
          .select("id, name");

        // Only count questions linked to study materials (via material_level_questions)
        const { data: linkedQuestions } = await supabase
          .from("material_level_questions")
          .select("question_id");
        const studyQuestionIds = (linkedQuestions || []).map(lq => lq.question_id);

        const { data: questions } = await supabase
          .from("questions")
          .select("subject_id")
          .in("id", studyQuestionIds.length > 0 ? studyQuestionIds : [-1]);

        // Count questions per subject
        const counts = new Map<number, number>();
        for (const q of questions || []) {
          if (q.subject_id) {
            counts.set(q.subject_id, (counts.get(q.subject_id) || 0) + 1);
          }
        }

        // Group all subject IDs by name (handles duplicate entries for different departments)
        const nameMap = new Map<string, { ids: Set<number>; name: string; count: number }>();
        for (const subj of allSubjects || []) {
          const key = subj.name.toLowerCase();
          const count = counts.get(subj.id) || 0;
          if (count > 0) {
            if (!nameMap.has(key)) {
              nameMap.set(key, { ids: new Set(), name: subj.name, count: 0 });
            }
            const entry = nameMap.get(key)!;
            entry.ids.add(subj.id);
            entry.count += count;
          }
        }

        const result: { ids: number[]; name: string; count: number }[] = [];
        for (const [, entry] of nameMap) {
          result.push({ ids: Array.from(entry.ids), name: entry.name, count: entry.count });
        }

        setSubjects(result.sort((a, b) => a.name.localeCompare(b.name)));
      } catch {}
      finally { setLoadingSubjects(false); }
    })();
  }, []);

  if (loadingSubjects) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <Loader2 size={32} className="text-policeGold animate-spin" />
        <p className="text-white/50 text-sm uppercase tracking-widest">Loading subjects...</p>
      </div>
    );
  }

  if (subjects.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="card text-center py-16 space-y-4"
      >
        <Library size={48} className="text-white/20 mx-auto" />
        <h2 className="text-xl font-heading font-bold text-white">No Practice Questions Yet</h2>
        <p className="text-white/60 max-w-md mx-auto">Questions for practice are being prepared. Check back soon!</p>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="flex items-center justify-center gap-2 text-sm text-white/50">
        <Star size={14} className="text-policeGold" />
        <span>Pick a subject to start practicing A-Level questions</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {subjects.map((subj) => (
          <button
            key={subj.ids[0] || subj.name}
            onClick={() => onStart(subj)}
            disabled={loading}
            className="p-4 rounded-xl border border-white/10 bg-white/5 hover:border-policeGold hover:bg-policeGold/5 transition-all text-center group disabled:opacity-50"
          >
            <div className="w-10 h-10 rounded-full bg-policeGold/20 flex items-center justify-center text-policeGold font-bold mx-auto mb-2 group-hover:scale-110 transition-transform">
              {subj.name[0]}
            </div>
            <p className="text-sm font-semibold text-white group-hover:text-policeGold transition-colors">{subj.name}</p>
            <p className="text-[10px] text-white/40 mt-1">{subj.count} question{subj.count !== 1 ? 's' : ''}</p>
          </button>
        ))}
      </div>
    </motion.div>
  );
}

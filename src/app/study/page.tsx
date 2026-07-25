"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  BookOpen, GraduationCap, Layers, User,
  ChevronRight, Loader2, BrainCircuit, ArrowRight,
  Sparkles, Library, FileText
} from "lucide-react";

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

type Department = { id: number; name: string; level: string };

export default function StudyPage() {
  const [subjects, setSubjects] = useState<SubjectWithMaterials[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDept, setSelectedDept] = useState<number | "all">("all");
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);

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

      // Fetch departments for filter
      try {
        const { getSupabase } = await import("@/lib/supabaseClient");
        const supabase = await getSupabase();
        const { data: deptData } = await supabase
          .from("departments")
          .select("*")
          .eq("level", "ss3")
          .order("name");
        if (deptData) setDepartments(deptData);
      } catch {}
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

  // Filter subjects by department
  const filteredSubjects =
    selectedDept === "all"
      ? subjects
      : subjects.filter((s) => {
          // Check if subject belongs to this department
          // Subjects with department_id = selectedDept
          return s.department_id === selectedDept;
        });

  // Get only subjects that have at least 1 material
  const subjectsWithMaterials = filteredSubjects.filter(
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
            Study Hub
          </h1>
          <p className="text-white/50 mt-3 text-lg max-w-xl mx-auto">
            Master your subjects with structured study materials, keypoint cards,
            and targeted practice quizzes.
          </p>
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

      {/* ─── ERROR STATE ─── */}
      {error && (
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

      {/* ─── DEPARTMENT FILTER ─── */}
      {!loading && !error && subjectsWithMaterials.length > 0 && (
        <>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap items-center gap-2 justify-center"
          >
            <button
              onClick={() => setSelectedDept("all")}
              className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-widest transition ${
                selectedDept === "all"
                  ? "bg-policeGold text-policeBlue"
                  : "bg-white/10 text-white/60 hover:text-white border border-white/10"
              }`}
            >
              All Departments
            </button>
            {departments.map((dept) => (
              <button
                key={dept.id}
                onClick={() => setSelectedDept(dept.id)}
                className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-widest transition ${
                  selectedDept === dept.id
                    ? "bg-policeGold text-policeBlue"
                    : "bg-white/10 text-white/60 hover:text-white border border-white/10"
                }`}
              >
                {dept.name}
              </button>
            ))}
          </motion.div>

          {/* ─── SUBJECTS GRID ─── */}
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
        </>
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

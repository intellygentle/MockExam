"use client";

import { useState, useEffect, useCallback } from "react";
import { getSupabase } from "@/lib/supabaseClient";
import QuestionCard from "@/components/QuestionCard";
import BadgeChip from "@/components/BadgeChip";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Zap, Crown, Flame, Trophy, Target, RefreshCw, Award, 
  TrendingUp, GraduationCap, BookOpen, User, ArrowRight, 
  Layers, CalendarDays, CheckCircle, BarChart3, 
  BrainCircuit, Star, ChevronLeft, Shield,
  RotateCcw, Circle, AlertTriangle, XCircle,
  Lightbulb, Loader2 as Spinner, Check, X, AlertCircle,
  BookMarked, Swords
} from "lucide-react";
import type { OptionKey, OptionsRecord } from "@/lib/questions";
import toast from "react-hot-toast";
import confetti from "canvas-confetti";

export type Sticker = { id: number; url: string; active: boolean };

type Subject = { id: number; name: string; department_id: number | null; level: string };
type Department = { id: number; name: string; level: string };

type Question = {
  id: number; category: string; level: string; year: number;
  question: string; options: OptionsRecord;
  correct: OptionKey; explanation: string;
  passage?: string;
};

type QuizPhase = "setup" | "playing" | "results";

type YearCompletionStatus = {
  status: 'completed' | 'in_progress' | 'not_started';
  total: number;
  answered: number;
  correct: number;
};

type NameStatus = "idle" | "checking" | "exists" | "available";

export default function PracticePage() {
  const [phase, setPhase] = useState<QuizPhase>("setup");
  const [setupStep, setSetupStep] = useState<"name" | "subjects" | "years">("name");

  // Data
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [totalQuestionsAvailable, setTotalQuestionsAvailable] = useState(0);

  // Name state
  const [studentName, setStudentName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [savedName, setSavedName] = useState("");
  const [savedSchool, setSavedSchool] = useState("");
  const [nameStatus, setNameStatus] = useState<NameStatus>("idle");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [existingDisplayName, setExistingDisplayName] = useState<string | null>(null);

  const [selectedLevel, setSelectedLevel] = useState<"jss3" | "ss3" | null>(null);
  const [selectedDept, setSelectedDept] = useState<number | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | "all">("all");

  // Quiz state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [state, setState] = useState({ 
    index: 0, points: 0, streak: 0, correctAnswers: 0,
    answeredQuestions: new Set<number>() 
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Year completion tracking
  const [completionStats, setCompletionStats] = useState<Record<number, YearCompletionStatus>>({});

  // Practiced subjects tracking (for "New" badge)
  const [practicedSubjectIds, setPracticedSubjectIds] = useState<Set<number>>(new Set());

  const router = useRouter();

  // Missed questions review
  const [reviewMode, setReviewMode] = useState(false);
  const [sessionWrongIds, setSessionWrongIds] = useState<Set<number>>(new Set());
  const [missedQuestionsCount, setMissedQuestionsCount] = useState(0);

  // Load saved name & data on mount
  // Load practiced subjects for a student
  const loadPracticedSubjects = useCallback(async (name: string) => {
    if (!name.trim()) { setPracticedSubjectIds(new Set()); return; }
    try {
      const supabase = await getSupabase();
      const { data } = await supabase
        .from("question_answers")
        .select("subject_id")
        .eq("student_name", name.trim());
      if (data) {
        const ids = new Set(data.map(a => a.subject_id).filter(Boolean));
        setPracticedSubjectIds(ids);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("scholars-arena-name");
    const savedSchool = localStorage.getItem("scholars-arena-school");
    if (saved) { setStudentName(saved); setSavedName(saved); loadPracticedSubjects(saved); }
    if (savedSchool) { setSchoolName(savedSchool); setSavedSchool(savedSchool); }
    loadData();
  }, [loadPracticedSubjects]);

  const loadData = async () => {
    try {
      const supabase = await getSupabase();
      const [deptRes, subjRes] = await Promise.all([
        supabase.from("departments").select("*").order("name"),
        supabase.from("subjects").select("*").order("name"),
      ]);
      setDepartments(deptRes.data || []);
      setSubjects(subjRes.data || []);
    } catch {}
  };

  // Load years for selected subject
  const loadYearsForSubject = useCallback(async (subjectId: number) => {
    try {
      const supabase = await getSupabase();
      const { data } = await supabase
        .from("questions")
        .select("year")
        .eq("subject_id", subjectId)
        .order("year", { ascending: false });

      if (data) {
        const years = [...new Set(data.map(q => q.year))] as number[];
        setAvailableYears(years);
      }
      
      const { count } = await supabase
        .from("questions")
        .select("*", { count: "exact", head: true })
        .eq("subject_id", subjectId);
      setTotalQuestionsAvailable(count || 0);
    } catch {}
  }, []);

  // Load completion stats per year for the student
  const loadCompletionStats = useCallback(async (name: string, subjectId: number) => {
    if (!name.trim()) return;
    try {
      const supabase = await getSupabase();
      const [answersRes, questionsRes] = await Promise.all([
        supabase
          .from("question_answers")
          .select("question_id, correct, year")
          .eq("student_name", name.trim())
          .eq("subject_id", subjectId)
          .order("created_at", { ascending: true }),
        supabase
          .from("questions")
          .select("id, year")
          .eq("subject_id", subjectId),
      ]);

      const allQuestions = questionsRes.data || [];
      const answers = answersRes.data || [];

      const yearMap = new Map<number, { total: number; answered: Set<number>; correct: number }>();

      for (const q of allQuestions) {
        if (!yearMap.has(q.year)) yearMap.set(q.year, { total: 0, answered: new Set(), correct: 0 });
        yearMap.get(q.year)!.total++;
      }

      const latestAnswerPerQuestion = new Map<number, { correct: boolean; year: number }>();
      for (const a of answers) {
        latestAnswerPerQuestion.set(a.question_id, { correct: a.correct, year: a.year });
      }

      for (const [qId, ans] of latestAnswerPerQuestion) {
        const stat = yearMap.get(ans.year);
        if (stat) { stat.answered.add(qId); if (ans.correct) stat.correct++; }
      }

      const stats: Record<number, YearCompletionStatus> = {};
      for (const [year, stat] of yearMap) {
        const answeredCount = stat.answered.size;
        let status: 'completed' | 'in_progress' | 'not_started' = 'not_started';
        if (answeredCount > 0 && answeredCount >= stat.total) status = 'completed';
        else if (answeredCount > 0) status = 'in_progress';
        stats[year] = { status, total: stat.total, answered: answeredCount, correct: stat.correct };
      }
      setCompletionStats(stats);

      let wrongCount = 0;
      for (const [, ans] of latestAnswerPerQuestion) { if (!ans.correct) wrongCount++; }
      setMissedQuestionsCount(wrongCount);
    } catch {}
  }, []);

  // ─── NAME CHECKING ────────────────────────────────
  const checkNameAvailability = async () => {
    const name = studentName.trim();
    if (!name || name.length < 2) { setNameStatus("idle"); setSuggestions([]); return; }
    setNameStatus("checking");
    try {
      const res = await fetch("/api/auth/check-name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.exists) {
        setNameStatus("exists");
        setExistingDisplayName(data.displayName);
        setSuggestions(data.suggestions);
      } else {
        setNameStatus("available");
        setExistingDisplayName(null);
        setSuggestions(data.suggestions);
      }
    } catch {
      setNameStatus("idle");
      setSuggestions([]);
    }
  };

  const proceedToLevelSelect = () => {
    const name = studentName.trim();
    if (!name) { toast.error("Enter a nickname first."); return; }
    
    // Save to localStorage
    localStorage.setItem("scholars-arena-name", name);
    setSavedName(name);
    if (schoolName.trim()) {
      localStorage.setItem("scholars-arena-school", schoolName.trim());
      setSavedSchool(schoolName.trim());
    }
    
    loadPracticedSubjects(name);
    toast.success(`Ready, ${name}! Pick your level.`);
    setTimeout(() => {
      document.querySelector('.level-select-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 200);
  };

  const handleLevelSelect = (level: "jss3" | "ss3") => {
    setSelectedLevel(level);
    setSelectedDept(null);
    setSelectedSubject(null);
    if (level === "jss3") setSetupStep("subjects");
  };

  const handleDeptSelect = (deptId: number) => {
    setSelectedDept(deptId);
    setSelectedSubject(null);
    setSetupStep("subjects");
  };

  const handleSubjectSelect = (subject: Subject) => {
    setSelectedSubject(subject);
    setSelectedYear("all");
    setReviewMode(false);
    loadYearsForSubject(subject.id);
    loadCompletionStats(savedName || studentName, subject.id);
    setSetupStep("years");
  };

  const handleBackFromYears = () => {
    if (selectedLevel === "ss3" && selectedDept) setSetupStep("subjects");
    else setSetupStep("subjects");
    loadPracticedSubjects(savedName || studentName.trim());
  };

  const handleBackFromSubjects = () => {
    if (selectedLevel === "ss3") { setSelectedDept(null); setSetupStep("name"); }
    else setSetupStep("name");
  };

  // Save a single answer to the question_answers table
  const saveAnswer = async (questionId: number, subjectId: number, level: string, year: number, correct: boolean, selectedOption: string) => {
    const name = savedName || studentName.trim();
    if (!name) return;
    try {
      const supabase = await getSupabase();
      await supabase.from("question_answers").insert({
        student_name: name, question_id: questionId, subject_id: subjectId,
        level, year, correct, selected_option: selectedOption,
      });
    } catch {}
  };

  const handleStartQuiz = async () => {
    if (!selectedSubject) return;

    setLoading(true);
    setError(null);

    // Save name & school
    if (studentName.trim()) {
      localStorage.setItem("scholars-arena-name", studentName.trim());
      setSavedName(studentName.trim());
    }
    if (schoolName.trim()) {
      localStorage.setItem("scholars-arena-school", schoolName.trim());
      setSavedSchool(schoolName.trim());
    }

    setState({ index: 0, points: 0, streak: 0, correctAnswers: 0, answeredQuestions: new Set() });
    setSessionWrongIds(new Set());
    setReviewMode(false);

    try {
      const supabase = await getSupabase();
      let query = supabase.from("questions").select("*").eq("subject_id", selectedSubject.id);
      if (selectedYear !== "all") query = query.eq("year", selectedYear);

      const { data: qData, error: qError } = await query;
      const { data: sData } = await supabase.from("stickers").select("*").eq("active", true);
      if (sData) setStickers(sData);

      if (qError) throw qError;

      if (qData && qData.length > 0) {
        const mapped = qData.map((q) => {
          const opts: OptionsRecord = { a: q.option_a, b: q.option_b, c: q.option_c, d: q.option_d };
          if (q.option_e && q.option_e.trim()) opts.e = q.option_e;
          return {
            id: q.id, category: q.category, level: q.level, year: q.year,
            question: q.question, options: opts,
            correct: q.correct_option, explanation: q.explanation,
            passage: q.passage || undefined,
          };
        });
        setQuestions(mapped.sort(() => Math.random() - 0.5));
        setPhase("playing");
      } else {
        setError("No questions found for this selection.");
      }
    } catch {
      setError("Failed to load questions. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (correct: boolean, selectedOption?: string) => {
    const currentQ = questions[state.index];
    if (currentQ && selectedOption) {
      saveAnswer(currentQ.id, selectedSubject?.id || 0, selectedLevel || "jss3", currentQ.year, correct, selectedOption);
    }
    setState((prev) => {
      const newAnswered = new Set(prev.answeredQuestions);
      newAnswered.add(currentQ.id);
      return { ...prev, points: prev.points + (correct ? 10 : 0), streak: correct ? prev.streak + 1 : 0, correctAnswers: prev.correctAnswers + (correct ? 1 : 0), answeredQuestions: newAnswered };
    });
    if (!correct) setSessionWrongIds((prev) => { const next = new Set(prev); next.add(currentQ.id); return next; });
  };

  const saveProgress = async (finalState: typeof state) => {
    const totalQuestions = questions.length;
    const percentage = Math.round((finalState.correctAnswers / totalQuestions) * 100);
    const earnedBadges: string[] = [];
    if (finalState.points >= 10) earnedBadges.push("Rising Star");
    if (finalState.points >= 50) earnedBadges.push("Bookworm");
    if (finalState.streak >= 5) earnedBadges.push("Brain Box");
    if (percentage >= 60) earnedBadges.push("Quiz Master");
    if (percentage >= 90) earnedBadges.push("Top Performer");

    try {
      const supabase = await getSupabase();
      await supabase.from("progress").insert({
        student_name: savedName, school_name: savedSchool, level: selectedLevel,
        subject: selectedSubject?.name || "", year: selectedYear === "all" ? 0 : selectedYear,
        score: finalState.points, total_questions: totalQuestions, percentage,
        correct_answers: finalState.correctAnswers, best_streak: finalState.streak, badges: earnedBadges,
      });
    } catch { console.warn("Could not save progress."); }
  };

  const nextQuestion = () => {
    const nextIndex = state.index + 1;
    if (nextIndex >= questions.length) {
      saveProgress(state);
      setPhase("results");
      confetti({ particleCount: 150, spread: 120, origin: { y: 0.5 }, colors: ["#FFD700", "#28a745", "#ffffff"] });
    } else {
      setState(prev => ({ ...prev, index: nextIndex }));
    }
  };

  const handleReviewMissed = async () => {
    if (sessionWrongIds.size === 0) return;
    setReviewMode(true);
    setState({ index: 0, points: 0, streak: 0, correctAnswers: 0, answeredQuestions: new Set() });
    const missedQ = questions.filter(q => sessionWrongIds.has(q.id));
    if (missedQ.length > 0) { setQuestions(missedQ.sort(() => Math.random() - 0.5)); setPhase("playing"); }
  };

  const handleFinishReview = () => {
    setReviewMode(false); setSessionWrongIds(new Set()); setPhase("setup"); setSetupStep("years");
    if (selectedSubject) loadCompletionStats(savedName || studentName, selectedSubject.id);
  };

  const handleReviewMissedFromSetup = async () => {
    if (!selectedSubject) return;
    const name = savedName || studentName.trim();
    if (!name) return;

    setLoading(true);
    try {
      const supabase = await getSupabase();
      const { data: answers } = await supabase
        .from("question_answers")
        .select("question_id, correct")
        .eq("student_name", name).eq("subject_id", selectedSubject.id)
        .order("created_at", { ascending: false });

      const latestCorrect = new Map<number, boolean>();
      for (const a of answers || []) { if (!latestCorrect.has(a.question_id)) latestCorrect.set(a.question_id, a.correct); }

      const wrongIds: number[] = [];
      for (const [qId, correct] of latestCorrect) { if (!correct) wrongIds.push(qId); }

      if (wrongIds.length === 0) { setError("No missed questions found. Great job!"); return; }

      const { data: qData } = await supabase.from("questions").select("*").in("id", wrongIds);
      const { data: sData } = await supabase.from("stickers").select("*").eq("active", true);
      if (sData) setStickers(sData);

      if (qData && qData.length > 0) {
        const mapped = qData.map((q) => {
          const opts: OptionsRecord = { a: q.option_a, b: q.option_b, c: q.option_c, d: q.option_d };
          if (q.option_e && q.option_e.trim()) opts.e = q.option_e;
          return { id: q.id, category: q.category, level: q.level, year: q.year, question: q.question, options: opts, correct: q.correct_option, explanation: q.explanation, passage: q.passage || undefined };
        });
        setQuestions(mapped.sort(() => Math.random() - 0.5));
        setSessionWrongIds(new Set(wrongIds));
        setReviewMode(true);
        setState({ index: 0, points: 0, streak: 0, correctAnswers: 0, answeredQuestions: new Set() });
        setPhase("playing");
      } else setError("Could not load missed questions.");
    } catch { setError("Failed to load missed questions."); }
    finally { setLoading(false); }
  };

  const handleRestart = () => {
    setState({ index: 0, points: 0, streak: 0, correctAnswers: 0, answeredQuestions: new Set() });
    setPhase("setup"); setSetupStep("name"); setSelectedLevel(null); setSelectedDept(null);
    setSelectedSubject(null); setQuestions([]); setReviewMode(false); setSessionWrongIds(new Set());
    loadPracticedSubjects(savedName || studentName.trim());
  };

  const handleDifferentSubject = () => {
    setState({ index: 0, points: 0, streak: 0, correctAnswers: 0, answeredQuestions: new Set() });
    setPhase("setup"); setSelectedSubject(null); setQuestions([]); setSetupStep("subjects");
    setReviewMode(false); setSessionWrongIds(new Set());
    loadPracticedSubjects(savedName || studentName.trim());
  };

  // Filtered lists
  const jss3Subjects = subjects.filter(s => s.level === "jss3");
  const ss3Departments = departments;
  const ss3Subjects = subjects.filter(s => s.level === "ss3" && s.department_id === selectedDept);

  const getNudgeMessage = () => {
    const answered = state.answeredQuestions.size;
    const total = questions.length;
    const remaining = total - answered;
    if (reviewMode) return { emoji: "🎯", text: `Reviewing ${total} missed question${total > 1 ? 's' : ''}. Focus and get them right this time!` };
    if (remaining === 0 && answered === total) return { emoji: "🏆", text: "You completed all questions in this session!" };
    if (remaining <= 3) return { emoji: "🔥", text: `Only ${remaining} more question${remaining > 1 ? 's' : ''}! You're almost there!` };
    if (remaining <= total / 2) return { emoji: "💪", text: `Halfway there! ${remaining} question${remaining > 1 ? 's' : ''} to go. Keep going!` };
    return { emoji: "🚀", text: `${total} question${total > 1 ? 's' : ''} to sharpen your skills. You've got this!` };
  };

  const YearStatusBadge = ({ year }: { year: number }) => {
    const stat = completionStats[year];
    if (!stat || stat.status === 'not_started') return null;
    if (stat.status === 'completed') return (
      <span className="inline-flex items-center gap-1 text-[10px] text-policeGreen font-semibold bg-policeGreen/10 px-2 py-0.5 rounded-full mt-1">
        <CheckCircle size={10} /> Done
      </span>
    );
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-policeGold font-semibold bg-policeGold/10 px-2 py-0.5 rounded-full mt-1">
        <BarChart3 size={10} /> {stat.answered}/{stat.total}
      </span>
    );
  };

  // ============================================================
  // RENDER SETUP
  // ============================================================
  if (phase === "setup") {
    return (
      <div className="max-w-3xl mx-auto space-y-8 py-6">
        {/* ── NAME + LEVEL STEP ── */}
        {setupStep === "name" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div className="text-center space-y-4">
              <div className="inline-flex p-4 bg-white/5 rounded-full">
                <GraduationCap size={40} className="text-policeGold" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-heading font-bold text-policeGold">Practice Ground</h1>
              <p className="text-white/60">Enter your nickname and pick your level to get started!</p>
            </div>

            <div className="card space-y-6">
              {/* Name Input */}
              <div>
                <label className="block text-xs uppercase tracking-[0.2em] text-white/50 mb-3">
                  <User size={14} className="inline mr-1" /> Your Nickname
                </label>
                <div className="relative">
                  <input type="text" value={studentName}
                    onChange={(e) => { setStudentName(e.target.value); if (nameStatus !== "idle" && nameStatus !== "checking") { setNameStatus("idle"); setSuggestions([]); } }}
                    onBlur={() => { if (studentName.trim().length >= 2) checkNameAvailability(); }}
                    placeholder="Enter a nickname..."
                    className="w-full bg-black/40 border border-white/10 focus:border-policeGold rounded-xl px-4 py-3 pr-10 text-white placeholder-white/40 outline-none transition text-lg"
                  />
                  {nameStatus === "checking" && <Spinner size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-policeGold animate-spin" />}
                  {nameStatus === "available" && <Check size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-policeGreen" />}
                  {nameStatus === "exists" && <X size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-policeRed" />}
                </div>
              </div>

              {/* Name Status & Suggestions */}
              {nameStatus === "exists" && existingDisplayName && (
                <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-policeRed/10 border border-policeRed/20 rounded-xl p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle size={16} className="text-policeRed shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-policeRed">
                        "{existingDisplayName}" is already in use
                      </p>
                      <p className="text-xs text-white/60 mt-1">Try a different nickname:</p>
                    </div>
                  </div>
                  {suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {suggestions.map(s => (
                        <button key={s} onClick={() => { setStudentName(s); setNameStatus("idle"); setSuggestions([]); }}
                          className="text-xs px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-white/70 hover:bg-policeGold/20 hover:text-policeGold hover:border-policeGold/30 transition">{s}</button>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {nameStatus === "available" && suggestions.length > 0 && (
                <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-policeGold/10 border border-policeGold/20 rounded-xl p-4">
                  <div className="flex items-start gap-2">
                    <Lightbulb size={16} className="text-policeGold shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-policeGold">"{studentName.trim()}" is available!</p>
                      <p className="text-xs text-white/60 mt-1">Similar names you could use instead:</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {suggestions.map(s => (
                      <button key={s} onClick={() => { setStudentName(s); setNameStatus("idle"); setSuggestions([]); }}
                        className="text-xs px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-white/70 hover:bg-policeGold/20 hover:text-policeGold hover:border-policeGold/30 transition">{s}</button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* School Name */}
              <div>
                <label className="block text-xs uppercase tracking-[0.2em] text-white/50 mb-3">
                  <GraduationCap size={14} className="inline mr-1" /> School Name (optional)
                </label>
                <input type="text" value={schoolName} onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="e.g. Government Secondary School, Abuja"
                  className="w-full bg-black/40 border border-white/10 focus:border-policeGold rounded-xl px-4 py-3 text-white placeholder-white/40 outline-none transition"
                />
              </div>

              <button onClick={proceedToLevelSelect}
                className="w-full flex items-center justify-center gap-2 bg-policeGold text-policeBlue font-bold py-3 rounded-xl hover:brightness-110 transition">
                Choose a Level to Contnue <ArrowRight size={18} />
              </button>

              {/* Privacy Notice */}
              <div className="bg-policeGold/10 border border-policeGold/20 rounded-xl p-4 flex items-start gap-3">
                <Shield size={18} className="text-policeGold shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-white/80 font-semibold">Your progress saves across devices</p>
                  <p className="text-xs text-white/50 mt-1">
                    Use the same nickname on any device and your progress follows you. Your nickname and scores appear on the leaderboard.
                  </p>
                </div>
              </div>

              {/* Level Selection */}
              {savedName && (
                <div className="level-select-section pt-2 border-t border-white/10">
                  <label className="block text-xs uppercase tracking-[0.2em] text-white/50 mb-3">Choose Your Level</label>
                  <div className="grid grid-cols-3 gap-4">
                    <button onClick={() => handleLevelSelect("jss3")}
                      className="p-6 rounded-2xl border-2 border-white/10 bg-white/5 hover:border-policeGreen transition-all text-left hover:bg-policeGreen/5 group">
                      <div className="p-3 rounded-full inline-flex mb-3 bg-white/10 text-white/60 group-hover:bg-policeGreen/20 group-hover:text-policeGreen transition-colors">
                        <BookOpen size={24} />
                      </div>
                      <h3 className="text-xl font-heading font-bold text-white group-hover:text-policeGreen transition-colors">JSS3</h3>
                      <p className="text-xs text-white/50 mt-1">Junior Secondary</p>
                    </button>
                    <button onClick={() => handleLevelSelect("ss3")}
                      className="p-6 rounded-2xl border-2 border-white/10 bg-white/5 hover:border-policeGold transition-all text-left hover:bg-policeGold/5 group">
                      <div className="p-3 rounded-full inline-flex mb-3 bg-white/10 text-white/60 group-hover:bg-policeGold/20 group-hover:text-policeGold transition-colors">
                        <GraduationCap size={24} />
                      </div>
                      <h3 className="text-xl font-heading font-bold text-white group-hover:text-policeGold transition-colors">SS3</h3>
                      <p className="text-xs text-white/50 mt-1">Senior Secondary</p>
                    </button>
                    <button onClick={() => router.push("/study")}
                      className="p-6 rounded-2xl border-2 border-policeGold/40 bg-policeGold/5 hover:border-policeGold transition-all text-left hover:bg-policeGold/10 group">
                      <div className="p-3 rounded-full inline-flex mb-3 bg-policeGold/20 text-policeGold group-hover:scale-110 transition-transform">
                        <Swords size={24} />
                      </div>
                      <h3 className="text-xl font-heading font-bold text-policeGold group-hover:brightness-110 transition-all">A-Level</h3>
                      <p className="text-xs text-white/50 mt-1">Study & Practice</p>
                    </button>
                  </div>
                </div>
              )}

              {/* SS3: Show Departments after level selection */}
              {selectedLevel === "ss3" && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                  <label className="block text-xs uppercase tracking-[0.2em] text-white/50 mb-3">
                    <Layers size={14} className="inline mr-1" /> Choose Your Department
                  </label>
                  {ss3Departments.length === 0 ? (
                    <p className="text-white/40 text-sm text-center py-4">No departments configured yet.</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-3">
                      {ss3Departments.map((dept) => (
                        <button key={dept.id} onClick={() => handleDeptSelect(dept.id)}
                          className={`p-4 rounded-xl border-2 transition-all text-center ${selectedDept === dept.id ? "border-policeGold bg-policeGold/10" : "border-white/10 bg-white/5 hover:border-white/30"}`}>
                          <p className={`font-bold text-sm ${selectedDept === dept.id ? "text-policeGold" : "text-white"}`}>{dept.name}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── SUBJECT SELECTION STEP ── */}
        {setupStep === "subjects" && (
          <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div className="flex items-center justify-between">
              <button onClick={handleBackFromSubjects} className="flex items-center gap-1 text-sm text-white/50 hover:text-white transition">
                <ChevronLeft size={16} /> Back
              </button>
              <span className="text-xs uppercase tracking-widest text-white/40">
                {selectedLevel?.toUpperCase()} {selectedDept ? `• ${departments.find(d => d.id === selectedDept)?.name}` : ""}
              </span>
            </div>
            <h2 className="text-2xl font-heading font-bold text-policeGold text-center">Choose a Subject</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {(selectedLevel === "jss3" ? jss3Subjects : ss3Subjects).map((subj) => {
                const isNew = !practicedSubjectIds.has(subj.id);
                return (
                  <button key={subj.id} onClick={() => handleSubjectSelect(subj)}
                    className={`p-4 rounded-xl border transition-all text-center group relative ${
                      isNew
                        ? "border-policeGold/40 bg-policeGold/5 hover:bg-policeGold/10 hover:border-policeGold"
                        : "border-white/10 bg-white/5 hover:border-policeGold hover:bg-policeGold/5"
                    }`}>
                    {isNew && (
                      <span className="absolute -top-2 -right-2 bg-policeGold text-policeBlue text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full shadow-lg shadow-policeGold/30 animate-pulse">
                        New
                      </span>
                    )}
                    <div className="w-10 h-10 rounded-full bg-policeGold/20 flex items-center justify-center text-policeGold font-bold mx-auto mb-2 group-hover:scale-110 transition-transform">
                      {subj.name[0]}
                    </div>
                    <p className="text-sm font-semibold text-white group-hover:text-policeGold transition-colors">{subj.name}</p>
                  </button>
                );
              })}
            </div>
            {selectedLevel === "jss3" && jss3Subjects.length === 0 && (
              <div className="card text-center py-8"><p className="text-white/60">No JSS3 subjects found. Ask your teacher to add some!</p></div>
            )}
            {selectedLevel === "ss3" && ss3Subjects.length === 0 && (
              <div className="card text-center py-8"><p className="text-white/60">No subjects found for this department.</p></div>
            )}
          </motion.div>
        )}

        {/* ── YEAR SELECTION STEP ── */}
        {setupStep === "years" && selectedSubject && (
          <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div className="flex items-center justify-between">
              <button onClick={handleBackFromYears} className="flex items-center gap-1 text-sm text-white/50 hover:text-white transition">
                <ChevronLeft size={16} /> Back
              </button>
              <span className="text-xs uppercase tracking-widest text-white/40">{selectedLevel?.toUpperCase()} • {selectedSubject.name}</span>
            </div>
            <div className="text-center space-y-2">
              <div className="inline-flex p-3 bg-white/5 rounded-full"><CalendarDays size={28} className="text-policeGold" /></div>
              <h2 className="text-2xl font-heading font-bold text-policeGold">{selectedSubject.name}</h2>
              <p className="text-white/50">{totalQuestionsAvailable > 0 ? `${totalQuestionsAvailable} question${totalQuestionsAvailable > 1 ? 's' : ''} available` : "No questions loaded yet"}</p>
              {savedName && Object.keys(completionStats).length > 0 && (
                <div className="flex items-center justify-center gap-4 text-[11px] text-white/50">
                  <span className="flex items-center gap-1"><CheckCircle size={12} className="text-policeGreen" /> {Object.values(completionStats).filter(s => s.status === 'completed').length} completed</span>
                  <span className="flex items-center gap-1"><BarChart3 size={12} className="text-policeGold" /> {Object.values(completionStats).filter(s => s.status === 'in_progress').length} in progress</span>
                  <span className="flex items-center gap-1"><Circle size={12} className="text-white/30" /> {Object.values(completionStats).filter(s => s.status === 'not_started').length} not started</span>
                </div>
              )}
            </div>
            <div className="card space-y-4">
              <label className="block text-xs uppercase tracking-[0.2em] text-white/50 mb-2">Select Year</label>
              <div className="flex flex-wrap gap-3">
                <button onClick={() => setSelectedYear("all")}
                  className={`px-6 py-3 rounded-xl border-2 font-bold transition ${selectedYear === "all" ? "border-policeGold bg-policeGold/10 text-policeGold" : "border-white/10 bg-white/5 text-white/70 hover:border-white/30"}`}>
                  <Star size={16} className="inline mr-1" /> Practice All
                </button>
                {availableYears.map((year) => {
                  const stat = completionStats[year];
                  let borderColor = "border-white/10 hover:border-white/30", bgColor = "bg-white/5", textColor = "text-white/70";
                  if (selectedYear === year) { borderColor = "border-policeGreen"; bgColor = "bg-policeGreen/10"; textColor = "text-policeGreen"; }
                  else if (stat?.status === 'completed') { borderColor = "border-policeGreen/30"; bgColor = "bg-policeGreen/5"; textColor = "text-policeGreen/70"; }
                  else if (stat?.status === 'in_progress') { borderColor = "border-policeGold/30"; bgColor = "bg-policeGold/5"; textColor = "text-policeGold/80"; }
                  return (
                    <button key={year} onClick={() => setSelectedYear(year)}
                      className={`px-6 py-3 rounded-xl border-2 font-bold transition flex flex-col items-center ${borderColor} ${bgColor} ${textColor}`}>
                      <span>{year}</span>
                      <YearStatusBadge year={year} />
                    </button>
                  );
                })}
              </div>
            </div>

            {savedName && missedQuestionsCount > 0 && !reviewMode && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-policeRed/10 border-2 border-policeRed/30 rounded-2xl p-5 text-center">
                <AlertTriangle size={28} className="text-policeRed mx-auto mb-2" />
                <p className="text-sm text-white/80 font-semibold mb-1">{missedQuestionsCount} question{missedQuestionsCount > 1 ? 's' : ''} need{missedQuestionsCount === 1 ? 's' : ''} review</p>
                <p className="text-xs text-white/50 mb-4">Jump straight into practicing the questions you got wrong!</p>
                <button onClick={handleReviewMissedFromSetup} disabled={loading}
                  className="inline-flex items-center gap-2 bg-policeRed/20 hover:bg-policeRed/30 border border-policeRed/40 text-policeRed font-bold px-6 py-3 rounded-xl transition active:scale-95">
                  {loading ? <><div className="w-4 h-4 border-2 border-policeRed border-t-transparent rounded-full animate-spin"></div> Loading...</> : <><RotateCcw size={18} /> Review Missed Questions</>}
                </button>
              </motion.div>
            )}

            <div className="bg-gradient-to-r from-policeGold/10 to-policeGreen/10 border border-policeGold/20 rounded-2xl p-5 text-center">
              <BrainCircuit size={24} className="text-policeGold mx-auto mb-2" />
              <p className="text-sm text-white/70">{totalQuestionsAvailable > 0 ? `💡 Master all ${totalQuestionsAvailable} questions to earn the "${selectedSubject.name} Scholar" badge!` : "No questions yet for this subject. Check back later!"}</p>
            </div>

            <button onClick={handleStartQuiz} disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-policeGold text-policeBlue font-bold py-4 rounded-xl hover:brightness-110 transition disabled:opacity-30 text-lg">
              {loading ? <><div className="w-5 h-5 border-2 border-policeBlue border-t-transparent rounded-full animate-spin"></div> Loading Questions...</> : <>Start Practice <ArrowRight size={20} /></>}
            </button>

            {error && <div className="card border border-policeRed/50 bg-policeRed/5 text-center"><p className="text-policeRed font-semibold">{error}</p></div>}
          </motion.div>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 opacity-50 space-y-4">
        <div className="w-12 h-12 border-4 border-policeGold border-t-transparent rounded-full animate-spin"></div>
        <p className="uppercase tracking-widest text-sm font-semibold">Loading Questions...</p>
      </div>
    );
  }

  if (error || questions.length === 0) {
    return (
      <div className="card border border-policeRed/50 p-8 text-center bg-policeRed/5 mx-auto max-w-2xl mt-10">
        <p className="text-policeRed font-semibold text-xl mb-2">No Questions Available</p>
        <p className="text-white/60 mb-6">{error || "No questions found for this selection."}</p>
        <button onClick={handleRestart} className="bg-policeGold text-policeBlue font-bold px-6 py-3 rounded-xl hover:brightness-110 transition">Try a Different Selection</button>
      </div>
    );
  }

  // ============================================================
  // RESULTS
  // ============================================================
  if (phase === "results") {
    const totalQuestions = questions.length;
    const percentage = Math.round((state.correctAnswers / totalQuestions) * 100);
    const passed = percentage >= 60;
    const isComplete = state.answeredQuestions.size >= totalQuestions;
    const hasMissedQuestions = sessionWrongIds.size > 0;

    const getMessage = () => {
      if (reviewMode) {
        if (percentage >= 100) return { title: "🎯 Perfect Recovery!", message: "You got every missed question right! Outstanding improvement!", color: "text-policeGold" };
        if (percentage >= 75) return { title: "✅ Great Improvement!", message: "You're learning from your mistakes. Keep it up!", color: "text-policeGreen" };
        if (percentage >= 50) return { title: "👍 Getting Better!", message: "Some progress — keep practicing those tricky ones!", color: "text-blue-400" };
        return { title: "💪 Keep Trying!", message: "Review again and you'll master these eventually!", color: "text-orange-400" };
      }
      if (percentage >= 90) return { title: "🏆 Outstanding!", message: "You are a true scholar! Amazing work!", color: "text-policeGold" };
      if (percentage >= 75) return { title: "🎉 Excellent!", message: "You're well-prepared! Keep it up!", color: "text-policeGreen" };
      if (percentage >= 60) return { title: "👍 Good Job!", message: "You passed! Review mistakes and try again.", color: "text-blue-400" };
      if (percentage >= 40) return { title: "💪 Keep Going!", message: "Progress takes practice. Try again!", color: "text-orange-400" };
      return { title: "🔄 Keep Practicing!", message: "Every master was once a beginner!", color: "text-white/80" };
    };
    const result = getMessage();

    return (
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-3xl mx-auto space-y-8">
        <div className="card relative overflow-hidden">
          <div className={`absolute top-0 left-0 w-full h-2 ${passed ? 'bg-gradient-to-r from-policeGreen via-policeGold to-policeGreen' : 'bg-gradient-to-r from-orange-500 to-policeRed'}`}></div>
          <div className="text-center space-y-6 pt-8">
            <div className="flex items-center justify-center gap-2 mb-2 flex-wrap">
              <span className="text-xs uppercase tracking-widest bg-white/10 px-3 py-1 rounded-full text-white/60">
                {selectedLevel?.toUpperCase()} • {selectedSubject?.name} {selectedYear !== "all" ? `• ${selectedYear}` : ""} • {savedName}
              </span>
              {reviewMode && <span className="text-xs uppercase tracking-widest bg-policeRed/10 text-policeRed px-3 py-1 rounded-full border border-policeRed/30">Review Session</span>}
            </div>
            <div className="inline-flex p-6 bg-white/5 rounded-full">
              {reviewMode ? <Target size={64} className={passed ? "text-policeGreen" : "text-orange-400"} /> : <Trophy size={64} className={passed ? "text-policeGold" : "text-orange-400"} />}
            </div>
            <div>
              <h2 className={`text-3xl sm:text-4xl font-heading font-bold ${result.color} mb-3`}>{result.title}</h2>
              <p className="text-white/70 text-lg max-w-xl mx-auto leading-relaxed">{result.message}</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-6">
              <div className="bg-white/5 rounded-xl p-4 border border-white/10"><p className="text-[10px] uppercase tracking-widest text-white/50 mb-1">Score</p><p className="text-3xl font-bold text-policeGold">{state.points}</p></div>
              <div className="bg-white/5 rounded-xl p-4 border border-white/10"><p className="text-[10px] uppercase tracking-widest text-white/50 mb-1">Correct</p><p className="text-3xl font-bold text-policeGreen">{state.correctAnswers}/{totalQuestions}</p></div>
              <div className="bg-white/5 rounded-xl p-4 border border-white/10"><p className="text-[10px] uppercase tracking-widest text-white/50 mb-1">Percentage</p><p className="text-3xl font-bold text-white">{percentage}%</p></div>
              <div className="bg-white/5 rounded-xl p-4 border border-white/10"><p className="text-[10px] uppercase tracking-widest text-white/50 mb-1">Best Streak</p><p className="text-3xl font-bold text-orange-400">{state.streak}</p></div>
            </div>
            <div className="bg-black/30 rounded-2xl p-6 border border-white/5">
              <div className="flex items-center justify-center gap-2 mb-4"><Award size={20} className="text-policeGold" /><p className="text-xs uppercase tracking-[0.3em] text-white/50">Badges Unlocked</p></div>
              <div className="flex flex-wrap justify-center gap-2">
                <BadgeChip label="Rising Star" earned={state.points >= 10} />
                <BadgeChip label="Bookworm" earned={state.points >= 50} />
                <BadgeChip label="Brain Box" earned={state.streak >= 5} />
                <BadgeChip label="Quiz Master" earned={percentage >= 60} />
                <BadgeChip label="Top Performer" earned={percentage >= 90} />
              </div>
            </div>
            {hasMissedQuestions && !reviewMode && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-policeRed/10 border border-policeRed/30 rounded-2xl p-5">
                <div className="flex items-center justify-center gap-2 mb-3"><XCircle size={20} className="text-policeRed" /><p className="text-sm font-bold text-policeRed">{sessionWrongIds.size} Question{sessionWrongIds.size > 1 ? 's' : ''} Missed</p></div>
                <p className="text-xs text-white/60 mb-4">Practice the questions you got wrong to turn those red marks into green!</p>
                <button onClick={handleReviewMissed} className="w-full flex items-center justify-center gap-2 bg-policeRed/20 hover:bg-policeRed/30 border border-policeRed/40 text-policeRed font-bold py-3 rounded-xl transition active:scale-95">
                  <RotateCcw size={18} /> Review Missed Questions</button>
              </motion.div>
            )}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button onClick={reviewMode ? handleFinishReview : handleRestart}
                className="flex-1 flex items-center justify-center gap-2 bg-policeGold text-policeBlue font-bold py-4 rounded-xl hover:brightness-110 transition">
                {reviewMode ? <><CheckCircle size={20} /> Done Reviewing</> : <><RefreshCw size={20} /> Try Again</>}
              </button>
              <button onClick={handleDifferentSubject}
                className="flex-1 flex items-center justify-center gap-2 bg-white/10 text-white font-bold py-4 rounded-xl hover:bg-white/20 transition border border-white/10">
                <BookOpen size={20} /> Different Subject</button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // ============================================================
  // PLAYING
  // ============================================================
  const currentQuestion = questions[state.index];
  const progress = ((state.index + 1) / questions.length) * 100;
  const nudge = getNudgeMessage();

  return (
    <div className="space-y-8 pb-10">
      <header className="mx-auto max-w-3xl space-y-4 text-center">
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <span className="text-xs uppercase tracking-widest bg-white/10 px-3 py-1 rounded-full text-white/60">
            {selectedLevel?.toUpperCase()} • {selectedSubject?.name} {selectedYear !== "all" ? `• ${selectedYear}` : ""}
          </span>
          <span className="text-xs uppercase tracking-widest bg-white/10 px-3 py-1 rounded-full text-white/60">{savedName}</span>
          {reviewMode && <span className="text-xs uppercase tracking-widest bg-policeRed/10 text-policeRed px-3 py-1 rounded-full border border-policeRed/30 animate-pulse">🎯 Review Mode</span>}
        </div>
        <h1 className="text-3xl font-heading font-bold text-policeGold uppercase tracking-widest">{reviewMode ? "Review Missed Questions" : "Practice Ground"}</h1>
        <div className={`rounded-xl px-4 py-2 border border-white/10 ${reviewMode ? 'bg-policeRed/5' : 'bg-gradient-to-r from-policeGold/10 to-policeGreen/10'}`}>
          <p className="text-xs text-white/70">{nudge.emoji} <span className={`font-semibold ${reviewMode ? 'text-policeRed' : 'text-policeGold'}`}>{nudge.text}</span></p>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-white/60">Question <span className="text-policeGold font-bold">{state.index + 1}</span> of {questions.length}</span>
            <span className="text-white/60">{Math.round(progress)}% Complete</span>
          </div>
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div className={`h-full bg-gradient-to-r ${reviewMode ? 'from-policeRed to-policeGold' : 'from-policeGold to-policeGreen'}`}
              initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }} />
          </div>
        </div>
        <div className="flex justify-center gap-3 sm:gap-6 pt-2 flex-wrap">
          <div className="flex items-center gap-3 rounded-2xl bg-white/5 border border-white/10 px-5 py-3 shadow-lg">
            <Zap className="text-policeGold" size={24} />
            <div className="text-left"><p className="text-[10px] uppercase tracking-widest text-white/50">Points</p><p className="text-xl font-bold">{state.points}</p></div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-white/5 border border-white/10 px-5 py-3 shadow-lg">
            <Flame className={state.streak > 2 ? "text-policeRed animate-pulse" : "text-orange-400"} size={24} />
            <div className="text-left"><p className="text-[10px] uppercase tracking-widest text-white/50">Streak</p><p className="text-xl font-bold">{state.streak}</p></div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-white/5 border border-white/10 px-5 py-3 shadow-lg">
            <TrendingUp className="text-policeGreen" size={24} />
            <div className="text-left"><p className="text-[10px] uppercase tracking-widest text-white/50">Correct</p><p className="text-xl font-bold">{state.correctAnswers}</p></div>
          </div>
        </div>
      </header>
      <AnimatePresence mode="wait">
        <motion.div key={state.index} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} transition={{ duration: 0.4 }}>
          <QuestionCard question={currentQuestion} onAnswer={handleAnswer} onNext={nextQuestion} stickers={stickers} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { getSupabase } from "@/lib/supabaseClient";
import BadgeChip from "@/components/BadgeChip";
import { motion } from "framer-motion";
import {
  BarChart3, BookOpen, User, School,
  Trophy, Award, Target, Clock, CalendarDays,
  CheckCircle, XCircle, Sparkles, Loader2, ArrowRight,
  BrainCircuit
} from "lucide-react";
import Link from "next/link";

function getLocalStudent(): { name: string } | null {
  const name = typeof window !== "undefined" ? localStorage.getItem("scholars-arena-name") : null;
  return name ? { name } : null;
}

type ProgressRecord = {
  id: number;
  student_name: string;
  school_name?: string;
  level: string;
  subject: string;
  year: number;
  score: number;
  total_questions: number;
  percentage: number;
  correct_answers: number;
  best_streak: number;
  badges: string[];
  created_at: string;
};

type SubjectStats = {
  subject: string;
  totalQuestions: number;
  correctAnswers: number;
};

export default function DashboardPage() {
  const [studentName, setStudentName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<ProgressRecord[]>([]);
  const [subjectStats, setSubjectStats] = useState<SubjectStats[]>([]);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [allBadges, setAllBadges] = useState<string[]>([]);
  const [overallAccuracy, setOverallAccuracy] = useState(0);

  useEffect(() => {
    const student = getLocalStudent();
    const school = localStorage.getItem("scholars-arena-school") || "";
    if (student) {
      setStudentName(student.name);
      setSchoolName(school);
      loadDashboard(student.name);
    } else {
      setLoading(false);
    }
  }, []);

  const loadDashboard = async (name: string) => {
    try {
      const supabase = await getSupabase();

      // Fetch recent progress records for this student
      const { data: progressData } = await supabase
        .from("progress")
        .select("*")
        .eq("student_name", name)
        .order("created_at", { ascending: false })
        .limit(50);

      // Fetch all question_answers for per-subject accuracy
      const { data: answersData } = await supabase
        .from("question_answers")
        .select("subject_id, correct, level")
        .eq("student_name", name);

      // Fetch subjects for name mapping
      const { data: subjectsData } = await supabase
        .from("subjects")
        .select("id, name, level");

      const subjectNameMap = new Map<number, string>();
      if (subjectsData) {
        for (const s of subjectsData) {
          subjectNameMap.set(s.id, s.name);
        }
      }

      // Process progress records
      if (progressData) {
        setSessions(progressData);

        // Collect all unique badges
        const badgeSet = new Set<string>();
        for (const s of progressData) {
          if (s.badges) {
            for (const b of s.badges) {
              badgeSet.add(b);
            }
          }
        }
        // Always include the core badges for context
        setAllBadges(Array.from(badgeSet));
      }

      // Process question_answers for per-subject stats
      if (answersData && answersData.length > 0) {
        const subjectMap = new Map<string, { total: number; correct: number }>();
        let correct = 0;

        for (const a of answersData) {
          const subjName = subjectNameMap.get(a.subject_id) || `Subject #${a.subject_id}`;
          if (!subjectMap.has(subjName)) {
            subjectMap.set(subjName, { total: 0, correct: 0 });
          }
          const stat = subjectMap.get(subjName)!;
          stat.total++;
          if (a.correct) {
            stat.correct++;
            correct++;
          }
        }

        const stats: SubjectStats[] = [];
        for (const [subject, stat] of subjectMap) {
          stats.push({
            subject,
            totalQuestions: stat.total,
            correctAnswers: stat.correct,
          });
        }

        stats.sort((a, b) => b.totalQuestions - a.totalQuestions);
        setSubjectStats(stats);
        setTotalAnswered(answersData.length);
        setTotalCorrect(correct);
        setOverallAccuracy(Math.round((correct / answersData.length) * 100));
      }
    } catch {
      // Dashboard data failed to load
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", {
      day: "numeric", month: "short", year: "numeric",
    });
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  };

  const getAccuracyColor = (pct: number) => {
    if (pct >= 80) return "text-policeGreen";
    if (pct >= 60) return "text-policeGold";
    if (pct >= 40) return "text-orange-400";
    return "text-policeRed";
  };

  // ── No name entered state ──
  if (!loading && !studentName) {
    return (
      <div className="max-w-3xl mx-auto text-center space-y-8 py-10">
        <div className="inline-flex p-6 bg-white/5 rounded-full">
          <User size={56} className="text-white/40" />
        </div>
        <div>
          <h1 className="text-4xl font-heading font-bold text-white mb-3">My Progress</h1>
          <p className="text-white/60 text-lg max-w-md mx-auto">
            Enter your nickname on the Practice page to start tracking your stats!
          </p>
        </div>
        <Link href="/practice"
          className="inline-flex items-center gap-2 bg-policeGold text-policeBlue font-bold px-8 py-4 rounded-xl hover:brightness-110 transition text-lg">
          Go to Practice <ArrowRight size={20} />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* ── HEADER ── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-4">
        <div className="inline-flex p-4 bg-white/5 rounded-full">
          <BarChart3 size={40} className="text-policeGold" />
        </div>
        <h1 className="text-4xl sm:text-5xl font-heading font-bold text-white tracking-tight">My Progress</h1>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <span className="flex items-center gap-1.5 text-sm bg-white/10 px-4 py-2 rounded-full text-white/80">
            <User size={14} /> {studentName}
          </span>
          {schoolName && (
            <span className="flex items-center gap-1.5 text-sm bg-white/10 px-4 py-2 rounded-full text-white/60">
              <School size={14} /> {schoolName}
            </span>
          )}
        </div>
      </motion.div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 size={32} className="text-policeGold animate-spin" />
          <p className="text-white/50 text-sm uppercase tracking-widest">Loading your stats...</p>
        </div>
      ) : totalAnswered === 0 ? (
        /* ── No data yet ── */
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="card text-center py-16 space-y-6">
          <Target size={64} className="text-white/20 mx-auto" />
          <div>
            <h2 className="text-2xl font-heading font-bold text-white mb-2">No Activity Yet</h2>
            <p className="text-white/60 max-w-md mx-auto">
              Complete your first practice session to see your stats, badges, and progress here!
            </p>
          </div>
          <Link href="/practice"
            className="inline-flex items-center gap-2 bg-policeGold text-policeBlue font-bold px-8 py-4 rounded-xl hover:brightness-110 transition">
            Start Practicing <ArrowRight size={20} />
          </Link>
        </motion.div>
      ) : (
        <>
          {/* ── OVERALL STATS CARDS ── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/5 rounded-2xl p-5 border border-white/10 text-center">
              <BrainCircuit size={24} className="text-policeGold mx-auto mb-2" />
              <p className="text-[10px] uppercase tracking-widest text-white/50 mb-1">Questions Answered</p>
              <p className="text-3xl font-bold text-white">{totalAnswered}</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-5 border border-white/10 text-center">
              <CheckCircle size={24} className="text-policeGreen mx-auto mb-2" />
              <p className="text-[10px] uppercase tracking-widest text-white/50 mb-1">Correct</p>
              <p className="text-3xl font-bold text-policeGreen">{totalCorrect}</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-5 border border-white/10 text-center">
              <Target size={24} className={`mx-auto mb-2 ${getAccuracyColor(overallAccuracy)}`} />
              <p className="text-[10px] uppercase tracking-widest text-white/50 mb-1">Accuracy</p>
              <p className={`text-3xl font-bold ${getAccuracyColor(overallAccuracy)}`}>{overallAccuracy}%</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-5 border border-white/10 text-center">
              <Award size={24} className="text-policeGold mx-auto mb-2" />
              <p className="text-[10px] uppercase tracking-widest text-white/50 mb-1">Badges Earned</p>
              <p className="text-3xl font-bold text-policeGold">{allBadges.length}</p>
            </div>
          </motion.div>

          {/* ── PER-SUBJECT ACCURACY ── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="card">
            <div className="flex items-center gap-3 mb-6">
              <BookOpen size={20} className="text-policeGold" />
              <h2 className="text-xl font-heading font-bold text-white">Performance by Subject</h2>
            </div>

            {subjectStats.length === 0 ? (
              <p className="text-white/50 text-center py-8">No subject data yet.</p>
            ) : (
              <div className="space-y-4">
                {subjectStats.map((stat) => {
                  const pct = Math.round((stat.correctAnswers / stat.totalQuestions) * 100);
                  return (
                    <div key={stat.subject} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-semibold text-white truncate">{stat.subject}</span>
                          <span className="text-[10px] text-white/40 bg-white/10 px-2 py-0.5 rounded-full shrink-0">
                            {stat.totalQuestions} q
                          </span>
                        </div>
                        <span className={`font-bold font-mono ${getAccuracyColor(pct)}`}>{pct}%</span>
                      </div>
                      <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          className={`h-full rounded-full ${
                            pct >= 80 ? "bg-policeGreen" : pct >= 60 ? "bg-policeGold" : pct >= 40 ? "bg-orange-400" : "bg-policeRed"
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* ── BADGES EARNED ── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="card">
            <div className="flex items-center gap-3 mb-6">
              <Award size={20} className="text-policeGold" />
              <h2 className="text-xl font-heading font-bold text-white">Badges Earned</h2>
              <span className="text-[10px] uppercase tracking-widest bg-white/10 px-2 py-1 rounded-full text-white/50">
                {allBadges.length} / 5
              </span>
            </div>

            <div className="flex flex-wrap gap-3 justify-center">
              <BadgeChip label="Rising Star" earned={allBadges.includes("Rising Star")} />
              <BadgeChip label="Bookworm" earned={allBadges.includes("Bookworm")} />
              <BadgeChip label="Brain Box" earned={allBadges.includes("Brain Box")} />
              <BadgeChip label="Quiz Master" earned={allBadges.includes("Quiz Master")} />
              <BadgeChip label="Top Performer" earned={allBadges.includes("Top Performer")} />
            </div>
          </motion.div>

          {/* ── SESSION HISTORY ── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="card">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Clock size={20} className="text-policeGold" />
                <h2 className="text-xl font-heading font-bold text-white">Recent Sessions</h2>
              </div>
              <span className="text-[10px] uppercase tracking-widest bg-white/10 px-2 py-1 rounded-full text-white/50">
                {sessions.length} total
              </span>
            </div>

            {sessions.length === 0 ? (
              <p className="text-white/50 text-center py-8">No sessions yet.</p>
            ) : (
              <div className="space-y-3">
                {sessions.slice(0, 10).map((session, idx) => {
                  const pct = session.percentage;
                  const passed = pct >= 60;
                  return (
                    <div key={session.id}
                      className={`flex items-center justify-between rounded-xl border px-4 py-3 transition ${
                        idx === 0
                          ? "bg-policeGold/5 border-policeGold/20"
                          : "bg-white/5 border-white/10 hover:border-white/20"
                      }`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                          passed ? "bg-policeGreen/20 text-policeGreen" : "bg-policeRed/10 text-policeRed"
                        }`}>
                          {passed ? <CheckCircle size={18} /> : <XCircle size={18} />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-white truncate">{session.subject}</p>
                            <span className="text-[9px] uppercase tracking-widest bg-white/10 px-1.5 py-0.5 rounded text-white/50">
                              {session.level?.toUpperCase()}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-white/40">
                            <CalendarDays size={10} />
                            <span>{formatDate(session.created_at)}</span>
                            <span>•</span>
                            <span>{formatTime(session.created_at)}</span>
                            {session.year > 0 && (
                              <>
                                <span>•</span>
                                <span>{session.year}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p className={`font-mono font-bold text-base ${passed ? "text-policeGreen" : "text-policeRed"}`}>
                          {Math.round(pct)}%
                        </p>
                        <p className="text-[10px] text-white/40">
                          {session.correct_answers}/{session.total_questions}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Motivational footer */}
            {sessions.length > 0 && (
              <div className="mt-6 bg-gradient-to-r from-policeGold/10 to-policeGreen/10 border border-policeGold/20 rounded-xl p-4 text-center">
                <Sparkles size={18} className="text-policeGold mx-auto mb-1" />
                <p className="text-sm text-white/70">
                  {sessions.length >= 10
                    ? "🔥 10+ sessions! You're building an impressive study habit!"
                    : sessions.length >= 5
                    ? "💪 5+ sessions! Consistency is the key to success!"
                    : "🚀 Great start! Keep practicing to level up your skills!"}
                </p>
              </div>
            )}
          </motion.div>

          {/* ── CTA ── */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/practice"
              className="flex-1 flex items-center justify-center gap-2 bg-policeGold text-policeBlue font-bold py-4 rounded-xl hover:brightness-110 transition">
              <BookOpen size={20} /> Continue Practicing
            </Link>
            <Link href="/leaderboard"
              className="flex-1 flex items-center justify-center gap-2 bg-white/10 text-white font-bold py-4 rounded-xl hover:bg-white/20 transition border border-white/10">
              <Trophy size={20} /> View Leaderboard
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

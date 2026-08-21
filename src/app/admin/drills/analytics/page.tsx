"use client";

import { useState, useEffect } from "react";
import {
  BarChart3, Clock, Users, Target, TrendingUp,
  Loader2, ChevronRight, ArrowLeft, Trophy,
  Flame, Timer, AlertTriangle, CheckCircle2,
  Zap, ChevronDown, ChevronUp, Repeat, BadgeCheck, PenLine,
  Braces, Merge, Scale
} from "lucide-react";

type DrillSetSummary = {
  id: number;
  title: string;
  time_limit_minutes: number;
  question_count: number;
  card_type?: string;
  avgSubmissions?: number;
  totalAttempts: number;
  completedAttempts: number;
  completionRate: number;
  avgScore: number;
  avgTimeSeconds: number;
  totalWarnings: number;
  masteredStudents: number;
  totalStudents: number;
  masteryRate: number;
  level: string;
};

type AttemptHistoryEntry = {
  tryNumber: number;
  completed: boolean;
  quit: boolean;
  correctAnswers: number;
  totalQuestions: number;
  scorePercent: number;
  timeSpentSeconds: number;
  mastered: boolean;
  submissions?: number;
  startedAt: string;
  completedAt: string | null;
};

type DrillAnalytics = {
  drillSet: {
    id: number;
    title: string;
    time_limit_minutes: number;
    question_count: number;
    cardType?: string;
  } | null;
  summary: {
    totalAttempts: number;
    completedAttempts: number;
    quitAttempts: number;
    masteredAttempts: number;
    masteredStudents: number;
    masteryRate: number;
    avgTimeSeconds: number;
    avgScorePercent: number;
    avgQuitTimeSeconds: number;
    avgSubmissions?: number;
  };
  students: {
    studentName: string;
    attempts: number;
    submissions?: number;
    bestScore: number;
    bestTime: number;
    completed: number;
    totalWarnings: number;
    mastered: boolean;
    masteredAtTry: number | null;
    retriesBeforeStop: number;
    attemptHistory: AttemptHistoryEntry[];
  }[];
  attempts: any[];
};

export default function AdminDrillAnalyticsPage() {
  const [sets, setSets] = useState<DrillSetSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSetId, setSelectedSetId] = useState<number | null>(null);
  const [analytics, setAnalytics] = useState<DrillAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

  useEffect(() => {
    loadOverview();
  }, []);

  const loadOverview = async () => {
    try {
      const res = await fetch("/api/drills/attempts");
      if (res.ok) setSets(await res.json());
    } catch {}
    setLoading(false);
  };

  const loadDetailedAnalytics = async (drillSetId: number) => {
    setAnalyticsLoading(true);
    setSelectedSetId(drillSetId);
    try {
      const res = await fetch(`/api/drills/attempts?drill_set_id=${drillSetId}`);
      if (res.ok) setAnalytics(await res.json());
    } catch {}
    setAnalyticsLoading(false);
  };

  const formatTime = (seconds: number) => {
    if (!seconds) return "—";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const formatClock = (iso: string) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (iso: string) => {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  };

  const getScoreColor = (pct: number) => {
    if (pct >= 80) return "text-policeGreen";
    if (pct >= 60) return "text-policeGold";
    if (pct >= 40) return "text-orange-400";
    return "text-policeRed";
  };

  // ── OVERVIEW ──
  if (!selectedSetId) {
    return (
      <div className="space-y-8 max-w-6xl mx-auto">
        <div className="bg-white/5 p-6 rounded-3xl border border-white/10 flex items-center gap-4">
          <div className="bg-blue-500/20 p-3 rounded-full text-blue-400"><BarChart3 size={28} /></div>
          <div>
            <h2 className="text-2xl font-heading font-bold text-white">Drill Analytics</h2>
            <p className="text-sm text-white/50">Track student engagement and performance across all drill sets</p>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 size={32} className="text-policeGold animate-spin" />
            <p className="text-white/50 text-sm uppercase tracking-widest">Loading analytics...</p>
          </div>
        ) : sets.length === 0 ? (
          <div className="card text-center py-16">
            <BarChart3 size={48} className="text-white/20 mx-auto mb-4" />
            <p className="text-white/60">No drill data yet. Create drill sets first!</p>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="bg-white/5 rounded-2xl p-5 border border-white/10 text-center">
                <Flame size={24} className="text-orange-400 mx-auto mb-2" />
                <p className="text-[10px] uppercase tracking-widest text-white/50 mb-1">Total Drill Sets</p>
                <p className="text-3xl font-bold text-white">{sets.length}</p>
              </div>
              <div className="bg-white/5 rounded-2xl p-5 border border-white/10 text-center">
                <Users size={24} className="text-blue-400 mx-auto mb-2" />
                <p className="text-[10px] uppercase tracking-widest text-white/50 mb-1">Total Attempts</p>
                <p className="text-3xl font-bold text-white">{sets.reduce((s, d) => s + d.totalAttempts, 0)}</p>
              </div>
              <div className="bg-policeGreen/5 rounded-2xl p-5 border border-policeGreen/20 text-center">
                <Trophy size={24} className="text-policeGreen mx-auto mb-2" />
                <p className="text-[10px] uppercase tracking-widest text-white/50 mb-1">Cards Mastered</p>
                <p className="text-3xl font-bold text-policeGreen">{sets.reduce((s, d) => s + d.masteredStudents, 0)}</p>
              </div>
              <div className="bg-white/5 rounded-2xl p-5 border border-white/10 text-center">
                <Target size={24} className="text-policeGold mx-auto mb-2" />
                <p className="text-[10px] uppercase tracking-widest text-white/50 mb-1">Avg Mastery Rate</p>
                <p className="text-3xl font-bold text-policeGold">
                  {Math.round(sets.reduce((s, d) => s + d.masteryRate, 0) / Math.max(sets.length, 1))}%
                </p>
              </div>
              <div className="bg-white/5 rounded-2xl p-5 border border-white/10 text-center">
                <AlertTriangle size={24} className="text-policeRed mx-auto mb-2" />
                <p className="text-[10px] uppercase tracking-widest text-white/50 mb-1">Time Warnings</p>
                <p className="text-3xl font-bold text-policeRed">{sets.reduce((s, d) => s + d.totalWarnings, 0)}</p>
              </div>
            </div>

            {/* Drill Sets Table */}
            <div className="space-y-3">
              {sets.map((set) => (
                <button key={set.id}
                  onClick={() => loadDetailedAnalytics(set.id)}
                  className="w-full text-left bg-white/5 border border-white/10 hover:border-blue-400/30 hover:bg-blue-500/5 rounded-2xl p-5 transition group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                        set.card_type === "capitalization"
                          ? "bg-violet-500/20 text-violet-300"
                          : set.card_type === "sentence_types"
                            ? "bg-teal-500/20 text-teal-300"
                            : set.card_type === "sentence_combining"
                              ? "bg-sky-500/20 text-sky-300"
                            : set.card_type === "true_false"
                              ? "bg-emerald-500/20 text-emerald-300"
                              : "bg-orange-500/20 text-orange-400"
                      }`}>
                        {set.title[0]}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-white group-hover:text-blue-400 transition-colors truncate">{set.title}</h4>
                        <p className="text-xs text-white/40">
                          {set.question_count} {set.card_type === "capitalization" || set.card_type === "sentence_types" || set.card_type === "sentence_combining" || set.card_type === "true_false" ? "items" : "questions"} • {set.card_type === "capitalization" || set.card_type === "sentence_types" || set.card_type === "sentence_combining" || set.card_type === "true_false" ? "self-paced" : `${set.time_limit_minutes}m limit`} • {set.level.toUpperCase()}
                          {set.card_type === "capitalization" && (
                            <span className="ml-2 text-[9px] uppercase tracking-widest bg-violet-500/15 text-violet-300 px-2 py-0.5 rounded-full font-bold">✍️ Capitalization</span>
                          )}
                          {set.card_type === "sentence_types" && (
                            <span className="ml-2 text-[9px] uppercase tracking-widest bg-teal-500/15 text-teal-300 px-2 py-0.5 rounded-full font-bold">🧩 Sentence Types</span>
                          )}
                          {set.card_type === "sentence_combining" && (
                            <span className="ml-2 text-[9px] uppercase tracking-widest bg-sky-500/15 text-sky-300 px-2 py-0.5 rounded-full font-bold">🔗 Sentence Combining</span>
                          )}
                          {set.card_type === "true_false" && (
                            <span className="ml-2 text-[9px] uppercase tracking-widest bg-emerald-500/15 text-emerald-300 px-2 py-0.5 rounded-full font-bold">⚖️ True or False</span>
                          )}
                        </p>
                        {set.masteredStudents > 0 && (
                          <span className="inline-flex items-center gap-1 mt-1 text-[10px] text-policeGreen bg-policeGreen/10 px-2 py-0.5 rounded-full">
                            <Trophy size={9} /> {set.masteredStudents}/{set.totalStudents || 0} student{set.totalStudents !== 1 ? "s" : ""} mastered
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-6 shrink-0">
                      <div className="text-right hidden sm:block">
                        <p className="text-sm font-bold text-white">{set.totalAttempts}</p>
                        <p className="text-[9px] uppercase tracking-widest text-white/40">Attempts</p>
                      </div>
                      <div className="text-right hidden sm:block">
                        <p className={`text-sm font-bold ${getScoreColor(set.avgScore)}`}>{set.avgScore}%</p>
                        <p className="text-[9px] uppercase tracking-widest text-white/40">Avg Score</p>
                      </div>
                      <div className="text-right hidden sm:block">
                        <p className="text-sm font-bold text-white/70">{formatTime(set.avgTimeSeconds)}</p>
                        <p className="text-[9px] uppercase tracking-widest text-white/40">Avg Time</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-bold ${set.completionRate >= 80 ? "text-policeGreen" : set.completionRate >= 50 ? "text-policeGold" : "text-policeRed"}`}>{set.completionRate}%</p>
                        <p className="text-[9px] uppercase tracking-widest text-white/40">Complete</p>
                      </div>
                      <ChevronRight size={18} className="text-white/30 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  // ── DETAILED ANALYTICS ──
  const drillSet = analytics?.drillSet ?? null;
  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <button onClick={() => { setSelectedSetId(null); setAnalytics(null); }}
        className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition">
        <ArrowLeft size={16} /> All Drill Sets
      </button>

      {analyticsLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 size={32} className="text-policeGold animate-spin" />
          <p className="text-white/50 text-sm uppercase tracking-widest">Loading detailed analytics...</p>
        </div>
      ) : !analytics || !drillSet ? (
        <div className="card text-center py-16">
          <p className="text-white/60">Could not load analytics for this drill set.</p>
        </div>
      ) : (
        <>
          {/* Drill Set Header */}
          <div className="bg-white/5 p-6 rounded-3xl border border-white/10">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-full ${
                drillSet.cardType === "capitalization"
                  ? "bg-violet-500/20 text-violet-300"
                  : drillSet.cardType === "sentence_types"
                    ? "bg-teal-500/20 text-teal-300"
                    : drillSet.cardType === "sentence_combining"
                      ? "bg-sky-500/20 text-sky-300"
                    : drillSet.cardType === "true_false"
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-orange-500/20 text-orange-400"
              }`}>
                {drillSet.cardType === "capitalization" ? <PenLine size={28} /> : drillSet.cardType === "sentence_types" ? <Braces size={28} /> : drillSet.cardType === "sentence_combining" ? <Merge size={28} /> : drillSet.cardType === "true_false" ? <Scale size={28} /> : <Flame size={28} />}
              </div>
              <div>
                <h2 className="text-2xl font-heading font-bold text-white">{drillSet.title}</h2>
                <p className="text-sm text-white/50">
                  {drillSet.cardType === "capitalization" || drillSet.cardType === "sentence_types" || drillSet.cardType === "sentence_combining" || drillSet.cardType === "true_false"
                    ? `${drillSet.question_count} items • self-paced ${
                        drillSet.cardType === "sentence_combining"
                          ? "sentence combining"
                          : drillSet.cardType === "sentence_types"
                            ? "sentence classification"
                            : drillSet.cardType === "true_false"
                              ? "true or false"
                              : "capitalization"
                      } practice`
                    : `${drillSet.question_count} questions • ${drillSet.time_limit_minutes}m target`}
                </p>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            <div className="bg-white/5 rounded-2xl p-5 border border-white/10 text-center">
              <Users size={24} className="text-blue-400 mx-auto mb-2" />
              <p className="text-[10px] uppercase tracking-widest text-white/50 mb-1">Total Attempts</p>
              <p className="text-3xl font-bold text-white">{analytics.summary.totalAttempts}</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-5 border border-white/10 text-center">
              <CheckCircle2 size={24} className="text-policeGreen mx-auto mb-2" />
              <p className="text-[10px] uppercase tracking-widest text-white/50 mb-1">Completed</p>
              <p className="text-3xl font-bold text-policeGreen">{analytics.summary.completedAttempts}</p>
            </div>
            <div className="bg-policeGreen/5 rounded-2xl p-5 border border-policeGreen/20 text-center">
              <Trophy size={24} className="text-policeGreen mx-auto mb-2" />
              <p className="text-[10px] uppercase tracking-widest text-white/50 mb-1">Mastered</p>
              <p className="text-3xl font-bold text-policeGreen">{analytics.summary.masteredStudents}</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-5 border border-white/10 text-center">
              <Target size={24} className="text-policeGold mx-auto mb-2" />
              <p className="text-[10px] uppercase tracking-widest text-white/50 mb-1">Mastery Rate</p>
              <p className="text-3xl font-bold text-policeGold">{analytics.summary.masteryRate}%</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-5 border border-white/10 text-center">
              <Target size={24} className={`mx-auto mb-2 ${getScoreColor(analytics.summary.avgScorePercent)}`} />
              <p className="text-[10px] uppercase tracking-widest text-white/50 mb-1">Avg Score</p>
              <p className={`text-3xl font-bold ${getScoreColor(analytics.summary.avgScorePercent)}`}>{analytics.summary.avgScorePercent}%</p>
            </div>
            {drillSet.cardType === "capitalization" || drillSet.cardType === "sentence_types" || drillSet.cardType === "sentence_combining" || drillSet.cardType === "true_false" ? (
              <div className="bg-white/5 rounded-2xl p-5 border border-white/10 text-center">
                <Repeat size={24} className="text-violet-300 mx-auto mb-2" />
                <p className="text-[10px] uppercase tracking-widest text-white/50 mb-1">Avg Submissions</p>
                <p className="text-3xl font-bold text-violet-300">{analytics.summary.avgSubmissions ?? "—"}</p>
              </div>
            ) : (
              <div className="bg-white/5 rounded-2xl p-5 border border-white/10 text-center">
                <Timer size={24} className="text-policeGold mx-auto mb-2" />
                <p className="text-[10px] uppercase tracking-widest text-white/50 mb-1">Avg Time</p>
                <p className="text-3xl font-bold text-policeGold">{formatTime(analytics.summary.avgTimeSeconds)}</p>
              </div>
            )}
          </div>

          {/* Quit Stats */}
          {analytics.summary.quitAttempts > 0 && (
            <div className="bg-policeRed/5 border border-policeRed/20 rounded-2xl p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle size={22} className="text-policeRed" />
                <div>
                  <p className="text-sm font-bold text-policeRed">
                    {analytics.summary.quitAttempts} quit attempt{analytics.summary.quitAttempts !== 1 ? "s" : ""}
                  </p>
                  <p className="text-xs text-white/50">Students who stopped before finishing</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-white/80 font-mono">
                  {formatTime(analytics.summary.avgQuitTimeSeconds)}
                </p>
                <p className="text-[9px] uppercase tracking-widest text-white/40">Avg time before quitting</p>
              </div>
            </div>
          )}

          {/* Per-Student Breakdown */}
          <div className="card">
            <div className="flex items-center gap-3 mb-6">
              <Users size={20} className="text-policeGold" />
              <h2 className="text-xl font-heading font-bold text-white">Student Performance</h2>
            </div>

            {analytics.students.length === 0 ? (
              <p className="text-white/50 text-center py-8">No students have attempted this drill yet.</p>
            ) : (
              <div className="space-y-2">
                {analytics.students.map((student, idx) => {
                  const expandKey = `${idx}-${student.studentName}`;
                  const isExpanded = expandedStudent === expandKey;
                  const lastTry = student.attemptHistory[student.attemptHistory.length - 1];
                  const stoppedMidTry = lastTry && !lastTry.completed;
                  return (
                    <div key={expandKey}
                      className={`rounded-xl overflow-hidden border ${
                        idx === 0 ? "border-policeGold/20 bg-policeGold/5" : "border-white/10 bg-white/5"
                      }`}>
                      <button
                        onClick={() => setExpandedStudent(isExpanded ? null : expandKey)}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition text-left">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-policeGold/20 flex items-center justify-center text-policeGold font-bold text-sm shrink-0">
                            {idx + 1}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{student.studentName}</p>
                            <p className="text-[10px] text-white/40">
                              {drillSet.cardType === "capitalization" || drillSet.cardType === "sentence_types" || drillSet.cardType === "sentence_combining" || drillSet.cardType === "true_false"
                                ? `${student.attempts} ${student.attempts === 1 ? "session" : "sessions"} • ${student.completed} perfected • ${student.submissions ?? 0} total submissions`
                                : `${student.attempts} ${student.attempts === 1 ? "try" : "tries"} in succession • ${student.completed} completed`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                          <div className="text-right hidden sm:block">
                            <p className={`text-sm font-bold font-mono ${getScoreColor(student.bestScore)}`}>
                              {student.bestScore > 0 ? `${student.bestScore}%` : "—"}
                            </p>
                            <p className="text-[9px] text-white/40">Best</p>
                          </div>
                          <div className="hidden md:block">
                            {student.mastered ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-policeGreen bg-policeGreen/10 px-2 py-1 rounded-full border border-policeGreen/20">
                                <BadgeCheck size={11} /> {drillSet.cardType === "capitalization" || drillSet.cardType === "sentence_types" || drillSet.cardType === "sentence_combining" || drillSet.cardType === "true_false" ? `Perfected · session ${student.masteredAtTry}` : `Mastered · try ${student.masteredAtTry}`}
                              </span>
                            ) : (
                              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full border ${
                                stoppedMidTry
                                  ? "text-orange-400 bg-orange-500/10 border-orange-500/20"
                                  : "text-policeRed bg-policeRed/10 border-policeRed/20"
                              }`}>
                                <Repeat size={11} />
                                {stoppedMidTry
                                  ? `Stopped mid-try after ${student.attempts} ${student.attempts === 1 ? "try" : "tries"}`
                                  : `Stopped after ${student.attempts} ${student.attempts === 1 ? "try" : "tries"}`}
                              </span>
                            )}
                          </div>
                          {isExpanded ? <ChevronUp size={16} className="text-white/40" /> : <ChevronDown size={16} className="text-white/40" />}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-4 pb-4 pt-1 border-t border-white/10">
                          <p className="text-[10px] uppercase tracking-widest text-white/40 mb-2 mt-3">
                            {student.mastered
                              ? (drillSet.cardType === "capitalization" || drillSet.cardType === "sentence_types" || drillSet.cardType === "sentence_combining" || drillSet.cardType === "true_false"
                                  ? `Retried ${student.retriesBeforeStop} ${student.retriesBeforeStop === 1 ? "time" : "times"} before perfecting the lesson on session ${student.masteredAtTry}`
                                  : `Retried ${student.retriesBeforeStop} ${student.retriesBeforeStop === 1 ? "time" : "times"} before mastering on try ${student.masteredAtTry}`)
                              : (drillSet.cardType === "capitalization" || drillSet.cardType === "sentence_types" || drillSet.cardType === "sentence_combining" || drillSet.cardType === "true_false"
                                  ? `Submitted ${student.retriesBeforeStop} ${student.retriesBeforeStop === 1 ? "time" : "times"} before stopping — never got every item correct`
                                  : `Tried ${student.retriesBeforeStop} ${student.retriesBeforeStop === 1 ? "time" : "times"} before stopping — never answered all questions correctly`)}
                          </p>
                          <div className="space-y-1.5">
                            {student.attemptHistory.map((t) => (
                              <div key={t.tryNumber}
                                className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs ${
                                  t.mastered
                                    ? "bg-policeGreen/10 border border-policeGreen/25"
                                    : t.quit
                                      ? "bg-orange-500/5 border border-orange-500/15"
                                      : "bg-white/5 border border-white/10"
                                }`}>
                                <span className="flex items-center gap-2 text-white/60 font-mono">
                                  <Repeat size={11} className="text-white/30" />
                                  Try {t.tryNumber}
                                </span>
                                <span className={`font-bold font-mono ${getScoreColor(t.scorePercent)}`}>
                                  {t.scorePercent}% <span className="text-white/40 font-normal">({t.correctAnswers}/{t.totalQuestions})</span>
                                </span>
                                <span className="text-white/40 hidden sm:block">
                                  {t.completed
                                    ? (drillSet.cardType === "capitalization" || drillSet.cardType === "sentence_types" || drillSet.cardType === "sentence_combining" || drillSet.cardType === "true_false" ? (t.mastered ? "🏆 PERFECTED" : "Completed") : (t.mastered ? "🏆 MASTERED" : "Completed"))
                                    : "Quit mid-try"}
                                </span>
                                {t.submissions !== undefined && (
                                  <span className="text-[10px] font-semibold text-violet-300 bg-violet-500/10 px-2 py-0.5 rounded-full">
                                    {t.submissions} {t.submissions === 1 ? "submission" : "submissions"}
                                  </span>
                                )}
                                <span className="text-white/50 font-mono">{formatTime(t.timeSpentSeconds)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Attempts */}
          <div className="card">
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp size={20} className="text-policeGold" />
              <h2 className="text-xl font-heading font-bold text-white">Recent Attempts</h2>
            </div>

            {analytics.attempts.length === 0 ? (
              <p className="text-white/50 text-center py-8">No attempts yet.</p>
            ) : (
              <div className="space-y-2">
                {analytics.attempts.slice(0, 20).map((attempt) => {
                  const correctCount = attempt.correct_answers ?? attempt.lines_correct ?? 0;
                  const pct = Math.round((correctCount / Math.max(attempt.total_questions, 1)) * 100);
                  const duration = attempt.durationSeconds || attempt.time_spent_seconds || 0;
                  const mastered = !!attempt.mastered;
                  const isCap = drillSet.cardType === "capitalization";
                  const isCombineCard = drillSet.cardType === "sentence_combining";
                  return (
                    <div key={attempt.id} className="bg-white/5 rounded-xl px-4 py-3 border border-white/10 hover:border-white/20 transition">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            mastered
                              ? "bg-policeGreen/20 text-policeGreen"
                              : attempt.completed
                                ? pct >= 60 ? "bg-policeGreen/20 text-policeGreen" : "bg-policeRed/10 text-policeRed"
                                : "bg-orange-500/15 text-orange-400"
                          }`}>
                            {mastered ? <Trophy size={16} /> : attempt.completed ? (pct >= 60 ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />) : <Clock size={16} />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{attempt.student_name}</p>
                            <p className="text-[10px] text-white/40">
                              {correctCount}/{attempt.total_questions} {isCap ? "sentences correct" : isCombineCard ? "chunks perfect" : "answered"}
                              {mastered ? (isCap || isCombineCard ? " • 🏆 Perfected" : " • 🏆 Mastered") : attempt.completed ? " • Completed" : " • Stopped early"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {attempt.completed && (
                            <p className={`text-sm font-bold font-mono ${getScoreColor(pct)}`}>{pct}%</p>
                          )}
                          {attempt.submissions !== undefined && (
                            <span className="text-[10px] font-semibold text-violet-300 bg-violet-500/10 px-2 py-1 rounded-full">
                              {attempt.submissions} {attempt.submissions === 1 ? "submission" : "submissions"}
                            </span>
                          )}
                          {attempt.time_warnings_count > 0 && (
                            <span className="text-[10px] text-policeRed bg-policeRed/10 px-2 py-1 rounded-full">
                              {attempt.time_warnings_count} ⚠
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Time window: start → end + duration */}
                      <div className="mt-2 pl-11 flex items-center gap-3 text-[11px]">
                        <span className="flex items-center gap-1.5 text-white/60">
                          <Clock size={11} className="text-policeGold" />
                          {formatDate(attempt.startTime)} {formatClock(attempt.startTime)}
                          <span className="text-white/30">→</span>
                          {formatDate(attempt.startTime) !== formatDate(attempt.endTime)
                            ? `${formatDate(attempt.endTime)} `
                            : ""}
                          {formatClock(attempt.endTime)}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full font-semibold ${
                          attempt.completed
                            ? "bg-policeGreen/10 text-policeGreen"
                            : "bg-orange-500/10 text-orange-400"
                        }`}>
                          {formatTime(duration)}
                        </span>
                        {!attempt.completed && (
                          <span className="text-[10px] text-orange-400/70">quit after {formatTime(duration)}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

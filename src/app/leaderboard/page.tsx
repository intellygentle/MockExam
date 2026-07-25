"use client";

import { useState, useEffect, useRef } from "react";
import { getSupabase } from "@/lib/supabaseClient";
import { 
  Trophy, Medal, Award, Crown, Loader2, BarChart3, 
  Users, BookOpen, GraduationCap, Shield, School, Sparkles 
} from "lucide-react";

type LeaderboardEntry = {
  id: number;
  student_name: string;
  school_name?: string;
  level: string;
  score: number;
  total_questions: number;
  percentage: number;
  correct_answers: number;
  best_streak: number;
  badges: string[];
  created_at: string;
};

function getRankIcon(rank: number) {
  switch(rank) {
    case 1: return <Crown className="text-yellow-400" size={24} />;
    case 2: return <Medal className="text-gray-300" size={24} />;
    case 3: return <Medal className="text-amber-600" size={24} />;
    default: return <Award className="text-white/20" size={20} />;
  }
}

function Row({ rank, entry }: { rank: number; entry: LeaderboardEntry }) {
  const isTop3 = rank <= 3;
  return (
    <div className={`flex items-center justify-between rounded-2xl border px-4 sm:px-6 py-4 transition-all duration-300
      ${rank === 1 ? "bg-yellow-500/10 border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.15)]" : "bg-white/5 border-white/10"}
      hover:scale-[1.02] hover:border-white/20
    `}>
      <div className="flex items-center gap-3 sm:gap-6 min-w-0">
        <div className="w-10 text-center flex justify-center shrink-0">{getRankIcon(rank)}</div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={`font-bold text-base sm:text-lg truncate ${isTop3 ? "text-white" : "text-white/80"}`}>
              {rank === 1 && <Trophy size={14} className="inline text-yellow-400 mr-1" />}
              {entry.student_name}
            </p>
            {entry.school_name && (
              <span className="text-[10px] bg-white/10 text-white/60 px-2 py-0.5 rounded-full flex items-center gap-1 truncate max-w-[120px]">
                <School size={10} /> {entry.school_name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-white/40">
            <span>{entry.level?.toUpperCase() || "N/A"}</span>
            {entry.badges && entry.badges.length > 0 && (
              <span className="text-policeGold">• {entry.badges[0]}</span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4 sm:gap-6 shrink-0">
        <div className="text-right hidden sm:block">
          <p className="font-mono font-bold text-white/60">{entry.correct_answers}/{entry.total_questions}</p>
          <p className="text-[10px] uppercase tracking-widest text-white/40">Correct</p>
        </div>
        <div className="text-right">
          <p className={`font-mono font-bold text-lg sm:text-xl ${rank === 1 ? "text-yellow-400" : "text-policeGreen"}`}>
            {entry.percentage}%
          </p>
          <p className="text-[10px] uppercase tracking-widest text-white/40">PCT</p>
        </div>
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [activeLevel, setActiveLevel] = useState<"jss3" | "ss3">("jss3");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    loadLeaderboard();
    subscribeToRealtime();

    return () => {
      // Cleanup subscription on unmount
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
    };
  }, [activeLevel]);

  const subscribeToRealtime = async () => {
    try {
      const supabase = await getSupabase();

      // Unsubscribe previous channel if any
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }

      const channel = supabase
        .channel("leaderboard-changes")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "progress",
            filter: `level=eq.${activeLevel}`,
          },
          (payload) => {
            const newEntry = payload.new as LeaderboardEntry;
            if (newEntry && newEntry.level === activeLevel) {
              setEntries((prev) => {
                // Avoid duplicates by checking if ID already exists
                if (prev.some((e) => e.id === newEntry.id)) return prev;
                const updated = [...prev, newEntry].sort(
                  (a, b) => b.percentage - a.percentage
                );
                return updated.slice(0, 20);
              });
            }
          }
        )
        .subscribe();

      channelRef.current = channel;
    } catch {
      // Realtime subscription failed — leaderboard still works with initial load
    }
  };

  const loadLeaderboard = async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = await getSupabase();
      const { data, error: fetchError } = await supabase
        .from("progress")
        .select("*")
        .eq("level", activeLevel)
        .order("percentage", { ascending: false })
        .limit(20);

      if (fetchError) throw fetchError;
      setEntries(data || []);
    } catch {
      setError("Could not load leaderboard. Make sure the progress table exists in Supabase.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 px-4 pb-12">
      <header className="mx-auto max-w-2xl text-center space-y-4">
        <div className="inline-flex justify-center p-4 bg-white/5 rounded-full mb-2">
          <Trophy size={40} className="text-policeGold" />
        </div>
        <h1 className="text-4xl sm:text-5xl font-heading font-bold text-white tracking-tight">Wall of Honor</h1>
        <p className="text-white/60 text-lg">Top performing scholars. Keep practicing to secure your spot!</p>

        {/* Privacy Notice */}
        <div className="bg-policeGold/10 border border-policeGold/20 rounded-xl p-4 flex items-start gap-3 text-left">
          <Shield size={18} className="text-policeGold shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-white/80 font-semibold">🛡️ Your score is public</p>
            <p className="text-xs text-white/50 mt-1">
              When you complete a practice session, your nickname, school, and score show up here instantly. 
              Use a nickname to keep your identity private!
            </p>
          </div>
        </div>

        {/* Live indicator */}
        {!loading && entries.length > 0 && (
          <div className="flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest text-white/40">
            <span className="w-1.5 h-1.5 rounded-full bg-policeGreen animate-pulse"></span>
            Live — updates in real time
            <span className="text-white/30 text-[9px]">|</span>
            <span className="text-white/30">{entries.length} scholars</span>
          </div>
        )}
      </header>

      {/* Level Tabs */}
      <div className="mx-auto max-w-2xl">
        <div className="flex bg-white/5 rounded-2xl p-1.5 border border-white/10">
          <button
            onClick={() => setActiveLevel("jss3")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold uppercase tracking-widest transition-all ${
              activeLevel === "jss3"
                ? "bg-policeGreen/20 text-policeGreen shadow-sm"
                : "text-white/50 hover:text-white/80"
            }`}
          >
            <BookOpen size={16} />
            JSS3
          </button>
          <button
            onClick={() => setActiveLevel("ss3")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold uppercase tracking-widest transition-all ${
              activeLevel === "ss3"
                ? "bg-policeGold/20 text-policeGold shadow-sm"
                : "text-white/50 hover:text-white/80"
            }`}
          >
            <GraduationCap size={16} />
            SS3
          </button>
        </div>
      </div>

      {/* Leaderboard Content */}
      <section className="mx-auto max-w-2xl space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <Loader2 size={32} className="text-policeGold animate-spin" />
            <p className="text-white/50 text-sm uppercase tracking-widest">Loading Rankings...</p>
          </div>
        ) : error ? (
          <div className="card text-center py-12">
            <BarChart3 size={40} className="text-white/20 mx-auto mb-4" />
            <p className="text-white/60">{error}</p>
            <p className="text-white/40 text-sm mt-2">Complete a practice session to appear on the board!</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="card text-center py-12">
            <Users size={40} className="text-white/20 mx-auto mb-4" />
            <p className="text-white/60">No scores yet for {activeLevel.toUpperCase()}</p>
            <p className="text-white/40 text-sm mt-2">Be the first to take a practice test!</p>
          </div>
        ) : (
          <>
            {entries.map((entry, index) => (
              <Row key={entry.id} rank={index + 1} entry={entry} />
            ))}
            <div className="text-center pt-4">
              <p className="text-[10px] uppercase tracking-widest text-white/30 flex items-center justify-center gap-2">
                <Sparkles size={12} />
                Scores update in real time as students complete practice sessions
                <Sparkles size={12} />
              </p>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

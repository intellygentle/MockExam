"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import QuestionCard from "@/components/QuestionCard";
import BadgeChip from "@/components/BadgeChip";
import { motion } from "framer-motion";
import { Zap, Crown, Flame } from "lucide-react";

export type Sticker = { id: number; url: string; active: boolean };

// Type definitions remain the same...
type SupaRow = {
  id: number;
  category: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: "a" | "b" | "c" | "d";
  explanation: string;
};

type Question = {
  id: number;
  category: string;
  question: string;
  options: Record<"a" | "b" | "c" | "d", string>;
  correct: "a" | "b" | "c" | "d";
  explanation: string;
};

export default function PracticePage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [state, setState] = useState({ index: 0, points: 0, streak: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      // Fetch Questions
      const { data: qData, error: qError } = await supabase
        .from<"questions", SupaRow>("questions")
        .select("*")
        .order("id", { ascending: true });

      // Fetch active Stickers
      const { data: sData } = await supabase
        .from("stickers")
        .select("*")
        .eq("active", true);

      if (sData) setStickers(sData);

      if (qError) {
        setError("Failed to load questions. Refresh to retry.");
      } else if (qData) {
        const mapped = qData.map((q) => ({
          id: q.id,
          category: q.category,
          question: q.question,
          options: { a: q.option_a, b: q.option_b, c: q.option_c, d: q.option_d },
          correct: q.correct_option,
          explanation: q.explanation,
        }));
        // Shuffle questions for practice
        setQuestions(mapped.sort(() => Math.random() - 0.5));
      }
      setLoading(false);
    })();
  }, []);

  const handleAnswer = (correct: boolean) => {
    setState((prev) => ({
      index: prev.index, // We keep the index on until they hit "Next Question"
      points: prev.points + (correct ? 10 : 0),
      streak: correct ? prev.streak + 1 : 0,
    }));
  };

  const nextQuestion = () => {
    setState(prev => ({ ...prev, index: (prev.index + 1) % questions.length }));
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 opacity-50 space-y-4">
        <div className="w-12 h-12 border-4 border-policeGold border-t-transparent rounded-full animate-spin"></div>
        <p className="uppercase tracking-widest text-sm font-semibold">Deploying Mock Arena...</p>
      </div>
    );
  }

  if (error || questions.length === 0) {
    return (
      <div className="card border border-policeRed/50 p-8 text-center bg-policeRed/5 mx-auto max-w-2xl mt-10">
        <p className="text-policeRed font-semibold text-xl mb-2">Sector Clear (No Questions)</p>
        <p className="text-white/60">Head over to the admin panel to dispatch some questions.</p>
      </div>
    );
  }

  const q = questions[state.index];

  return (
    <div className="space-y-8 pb-10">
      <header className="mx-auto max-w-3xl space-y-4 text-center">
        <h1 className="text-3xl font-heading font-bold text-policeGold uppercase tracking-widest">
          Practice Arena
        </h1>
        
        {/* Real-time stats */}
        <div className="flex justify-center gap-3 sm:gap-6 pt-2">
          <div className="flex items-center gap-3 rounded-2xl bg-white/5 border border-white/10 px-5 py-3 shadow-lg">
            <Zap className="text-policeGold" size={24} />
            <div className="text-left">
              <p className="text-[10px] uppercase tracking-widest text-white/50">Points</p>
              <p className="text-xl font-bold">{state.points}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-white/5 border border-white/10 px-5 py-3 shadow-lg">
            <Flame className={state.streak > 2 ? "text-policeRed animate-pulse" : "text-orange-400"} size={24} />
            <div className="text-left">
              <p className="text-[10px] uppercase tracking-widest text-white/50">Streak</p>
              <p className="text-xl font-bold">{state.streak}</p>
            </div>
          </div>
        </div>
      </header>

      <motion.div
        key={state.index}
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -50 }}
        transition={{ duration: 0.4 }}
      >
        <QuestionCard 
          question={q} 
          onAnswer={handleAnswer} 
          onNext={nextQuestion}
          stickers={stickers}
        />
      </motion.div>

      <section className="mx-auto max-w-2xl mt-12 bg-white/5 rounded-3xl p-6 border border-white/10 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-white/50 mb-4 flex items-center justify-center gap-2">
          <Crown size={14} /> Badges Unlocked
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <BadgeChip label="Rookie" earned={state.points >= 10} />
          <BadgeChip label="Detective" earned={state.points >= 50} />
          <BadgeChip label="Sharp Shooter" earned={state.streak >= 5} />
          <BadgeChip label="Recruit Ready" earned={state.points >= 90} />
        </div>
      </section>
    </div>
  );
}
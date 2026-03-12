// "use client";

// import { useState, useEffect } from "react";
// import { supabase } from "@/lib/supabaseClient";
// import QuestionCard from "@/components/QuestionCard";
// import BadgeChip from "@/components/BadgeChip";
// import { motion } from "framer-motion";
// import { Zap, Crown, Flame } from "lucide-react";

// export type Sticker = { id: number; url: string; active: boolean };

// // Type definitions remain the same...
// type SupaRow = {
//   id: number;
//   category: string;
//   question: string;
//   option_a: string;
//   option_b: string;
//   option_c: string;
//   option_d: string;
//   correct_option: "a" | "b" | "c" | "d";
//   explanation: string;
// };

// type Question = {
//   id: number;
//   category: string;
//   question: string;
//   options: Record<"a" | "b" | "c" | "d", string>;
//   correct: "a" | "b" | "c" | "d";
//   explanation: string;
// };

// export default function PracticePage() {
//   const [questions, setQuestions] = useState<Question[]>([]);
//   const [stickers, setStickers] = useState<Sticker[]>([]);
//   const [state, setState] = useState({ index: 0, points: 0, streak: 0 });
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);

//   useEffect(() => {
//     (async () => {
//       // Fetch Questions
//       const { data: qData, error: qError } = await supabase
//         .from<"questions", SupaRow>("questions")
//         .select("*")
//         .order("id", { ascending: true });

//       // Fetch active Stickers
//       const { data: sData } = await supabase
//         .from("stickers")
//         .select("*")
//         .eq("active", true);

//       if (sData) setStickers(sData);

//       if (qError) {
//         setError("Failed to load questions. Refresh to retry.");
//       } else if (qData) {
//         const mapped = qData.map((q) => ({
//           id: q.id,
//           category: q.category,
//           question: q.question,
//           options: { a: q.option_a, b: q.option_b, c: q.option_c, d: q.option_d },
//           correct: q.correct_option,
//           explanation: q.explanation,
//         }));
//         // Shuffle questions for practice
//         setQuestions(mapped.sort(() => Math.random() - 0.5));
//       }
//       setLoading(false);
//     })();
//   }, []);

//   const handleAnswer = (correct: boolean) => {
//     setState((prev) => ({
//       index: prev.index, // We keep the index on until they hit "Next Question"
//       points: prev.points + (correct ? 10 : 0),
//       streak: correct ? prev.streak + 1 : 0,
//     }));
//   };

//   const nextQuestion = () => {
//     setState(prev => ({ ...prev, index: (prev.index + 1) % questions.length }));
//   }

//   if (loading) {
//     return (
//       <div className="flex flex-col items-center justify-center h-64 opacity-50 space-y-4">
//         <div className="w-12 h-12 border-4 border-policeGold border-t-transparent rounded-full animate-spin"></div>
//         <p className="uppercase tracking-widest text-sm font-semibold">Deploying Mock Tests...</p>
//       </div>
//     );
//   }

//   if (error || questions.length === 0) {
//     return (
//       <div className="card border border-policeRed/50 p-8 text-center bg-policeRed/5 mx-auto max-w-2xl mt-10">
//         <p className="text-policeRed font-semibold text-xl mb-2">Sector Clear (No Questions)</p>
//         <p className="text-white/60">Head over to the admin panel to dispatch some questions.</p>
//       </div>
//     );
//   }

//   const q = questions[state.index];

//   return (
//     <div className="space-y-8 pb-10">
//       <header className="mx-auto max-w-3xl space-y-4 text-center">
//         <h1 className="text-3xl font-heading font-bold text-policeGold uppercase tracking-widest">
//           Practice Ground
//         </h1>
        
//         {/* Real-time stats */}
//         <div className="flex justify-center gap-3 sm:gap-6 pt-2">
//           <div className="flex items-center gap-3 rounded-2xl bg-white/5 border border-white/10 px-5 py-3 shadow-lg">
//             <Zap className="text-policeGold" size={24} />
//             <div className="text-left">
//               <p className="text-[10px] uppercase tracking-widest text-white/50">Points</p>
//               <p className="text-xl font-bold">{state.points}</p>
//             </div>
//           </div>
//           <div className="flex items-center gap-3 rounded-2xl bg-white/5 border border-white/10 px-5 py-3 shadow-lg">
//             <Flame className={state.streak > 2 ? "text-policeRed animate-pulse" : "text-orange-400"} size={24} />
//             <div className="text-left">
//               <p className="text-[10px] uppercase tracking-widest text-white/50">Streak</p>
//               <p className="text-xl font-bold">{state.streak}</p>
//             </div>
//           </div>
//         </div>
//       </header>

//       <motion.div
//         key={state.index}
//         initial={{ opacity: 0, x: 50 }}
//         animate={{ opacity: 1, x: 0 }}
//         exit={{ opacity: 0, x: -50 }}
//         transition={{ duration: 0.4 }}
//       >
//         <QuestionCard 
//           question={q} 
//           onAnswer={handleAnswer} 
//           onNext={nextQuestion}
//           stickers={stickers}
//         />
//       </motion.div>

//       <section className="mx-auto max-w-2xl mt-12 bg-white/5 rounded-3xl p-6 border border-white/10 text-center">
//         <p className="text-xs uppercase tracking-[0.3em] text-white/50 mb-4 flex items-center justify-center gap-2">
//           <Crown size={14} /> Badges Unlocked
//         </p>
//         <div className="flex flex-wrap justify-center gap-2">
//           <BadgeChip label="Rookie" earned={state.points >= 10} />
//           <BadgeChip label="Detective" earned={state.points >= 50} />
//           <BadgeChip label="Sharp Shooter" earned={state.streak >= 5} />
//           <BadgeChip label="Recruit Ready" earned={state.points >= 90} />
//         </div>
//       </section>
//     </div>
//   );
// }


"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import QuestionCard from "@/components/QuestionCard";
import BadgeChip from "@/components/BadgeChip";
import { motion } from "framer-motion";
import { Zap, Crown, Flame, Trophy, Target, RefreshCw, Award, TrendingUp } from "lucide-react";
import confetti from "canvas-confetti";

export type Sticker = { id: number; url: string; active: boolean };

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
  const [state, setState] = useState({ 
    index: 0, 
    points: 0, 
    streak: 0, 
    correctAnswers: 0,
    answeredQuestions: new Set<number>() 
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const { data: qData, error: qError } = await supabase
      .from<"questions", SupaRow>("questions")
      .select("*")
      .order("id", { ascending: true });

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
      setQuestions(mapped.sort(() => Math.random() - 0.5));
    }
    setLoading(false);
  };

  const handleAnswer = (correct: boolean) => {
    setState((prev) => {
      const newAnswered = new Set(prev.answeredQuestions);
      newAnswered.add(questions[prev.index].id);
      
      return {
        ...prev,
        points: prev.points + (correct ? 10 : 0),
        streak: correct ? prev.streak + 1 : 0,
        correctAnswers: prev.correctAnswers + (correct ? 1 : 0),
        answeredQuestions: newAnswered,
      };
    });
  };

  const nextQuestion = () => {
    const nextIndex = state.index + 1;
    
    // Check if we've completed all questions
    if (nextIndex >= questions.length) {
      setShowResults(true);
      // Big celebration for completing
      confetti({
        particleCount: 150,
        spread: 120,
        origin: { y: 0.5 },
        colors: ["#FFD700", "#28a745", "#ffffff"],
      });
    } else {
      setState(prev => ({ ...prev, index: nextIndex }));
    }
  };

  const handleRestart = () => {
    setState({
      index: 0,
      points: 0,
      streak: 0,
      correctAnswers: 0,
      answeredQuestions: new Set(),
    });
    setShowResults(false);
    // Reshuffle questions
    setQuestions(prev => [...prev].sort(() => Math.random() - 0.5));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 opacity-50 space-y-4">
        <div className="w-12 h-12 border-4 border-policeGold border-t-transparent rounded-full animate-spin"></div>
        <p className="uppercase tracking-widest text-sm font-semibold">Deploying Mock Tests...</p>
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

  // Results Screen
  if (showResults) {
    const totalQuestions = questions.length;
    const percentage = Math.round((state.correctAnswers / totalQuestions) * 100);
    const passed = percentage >= 60;

    // Performance-based messages
    const getMessage = () => {
      if (percentage >= 90) return {
        title: "🎖️ Outstanding Performance!",
        message: "You are recruit material! The Nigeria Police Force needs officers like you. Your dedication and intelligence are exemplary.",
        color: "text-policeGold"
      };
      if (percentage >= 75) return {
        title: "✅ Excellent Work!",
        message: "You're well-prepared for the screening! Keep up this momentum and you'll excel in the real exam.",
        color: "text-policeGreen"
      };
      if (percentage >= 60) return {
        title: "👍 Good Job!",
        message: "You passed! With a bit more practice, you'll be unstoppable. Review the areas you struggled with.",
        color: "text-blue-400"
      };
      if (percentage >= 40) return {
        title: "💪 Keep Pushing!",
        message: "You're getting there! Don't give up. Every great officer started somewhere. Review your mistakes and try again.",
        color: "text-orange-400"
      };
      return {
        title: "🔄 Practice Makes Perfect",
        message: "Rome wasn't built in a day, and neither is exam mastery. Keep practicing daily, you'll improve. We believe in you!",
        color: "text-white/80"
      };
    };

    const result = getMessage();

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-3xl mx-auto space-y-8"
      >
        {/* Main Results Card */}
        <div className="card relative overflow-hidden">
          <div className={`absolute top-0 left-0 w-full h-2 ${passed ? 'bg-gradient-to-r from-policeGreen via-policeGold to-policeGreen' : 'bg-gradient-to-r from-orange-500 to-policeRed'}`}></div>
          
          <div className="text-center space-y-6 pt-8">
            <div className="inline-flex p-6 bg-white/5 rounded-full">
              <Trophy size={64} className={passed ? "text-policeGold" : "text-orange-400"} />
            </div>

            <div>
              <h2 className={`text-3xl sm:text-4xl font-heading font-bold ${result.color} mb-3`}>
                {result.title}
              </h2>
              <p className="text-white/70 text-lg max-w-xl mx-auto leading-relaxed">
                {result.message}
              </p>
            </div>

            {/* Score Display */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-6">
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <p className="text-[10px] uppercase tracking-widest text-white/50 mb-1">Score</p>
                <p className="text-3xl font-bold text-policeGold">{state.points}</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <p className="text-[10px] uppercase tracking-widest text-white/50 mb-1">Correct</p>
                <p className="text-3xl font-bold text-policeGreen">{state.correctAnswers}/{totalQuestions}</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <p className="text-[10px] uppercase tracking-widest text-white/50 mb-1">Percentage</p>
                <p className="text-3xl font-bold text-white">{percentage}%</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <p className="text-[10px] uppercase tracking-widest text-white/50 mb-1">Best Streak</p>
                <p className="text-3xl font-bold text-orange-400">{state.streak}</p>
              </div>
            </div>

            {/* Badges Earned */}
            <div className="bg-black/30 rounded-2xl p-6 border border-white/5">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Award size={20} className="text-policeGold" />
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">Badges Unlocked</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <BadgeChip label="Rookie" earned={state.points >= 10} />
                <BadgeChip label="Detective" earned={state.points >= 50} />
                <BadgeChip label="Sharp Shooter" earned={state.streak >= 5} />
                <BadgeChip label="Recruit Ready" earned={percentage >= 60} />
                <BadgeChip label="Top Performer" earned={percentage >= 90} />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button
                onClick={handleRestart}
                className="flex-1 flex items-center justify-center gap-2 bg-policeGold text-policeBlue font-bold py-4 rounded-xl hover:brightness-110 transition"
              >
                <RefreshCw size={20} /> Retake Test
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="flex-1 flex items-center justify-center gap-2 bg-white/10 text-white font-bold py-4 rounded-xl hover:bg-white/20 transition border border-white/10"
              >
                <Target size={20} /> Back to Home
              </button>
            </div>
          </div>
        </div>

        {/* Motivational Quote */}
        <div className="card bg-gradient-to-r from-policeBlue/20 to-policeGold/10 border-policeGold/30 text-center">
          <p className="text-sm italic text-white/80">
            "Success is not final, failure is not fatal: it is the courage to continue that counts." 
            <span className="block mt-2 text-[10px] uppercase tracking-widest text-white/50">— Keep Training, Future Officer</span>
          </p>
        </div>
      </motion.div>
    );
  }

  // Active Quiz
  const currentQuestion = questions[state.index];
  const progress = ((state.index + 1) / questions.length) * 100;

  return (
    <div className="space-y-8 pb-10">
      <header className="mx-auto max-w-3xl space-y-4 text-center">
        <h1 className="text-3xl font-heading font-bold text-policeGold uppercase tracking-widest">
          Practice Ground
        </h1>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-white/60">
              Question <span className="text-policeGold font-bold">{state.index + 1}</span> of {questions.length}
            </span>
            <span className="text-white/60">
              {Math.round(progress)}% Complete
            </span>
          </div>
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-policeGold to-policeGreen"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
        
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
          <div className="flex items-center gap-3 rounded-2xl bg-white/5 border border-white/10 px-5 py-3 shadow-lg">
            <TrendingUp className="text-policeGreen" size={24} />
            <div className="text-left">
              <p className="text-[10px] uppercase tracking-widest text-white/50">Correct</p>
              <p className="text-xl font-bold">{state.correctAnswers}</p>
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
          question={currentQuestion} 
          onAnswer={handleAnswer} 
          onNext={nextQuestion}
          stickers={stickers}
        />
      </motion.div>

      <section className="mx-auto max-w-2xl mt-12 bg-white/5 rounded-3xl p-6 border border-white/10 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-white/50 mb-4 flex items-center justify-center gap-2">
          <Crown size={14} /> Badges Progress
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
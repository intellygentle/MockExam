"use client";

import { useState, useRef, useEffect } from "react";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, ArrowRight, AlertTriangle, Sparkles, Loader2, Send, X, ChevronDown, ChevronUp } from "lucide-react";

import { getOptionKeys, type OptionKey, type OptionsRecord } from "@/lib/questions";
import LatexRenderer from "@/components/LatexRenderer";

export type Sticker = { 
  id: number; 
  url: string; 
  active: boolean 
};

export type Question = {
  id: number;
  category: string;
  question: string;
  options: OptionsRecord;
  correct: OptionKey;
  explanation: string;
  passage?: string;
  instruction?: string;
};

type Props = {
  question: Question;
  stickers: Sticker[];
  onAnswer: (correct: boolean, selectedOption?: string) => void;
  onNext: () => void;
};

// Positive encouragement messages for wrong answers
const encouragements = [
  "Every mistake is a step closer to mastery — keep going! 💪",
  "You didn't fail, you just found a way that didn't work. Try again! 🌟",
  "The best scholars are the ones who keep trying — that's you! 🎯",
  "One wrong answer doesn't define you. Your persistence does! 🔥",
  "Mistakes are proof that you're trying — and that's winning! 💯",
  "This is just part of the learning journey. You're doing great! 🚀",
  "Every champion was once a beginner who never gave up 🏆",
  "Keep pushing! Your brain is growing stronger with every attempt 🧠",
  "The only real mistake is the one you don't learn from — so learn and move on! 📚",
  "You're building a stronger foundation with every practice session 🏗️",
  "Don't stop now! Success is just around the corner 🌈",
  "This is how we grow — one challenge at a time. You've got this! 🌱",
  "Practice makes progress, not perfection. Keep at it! ⚡",
  "The fact that you're practicing already puts you ahead! 🎓",
  "Learning is a journey, not a race. Enjoy the climb! ⛰️",
  "Your effort today is your success tomorrow. Stay consistent! 📈",
  "This is just a stepping stone — and you're stepping up! 🪨",
  "Don't be discouraged. Be determined! 💪🔥",
  "You're smarter with every question you answer. Keep learning! 🧠✨",
  "Mistakes are the tuition fees for success — you're paying your way to the top! 🎓",
  "The only way to get better is to keep showing up — and you're doing it! 👏",
  "This is temporary. Your growth is permanent! 🌟",
  "You didn't lose. You learned. That's a win! 🏅",
  "Every wrong answer rewires your brain for the right one next time 🔄",
  "This question will feel easy after a few more tries. Trust the process! 🔁",
  "Your determination is inspiring — don't let one question stop you! 🚀",
  "The difference between who you are and who you want to be is what you practice 👊",
  "Progress, not perfection. You're moving forward every second! ⏩",
  "Keep your head up! The right answer is waiting for you 🎯",
  "You're collecting experience points with every attempt — level up incoming! ⬆️",
  "Rome wasn't built in a day, and neither is exam success. Keep building! 🏛️",
  "Your future self will thank you for not giving up today ⏳",
  "This is how excellence is forged — through fire and practice! 🔥",
  "The struggle you're feeling is growth happening. Embrace it! 🌿",
];

export default function QuestionCard({ question, stickers, onAnswer, onNext }: Props) {
  const optionKeys = getOptionKeys(question.options);
  const [selected, setSelected] = useState<OptionKey | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [activeSticker, setActiveSticker] = useState<string | null>(null);
  const [activeBanter, setActiveBanter] = useState<string>("");

  // AI Explain state
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiExplaining, setAiExplaining] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [followUpText, setFollowUpText] = useState("");
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [retryCooldown, setRetryCooldown] = useState(0);
  const followUpInputRef = useRef<HTMLInputElement>(null);

  // Simple in-memory cache: questionId -> explanation
  const explanationCache = useRef<Map<number, string>>(new Map());
  // Track which questions have had follow-ups appended (to not overwrite)
  const cacheKey = question.id;

  // Cooldown countdown effect
  useEffect(() => {
    if (retryCooldown <= 0) return;
    const timer = setInterval(() => {
      setRetryCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [retryCooldown]);

  const askAi = async (query?: string) => {
    if (aiExplaining || followUpLoading) return;

    // For initial requests (not follow-ups), check cache first
    if (!query) {
      const cached = explanationCache.current.get(cacheKey);
      if (cached) {
        setAiExplanation(cached);
        return;
      }
    }

    if (query) setFollowUpLoading(true);
    else setAiExplaining(true);
    setAiError(null);

    try {
      const res = await fetch("/api/ai/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionText: question.question,
          options: optionKeys.map((k) => question.options[k]),
          correctAnswer: question.options[question.correct],
          explanation: question.explanation,
          passage: question.passage || undefined,
          studentQuery: query?.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Handle quota/rate-limit errors with retry delay
        if (res.status === 429 && data.retryAfter) {
          setRetryCooldown(data.retryAfter);
          throw new Error(`${data.error} ⏳`);
        }
        throw new Error(data.error || "AI service error");
      }

      if (query) {
        const updated = aiExplanation
          ? `${aiExplanation}

---

**Follow-up:** ${query}

${data.explanation}`
          : data.explanation;
        setAiExplanation(updated);
        // Update cache with the follow-up appended version
        explanationCache.current.set(cacheKey, updated);
        setFollowUpText("");
      } else {
        setAiExplanation(data.explanation);
        // Cache the explanation for this question
        explanationCache.current.set(cacheKey, data.explanation);
      }
    } catch (err: any) {
      setAiError(err.message || "Failed to get AI explanation.");
    } finally {
      if (query) setFollowUpLoading(false);
      else setAiExplaining(false);
    }
  };

  const toggleAiPanel = () => {
    const willOpen = !aiPanelOpen;
    setAiPanelOpen(willOpen);
    if (willOpen) {
      // Check cache first before triggering a new request
      const cached = explanationCache.current.get(cacheKey);
      if (cached) {
        setAiExplanation(cached);
        setAiError(null);
      } else if (!aiExplaining) {
        askAi();
      }
    }
  };

  const handleFollowUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (followUpText.trim()) askAi(followUpText);
  };

  // Clear cached explanation when question changes (via key prop)
  useEffect(() => {
    const cached = explanationCache.current.get(cacheKey);
    if (cached) {
      setAiExplanation(cached);
    } else {
      setAiExplanation(null);
      setAiError(null);
      setAiPanelOpen(false);
    }
  }, [cacheKey]);

  const handleSubmit = () => {
    if (!selected) return;
    const correct = selected === question.correct;

    if (correct) {
      confetti({ 
        particleCount: 120, 
        spread: 100, 
        origin: { y: 0.6 },
        colors: ["#FFD700", "#ffffff", "#28a745"] 
      });
    } else {
      // [Temporarily disabled] Pick a random sticker if available
      // if (stickers && stickers.length > 0) {
      //   const randomSticker = stickers[Math.floor(Math.random() * stickers.length)];
      //   setActiveSticker(randomSticker.url);
      // }
      // Pick a random banter quote
      const randomMessage = encouragements[Math.floor(Math.random() * encouragements.length)];
      setActiveBanter(randomMessage);
    }

    setSubmitted(true);
    onAnswer(correct, selected);
  };

  return (
    <div className="card w-full max-w-2xl mx-auto space-y-6 shadow-2xl relative overflow-hidden backdrop-blur-lg border border-white/10">
      <div className="flex justify-between items-start">
        <span className="bg-white/10 px-3 py-1 rounded-full text-[10px] uppercase tracking-[0.3em] text-policeGold font-semibold">
          {question.category}
        </span>
      </div>
      
      {question.instruction && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
          <p className="text-[10px] uppercase tracking-[0.3em] text-policeGold font-semibold">📋 Instruction</p>
          <LatexRenderer text={question.instruction} className="text-sm sm:text-base text-white/80 leading-relaxed whitespace-pre-wrap" as="p" />
        </div>
      )}

      {question.passage && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
          <p className="text-[10px] uppercase tracking-[0.3em] text-policeGold font-semibold">📖 Passage</p>
          <LatexRenderer text={question.passage} className="text-sm sm:text-base text-white/80 leading-relaxed whitespace-pre-wrap" as="p" />
        </div>
      )}

      <h3 className="text-2xl sm:text-3xl font-semibold font-heading text-white leading-tight">
        <LatexRenderer text={question.question} />
      </h3>

      {/* ─── AI Explain Button ─── */}
      <div className="mt-4">
        <button
          onClick={toggleAiPanel}
          className={`group flex items-center gap-2 text-sm font-semibold transition-all duration-300 rounded-xl px-4 py-2.5 ${
            aiPanelOpen
              ? "bg-purple-500/15 border border-purple-500/30 text-purple-300"
              : "bg-white/5 border border-white/10 text-white/60 hover:bg-purple-500/10 hover:border-purple-500/30 hover:text-purple-300"
          }`}
        >
          <Sparkles size={16} className={`transition-transform duration-300 ${aiPanelOpen ? "text-purple-300" : "group-hover:scale-110 group-hover:text-purple-300"}`} />
          <span>{aiPanelOpen ? "Close AI Tutor" : "Ask AI to Explain this Question"}</span>
          {aiPanelOpen ? <ChevronUp size={16} className="ml-auto" /> : <ChevronDown size={16} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />}
        </button>

        {/* ─── AI Explanation Panel ─── */}
        <AnimatePresence>
          {aiPanelOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: "auto", marginTop: 12 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="bg-gradient-to-br from-purple-500/5 to-indigo-500/5 border border-purple-500/20 rounded-2xl p-5 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles size={18} className="text-purple-400" />
                    <span className="text-sm font-bold text-purple-300">AI Tutor</span>
                  </div>
                  <button onClick={() => setAiPanelOpen(false)} className="p-1 rounded-lg hover:bg-white/10 transition text-white/40 hover:text-white/70">
                    <X size={16} />
                  </button>
                </div>

                {/* Loading State */}
                {aiExplaining && (
                  <div className="flex items-center gap-3 py-4">
                    <Loader2 size={20} className="text-purple-400 animate-spin" />
                    <p className="text-sm text-purple-300/70 font-medium">Thinking about this question...</p>
                  </div>
                )}

                {/* Error State */}
                {aiError && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-sm text-red-400">
                    <p className="font-semibold mb-1">⚠️ Unable to get explanation</p>
                    <p className="text-red-300/70">{aiError.replace(" ⏳", "")}</p>
                    {retryCooldown > 0 ? (
                      <p className="mt-3 text-xs text-red-400/70">
                        Retry available in <span className="font-bold">{retryCooldown}s</span>
                      </p>
                    ) : (
                      <button onClick={() => askAi()} className="mt-3 text-sm text-red-400 underline hover:text-red-300 transition">
                        Try again
                      </button>
                    )}
                  </div>
                )}

                {/* AI Explanation */}
                {aiExplanation && !aiExplaining && (
                  <div className="text-sm text-white/85 leading-relaxed space-y-2">
                    {aiExplanation.split("\n").map((line, i) => {
                      if (line.startsWith("**") && line.endsWith("**")) {
                        return <p key={i} className="font-bold text-purple-300 text-base mt-3 first:mt-0">{line.replace(/\*\*/g, "")}</p>;
                      }
                      if (line.startsWith("-")) {
                        return <li key={i} className="ml-4 text-white/80 list-disc">{line.replace(/^-\s*/, "")}</li>;
                      }
                      if (line.trim() === "---") {
                        return <hr key={i} className="border-purple-500/20 my-3" />;
                      }
                      return <p key={i} className="text-white/85">{line}</p>;
                    })}
                  </div>
                )}

                {/* Follow-up Input */}
                <form onSubmit={handleFollowUpSubmit} className="flex items-center gap-2 pt-2 border-t border-purple-500/15">
                  <input
                    ref={followUpInputRef}
                    type="text"
                    value={followUpText}
                    onChange={(e) => setFollowUpText(e.target.value)}
                    placeholder="Ask a follow-up question..."
                    disabled={followUpLoading || aiExplaining}
                    className="flex-1 bg-black/40 border border-white/10 focus:border-purple-500/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/40 outline-none transition disabled:opacity-40"
                  />
                  <button
                    type="submit"
                    disabled={!followUpText.trim() || followUpLoading || aiExplaining}
                    className="p-2.5 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-300 hover:bg-purple-500/30 transition disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {followUpLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  </button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="grid gap-3 mt-4">
        {optionKeys.map((option) => {
          const isCorrect = option === question.correct;
          const isSelected = selected === option;
          
          let stateStyle = "border-white/10 hover:border-white/30 hover:bg-white/5";
          if (isSelected && !submitted) stateStyle = "border-policeGold bg-policeGold/10";
          if (submitted && isCorrect) stateStyle = "bg-policeGreen/20 border-policeGreen text-policeGreen";
          if (submitted && isSelected && !isCorrect) stateStyle = "bg-policeRed/20 border-policeRed text-policeRed";

          return (
            <button
              key={option}
              onClick={() => !submitted && setSelected(option)}
              className={`
                group flex items-center gap-4 rounded-2xl border px-5 py-4 text-left transition-all duration-300
                ${stateStyle}
              `}
              disabled={submitted}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 transition-colors
                ${isSelected && !submitted ? "bg-policeGold text-black" : "bg-white/10 group-hover:bg-white/20"}
                ${submitted && isCorrect ? "bg-policeGreen text-white" : ""}
                ${submitted && isSelected && !isCorrect ? "bg-policeRed text-white" : ""}
              `}>
                {option.toUpperCase()}
              </div>
              <LatexRenderer text={question.options[option]!} className="text-base sm:text-lg font-medium select-none" />
            </button>
          );
        })}
      </div>

      {!submitted ? (
        <button
          onClick={handleSubmit}
          disabled={!selected}
          className="w-full mt-6 rounded-2xl bg-policeGold py-4 text-center font-bold uppercase tracking-widest text-policeBlue transition hover:brightness-110 disabled:opacity-30 disabled:scale-100 hover:scale-[1.02] active:scale-95 shadow-lg"
        >
          Submit 
        </button>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} 
          className="space-y-6 mt-6 p-6 rounded-2xl bg-black/40 border border-white/5"
        >
          {selected === question.correct ? (
            <div className="flex items-start gap-4 text-policeGreen">
              <CheckCircle2 size={28} className="mt-1 shrink-0" />
              <div>
                <p className="font-bold text-xl sm:text-2xl tracking-wide">Nailed It! 🎯</p>
                <p className="text-sm text-policeGreen/80 mt-2 font-medium bg-policeGreen/10 p-4 rounded-xl border border-policeGreen/20">
                  <span className="text-white block mb-1 uppercase tracking-widest text-[10px]">Debriefing:</span>
                  <LatexRenderer text={question.explanation} />
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
              <div className="flex-1 flex flex-col gap-3 w-full">
                <div className="flex items-center gap-2 text-policeRed">
                  <XCircle size={24} className="shrink-0" />
                  <p className="font-bold text-xl uppercase tracking-wider">Oops! Try Again 💪</p>
                </div>
                
                {/* Encouragement Section */}
                <div className="flex gap-3 bg-orange-500/10 border border-orange-500/20 p-4 rounded-xl text-orange-400">
                  <AlertTriangle size={20} className="shrink-0 mt-0.5" />
                  <p className="font-medium italic text-sm sm:text-base">
                    &ldquo;<LatexRenderer text={activeBanter} />&rdquo;
                  </p>
                </div>

                <p className="text-sm text-white/70 mt-2 bg-white/5 p-4 rounded-xl border border-white/10">
                  <span className="font-semibold text-policeGold block mb-1 uppercase tracking-widest text-[10px]">Debriefing:</span> 
                  <LatexRenderer text={question.explanation} />
                </p>
              </div>
              

            </div>
          )}

          <button
            onClick={onNext}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 py-4 text-center font-bold text-white transition active:scale-95 border border-white/10"
          >
            Next Question <ArrowRight size={18} />
          </button>
        </motion.div>
      )}
    </div>
  );
}
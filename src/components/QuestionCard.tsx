"use client";

import { useState } from "react";
import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, ArrowRight, AlertTriangle } from "lucide-react";

export type Sticker = { 
  id: number; 
  url: string; 
  active: boolean 
};

export type Question = {
  id: number;
  category: string;
  question: string;
  options: Record<"a" | "b" | "c" | "d", string>;
  correct: "a" | "b" | "c" | "d";
  explanation: string;
};

type Props = {
  question: Question;
  stickers: Sticker[];
  onAnswer: (correct: boolean) => void;
  onNext: () => void;
};

// Our collection of hilarious Nigerian Police banter
const policeBanter = [
  "Let's not arrest the correct answer next time, recruit.",
  "Ah ah! Are you suspecting the right answer?",
  "Even the IG of Police is shaking his head right now.",
  "This your answer is tracing its way directly to the holding cell.",
  "You missed this one? EFCC might invite you for questioning.",
  "Are you sure you want to be a recruit or you are just passing by?",
  "Oga, park this your answer well well!",
  "Your village people are currently writing a statement against you.",
  "Try again! This one is a complete accidental discharge.",
  "Warrant of arrest issued for this your answer!",
  "If this were the physical screening, you'd be doing frog jump by now.",
  "You are driving one-way with this answer. Reverse!",
  "Let's not arrest the correct answer next time 😭",
  "Even the gateman at Force HQ knows this one 💀",
  "Oga, na guessing you dey guess? 🤦‍♂️",
  "Your village people are working overtime on this exam 😩",
  "Bro picked the wrong suspect from the lineup 🕵️",
  "This one na criminal answer o! Case dismissed 🧑‍⚖️",
  "CP is reviewing your file... it's not looking good 📁",
  "You for just sleep today instead of this performance 😴",
  "Your answer just posted bail and left the station 🏃‍♂️",
  "Even Siri would have gotten this right 🤖",
  "DPO wants to see you in his office... now 🚨",
  "This is why they invented extra lessons 📚",
  "Chai! Who sent you to apply sef? 😂",
  "Na only prayer fit save this your result 🙏",
  "If this was a real exam, your pen would have cried 🖊️😢",
  "The correct answer was waving at you and you still missed it 👋",
  "Alert! Wrong answer detected in Sector 7 🚔",
  "Bro is giving 'I didn't read' energy 📖❌",
  "Your future CO just shed a tear somewhere 😢",
  "You just got a yellow card from the exam referee 🟨",
  "Please return your application form immediately 📝🔙",
  "This answer has been filed under 'wahala' 🗂️",
];

export default function QuestionCard({ question, stickers, onAnswer, onNext }: Props) {
  const [selected, setSelected] = useState<"a" | "b" | "c" | "d" | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [activeSticker, setActiveSticker] = useState<string | null>(null);
  const [activeBanter, setActiveBanter] = useState<string>("");

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
      // Pick a random sticker if available
      if (stickers && stickers.length > 0) {
        const randomSticker = stickers[Math.floor(Math.random() * stickers.length)];
        setActiveSticker(randomSticker.url);
      }
      // Pick a random banter quote
      const randomBanter = policeBanter[Math.floor(Math.random() * policeBanter.length)];
      setActiveBanter(randomBanter);
    }

    setSubmitted(true);
    onAnswer(correct);
  };

  return (
    <div className="card w-full max-w-2xl mx-auto space-y-6 shadow-2xl relative overflow-hidden backdrop-blur-lg border border-white/10">
      <div className="flex justify-between items-start">
        <span className="bg-white/10 px-3 py-1 rounded-full text-[10px] uppercase tracking-[0.3em] text-policeGold font-semibold">
          {question.category}
        </span>
      </div>
      
      <h3 className="text-2xl sm:text-3xl font-semibold font-heading text-white leading-tight">
        {question.question}
      </h3>

      <div className="grid gap-3 mt-4">
        {(["a", "b", "c", "d"] as const).map((option) => {
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
              <p className="text-base sm:text-lg font-medium select-none">{question.options[option]}</p>
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
          Lock into Database
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
                <p className="font-bold text-xl sm:text-2xl tracking-wide">Target Neutralized!</p>
                <p className="text-sm text-policeGreen/80 mt-2 font-medium bg-policeGreen/10 p-4 rounded-xl border border-policeGreen/20">
                  <span className="text-white block mb-1 uppercase tracking-widest text-[10px]">Debriefing:</span>
                  {question.explanation}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
              <div className="flex-1 flex flex-col gap-3 w-full">
                <div className="flex items-center gap-2 text-policeRed">
                  <XCircle size={24} className="shrink-0" />
                  <p className="font-bold text-xl uppercase tracking-wider">Misfire.</p>
                </div>
                
                {/* The Banter Section */}
                <div className="flex gap-3 bg-orange-500/10 border border-orange-500/20 p-4 rounded-xl text-orange-400">
                  <AlertTriangle size={20} className="shrink-0 mt-0.5" />
                  <p className="font-medium italic text-sm sm:text-base">
                    "{activeBanter}"
                  </p>
                </div>

                <p className="text-sm text-white/70 mt-2 bg-white/5 p-4 rounded-xl border border-white/10">
                  <span className="font-semibold text-policeGold block mb-1 uppercase tracking-widest text-[10px]">Debriefing:</span> 
                  {question.explanation}
                </p>
              </div>
              
              {/* WhatsApp Sticker Display */}
              {activeSticker && (
                <motion.div 
                  initial={{ rotate: -15, scale: 0.5, opacity: 0 }} 
                  animate={{ rotate: 5, scale: 1, opacity: 1 }}
                  transition={{ type: "spring", bounce: 0.6, duration: 0.8 }}
                  className="w-32 h-32 sm:w-40 sm:h-40 shrink-0 mt-2 sm:mt-0"
                >
                  <img src={activeSticker} alt="Reaction" className="w-full h-full object-contain filter drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]" />
                </motion.div>
              )}
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
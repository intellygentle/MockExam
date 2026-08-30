"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, ScrollText, MessageSquare, BookOpen,
  ChevronDown, ChevronUp
} from "lucide-react";

type DrillSet = {
  id: number;
  title: string;
  description: string;
  subject_id: number | null;
  level: string;
  time_limit_minutes: number;
  question_count: number;
  card_type?: string;
  subjectName: string;
};

type PassageQuestion = {
  id: number;
  question: string;
  instruction?: string;
};

type Props = {
  set: DrillSet;
  questions: PassageQuestion[];
  studentName: string;
  onDone: () => void;
};

export default function PassageCard({
  set,
  questions,
  studentName,
  onDone,
}: Props) {
  const [showQuestions, setShowQuestions] = useState(true);
  const passageText = set.description || "";

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 py-4 sm:py-6 px-2 sm:px-0">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between gap-2 sm:gap-4"
      >
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-rose-500/20 to-pink-500/20 flex items-center justify-center border border-rose-500/20 shrink-0">
            <ScrollText size={22} className="text-rose-400" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-heading font-bold text-white">
              {set.title}
            </h1>
            <p className="text-white/50 text-sm mt-0.5">
              {set.subjectName} • {set.level.toUpperCase()} • {questions.length} discussion question{questions.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      <button
        onClick={onDone}
        className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition text-xs sm:text-sm shrink-0">
        <ArrowLeft size={16} /> <span className="hidden sm:inline">Back</span>
      </button>
      </motion.div>

      {/* Student info bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white/5 border border-white/10 rounded-xl p-2.5 sm:p-3 flex items-center gap-2 sm:gap-3"
      >
        <div className="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400 text-xs font-bold">
          {studentName ? studentName[0].toUpperCase() : "?"}
        </div>
        <div>
          <p className="text-sm text-white font-semibold">{studentName || "Student"}</p>
          <p className="text-[10px] text-white/40 uppercase tracking-widest">
            📖 Reading Passage — answer questions on paper for class discussion
          </p>
        </div>
      </motion.div>

      {/* Passage Text */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="card border-rose-500/20 bg-gradient-to-br from-rose-500/5 to-pink-500/5"
      >
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/10">
          <BookOpen size={18} className="text-rose-400" />
          <h2 className="text-lg font-heading font-bold text-white">Reading Passage</h2>
        </div>
        <div className="prose prose-invert max-w-none">
          {passageText.split("\n").map((paragraph, i) =>
            paragraph.trim() ? (
              <p key={i} className="text-white/85 leading-relaxed text-[15px] mb-4 last:mb-0">
                {paragraph}
              </p>
            ) : null
          )}
          {!passageText.trim() && (
            <p className="text-white/40 italic">No passage text available.</p>
          )}
        </div>
      </motion.div>

      {/* Discussion Questions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <button
          onClick={() => setShowQuestions(!showQuestions)}
          className="card border-white/10 hover:border-rose-400/30 transition w-full text-left"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare size={18} className="text-rose-400" />
              <h2 className="text-lg font-heading font-bold text-white">
                Discussion Questions ({questions.length})
              </h2>
            </div>
            {showQuestions ? (
              <ChevronUp size={18} className="text-white/40" />
            ) : (
              <ChevronDown size={18} className="text-white/40" />
            )}
          </div>
        </button>

        {showQuestions && (
          <div className="mt-4 space-y-4">
            {questions.length === 0 ? (
              <div className="card border-white/10 text-center py-8">
                <p className="text-white/50">No discussion questions yet.</p>
              </div>
            ) : (
              questions.map((q, idx) => (
                <motion.div
                  key={q.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 + idx * 0.05 }}
                  className="card border-white/10 hover:border-rose-400/20 transition"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center text-rose-400 font-bold text-sm shrink-0">
                      {idx + 1}
                    </div>
                    <div className="space-y-2 flex-1">
                      {q.instruction && (
                        <p className="text-[10px] uppercase tracking-widest text-white/40 bg-white/5 rounded-lg px-2 py-1 inline-block">
                          {q.instruction}
                        </p>
                      )}
                      <p className="text-white/85 text-[15px] leading-relaxed">
                        {q.question}
                      </p>
                      {/* Answer area hint */}
                      <div className="mt-3 p-3 rounded-lg bg-white/[0.03] border border-dashed border-white/10">
                        <p className="text-[11px] text-white/40 italic">
                          ✏️ Write your answer on paper. Discuss with your tutor in class.
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}
      </motion.div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-center pt-4"
      >
        <button
          onClick={onDone}
          className="px-6 py-3 rounded-xl bg-rose-500/20 text-rose-300 font-bold hover:bg-rose-500/30 transition border border-rose-500/30"
        >
          <ArrowLeft size={16} className="inline mr-2" />
          Return to Arena
        </button>
      </motion.div>
    </div>
  );
}
"use client";

import { motion } from "framer-motion";
import { ArrowLeft, BookOpen, CheckCircle2, Loader2, Zap } from "lucide-react";

import LessonBlocks, { type LessonBlock } from "@/components/LessonBlocks";

type Props = {
  /** Rules note title, e.g. "The Laws of Subject–Verb Agreement (12–21)". */
  title: string;
  /** Short intro under the title. */
  description?: string;
  /** Structured rules blocks (heading / text / examples / table …). */
  blocks: LessonBlock[];
  /** Number of questions that follow the study screen. */
  questionCount: number;
  /** Timed-drill target in minutes. */
  timeLimitMinutes: number;
  /** True while the parent starts the drill (loading state on the CTA). */
  starting: boolean;
  /** Start the timed questions (creates the attempt + timer). */
  onStart: () => void;
  /** Back to the drills list. */
  onBack: () => void;
  /** Read-only notes card: hides the question/timer framing and finishes instead of starting a drill. */
  studyOnly?: boolean;
};

/**
 * Study-first screen for timed quiz cards that carry a rules note
 * (lesson_content → { rulesNote: { title, description, blocks } }).
 * The student reads the rules here, then starts the questions; the
 * same note stays available as a reference during the drill.
 */
export default function RulesStudyScreen({
  title,
  description,
  blocks,
  questionCount,
  timeLimitMinutes,
  starting,
  onStart,
  onBack,
  studyOnly = false,
}: Props) {
  return (
    <div className="space-y-5 pb-10">
      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-30 bg-[#030712]/80 backdrop-blur-xl border-b border-white/10 -mx-4 px-3 sm:px-4 py-2.5 sm:py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-2 sm:gap-3">
          <button onClick={onBack} className="flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-sm text-white/60 hover:text-white transition shrink-0">
            <ArrowLeft size={16} /> <span className="hidden sm:inline">Back to Drills</span>
          </button>
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 shrink-0">
              <BookOpen size={11} /> {studyOnly ? "Study Notes" : "Rules Note"}
            </span>
            <span className="text-[11px] sm:text-sm font-bold text-white truncate">{title}</span>
          </div>
          {!studyOnly && (
            <span className="text-[9px] sm:text-xs font-bold bg-white/10 text-white/70 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full shrink-0">
              {questionCount} Qs · {timeLimitMinutes}m
            </span>
          )}
        </div>
      </div>

      {/* ── Rules note ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto card space-y-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-300">
            <BookOpen size={22} />
          </div>
          <div>
            <h2 className="text-xl font-heading font-bold text-white leading-tight">{title}</h2>
            <p className="text-[10px] uppercase tracking-widest text-white/40">
              {studyOnly ? "Read the notes carefully" : "Study the rules first"}
            </p>
          </div>
        </div>

        {description && <p className="text-xs text-white/50 -mt-1">{description}</p>}

        <LessonBlocks blocks={blocks} />
      </motion.div>

      {/* ── Sticky CTA ── */}
      <div className="max-w-3xl mx-auto sticky bottom-4 z-20">
        <motion.button
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          onClick={onStart}
          disabled={starting}
          className="w-full flex items-center justify-center gap-2 bg-policeGold text-policeBlue font-bold py-4 rounded-xl hover:brightness-110 transition shadow-xl shadow-black/40 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {starting ? <Loader2 size={18} className="animate-spin" /> : studyOnly ? <CheckCircle2 size={18} /> : <Zap size={18} />}
          {starting ? "Saving..." : studyOnly ? "I've Studied This — Done" : `I'm Ready — Start the ${questionCount} Questions`}
        </motion.button>
        <p className="text-center text-[10px] uppercase tracking-widest text-white/40 mt-2 bg-[#030712]/80 backdrop-blur rounded-full py-1 inline-block w-full">
          {studyOnly
            ? "📖 Read at your own pace · tap Done when you're ready for the practice questions"
            : `⏱ ${timeLimitMinutes}-minute target · one question at a time · the laws stay open beside the questions`}
        </p>
      </div>
    </div>
  );
}

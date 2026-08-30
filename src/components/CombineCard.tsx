"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import {
  ArrowLeft, Lightbulb, Loader2, CheckCircle2, XCircle,
  Trophy, Send, ShieldCheck, BookOpen, PencilLine, RotateCcw,
  BadgeCheck, Merge, ArrowRight
} from "lucide-react";

type LessonBlock = {
  kind: "heading" | "subheading" | "text" | "bullets" | "examples" | "collapsible" | "review" | "table";
  text?: string;
  items?: string[];
  title?: string;
  headers?: string[];
  rows?: string[][];
};

type Props = {
  set: { id: number; title: string; description: string; level: string };
  studentName: string;
  onDone: () => void;
};

type CheckResult = { correct: boolean; hints: string[]; banter?: string };

export default function CombineCard({ set, studentName, onDone }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [title, setTitle] = useState(set.title);
  const [description, setDescription] = useState(set.description);
  const [lesson, setLesson] = useState<LessonBlock[]>([]);
  const [prompts, setPrompts] = useState<{ prompt: string; source: string }[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [draft, setDraft] = useState("");
  const [result, setResult] = useState<CheckResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const [cardKind, setCardKind] = useState<string>("");
  const [mastered, setMastered] = useState(false);
  const celebratedRef = useRef(false);

  const total = prompts.length;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/lesson-card/card?drill_set_id=${set.id}&student_name=${encodeURIComponent(studentName.trim() || "Anonymous")}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to load this card.");
        }
        const data = await res.json();
        if (cancelled) return;
        setTitle(data.title || set.title);
        setDescription(data.description || set.description);
        setLesson(data.lesson || []);
        setPrompts(data.items || []);
        setCardKind(data.kind || "");
      } catch (e: any) {
        if (!cancelled) setError(e.message || "Something went wrong.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [set.id]);

  useEffect(() => {
    // Reset the draft + result whenever moving to a new question
    setDraft("");
    setResult(null);
    setError("");
  }, [currentIndex]);

  const currentPrompt = prompts[currentIndex];
  const instructionLine = currentPrompt?.source || "";

  const handleCheck = async () => {
    if (checking || mastered) return;
    const answer = draft.trim();
    if (!answer) { setError(cardKind === "error_correction" ? "Rewrite the sentence before checking." : "Type your combined sentence before checking."); return; }
    setChecking(true);
    setError("");
    try {
      const res = await fetch("/api/lesson-card/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          drillSetId: set.id,
          index: currentIndex,
          answer,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Could not check your answer."); return; }
      setResult({ correct: !!data.correct, hints: data.hints || [], banter: data.banter });
      if (data.correct) {
        setCompletedCount((c) => c + 1);
      }
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setChecking(false);
    }
  };

  const [navigating, setNavigating] = useState(false);

  const handleNext = () => {
    if (navigating) return;
    setNavigating(true);
    if (currentIndex + 1 >= total) {
      setMastered(true);
      if (!celebratedRef.current) {
        celebratedRef.current = true;
        confetti({ particleCount: 200, spread: 130, origin: { y: 0.5 }, colors: ["#FFD700", "#28a745", "#ffffff", "#00d4ff"] });
      }
    } else {
      setCurrentIndex((i) => i + 1);
    }
    setTimeout(() => setNavigating(false), 300);
  };

  const renderLessonBlock = (block: LessonBlock, i: number) => {
    switch (block.kind) {
      case "heading":
        return <h3 key={i} className="pt-2 text-base font-heading font-bold text-policeGold tracking-tight border-t border-white/10">{block.text}</h3>;
      case "subheading":
        return <h4 key={i} className="text-xs font-bold uppercase tracking-[0.2em] text-white/80">{block.text}</h4>;
      case "text":
        return <p key={i} className="text-sm text-white/70 leading-relaxed">{block.text}</p>;
      case "bullets":
        return (
          <ul key={i} className="space-y-2">
            {(block.items || []).map((item, j) => (
              <li key={j} className="flex items-start gap-2.5 text-sm text-white/80 leading-relaxed">
                <span className="w-2 h-2 rounded-full bg-policeGold shrink-0 mt-1.5" /><span>{item}</span>
              </li>
            ))}
          </ul>
        );
      case "examples":
        return (
          <div key={i} className="bg-policeGold/5 border border-policeGold/20 rounded-2xl p-4 space-y-2">
            <p className="text-[10px] uppercase tracking-[0.2em] text-policeGold font-semibold">{block.title}</p>
            <div className="space-y-1.5">
              {(block.items || []).map((item, j) => (
                <p key={j} className="text-sm text-white/85 leading-relaxed italic">“{item}”</p>
              ))}
            </div>
          </div>
        );
      case "review":
        return (
          <div key={i} className="bg-policeGreen/10 border border-policeGreen/25 rounded-2xl p-4 space-y-2">
            <p className="text-[10px] uppercase tracking-[0.2em] text-policeGreen font-semibold flex items-center gap-1.5"><BadgeCheck size={12} /> {block.title}</p>
            <ul className="space-y-1.5">
              {(block.items || []).map((item, j) => (
                <li key={j} className="flex items-start gap-2 text-sm text-white/85 leading-relaxed"><CheckCircle2 size={14} className="text-policeGreen shrink-0 mt-0.5" /> {item}</li>
              ))}
            </ul>
          </div>
        );
      case "collapsible":
        return (
          <details key={i} className="group bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <summary className="cursor-pointer select-none flex items-center justify-between px-4 py-3 text-xs font-bold text-white/80 hover:bg-white/5 transition list-none">
              <span className="flex items-center gap-2"><Lightbulb size={13} className="text-policeGold" /> {block.title}</span>
              <span className="text-white/40 group-open:rotate-180 transition-transform">▾</span>
            </summary>
            <ul className="px-4 pb-4 space-y-1.5 border-t border-white/10 pt-3">
              {(block.items || []).map((item, j) => (
                <li key={j} className="text-[13px] text-white/70 leading-relaxed flex items-start gap-2"><span className="text-policeGold shrink-0">•</span> {item}</li>
              ))}
            </ul>
          </details>
        );
      case "table":
        return (
          <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead><tr className="border-b border-white/15">
                  {(block.headers || []).map((h, j) => <th key={j} className="py-2 pr-3 text-[9px] uppercase tracking-widest text-white/60 font-bold whitespace-nowrap">{h}</th>)}
                </tr></thead>
                <tbody>
                  {(block.rows || []).map((row, j) => <tr key={j} className="border-b border-white/5 last:border-0">
                    {row.map((cell, k) => <td key={k} className={`py-2 pr-3 leading-relaxed align-top ${k === 0 ? "font-semibold text-white/90 whitespace-nowrap" : "text-white/70"}`}>{cell}</td>)}
                  </tr>)}
                </tbody>
              </table>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <Loader2 size={36} className="text-policeGold animate-spin" />
        <p className="text-white/50 text-sm uppercase tracking-widest">Loading combine card...</p>
      </div>
    );
  }

  if (error && prompts.length === 0) {
    return (
      <div className="max-w-xl mx-auto card text-center py-16 space-y-4">
        <ShieldCheck size={48} className="text-policeRed mx-auto" />
        <h2 className="text-xl font-heading font-bold text-white">Could not load this card</h2>
        <p className="text-white/60 text-sm">{error}</p>
        <button onClick={onDone} className="px-5 py-2.5 rounded-xl bg-white/10 text-white text-sm font-bold hover:bg-white/20 transition">← Back to Drills</button>
      </div>
    );
  }

  const progressPct = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  return (
    <div className="space-y-5 pb-10">
      {/* Sticky header */}
      <div className="sticky top-0 z-30 bg-[#030712]/80 backdrop-blur-xl border-b border-white/10 -mx-4 px-3 sm:px-4 py-2.5 sm:py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2 sm:gap-3">
          <button onClick={onDone} className="flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-sm text-white/60 hover:text-white transition shrink-0">
            <ArrowLeft size={16} /> <span className="hidden sm:inline">Back to Drills</span>
          </button>
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <span className="hidden sm:flex items-center gap-1.5 text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full shrink-0 bg-sky-500/15 text-sky-300">
              <Merge size={11} /> Sentence Combining
            </span>
            <span className="text-[11px] sm:text-sm font-bold text-white truncate">{title}</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <span className={`text-[9px] sm:text-xs font-bold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full flex items-center gap-1 sm:gap-1.5 ${mastered ? "bg-policeGreen/15 text-policeGreen" : "bg-white/10 text-white/70"}`}>
              <CheckCircle2 size={11} /> {completedCount}/{total}
            </span>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-2 w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
          <motion.div className={`h-full rounded-full ${mastered ? "bg-policeGreen" : "bg-gradient-to-r from-sky-400 to-policeGold"}`}
            initial={{ width: 0 }} animate={{ width: `${mastered ? 100 : Math.max(progressPct, (currentIndex / Math.max(total, 1)) * 100)}%` }} transition={{ duration: 0.4 }} />
        </div>
      </div>

      {error && prompts.length > 0 && (
        <div className="max-w-6xl mx-auto bg-policeRed/10 border border-policeRed/30 rounded-xl px-4 py-2.5 text-xs text-policeRed">{error}</div>
      )}

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* LEFT: LESSON NOTE */}
        <div className="card space-y-5 lg:sticky lg:top-24">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/15 text-sky-300"><BookOpen size={22} /></div>
            <div>
              <h2 className="text-xl font-heading font-bold text-white leading-tight">{title}</h2>
              <p className="text-[10px] uppercase tracking-widest text-white/40">Lesson Note</p>
            </div>
          </div>
          {description && <p className="text-xs text-white/50 -mt-1">{description}</p>}
          <div className="space-y-4">{lesson.map(renderLessonBlock)}</div>
        </div>

        {/* RIGHT: SEQUENTIAL PRACTICE */}
        <AnimatePresence mode="wait">
          {mastered ? (
            <motion.div key="mastered" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
              className="card relative overflow-hidden text-center space-y-6">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-sky-400 via-policeGold to-policeGreen" />
              <div className="pt-8 space-y-6">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 12 }}
                  className="inline-flex p-6 bg-gradient-to-br from-policeGold/20 to-policeGreen/20 rounded-full mx-auto">
                  <Trophy size={64} className="text-policeGold" />
                </motion.div>
                <div>
                  <h2 className="text-3xl font-heading font-bold text-white">🏆 Card Perfected!</h2>
                  <p className="text-white/60 mt-1.5">All {total} sentences combined correctly with the right conjunction, order and punctuation.</p>
                </div>
                <div className="bg-policeGreen/10 border border-policeGreen/25 rounded-2xl p-5 text-left space-y-3">
                  <p className="text-sm font-bold text-policeGreen flex items-center gap-2"><BadgeCheck size={16} /> You did it!</p>
                  <p className="text-xs text-white/60">Every one of your answers used the correct subordinating conjunction, kept all the information, and placed the clauses as instructed. Nice work! 💪</p>
                </div>
                <button onClick={onDone}
                  className="w-full flex items-center justify-center gap-2 bg-policeGold text-policeBlue font-bold py-4 rounded-xl hover:brightness-110 transition">
                  <BadgeCheck size={18} /> Back to Drills
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div key={`q-${currentIndex}`} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
              className="card space-y-5">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${cardKind === "error_correction" ? "bg-orange-500/15 text-orange-300" : "bg-sky-500/15 text-sky-300"}`}>{cardKind === "error_correction" ? <PencilLine size={22} /> : <Merge size={22} />}</div>
                <div>
                  <h2 className="text-xl font-heading font-bold text-white leading-tight">{title}</h2>
                  <p className="text-[10px] uppercase tracking-widest text-white/40">{cardKind === "error_correction" ? "Rewrite the sentence correctly" : "Type your combined sentence"}</p>
                </div>
              </div>

              {/* Question number + instruction */}
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-widest bg-white/10 px-2 py-1 rounded-full text-white/50">
                  Question {currentIndex + 1} / {total}
                </span>
                {instructionLine && (
                  <span className="text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full font-bold bg-sky-500/15 text-sky-300">{instructionLine}</span>
                )}
              </div>

              {/* Source sentence(s) */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-1.5">
                {(currentPrompt?.prompt.split("\n") || []).slice(0, 2).map((line, li) => (
                  <p key={li} className="text-base text-white/90 leading-relaxed flex items-start gap-2">
                    {cardKind === "error_correction" ? null : <span className="text-white/25 shrink-0">{li === 0 ? "1." : "2."}</span>}
                    {line}
                  </p>
                ))}
              </div>

              {/* Instruction line (3rd line of prompt if present) */}
              {currentPrompt && currentPrompt.prompt.split("\n").length > 2 && (
                <div className="flex items-start gap-2.5 bg-sky-500/10 border border-sky-500/25 rounded-xl p-3.5">
                  <Lightbulb size={16} className="text-sky-300 shrink-0 mt-0.5" />
                  <p className="text-xs text-white/70 leading-relaxed">
                    <span className="text-sky-300 font-semibold">Instruction: </span>
                    {currentPrompt.prompt.split("\n").slice(2).join(" ")}
                  </p>
                </div>
              )}

              {/* Answer box */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest text-white/40">Your combined sentence</label>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={3}
                  spellCheck={false}
                  placeholder={cardKind === "error_correction" ? "Rewrite the sentence correctly..." : "Combine the two sentences into one..."}
                  className="w-full bg-black/40 border border-white/10 focus:border-sky-400/60 rounded-xl px-4 py-3 text-white text-base leading-relaxed outline-none resize-none transition placeholder:text-white/25"
                />
              </div>

              {/* Result / hint panel */}
              <AnimatePresence>
                {result && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                    className={`rounded-2xl border p-4 overflow-hidden ${result.correct ? "bg-policeGreen/10 border-policeGreen/30" : "bg-amber-500/10 border-amber-500/25"}`}>
                    {result.correct ? (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={20} className="text-policeGreen shrink-0" />
                        <p className="text-sm font-bold text-policeGreen">Correct! Well done.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {cardKind === "error_correction" && result.banter ? (
                          <p className="text-sm text-orange-300 font-medium italic">
                            {result.banter}
                          </p>
                        ) : (
                          <>
                            <p className="text-[10px] uppercase tracking-widest text-amber-400 font-bold flex items-center gap-1.5">
                              <Lightbulb size={11} /> Not quite — here's a hint
                            </p>
                            <ul className="space-y-1">
                              {(result.hints || []).map((hint, j) => (
                                <li key={j} className="text-xs text-amber-100/80 leading-relaxed flex items-start gap-1.5">
                                  <span className="text-amber-400 shrink-0">•</span> {hint}
                                </li>
                              ))}
                            </ul>
                          </>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Actions */}
              {!result?.correct ? (
                <button onClick={handleCheck} disabled={checking}
                  className="w-full flex items-center justify-center gap-2 bg-policeGold text-policeBlue font-bold py-4 rounded-xl hover:brightness-110 transition disabled:opacity-60 disabled:cursor-not-allowed">
                  {checking ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                  {checking ? "Checking..." : "Check My Answer"}
                </button>
              ) : (
                <button onClick={handleNext} disabled={navigating}
                  className="w-full flex items-center justify-center gap-2 bg-policeGreen text-white font-bold py-4 rounded-xl hover:brightness-110 transition disabled:opacity-60 disabled:cursor-not-allowed">
                  {navigating ? <Loader2 size={18} className="animate-spin" /> : currentIndex + 1 >= total ? <BadgeCheck size={18} /> : <ArrowRight size={18} />}
                  {navigating ? "Loading..." : currentIndex + 1 >= total ? "Finish Card" : "Next Question"}
                </button>
              )}

              <p className="text-center text-[10px] uppercase tracking-widest text-white/30">
                {result?.correct
                  ? "✓ Correct — you can move on! Read the lesson note and keep going."
                  : `Get it right to move to the next question · ${completedCount} correct so far`}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
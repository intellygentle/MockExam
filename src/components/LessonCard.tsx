"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import {
  ArrowLeft, Lightbulb, Loader2, CheckCircle2, XCircle,
  Trophy, Send, ShieldCheck, BookOpen, PencilLine, RotateCcw,
  BadgeCheck, Sparkles, Braces, Merge, Scale
} from "lucide-react";

type LessonBlock = {
  kind: "heading" | "subheading" | "text" | "bullets" | "examples" | "collapsible" | "review" | "table";
  text?: string;
  items?: string[];
  title?: string;
  headers?: string[];
  rows?: string[][];
};

type LineResult = { index: number; correct: boolean; hints: string[] };
type CardKind = "capitalize" | "classify" | "combine" | "true_false";

/** Options shown for classify cards (sentence types). */
const CLASSIFY_OPTIONS = ["Simple", "Compound", "Complex", "Compound-Complex"];

/** Options shown for true/false cards. */
const TRUE_FALSE_OPTIONS = ["True", "False"];

type Props = {
  set: { id: number; title: string; description: string; level: string };
  studentName: string;
  schoolName: string;
  /** When true, opens the practice pane directly (fresh attempt) instead of the mastered/trophy screen. */
  freshStart?: boolean;
  onDone: () => void;
};

const fireConfetti = () => {
  confetti({ particleCount: 180, spread: 110, origin: { y: 0.5 }, colors: ["#FFD700", "#28a745", "#ffffff", "#00d4ff"] });
  setTimeout(() => {
    confetti({ particleCount: 90, spread: 70, origin: { y: 0.35 }, colors: ["#FFD700", "#28a745"] });
  }, 300);
};

export default function LessonCard({ set, studentName, schoolName, freshStart, onDone }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [kind, setKind] = useState<CardKind>("capitalize");
  const [title, setTitle] = useState(set.title);
  const [description, setDescription] = useState(set.description);
  const [lesson, setLesson] = useState<LessonBlock[]>([]);
  const [prompts, setPrompts] = useState<{ prompt: string; source: string }[]>([]);
  const [edits, setEdits] = useState<string[]>([]);
  const [selections, setSelections] = useState<(string | null)[]>([]);
  const [results, setResults] = useState<(LineResult | null)[]>([]);
  const [locked, setLocked] = useState<boolean[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submissionNumber, setSubmissionNumber] = useState(0);
  const [mastered, setMastered] = useState(false);
  const celebratedRef = useRef(false);

  const totalLines = prompts.length;
  const correctCount = results.filter((r) => r?.correct).length;
  const isClassify = kind === "classify";
  const isCombine = kind === "combine";
  const isTrueFalse = kind === "true_false";

  // ── Load card (lesson + prompts). Answers never leave the server. ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const name = studentName.trim() || "Anonymous";
        const res = await fetch(`/api/lesson-card/card?drill_set_id=${set.id}&student_name=${encodeURIComponent(name)}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to load this lesson card.");
        }
        const data = await res.json();
        if (cancelled) return;
        setKind(data.kind === "true_false" ? "true_false" : data.kind === "classify" ? "classify" : data.kind === "combine" ? "combine" : "capitalize");
        setTitle(data.title || set.title);
        setDescription(data.description || set.description);
        setLesson(data.lesson || []);
        setPrompts(data.items || []);
        const lineCount = data.lineCount || data.items?.length || 0;
        setEdits((data.items || []).map((it: any) => it.prompt));
        setSelections(new Array(lineCount).fill(null));
        setSubmissionNumber(data.attempt?.submissionsCount || 0);
        if (freshStart) {
          // Re-practice: start a brand-new tracked attempt so the student
          // gets a clean practice pane (no mastered screen, nothing locked).
          setMastered(false);
          setResults(new Array(lineCount).fill(null));
          setLocked(new Array(lineCount).fill(false));
          setSubmissionNumber(0);
          try {
            const startRes = await fetch("/api/lesson-card/submit", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "start",
                studentName: name,
                schoolName: schoolName.trim() || "",
                drillSetId: set.id,
              }),
            });
            const startData = await startRes.json();
            if (startRes.ok && startData.attempt) {
              setSubmissionNumber(startData.attempt.submissionsCount || 0);
            }
          } catch {}
        } else if (data.attempt?.mastered) {
          // Already perfected — show every item as correct
          setResults(new Array(lineCount).fill(null).map((_, i) => ({ index: i, correct: true, hints: [] })));
          setLocked(new Array(lineCount).fill(true));
          setMastered(true);
          if (!celebratedRef.current) {
            celebratedRef.current = true;
            fireConfetti();
          }
        } else if (data.attempt?.lastResults && Array.isArray(data.attempt.lastResults)) {
          // Resume mid-practice: restore per-item results, lock perfect items,
          // and restore the student's own previous answers so nothing is lost.
          const nextResults: (LineResult | null)[] = new Array(lineCount).fill(null);
          const nextLocked: boolean[] = new Array(lineCount).fill(false);
          const nextSelections: (string | null)[] = new Array(lineCount).fill(null);
          const nextEdits: string[] = [...edits];
          for (const r of data.attempt.lastResults) {
            if (r && typeof r.index === "number" && r.index >= 0 && r.index < lineCount) {
              nextResults[r.index] = r;
              if (r.correct) nextLocked[r.index] = true;
              if (typeof r.answer === "string" && r.answer.length > 0) {
                if (data.kind === "classify" || data.kind === "true_false") {
                  nextSelections[r.index] = r.answer;
                } else {
                  nextEdits[r.index] = r.answer;
                }
              }
            }
          }
          setResults(nextResults);
          setLocked(nextLocked);
          setSelections(nextSelections);
          setEdits(nextEdits);
        } else {
          setResults(new Array(lineCount).fill(null));
          setLocked(new Array(lineCount).fill(false));
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message || "Something went wrong.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [set.id]);

  const updateEdit = (i: number, value: string) => {
    const next = [...edits];
    next[i] = value;
    setEdits(next);
  };

  const updateSelection = (i: number, value: string) => {
    const next = [...selections];
    next[i] = value;
    setSelections(next);
  };

  // ── Submit all answers for server-side checking ──
  const handleSubmit = async () => {
    if (submitting || mastered) return;
    const payload = isClassify || isTrueFalse ? selections : edits;
    // A classify/true-false card requires every sentence/statement to have a chosen answer
    if ((isClassify || isTrueFalse) && payload.some((a) => !a || !a.trim())) {
      setError(
        isTrueFalse
          ? "Please answer every statement (True or False) before submitting."
          : "Please select a sentence type for every sentence before submitting."
      );
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/lesson-card/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName: studentName.trim() || "Anonymous",
          schoolName: schoolName.trim() || "",
          drillSetId: set.id,
          answers: payload,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to check your answers.");
        return;
      }
      setSubmissionNumber(data.submissionNumber);
      const nextResults: (LineResult | null)[] = [...results];
      const nextLocked = [...locked];
      for (const r of data.results || []) {
        nextResults[r.index] = r;
        if (r.correct) nextLocked[r.index] = true;
      }
      setResults(nextResults);
      setLocked(nextLocked);
      if (data.mastered) {
        setMastered(true);
        if (!celebratedRef.current) {
          celebratedRef.current = true;
          fireConfetti();
        }
      }
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Start a fresh tracked attempt on the server (resumes an in_progress
  // one if it exists), then reset the practice pane.
  const startFreshAttempt = async () => {
    setSubmissionNumber(0);
    try {
      const res = await fetch("/api/lesson-card/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          studentName: studentName.trim() || "Anonymous",
          schoolName: schoolName.trim() || "",
          drillSetId: set.id,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.attempt) setSubmissionNumber(data.attempt.submissionsCount || 0);
      }
    } catch {}
    setEdits(prompts.map((p) => p.prompt));
    setSelections(new Array(prompts.length).fill(null));
    setResults(new Array(prompts.length).fill(null));
    setLocked(new Array(prompts.length).fill(false));
    setMastered(false);
    setError("");
    celebratedRef.current = false;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <Loader2 size={36} className="text-policeGold animate-spin" />
        <p className="text-white/50 text-sm uppercase tracking-widest">Loading lesson card...</p>
      </div>
    );
  }

  if (error && prompts.length === 0) {
    return (
      <div className="max-w-xl mx-auto card text-center py-16 space-y-4">
        <ShieldCheck size={48} className="text-policeRed mx-auto" />
        <h2 className="text-xl font-heading font-bold text-white">Could not load this card</h2>
        <p className="text-white/60 text-sm">{error}</p>
        <button onClick={onDone} className="px-5 py-2.5 rounded-xl bg-white/10 text-white text-sm font-bold hover:bg-white/20 transition">
          ← Back to Drills
        </button>
      </div>
    );
  }

  const progressPercent = totalLines > 0 ? Math.round((correctCount / totalLines) * 100) : 0;

  // Group prompts by source for section headers (Lesson Practice / Worksheet)
  const sections: { label: string; indices: number[] }[] = [];
  prompts.forEach((p, i) => {
    const label = p.source || "Practice";
    let section = sections.find((s) => s.label === label);
    if (!section) {
      section = { label, indices: [] };
      sections.push(section);
    }
    section.indices.push(i);
  });

  return (
    <div className="space-y-5 pb-10">
      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-30 bg-[#030712]/80 backdrop-blur-xl border-b border-white/10 -mx-4 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <button onClick={onDone} className="flex items-center gap-1.5 text-xs sm:text-sm text-white/60 hover:text-white transition shrink-0">
            <ArrowLeft size={16} /> <span className="hidden sm:inline">Back to Drills</span>
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <span className={`hidden sm:flex items-center gap-1.5 text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full shrink-0 ${
              isCombine ? "bg-sky-500/15 text-sky-300" : isClassify ? "bg-teal-500/15 text-teal-300" : isTrueFalse ? "bg-emerald-500/15 text-emerald-300" : "bg-violet-500/15 text-violet-300"
            }`}>
              {isCombine ? <Merge size={11} /> : isClassify ? <Braces size={11} /> : isTrueFalse ? <Scale size={11} /> : <PencilLine size={11} />} {isCombine ? "Sentence Combining" : isClassify ? "Sentence Types" : isTrueFalse ? "True or False" : "Capitalization"}
            </span>
            <span className="text-xs sm:text-sm font-bold text-white truncate">{title}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {submissionNumber > 0 && (
              <span className="text-[10px] uppercase tracking-widest bg-white/10 text-white/60 px-2 py-1 rounded-full hidden sm:inline">
                Submission #{submissionNumber}
              </span>
            )}
            <span className={`text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${
              mastered ? "bg-policeGreen/15 text-policeGreen" : "bg-white/10 text-white/70"
            }`}>
              <CheckCircle2 size={11} /> {correctCount}/{totalLines || prompts.length || 0}
            </span>
          </div>
        </div>
        {/* Progress bar */}
        <div className="max-w-6xl mx-auto mt-2 w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${mastered ? "bg-policeGreen" : "bg-gradient-to-r from-teal-400 to-policeGold"}`}
            initial={{ width: 0 }}
            animate={{ width: `${mastered ? 100 : progressPercent}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      {error && prompts.length > 0 && (
        <div className="max-w-6xl mx-auto bg-policeRed/10 border border-policeRed/30 rounded-xl px-4 py-2.5 text-xs text-policeRed">
          {error}
        </div>
      )}

      {/* ── Split screen: lesson | practice ── */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* ── LEFT: LESSON NOTE ── */}
        <div className="card space-y-5 lg:sticky lg:top-24">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${isCombine ? "bg-sky-500/15 text-sky-300" : isClassify ? "bg-teal-500/15 text-teal-300" : isTrueFalse ? "bg-emerald-500/15 text-emerald-300" : "bg-violet-500/15 text-violet-300"}`}>
              <BookOpen size={22} />
            </div>
            <div>
              <h2 className="text-xl font-heading font-bold text-white leading-tight">{title}</h2>
              <p className="text-[10px] uppercase tracking-widest text-white/40">Lesson Note</p>
            </div>
          </div>

          {description && <p className="text-xs text-white/50 -mt-1">{description}</p>}

          <div className="space-y-4">
            {lesson.map((block, i) => {
              switch (block.kind) {
                case "heading":
                  return (
                    <h3 key={i} className="pt-2 text-base font-heading font-bold text-policeGold tracking-tight border-t border-white/10">
                      {block.text}
                    </h3>
                  );
                case "subheading":
                  return (
                    <h4 key={i} className="text-xs font-bold uppercase tracking-[0.2em] text-white/80">
                      {block.text}
                    </h4>
                  );
                case "text":
                  return (
                    <p key={i} className="text-sm text-white/70 leading-relaxed">
                      {block.text}
                    </p>
                  );
                case "bullets":
                  return (
                    <ul key={i} className="space-y-2">
                      {(block.items || []).map((item, j) => (
                        <li key={j} className="flex items-start gap-2.5 text-sm text-white/80 leading-relaxed">
                          <span className="w-2 h-2 rounded-full bg-policeGold shrink-0 mt-1.5" />
                          <span>{item}</span>
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
                case "collapsible":
                  return (
                    <details key={i} className="group bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                      <summary className="cursor-pointer select-none flex items-center justify-between px-4 py-3 text-xs font-bold text-white/80 hover:bg-white/5 transition list-none">
                        <span className="flex items-center gap-2">
                          <Sparkles size={13} className="text-policeGold" /> {block.title}
                        </span>
                        <span className="text-white/40 group-open:rotate-180 transition-transform">▾</span>
                      </summary>
                      <ul className="px-4 pb-4 space-y-1.5 border-t border-white/10 pt-3">
                        {(block.items || []).map((item, j) => (
                          <li key={j} className="text-[13px] text-white/70 leading-relaxed flex items-start gap-2">
                            <span className="text-policeGold shrink-0">•</span> {item}
                          </li>
                        ))}
                      </ul>
                    </details>
                  );
                case "review":
                  return (
                    <div key={i} className="bg-policeGreen/10 border border-policeGreen/25 rounded-2xl p-4 space-y-2">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-policeGreen font-semibold flex items-center gap-1.5">
                        <BadgeCheck size={12} /> {block.title}
                      </p>
                      <ul className="space-y-1.5">
                        {(block.items || []).map((item, j) => (
                          <li key={j} className="flex items-start gap-2 text-sm text-white/85 leading-relaxed">
                            <CheckCircle2 size={14} className="text-policeGreen shrink-0 mt-0.5" /> {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                case "table":
                  return (
                    <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-white/15">
                              {(block.headers || []).map((h, j) => (
                                <th key={j} className="py-2 pr-3 text-[9px] uppercase tracking-widest text-white/60 font-bold whitespace-nowrap">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {(block.rows || []).map((row, j) => (
                              <tr key={j} className="border-b border-white/5 last:border-0">
                                {row.map((cell, k) => (
                                  <td key={k} className={`py-2 pr-3 leading-relaxed align-top ${k === 0 ? "font-semibold text-white/90 whitespace-nowrap" : "text-white/70"}`}>
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                default:
                  return null;
              }
            })}
          </div>
        </div>

        {/* ── RIGHT: PRACTICE / EDITOR ── */}
        <AnimatePresence mode="wait">
          {mastered ? (
            <motion.div key="mastered" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
              className="card relative overflow-hidden text-center space-y-6">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-policeGreen via-policeGold to-policeGreen" />
              <div className="pt-8 space-y-6">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 12 }}
                  className="inline-flex p-6 bg-gradient-to-br from-policeGold/20 to-policeGreen/20 rounded-full mx-auto">
                  <Trophy size={64} className="text-policeGold" />
                </motion.div>
                <div>
                  <h2 className="text-3xl font-heading font-bold text-white">🏆 Lesson Perfected!</h2>
                  <p className="text-white/60 mt-1.5">All {totalLines} {isCombine ? "passage chunks rewritten" : isClassify ? "sentences classified" : isTrueFalse ? "statements answered correctly" : "sentences correctly capitalized"}.</p>
                </div>

                <div className="bg-policeGreen/10 border border-policeGreen/25 rounded-2xl p-5 text-left space-y-3">
                  <p className="text-sm font-bold text-policeGreen flex items-center gap-2">
                    <BadgeCheck size={16} /> You did it{submissionNumber > 1 ? ` in ${submissionNumber} submissions` : " on the very first try"}!
                  </p>
                  {submissionNumber > 1 ? (
                    <p className="text-xs text-white/60">
                      It took <span className="text-policeGold font-semibold">{submissionNumber} tries</span> to perfect this
                      lesson — every retry was recorded. Persistence pays off! 💪
                    </p>
                  ) : (
                    <p className="text-xs text-white/60">
                      Perfect on submission #1 — your understanding is already spot on. Keep it up! 🚀
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <span className="text-[10px] uppercase tracking-widest bg-white/10 text-white/60 px-2.5 py-1 rounded-full">
                      Submissions: {submissionNumber}
                    </span>
                    <span className="text-[10px] uppercase tracking-widest bg-policeGreen/15 text-policeGreen px-2.5 py-1 rounded-full">
                      Status: Mastered
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button onClick={onDone}
                    className="flex-[2] flex items-center justify-center gap-2 bg-policeGold text-policeBlue font-bold py-4 rounded-xl hover:brightness-110 transition">
                    <BadgeCheck size={18} /> Back to Drills
                  </button>
                  <button onClick={startFreshAttempt}
                    className="flex-1 flex items-center justify-center gap-2 bg-white/10 text-white font-bold py-4 rounded-xl hover:bg-white/20 transition border border-white/10">
                    <RotateCcw size={18} /> Practice Again
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div key="practice" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
              className="card space-y-5">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${isCombine ? "bg-sky-500/15 text-sky-300" : isClassify ? "bg-teal-500/15 text-teal-300" : isTrueFalse ? "bg-emerald-500/15 text-emerald-300" : "bg-policeGold/15 text-policeGold"}`}>
                  {isCombine ? <Merge size={22} /> : isClassify ? <Braces size={22} /> : isTrueFalse ? <Scale size={22} /> : <PencilLine size={22} />}
                </div>
                <div>
                  <h2 className="text-xl font-heading font-bold text-white leading-tight">
                    {isCombine ? "Rewrite the Passage Chunks" : isClassify ? "Classify the Sentences" : isTrueFalse ? "Judge the Statements" : "Rewrite the Sentences"}
                  </h2>
                  <p className="text-[10px] uppercase tracking-widest text-white/40">
                    {isCombine ? "Combine the choppy sentences" : isClassify ? "Pick the correct sentence type" : isTrueFalse ? "Pick True or False" : "Add the correct capitals"}
                  </p>
                </div>
              </div>

              <div className={`border rounded-xl p-3.5 flex items-start gap-2.5 ${
                isCombine ? "bg-sky-500/10 border-sky-500/25" : isClassify ? "bg-teal-500/10 border-teal-500/25" : isTrueFalse ? "bg-emerald-500/10 border-emerald-500/25" : "bg-violet-500/10 border-violet-500/25"
              }`}>
                <Lightbulb size={16} className={`${isCombine ? "text-sky-300" : isClassify ? "text-teal-300" : isTrueFalse ? "text-emerald-300" : "text-violet-300"} shrink-0 mt-0.5`} />
                <p className="text-xs text-white/70 leading-relaxed">
                  {isCombine ? (
                    <>Rewrite each chunk below, combining the choppy simple sentences into <span className="text-sky-300 font-semibold">fewer, more sophisticated sentences</span>. Keep every key fact, and join clauses with a FANBOYS word, a subordinating conjunction, or a semicolon. All {totalLines} chunks must be perfected to master the lesson.</>
                  ) : isClassify ? (
                    <>Read each sentence, count its clauses, then choose the correct type: <span className="text-teal-300 font-semibold">Simple · Compound · Complex · Compound-Complex</span>. All {totalLines} must be right to master the lesson.</>
                  ) : isTrueFalse ? (
                    <>Read each statement carefully, then decide if it is <span className="text-emerald-300 font-semibold">True or False</span>. Watch out for absolute words like <span className="text-emerald-300 font-semibold">always, never, every, all</span> — they usually make a statement false. All {totalLines} must be right to master the lesson.</>
                  ) : (
                    <>Fix the <span className="text-violet-300 font-semibold">capitalization only</span> — don't change any words,
                    spellings or punctuation. All {totalLines} sentences must be perfect to master the lesson.</>
                  )}
                </p>
              </div>

              {/* Items grouped by source section */}
              <div className="space-y-5">
                {sections.map((section) => (
                  <div key={section.label} className="space-y-3">
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-teal-300/80 bg-teal-500/10 border border-teal-500/20 px-2 py-1 rounded-full">
                        {section.label}
                      </span>
                      <span className="text-[9px] text-white/30">{section.indices.length} {isCombine ? (section.indices.length === 1 ? "chunk" : "chunks") : isTrueFalse ? (section.indices.length === 1 ? "statement" : "statements") : (section.indices.length === 1 ? "sentence" : "sentences")}</span>
                      <div className="flex-1 h-px bg-white/10" />
                    </div>

                    {section.indices.map((i) => {
                      const prompt = prompts[i];
                      const result = results[i];
                      const isLocked = locked[i];
                      const isCorrect = !!result?.correct;
                      const rows = isCombine
                        ? Math.max(4, Math.ceil((edits[i]?.length || 0) / 52))
                        : Math.max(2, Math.ceil((edits[i]?.length || 0) / 52));
                      return (
                        <div key={i} className="space-y-1.5">
                          <div className={`rounded-2xl border transition-all ${
                            isCorrect
                              ? "border-policeGreen/40 bg-policeGreen/5"
                              : result
                                ? "border-policeRed/30 bg-white/[0.03]"
                                : "border-white/10 bg-white/[0.03] hover:border-white/25"
                          }`}>
                            <div className="flex items-center gap-2 px-3.5 pt-2.5">
                              <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                isCorrect ? "bg-policeGreen/20 text-policeGreen" : "bg-white/10 text-white/50"
                              }`}>
                                {i + 1}
                              </span>
                              <span className="text-[9px] uppercase tracking-widest text-white/40 flex-1">
                                {isCombine ? "Chunk" : isTrueFalse ? "Statement" : "Sentence"} {i + 1}
                              </span>
                              {isCorrect ? (
                                <span className="text-[9px] font-bold text-policeGreen bg-policeGreen/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <CheckCircle2 size={10} /> Perfect
                                </span>
                              ) : result ? (
                                <span className="text-[9px] font-bold text-policeRed bg-policeRed/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <XCircle size={10} /> Needs work
                                </span>
                              ) : (
                                <span className="text-[9px] text-white/30">{isClassify ? "Select a type" : isTrueFalse ? "Pick True or False" : isCombine ? "Rewrite & submit" : "Edit & submit"}</span>
                              )}
                            </div>

                            {/* Original sentence / chunk text */}
                            <div className="px-5 pt-1 pb-1">
                              {isCombine ? (
                                <div className="space-y-1">
                                  {prompt.prompt.split("\n").map((line, li) => (
                                    <p key={li} className="text-sm sm:text-base text-white/90 leading-relaxed flex items-start gap-2">
                                      <span className="text-white/25 shrink-0">•</span> {line}
                                    </p>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm sm:text-base text-white/90 leading-relaxed">{prompt.prompt}</p>
                              )}
                            </div>

                            {/* Answer input */}
                            <div className="px-2.5 pb-2.5 pt-1">
                              {isClassify || isTrueFalse ? (
                                <div className={`flex flex-wrap gap-1.5 ${isLocked ? "pointer-events-none opacity-70" : ""}`}>
                                  {(isClassify ? CLASSIFY_OPTIONS : TRUE_FALSE_OPTIONS).map((opt) => {
                                    const selected = selections[i] === opt;
                                    return (
                                      <button key={opt} type="button" onClick={() => updateSelection(i, opt)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                                          selected
                                            ? isCorrect
                                              ? "border-policeGreen/50 bg-policeGreen/15 text-policeGreen"
                                              : "border-policeGold/60 bg-policeGold/15 text-policeGold"
                                            : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                                        }`}>
                                        {opt}
                                      </button>
                                    );
                                  })}
                                </div>
                              ) : (
                                <textarea
                                  value={edits[i] ?? ""}
                                  onChange={(e) => updateEdit(i, e.target.value)}
                                  disabled={isLocked}
                                  rows={rows}
                                  spellCheck={false}
                                  className={`w-full bg-transparent px-2 py-1.5 text-sm sm:text-base text-white leading-relaxed outline-none resize-none rounded-lg transition ${
                                    isCorrect ? "text-policeGreen/90" : "placeholder:text-white/30"
                                  } disabled:cursor-default`}
                                />
                              )}
                            </div>
                          </div>

                          {/* Hint for wrong items */}
                          <AnimatePresence>
                            {result && !isCorrect && (
                              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                                className="bg-amber-500/10 border border-amber-500/25 rounded-xl px-3.5 py-2.5 overflow-hidden">
                                <p className="text-[10px] uppercase tracking-widest text-amber-400 font-bold flex items-center gap-1.5 mb-1">
                                  <Lightbulb size={11} /> Hint for {isTrueFalse ? "statement" : isCombine ? "chunk" : "sentence"} {i + 1}
                                </p>
                                <ul className="space-y-1">
                                  {(result.hints || []).map((hint, j) => (
                                    <li key={j} className="text-xs text-amber-100/80 leading-relaxed flex items-start gap-1.5">
                                      <span className="text-amber-400 shrink-0">•</span> {hint}
                                    </li>
                                  ))}
                                </ul>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Progress */}
              <div className="flex items-center justify-between text-xs">
                <span className="uppercase tracking-widest text-white/40 text-[10px]">Mastery Progress</span>
                <span className="text-white/70 font-semibold">{correctCount}/{totalLines} {isCombine ? "chunks perfect" : isClassify ? "classified" : isTrueFalse ? "statements correct" : "sentences correct"}</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-teal-400 to-policeGold"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>

              {correctCount > 0 && correctCount < totalLines && (
                <p className="text-[11px] text-white/40 -mt-1">
                  ✓ Correct {isClassify ? "sentences are locked" : isTrueFalse ? "statements are locked" : isCombine ? "chunks are locked" : "lines are locked"} — fix the remaining {totalLines - correctCount} to perfect the lesson.
                </p>
              )}

              <button onClick={handleSubmit} disabled={submitting}
                className="w-full flex items-center justify-center gap-2 bg-policeGold text-policeBlue font-bold py-4 rounded-xl hover:brightness-110 transition disabled:opacity-60 disabled:cursor-not-allowed">
                {submitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                {submitting ? "Checking your answers..." : submissionNumber > 0 ? `Try Again (Submission #${submissionNumber + 1})` : "Submit My Answers"}
              </button>

              {submissionNumber > 0 && (
                <p className="text-center text-[10px] uppercase tracking-widest text-white/30">
                  Retries so far: {submissionNumber - 1} · every submission is tracked
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, BookOpen, Bookmark, Timer, Check, X,
  ChevronDown, ChevronRight, Sword, Sparkles, Target
} from "lucide-react";

// ── TYPES ──

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

type VocabWord = {
  id: number;
  word: string;
  meaning: string;
};

export type GapChunk = {
  text: string;   // chunk text; use "___" to mark a gap
  gapWord: string | null; // the word that fills the gap, or null
};

type Phase = "study" | "recall" | "correct" | "wrong" | "complete" | "gapfill" | "gapfillDone";

type Props = {
  set: DrillSet;
  words: VocabWord[];
  studentName: string;
  onDone: () => void;
  gapChunks?: GapChunk[]; // optional fill-in-the-gap final test
};

const STUDY_SECONDS = 15;

// ── COMPONENT ──

export default function VocabularyCard({ set, words, studentName, onDone, gapChunks }: Props) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>("study");
  const [timeLeft, setTimeLeft] = useState(STUDY_SECONDS);
  const [userInput, setUserInput] = useState("");
  const [processing, setProcessing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Gapfill state
  const [gapChunkIdx, setGapChunkIdx] = useState(0);
  const [selectedGapWord, setSelectedGapWord] = useState<string | null>(null);
  const [gapFeedback, setGapFeedback] = useState<"idle" | "correct" | "wrong">("idle");
  const [usedWords, setUsedWords] = useState<Set<string>>(new Set());

  const currentWord = words[currentIdx] ?? null;
  const vocabProgress = words.length > 0 ? ((currentIdx) / words.length) * 100 : 0;

  const hasGapTest = gapChunks && gapChunks.length > 0;
  const currentChunk = hasGapTest ? gapChunks![gapChunkIdx] ?? null : null;
  const allChunksRevealed = hasGapTest ? gapChunkIdx >= gapChunks!.length : false;

  // ── Study countdown ──
  useEffect(() => {
    if (phase !== "study") return;
    let count = STUDY_SECONDS;
    setTimeLeft(count);
    timerRef.current = setInterval(() => {
      count--;
      if (count <= 0) {
        clearInterval(timerRef.current!);
        setTimeLeft(0);
        setPhase("recall");
      } else {
        setTimeLeft(count);
      }
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, currentIdx]);

  useEffect(() => {
    if (phase === "recall") {
      setUserInput("");
      setTimeout(() => {
        document.getElementById("vocab-recall-input")?.focus();
      }, 100);
    }
  }, [phase]);

  // ── Recall submit ──
  const handleSubmit = useCallback(() => {
    if (!currentWord || processing) return;
    setProcessing(true);
    const norm = userInput.trim().toLowerCase();
    const correct = currentWord.meaning.trim().toLowerCase();
    if (norm === correct) {
      setPhase("correct");
      setTimeout(() => {
        setProcessing(false);
        const next = currentIdx + 1;
        if (next >= words.length) setPhase("complete");
        else { setCurrentIdx(next); setPhase("study"); }
      }, 1200);
    } else {
      setPhase("wrong");
      setTimeout(() => { setProcessing(false); setCurrentIdx(0); setPhase("study"); }, 2000);
    }
  }, [userInput, currentWord, currentIdx, words.length, processing]);

  // ── Gapfill: pick a word from bank ──
  const handlePickWord = (word: string) => {
    if (usedWords.has(word.toLowerCase())) return;
    setSelectedGapWord(word);
    setGapFeedback("idle");
  };

  // ── Gapfill: check answer, advance ──
  const handleGapCheck = () => {
    if (!currentChunk || !currentChunk.gapWord || !selectedGapWord || processing) return;
    setProcessing(true);
    if (selectedGapWord.toLowerCase() === currentChunk.gapWord.toLowerCase()) {
      setGapFeedback("correct");
      setUsedWords((prev) => new Set(prev).add(selectedGapWord.toLowerCase()));
    } else {
      setGapFeedback("wrong");
    }
    setTimeout(() => setProcessing(false), 300);
  };

  const handleGapNext = () => {
    if (processing) return;
    setProcessing(true);
    if (allChunksRevealed) {
      setPhase("gapfillDone");
      return;
    }
    setGapChunkIdx((prev) => prev + 1);
    setSelectedGapWord(null);
    setGapFeedback("idle");
    setTimeout(() => setProcessing(false), 100);
  };

  // ── Start gapfill from complete screen ──
  const handleStartGapfill = () => {
    setGapChunkIdx(0);
    setSelectedGapWord(null);
    setGapFeedback("idle");
    setUsedWords(new Set());
    setPhase("gapfill");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit();
  };

  const currentGapHasNoGap = currentChunk && !currentChunk.gapWord;
  const currentGapFilled = gapFeedback === "correct";

  // Available words = all vocab minus used
  const availableWords = words.filter((w) => !usedWords.has(w.word.toLowerCase()));

  // ── EMPTY STATE ──
  if (!currentWord && phase !== "complete" && phase !== "gapfill" && phase !== "gapfillDone") {
    return (
      <div className="max-w-2xl mx-auto py-10 text-center px-4">
        <p className="text-white/50">No vocabulary words loaded.</p>
        <button onClick={onDone}
          className="mt-4 px-6 py-2 rounded-xl bg-white/10 text-white/70 hover:bg-white/20 transition">
          <ArrowLeft size={16} className="inline mr-2" /> Back
        </button>
      </div>
    );
  }

  // ── HEADER ──
  const header = (        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
      className="flex items-start justify-between gap-2 sm:gap-4">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center border shrink-0 ${
          phase === "gapfill" || phase === "gapfillDone"
            ? "bg-gradient-to-br from-purple-500/20 to-violet-500/20 border-purple-500/20"
            : "bg-gradient-to-br from-amber-500/20 to-yellow-500/20 border-amber-500/20"
        }`}>
          {phase === "gapfill" || phase === "gapfillDone"
            ? <Sword size={24} className="text-purple-400" />
            : <Bookmark size={24} className="text-amber-400" />
          }
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-white">{set.title}</h1>
          <p className="text-white/50 text-sm">
            {phase === "gapfill" || phase === "gapfillDone"
              ? `Final Test • Fill in the gaps`
              : `${words.length} word${words.length !== 1 ? "s" : ""} • Key Vocabulary`
            }
          </p>
        </div>
      </div>
      <button onClick={onDone}
        className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-white/10 text-white/70 hover:bg-white/20 transition text-xs sm:text-sm shrink-0">
        <ArrowLeft size={16} /> <span className="hidden sm:inline">Back</span>
      </button>
    </motion.div>
  );

  // ── PROGRESS BAR (vocab study only) ──
  const progressBar = phase !== "complete" && phase !== "gapfill" && phase !== "gapfillDone" ? (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
      <motion.div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-500"
        initial={{ width: `${vocabProgress}%` }}
        animate={{ width: `${vocabProgress}%` }}
        transition={{ duration: 0.3 }} />
    </motion.div>
  ) : null;

  // ═══════════════════════════════════════════════
  // GAPFILL PHASE
  // ═══════════════════════════════════════════════
  if (phase === "gapfill") {
    const revealedChunks = gapChunks!.slice(0, gapChunkIdx + 1);
    const chunkProgress = gapChunks!.length > 0 ? ((gapChunkIdx) / gapChunks!.length) * 100 : 0;

    return (
      <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6 py-4 sm:py-6 px-2 sm:px-0">
        {header}

        {/* Gapfill progress */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
          <motion.div className="h-full rounded-full bg-gradient-to-r from-purple-400 to-violet-500"
            animate={{ width: `${chunkProgress}%` }}
            transition={{ duration: 0.3 }} />
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left: accumulated passage */}
          <div className="flex-1 space-y-4 min-w-0">
            <AnimatePresence initial={false}>
              {revealedChunks.map((chunk, i) => {
                const isLast = i === revealedChunks.length - 1;
                const hasGap = !!chunk.gapWord;
                const gapFilledForThis = hasGap && isLast && currentGapFilled;
                const displayText = (() => {
                  if (!hasGap) return chunk.text;
                  if (gapFilledForThis && selectedGapWord) {
                    return chunk.text.replace("___", selectedGapWord);
                  }
                  // Show the gap marker with underline
                  return chunk.text.replace("___", "________");
                })();

                return (
                  <motion.div key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`card transition-all ${
                      isLast && hasGap
                        ? gapFilledForThis
                          ? "border-policeGreen/30 bg-policeGreen/5"
                          : "border-purple-400/30 bg-purple-500/5"
                        : "border-white/10"
                    }`}
                  >
                    <p className="text-white/85 leading-relaxed text-[15px]">{displayText}</p>
                    {isLast && hasGap && !gapFilledForThis && (
                      <div className="mt-2 text-[10px] uppercase tracking-widest text-purple-400/70">
                        ⬆ Fill the gap above
                      </div>
                    )}
                    {isLast && hasGap && gapFilledForThis && (
                      <div className="mt-2 flex items-center gap-1.5 text-policeGreen">
                        <Check size={12} /><span className="text-[10px] font-semibold">Correct!</span>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Actions for current chunk */}
            {!allChunksRevealed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3 pt-2">
                {currentChunk && currentGapHasNoGap && (
                  <button onClick={handleGapNext}
                    disabled={processing}
                    className="w-full py-3 rounded-xl bg-white/10 text-white font-bold hover:bg-white/20 transition border border-white/10 text-sm disabled:opacity-40 disabled:cursor-not-allowed">
                    <ChevronRight size={16} className="inline mr-1" /> Next
                  </button>
                )}

                {currentChunk && currentChunk.gapWord && !currentGapFilled && (
                  <div className="flex gap-2">
                    <button onClick={handleGapCheck}
                      disabled={!selectedGapWord || processing}
                      className="flex-1 py-3 rounded-xl bg-purple-500 text-white font-bold hover:brightness-110 transition disabled:opacity-40 disabled:cursor-not-allowed text-sm">
                      Check Answer
                    </button>
                  </div>
                )}

                {currentChunk && currentChunk.gapWord && currentGapFilled && (
                  <button onClick={handleGapNext}
                    disabled={processing}
                    className="w-full py-3 rounded-xl bg-policeGreen text-white font-bold hover:brightness-110 transition text-sm disabled:opacity-40 disabled:cursor-not-allowed">
                    <ChevronRight size={16} className="inline mr-1" /> Next
                  </button>
                )}

                {gapFeedback === "wrong" && (
                  <div className="bg-policeRed/10 border border-policeRed/20 rounded-xl p-3 flex items-start gap-2">
                    <X size={16} className="text-policeRed shrink-0 mt-0.5" />
                    <p className="text-sm text-policeRed">
                      Not quite! <span className="text-white/60">Try another word from the bank.</span>
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {allChunksRevealed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                <button onClick={() => setPhase("gapfillDone")}
                  className="px-8 py-3 rounded-xl bg-policeGold text-policeBlue font-bold hover:brightness-110 transition">
                  <Sparkles size={16} className="inline mr-2" /> Finish
                </button>
              </motion.div>
            )}
          </div>

          {/* Right: word bank (sticky on desktop, below on mobile) */}
          <div className="lg:w-56 shrink-0">
            <div className="lg:sticky lg:top-4 card border-purple-400/20 bg-purple-500/5 space-y-3 p-3 sm:p-6">
              <div className="flex items-center gap-2">
                <Sword size={16} className="text-purple-400" />
                <h3 className="text-sm font-heading font-bold text-white">Word Bank</h3>
                <span className="text-[10px] text-white/40">{availableWords.length}/{words.length}</span>
              </div>

              {/* Word chips */}
              <div className="flex flex-wrap gap-1.5">
                {words.map((w) => {
                  const used = usedWords.has(w.word.toLowerCase());
                  const selected = selectedGapWord?.toLowerCase() === w.word.toLowerCase();
                  return (
                    <button key={w.id}
                      onClick={() => !used && handlePickWord(w.word)}
                      disabled={used}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition border ${
                        used
                          ? "bg-policeGreen/10 text-policeGreen/50 border-policeGreen/20 line-through cursor-not-allowed"
                          : selected
                            ? "bg-purple-500/30 text-purple-200 border-purple-400/50"
                            : "bg-white/5 text-white/70 border-white/10 hover:border-purple-400/40 hover:bg-purple-500/10"
                      }`}
                    >
                      {w.word}
                    </button>
                  );
                })}
              </div>

              {availableWords.length === 0 && !allChunksRevealed && (
                <p className="text-[10px] text-white/30 italic">All words used — well done!</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════
  // GAPFILL DONE
  // ═══════════════════════════════════════════════
  if (phase === "gapfillDone") {
    return (
      <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6 py-4 sm:py-6 px-2 sm:px-0">
        {header}
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="card border-policeGreen/30 bg-policeGreen/5 text-center space-y-4">
          <div className="inline-flex p-5 bg-policeGreen/20 rounded-full">
            <Target size={48} className="text-policeGreen" />
          </div>
          <h2 className="text-2xl font-heading font-bold text-white">Test Complete! 🏆</h2>
          <p className="text-white/60">
            You mastered all {words.length} words and completed the fill-in-the-gap passage.
          </p>
          <button onClick={onDone}
            className="mt-4 px-8 py-3 rounded-xl bg-policeGold text-policeBlue font-bold hover:brightness-110 transition flex items-center justify-center gap-2 mx-auto">
            <BookOpen size={16} /> Return to Arena
          </button>
        </motion.div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════
  // VOCAB STUDY PHASES
  // ═══════════════════════════════════════════════
  return (
    <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6 py-4 sm:py-6 px-2 sm:px-0">
      {header}
      {progressBar}

      <AnimatePresence mode="wait">
        {/* Study */}
        {phase === "study" && currentWord && (
          <motion.div key={`study-${currentIdx}`}
            initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.25 }} className="card border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-yellow-500/5">
            <div className="flex items-center justify-between mb-4 sm:mb-6 gap-2">
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <Timer size={16} className="text-amber-400" />
                <span className="text-xs sm:text-sm text-amber-400 font-semibold">{timeLeft}s</span>
              </div>
              <div className="flex-1 max-w-[200px] h-1.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div className="h-full bg-amber-400 rounded-full"
                  animate={{ width: `${(timeLeft / STUDY_SECONDS) * 100}%` }}
                  transition={{ duration: 0.3 }} />
              </div>
              <span className="text-[10px] text-white/40 ml-4">{currentIdx + 1}/{words.length}</span>
            </div>
            <div className="text-center space-y-3 sm:space-y-4">
              <p className="text-xs sm:text-sm uppercase tracking-widest text-amber-400/70">Word</p>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-heading font-extrabold text-white tracking-tight">
                {currentWord.word}
              </h2>
              <div className="w-16 h-px bg-amber-400/30 mx-auto" />
              <p className="text-xs sm:text-sm uppercase tracking-widest text-white/40">Meaning</p>
              <p className="text-base sm:text-lg md:text-xl text-white/80 leading-relaxed font-medium px-2">{currentWord.meaning}</p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/10 text-center">
              <p className="text-[11px] text-white/40">⏳ Memorise carefully — you'll be asked to type it back</p>
            </div>
          </motion.div>
        )}

        {/* Recall */}
        {phase === "recall" && currentWord && (
          <motion.div key={`recall-${currentIdx}`}
            initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.25 }} className="card border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-yellow-500/5">
            <div className="text-center space-y-4">
              <p className="text-sm uppercase tracking-widest text-amber-400/70">Recall the meaning of</p>
              <h2 className="text-4xl sm:text-5xl font-heading font-extrabold text-white tracking-tight">{currentWord.word}</h2>
            </div>
            <div className="mt-6 space-y-3">
              <label className="block text-xs uppercase tracking-[0.2em] text-white/50">Type the meaning exactly as you saw it</label>
              <input id="vocab-recall-input" type="text" value={userInput}
                onChange={(e) => setUserInput(e.target.value)} onKeyDown={handleKeyDown}
                placeholder="Type the meaning here..."
                className="w-full bg-black/40 border border-white/10 focus:border-amber-400 rounded-xl px-4 py-3 text-white outline-none transition text-sm"
                autoComplete="off" />
              <button onClick={handleSubmit} disabled={!userInput.trim() || processing}
                className="w-full py-3 rounded-xl bg-amber-500 text-white font-bold hover:brightness-110 transition disabled:opacity-40 disabled:cursor-not-allowed text-sm">
                {processing ? "Checking..." : "Check Answer"}
              </button>
            </div>
            <div className="mt-4 text-center"><p className="text-[10px] text-white/30">Press Enter to submit</p></div>
          </motion.div>
        )}

        {/* Correct */}
        {phase === "correct" && currentWord && (
          <motion.div key="correct" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="card border-policeGreen/30 bg-policeGreen/5 text-center">
            <div className="inline-flex p-4 bg-policeGreen/20 rounded-full mb-4"><Check size={40} className="text-policeGreen" /></div>
            <h3 className="text-xl font-bold text-policeGreen">Correct!</h3>
            <p className="text-white/50 text-sm mt-1"><span className="text-white font-semibold">{currentWord.word}</span> — {currentWord.meaning}</p>
            <p className="text-[10px] text-white/30 mt-3">Advancing to next word...</p>
          </motion.div>
        )}

        {/* Wrong */}
        {phase === "wrong" && currentWord && (
          <motion.div key="wrong" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="card border-policeRed/30 bg-policeRed/5 text-center">
            <div className="inline-flex p-4 bg-policeRed/20 rounded-full mb-4"><X size={40} className="text-policeRed" /></div>
            <h3 className="text-xl font-bold text-policeRed">Not quite!</h3>
            <div className="mt-3 space-y-1">
              <p className="text-white/60 text-sm">The correct meaning was:</p>
              <p className="text-white font-semibold text-lg">{currentWord.meaning}</p>
              <p className="text-white/40 text-xs mt-1">You typed: {userInput || "(empty)"}</p>
            </div>
            <p className="text-[10px] text-amber-400 mt-4 font-semibold">⚠️ Starting over from the first word...</p>
          </motion.div>
        )}

        {/* Complete → show gapfill CTA if available */}
        {phase === "complete" && (
          <motion.div key="complete" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="card border-policeGreen/30 bg-policeGreen/5 text-center space-y-4">
            <div className="inline-flex p-5 bg-policeGreen/20 rounded-full"><Check size={48} className="text-policeGreen" /></div>
            <h2 className="text-2xl font-heading font-bold text-white">All Words Mastered! 🎉</h2>
            <p className="text-white/60">You successfully recalled all {words.length} vocabulary words.</p>

            {hasGapTest ? (
              <div className="space-y-3">
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 text-left">
                  <div className="flex items-center gap-2 mb-2">
                    <Sword size={18} className="text-purple-400" />
                    <span className="text-sm font-bold text-purple-300">Final Test: Fill in the Gaps</span>
                  </div>
                  <p className="text-xs text-white/60 leading-relaxed">
                    Read the passage and fill each gap with the correct vocabulary word from your word bank.
                  </p>
                </div>
                <button onClick={handleStartGapfill}
                  className="w-full py-3 rounded-xl bg-purple-500 text-white font-bold hover:brightness-110 transition flex items-center justify-center gap-2">
                  <Sword size={18} /> Take the Final Test
                </button>
                <button onClick={onDone}
                  className="w-full py-3 rounded-xl bg-white/10 text-white/70 font-bold hover:bg-white/20 transition flex items-center justify-center gap-2">
                  <BookOpen size={16} /> Return to Arena
                </button>
              </div>
            ) : (
              <button onClick={onDone}
                className="mt-4 px-8 py-3 rounded-xl bg-policeGold text-policeBlue font-bold hover:brightness-110 transition flex items-center justify-center gap-2 mx-auto">
                <BookOpen size={16} /> Return to Arena
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

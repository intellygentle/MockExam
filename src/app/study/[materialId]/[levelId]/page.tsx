"use client";

import { useState, useEffect, use, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ArrowRight, RotateCcw, Loader2, CheckCircle,
  BookOpen, ChevronLeft, ChevronRight, Shuffle,
  BrainCircuit, Sparkles, Check, Maximize2, Minimize2,
  Eye, EyeOff, List, GraduationCap, Zap, Flag
} from "lucide-react";

type MaterialCard = {
  id: number;
  level_id: number;
  front: string;
  back: string;
  card_number: number;
};

type MaterialLevel = {
  id: number;
  material_id: number;
  title: string;
  description: string;
  level_number: number;
  cardCount: number;
  questionCount: number;
  cards: MaterialCard[];
};

type StudyMaterial = {
  id: number;
  title: string;
  levels: MaterialLevel[];
};

export default function LevelStudyPage({
  params,
}: {
  params: Promise<{ materialId: string; levelId: string }>;
}) {
  const { materialId, levelId } = use(params);
  const router = useRouter();
  const [material, setMaterial] = useState<StudyMaterial | null>(null);
  const [level, setLevel] = useState<MaterialLevel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studentName, setStudentName] = useState<string | null>(null);

  // Name prompt state
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const pendingActionRef = useRef<(() => void) | null>(null);

  // Card deck state
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [studiedCardIds, setStudiedCardIds] = useState<Set<number>>(new Set());
  const [studyComplete, setStudyComplete] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [showAllCards, setShowAllCards] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const name = localStorage.getItem("scholars-arena-name");
    setStudentName(name);
    loadLevel();
  }, [materialId, levelId]);

  const loadLevel = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/study/materials/${materialId}`);
      if (!res.ok) throw new Error("Material not found");

      const data: StudyMaterial = await res.json();
      setMaterial(data);

      const foundLevel = data.levels.find(
        (l) => l.id === parseInt(levelId)
      );
      if (!foundLevel) throw new Error("Level not found");

      setLevel(foundLevel);

      // Check if already completed
      const name = localStorage.getItem("scholars-arena-name");
      if (name) {
        const supabaseModule = await import("@/lib/supabaseClient");
        const supabase = await supabaseModule.getSupabase();
        const { data: progData } = await supabase
          .from("student_material_progress")
          .select("*")
          .eq("student_name", name)
          .eq("material_id", parseInt(materialId))
          .eq("level_id", parseInt(levelId))
          .single();

        if (progData) {
          setCompleted(progData.completed);
          if (progData.cards_studied > 0) {
            // Pre-mark studied cards
            const studied = new Set<number>();
            for (
              let i = 0;
              i < Math.min(progData.cards_studied, foundLevel.cards.length);
              i++
            ) {
              studied.add(foundLevel.cards[i].id);
            }
            setStudiedCardIds(studied);
          }
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to load level");
    } finally {
      setLoading(false);
    }
  };

  const currentCard = level?.cards[currentCardIndex];
  const totalCards = level?.cards.length || 0;
  const studiedCount = studiedCardIds.size;
  const allStudied = totalCards > 0 && studiedCount >= totalCards;

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleNext = () => {
    if (currentCard && !studiedCardIds.has(currentCard.id)) {
      const newStudied = new Set(studiedCardIds);
      newStudied.add(currentCard.id);
      setStudiedCardIds(newStudied);
    }

    if (currentCardIndex < totalCards - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setIsFlipped(false);
    } else {
      // Completed all cards
      setStudyComplete(true);
    }
  };

  const handlePrevious = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
      setIsFlipped(false);
    }
  };

  const handleShuffle = () => {
    if (!level) return;
    const shuffled = [...level.cards];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    // Reset positions based on shuffled order
    setLevel({ ...level, cards: shuffled });
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setStudiedCardIds(new Set());
  };

  const handleRestart = () => {
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setStudiedCardIds(new Set());
    setStudyComplete(false);
  };

  const handleNameSubmit = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    localStorage.setItem("scholars-arena-name", trimmed);
    setStudentName(trimmed);
    setShowNamePrompt(false);
    // Execute the pending action (mark complete / take quiz) via ref (avoids stale closure)
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    if (action) action();
  };

  const handleMarkComplete = async () => {
    const name = localStorage.getItem("scholars-arena-name");
    if (!name) {
      pendingActionRef.current = handleMarkComplete;
      setShowNamePrompt(true);
      return;
    }
    // Use localStorage as fallback to avoid stale closure when called from handleNameSubmit
    const currentName = studentName || name;
    if (!studentName) setStudentName(currentName);

    setSavingProgress(true);
    try {
      const supabaseModule = await import("@/lib/supabaseClient");
      const supabase = await supabaseModule.getSupabase();

      await supabase.from("student_material_progress").upsert(
        {
          student_name: currentName,
          material_id: parseInt(materialId),
          level_id: parseInt(levelId),
          completed: true,
          cards_studied: totalCards,
          completed_at: new Date().toISOString(),
        },
        {
          onConflict: "student_name, material_id, level_id",
        }
      );

      setCompleted(true);

      // Navigate to quiz if there are questions
      if (level && level.questionCount > 0) {
        router.push(`/study/${materialId}/${levelId}/quiz`);
      } else {
        router.push(`/study/${materialId}`);
      }
    } catch (err) {
      console.error("Failed to save progress:", err);
    } finally {
      setSavingProgress(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 size={32} className="text-policeGold animate-spin" />
        <p className="text-white/50 text-sm uppercase tracking-widest">Loading study cards...</p>
      </div>
    );
  }

  if (error || !level || !material) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20 space-y-4">
        <BookOpen size={48} className="text-white/20 mx-auto" />
        <h2 className="text-2xl font-bold text-white">Level Not Found</h2>
        <p className="text-white/60">{error || "This study level doesn't exist."}</p>
        <button
          onClick={() => router.push(`/study/${materialId}`)}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-policeGold text-policeBlue font-bold text-sm hover:brightness-110 transition"
        >
          <ArrowLeft size={16} /> Back to Material
        </button>
      </div>
    );
  }

  // ─── COMPLETION SCREEN ───
  if (studyComplete) {
    return (
      <div className="max-w-2xl mx-auto text-center space-y-8 py-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
        >
          <div className="inline-flex p-6 bg-policeGreen/20 rounded-full border border-policeGreen/30 mb-6">
            <CheckCircle size={64} className="text-policeGreen" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-heading font-bold text-white mb-3">
            Well Done! 🎉
          </h2>
          <p className="text-white/60 text-lg max-w-md mx-auto mb-2">
            You've reviewed all {totalCards} keypoint{totalCards > 1 ? "s" : ""} in this level.
          </p>
          <p className="text-white/40 text-sm">
            Flashcards reviewed: {studiedCount}/{totalCards}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
            <button
              onClick={handleRestart}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 text-white font-semibold border border-white/10 hover:bg-white/20 transition"
            >
              <RotateCcw size={16} /> Restart Cards
            </button>

            {level.questionCount > 0 && (
              <button
                onClick={handleMarkComplete}
                disabled={savingProgress}
                className="flex items-center gap-2 px-8 py-3 rounded-xl bg-policeGold text-policeBlue font-bold hover:brightness-110 transition disabled:opacity-50"
              >
                {savingProgress ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Zap size={16} />
                )}
                Take Quiz ({level.questionCount} questions)
              </button>
            )}

            {level.questionCount === 0 && (
              <button
                onClick={handleMarkComplete}
                disabled={savingProgress}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-policeGreen/20 text-policeGreen font-semibold border border-policeGreen/30 hover:bg-policeGreen/30 transition disabled:opacity-50"
              >
                {savingProgress ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Check size={16} />
                )}
                Mark as Complete
              </button>
            )}

            <button
              onClick={() => router.push(`/study/${materialId}`)}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 text-white/70 font-semibold border border-white/10 hover:bg-white/10 transition"
            >
              <ArrowLeft size={16} /> Back to Material
            </button>
          </div>

          {!studentName && (
            <div className="mt-6 space-y-3">
              <p className="text-sm text-white/60">
                Enter your name to save progress and take quizzes:
              </p>
              <div className="flex items-center gap-2 max-w-xs mx-auto">
                <input
                  type="text"
                  placeholder="Your name..."
                  className="flex-1 bg-black/40 border border-policeGold/30 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-policeGold transition"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleNameSubmit((e.target as HTMLInputElement).value);
                    }
                  }}
                />
                <button
                  onClick={(e) => {
                    const input = e.currentTarget.parentElement?.querySelector('input');
                    if (input) handleNameSubmit(input.value);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-policeGold text-policeBlue font-bold text-sm hover:brightness-110 transition"
                >
                  Save
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      {/* ─── TOP BAR ─── */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push(`/study/${materialId}`)}
          className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          {material.title}
        </button>
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest text-white/40 bg-white/10 px-2 py-1 rounded-full">
            {level.title}
          </span>
        </div>
      </div>

      {/* ─── PROGRESS ─── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-white">
            Card {currentCardIndex + 1} / {totalCards}
          </span>
          <span className="text-xs text-white/40 bg-white/10 px-2 py-0.5 rounded-full">
            {studiedCount} studied
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleShuffle}
            className="p-2 rounded-lg bg-white/10 text-white/50 hover:text-white hover:bg-white/20 transition"
            title="Shuffle cards"
          >
            <Shuffle size={16} />
          </button>
          <button
            onClick={handleRestart}
            className="p-2 rounded-lg bg-white/10 text-white/50 hover:text-white hover:bg-white/20 transition"
            title="Restart"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-policeGold to-amber-400 rounded-full"
          initial={{ width: 0 }}
          animate={{
            width: `${((currentCardIndex + (isFlipped ? 1 : 0)) / totalCards) * 100}%`,
          }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* ─── FLASHCARD ─── */}
      <div className="perspective-1000" style={{ perspective: "1000px" }}>
        <motion.div
          className="relative w-full cursor-pointer"
          style={{ minHeight: "380px" }}
          onClick={handleFlip}
          initial={false}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={`${currentCardIndex}-${isFlipped ? "back" : "front"}`}
              initial={{ opacity: 0, rotateY: isFlipped ? -90 : 90 }}
              animate={{ opacity: 1, rotateY: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className={`w-full rounded-3xl p-8 sm:p-10 border-2 flex flex-col items-center justify-center text-center ${
                isFlipped
                  ? "bg-gradient-to-br from-policeGreen/10 to-emerald-900/10 border-policeGreen/30"
                  : "bg-gradient-to-br from-policeGold/10 to-amber-900/10 border-policeGold/30"
              }`}
              style={{ minHeight: "380px" }}
            >
              {/* Label */}
              <span
                className={`text-[10px] uppercase tracking-[0.3em] font-semibold mb-6 ${
                  isFlipped ? "text-policeGreen" : "text-policeGold"
                }`}
              >
                {isFlipped ? "Explanation" : "Key Point"}
              </span>

              {/* Content */}
              <div className="flex-1 flex items-center justify-center">
                <p className="text-xl sm:text-2xl font-semibold text-white leading-relaxed max-w-lg">
                  {isFlipped ? currentCard?.back : currentCard?.front}
                </p>
              </div>

              {/* Tip */}
              <p className="text-xs text-white/30 mt-8">
                {isFlipped ? "Tap to see the key point" : "Tap to reveal explanation"}
              </p>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>

      {/* ─── NAVIGATION ─── */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={handlePrevious}
          disabled={currentCardIndex === 0}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 text-white border border-white/10 hover:bg-white/20 transition disabled:opacity-30 disabled:cursor-not-allowed font-semibold"
        >
          <ChevronLeft size={18} /> Previous
        </button>

        <button
          onClick={handleNext}
          className="flex items-center gap-2 px-8 py-3 rounded-xl bg-policeGold text-policeBlue font-bold hover:brightness-110 transition active:scale-95"
        >
          {currentCardIndex < totalCards - 1 ? (
            <>
              Next <ChevronRight size={18} />
            </>
          ) : (
            <>
              Complete <Check size={18} />
            </>
          )}
        </button>
      </div>

      {/* ─── CARD LIST (mini view) ─── */}
      <details className="bg-white/5 rounded-2xl border border-white/10">
        <summary className="flex items-center gap-2 px-5 py-3 cursor-pointer text-sm text-white/70 hover:text-white transition">
          <List size={16} />
          View all {totalCards} cards in this level
        </summary>
        <div className="px-5 pb-4 space-y-2 max-h-60 overflow-y-auto">
          {level.cards.map((card, idx) => (
            <button
              key={card.id}
              onClick={() => {
                setCurrentCardIndex(idx);
                setIsFlipped(false);
              }}
              className={`w-full text-left p-3 rounded-xl text-sm transition flex items-center gap-3 ${
                idx === currentCardIndex
                  ? "bg-policeGold/20 text-policeGold border border-policeGold/30"
                  : studiedCardIds.has(card.id)
                  ? "bg-policeGreen/10 text-policeGreen/80 border border-policeGreen/20"
                  : "bg-white/5 text-white/70 border border-white/10 hover:bg-white/10"
              }`}
            >
              <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold shrink-0">
                {idx + 1}
              </span>
              <span className="truncate">{card.front}</span>
              {studiedCardIds.has(card.id) && (
                <Check size={14} className="ml-auto shrink-0 text-policeGreen" />
              )}
            </button>
          ))}
        </div>
      </details>
      {/* ─── NAME PROMPT MODAL ─── */}
      <AnimatePresence>
        {showNamePrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setShowNamePrompt(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 max-w-sm w-full border border-policeGold/30 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center space-y-4">
                <div className="inline-flex p-3 bg-policeGold/20 rounded-full border border-policeGold/30">
                  <Sparkles size={28} className="text-policeGold" />
                </div>
                <div>
                  <h3 className="text-xl font-heading font-bold text-white mb-1">
                    What's your name?
                  </h3>
                  <p className="text-sm text-white/60">
                    Enter your name to save progress and track your results!
                  </p>
                </div>
                <input
                  type="text"
                  placeholder="Enter your name..."
                  autoFocus
                  className="w-full bg-black/40 border border-policeGold/30 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-policeGold transition"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleNameSubmit((e.target as HTMLInputElement).value);
                    }
                  }}
                />
                <button
                  onClick={(e) => {
                    const input = e.currentTarget.parentElement?.querySelector('input');
                    if (input) handleNameSubmit(input.value);
                  }}
                  className="w-full py-3 rounded-xl bg-policeGold text-policeBlue font-bold hover:brightness-110 transition flex items-center justify-center gap-2"
                >
                  <Sparkles size={16} /> Get Started
                </button>
                <button
                  onClick={() => setShowNamePrompt(false)}
                  className="w-full text-xs text-white/40 hover:text-white/70 transition"
                >
                  Maybe later
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

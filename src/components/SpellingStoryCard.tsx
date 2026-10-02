"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, BookOpen, Check, Gauge, Loader2, Pause, Play,
  RotateCcw, SkipForward, Trophy, Volume2,
} from "lucide-react";
import { useBritishVoice } from "@/lib/useBritishVoice";
import BritishVoiceCheck from "@/components/BritishVoiceCheck";

type StoryChunk =
  | { type: "text"; value: string }
  | { type: "gap"; id: number; word: string };
type StoryChapter = { chapter: number; title: string; paragraphs: StoryChunk[][] };

type Progress = {
  learnedWords: number;
  totalWords: number;
  percent: number;
  mastered: boolean;
  started: boolean;
  learnedIds: number[];
};

type DrillSet = { id: number; title: string; description: string; question_count: number };

type Step =
  | { kind: "text"; value: string; paragraph: number }
  | { kind: "gap"; id: number; word: string; paragraph: number };

type GapResult = { correct: boolean; typed: string; target: string; note: string };
type ChapterSummary = {
  chapter: number;
  title: string;
  total: number;
  correct: number;
  results: { id: number; word: string; typed: string; correct: boolean; note: string }[];
};

type Phase = "loading" | "voice" | "ready" | "running" | "summary" | "done";

function buildSteps(chapter: StoryChapter): Step[] {
  const steps: Step[] = [];
  chapter.paragraphs.forEach((chunks, pIdx) => {
    for (const chunk of chunks) {
      if (chunk.type === "text") {
        if (chunk.value) steps.push({ kind: "text", value: chunk.value, paragraph: pIdx });
      } else {
        steps.push({ kind: "gap", id: chunk.id, word: chunk.word, paragraph: pIdx });
      }
    }
  });
  return steps;
}

export default function SpellingStoryCard({
  set,
  studentName,
  schoolName = "",
  onDone,
}: {
  set: DrillSet;
  studentName: string;
  schoolName?: string;
  onDone: () => void;
}) {
  const voice = useBritishVoice();

  const [phase, setPhase] = useState<Phase>("loading");
  const [chapters, setChapters] = useState<StoryChapter[]>([]);
  const [progress, setProgress] = useState<Progress | null>(null);

  const [chapterIndex, setChapterIndex] = useState(0);
  const [cursor, setCursor] = useState(0);
  const [revealed, setRevealed] = useState(0);
  const [activeGap, setActiveGap] = useState<{ id: number; word: string } | null>(null);
  const [gapResults, setGapResults] = useState<Map<number, GapResult>>(new Map());
  const [typed, setTyped] = useState("");
  const [checking, setChecking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [hold, setHold] = useState(false);
  const [speed, setSpeed] = useState<1 | 0.8>(1);
  const [summaries, setSummaries] = useState<ChapterSummary[]>([]);
  const [playAll, setPlayAll] = useState(false);

  const processingRef = useRef(false);
  const chapterFinishedRef = useRef(false);
  const gapFirstTypedRef = useRef<Map<number, string>>(new Map());
  const inputRef = useRef<HTMLInputElement | null>(null);

  const chapter = chapters[chapterIndex] || null;
  const steps = useMemo(() => (chapter ? buildSteps(chapter) : []), [chapter]);

  // ── Load the card ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const name = studentName.trim() || "Anonymous";
        const res = await fetch(
          `/api/lesson-card/word-vault?drill_set_id=${set.id}&student_name=${encodeURIComponent(name)}`
        );
        if (res.ok) {
          const json = await res.json();
          if (cancelled) return;
          setChapters(json.chapters || []);
          if (json.progress) setProgress(json.progress);
        }
      } catch { /* empty state */ }
      if (!cancelled) setPhase("voice");
    })();
    return () => { cancelled = true; };
  }, [set.id, studentName]);

  const baseRate = 0.9 * speed;

  // ── Narration driver (Strategy 3: chunk by chunk) ──
  useEffect(() => {
    if (phase !== "running" || activeGap || paused || hold) return;
    if (processingRef.current) return;

    if (cursor >= steps.length) {
      finishChapter();
      return;
    }

    const step = steps[cursor];
    processingRef.current = true;

    if (step.kind === "text") {
      setRevealed((r) => Math.max(r, cursor + 1));
      voice.speak(step.value, {
        rate: baseRate,
        onEnd: () => {
          processingRef.current = false;
          setCursor((c) => c + 1);
        },
      });
    } else {
      setRevealed((r) => Math.max(r, cursor + 1));
      setActiveGap({ id: step.id, word: step.word });
      voice.speak(step.word, {
        rate: 0.85,
        onEnd: () => { processingRef.current = false; },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, cursor, activeGap, paused, hold, steps, baseRate]);

  // Focus the gap box as soon as a gap opens.
  useEffect(() => {
    if (activeGap) window.setTimeout(() => inputRef.current?.focus(), 60);
  }, [activeGap]);

  // Resume the paused synthesiser when the student presses Resume.
  useEffect(() => {
    if (!paused && phase === "running") voice.resume();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, phase]);

  const lastTextBefore = useCallback(() => {
    for (let i = Math.min(cursor, steps.length - 1); i >= 0; i--) {
      const s = steps[i];
      if (s.kind === "text") return s.value;
    }
    return "";
  }, [cursor, steps]);

  const checkGap = useCallback(async () => {
    if (!activeGap || checking) return;
    const value = typed.trim();
    if (!value) return;
    setChecking(true);
    try {
      const res = await fetch("/api/lesson-card/word-vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "check",
          studentName: studentName.trim() || "Anonymous",
          schoolName,
          drillSetId: set.id,
          wordId: activeGap.id,
          typed: value,
        }),
      });
      if (!res.ok) return;
      const json = await res.json();
      if (!gapFirstTypedRef.current.has(activeGap.id)) {
        gapFirstTypedRef.current.set(activeGap.id, value);
      }
      setGapResults((prev) => {
        const next = new Map(prev);
        next.set(activeGap.id, {
          correct: !!json.correct,
          typed: value,
          target: json.reveal?.target || activeGap.word,
          note: json.note || "",
        });
        return next;
      });
      setActiveGap(null);
      setTyped("");
      // Resume narration after a short beat (spec B6).
      setCursor((c) => c + 1);
      setHold(true);
      window.setTimeout(() => setHold(false), 550);
    } finally {
      setChecking(false);
    }
  }, [activeGap, checking, typed, studentName, schoolName, set.id]);

  const skipGap = useCallback(() => {
    if (!activeGap) return;
    setGapResults((prev) => {
      const next = new Map(prev);
      next.set(activeGap.id, {
        correct: false,
        typed: "(skipped)",
        target: activeGap.word,
        note: "",
      });
      return next;
    });
    if (!gapFirstTypedRef.current.has(activeGap.id)) {
      gapFirstTypedRef.current.set(activeGap.id, "(skipped)");
    }
    setActiveGap(null);
    setTyped("");
    setCursor((c) => c + 1);
    setHold(true);
    window.setTimeout(() => setHold(false), 300);
  }, [activeGap]);

  const recordChapter = useCallback(
    async (summary: ChapterSummary) => {
      const results = summary.results.map((r) => ({
        wordId: r.id,
        firstTyped: gapFirstTypedRef.current.get(r.id) ?? r.typed,
        lastTyped: gapFirstTypedRef.current.get(r.id) ?? r.typed,
      }));
      if (results.length === 0) return;
      try {
        const res = await fetch("/api/lesson-card/word-vault", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "record",
            studentName: studentName.trim() || "Anonymous",
            schoolName,
            drillSetId: set.id,
            results,
          }),
        });
        if (res.ok) {
          const json = await res.json();
          if (json.progress) setProgress(json.progress);
        }
      } catch { /* best-effort */ }
    },
    [studentName, schoolName, set.id]
  );

  const finishChapter = useCallback(() => {
    if (!chapter || chapterFinishedRef.current) return;
    chapterFinishedRef.current = true;
    const gapSteps = steps.filter((s): s is Extract<Step, { kind: "gap" }> => s.kind === "gap");
    const results = gapSteps.map((g) => {
      const r = gapResults.get(g.id);
      return {
        id: g.id,
        word: g.word,
        typed: r?.typed ?? "",
        correct: r?.correct ?? false,
        note: r?.note ?? "",
      };
    });
    const correct = results.filter((r) => r.correct).length;
    const summary: ChapterSummary = {
      chapter: chapter.chapter,
      title: chapter.title,
      total: results.length,
      correct,
      results,
    };
    setSummaries((prev) => [...prev.filter((s) => s.chapter !== chapter.chapter), summary]);
    void recordChapter(summary);
    setPhase("summary");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapter, steps, gapResults, recordChapter]);

  const startChapter = useCallback((index: number, all: boolean) => {
    processingRef.current = false;
    chapterFinishedRef.current = false;
    gapFirstTypedRef.current = new Map();
    setChapterIndex(index);
    setCursor(0);
    setRevealed(0);
    setActiveGap(null);
    setGapResults(new Map());
    setTyped("");
    setPaused(false);
    setHold(false);
    setPlayAll(all);
    setPhase("running");
  }, []);

  const nextChapter = useCallback(() => {
    if (chapterIndex + 1 < chapters.length) {
      startChapter(chapterIndex + 1, playAll);
    } else {
      setPhase("done");
    }
  }, [chapterIndex, chapters.length, playAll, startChapter]);

  // ── Keyboard: Enter checks the active gap ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== "running" || !activeGap) return;
      if (e.key === "Enter") { e.preventDefault(); void checkGap(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, activeGap, checkGap]);

  const totalCorrect = summaries.reduce((sum, s) => sum + s.correct, 0);
  const totalGaps = summaries.reduce((sum, s) => sum + s.total, 0);

  // ── LOADING ──
  if (phase === "loading") {
    return (
      <div className="max-w-3xl mx-auto py-20 text-center px-4">
        <Loader2 size={32} className="text-sky-400 animate-spin mx-auto mb-4" />
        <p className="text-white/50 text-sm">Loading the story…</p>
      </div>
    );
  }

  if (phase === "voice") {
    return <BritishVoiceCheck voice={voice} onContinue={() => setPhase("ready")} onBack={onDone} />;
  }

  if (chapters.length === 0) {
    return (
      <div className="max-w-3xl mx-auto py-10 text-center px-4">
        <p className="text-white/50">No story chapters loaded for this card.</p>
        <button onClick={onDone} className="mt-4 px-6 py-2 rounded-xl bg-white/10 text-white/70 hover:bg-white/20 transition">
          <ArrowLeft size={16} className="inline mr-2" /> Back
        </button>
      </div>
    );
  }

  // ── READY ──
  if (phase === "ready") {
    return (
      <div className="max-w-2xl mx-auto py-6 px-3 sm:px-0">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card space-y-5">
          <div className="text-center space-y-2">
            <div className="inline-flex p-4 bg-sky-500/10 rounded-full border border-sky-500/20">
              <BookOpen size={36} className="text-sky-300" />
            </div>
            <h2 className="text-2xl font-heading font-bold text-white">{set.title}</h2>
            <p className="text-sm text-white/60 max-w-lg mx-auto">
              Follow the story as it is read aloud. When a Word Vault word is spoken, the screen hides it
              behind a blank box — type the word you heard.
            </p>
          </div>

          {progress && (
            <div className="bg-white/5 rounded-xl p-3">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="uppercase tracking-widest text-white/40 text-[10px]">Words mastered</span>
                <span className="text-sky-300 font-bold">{progress.learnedWords} / {progress.totalWords} ({progress.percent}%)</span>
              </div>
              <div className="h-2 bg-black/30 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-sky-400 to-policeGold rounded-full" style={{ width: `${progress.percent}%` }} />
              </div>
            </div>
          )}

          <button
            onClick={() => startChapter(0, true)}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-sky-500 text-white font-bold hover:brightness-110 transition text-sm"
          >
            <Play size={16} /> Play all six chapters
          </button>

          <p className="text-[10px] uppercase tracking-widest text-white/40 text-center">Or pick a chapter</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {chapters.map((c, i) => (
              <button
                key={c.chapter}
                onClick={() => startChapter(i, false)}
                className="text-left px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 hover:border-sky-400/60 hover:bg-sky-500/10 transition"
              >
                <p className="text-sm font-bold text-white">Chapter {c.chapter}: {c.title}</p>
                <p className="text-[11px] text-white/40">20 gaps</p>
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  // ── CHAPTER SUMMARY ──
  if (phase === "summary") {
    const summary = summaries.find((s) => s.chapter === chapter?.chapter) || summaries[summaries.length - 1];
    const missed = summary?.results.filter((r) => !r.correct) ?? [];
    return (
      <div className="max-w-2xl mx-auto py-6 px-3 sm:px-0 space-y-4">
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
          <div className="card text-center space-y-3">
            <Trophy size={40} className="mx-auto text-sky-300" />
            <h2 className="text-xl font-heading font-bold text-white">Chapter {summary?.chapter}: {summary?.title}</h2>
            <p className="text-3xl font-bold text-policeGold">{summary?.correct} / {summary?.total}</p>
            <p className="text-sm text-white/60">gaps filled correctly in this chapter</p>
            {progress && (
              <p className="text-xs text-white/50">
                Card progress: <span className="text-sky-300 font-semibold">{progress.learnedWords}/{progress.totalWords}</span> words mastered ({progress.percent}%)
              </p>
            )}
          </div>

          {missed.length > 0 && (
            <div className="card space-y-2">
              <h3 className="text-sm font-heading font-bold text-white">Missed this chapter ({missed.length})</h3>
              <div className="flex flex-wrap gap-2">
                {missed.map((m) => (
                  <span key={m.id} className="text-xs bg-white/5 border border-white/10 rounded-lg px-2.5 py-1">
                    <span className="text-policeRed line-through mr-1.5">{m.typed || "—"}</span>
                    <span className="text-policeGreen font-semibold">{m.word}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={nextChapter}
              className="flex items-center justify-center gap-2 py-3 rounded-xl bg-sky-500 text-white font-bold hover:brightness-110 transition text-sm"
            >
              {chapterIndex + 1 < chapters.length ? "Next chapter →" : "See total score →"}
            </button>
            <button
              onClick={onDone}
              className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white/10 text-white/80 font-bold hover:bg-white/20 transition text-sm border border-white/10"
            >
              <ArrowLeft size={16} /> Back to the stack
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── DONE ──
  if (phase === "done") {
    return (
      <div className="max-w-2xl mx-auto py-6 px-3 sm:px-0">
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="card text-center space-y-4">
          <div className="inline-flex p-5 bg-sky-500/10 rounded-full"><Trophy size={44} className="text-sky-300" /></div>
          <h2 className="text-2xl font-heading font-bold text-white">Story complete 🎉</h2>
          <p className="text-3xl font-bold text-policeGold">{totalCorrect} / {totalGaps}</p>
          <p className="text-sm text-white/60">gaps filled correctly across your chapters</p>
          {progress && (
            <p className="text-xs text-white/50">
              Card progress: <span className="text-sky-300 font-semibold">{progress.learnedWords}/{progress.totalWords}</span> words mastered ({progress.percent}%)
            </p>
          )}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              onClick={() => startChapter(0, true)}
              className="flex items-center justify-center gap-2 py-3 rounded-xl bg-sky-500 text-white font-bold hover:brightness-110 transition text-sm"
            >
              <RotateCcw size={16} /> Play again
            </button>
            <button
              onClick={onDone}
              className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white/10 text-white/80 font-bold hover:bg-white/20 transition text-sm border border-white/10"
            >
              <ArrowLeft size={16} /> Back to the stack
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── RUNNING ──
  if (!chapter) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-4 py-4 px-3 sm:px-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-heading font-bold text-white truncate">
            Chapter {chapter.chapter}: {chapter.title}
          </h1>
          <p className="text-white/50 text-xs">
            {playAll ? `Chapter ${chapterIndex + 1} of ${chapters.length} · ` : ""}
            {gapResults.size} of {steps.filter((s) => s.kind === "gap").length} gaps
            {progress ? <> · <span className="text-sky-300 font-semibold">{progress.learnedWords}/{progress.totalWords} mastered</span></> : null}
          </p>
        </div>
        <button
          onClick={onDone}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 text-white/70 hover:bg-white/20 transition text-xs shrink-0"
        >
          <ArrowLeft size={14} /> <span className="hidden sm:inline">Back</span>
        </button>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => (paused ? setPaused(false) : (voice.pause(), setPaused(true)))}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 text-white/80 hover:bg-white/20 transition text-xs border border-white/10"
        >
          {paused ? <Play size={13} /> : <Pause size={13} />} {paused ? "Resume" : "Pause"}
        </button>
        <button
          onClick={() => activeGap && voice.speak(activeGap.word, { rate: 0.7 })}
          disabled={!activeGap}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 text-white/80 hover:bg-white/20 transition text-xs border border-white/10 disabled:opacity-40"
        >
          <Volume2 size={13} /> Replay word
        </button>
        <button
          onClick={() => voice.speak(lastTextBefore(), { rate: baseRate })}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 text-white/80 hover:bg-white/20 transition text-xs border border-white/10"
        >
          <RotateCcw size={13} /> Replay sentence
        </button>
        <button
          onClick={() => setSpeed((s) => (s === 1 ? 0.8 : 1))}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 text-white/80 hover:bg-white/20 transition text-xs border border-white/10"
        >
          <Gauge size={13} /> {speed === 1 ? "1×" : "0.8×"}
        </button>
        <button
          onClick={skipGap}
          disabled={!activeGap}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 text-white/80 hover:bg-white/20 transition text-xs border border-white/10 disabled:opacity-40"
        >
          <SkipForward size={13} /> Skip
        </button>
        {voice.speaking && <span className="text-[11px] text-sky-300 flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> Speaking…</span>}
      </div>

      {/* Story text */}
      <div className="card space-y-4">
        {(() => {
          let stepIdx = 0;
          return chapter.paragraphs.map((chunks, pIdx) => (
          <p key={pIdx} className="text-base leading-8 text-white/85">
            {chunks.map((chunk, cIdx) => {
              if (chunk.type === "text") {
                if (!chunk.value) return null;
                const myIdx = stepIdx++;
                return myIdx < revealed ? <span key={cIdx}>{chunk.value}</span> : null;
              }
              const myIdx = stepIdx++;
              if (myIdx >= revealed) return null;
              const result = gapResults.get(chunk.id);
              const isActive = activeGap?.id === chunk.id;
              if (result) {
                return (
                  <span key={cIdx}>
                    {result.correct ? (
                      <span className="text-policeGreen font-bold bg-policeGreen/10 rounded px-1">{result.target}</span>
                    ) : (
                      <>
                        <span className="text-policeRed line-through">{result.typed || "—"}</span>{" "}
                        <span className="text-policeGreen font-bold">{result.target}</span>
                      </>
                    )}
                    {result.note && <span className="ml-2 text-[11px] text-policeGold">{result.note}</span>}
                  </span>
                );
              }
              if (isActive) {
                return (
                  <span key={cIdx} className="inline-flex items-center gap-1 align-middle mx-0.5">
                    <input
                      ref={inputRef}
                      value={typed}
                      onChange={(e) => setTyped(e.target.value)}
                      spellCheck={false}
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      className="w-[12ch] bg-sky-500/10 border-2 border-sky-400/60 rounded-lg px-2 py-1 text-base text-white focus:outline-none focus:border-sky-300"
                    />
                    <button
                      onClick={checkGap}
                      disabled={!typed.trim() || checking}
                      className="px-2 py-1 rounded-lg bg-sky-500 text-white text-xs font-bold disabled:opacity-50"
                    >
                      {checking ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                    </button>
                  </span>
                );
              }
              return null;
            })}
          </p>
          ));
        })()}
      </div>
    </div>
  );
}

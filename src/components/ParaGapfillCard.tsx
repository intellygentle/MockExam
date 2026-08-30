"use client";

import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft, Check, X, Loader2, Trophy, ChevronRight,
  FileText, PencilLine
} from "lucide-react";

type DrillSet = {
  id: number;
  title: string;
  description: string;
  card_type?: string;
  question_count: number;
};

type ParaGapfillBlank = {
  index: number;
  answer: string;
  explanation: string;
};

type ParaGapfillData = {
  passage: string;
  blanks: ParaGapfillBlank[];
  wordBank: string[];
};

type QuestionItem = {
  prompt: string;
  source: string;
  paraGapfill: ParaGapfillData | null;
};

type Props = {
  set: DrillSet;
  studentName: string;
  onDone: () => void;
};

export default function ParaGapfillCard({ set, studentName, onDone }: Props) {
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [checking, setChecking] = useState(false);
  const [results, setResults] = useState<{ index: number; correct: boolean }[] | null>(null);
  const [allComplete, setAllComplete] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [startTime] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const answersRef = useRef<Record<number, string>>({});
  const currentIdxRef = useRef(0);
  const questionsRef = useRef<QuestionItem[]>([]);

  const current = questions[currentIdx] ?? null;
  const data = current?.paraGapfill ?? null;

  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { currentIdxRef.current = currentIdx; }, [currentIdx]);
  useEffect(() => { questionsRef.current = questions; }, [questions]);

  // Load card data
  useEffect(() => {
    fetch(`/api/lesson-card/card?drill_set_id=${set.id}&student_name=${encodeURIComponent(studentName)}`)
      .then((r) => r.json())
      .then((json) => {
        setQuestions(json.items || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load card:", err);
        setLoading(false);
      });
  }, [set.id, studentName]);

  // Timer
  useEffect(() => {
    timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [startTime]);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const filledCount = data ? data.blanks.filter((b) => answers[b.index]?.trim()).length : 0;
  const totalBlanks = data ? data.blanks.length : 0;

  // CHECK — wrapped in form onSubmit so mobile keyboards don't swallow the tap
  const doCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (checking) return;

    const d = questionsRef.current[currentIdxRef.current]?.paraGapfill;
    const a = answersRef.current;
    if (!d) return;

    const filled = d.blanks.map((b) => ({ blankIndex: b.index, word: (a[b.index] || "").trim() }));
    setChecking(true);
    setStatusMsg("Checking your answers...");

    try {
      const res = await fetch("/api/lesson-card/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          drillSetId: set.id,
          index: currentIdxRef.current,
          answers: JSON.stringify(filled),
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("Check API error:", res.status, errText);
        setStatusMsg("Server error. Please try again.");
        setChecking(false);
        return;
      }

      const json = await res.json();
      console.log("Check response:", json);

      if (json.results) {
        setResults(json.results);
        const wrong = json.results.filter((r: { correct: boolean }) => !r.correct).length;
        if (wrong > 0) {
          setStatusMsg(`${wrong} blank${wrong > 1 ? "s" : ""} incorrect — check the red marks.`);
        }

        if (json.correct) {
          setStatusMsg("All correct! Moving to next passage...");
          setTimeout(() => {
            setResults(null);
            setAnswers({});
            answersRef.current = {};
            const next = currentIdxRef.current + 1;
            if (next >= questionsRef.current.length) {
              setAllComplete(true);
              if (timerRef.current) clearInterval(timerRef.current);
            } else {
              setCurrentIdx(next);
              setStatusMsg("");
            }
          }, 1200);
        }
      } else {
        console.error("Unexpected response:", json);
        setStatusMsg("Something went wrong. Please try again.");
      }
    } catch (err) {
      console.error("Check failed:", err);
      setStatusMsg("Network error — check your connection.");
    }
    setChecking(false);
  };

  // LOADING
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center px-4">
        <Loader2 size={32} className="text-policeGold animate-spin mx-auto mb-4" />
        <p className="text-white/50 text-sm">Loading...</p>
      </div>
    );
  }

  // ALL COMPLETE
  if (allComplete) {
    if (timerRef.current) clearInterval(timerRef.current);
    return (
      <div className="max-w-3xl mx-auto py-10 px-4">
        <div className="card text-center space-y-6">
          <div className="inline-flex p-6 bg-policeGreen/10 rounded-full"><Trophy size={56} className="text-policeGreen" /></div>
          <h2 className="text-3xl font-heading font-bold text-white">🎉 All Passages Completed!</h2>
          <p className="text-white/60">You filled all 30 blanks correctly.</p>
          <div className="bg-white/5 rounded-xl p-4 inline-flex items-center gap-2">
            <span className="text-xs text-white/50 uppercase">Time</span>
            <span className="text-lg font-bold font-mono text-policeGold">{fmt(elapsed)}</span>
          </div>
          <div className="pt-4">
            <button onClick={onDone} className="px-8 py-3 rounded-xl bg-policeGold text-policeBlue font-bold">Back to The Arena</button>
          </div>
        </div>
      </div>
    );
  }

  // NO DATA
  if (!current || !data) {
    return (
      <div className="max-w-4xl mx-auto py-10 text-center px-4">
        <p className="text-white/50">No passages loaded.</p>
        <button onClick={onDone} className="mt-4 px-6 py-2 rounded-xl bg-white/10 text-white/70"><ArrowLeft size={16} className="inline mr-2" /> Back</button>
      </div>
    );
  }

  const allCorrect = results?.every((r) => r.correct) ?? false;
  const anyWrong = results?.some((r) => !r.correct) ?? false;

  // Build passage with blanks
  const regex = /___(\d+)___/g;
  const parts: (string | ParaGapfillBlank)[] = [];
  let lastIdx = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(data.passage)) !== null) {
    if (match.index > lastIdx) parts.push(data.passage.slice(lastIdx, match.index));
    const blank = data.blanks.find((b) => b.index === parseInt(match![1], 10));
    if (blank) parts.push(blank);
    lastIdx = regex.lastIndex;
  }
  if (lastIdx < data.passage.length) parts.push(data.passage.slice(lastIdx));

  return (
    <div className="max-w-4xl mx-auto space-y-4 py-4 px-2 sm:px-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-indigo-500/20 border border-indigo-500/20 shrink-0">
            <FileText size={20} className="text-indigo-400" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-white truncate">{set.title}</h1>
            <p className="text-white/50 text-xs">Passage {currentIdx + 1} of {questions.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-white/50">{fmt(elapsed)}</span>
          <button onClick={onDone} className="px-3 py-1.5 rounded-lg bg-white/10 text-white/70 text-xs"><ArrowLeft size={14} /> Back</button>
        </div>
      </div>

      {/* Filled counter */}
      <div className="text-center text-sm font-bold">
        <span className={filledCount === totalBlanks ? "text-policeGreen" : "text-policeGold"}>
          {filledCount} / {totalBlanks} blanks filled
        </span>
      </div>

      {/* PASSAGE + CHECK FORM — the form wraps the passage AND the button */}
      <form onSubmit={doCheck}>
        <div className={`card ${allCorrect ? "border-policeGreen/30 bg-policeGreen/5" : anyWrong ? "border-policeRed/20 bg-policeRed/5" : "border-white/10"}`}>
          <div className="flex items-center gap-2 mb-4">
            <PencilLine size={14} className="text-indigo-400" />
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">{current.source}</span>
          </div>

          {/* Passage text with inline inputs */}
          <div className="leading-[2] text-[15px] text-white/85">
            {parts.map((part, i) => {
              if (typeof part === "string") return <span key={i}>{part}</span>;
              const blank = part;
              const val = answers[blank.index] || "";
              const r = results?.find((res) => res.index === blank.index);
              const border = r ? (r.correct ? "border-policeGreen bg-policeGreen/10" : "border-policeRed bg-policeRed/10") : "border-white/20 bg-white/5";
              return (
                <span key={i} className={`inline-flex items-center mx-0.5 px-1.5 py-0.5 rounded border transition-all ${border}`}>
                  <input
                    type="text"
                    value={val}
                    onChange={(e) => {
                      const next = { ...answers, [blank.index]: e.target.value };
                      setAnswers(next);
                      answersRef.current = next;
                      setResults(null);
                      setStatusMsg("");
                    }}
                    className="bg-transparent text-white outline-none w-[80px] sm:w-[110px] text-center text-sm font-semibold placeholder-white/30"
                    placeholder={`#${blank.index}`}
                    disabled={checking || allCorrect}
                  />
                  {r && <span className="ml-0.5">{r.correct ? <Check size={12} className="text-policeGreen" /> : <X size={12} className="text-policeRed" />}</span>}
                </span>
              );
            })}
          </div>

          {/* Feedback inside card */}
          {allCorrect && <div className="mt-4 text-policeGreen font-bold text-sm flex items-center gap-2"><Check size={16} /> All correct! Advancing...</div>}
        </div>

        {/* CHECK BUTTON — inside the form so onSubmit fires on mobile reliably */}
        {!allCorrect && (
          <button
            type="submit"
            disabled={checking}
            className="w-full mt-4 py-4 rounded-xl bg-indigo-600 text-white font-bold text-lg active:bg-indigo-700 disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {checking ? (
              <><Loader2 size={20} className="animate-spin" /> Checking...</>
            ) : (
              <><Check size={20} /> Check All Blanks ({filledCount}/{totalBlanks})</>
            )}
          </button>
        )}
      </form>

      {/* Next Passage button — after all correct, outside the form */}
      {allCorrect && currentIdx + 1 < questions.length && (
        <button
          type="button"
          onClick={() => { setResults(null); setAnswers({}); answersRef.current = {}; setCurrentIdx(currentIdx + 1); setStatusMsg(""); }}
          className="w-full py-4 rounded-xl bg-policeGreen text-white font-bold text-lg flex items-center justify-center gap-2"
        >
          Next Passage <ChevronRight size={20} />
        </button>
      )}

      {/* Status message */}
      {statusMsg && (
        <div className={`text-center text-sm font-semibold py-2 px-3 rounded-lg ${
          statusMsg.includes("correct") || statusMsg.includes("Correct") || statusMsg.includes("Moving")
            ? "text-policeGreen bg-policeGreen/10"
            : statusMsg.includes("incorrect") || statusMsg.includes("wrong") || statusMsg.includes("error") || statusMsg.includes("Error")
            ? "text-policeRed bg-policeRed/10"
            : "text-white/60 bg-white/5"
        }`}>
          {statusMsg}
        </div>
      )}

      {/* Word Bank */}
      <div>
        <h3 className="text-xs font-bold text-white/60 uppercase tracking-widest mb-2">Word Bank</h3>
        <div className="flex flex-wrap gap-2">
          {data.wordBank.map((word) => {
            const used = data.blanks.filter((b) => answers[b.index]?.toLowerCase().trim() === word.toLowerCase()).length;
            const max = data.blanks.filter((b) => b.answer.toLowerCase() === word.toLowerCase()).length;
            const allUsed = max > 0 && used >= max;
            return (
              <button
                key={word}
                type="button"
                onClick={() => {
                  if (!data) return;
                  const empty = data.blanks.find((b) => !answers[b.index]?.trim());
                  if (empty) {
                    const next = { ...answers, [empty.index]: word };
                    setAnswers(next);
                    answersRef.current = next;
                    setResults(null);
                    setStatusMsg("");
                  }
                }}
                disabled={allUsed || checking || allCorrect}
                className={`px-3 py-2 rounded-lg text-sm font-semibold border transition-all ${
                  allUsed ? "bg-policeGreen/10 border-policeGreen/30 text-policeGreen/50" : "bg-white/5 border-white/10 text-white hover:bg-indigo-500/10"
                } disabled:opacity-40`}
              >
                {word}{used > 0 && <span className="ml-1 text-[10px] opacity-50">({used}/{max})</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

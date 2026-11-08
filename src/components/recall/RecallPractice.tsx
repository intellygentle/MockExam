"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Eye, Loader2, RotateCcw, ShieldCheck, Shuffle, Target, XCircle } from "lucide-react";
import { recallAccuracy, recallDate, recallKinds, recallRequest, recallSessionKey, type RecallPracticeConfig, type RecallResume, type RecallSession, type RecallSessionScore } from "@/lib/subject-recall";
import { notifyRecallProgress } from "@/lib/useRecallRefresh";
import { RecallAnswer } from "./RecallNotes";

function firstDifference(expected: string, actual: string) {
  const words = expected.trim().split(/\s+/);
  const typed = actual.trim().split(/\s+/);
  const index = words.findIndex((word, i) => word.toLowerCase() !== typed[i]?.toLowerCase());
  return index < 0 ? "Check for extra words after the model answer." : `Start at word ${index + 1}: the notes say “${words[index]}”. Check the spelling and punctuation too.`;
}

type AnswerDraft = { sessionId: string; reviewId: string; answer: string; retrying: boolean; feedbackStamp: string | null };
const feedbackStamp = (data: RecallSession) => data.feedback
  ? `${data.feedback.result.next_due_at}:${data.feedback.result.first_attempt}:${data.feedback.result.correct}:${data.feedback.revealed}` : null;

export default function RecallPractice({ config, studentName, schoolName, onExit, onRestart, onRead, onPractiseNote }: {
  config: RecallPracticeConfig; studentName: string; schoolName: string;
  onExit: () => void; onRestart: () => void; onRead: (lessonId: string, sectionId?: string) => void;
  onPractiseNote: (lessonId: string, sectionId: string) => void;
}) {
  const [session, setSession] = useState<RecallSession | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [answer, setAnswer] = useState("");
  const [retrying, setRetrying] = useState(false);
  const [restored, setRestored] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLHeadingElement>(null);
  const mounted = useRef(true);
  const lock = useRef(false);
  const request = useRef<{ id: string; review: string; answer: string; reveal: boolean } | null>(null);
  const card = session?.card;
  const feedback = retrying ? null : session?.feedback;
  const result = feedback?.result;
  const correct = session?.results.filter((item) => item.correct).length ?? 0;
  const incorrect = (session?.completed ?? 0) - correct;
  const draftKey = `${recallSessionKey(studentName, schoolName)}:answer`;

  function clearAnswerDraft() {
    try {
      const draft: AnswerDraft | null = JSON.parse(localStorage.getItem(draftKey) || "null");
      if (!draft?.sessionId || draft.sessionId === config.id) localStorage.removeItem(draftKey);
    } catch { /* Browser storage is optional. */ }
  }
  function saveAnswerDraft(text: string, isRetry = retrying) {
    setAnswer(text); setRestored(false);
    if (!session?.card) return;
    try {
      const draft: AnswerDraft = { sessionId: config.id, reviewId: session.card.review_id,
        answer: text, retrying: isRetry, feedbackStamp: feedbackStamp(session) };
      localStorage.setItem(draftKey, JSON.stringify(draft));
    } catch { /* The typed answer remains available in this session. */ }
  }
  function restoreAnswerDraft(data: RecallSession) {
    setAnswer(""); setRetrying(false); setRestored(false);
    try {
      const draft: AnswerDraft | null = JSON.parse(localStorage.getItem(draftKey) || "null");
      if (data.status === "active" && draft?.sessionId === data.id && draft.reviewId === data.card?.review_id &&
        typeof draft.answer === "string" && draft.answer.length <= 2000 && typeof draft.retrying === "boolean" &&
        draft.feedbackStamp === feedbackStamp(data) && (!data.feedback || (draft.retrying && !data.feedback.result.review_finished))) {
        setAnswer(draft.answer); setRetrying(draft.retrying); setRestored(!!draft.answer);
      } else clearAnswerDraft();
    } catch { clearAnswerDraft(); }
  }

  function persist(data: RecallSession) {
    try {
      const key = recallSessionKey(studentName, schoolName);
      if (data.status === "complete" || data.status === "changed") {
        const previous: RecallResume | null = JSON.parse(localStorage.getItem(key) || "null");
        if (previous?.id === data.id || (!config.resume && !session)) localStorage.removeItem(key);
      }
      else {
        const resume: RecallResume = { ...config, resume: true, title: data.title, total: data.total, completed: data.completed };
        localStorage.setItem(key, JSON.stringify(resume));
      }
    } catch { /* The server still saves practice when browser storage is unavailable. */ }
  }

  useEffect(() => {
    let active = true;
    mounted.current = true; lock.current = true; setBusy(true); setError("");
    recallRequest<RecallSession>("/api/recall", { action: config.resume ? "session" : "start-session", studentName, schoolName,
      sessionId: config.id, mode: config.mode, lessonId: config.lessonId, sectionId: config.sectionId }).then((data) => {
      if (active) { setSession(data); persist(data); restoreAnswerDraft(data); }
    }).catch((err: Error) => { if (active) setError(err.message); })
      .finally(() => { if (active) { lock.current = false; setBusy(false); } });
    return () => { active = false; mounted.current = false; };
    // The component is keyed by session ID; configuration is fixed for its lifetime.
  }, [config.id, loadAttempt, studentName, schoolName]);

  useEffect(() => {
    if (busy) return;
    if (session?.status === "complete" || session?.status === "changed") summaryRef.current?.focus();
    else if (feedback) feedbackRef.current?.focus();
    else if (card) input.current?.focus();
  }, [card?.review_id, feedback, retrying, busy, session?.status]);

  async function perform(body: Record<string, unknown>) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try {
      const data = await recallRequest<RecallSession>("/api/recall", { ...body, studentName, schoolName, sessionId: config.id });
      if (mounted.current) {
        setSession(data); persist(data);
        if (body.action === "session") restoreAnswerDraft(data);
        else { setRetrying(false); setAnswer(""); setRestored(false); clearAnswerDraft(); }
        if (body.action === "session-answer") notifyRecallProgress();
        request.current = null;
      }
    } catch (err) { if (mounted.current) setError(err instanceof Error ? err.message : "Check your connection and try again."); }
    finally { if (mounted.current) { lock.current = false; setBusy(false); } }
  }
  function check(reveal: boolean) {
    if (!card || lock.current || (!reveal && !answer.trim())) return;
    const text = reveal ? "" : answer;
    if (!request.current || request.current.review !== card.review_id || request.current.answer !== text || request.current.reveal !== reveal) {
      request.current = { id: crypto.randomUUID(), review: card.review_id, answer: text, reveal };
    }
    void perform({ action: "session-answer", reviewId: card.review_id, requestId: request.current.id, answer: text, reveal });
  }

  const missedNotes = new Map<string, { note: RecallSessionScore; count: number }>();
  for (const item of session?.results ?? []) {
    if (item.correct) continue;
    const key = `${item.lesson_id}:${item.section_id}`;
    const previous = missedNotes.get(key);
    missedNotes.set(key, { note: item, count: (previous?.count ?? 0) + 1 });
  }

  return <div className="mx-auto max-w-3xl space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><button className="recall-btn" disabled={busy} onClick={onExit}><ArrowLeft size={16} />{session?.status === "active" ? "Save & exit" : "All notes"}</button>
      <p className="flex items-center gap-1.5 text-xs text-slate-500"><ShieldCheck size={14} />Checked answers save automatically</p></div>
    {error ? <div role="alert" className="space-y-3 rounded-xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-rose-200"><p>{error}</p>
      <div className="flex flex-wrap gap-2"><button className="recall-btn" disabled={busy} onClick={() => session ? void perform({ action: "session" }) : setLoadAttempt((value) => value + 1)}>{session ? "Reload saved session" : "Try again"}</button>
        <button className="recall-btn" disabled={busy} onClick={onRestart}>Start a new session</button></div></div> : null}
    {!session ? <section className="recall-panel py-14 text-center"><Loader2 size={28} className={`mx-auto mb-4 text-sky-300 ${busy ? "animate-spin" : ""}`} /><h1 className="text-xl font-semibold">{config.resume ? "Picking up where you left off" : config.mode === "master" ? "Shuffling your studied notes" : "Preparing your recall session"}</h1><p className="mt-3 text-sm text-slate-400">Your first answer counts. Take your time and recall it precisely.</p></section>
    : session.status === "changed" ? <section className="recall-panel space-y-4"><h1 ref={summaryRef} tabIndex={-1} className="text-xl font-semibold outline-none">Let’s refresh this practice</h1>
      <p className="text-sm leading-7 text-slate-400">This note was updated, reread, or opened in another session. Start fresh to practise the current version. Valid checked answers have already been saved.</p>
      <div className="flex flex-wrap gap-2"><button className="recall-btn recall-btn-primary" onClick={onRestart}>Start fresh<ArrowRight size={16} /></button>{config.lessonId ? <button className="recall-btn" onClick={() => onRead(config.lessonId!, config.sectionId)}><BookOpen size={16} />{config.sectionId ? "Read note" : "Open lesson"}</button> : null}</div>
    </section> : session.status === "complete" ? <>
      <section className="recall-panel space-y-6">
        <div className="text-center"><span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-300/10 text-sky-300"><Target size={28} /></span><p className="recall-eyebrow mb-2">{session.title}</p>
          <h1 ref={summaryRef} tabIndex={-1} className="font-heading text-2xl font-semibold tracking-tight outline-none sm:text-3xl">{session.total ? "A little stronger than before." : config.mode === "due" ? "You’re all caught up." : "Start with a little reading."}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">{session.total ? `${session.completed} of ${session.total} questions completed. Here’s how your first answers went.` : config.mode === "due" ? "No questions are due right now. A master test is available whenever you want more practice." : "Read a note first to add its questions to your practice pool."}</p></div>
        {session.total ? <div className="grid grid-cols-3 gap-2 sm:gap-4">{[
          { label: "Correct", value: correct, color: "text-emerald-300" }, { label: "Incorrect", value: incorrect, color: "text-rose-300" },
          { label: "First-try score", value: recallAccuracy(correct, session.total), color: "text-sky-300" },
        ].map((item) => <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.02] p-3 text-center sm:p-5"><p className={`text-2xl font-semibold sm:text-3xl ${item.color}`}>{item.value}</p><p className="mt-2 text-[11px] text-slate-400 sm:text-xs">{item.label}</p></div>)}</div> : null}
        <div className="flex flex-wrap justify-center gap-3"><button className="recall-btn recall-btn-primary" onClick={onExit}>Back to my notes<ArrowRight size={16} /></button>
          {session.total ? <button className="recall-btn" onClick={onRestart}>{config.mode === "master" ? <Shuffle size={16} /> : <RotateCcw size={16} />}{config.mode === "master" ? "Try a new shuffle" : "Practise again"}</button>
            : config.lessonId ? <button className="recall-btn" onClick={() => onRead(config.lessonId!, config.sectionId)}><BookOpen size={16} />{config.sectionId ? "Read note" : "Read lesson"}</button> : null}</div>
      </section>
      {missedNotes.size ? <section className="space-y-3"><h2 className="text-lg font-semibold">Give these notes another look</h2><p className="text-sm text-slate-400">A correct retry is useful practice. The first-answer result stays the same.</p>
        {Array.from(missedNotes.values()).map(({ note, count }) => <div key={`${note.lesson_id}:${note.section_id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-300/15 bg-rose-300/[0.03] p-4"><div><p className="mb-1 text-xs text-slate-500">{note.subject_name} · {note.lesson_title}</p><h3 className="text-sm font-semibold">{note.heading}</h3><p className="mt-1 text-xs text-rose-300">{count} incorrect {count === 1 ? "answer" : "answers"}</p></div>
          <div className="flex flex-wrap gap-2"><button className="recall-btn text-xs" onClick={() => onRead(note.lesson_id, note.section_id)}><BookOpen size={14} />Read note</button><button className="recall-btn text-xs" onClick={() => onPractiseNote(note.lesson_id, note.section_id)}>Recall note<ArrowRight size={14} /></button></div></div>)}
      </section> : null}
      {session.results.length ? <details className="recall-panel"><summary className="cursor-pointer text-sm font-semibold focus-visible:outline-sky-300">Question-by-question results</summary><ol className="mt-4 divide-y divide-white/10">{session.results.map((item, index) => <li key={item.card_id} className="flex items-start gap-3 py-4">
        {item.correct ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-300" /> : <XCircle size={18} className="mt-0.5 shrink-0 text-rose-300" />}<div><p className="text-sm text-slate-200">{index + 1}. {item.prompt}</p><p className="mt-1 text-xs text-slate-500">{item.heading} · <span className={item.correct ? "text-emerald-300" : "text-rose-300"}>{item.correct ? "Correct" : "Incorrect"}</span></p></div>
      </li>)}</ol></details> : null}
    </> : card ? <>
      <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/95 p-4 shadow-lg shadow-black/20 backdrop-blur-md sm:sticky sm:top-3 sm:z-10"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="recall-eyebrow mb-2">{session.mode === "master" ? "All studied topics · shuffled" : session.mode === "note" ? "Single-note recall" : session.mode === "lesson" ? "Lesson recall" : "Your daily review"}</p><h1 className="text-lg font-semibold text-slate-200">{session.title}</h1></div>
        <p className="text-sm tabular-nums text-slate-400" aria-live="polite"><span className="font-semibold text-white">{session.completed}</span> / {session.total} completed</p></div>
        <div role="progressbar" aria-label="Questions completed" aria-valuemin={0} aria-valuemax={session.total} aria-valuenow={session.completed} aria-valuetext={`${session.completed} of ${session.total} questions completed`} className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-sky-300 transition-[width] duration-300" style={{ width: `${session.completed * 100 / session.total}%` }} /></div>
        <div className="flex items-center justify-between gap-3 text-xs"><p className="text-slate-500">Question {session.position + 1} of {session.total}</p><p className="flex gap-4"><span className="text-emerald-300">{correct} correct</span><span className="text-rose-300">{incorrect} incorrect</span></p></div>
      </div>
      <section className="recall-panel space-y-6">
        <div className="flex flex-wrap items-center gap-2 text-[11px]"><span className="rounded-lg bg-sky-300/10 px-2.5 py-1.5 font-medium text-sky-300">{recallKinds[card.kind]}</span><span className="text-slate-500">{retrying ? "Practice retry" : card.delayed ? "Delayed recall check" : card.scheduled ? "Learning check" : "Extra practice"}</span></div>
        <div><p className="mb-3 text-xs leading-6 text-slate-500">{card.subject_name} / {card.lesson_title} / {card.heading}</p><h2 className="whitespace-pre-wrap font-heading text-xl font-semibold leading-relaxed tracking-tight text-white sm:text-2xl">{card.prompt}</h2></div>
        {!result ? <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); check(false); }}>
          <label className="recall-label" htmlFor="recall-answer">{card.answer_format === "list" ? `Recall all ${card.item_count} list ${card.item_count === 1 ? "item" : "items"}, in order` : "Type the exact answer from memory"}</label>
          {restored ? <p role="status" className="text-xs leading-6 text-sky-300">Your unfinished answer has been restored on this device.</p> : null}
          <textarea id="recall-answer" ref={input} className="recall-field min-h-52 scroll-mt-8 bg-slate-950/80 p-4 leading-8 sm:scroll-mt-44 sm:p-5 sm:text-lg" rows={6} maxLength={2000} value={answer} disabled={busy} onChange={(event) => saveAnswerDraft(event.target.value)}
            onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key === "Enter") { event.preventDefault(); check(false); } }}
            spellCheck={false} autoCorrect="off" autoComplete="off" autoCapitalize="off" aria-describedby="recall-rules"
             placeholder={card.answer_format === "list" ? "One item per line. Leave out the numbers…" : "Take a breath. What do you remember?"} />
          {card.answer_format === "list" ? <p className="text-xs tabular-nums text-sky-300">{answer.split(/\r?\n/).filter((item) => item.trim()).length} lines entered · {card.item_count} list items to recall</p> : null}
          <div className="flex items-start justify-between gap-4"><p id="recall-rules" className="max-w-lg text-xs leading-6 text-slate-500">Match the words, spelling, punctuation and order. Capitalisation and extra spaces are ignored.{card.answer_format === "list" ? " Type each item without its number or bullet." : ""}</p><span className="shrink-0 pt-1 text-[10px] tabular-nums text-slate-600">{answer.length}/2000</span></div>
          <div className="flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row"><button className="recall-btn recall-btn-primary sm:flex-1" disabled={busy || !answer.trim()}>{busy ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}{busy ? "Checking…" : "Check my answer"}</button>
            <button type="button" className="recall-btn" disabled={busy} onClick={() => check(true)}><Eye size={16} />Show answer</button></div>
          <p className="text-center text-[11px] text-slate-500">Showing the answer counts as incorrect. You can then hide it and retry.</p>
        </form> : <div ref={feedbackRef} tabIndex={-1} className="scroll-mt-8 space-y-5 outline-none sm:scroll-mt-44" aria-live="polite">
          <div className={`flex items-start gap-3 rounded-2xl border p-4 ${result.correct ? "border-emerald-300/20 bg-emerald-300/5" : "border-rose-300/20 bg-rose-300/5"}`}>
            {result.correct ? <CheckCircle2 size={22} className="mt-0.5 shrink-0 text-emerald-300" /> : <XCircle size={22} className="mt-0.5 shrink-0 text-rose-300" />}<div><h3 className={`font-semibold ${result.correct ? "text-emerald-300" : "text-rose-300"}`}>{result.correct ? "Exact match. Nicely recalled!" : feedback?.revealed ? "Let’s learn this one." : "Not quite. You’re building the memory."}</h3>
              <p className="mt-2 text-xs leading-6 text-slate-400">{!result.first_attempt ? "This was a practice retry. Your first-answer score stays the same." : result.delayed ? `Recorded as a ${result.correct ? "successful" : "missed"} delayed check.` : result.scheduled === false ? "Extra practice saved. A correct early answer keeps your existing review date." : "Learning check saved. Longer-term retention is tested on later days."}</p></div>
          </div>
          {!result.correct && feedback?.answer ? <div><p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Your answer</p><p className="whitespace-pre-wrap rounded-xl border border-white/10 p-4 text-sm leading-7 text-slate-400">{feedback.answer}</p><p className="mt-2 text-xs leading-6 text-amber-200">{firstDifference(result.expected_answer, feedback.answer)}</p></div> : null}
          {result.items?.length ? <div className="space-y-3"><p className="text-xs font-semibold text-slate-300">Item-by-item check</p><ol className="grid grid-cols-2 gap-2 sm:grid-cols-3">{result.items.map((item) => <li key={item.position} className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-xs ${item.correct ? "border-emerald-300/20 bg-emerald-300/5 text-emerald-300" : "border-rose-300/20 bg-rose-300/5 text-rose-300"}`}>{item.correct ? <CheckCircle2 size={14} className="mt-0.5 shrink-0" /> : <XCircle size={14} className="mt-0.5 shrink-0" />}<span>Item {item.position}<span className="mt-1 block text-[11px]">{item.correct ? "Exact match" : "Review wording / order"}</span></span></li>)}</ol><p className="text-xs leading-6 text-slate-500">These hints guide your retry. The whole list must match for a correct answer.</p></div> : null}
          <div className="rounded-2xl border border-sky-300/15 bg-sky-300/5 p-5"><p className="recall-eyebrow mb-3">Model answer</p><div className="text-base text-slate-100"><RecallAnswer answer={result.expected_answer} format={card.answer_format} /></div></div>
          <p className="text-xs text-slate-500">Next scheduled check: {recallDate(result.next_due_at)}</p>
          <div className="flex flex-col gap-3 sm:flex-row">{!result.correct && !result.review_finished ? <button className="recall-btn" disabled={busy} onClick={() => { setRetrying(true); saveAnswerDraft("", true); setError(""); }}><RotateCcw size={16} />Hide answer &amp; retry</button> : null}
            <button className="recall-btn recall-btn-primary sm:ml-auto" disabled={busy} onClick={() => void perform({ action: "session-next", position: session.position })}>{busy ? <Loader2 size={16} className="animate-spin" /> : null}{session.position + 1 === session.total ? "See my results" : "Next question"}<ArrowRight size={16} /></button></div>
          {!result.correct && result.review_finished ? <p className="text-xs leading-6 text-slate-400">Time for a short break from this question. It returns to your scheduled review in two minutes.</p> : null}
        </div>}
      </section>
      <p className="text-center text-xs leading-6 text-slate-500">One question at a time. Your progress matters more than your speed.</p>
    </> : null}
  </div>;
}

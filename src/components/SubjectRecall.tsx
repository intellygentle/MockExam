"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { BookOpen, BrainCircuit, RotateCcw, Eye, ArrowLeft, ArrowRight } from "lucide-react";
import { recallAccuracy, recallDate, recallKinds, recallRequest,
  type RecallCard, type RecallLesson, type RecallLibrary, type RecallQueue, type RecallResult, type RecallStats } from "@/lib/subject-recall";

const button = "inline-flex items-center justify-center gap-2 rounded-xl bg-policeGold px-4 py-3 text-sm font-bold text-policeBlue disabled:opacity-40 disabled:cursor-not-allowed";
const secondary = "inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 px-4 py-3 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed";
const field = "w-full rounded-xl border border-white/20 bg-black/30 px-4 py-3 text-white outline-none focus:border-policeGold";
const noteSections = [
  { kind: "definition", title: "Definition" },
  { kind: "terminology", title: "Terminology" },
  { kind: "importance", title: "Importance" },
  { kind: "features", title: "Features" },
  { kind: "other", title: "Other notes" },
] as const;

function Stats({ stats }: { stats: RecallStats }) {
  return <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
    {[
      ["Due questions", String(stats.due_cards)], ["Practised today", String(stats.practised_today)],
      ["Retained sections", `${stats.retained_cards}/${stats.total_cards}`],
      ["Delayed recall", recallAccuracy(stats.delayed_correct, stats.delayed_attempts)],
    ].map(([label, value]) => <div key={label} className="rounded-xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs text-white/50">{label}</p><p className="mt-1 text-lg font-bold text-policeGold">{value}</p>
    </div>)}
  </div>;
}

function firstDifference(expected: string, actual: string) {
  const words = expected.trim().split(/\s+/);
  const typed = actual.trim().split(/\s+/);
  const index = words.findIndex((word, i) => word.toLowerCase() !== typed[i]?.toLowerCase());
  return index < 0 ? "Remove the extra words after the model answer." : `Check word ${index + 1}: the notes say “${words[index]}”.`;
}

function groupCards(cards: RecallCard[]) {
  const groups: { key: string; cards: RecallCard[] }[] = [];
  for (const card of cards) {
    const key = card.section_id ?? card.id;
    const group = groups.find((item) => item.key === key);
    if (group) group.cards.push(card); else groups.push({ key, cards: [card] });
  }
  return groups;
}

export default function SubjectRecall({ startWithReview = false }: { startWithReview?: boolean }) {
  const [ready, setReady] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [draftName, setDraftName] = useState("");
  const [draftSchool, setDraftSchool] = useState("");
  const [library, setLibrary] = useState<RecallLibrary | null>(null);
  const [page, setPage] = useState(1);
  const [subject, setSubject] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"library" | "notes" | "review">(startWithReview ? "review" : "library");
  const [lesson, setLesson] = useState<RecallLesson | null>(null);
  const [notes, setNotes] = useState<{ cards: RecallCard[]; due_at: string } | null>(null);
  const [reviewLesson, setReviewLesson] = useState<string | null>(null);
  const [queue, setQueue] = useState<RecallQueue | null>(null);
  const [result, setResult] = useState<RecallResult | null>(null);
  const [answer, setAnswer] = useState("");
  const [submittedAnswer, setSubmittedAnswer] = useState("");
  const [retrying, setRetrying] = useState(false);
  const [reviews, setReviews] = useState<{ id: string; correct: boolean }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [clock, setClock] = useState(0);
  const [offset, setOffset] = useState(0);
  const input = useRef<HTMLTextAreaElement>(null);
  const request = useRef<{ id: string; review: string; answer: string; reveal: boolean } | null>(null);
  const card = queue?.card;

  useEffect(() => {
    setStudentName(localStorage.getItem("scholars-arena-name") || "");
    setSchoolName(localStorage.getItem("scholars-arena-school") || "");
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    let active = true;
    setLoading(true);
    const params = new URLSearchParams({ studentName, schoolName, page: String(page) });
    if (subject) params.set("subject", subject);
    recallRequest<RecallLibrary>(`/api/recall?${params}`).then((data) => {
      if (active) { setLibrary(data); setLoadError(""); }
    }).catch((err: Error) => { if (active) setLoadError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [ready, studentName, schoolName, page, subject, refresh]);
  useEffect(() => { if (card && !result) input.current?.focus(); }, [card, result]);
  useEffect(() => {
    if (view !== "review" || !queue?.next_due_at || card) return;
    const timer = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [view, queue, card]);

  async function run<T>(operation: () => Promise<T>, complete: (data: T) => void) {
    if (busy) return;
    setBusy(true); setError("");
    try { complete(await operation()); setRefresh((value) => value + 1); }
    catch (err) { setError(err instanceof Error ? err.message : "Check your connection and try again."); }
    finally { setBusy(false); }
  }
  function back() {
    setView("library"); setNotes(null); setQueue(null); setResult(null); setError("");
    setRefresh((value) => value + 1);
  }
  function next(lessonId: string | null, previousId: string | null = null) {
    setView("review"); setReviewLesson(lessonId); setQueue(null); setResult(null); setAnswer("");
    setNotes(null); setRetrying(false); request.current = null;
    void run(() => recallRequest<RecallQueue>("/api/recall", { action: "next", studentName, schoolName, lessonId, previousId }), (data) => {
      const now = Date.now(); setClock(now); setOffset(Date.parse(data.server_now) - now); setQueue(data);
    });
  }
  function check(reveal: boolean) {
    if (!card || busy || (!reveal && !answer.trim())) return;
    const text = reveal ? "" : answer;
    if (!request.current || request.current.review !== card.review_id || request.current.answer !== text || request.current.reveal !== reveal) {
      request.current = { id: crypto.randomUUID(), review: card.review_id, answer: text, reveal };
    }
    const requestId = request.current.id;
    void run(() => recallRequest<RecallResult>("/api/recall", { action: "answer", studentName, schoolName,
      reviewId: card.review_id, requestId, answer: text, reveal }), (data) => {
      setResult(data); setSubmittedAnswer(text); request.current = null;
      if (data.first_attempt) setReviews((items) => items.some((item) => item.id === card.review_id)
        ? items : [...items, { id: card.review_id, correct: data.correct }]);
    });
  }
  function saveName(event: FormEvent) {
    event.preventDefault();
    localStorage.setItem("scholars-arena-name", draftName.trim());
    localStorage.setItem("scholars-arena-school", draftSchool.trim());
    setStudentName(draftName.trim()); setSchoolName(draftSchool.trim());
  }
  const activeLesson = library?.lessons.find((item) => item.id === lesson?.id) ?? lesson;
  const seconds = queue?.next_due_at ? Math.max(0, Math.ceil((Date.parse(queue.next_due_at) - clock - offset) / 1000)) : 0;

  return <div className="mx-auto max-w-5xl space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-xs uppercase tracking-widest text-sky-300">Subject notes stack</p>
        <h1 className="font-heading text-3xl font-bold text-policeGold">Learn &amp; Recall</h1></div>
      <Link href="/drill" className="text-sm text-white/60 hover:text-white">Back to the Arena</Link>
    </div>
    {!ready ? <p role="status">Loading your routine…</p> : !studentName ? <form onSubmit={saveName} className="card space-y-4">
      <h2 className="font-bold text-xl">Save your learning identity</h2>
      <p className="text-sm text-white/60">Use the same nickname and school on each visit so your progress stays together.</p>
      <label className="block space-y-2">Nickname<input className={field} value={draftName} onChange={(event) => setDraftName(event.target.value)} required maxLength={80} /></label>
      <label className="block space-y-2">School (optional)<input className={field} value={draftSchool} onChange={(event) => setDraftSchool(event.target.value)} maxLength={120} /></label>
      <button className={button} disabled={!draftName.trim()}>Save and continue</button>
    </form> : <>
      <div className="flex flex-wrap items-center gap-3 text-sm text-white/50">
        <p>Practising as {studentName}{schoolName ? ` · ${schoolName}` : ""}</p>
        <button className="text-sky-300 underline disabled:opacity-40" disabled={busy} onClick={() => {
          setDraftName(studentName); setDraftSchool(schoolName); setStudentName("");
          setView("library"); setNotes(null); setQueue(null); setResult(null); setReviews([]); setError("");
        }}>Change</button>
      </div>
      {view !== "library" ? <button className={secondary} onClick={back} disabled={busy}><ArrowLeft size={16} />All subject notes</button> : null}
      {error ? <p role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-red-200">{error}</p> : null}
      {view === "library" ? <>
        {loadError ? <div role="alert" className="card space-y-3"><p>{loadError}</p><button className={secondary} onClick={() => setRefresh((v) => v + 1)}>Try again</button></div> : null}
        {library ? <>
          <div className="card border-sky-400/30 space-y-4">
            <h2 className="text-xl font-bold">A little recall, every day</h2>
            <p className="text-sm text-white/60">Start with up to 10 due questions, then learn a short new lesson. Mistakes return sooner; remembered notes return after longer gaps.</p>
            <Stats stats={library.stats} />
            <button className={button} onClick={() => next(null)} disabled={busy || !library.stats.studied_cards}><RotateCcw size={16} />Review my notes{library.stats.due_cards ? ` (${library.stats.due_cards} due)` : ""}</button>
            {library.stats.next_due_at && !library.stats.due_cards ? <p className="text-xs text-white/50">Next check: {recallDate(library.stats.next_due_at)}</p> : null}
          </div>
          <label className="flex flex-wrap items-center gap-3 text-sm">Subject
            <select className={`${field} max-w-sm`} value={subject} onChange={(event) => { setSubject(event.target.value); setPage(1); }}>
              <option value="">All subjects</option>{library.subjects.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.level.toUpperCase()}</option>)}
            </select>
          </label>
          {loading ? <p role="status" className="text-sm text-white/50">Updating notes…</p> : null}
          {!library.lessons.length ? <p className="card text-white/60">Published subject notes will appear here. Choose another subject or check back after your teacher adds a lesson.</p> : null}
          <div className="grid gap-4 md:grid-cols-2">{library.lessons.map((item) => <section key={item.id} className="card space-y-3">
            <p className="text-xs text-sky-300">{item.subject_name} · {item.level.toUpperCase()}</p><h2 className="text-xl font-bold">{item.title}</h2>
            <p className="text-sm text-white/60">{item.studied_cards}/{item.total_cards} started · {item.retained_cards}/{item.total_cards} retained · {item.due_cards} due</p>
            <p className="text-sm text-white/60">Delayed recall: {recallAccuracy(item.delayed_correct, item.delayed_attempts)} ({item.delayed_correct}/{item.delayed_attempts} checks)</p>
            <div className="flex flex-wrap gap-2"><button className={secondary} onClick={() => { setLesson(item); setNotes(null); setView("notes"); }}><BookOpen size={16} />Open lesson</button>
              {item.studied_cards ? <button className={button} onClick={() => next(item.id)} disabled={busy}>Review</button> : null}</div>
          </section>)}</div>
          <div className="flex items-center justify-between gap-3"><button className={secondary} disabled={page <= 1 || loading} onClick={() => setPage((v) => v - 1)}>Previous</button>
            <span className="text-sm text-white/50">Page {page}</span><button className={secondary} disabled={page * 12 >= library.count || loading} onClick={() => setPage((v) => v + 1)}>Next</button></div>
        </> : !loadError ? <p role="status">Loading subject notes…</p> : null}
      </> : view === "notes" && activeLesson ? <>
        <h2 className="text-2xl font-bold">{activeLesson.title}</h2><Stats stats={activeLesson} />
        {!notes ? <div className="card space-y-4">
          <p>Read each topic, then hide the notes and type the answer to each entry from memory. The first check is ready as soon as you are.</p>
          <div className="flex flex-wrap gap-2"><button className={button} disabled={busy} onClick={() => void run(() => recallRequest<{ cards: RecallCard[]; due_at: string }>("/api/recall", {
            action: "read", studentName, schoolName, lessonId: activeLesson.id,
          }), setNotes)}><BookOpen size={16} />{busy ? "Opening…" : "Read lesson notes"}</button>
            {activeLesson.studied_cards ? <button className={secondary} disabled={busy} onClick={() => next(activeLesson.id)}>Review from memory</button> : null}</div>
          {activeLesson.studied_cards ? <p className="text-xs text-white/50">Rereading starts a fresh short practice cycle. Review first to check what you retained.</p> : null}
        </div> : <>
          <p className="rounded-xl bg-sky-400/10 p-4 text-sm">Learn the exact answer for each entry. Capitalisation and extra spaces are ignored; words, spelling, order and punctuation must match.</p>
          {activeLesson.introduction ? <div className="card whitespace-pre-wrap leading-7">{activeLesson.introduction}</div> : null}
          {groupCards(notes.cards).map((group, index) => {
            const section = group.cards[0];
            return <section key={group.key} className="card space-y-4">
              <h3 className="text-xl font-bold">{index + 1}. {section.heading}</h3>
              {noteSections.map(({ kind, title }) => {
                const items = group.cards.filter((item) => item.kind === kind);
                if (!items.length) return null;
                const showPrompt = kind === "terminology" || kind === "features" || kind === "other";
                return <div key={kind} className="space-y-2">
                  <h4 className="text-xs uppercase tracking-widest text-sky-300">{title}</h4>
                  {items.map((item) => <div key={item.id} className="space-y-2 rounded-xl border border-white/10 p-4">
                    {showPrompt ? <p className="font-bold whitespace-pre-wrap">{item.prompt}</p> : null}
                    <p className="whitespace-pre-wrap leading-7">{item.answer}</p>
                    {item.explanation ? <p className="text-sm whitespace-pre-wrap leading-6 text-white/60">{item.explanation}</p> : null}
                  </div>)}
                </div>;
              })}
            </section>;
          })}
          <div className="card flex flex-wrap items-center justify-between gap-3"><p className="text-sm">Your first check is ready now.</p>
            <button className={button} disabled={busy} onClick={() => next(activeLesson.id)}><BrainCircuit size={16} />Hide notes &amp; practise</button></div>
        </>}
      </> : view === "review" ? <>
        <p aria-live="polite" className="text-sm text-white/50">{reviews.length} reviewed · {reviews.filter((r) => r.correct).length} correct first time</p>
        {reviews.length > 0 && reviews.length % 10 === 0 && result ? <p className="rounded-xl bg-sky-400/10 p-4">A good stopping point: take a break, or continue with your next due question.</p> : null}
        {!queue ? <div className="card space-y-4"><h2 className="text-xl font-bold">Your daily recall routine</h2>
          <p className="text-white/60">Answer from memory. Your first answer counts for this check; retries help you practise.</p>
          <button className={button} disabled={busy} onClick={() => next(reviewLesson)}>{busy ? "Finding a question…" : "Start review"}</button></div>
        : !card ? <div className="card space-y-4"><h2 className="text-xl font-bold">You’re up to date for now</h2>
          <p>{queue.next_due_at ? seconds > 0 && seconds < 600 ? `Next check in ${Math.floor(seconds / 60)}m ${seconds % 60}s` : seconds === 0 ? "A review is now ready." : `Next review: ${recallDate(queue.next_due_at)}` : "Read a lesson to add questions to your routine."}</p>
          <div className="flex flex-wrap gap-2"><button className={button} disabled={busy || seconds > 0} onClick={() => next(reviewLesson)}>Check due questions</button>
            <button className={secondary} onClick={back}>Browse notes</button>{reviewLesson ? <button className={secondary} onClick={() => next(null)} disabled={busy}>Review all subjects</button> : null}</div></div>
        : <section className="card space-y-5">
          <p className="text-xs text-sky-300">{card.subject_name} · {card.lesson_title} · {card.heading}</p>
          <p className="text-xs text-white/50">{recallKinds[card.kind]} · {retrying ? "Practice retry" : card.delayed ? "Delayed recall" : "Learning check"}</p>
          <h2 className="text-xl font-bold whitespace-pre-wrap">{card.prompt}</h2>
          {!result ? <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); check(false); }}>
            <label className="block space-y-2">Type the answer from your notes<textarea ref={input} className={field} rows={6} maxLength={2000} value={answer} onChange={(event) => setAnswer(event.target.value)}
              disabled={busy} spellCheck={false} autoCorrect="off" autoComplete="off" autoCapitalize="off" aria-describedby="recall-rules" /></label>
            <p id="recall-rules" className="text-xs text-white/50">Use the same words, spelling, order and punctuation. Capitalisation and extra spaces are ignored.</p>
            <div className="flex flex-wrap gap-2"><button className={button} disabled={busy || !answer.trim()}>{busy ? "Checking…" : "Check my answer"}</button>
              <button type="button" className={secondary} disabled={busy} onClick={() => check(true)}><Eye size={16} />Show the answer</button></div>
            <p className="text-xs text-white/50">Showing the answer counts as a miss. You can then practise it again.</p>
          </form> : <div className="space-y-4" aria-live="polite">
            <div className={`rounded-xl border p-4 ${result.correct ? "border-green-400/30 bg-green-400/10" : "border-amber-400/30 bg-amber-400/10"}`}>
              <p className="font-bold">{result.correct ? "Exact match — well done." : "Read the model answer, then try again."}</p>
              <p className="mt-1 text-sm text-white/60">{result.first_attempt ? result.delayed ? `Recorded as a ${result.correct ? "successful" : "missed"} delayed check.` : "Recorded as a learning check. Longer-term recall is tested on later days." : "Recorded as practice. This round’s first-answer result stays the same."}</p>
            </div>
            {!result.correct && submittedAnswer ? <div className="space-y-2"><p className="text-xs text-white/50">Your answer</p><p className="whitespace-pre-wrap border border-white/10 rounded-xl p-3">{submittedAnswer}</p><p className="text-sm text-amber-200">{firstDifference(result.expected_answer, submittedAnswer)}</p></div> : null}
            <div className="rounded-xl bg-white/5 p-4"><p className="mb-2 text-xs text-white/50">Model answer</p><p className="whitespace-pre-wrap leading-7">{result.expected_answer}</p></div>
            <p className="text-sm text-white/60">Next check: {recallDate(result.next_due_at)}</p>
            <div className="flex flex-wrap gap-2">{!result.correct && !result.review_finished ? <button className={button} onClick={() => { setResult(null); setAnswer(""); setRetrying(true); }}>Hide answer &amp; retry</button> : null}
              <button className={secondary} disabled={busy} onClick={() => next(reviewLesson, card.id)}>{result.correct ? "Next question" : "Practise another card"}<ArrowRight size={16} /></button></div>
            {!result.correct && result.review_finished ? <p className="text-sm">Take a short break from this card. It returns in two minutes.</p> : null}
          </div>}
          {error ? <button className={secondary} disabled={busy} onClick={() => next(reviewLesson, card.id)}>Load the next review</button> : null}
        </section>}
        <p className="text-center text-xs text-white/50">10 minutes → 1 day → 3 days → 7 days → 14 days → monthly. A miss returns that entry after two minutes.</p>
      </> : null}
      <p className="text-xs leading-6 text-white/50">Retention uses first answers after at least 24 hours without seeing the model. Three successful delayed checks, with reviews up to date, mark a section as retained. Immediate retries do not raise retention scores.</p>
    </>}
  </div>;
}

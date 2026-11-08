"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, BrainCircuit, ChevronRight, Clock3, Focus, Layers3, Loader2, Play, RotateCcw, Shuffle, UserRound } from "lucide-react";
import RecallReading from "@/components/recall/RecallReading";
import RecallPractice from "@/components/recall/RecallPractice";
import { RecallReviewNotes, RecallStatsGrid } from "@/components/recall/RecallMetrics";
import { recallAccuracy, recallDate, recallId, recallRequest, recallSessionKey,
  type RecallCard, type RecallLesson, type RecallLibrary, type RecallPracticeConfig, type RecallResume, type RecallSessionMode } from "@/lib/subject-recall";
import { notifyRecallProgress, useRecallRefresh } from "@/lib/useRecallRefresh";

function readResume(student: string, school: string): RecallResume | null {
  try {
    const saved: RecallResume | null = JSON.parse(localStorage.getItem(recallSessionKey(student, school)) || "null");
    return saved && recallId(saved.id) && ["due", "note", "lesson", "master"].includes(saved.mode) &&
      (saved.lessonId == null || recallId(saved.lessonId)) && (saved.sectionId == null || recallId(saved.sectionId)) &&
      typeof saved.title === "string" && Number.isSafeInteger(saved.completed) && saved.completed >= 0 &&
      Number.isSafeInteger(saved.total) && saved.total >= saved.completed ? saved : null;
  } catch { return null; }
}

export default function SubjectRecall({ initialMode, initialLessonId, initialSectionId, initialSessionId }: {
  initialMode?: RecallSessionMode; initialLessonId?: string; initialSectionId?: string; initialSessionId?: string;
}) {
  const [ready, setReady] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [draftName, setDraftName] = useState("");
  const [draftSchool, setDraftSchool] = useState("");
  const [library, setLibrary] = useState<RecallLibrary | null>(null);
  const [page, setPage] = useState(1);
  const [subject, setSubject] = useState("");
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"library" | "lesson" | "reading" | "practice">("library");
  const [lesson, setLesson] = useState<RecallLesson | null>(null);
  const [cards, setCards] = useState<RecallCard[] | null>(null);
  const [readingSectionId, setReadingSectionId] = useState<string | undefined>();
  const [practice, setPractice] = useState<RecallPracticeConfig | null>(null);
  const [resume, setResume] = useState<RecallResume | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [focus, setFocus] = useState(true);
  const lock = useRef(false);
  const entryHandled = useRef(false);
  const activeLesson = lesson;
  const [refresh, refreshLibrary] = useRecallRefresh(library?.stats.next_due_at, ready && !!studentName && view === "library");

  useEffect(() => {
    try {
      setStudentName(localStorage.getItem("scholars-arena-name") || "");
      setSchoolName(localStorage.getItem("scholars-arena-school") || "");
      setFocus(localStorage.getItem("scholars-arena-recall-focus") !== "off");
    } catch { /* A student can still enter an identity for this visit. */ }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || !studentName) return;
    let active = true;
    setLoading(true); setLoadError("");
    const params = new URLSearchParams({ studentName, schoolName, page: String(page) });
    if (subject) params.set("subject", subject);
    recallRequest<RecallLibrary>(`/api/recall?${params}`).then((data) => { if (active) setLibrary(data); })
      .catch((err: Error) => { if (active) setLoadError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [ready, studentName, schoolName, page, subject, refresh]);

  useEffect(() => {
    if (!ready || !studentName || view !== "library") return;
    setResume(readResume(studentName, schoolName));
  }, [ready, studentName, schoolName, view]);

  useEffect(() => {
    if (!ready || !studentName || entryHandled.current) return;
    entryHandled.current = true;
    if (initialMode) {
      const saved = readResume(studentName, schoolName);
      if (initialSessionId) {
        showPractice({ id: initialSessionId, mode: initialMode, lessonId: initialLessonId, sectionId: initialSectionId, resume: true });
      } else if (saved?.mode === initialMode && saved.lessonId === initialLessonId && saved.sectionId === initialSectionId) {
        showPractice({ ...saved, resume: true });
      } else startPractice(initialMode, initialLessonId, initialSectionId);
    }
    else if (initialLessonId) void openLesson(initialLessonId, undefined, initialSectionId);
    // Entry links are applied once, after the learning identity is ready.
  }, [ready, studentName, initialMode, initialLessonId, initialSectionId, initialSessionId]);

  useEffect(() => {
    document.body.classList.toggle("recall-focus", focus && studentName !== "" && (view === "reading" || view === "practice"));
    return () => document.body.classList.remove("recall-focus");
  }, [focus, view, studentName]);

  useEffect(() => { window.scrollTo({ top: 0, behavior: "auto" }); }, [view, practice?.id, lesson?.id]);

  function back() {
    setView("library"); setCards(null); setPractice(null); setError(""); refreshLibrary();
    window.history.replaceState(null, "", "/recall");
  }
  function startPractice(mode: RecallSessionMode, lessonId?: string, sectionId?: string) {
    showPractice({ id: crypto.randomUUID(), mode, lessonId, sectionId });
  }
  function showPractice(next: RecallPracticeConfig) {
    setCards(null); setError(""); setPractice(next); setView("practice");
    const params = new URLSearchParams({ mode: next.mode, session: next.id });
    if (next.lessonId) params.set("lesson", next.lessonId);
    if (next.sectionId) params.set("note", next.sectionId);
    window.history.replaceState(null, "", `/recall?${params}`);
  }
  async function openLesson(id: string, known?: RecallLesson, sectionId?: string) {
    if (lock.current) return;
    setCards(null); setPractice(null); setView("lesson"); setLesson(known ?? null); setError("");
    const params = new URLSearchParams({ lesson: id });
    if (sectionId) params.set("note", sectionId);
    window.history.replaceState(null, "", `/recall?${params}`);
    if (known && !sectionId) return;
    lock.current = true; setBusy(true);
    try {
      const params = new URLSearchParams({ studentName, schoolName, lesson: id });
      const data = await recallRequest<RecallLibrary>(`/api/recall?${params}`);
      const found = data.lessons.find((item) => item.id === id);
      if (!found) throw new Error("This lesson is no longer available. Choose another published lesson.");
      setLesson(found);
      if (sectionId) {
        const notes = await recallRequest<{ cards: RecallCard[] }>("/api/recall", { action: "read", studentName, schoolName, lessonId: id, sectionId });
        setCards(notes.cards); setReadingSectionId(sectionId); setView("reading"); refreshLibrary(); notifyRecallProgress();
      }
    } catch (err) { setError((err as Error).message); }
    finally { lock.current = false; setBusy(false); }
  }
  async function readLesson() {
    if (!activeLesson || lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try {
      const notes = await recallRequest<{ cards: RecallCard[] }>("/api/recall", { action: "read", studentName, schoolName, lessonId: activeLesson.id });
      setCards(notes.cards); setReadingSectionId(undefined); setView("reading"); refreshLibrary(); notifyRecallProgress();
      window.history.replaceState(null, "", `/recall?lesson=${activeLesson.id}`);
    } catch (err) { setError((err as Error).message); }
    finally { lock.current = false; setBusy(false); }
  }
  function saveName(event: FormEvent) {
    event.preventDefault();
    try {
      localStorage.setItem("scholars-arena-name", draftName.trim()); localStorage.setItem("scholars-arena-school", draftSchool.trim());
    } catch { /* Progress is associated with the entered identity on the server. */ }
    setLibrary(null); setStudentName(draftName.trim()); setSchoolName(draftSchool.trim());
  }

  return <div className="recall-workspace mx-auto max-w-5xl space-y-7 pb-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-sm text-slate-400"><Layers3 size={17} className="text-sky-300" /><span className="font-medium text-slate-200">Notes &amp; Recall</span>
        {view !== "library" ? <><ChevronRight size={14} className="text-slate-600" /><span className="text-xs">{view === "practice" ? "Practice" : view === "reading" ? "Reading" : "Lesson"}</span></> : null}</div>
      {view === "reading" || view === "practice" ? <button className={`recall-btn min-h-11 px-3 text-xs ${focus ? "border-sky-300/20 text-sky-300" : ""}`} aria-pressed={focus} onClick={() => { setFocus(!focus); try { localStorage.setItem("scholars-arena-recall-focus", focus ? "off" : "on"); } catch { /* Use this preference for the visit. */ } }}><Focus size={15} />Focus mode {focus ? "on" : "off"}</button>
        : <Link href="/drill" className="inline-flex min-h-11 items-center gap-2 text-xs text-slate-400 transition hover:text-white"><ArrowLeft size={14} />Back to the Arena</Link>}
    </div>
    {!ready ? <p role="status" className="py-12 text-center text-sm text-slate-400">Loading your learning space…</p> : !studentName ? <section className="recall-panel mx-auto max-w-lg space-y-6 py-8">
      <div><span className="mb-5 inline-flex rounded-2xl bg-sky-300/10 p-3 text-sky-300"><BrainCircuit size={28} /></span><p className="recall-eyebrow mb-2">Small steps. Lasting knowledge.</p><h1 className="font-heading text-2xl font-semibold">Make this space yours</h1><p className="mt-3 text-sm leading-7 text-slate-400">Use the same nickname and school each time. Your notes, reviews, and progress will stay together.</p></div>
      <form onSubmit={saveName} className="space-y-4"><label className="recall-label">Nickname<input className="recall-field" value={draftName} onChange={(event) => setDraftName(event.target.value)} required maxLength={80} autoComplete="nickname" placeholder="What should we call you?" /></label>
        <label className="recall-label">School <span className="font-normal text-slate-500">(optional)</span><input className="recall-field" value={draftSchool} onChange={(event) => setDraftSchool(event.target.value)} maxLength={120} autoComplete="organization" placeholder="Your school name" /></label>
        <button className="recall-btn recall-btn-primary w-full" disabled={!draftName.trim()}>Enter my learning space<ArrowRight size={16} /></button></form>
    </section> : <>
      {view !== "practice" && view !== "reading" ? <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500"><p className="flex items-center gap-1.5"><UserRound size={14} />Studying as <span className="font-medium text-slate-300">{studentName}</span>{schoolName ? ` · ${schoolName}` : ""}</p>
        <button className="min-h-11 px-1 text-sky-300 hover:underline disabled:opacity-40" disabled={busy} onClick={() => { setDraftName(studentName); setDraftSchool(schoolName); setStudentName(""); setLibrary(null); setView("library"); setCards(null); setPractice(null); setResume(null); setError(""); }}>Change</button></div> : null}
      {view === "lesson" || view === "reading" ? <button className="recall-btn" disabled={busy} onClick={back}><ArrowLeft size={16} />All subject notes</button> : null}
      {error ? <div role="alert" className="rounded-xl border border-rose-300/25 bg-rose-300/10 p-4 text-sm text-rose-200">{error}</div> : null}

      {view === "library" ? <>
        {resume ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sky-300/20 bg-sky-300/5 p-4"><div><p className="text-sm font-semibold text-sky-200">Pick up where you left off</p><p className="mt-1 text-xs text-slate-400">{resume.title} · {resume.completed}/{resume.total} checked</p></div><button className="recall-btn" onClick={() => showPractice({ ...resume, resume: true })}><Play size={15} />Resume practice</button></div> : null}
        <div className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
          <section className="relative overflow-hidden rounded-3xl border border-sky-300/20 bg-gradient-to-br from-sky-300/10 via-slate-950/70 to-slate-950 p-6 sm:p-8">
            <div className="pointer-events-none absolute -right-6 -top-6 h-40 w-40 rounded-full bg-sky-300/5 blur-2xl" />
            <p className="recall-eyebrow mb-4">Read. Recall. Remember.</p><h1 className="max-w-sm font-heading text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">Make knowledge<br />stay with you.</h1>
            <p className="mt-4 max-w-md text-sm leading-7 text-slate-400">A focused note, a moment of recall, a stronger memory. Start with the questions ready for you today.</p>
            {library && !library.stats.due_cards ? <a href="#lesson-library" className="recall-btn recall-btn-primary mt-6"><BookOpen size={16} />{library.stats.studied_cards ? "Keep learning" : "Explore your notes"}<ArrowRight size={16} /></a>
              : <button className="recall-btn recall-btn-primary mt-6" disabled={!library || loading} onClick={() => startPractice("due")}><RotateCcw size={16} />Daily review{library?.stats.due_cards ? ` · ${library.stats.due_cards} due` : ""}<ArrowRight size={16} /></button>}
            {library?.stats.next_due_at && !library.stats.due_cards ? <p className="mt-3 text-[11px] leading-6 text-slate-500">Next review: {recallDate(library.stats.next_due_at)}</p> : null}
          </section>
          <section className="flex flex-col items-start rounded-3xl border border-violet-300/15 bg-gradient-to-br from-violet-300/10 to-slate-950/80 p-6 sm:p-8">
            <span className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-300/10 text-violet-300"><Shuffle size={23} /></span><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-300">Connect the dots</p><h2 className="mt-2 text-xl font-semibold">The master test</h2>
            <p className="mt-3 flex-1 text-sm leading-7 text-slate-400">Every studied question, across every subject. One fresh shuffle. See what you can recall without your notes.</p>
            <p className="mt-5 text-xs text-violet-200">{library?.stats.studied_cards ?? 0} questions in your pool</p><button className="recall-btn mt-3 w-full border-violet-300/25" disabled={!library?.stats.studied_cards || loading} onClick={() => startPractice("master")}><Shuffle size={16} />Start master test<ArrowRight size={16} /></button>
          </section>
        </div>
        {loadError ? <div role="alert" className="recall-panel space-y-3"><p className="text-sm text-rose-200">{loadError}</p><button className="recall-btn" onClick={refreshLibrary}>Try again</button></div> : null}
        {library ? <>
          <section className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-semibold">Your recall at a glance</h2><Link href="/dashboard" className="inline-flex min-h-11 items-center gap-1 text-xs text-sky-300 hover:underline">Progress dashboard<ArrowRight size={14} /></Link></div><RecallStatsGrid stats={library.stats} /></section>
          <RecallReviewNotes notes={(library.review_notes ?? []).slice(0, 4)} count={library.review_note_count ?? 0} studied={library.stats.studied_cards} onPractise={(note) => startPractice("note", note.lesson_id, note.section_id)} onRead={(note) => void openLesson(note.lesson_id, undefined, note.section_id)} />
          <section className="space-y-5" aria-labelledby="lesson-library"><div className="flex flex-wrap items-end justify-between gap-4 border-t border-white/10 pt-7"><div><p className="recall-eyebrow mb-2">Build your foundation</p><h2 id="lesson-library" className="text-2xl font-semibold tracking-tight">Your subject notes</h2></div>
            <label className="recall-label w-full sm:w-auto"><span className="sr-only">Filter notes by subject</span><select className="recall-field sm:max-w-xs" value={subject} onChange={(event) => { setSubject(event.target.value); setPage(1); }}><option value="">All subjects</option>{library.subjects.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.level.toUpperCase()}</option>)}</select></label></div>
            {loading ? <p role="status" className="flex items-center gap-2 text-xs text-slate-400"><Loader2 size={15} className="animate-spin" />Updating notes…</p> : null}
            {!library.lessons.length && !loading ? <div className="recall-panel py-12 text-center"><BookOpen size={32} className="mx-auto mb-4 text-sky-300" /><h3 className="text-lg font-semibold">A little space for new knowledge</h3><p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-400">{subject ? "No published notes in this subject yet. Try another subject." : "Your teacher’s published lessons will appear here. Check back when your next lesson is ready."}</p></div> : null}
            <div className="grid gap-4 sm:grid-cols-2">{library.lessons.map((item) => <article key={item.id} className="group flex flex-col rounded-2xl border border-white/10 bg-slate-950/50 p-5 transition hover:border-sky-300/30 sm:p-6">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-2"><p className="text-[10px] font-semibold uppercase tracking-wider text-sky-300">{item.subject_name} · {item.level.toUpperCase()}</p><span className={`rounded-full px-2.5 py-1 text-[10px] ${item.due_cards ? "bg-amber-300/10 text-amber-300" : item.studied_cards ? "bg-emerald-300/10 text-emerald-300" : "bg-white/5 text-slate-400"}`}>{item.due_cards ? `${item.due_cards} due` : item.studied_cards ? "In your routine" : "New to you"}</span></div>
              <h3 className="flex-1 text-lg font-semibold leading-7 text-white">{item.title}</h3><p className="mt-3 text-xs text-slate-500">{item.total_cards} recall questions · {item.retained_cards} retained</p>
              <div className="mt-5 space-y-2"><div className="flex items-center justify-between gap-2 text-[11px] text-slate-500"><span>Study coverage</span><span>{item.studied_cards}/{item.total_cards}</span></div><div className="h-1 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-sky-300/60" style={{ width: `${item.total_cards ? item.studied_cards * 100 / item.total_cards : 0}%` }} /></div></div>
              <p className="mt-3 text-xs text-slate-400">First-try recall: {recallAccuracy(item.first_correct, item.first_attempts)}</p>
              <div className="mt-5 flex flex-wrap gap-2"><button className="recall-btn flex-1" disabled={busy || loading} onClick={() => void openLesson(item.id, item)}><BookOpen size={16} />Open lesson</button>{item.studied_cards ? <button className="recall-btn text-sky-300" disabled={loading} onClick={() => startPractice("lesson", item.id)}><BrainCircuit size={16} />Recall</button> : null}</div>
            </article>)}</div>
            {library.count > 12 ? <div className="flex items-center justify-between gap-3"><button className="recall-btn" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>Previous</button><span className="text-xs text-slate-500">Page {page} of {Math.ceil(library.count / 12)}</span><button className="recall-btn" disabled={page * 12 >= library.count || loading} onClick={() => setPage((value) => value + 1)}>Next</button></div> : null}
          </section>
          <details className="rounded-2xl border border-white/10 p-4 text-xs leading-7 text-slate-500"><summary className="cursor-pointer font-medium text-slate-400">How is retention measured?</summary><p className="mt-2">First-try accuracy includes the first answer to each question in a session. Delayed recall counts scheduled checks begun at least 24 hours after the model answer was last shown. Three consecutive successful delayed checks, with reviews up to date, mark a question as retained. Immediate retries help you learn without raising that score.</p><p className="mt-2">Review intervals: 10 minutes → 1 day → 3 days → 7 days → 14 days → monthly. Missed answers return after two minutes.</p></details>
        </> : !loadError ? <div role="status" className="recall-panel flex items-center justify-center gap-3 py-12 text-sm text-slate-400"><Loader2 size={20} className="animate-spin" />Loading your notes and progress…</div> : null}
      </> : view === "lesson" ? activeLesson ? <section className="recall-panel mx-auto max-w-3xl space-y-7">
        <div><p className="recall-eyebrow mb-4">{activeLesson.subject_name} · {activeLesson.level.toUpperCase()}</p><h1 className="font-heading text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{activeLesson.title}</h1><p className="mt-4 flex items-center gap-2 text-sm text-slate-400"><BookOpen size={16} />{activeLesson.total_cards} recall questions · A focused reading session</p></div>
        <ol className="grid gap-4 sm:grid-cols-3">{[
          ["01", "Read with intention", "Learn the definition, then connect it to the details."], ["02", "Hide your notes", "Recall one topic or practise the whole lesson."], ["03", "Return and remember", "Your review schedule strengthens the memory."],
        ].map(([number, title, text]) => <li key={number} className="rounded-2xl border border-white/10 p-4"><p className="mb-3 text-xs font-bold text-sky-300">{number}</p><h2 className="text-sm font-semibold">{title}</h2><p className="mt-2 text-xs leading-6 text-slate-500">{text}</p></li>)}</ol>
        <div className="flex flex-wrap gap-3"><button className="recall-btn recall-btn-primary" disabled={busy} onClick={() => void readLesson()}>{busy ? <Loader2 size={16} className="animate-spin" /> : <BookOpen size={16} />}{busy ? "Opening notes…" : "Start reading"}<ArrowRight size={16} /></button>
          {activeLesson.studied_cards ? <button className="recall-btn" disabled={busy} onClick={() => startPractice("lesson", activeLesson.id)}><BrainCircuit size={16} />Recall without reading</button> : null}</div>
        {activeLesson.studied_cards ? <p className="flex items-start gap-2 text-xs leading-6 text-slate-500"><Clock3 size={15} className="mt-1 shrink-0" />Try recall first to check what you retained. Rereading shows the answers and restarts the lesson’s short review cycle.</p> : null}
      </section> : busy ? <p role="status" className="py-12 text-center text-sm text-slate-400">Opening your lesson…</p> : null
      : view === "reading" && activeLesson && cards ? <RecallReading lesson={activeLesson} cards={cards} singleNote={!!readingSectionId} busy={busy}
        onPractiseNote={(sectionId) => startPractice("note", activeLesson.id, sectionId)} onPractiseLesson={() => startPractice("lesson", activeLesson.id)} onReadLesson={() => void readLesson()} />
      : view === "practice" && practice ? <RecallPractice key={practice.id} config={practice} studentName={studentName} schoolName={schoolName} onExit={back}
        onRestart={() => startPractice(practice.mode, practice.lessonId, practice.sectionId)} onRead={(id, sectionId) => void openLesson(id, undefined, sectionId)}
        onPractiseNote={(lessonId, sectionId) => startPractice("note", lessonId, sectionId)} /> : null}
    </>}
  </div>;
}

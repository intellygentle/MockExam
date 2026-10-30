"use client";

import { useEffect, useState, type FormEvent } from "react";
import { PlusCircle, Save, Trash2 } from "lucide-react";
import { recallAccuracy, recallDate, recallKinds, recallRequest, type RecallCard, type RecallReport } from "@/lib/subject-recall";

type Lesson = { id: string; subject_id: number; title: string; introduction: string; is_published: boolean; revision: number };
type Draft = Omit<Lesson, "id"> & { id: string | null; cards: RecallCard[] };
type Library = { lessons: Lesson[]; count: number; subjects: { id: number; name: string; level: string }[] };
type Detail = { lesson: Lesson; cards: RecallCard[]; report: RecallReport[] };
const field = "w-full rounded-xl border border-white/20 bg-black/40 p-3 text-white outline-none focus:border-policeGold";
const button = "inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2.5 text-sm font-bold disabled:opacity-40";

export default function AdminRecallPage() {
  const [library, setLibrary] = useState<Library | null>(null);
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [report, setReport] = useState<RecallReport[]>([]);
  const [reportPage, setReportPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    recallRequest<Library>(`/api/admin/recall?page=${page}`).then((data) => { if (active) { setLibrary(data); setError(""); } })
      .catch((err: Error) => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [page, refresh]);

  async function open(id: string) {
    setBusy(true); setError(""); setSaved(false);
    try {
      const data = await recallRequest<Detail>(`/api/admin/recall?lesson=${id}`);
      setDraft({ ...data.lesson, cards: data.cards }); setReport(data.report); setReportPage(1);
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }
  function editCard(index: number, values: Partial<RecallCard>) {
    setSaved(false);
    setDraft((previous) => previous ? { ...previous, cards: previous.cards.map((card, i) => i === index ? { ...card, ...values } : card) } : previous);
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!draft || busy) return;
    setBusy(true); setError(""); setSaved(false);
    try {
      const result = await recallRequest<{ id: string }>("/api/admin/recall", draft);
      const data = await recallRequest<Detail>(`/api/admin/recall?lesson=${result.id}`);
      setDraft({ ...data.lesson, cards: data.cards }); setReport(data.report); setReportPage(1);
      setSaved(true); setRefresh((value) => value + 1);
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }
  async function loadReport(number: number) {
    if (!draft?.id || busy) return;
    setBusy(true); setError("");
    try {
      const data = await recallRequest<Detail>(`/api/admin/recall?lesson=${draft.id}&page=${number}`);
      setReport(data.report); setReportPage(number);
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }

  return <div className="space-y-6">
    <div><h1 className="font-heading text-3xl font-bold text-policeGold">Subject Notes &amp; Recall</h1>
      <p className="mt-2 text-sm text-white/60">Add definitions, terminology, features and importance. Students learn your exact wording and revisit it on a saved schedule.</p></div>
    {error ? <div role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-red-200">{error}
      <button className={`${button} ml-3`} onClick={() => setRefresh((v) => v + 1)}>Reload library</button></div> : null}
    {library ? <section className="card space-y-4">
      <div className="flex flex-wrap justify-between gap-3"><h2 className="text-xl font-bold">Lessons</h2>
        <button className={button} disabled={busy || !library.subjects.length} onClick={() => {
          setDraft({ id: null, subject_id: library.subjects[0]?.id ?? 0, title: "", introduction: "", is_published: false, revision: 0, cards: [] });
          setReport([]); setReportPage(1); setSaved(false); setError("");
        }}><PlusCircle size={16} />New lesson</button></div>
      {!library.subjects.length ? <p className="text-sm text-white/60">Add a subject in the Subjects tab first.</p> : null}
      {!library.lessons.length ? <p className="text-white/60">No lessons on this page. Create a topic to start.</p> : null}
      <div className="grid gap-3 sm:grid-cols-2">{library.lessons.map((lesson) => <button key={lesson.id} disabled={busy} onClick={() => void open(lesson.id)} className="rounded-xl border border-white/10 p-4 text-left hover:border-policeGold/40">
        <p className="font-bold">{lesson.title}</p><p className="mt-1 text-xs text-white/50">{library.subjects.find((s) => s.id === lesson.subject_id)?.name} · {lesson.is_published ? "Published" : "Draft"}</p>
      </button>)}</div>
      <div className="flex justify-between items-center"><button className={button} disabled={busy || page <= 1} onClick={() => setPage((v) => v - 1)}>Previous</button>
        <span className="text-sm text-white/50">Page {page}</span><button className={button} disabled={busy || page * 20 >= library.count} onClick={() => setPage((v) => v + 1)}>Next</button></div>
    </section> : !error ? <p role="status">Loading lessons…</p> : null}
    {draft && library ? <form onSubmit={save} className="card space-y-5">
      <fieldset disabled={busy} className="space-y-5">
        <h2 className="text-xl font-bold">{draft.id ? "Edit lesson" : "Create lesson"}</h2>
        <label className="block space-y-2">Subject<select className={field} value={draft.subject_id} onChange={(event) => setDraft({ ...draft, subject_id: Number(event.target.value) })}>
          {library.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name} · {subject.level.toUpperCase()}</option>)}
        </select></label>
        <label className="block space-y-2">Topic title<input className={field} required minLength={2} maxLength={120} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="e.g. Rule of law" /></label>
        <label className="block space-y-2">Introduction (optional)<textarea className={field} rows={4} maxLength={10000} value={draft.introduction} onChange={(event) => setDraft({ ...draft, introduction: event.target.value })} /></label>
        <p className="text-sm text-white/60">Use short, precise answers. Students reproduce the same words, spelling, order and punctuation; capitalisation and extra spaces are ignored. Saving changed questions or answer wording restarts the affected section’s progress.</p>
        {draft.cards.map((card, index) => <fieldset key={card.id} className="space-y-3 rounded-xl border border-white/15 p-4">
          <legend className="px-2 font-bold">Section {index + 1}</legend>
          <div className="grid gap-3 sm:grid-cols-2"><label className="block space-y-2">Type<select className={field} value={card.kind} onChange={(event) => editCard(index, { kind: event.target.value as RecallCard["kind"] })}>
            {Object.entries(recallKinds).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
            <label className="block space-y-2">Heading<input className={field} required minLength={2} maxLength={120} value={card.heading} onChange={(event) => editCard(index, { heading: event.target.value })} /></label></div>
          <label className="block space-y-2">Question shown during recall<textarea className={field} rows={2} required minLength={2} maxLength={400} value={card.prompt} onChange={(event) => editCard(index, { prompt: event.target.value })} /></label>
          <label className="block space-y-2">Exact answer to learn<textarea className={field} rows={3} required maxLength={1000} value={card.answer} onChange={(event) => editCard(index, { answer: event.target.value })} /></label>
          <label className="block space-y-2">Explanation or example (optional)<textarea className={field} rows={3} maxLength={2000} value={card.explanation} onChange={(event) => editCard(index, { explanation: event.target.value })} /></label>
          <button type="button" className={`${button} text-red-300`} onClick={() => setDraft({ ...draft, cards: draft.cards.filter((_, i) => i !== index) })}><Trash2 size={15} />Remove section</button>
        </fieldset>)}
        <button type="button" className={button} disabled={draft.cards.length >= 50} onClick={() => setDraft({ ...draft, cards: [...draft.cards, {
          id: crypto.randomUUID(), heading: "", kind: "definition", prompt: "", answer: "", explanation: "",
        }] })}><PlusCircle size={16} />Add section ({draft.cards.length}/50)</button>
        <label className="flex items-center gap-3"><input type="checkbox" checked={draft.is_published} onChange={(event) => setDraft({ ...draft, is_published: event.target.checked })} />Publish for students</label>
        <div className="flex flex-wrap gap-3 items-center"><button className={`${button} bg-policeGold text-policeBlue`} disabled={busy || (draft.is_published && !draft.cards.length)}><Save size={16} />{busy ? "Saving…" : "Save lesson"}</button>
          {saved ? <p role="status" className="text-green-300 text-sm">Lesson saved.</p> : null}</div>
      </fieldset>
    </form> : null}
    {draft?.id ? <section className="card space-y-4">
      <div className="flex flex-wrap justify-between gap-3"><h2 className="text-xl font-bold">Student retention</h2><button className={button} disabled={busy} onClick={() => void loadReport(reportPage)}>Refresh report</button></div>
      <p className="text-sm text-white/60">Delayed recall counts first answers at least 24 hours after the model was shown. Immediate retries do not improve that score. Retained sections have three successful delayed checks and are up to date.</p>
      {!report.length ? <p className="text-white/60">No students have started this lesson on this page.</p> : <div className="overflow-x-auto"><table className="w-full text-sm text-left">
        <thead className="text-white/50"><tr>{["Student", "School", "Started", "Due", "Retained", "First try", "Delayed recall", "Last practice"].map((label) => <th key={label} className="p-3 whitespace-nowrap">{label}</th>)}</tr></thead>
        <tbody>{report.slice(0, 50).map((row) => <tr key={JSON.stringify([row.student_name, row.school_name])} className="border-t border-white/10">
          <td className="p-3">{row.student_name}</td><td className="p-3">{row.school_name || "—"}</td><td className="p-3">{row.studied_cards}/{row.total_cards}</td>
          <td className="p-3">{row.due_cards}</td><td className="p-3">{row.retained_cards}/{row.total_cards}</td>
          <td className="p-3">{recallAccuracy(row.first_correct, row.first_attempts)}</td>
          <td className="p-3">{recallAccuracy(row.delayed_correct, row.delayed_attempts)}<span className="block text-xs text-white/40">{row.delayed_correct}/{row.delayed_attempts} checks</span></td>
          <td className="p-3 text-xs">{row.last_reviewed_at ? recallDate(row.last_reviewed_at) : "Not yet practised"}</td>
        </tr>)}</tbody></table></div>}
      <div className="flex justify-between items-center"><button className={button} disabled={busy || reportPage <= 1} onClick={() => void loadReport(reportPage - 1)}>Previous</button>
        <span className="text-sm text-white/50">Page {reportPage}</span><button className={button} disabled={busy || report.length <= 50} onClick={() => void loadReport(reportPage + 1)}>Next</button></div>
    </section> : null}
  </div>;
}

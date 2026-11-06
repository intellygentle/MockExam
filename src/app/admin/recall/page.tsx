"use client";

import { useEffect, useState, type FormEvent } from "react";
import { PlusCircle, Save, Trash2 } from "lucide-react";
import { recallAccuracy, recallDate, recallRequest, type RecallCard, type RecallReport } from "@/lib/subject-recall";

type Lesson = { id: string; subject_id: number; title: string; introduction: string; is_published: boolean; revision: number };
type Subject = { id: number; name: string; level: string };
type Draft = Omit<Lesson, "id"> & { id: string | null; cards: RecallCard[] };
type Library = { lessons: Lesson[]; count: number; subjects: Subject[] };
type Detail = { lesson: Lesson & { subject: Subject }; cards: RecallCard[]; report: RecallReport[] };
const field = "w-full rounded-xl border border-white/20 bg-black/40 p-3 text-white outline-none focus:border-policeGold";
const button = "inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2.5 text-sm font-bold disabled:opacity-40";
const noteGroups = [
  { kind: "definition", title: "Definition", hint: "The meaning of this topic.", add: "Add definition", empty: "No definition yet.",
    question: "Question shown during recall", answer: "Definition" },
  { kind: "terminology", title: "Terminology", hint: "Key terms and their meanings.", add: "Add term", empty: "No terminology yet.",
    question: "Term", answer: "Meaning" },
  { kind: "importance", title: "Importance", hint: "Why this topic matters.", add: "Add importance", empty: "No importance note yet.",
    question: "Question shown during recall", answer: "Importance" },
] as const;

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
  const [subjectName, setSubjectName] = useState("");
  const [subjectLevel, setSubjectLevel] = useState("");

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
      setSubjectName(data.lesson.subject.name); setSubjectLevel(data.lesson.subject.level);
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }
  function editCard(index: number, values: Partial<RecallCard>) {
    setSaved(false);
    setDraft((previous) => previous ? { ...previous, cards: previous.cards.map((card, i) => i === index ? { ...card, ...values } : card) } : previous);
  }
  function editSection(key: string, values: Partial<RecallCard>) {
    setSaved(false);
    setDraft((previous) => {
      if (!previous) return previous;
      const oldHeading = previous.cards.find((card) => (card.section_id ?? card.id) === key)?.heading ?? "";
      return { ...previous, cards: previous.cards.map((card) => {
        if ((card.section_id ?? card.id) !== key) return card;
        if (values.heading === undefined) return { ...card, ...values };
        const heading = values.heading;
        const auto = card.kind === "definition" ? (heading.trim() ? `Define ${heading.trim()}.` : "")
          : card.kind === "importance" ? (heading.trim() ? `Why is ${heading.trim()} important?` : "") : null;
        const oldAuto = card.kind === "definition" ? (oldHeading.trim() ? `Define ${oldHeading.trim()}.` : "")
          : card.kind === "importance" ? (oldHeading.trim() ? `Why is ${oldHeading.trim()} important?` : "") : null;
        const prompt = auto !== null && (!card.prompt.trim() || card.prompt === oldAuto) ? auto : card.prompt;
        return { ...card, ...values, heading, prompt };
      }) };
    });
  }
  function addItem(key: string, kind: RecallCard["kind"]) {
    setSaved(false);
    setDraft((previous) => {
      if (!previous || previous.cards.length >= 50) return previous;
      const template = previous.cards.find((card) => (card.section_id ?? card.id) === key);
      if (!template) return previous;
      const prompt = kind === "definition" ? (template.heading.trim() ? `Define ${template.heading.trim()}.` : "")
        : kind === "importance" ? (template.heading.trim() ? `Why is ${template.heading.trim()} important?` : "") : "";
      return { ...previous, cards: [...previous.cards, { id: crypto.randomUUID(), section_id: key,
        heading: template.heading, kind, prompt, answer: "", explanation: "" }] };
    });
  }
  function removeSection(key: string) {
    setSaved(false);
    setDraft((previous) => previous ? { ...previous, cards: previous.cards.filter((card) => (card.section_id ?? card.id) !== key) } : previous);
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!draft || busy || subjectName.trim().length < 2 || !subjectLevel.trim()) return;
    setBusy(true); setError(""); setSaved(false);
    try {
      const cards = draft.cards.filter((card) => card.answer.trim()).map((card) => ({
        ...card, heading: card.heading.trim(), prompt: card.prompt.trim(),
        answer: card.answer.trim(), explanation: card.explanation.trim(),
      }));
      const { subject } = await recallRequest<{ subject: Subject }>("/api/admin/recall/subjects", {
        id: draft.subject_id || null, name: subjectName, level: subjectLevel,
      });
      const result = await recallRequest<{ id: string }>("/api/admin/recall", { ...draft, subject_id: subject.id, cards });
      const data = await recallRequest<Detail>(`/api/admin/recall?lesson=${result.id}`);
      setDraft({ ...data.lesson, cards: data.cards }); setReport(data.report); setReportPage(1);
      setSubjectName(data.lesson.subject.name); setSubjectLevel(data.lesson.subject.level);
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
  const sections = draft ? draft.cards.reduce<{ key: string; indices: number[] }[]>((groups, card, index) => {
    const key = card.section_id ?? card.id;
    const group = groups.find((item) => item.key === key);
    if (group) group.indices.push(index); else groups.push({ key, indices: [index] });
    return groups;
  }, []) : [];

  return <div className="space-y-6">
    <div><h1 className="font-heading text-3xl font-bold text-policeGold">Subject Notes &amp; Recall</h1>
      <p className="mt-2 text-sm text-white/60">Treat each section as a topic. Every topic has its own definition, terminology, importance and any other subtopics you add; students study the whole topic together on a saved schedule.</p></div>
    {error ? <div role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-red-200">{error}
      <button className={`${button} ml-3`} onClick={() => setRefresh((v) => v + 1)}>Reload library</button></div> : null}
    {library ? <section className="card space-y-4">
      <div className="flex flex-wrap justify-between gap-3"><h2 className="text-xl font-bold">Lessons</h2>
        <button className={button} disabled={busy} onClick={() => {
          setDraft({ id: null, subject_id: 0, title: "", introduction: "", is_published: false, revision: 0, cards: [] });
          setReport([]); setReportPage(1); setSaved(false); setError("");
          setSubjectName(""); setSubjectLevel("");
        }}><PlusCircle size={16} />New lesson</button></div>
      {!library.lessons.length ? <p className="text-white/60">No lessons on this page. Create a lesson to start.</p> : null}
      <div className="grid gap-3 sm:grid-cols-2">{library.lessons.map((lesson) => <button key={lesson.id} disabled={busy} onClick={() => void open(lesson.id)} className="rounded-xl border border-white/10 p-4 text-left hover:border-policeGold/40">
        <p className="font-bold">{lesson.title}</p><p className="mt-1 text-xs text-white/50">{library.subjects.find((s) => s.id === lesson.subject_id)?.name} · {lesson.is_published ? "Published" : "Draft"}</p>
      </button>)}</div>
      <div className="flex justify-between items-center"><button className={button} disabled={busy || page <= 1} onClick={() => setPage((v) => v - 1)}>Previous</button>
        <span className="text-sm text-white/50">Page {page}</span><button className={button} disabled={busy || page * 20 >= library.count} onClick={() => setPage((v) => v + 1)}>Next</button></div>
    </section> : !error ? <p role="status">Loading lessons…</p> : null}
    {draft && library ? <form onSubmit={save} className="card space-y-5">
      <fieldset disabled={busy} className="space-y-5">
        <h2 className="text-xl font-bold">{draft.id ? "Edit lesson" : "Create lesson"}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-2">Subject<input className={field} required minLength={2} maxLength={120} value={subjectName}
            onChange={(event) => { setSubjectName(event.target.value); setSaved(false); }} placeholder="Enter a subject name" /></label>
          <label className="block space-y-2">Level<input className={field} required maxLength={120} value={subjectLevel}
            onChange={(event) => { setSubjectLevel(event.target.value); setSaved(false); }} placeholder="Enter a level" /></label>
        </div>
        <p className="text-sm text-white/60">Enter any subject and level. Matching subjects are reused when you save.</p>
        <label className="block space-y-2">Lesson title<input className={field} required minLength={2} maxLength={120} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="e.g. Rule of law" /></label>
        <label className="block space-y-2">Introduction (optional)<textarea className={field} rows={4} maxLength={10000} value={draft.introduction} onChange={(event) => setDraft({ ...draft, introduction: event.target.value })} /></label>
        <p className="text-sm text-white/60">Use short, precise answers. Students reproduce the same words, spelling, order and punctuation; capitalisation and extra spaces are ignored. Entries left without an answer are not saved. Saving changed questions or answer wording restarts the affected topic’s progress.</p>
        {sections.map(({ key, indices }, sectionIndex) => {
          const section = draft.cards[indices[0]];
          const others = indices.filter((index) => draft.cards[index].kind === "features" || draft.cards[index].kind === "other");
          return <fieldset key={key} className="space-y-5 rounded-xl border border-white/15 p-4">
            <legend className="px-2 font-bold">Topic {sectionIndex + 1}</legend>
            <label className="block space-y-2">Topic heading<input className={field} required minLength={2} maxLength={120} value={section.heading} onChange={(event) => editSection(key, { heading: event.target.value })} placeholder="e.g. Rule of law" /></label>
            {noteGroups.map((meta) => {
              const items = indices.filter((index) => draft.cards[index].kind === meta.kind);
              return <div key={meta.kind} className="space-y-3 rounded-xl bg-white/5 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div><h4 className="font-bold text-policeGold">{meta.title}</h4><p className="text-xs text-white/50">{meta.hint}</p></div>
                  <button type="button" className={button} disabled={draft.cards.length >= 50} onClick={() => addItem(key, meta.kind)}><PlusCircle size={15} />{meta.add}</button>
                </div>
                {!items.length ? <p className="text-sm text-white/40">{meta.empty}</p> : items.map((index) => {
                  const card = draft.cards[index];
                  return <div key={card.id} className="space-y-3 rounded-xl border border-white/10 p-3">
                    <label className="block space-y-2">{meta.question}<textarea className={field} rows={2} required minLength={2} maxLength={400} value={card.prompt} onChange={(event) => editCard(index, { prompt: event.target.value })} /></label>
                    <label className="block space-y-2">{meta.answer}<textarea className={field} rows={3} required maxLength={1000} value={card.answer} onChange={(event) => editCard(index, { answer: event.target.value })} /></label>
                    <label className="block space-y-2">Example or extra note (optional)<textarea className={field} rows={2} maxLength={2000} value={card.explanation} onChange={(event) => editCard(index, { explanation: event.target.value })} /></label>
                    <button type="button" className={`${button} text-red-300`} onClick={() => setDraft({ ...draft, cards: draft.cards.filter((_, i) => i !== index) })}><Trash2 size={15} />Remove</button>
                  </div>;
                })}
              </div>;
            })}
            <div className="space-y-3 rounded-xl bg-white/5 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div><h4 className="font-bold text-policeGold">Other subtopics</h4><p className="text-xs text-white/50">Add features or any other notes this topic needs.</p></div>
                <button type="button" className={button} disabled={draft.cards.length >= 50} onClick={() => addItem(key, "other")}><PlusCircle size={15} />Add subtopic</button>
              </div>
              {!others.length ? <p className="text-sm text-white/40">No other subtopics yet.</p> : others.map((index) => {
                const card = draft.cards[index];
                return <div key={card.id} className="space-y-3 rounded-xl border border-white/10 p-3">
                  <label className="block space-y-2">Kind<select className={field} value={card.kind} onChange={(event) => editCard(index, { kind: event.target.value as RecallCard["kind"] })}>
                    <option value="other">Other notes</option><option value="features">Feature</option>
                  </select></label>
                  <label className="block space-y-2">Subtopic or question<textarea className={field} rows={2} required minLength={2} maxLength={400} value={card.prompt} onChange={(event) => editCard(index, { prompt: event.target.value })} /></label>
                  <label className="block space-y-2">Notes<textarea className={field} rows={3} required maxLength={1000} value={card.answer} onChange={(event) => editCard(index, { answer: event.target.value })} /></label>
                  <label className="block space-y-2">Example or extra note (optional)<textarea className={field} rows={2} maxLength={2000} value={card.explanation} onChange={(event) => editCard(index, { explanation: event.target.value })} /></label>
                  <button type="button" className={`${button} text-red-300`} onClick={() => setDraft({ ...draft, cards: draft.cards.filter((_, i) => i !== index) })}><Trash2 size={15} />Remove</button>
                </div>;
              })}
            </div>
            <button type="button" className={`${button} text-red-300`} onClick={() => removeSection(key)}><Trash2 size={15} />Remove topic</button>
          </fieldset>;
        })}
        <button type="button" className={button} disabled={draft.cards.length + 3 > 50} onClick={() => {
          const key = crypto.randomUUID();
          setDraft({ ...draft, cards: [...draft.cards,
            { id: crypto.randomUUID(), section_id: key, heading: "", kind: "definition", prompt: "", answer: "", explanation: "" },
            { id: crypto.randomUUID(), section_id: key, heading: "", kind: "terminology", prompt: "", answer: "", explanation: "" },
            { id: crypto.randomUUID(), section_id: key, heading: "", kind: "importance", prompt: "", answer: "", explanation: "" },
          ] });
        }}><PlusCircle size={16} />Add topic ({draft.cards.length}/50 entries)</button>
        <label className="flex items-center gap-3"><input type="checkbox" checked={draft.is_published} onChange={(event) => setDraft({ ...draft, is_published: event.target.checked })} />Publish for students</label>
        <div className="flex flex-wrap gap-3 items-center"><button className={`${button} bg-policeGold text-policeBlue`} disabled={busy || subjectName.trim().length < 2 || !subjectLevel.trim() || (draft.is_published && !draft.cards.length)}><Save size={16} />{busy ? "Saving…" : "Save lesson"}</button>
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

"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, BookOpen, Check, ChevronDown, ChevronRight, Copy, Eye, Layers3, ListOrdered, Loader2, Plus, Save, Send, Trash2, Undo2 } from "lucide-react";
import RecallNotes from "@/components/recall/RecallNotes";
import RecallTopicInsights from "@/components/recall/RecallTopicInsights";
import { groupRecallCards, moveRecallItem, recallAccuracy, recallDate, recallKinds, recallPrompt, recallRequest, type RecallCard, type RecallReport, type RecallTopicReport } from "@/lib/subject-recall";

type Lesson = { id: string; subject_id: number; title: string; introduction: string; is_published: boolean; revision: number };
type Subject = { id: number; name: string; level: string };
type Draft = Omit<Lesson, "id"> & { id: string | null; cards: RecallCard[] };
type Library = { lessons: Lesson[]; count: number; subjects: Subject[] };
type Detail = { lesson: Lesson & { subject: Subject }; cards: RecallCard[]; report: RecallReport[]; topics: RecallTopicReport[] };
type RemovedContent = { cards: RecallCard[]; sectionId: string; topicIndex: number; pieceIndex?: number; label: string };

function newCard(sectionId: string, heading = "", kind: RecallCard["kind"] = "definition"): RecallCard {
  return { id: crypto.randomUUID(), section_id: sectionId, heading, kind, prompt: recallPrompt(kind, heading),
    answer: "", explanation: "", answer_format: kind === "features" || kind === "functions" ? "list" : "paragraph" };
}

export default function AdminRecallPage() {
  const [library, setLibrary] = useState<Library | null>(null);
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [report, setReport] = useState<RecallReport[]>([]);
  const [topicReport, setTopicReport] = useState<RecallTopicReport[]>([]);
  const [reportPage, setReportPage] = useState(1);
  const [reportLoaded, setReportLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [subjectLevel, setSubjectLevel] = useState("");
  const [baseline, setBaseline] = useState("");
  const [preview, setPreview] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [announcement, setAnnouncement] = useState("");
  const [removed, setRemoved] = useState<RemovedContent | null>(null);
  const [focusTarget, setFocusTarget] = useState<string | null>(null);
  const [invalidField, setInvalidField] = useState<string | null>(null);
  const lock = useRef(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const dirty = !!draft && JSON.stringify([draft, subjectName, subjectLevel]) !== baseline;
  const sections = groupRecallCards(draft?.cards ?? []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    recallRequest<Library>(`/api/admin/recall?page=${page}`).then((data) => { if (active) setLibrary(data); })
      .catch((err: Error) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, refresh]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);
  useEffect(() => {
    if (!focusTarget) return;
    const field = document.getElementById(focusTarget);
    if (field) { field.focus({ preventScroll: true }); field.scrollIntoView({ block: "center" }); }
    setFocusTarget(null);
  }, [focusTarget]);

  function edit(update: (previous: Draft) => Draft) {
    setSaved(""); setInvalidField(null); setError("");
    setDraft((previous) => previous ? update(previous) : previous);
  }
  function fieldProps(id: string) {
    return { id, "aria-invalid": invalidField === id || undefined,
      "aria-describedby": invalidField === id ? "recall-editor-error" : undefined };
  }
  function editCard(id: string, values: Partial<RecallCard>) {
    edit((previous) => ({ ...previous, cards: previous.cards.map((card) => card.id === id ? { ...card, ...values } : card) }));
  }
  function editHeading(key: string, heading: string) {
    edit((previous) => ({ ...previous, cards: previous.cards.map((card) => {
      if ((card.section_id ?? card.id) !== key) return card;
      const auto = recallPrompt(card.kind, card.heading);
      return { ...card, heading, prompt: !card.prompt.trim() || card.prompt === auto ? recallPrompt(card.kind, heading) : card.prompt };
    }) }));
  }
  function addPiece(key: string, kind: RecallCard["kind"]) {
    edit((previous) => ({ ...previous, cards: groupRecallCards(previous.cards).flatMap((group) => group.key === key
      ? [...group.cards, newCard(key, group.cards[0].heading, kind)] : group.cards) }));
    setAnnouncement(`${recallKinds[kind]} added.`);
  }
  function moveTopic(index: number, direction: -1 | 1) {
    edit((previous) => ({ ...previous, cards: moveRecallItem(groupRecallCards(previous.cards), index, direction).flatMap((group) => group.cards) }));
    setAnnouncement(`Topic moved ${direction === -1 ? "up" : "down"}.`);
  }
  function movePiece(key: string, index: number, direction: -1 | 1) {
    edit((previous) => ({ ...previous, cards: groupRecallCards(previous.cards).flatMap((group) => group.key === key
      ? moveRecallItem(group.cards, index, direction) : group.cards) }));
    setAnnouncement(`Content moved ${direction === -1 ? "up" : "down"}.`);
  }
  function addTopic() {
    const key = crypto.randomUUID();
    edit((previous) => ({ ...previous, cards: [...previous.cards, newCard(key)] }));
    setFocusTarget(`topic-heading-${key}`);
    setAnnouncement("New topic added. Start with its heading and definition.");
  }
  function duplicateTopic(index: number) {
    const group = sections[index];
    if (!draft || !group || draft.cards.length + group.cards.length > 50) return;
    const key = crypto.randomUUID();
    const copies = group.cards.map((card) => ({ ...card, id: crypto.randomUUID(), section_id: key }));
    edit((previous) => ({ ...previous, cards: groupRecallCards(previous.cards).flatMap((item) => item.key === group.key ? [...item.cards, ...copies] : item.cards) }));
    setFocusTarget(`topic-heading-${key}`); setAnnouncement("Topic duplicated. Edit its heading and content for the new note.");
  }
  function removeContent(topicIndex: number, pieceIndex?: number) {
    const group = sections[topicIndex];
    const cards = pieceIndex === undefined ? group.cards : [group.cards[pieceIndex]];
    const label = pieceIndex === undefined ? group.cards[0].heading || `Topic ${topicIndex + 1}` : recallKinds[cards[0].kind];
    setRemoved({ cards, sectionId: group.key, topicIndex, pieceIndex, label });
    const ids = new Set(cards.map((card) => card.id));
    edit((previous) => ({ ...previous, cards: previous.cards.filter((card) => !ids.has(card.id)) }));
    setAnnouncement(`${label} removed. Use Undo to restore it.`);
  }
  function undoRemoval() {
    if (!removed || !draft || draft.cards.length + removed.cards.length > 50) return;
    edit((previous) => {
      const groups = groupRecallCards(previous.cards);
      const group = groups.find((item) => item.key === removed.sectionId);
      if (removed.pieceIndex !== undefined && group) {
        const heading = group.cards[0].heading;
        const restored = removed.cards.map((card) => ({ ...card, heading,
          prompt: card.prompt === recallPrompt(card.kind, card.heading) ? recallPrompt(card.kind, heading) : card.prompt }));
        group.cards.splice(Math.min(removed.pieceIndex, group.cards.length), 0, ...restored);
      } else groups.splice(Math.min(removed.topicIndex, groups.length), 0, { key: removed.sectionId, cards: removed.cards });
      return { ...previous, cards: groups.flatMap((item) => item.cards) };
    });
    setAnnouncement(`${removed.label} restored.`); setRemoved(null);
  }
  function focusTopic(sectionId: string) {
    if (!sections.some((group) => group.key === sectionId)) return;
    setPreview(false); setCollapsed((previous) => { const next = new Set(previous); next.delete(sectionId); return next; });
    setFocusTarget(`topic-heading-${sectionId}`);
  }
  async function open(id: string) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(""); setSaved("");
    try {
      const data = await recallRequest<Detail>(`/api/admin/recall?lesson=${id}`);
      const next = { ...data.lesson, cards: groupRecallCards(data.cards).flatMap((group) => group.cards) };
      setDraft(next); setReport(data.report); setTopicReport(data.topics); setReportPage(1); setReportLoaded(true);
      setSubjectName(data.lesson.subject.name); setSubjectLevel(data.lesson.subject.level);
      setBaseline(JSON.stringify([next, data.lesson.subject.name, data.lesson.subject.level]));
      setPreview(false); setCollapsed(new Set()); setRemoved(null);
    } catch (err) { setError((err as Error).message); }
    finally { lock.current = false; setBusy(false); }
  }
  async function save(published: boolean) {
    if (!draft || lock.current) return;
    let issue = subjectName.trim().length < 2 || !subjectLevel.trim() ? "Enter a subject name and level." :
      draft.title.trim().length < 2 ? "Give this lesson a title of at least two characters." :
      published && !draft.cards.length ? "Add a topic before publishing." : "";
    let target = subjectName.trim().length < 2 ? "lesson-subject" : !subjectLevel.trim() ? "lesson-level" : "lesson-title";
    for (const [index, group] of sections.entries()) {
      if (issue) break;
      if (group.cards[0].heading.trim().length < 2) { issue = `Topic ${index + 1} needs a heading of at least two characters.`; target = `topic-heading-${group.key}`; }
      for (const card of group.cards) {
        if (issue) break;
        const name = `Topic ${index + 1} · ${recallKinds[card.kind]}`;
        if (card.prompt.trim().length < 2) { issue = `${name}: add a recall question.`; target = `question-${card.id}`; }
        else if (!card.answer.trim() || card.answer.trim().length > 1000) {
          issue = `${name}: add an exact answer of 1 to 1,000 characters.`;
          target = card.answer_format === "list" ? `list-${card.id}-0` : `answer-${card.id}`;
        } else if (card.answer_format === "list" && (card.answer.split("\n").length > 20 || card.answer.split("\n").some((item) => !item.trim()))) {
          issue = `${name}: fill in every list item, or remove the empty items.`;
          target = `list-${card.id}-${Math.max(0, card.answer.split("\n").findIndex((item) => !item.trim()))}`;
        }
      }
    }
    if (issue) { setError(issue); setPreview(false); setCollapsed(new Set()); setInvalidField(target); setFocusTarget(target); return; }
    lock.current = true; setBusy(true); setError(""); setSaved(""); setInvalidField(null);
    try {
      const cards = draft.cards.map((card) => ({ ...card, heading: card.heading.trim(), prompt: card.prompt.trim(),
        answer: card.answer_format === "list" ? card.answer.split("\n").map((item) => item.trim()).join("\n") : card.answer.trim(),
        explanation: card.explanation.trim(), answer_format: card.answer_format ?? "paragraph" as const }));
      const { subject } = await recallRequest<{ subject: Subject }>("/api/admin/recall/subjects", { id: draft.subject_id || null, name: subjectName, level: subjectLevel });
      const payload = { ...draft, title: draft.title.trim(), introduction: draft.introduction.trim(), subject_id: subject.id, is_published: published, cards };
      const result = await recallRequest<{ id: string; revision: number }>("/api/admin/recall", payload);
      const next = { ...payload, id: result.id, revision: result.revision };
      setDraft(next); setSubjectName(subject.name); setSubjectLevel(subject.level);
      setBaseline(JSON.stringify([next, subject.name, subject.level]));
      setSaved(published ? "Published. Your students can open this lesson now." : "Draft saved.");
      setReportLoaded(false); setReport([]); setTopicReport([]); setReportPage(1); setRemoved(null); setRefresh((value) => value + 1);
    } catch (err) { setError((err as Error).message); }
    finally { lock.current = false; setBusy(false); }
  }
  async function loadReport(number: number) {
    if (!draft?.id || lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try {
      const data = await recallRequest<Detail>(`/api/admin/recall?lesson=${draft.id}&page=${number}`);
      setReport(data.report); setTopicReport(data.topics); setReportPage(number); setReportLoaded(true);
    } catch (err) { setError((err as Error).message); }
    finally { lock.current = false; setBusy(false); }
  }
  function submit(event: FormEvent) { event.preventDefault(); void save(true); }

  return <div className="recall-workspace space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="recall-eyebrow mb-2">Content studio</p><h1 className="font-heading text-2xl font-semibold tracking-tight text-white sm:text-3xl">Notes &amp; Recall</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Build clear lessons. Turn every definition and list into a moment of active recall.</p></div>
      {draft ? <button type="button" className="recall-btn" disabled={busy} onClick={() => { setDraft(null); setError(""); setSaved(""); }}><ArrowLeft size={16} />{dirty ? "Discard & return" : "All lessons"}</button> : null}
    </div>
    <p className="sr-only" role="status">{announcement}</p>
    {error ? <div id="recall-editor-error" ref={errorRef} tabIndex={-1} role="alert" className="rounded-xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-rose-200 outline-none">{error}
      {!draft ? <button className="recall-btn ml-3" onClick={() => { setError(""); setRefresh((v) => v + 1); }}>Try again</button> : null}</div> : null}
    {!draft ? <section className="recall-panel space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Your lesson library</h2><p className="mt-1 text-sm text-slate-500">{library?.count ?? 0} lessons · Draft, preview, publish</p></div>
        <button className="recall-btn recall-btn-primary" disabled={busy || !library} onClick={() => {
          setDraft({ id: null, subject_id: 0, title: "", introduction: "", is_published: false, revision: 0, cards: [newCard(crypto.randomUUID())] });
          setReport([]); setTopicReport([]); setReportLoaded(false); setReportPage(1); setSaved(""); setError(""); setSubjectName(""); setSubjectLevel(""); setBaseline(""); setPreview(false); setCollapsed(new Set()); setRemoved(null);
        }}><Plus size={17} />New lesson</button></div>
      {loading ? <p role="status" className="flex items-center gap-2 py-6 text-sm text-slate-400"><Loader2 size={18} className="animate-spin" />Loading lessons…</p> : null}
      {!loading && library && !library.lessons.length ? <div className="py-10 text-center"><Layers3 size={36} className="mx-auto mb-3 text-sky-300" /><h3 className="font-semibold">Your next lesson starts here</h3><p className="mt-2 text-sm text-slate-400">Create a lesson and add your first topic block.</p></div> : null}
      <div className="grid gap-3 sm:grid-cols-2">{library?.lessons.map((lesson) => <button key={lesson.id} disabled={busy || loading} onClick={() => void open(lesson.id)} className="group rounded-2xl border border-white/10 p-5 text-left transition hover:border-sky-300/40 hover:bg-sky-300/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 disabled:opacity-50">
        <div className="mb-4 flex items-center justify-between gap-3"><BookOpen size={20} className="text-slate-500 group-hover:text-sky-300" /><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${lesson.is_published ? "bg-emerald-300/10 text-emerald-300" : "bg-white/5 text-slate-400"}`}>{lesson.is_published ? "Published" : "Draft"}</span></div>
        <h3 className="font-semibold text-white">{lesson.title}</h3><p className="mt-2 text-xs text-slate-400">{library?.subjects.find((s) => s.id === lesson.subject_id)?.name ?? "Subject notes"}</p>
      </button>)}</div>
      {library && library.count > 20 ? <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-4"><button className="recall-btn" disabled={busy || loading || page <= 1} onClick={() => setPage((v) => v - 1)}>Previous</button>
        <span className="text-xs text-slate-400">Page {page} of {Math.ceil(library.count / 20)}</span><button className="recall-btn" disabled={busy || loading || page * 20 >= library.count} onClick={() => setPage((v) => v + 1)}>Next</button></div> : null}
    </section> : <form noValidate onSubmit={submit} className="space-y-6">
      <fieldset disabled={busy} className="min-w-0 space-y-6">
        <section className="recall-panel space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-2 font-semibold"><Layers3 size={19} className="text-sky-300" />{draft.id ? "Lesson details" : "Create a lesson"}</h2>
            <span className={`rounded-full px-3 py-1 text-xs ${draft.is_published ? "bg-emerald-300/10 text-emerald-300" : "bg-white/5 text-slate-400"}`}>{draft.is_published ? "Published lesson" : "Draft lesson"}</span></div>
          <label className="recall-label">Lesson title<input {...fieldProps("lesson-title")} className="recall-field text-lg font-semibold" required minLength={2} maxLength={120} value={draft.title} onChange={(event) => edit((previous) => ({ ...previous, title: event.target.value }))} placeholder="e.g. Understanding the rule of law" /></label>
          <div className="grid gap-4 sm:grid-cols-2"><label className="recall-label">Subject<input {...fieldProps("lesson-subject")} className="recall-field" required minLength={2} maxLength={120} list="recall-subjects" value={subjectName} onChange={(event) => { setSubjectName(event.target.value); setSaved(""); setInvalidField(null); }} placeholder="e.g. Civic Education" /></label>
            <label className="recall-label">Level<input {...fieldProps("lesson-level")} className="recall-field" required maxLength={120} value={subjectLevel} onChange={(event) => { setSubjectLevel(event.target.value); setSaved(""); setInvalidField(null); }} placeholder="e.g. SS3" /></label></div>
          <datalist id="recall-subjects">{Array.from(new Set(library?.subjects.map((subject) => subject.name))).map((name) => <option key={name} value={name} />)}</datalist>
          <label className="recall-label">Introduction <span className="font-normal text-slate-500">(optional)</span><textarea className="recall-field" rows={3} maxLength={10000} value={draft.introduction} onChange={(event) => edit((previous) => ({ ...previous, introduction: event.target.value }))} placeholder="Set the scene for this lesson…" /></label>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Content blocks</h2><p className="mt-1 text-xs text-slate-500">{sections.length} topics · {draft.cards.length}/50 recall questions</p></div>
          <div className="flex gap-1 rounded-xl border border-white/10 bg-slate-950 p-1"><button type="button" aria-pressed={!preview} className={`recall-btn border-0 ${!preview ? "bg-white/10" : "bg-transparent text-slate-500"}`} onClick={() => setPreview(false)}><Layers3 size={15} />Editor</button>
            <button type="button" aria-pressed={preview} className={`recall-btn border-0 ${preview ? "bg-white/10" : "bg-transparent text-slate-500"}`} onClick={() => setPreview(true)}><Eye size={15} />Student preview</button></div></div>

        {removed ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300/20 bg-amber-300/5 p-4"><p className="text-sm text-slate-300">Removed <span className="font-semibold">{removed.label}</span>.</p><button type="button" className="recall-btn text-xs" disabled={draft.cards.length + removed.cards.length > 50} onClick={undoRemoval}><Undo2 size={15} />Undo removal</button></div> : null}

        {preview ? <section className="recall-panel mx-auto max-w-3xl space-y-8">
          <div><p className="recall-eyebrow mb-3">{subjectName || "Subject"} · {subjectLevel || "Level"}</p><h2 className="font-heading text-3xl font-semibold tracking-tight">{draft.title || "Your lesson title"}</h2><p className="mt-3 text-xs text-slate-500">This is how your published content will appear to students.</p></div>
          {draft.cards.length ? <RecallNotes cards={draft.cards} introduction={draft.introduction} preview /> : <p className="py-8 text-center text-sm text-slate-500">Add a topic in the editor to preview it here.</p>}
        </section> : <>
          <p className="rounded-xl border border-sky-300/10 bg-sky-300/5 px-4 py-3 text-sm leading-6 text-slate-400">Each content piece becomes one recall question. Explanations provide context; students reproduce the exact answer or list in order.</p>
          {sections.length > 1 ? <div className="flex flex-wrap items-center justify-between gap-3"><label className="recall-label min-w-0 flex-1 sm:max-w-sm"><span className="sr-only">Jump to a topic in the editor</span><select className="recall-field" value="" onChange={(event) => focusTopic(event.target.value)}><option value="">Jump to a topic…</option>{sections.map((group, index) => <option key={group.key} value={group.key}>{index + 1}. {group.cards[0].heading || "Untitled topic"}</option>)}</select></label><button type="button" className="recall-btn text-xs" onClick={() => setCollapsed(collapsed.size === sections.length ? new Set() : new Set(sections.map((group) => group.key)))}>{collapsed.size === sections.length ? "Expand all" : "Collapse all"}</button></div> : null}
          {sections.map((group, sectionIndex) => <section key={group.key} className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50 sm:rounded-3xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-white/[0.02] p-4 sm:px-6">
              <button type="button" className="flex min-h-11 min-w-0 flex-1 items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300" aria-expanded={!collapsed.has(group.key)} aria-controls={`topic-${group.key}`} onClick={() => setCollapsed((previous) => { const next = new Set(previous); if (next.has(group.key)) next.delete(group.key); else next.add(group.key); return next; })}>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-300/10 text-xs font-bold text-sky-300">{String(sectionIndex + 1).padStart(2, "0")}</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{group.cards[0].heading || "Untitled topic"}</span><span className="mt-0.5 block text-xs text-slate-500">{group.cards.length} content {group.cards.length === 1 ? "piece" : "pieces"}</span></span>
                {collapsed.has(group.key) ? <ChevronRight size={17} className="shrink-0 text-slate-500" /> : <ChevronDown size={17} className="shrink-0 text-slate-500" />}
              </button>
              <div className="flex items-center gap-1"><button type="button" className="recall-icon-btn" aria-label={`Duplicate topic ${sectionIndex + 1}`} title="Duplicate topic" disabled={draft.cards.length + group.cards.length > 50} onClick={() => duplicateTopic(sectionIndex)}><Copy size={15} /></button><button type="button" className="recall-icon-btn" aria-label={`Move topic ${sectionIndex + 1} up`} disabled={sectionIndex === 0} onClick={() => moveTopic(sectionIndex, -1)}><ArrowUp size={15} /></button>
                <button type="button" className="recall-icon-btn" aria-label={`Move topic ${sectionIndex + 1} down`} disabled={sectionIndex === sections.length - 1} onClick={() => moveTopic(sectionIndex, 1)}><ArrowDown size={15} /></button>
                <button type="button" className="recall-icon-btn text-rose-300/70 hover:text-rose-300" aria-label={`Remove topic ${sectionIndex + 1}`} onClick={() => removeContent(sectionIndex)}><Trash2 size={15} /></button></div>
            </div>
            <div id={`topic-${group.key}`} hidden={collapsed.has(group.key)} className="space-y-5 p-4 sm:p-6">
              <label className="recall-label">Topic heading<input {...fieldProps(`topic-heading-${group.key}`)} className="recall-field font-semibold" required minLength={2} maxLength={120} value={group.cards[0].heading} onChange={(event) => editHeading(group.key, event.target.value)} placeholder="e.g. Rule of law" /></label>
              {group.cards.map((card, pieceIndex) => <div key={card.id} className={`space-y-4 rounded-xl border p-4 sm:p-5 ${card.kind === "definition" ? "border-sky-300/20 bg-sky-300/[0.04]" : "border-white/10 bg-white/[0.02]"}`}>
                <div className="flex flex-wrap items-center justify-between gap-2"><h3 className={`flex items-center gap-2 text-sm font-semibold ${card.kind === "definition" ? "text-sky-300" : "text-slate-200"}`}>{card.answer_format === "list" ? <ListOrdered size={16} /> : <BookOpen size={16} />}{recallKinds[card.kind]}</h3>
                  <div className="flex gap-1"><button type="button" className="recall-icon-btn" aria-label={`Move ${recallKinds[card.kind]} ${pieceIndex + 1} up in topic ${sectionIndex + 1}`} disabled={pieceIndex === 0} onClick={() => movePiece(group.key, pieceIndex, -1)}><ArrowUp size={14} /></button>
                    <button type="button" className="recall-icon-btn" aria-label={`Move ${recallKinds[card.kind]} ${pieceIndex + 1} down in topic ${sectionIndex + 1}`} disabled={pieceIndex === group.cards.length - 1} onClick={() => movePiece(group.key, pieceIndex, 1)}><ArrowDown size={14} /></button>
                    <button type="button" className="recall-icon-btn text-rose-300/70" aria-label={`Remove ${recallKinds[card.kind]} ${pieceIndex + 1} from topic ${sectionIndex + 1}`} disabled={group.cards.length === 1} title={group.cards.length === 1 ? "Use Remove topic to delete its final content piece." : undefined} onClick={() => removeContent(sectionIndex, pieceIndex)}><Trash2 size={14} /></button></div></div>
                <div className="grid gap-4 sm:grid-cols-2"><label className="recall-label">Content type<select className="recall-field" value={card.kind} onChange={(event) => {
                  const kind = event.target.value as RecallCard["kind"];
                  editCard(card.id, { kind, prompt: card.prompt === recallPrompt(card.kind, card.heading) ? recallPrompt(kind, card.heading) : card.prompt });
                }}>{Object.entries(recallKinds).map(([kind, label]) => <option key={kind} value={kind}>{label}</option>)}</select></label>
                  <label className="recall-label">Answer format<select className="recall-field" value={card.answer_format ?? "paragraph"} onChange={(event) => editCard(card.id, { answer_format: event.target.value as RecallCard["answer_format"] })}><option value="paragraph">Written answer</option><option value="list">Ordered list</option></select></label></div>
                <label className="recall-label">Recall question<textarea {...fieldProps(`question-${card.id}`)} className="recall-field" rows={2} required minLength={2} maxLength={400} value={card.prompt} onChange={(event) => editCard(card.id, { prompt: event.target.value })} placeholder="What should the student recall?" /></label>
                {card.answer_format === "list" ? <div className="space-y-3"><p className="text-sm font-medium text-slate-300">Exact list items <span className="font-normal text-slate-500">· in recall order</span></p>
                  {card.answer.split("\n").map((item, itemIndex, items) => <div key={itemIndex} className="flex flex-wrap items-start gap-2 rounded-xl border border-white/5 p-2 sm:flex-nowrap sm:border-0 sm:p-0">
                    <span className="pt-3.5 text-xs font-bold text-sky-300">{itemIndex + 1}.</span><label className="min-w-0 flex-1"><span className="sr-only">List item {itemIndex + 1} for {recallKinds[card.kind]} in topic {sectionIndex + 1}</span><input {...fieldProps(`list-${card.id}-${itemIndex}`)} className="recall-field" required maxLength={1000} value={item} onChange={(event) => editCard(card.id, { answer: items.map((value, i) => i === itemIndex ? event.target.value : value).join("\n") })} placeholder="One precise item…" /></label>
                    <div className="flex w-full justify-end gap-1 sm:w-auto"><button type="button" className="recall-icon-btn" aria-label={`Move list item ${itemIndex + 1} up`} disabled={itemIndex === 0} onClick={() => editCard(card.id, { answer: moveRecallItem(items, itemIndex, -1).join("\n") })}><ArrowUp size={14} /></button>
                      <button type="button" className="recall-icon-btn" aria-label={`Move list item ${itemIndex + 1} down`} disabled={itemIndex === items.length - 1} onClick={() => editCard(card.id, { answer: moveRecallItem(items, itemIndex, 1).join("\n") })}><ArrowDown size={14} /></button>
                      <button type="button" className="recall-icon-btn" aria-label={`Remove list item ${itemIndex + 1}`} disabled={items.length === 1} onClick={() => editCard(card.id, { answer: items.filter((_, i) => i !== itemIndex).join("\n") })}><Trash2 size={14} /></button></div>
                  </div>)}
                  <button type="button" className="recall-btn" disabled={card.answer.split("\n").length >= 20} onClick={() => editCard(card.id, { answer: `${card.answer}\n` })}><Plus size={14} />Add list item</button>
                </div> : <label className="recall-label">{card.kind === "definition" ? "Definition" : "Exact answer"}<textarea {...fieldProps(`answer-${card.id}`)} className="recall-field leading-7" rows={4} required maxLength={1000} value={card.answer} onChange={(event) => editCard(card.id, { answer: event.target.value })} placeholder="The wording students should remember…" /></label>}
                <p className={`text-right text-xs ${card.answer.length > 1000 ? "text-rose-300" : "text-slate-500"}`}>{card.answer.length.toLocaleString()}/1,000 characters</p>
                <label className="recall-label">Explanation <span className="font-normal text-slate-500">(optional · reading only)</span><textarea className="recall-field" rows={2} maxLength={2000} value={card.explanation} onChange={(event) => editCard(card.id, { explanation: event.target.value })} placeholder="Add an example, explanation, or supporting detail…" /></label>
              </div>)}
              <label className="recall-label max-w-xs">Add a sub-section<select className="recall-field" value="" disabled={draft.cards.length >= 50} onChange={(event) => { if (event.target.value) addPiece(group.key, event.target.value as RecallCard["kind"]); }}><option value="">Choose a content type…</option>{Object.entries(recallKinds).map(([kind, label]) => <option key={kind} value={kind}>{label}</option>)}</select></label>
            </div>
          </section>)}
          <button type="button" className="recall-btn w-full border-dashed py-5 text-sky-300" disabled={draft.cards.length >= 50} onClick={addTopic}><Plus size={18} />Add topic block</button>
        </>}
      </fieldset>

      <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/15 bg-slate-900/95 p-4 shadow-2xl shadow-black/50 backdrop-blur-lg">
        <div className="min-w-0 text-xs text-slate-400">{saved ? <p role="status" className="flex items-center gap-2 text-emerald-300"><Check size={15} />{saved}</p> : <><p className="font-medium text-slate-200">{dirty ? "Unpublished changes" : "All changes saved"}</p><p className="mt-1">{sections.length} topics · {draft.cards.length} recall questions</p></>}</div>
        <div className="flex flex-wrap gap-2"><button type="button" className="recall-btn" disabled={busy} onClick={() => void save(false)}><Save size={16} />{draft.is_published ? "Unpublish & save draft" : "Save draft"}</button>
          <button type="submit" className="recall-btn recall-btn-primary" disabled={busy || !draft.cards.length}>{busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}{busy ? "Saving…" : draft.is_published ? "Publish updates" : "Publish lesson"}</button></div>
      </div>
      <p className="text-xs leading-6 text-slate-500">Reordering and explanation edits preserve student progress. Changing an answer, its format, or question wording restarts that question’s recall cycle.</p>
    </form>}

    {draft?.id ? <section className="recall-panel space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="recall-eyebrow mb-1">Learning insights</p><h2 className="text-lg font-semibold">Student retention</h2></div><button className="recall-btn" disabled={busy} onClick={() => void loadReport(reportPage)}>Refresh report</button></div>
      <p className="text-sm leading-6 text-slate-400">Correct and incorrect totals count first answers, including master tests. Delayed recall requires a scheduled check at least 24 hours after the model was last seen.</p>
      {reportLoaded ? <RecallTopicInsights topics={topicReport} onEdit={focusTopic} /> : null}
      {!reportLoaded ? <p className="py-4 text-sm text-slate-500">Refresh the report to see the latest student results.</p> : !report.length ? <p className="py-4 text-sm text-slate-500">No student practice on this page yet.</p> : <div className="overflow-x-auto" role="region" aria-label="Student retention results" tabIndex={0}><table className="w-full text-left text-sm">
        <caption className="sr-only">First-answer results and delayed retention for this lesson</caption>
        <thead className="text-xs text-slate-500"><tr>{["Student / school", "Studied", "Due", "Correct", "Incorrect", "First try", "Delayed recall", "Retained", "Last practice"].map((label) => <th key={label} scope="col" className="whitespace-nowrap p-3 font-medium">{label}</th>)}</tr></thead>
        <tbody>{report.slice(0, 50).map((row) => <tr key={JSON.stringify([row.student_name, row.school_name])} className="border-t border-white/10">
          <th scope="row" className="p-3 font-medium">{row.student_name}<span className="mt-1 block text-xs font-normal text-slate-500">{row.school_name || "No school entered"}</span></th>
          <td className="p-3">{row.studied_cards}/{row.total_cards}</td><td className="p-3 text-amber-300">{row.due_cards}</td><td className="p-3 text-emerald-300">{row.first_correct}</td><td className="p-3 text-rose-300">{row.first_attempts - row.first_correct}</td>
          <td className="p-3">{recallAccuracy(row.first_correct, row.first_attempts)}</td><td className="p-3">{recallAccuracy(row.delayed_correct, row.delayed_attempts)}<span className="mt-1 block text-xs text-slate-500">{row.delayed_correct}/{row.delayed_attempts} checks</span></td><td className="p-3">{row.retained_cards}/{row.total_cards}</td>
          <td className="p-3 text-xs text-slate-400">{row.last_reviewed_at ? recallDate(row.last_reviewed_at) : "Not yet practised"}</td>
        </tr>)}</tbody></table></div>}
      {reportPage > 1 || report.length > 50 ? <div className="flex items-center justify-between gap-3"><button className="recall-btn" disabled={busy || reportPage <= 1} onClick={() => void loadReport(reportPage - 1)}>Previous</button><span className="text-xs text-slate-500">Page {reportPage}</span><button className="recall-btn" disabled={busy || report.length <= 50} onClick={() => void loadReport(reportPage + 1)}>Next</button></div> : null}
    </section> : null}
  </div>;
}

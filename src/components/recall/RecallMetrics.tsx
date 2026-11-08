import Link from "next/link";
import { ArrowUpRight, BookOpen, BrainCircuit, CheckCircle2, Clock3, Target, XCircle } from "lucide-react";
import { recallAccuracy, type RecallReviewNote, type RecallStats } from "@/lib/subject-recall";

export function RecallStatsGrid({ stats }: { stats: RecallStats }) {
  const incorrect = stats.first_attempts - stats.first_correct;
  return <div className="space-y-4">
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {[
        { label: "Correct first answers", value: stats.first_correct, icon: CheckCircle2, color: "text-emerald-300", hint: "Remembered without a retry" },
        { label: "Incorrect first answers", value: incorrect, icon: XCircle, color: "text-rose-300", hint: "Including answer reveals" },
        { label: "First-try accuracy", value: stats.first_attempts ? recallAccuracy(stats.first_correct, stats.first_attempts) : "—", icon: Target, color: "text-sky-300", hint: `${stats.first_attempts} checked answers` },
        { label: "Retained questions", value: `${stats.retained_cards}/${stats.total_cards}`, icon: BrainCircuit, color: "text-violet-300", hint: "3 successful delayed checks" },
      ].map(({ label, value, icon: Icon, color, hint }) => <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:p-5">
        <Icon size={18} className={`${color} mb-4`} aria-hidden="true" />
        <p className={`text-2xl font-semibold tracking-tight sm:text-3xl ${color}`}>{value}</p>
        <p className="mt-2 text-xs font-medium text-slate-300">{label}</p><p className="mt-1 text-[11px] leading-5 text-slate-500">{hint}</p>
      </div>)}
    </div>
    {stats.first_attempts > 0 ? <div className="space-y-2 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400"><p>Every first answer counts</p><p><span className="text-emerald-300">{stats.first_correct} correct</span> · <span className="text-rose-300">{incorrect} incorrect</span></p></div>
      <div className="flex h-2 overflow-hidden rounded-full bg-rose-300/70" aria-hidden="true"><div className="h-full bg-emerald-300/80" style={{ width: `${stats.first_correct * 100 / stats.first_attempts}%` }} /></div>
    </div> : null}
    <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2 text-xs leading-6 text-slate-400">
      <p className="flex items-center gap-1.5"><Clock3 size={14} className="text-amber-300" /><span className="font-semibold text-slate-200">{stats.due_cards} due</span> · {stats.practised_today} questions practised today</p>
      <p>Delayed recall: <span className="font-semibold text-slate-200">{recallAccuracy(stats.delayed_correct, stats.delayed_attempts)}</span> <span className="text-slate-500">({stats.delayed_correct}/{stats.delayed_attempts} checks)</span></p>
    </div>
  </div>;
}

export function RecallReviewNotes({ notes, count, studied, onPractise, onRead }: {
  notes: RecallReviewNote[]; count: number; studied: number;
  onPractise?: (note: RecallReviewNote) => void; onRead?: (note: RecallReviewNote) => void;
}) {
  return <section className="space-y-4" aria-labelledby="recall-review-notes">
    <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 id="recall-review-notes" className="text-lg font-semibold text-white">Needs another look</h2>
      <p className="mt-1 text-xs leading-6 text-slate-500">Notes with missed first answers or questions due for review.</p></div>
      {count > 0 ? <span className="rounded-full bg-amber-300/10 px-3 py-1 text-xs font-medium text-amber-300">{count} {count === 1 ? "note" : "notes"}</span> : null}</div>
    {!notes.length ? <div className="flex items-center gap-3 rounded-2xl border border-dashed border-white/10 p-5">
      {studied ? <CheckCircle2 size={24} className="shrink-0 text-emerald-300" /> : <BrainCircuit size={24} className="shrink-0 text-sky-300" />}
      <div><p className="text-sm font-medium text-slate-200">{studied ? "Your notes are up to date" : "Your review list starts with a note"}</p><p className="mt-1 text-xs leading-6 text-slate-500">{studied ? "Try a master test, or come back when your next review is due." : "Read a lesson and practise recalling it. Your next steps will appear here."}</p></div>
    </div> : <div className="grid gap-3 sm:grid-cols-2">{notes.map((note) => <article key={`${note.lesson_id}:${note.section_id}`} className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-slate-500">{note.subject_name} · {note.lesson_title}</p>
      <h3 className="text-sm font-semibold text-slate-100">{note.heading}</h3>
      <p className="mt-2 text-xs text-slate-400">First-try recall: {recallAccuracy(note.first_correct, note.first_attempts)} <span className="text-slate-500">· {note.first_correct}/{note.first_attempts} checks</span></p>
      <div className="mt-3 flex flex-1 flex-wrap items-end justify-between gap-3"><p className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
        {note.incorrect_cards > 0 ? <span className="text-rose-300">{note.incorrect_cards} missed</span> : null}
        {note.due_cards > 0 ? <span className="text-amber-300">{note.due_cards} due</span> : null}
      </p></div>
      <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-3">
        {onRead ? <button type="button" className="recall-btn flex-1 px-3 text-xs" onClick={() => onRead(note)}><BookOpen size={14} />Read note</button>
          : <Link className="recall-btn flex-1 px-3 text-xs" href={`/recall?lesson=${note.lesson_id}&note=${note.section_id}`}><BookOpen size={14} />Read note</Link>}
        {onPractise ? <button type="button" className="recall-btn flex-1 border-sky-300/20 px-3 text-xs text-sky-200" onClick={() => onPractise(note)}>Recall note<ArrowUpRight size={14} /></button>
          : <Link className="recall-btn flex-1 border-sky-300/20 px-3 text-xs text-sky-200" href={`/recall?mode=note&lesson=${note.lesson_id}&note=${note.section_id}`}>Recall note<ArrowUpRight size={14} /></Link>}
      </div>
    </article>)}</div>}
    {count > notes.length ? <p className="text-xs text-slate-500">Showing your {notes.length} highest-priority notes. Daily review includes all due questions.</p> : null}
  </section>;
}

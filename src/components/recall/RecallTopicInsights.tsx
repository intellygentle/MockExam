import { ArrowUpRight, CheckCircle2, Target } from "lucide-react";
import { recallAccuracy, type RecallTopicReport } from "@/lib/subject-recall";

export default function RecallTopicInsights({ topics, onEdit }: {
  topics: RecallTopicReport[]; onEdit: (sectionId: string) => void;
}) {
  if (!topics.length) return null;
  const ordered = [...topics].sort((a, b) => b.incorrect_cards - a.incorrect_cards || b.due_cards - a.due_cards);
  return <details className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-5" open>
    <summary className="cursor-pointer text-sm font-semibold text-slate-200">How each note is landing</summary>
    <p className="mt-2 text-xs leading-6 text-slate-400">See where students need reinforcement. Missed notes appear first; retries never inflate first-answer accuracy.</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      {ordered.map((topic) => <article key={topic.section_id} className={`rounded-xl border p-4 ${topic.incorrect_cards ? "border-rose-300/20 bg-rose-300/[0.03]" : "border-white/10 bg-slate-950/30"}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0"><h3 className="text-sm font-semibold text-white">{topic.heading}</h3><p className="mt-1 text-xs text-slate-500">{topic.total_cards} questions · {topic.students} {topic.students === 1 ? "student" : "students"} studied</p></div>
          {topic.first_attempts && !topic.incorrect_cards ? <CheckCircle2 size={17} className="shrink-0 text-emerald-300" aria-label="No current misses" /> : <Target size={17} className="shrink-0 text-sky-300" aria-hidden="true" />}
        </div>
        <p className="mt-4 text-xl font-semibold tabular-nums text-slate-100">{recallAccuracy(topic.first_correct, topic.first_attempts)}</p>
        <p className="mt-1 text-[11px] leading-5 text-slate-500">First-try accuracy · {topic.first_attempts} checks</p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs"><span className="text-emerald-300">{topic.first_correct} correct</span><span className="text-rose-300">{topic.first_attempts - topic.first_correct} incorrect</span></div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3"><p className="text-xs text-slate-400">{topic.incorrect_cards ? `${topic.incorrect_cards} current misses` : "No current misses"} · {topic.due_cards} due</p>
          <button type="button" className="recall-btn px-3 text-xs" onClick={() => onEdit(topic.section_id)}>Edit note<ArrowUpRight size={14} /></button></div>
      </article>)}
    </div>
  </details>;
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, BrainCircuit, ArrowRight, RefreshCw, Shuffle } from "lucide-react";
import { recallAccuracy, recallDate, recallRequest, type RecallLibrary } from "@/lib/subject-recall";
import { RecallReviewNotes, RecallStatsGrid } from "@/components/recall/RecallMetrics";
import { useRecallRefresh } from "@/lib/useRecallRefresh";

export default function RecallStackCard({ studentName, schoolName, detailed = false }: { studentName: string; schoolName: string; detailed?: boolean }) {
  const [data, setData] = useState<RecallLibrary | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refresh, refreshProgress] = useRecallRefresh(data?.stats.next_due_at, !!studentName);
  useEffect(() => { setData(null); }, [studentName, schoolName]);
  useEffect(() => {
    let active = true;
    setError(""); setLoading(true);
    const params = new URLSearchParams({ studentName, schoolName });
    recallRequest<RecallLibrary>(`/api/recall?${params}`).then((result) => {
      if (active) setData(result);
    }).catch((err: Error) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [studentName, schoolName, refresh]);
  const stats = data?.stats;
  return (
    <section className="recall-workspace card border-sky-400/30 bg-sky-400/5 space-y-5" aria-label="Subject notes and recall progress">
      <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3">
        <BrainCircuit className="text-sky-300 shrink-0" size={30} />
        <div><p className="recall-eyebrow">{detailed ? "Your retention dashboard" : "Daily learning stack"}</p>
          <h2 className="mt-1 font-heading text-xl font-semibold">Subject Notes &amp; Recall</h2></div>
      </div>{detailed ? <button className="recall-btn px-3 text-xs" disabled={loading} onClick={refreshProgress}><RefreshCw size={14} className={loading ? "animate-spin" : ""} />{loading && data ? "Refreshing…" : "Refresh progress"}</button> : null}</div>
      <p className="text-sm leading-7 text-slate-400">Read with focus, recall one note, or test everything you’ve studied. Every checked answer helps shape your next review.</p>
      {error ? <div role="alert" className="flex flex-wrap items-center gap-3 text-xs text-rose-200"><p>{error}</p><button className="recall-btn text-xs" onClick={refreshProgress}>Retry</button></div> : !data ? <p role="status" className="text-xs text-slate-500">Loading recall progress…</p> : null}
      {stats && studentName && detailed ? <RecallStatsGrid stats={stats} /> : stats && studentName ? <div className="text-sm text-white/70 space-y-1">
        <p><strong className="text-policeGold">{stats.due_cards} due</strong> · {stats.practised_today} questions practised today · {stats.retained_cards}/{stats.total_cards} retained</p>
        <p>Delayed recall: {recallAccuracy(stats.delayed_correct, stats.delayed_attempts)}
          {stats.next_due_at && !stats.due_cards ? ` · Next check: ${recallDate(stats.next_due_at)}` : ""}</p>
      </div> : null}
      <div className="flex flex-wrap gap-3">
        <Link href="/recall" className="recall-btn recall-btn-primary"><BookOpen size={16} />Open subject notes</Link>
        {stats && stats.studied_cards > 0 ? <><Link href="/recall?review=1" className="recall-btn">Daily review<ArrowRight size={16} /></Link>
          <Link href="/recall?mode=master" className="recall-btn text-violet-300"><Shuffle size={16} />Master test</Link></> : null}
      </div>
      {stats && studentName && detailed ? <div className="border-t border-white/10 pt-5"><RecallReviewNotes notes={data?.review_notes ?? []} count={data?.review_note_count ?? 0} studied={stats.studied_cards} />
        <p className="mt-5 text-xs leading-6 text-slate-500">First answers determine correct and incorrect totals. Practice retries do not rewrite these scores. Retention requires three successful delayed checks with reviews up to date.</p></div> : null}
    </section>
  );
}

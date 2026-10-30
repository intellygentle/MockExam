"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, BrainCircuit, ArrowRight } from "lucide-react";
import { recallAccuracy, recallDate, recallRequest, type RecallLibrary } from "@/lib/subject-recall";

export default function RecallStackCard({ studentName, schoolName }: { studentName: string; schoolName: string }) {
  const [data, setData] = useState<RecallLibrary | null>(null);
  useEffect(() => {
    let active = true;
    setData(null);
    const params = new URLSearchParams({ studentName, schoolName });
    recallRequest<RecallLibrary>(`/api/recall?${params}`).then((result) => {
      if (active) setData(result);
    }).catch(() => {});
    return () => { active = false; };
  }, [studentName, schoolName]);
  const stats = data?.stats;
  return (
    <section className="card border-sky-400/30 bg-sky-400/5 space-y-4" aria-label="Subject notes stack">
      <div className="flex items-center gap-3">
        <BrainCircuit className="text-sky-300 shrink-0" size={30} />
        <div><p className="text-xs uppercase tracking-widest text-sky-300">Daily learning stack</p>
          <h2 className="font-heading text-xl font-bold">Subject Notes &amp; Recall</h2></div>
      </div>
      <p className="text-sm text-white/60">Read your school notes, hide them, and type from memory. Older lessons return for scheduled revision.</p>
      {stats && studentName ? <div className="text-sm text-white/70 space-y-1">
        <p><strong className="text-policeGold">{stats.due_cards} due</strong> · {stats.practised_today} sections practised today · {stats.retained_cards}/{stats.total_cards} retained</p>
        <p>Delayed recall: {recallAccuracy(stats.delayed_correct, stats.delayed_attempts)}
          {stats.next_due_at && !stats.due_cards ? ` · Next check: ${recallDate(stats.next_due_at)}` : ""}</p>
      </div> : null}
      <div className="flex flex-wrap gap-3">
        <Link href="/recall" className="inline-flex items-center gap-2 rounded-xl bg-policeGold px-4 py-2.5 font-bold text-policeBlue text-sm"><BookOpen size={16} />Open subject notes</Link>
        {stats && stats.studied_cards > 0 ? <Link href="/recall?review=1" className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2.5 text-sm font-bold">Daily review<ArrowRight size={16} /></Link> : null}
      </div>
    </section>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BookOpen, BrainCircuit, Check, Type } from "lucide-react";
import { groupRecallCards, type RecallCard, type RecallLesson } from "@/lib/subject-recall";
import RecallNotes from "./RecallNotes";

export default function RecallReading({ lesson, cards, singleNote, busy, onPractiseNote, onPractiseLesson, onReadLesson }: {
  lesson: RecallLesson; cards: RecallCard[]; singleNote: boolean; busy: boolean;
  onPractiseNote: (sectionId: string) => void; onPractiseLesson: () => void; onReadLesson: () => void;
}) {
  const groups = useMemo(() => groupRecallCards(cards), [cards]);
  const [active, setActive] = useState(groups[0]?.key ?? "");
  const [largeText, setLargeText] = useState(false);
  const activeIndex = Math.max(0, groups.findIndex((group) => group.key === active));

  useEffect(() => {
    try { setLargeText(localStorage.getItem("scholars-arena-reading-size") === "large"); } catch { /* Use the default size. */ }
  }, []);

  useEffect(() => {
    const elements = groups.map((group) => document.getElementById(`note-${group.key}`)).filter((element) => element !== null);
    const update = () => {
      let current = groups[0]?.key ?? "";
      for (const [index, element] of elements.entries()) {
        if (element.getBoundingClientRect().top <= window.innerHeight * 0.3) current = groups[index].key;
      }
      setActive(current);
    };
    update();
    const observer = new IntersectionObserver(update, { rootMargin: "-20% 0px -65% 0px", threshold: 0 });
    elements.forEach((element) => observer.observe(element));
    window.addEventListener("resize", update);
    return () => { observer.disconnect(); window.removeEventListener("resize", update); };
  }, [groups]);

  function jumpTo(key: string) {
    const target = document.getElementById(`note-${key}`);
    target?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    setActive(key);
  }
  function changeSize(large: boolean) {
    setLargeText(large);
    try { localStorage.setItem("scholars-arena-reading-size", large ? "large" : "standard"); } catch { /* The control still works for this visit. */ }
  }
  const recallCurrent = () => singleNote ? onPractiseNote(groups[0].key) : onPractiseLesson();

  return <div className={`space-y-7 ${largeText ? "recall-reading-large" : "recall-reading-standard"}`}>
    <header className="flex flex-wrap items-start justify-between gap-5">
      <div className="max-w-3xl"><p className="recall-eyebrow mb-3">{lesson.subject_name} · {lesson.level.toUpperCase()}</p><h1 className="font-heading text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{lesson.title}</h1>
        <p className="mt-4 text-sm leading-7 text-slate-400">{singleNote ? "One focused note" : `${groups.length} topics`} · {cards.length} recall questions · Read at your own pace.</p></div>
      <button className="recall-btn" disabled={busy || !groups.length} onClick={recallCurrent}><BrainCircuit size={16} />{singleNote ? "Recall this note" : "Recall lesson"}</button>
    </header>

    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3">
      <p className="flex items-center gap-2 text-xs text-slate-400"><BookOpen size={15} className="text-sky-300" />{singleNote ? "Reading only this note" : "A quiet space to understand and remember"}</p>
      <div className="flex items-center gap-3"><span className="flex items-center gap-1.5 text-xs text-slate-400"><Type size={16} />Text size</span><div className="flex gap-1" role="group" aria-label="Reading text size">
        <button className={`recall-btn px-3 text-xs ${!largeText ? "border-sky-300/30 bg-sky-300/10 text-sky-200" : "border-transparent bg-transparent"}`} aria-pressed={!largeText} onClick={() => changeSize(false)}>Standard</button>
        <button className={`recall-btn px-3 text-xs ${largeText ? "border-sky-300/30 bg-sky-300/10 text-sky-200" : "border-transparent bg-transparent"}`} aria-pressed={largeText} onClick={() => changeSize(true)}>Large</button>
      </div></div>
    </div>

    <div className={`grid items-start gap-8 lg:gap-12 ${groups.length > 1 ? "lg:grid-cols-[190px_minmax(0,1fr)]" : "mx-auto max-w-3xl"}`}>
      {groups.length > 1 ? <aside className="lg:sticky lg:top-8">
        <label className="recall-label lg:hidden">Jump to a topic<select className="recall-field" value={active} onChange={(event) => jumpTo(event.target.value)}>{groups.map((group, index) => <option key={group.key} value={group.key}>{index + 1}. {group.cards[0].heading}</option>)}</select></label>
        <nav className="hidden lg:block" aria-label="Lesson topics"><p className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-slate-500">In this lesson</p><ol className="space-y-1">{groups.map((group, index) => <li key={group.key}>
          <a href={`#note-${group.key}`} aria-current={active === group.key ? "location" : undefined} onClick={(event) => { event.preventDefault(); jumpTo(group.key); }} className={`flex gap-3 rounded-xl border px-3 py-3 text-xs leading-5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 ${active === group.key ? "border-sky-300/20 bg-sky-300/5 text-sky-200" : "border-transparent text-slate-400 hover:bg-white/5 hover:text-white"}`}><span className="font-semibold text-sky-300">{String(index + 1).padStart(2, "0")}</span><span>{group.cards[0].heading}</span></a>
        </li>)}</ol><p className="mt-5 border-t border-white/10 pt-4 text-[11px] text-slate-500">Reading topic {activeIndex + 1} of {groups.length}</p></nav>
      </aside> : null}
      <article className="min-w-0 max-w-3xl">
        <RecallNotes cards={cards} introduction={singleNote ? undefined : lesson.introduction} onPractise={onPractiseNote} />
        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-sky-300/20 bg-sky-300/5 p-5">
          <div><p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-sky-300"><Check size={14} />A good place to pause</p><h2 className="text-base font-semibold">Ready to make it stick?</h2><p className="mt-2 text-xs leading-6 text-slate-400">Put the notes away and give recall a try.</p></div>
          <button className="recall-btn recall-btn-primary" disabled={busy || !groups.length} onClick={recallCurrent}>Hide notes &amp; recall<ArrowRight size={16} /></button>
        </div>
        {singleNote ? <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><p className="max-w-md text-xs leading-6 text-slate-500">Only this note’s reading cycle has restarted. Open the full lesson when you want to revisit all its topics.</p><button className="recall-btn text-xs" disabled={busy} onClick={onReadLesson}><BookOpen size={15} />Read full lesson</button></div> : null}
      </article>
    </div>
  </div>;
}

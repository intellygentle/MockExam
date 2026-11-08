import { BookOpen, BrainCircuit, Quote } from "lucide-react";
import { groupRecallCards, recallKinds, type RecallCard } from "@/lib/subject-recall";

export function RecallAnswer({ answer, format = "paragraph" }: { answer: string; format?: RecallCard["answer_format"] }) {
  if (format === "list") return <ol className="space-y-3 pl-6 [list-style-type:decimal] marker:font-semibold marker:text-sky-300">
    {answer.split(/\r?\n/).filter((item) => item.trim()).map((item, index) =>
      <li key={index} className="whitespace-pre-wrap pl-1 leading-8">{item}</li>)}
  </ol>;
  return <p className="whitespace-pre-wrap leading-8">{answer}</p>;
}

export default function RecallNotes({ cards, introduction, onPractise, preview = false }: {
  cards: RecallCard[]; introduction?: string; onPractise?: (sectionId: string) => void; preview?: boolean;
}) {
  const groups = groupRecallCards(cards);
  const TopicHeading = preview ? "h3" : "h2";
  const ContentHeading = preview ? "h4" : "h3";
  return <div className="space-y-8 sm:space-y-12">
    {introduction ? <p className="recall-reading-copy max-w-prose whitespace-pre-wrap leading-8 text-slate-400">{introduction}</p> : null}
    {groups.map((group, index) => <section key={group.key} id={`${preview ? "preview-" : "note-"}${group.key}`} aria-labelledby={`${preview ? "preview-" : ""}heading-${group.key}`} className="scroll-mt-8 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5">
        <div className="min-w-0 flex-1">
          <p className="recall-eyebrow mb-2">Topic {String(index + 1).padStart(2, "0")}</p>
          <TopicHeading id={`${preview ? "preview-" : ""}heading-${group.key}`} className="font-heading text-2xl font-semibold leading-snug tracking-tight text-white sm:text-3xl">{group.cards[0].heading || "Untitled topic"}</TopicHeading>
        </div>
        {onPractise ? <button type="button" className="recall-btn shrink-0" onClick={() => onPractise(group.key)}><BrainCircuit size={16} />Recall this note</button> : null}
      </div>
      <div className="space-y-6">
        {group.cards.map((card) => <div key={card.id} className={card.kind === "definition"
          ? "rounded-r-2xl rounded-l-md border border-sky-300/15 border-l-[3px] border-l-sky-300 bg-sky-300/[0.06] p-5 sm:p-6"
          : "space-y-3"}>
          <div className={`mb-3 flex items-center gap-2 ${card.kind === "definition" ? "text-sky-300" : "text-slate-200"}`}>
            {card.kind === "definition" ? <Quote size={17} aria-hidden="true" /> : <BookOpen size={15} className="text-slate-500" aria-hidden="true" />}
            <ContentHeading className={card.kind === "definition" ? "text-xs font-bold uppercase tracking-widest" : "text-lg font-semibold"}>{recallKinds[card.kind]}</ContentHeading>
          </div>
          {card.kind !== "definition" && card.prompt ? <p className="mb-3 whitespace-pre-wrap text-sm font-medium leading-6 text-slate-400">{card.prompt}</p> : null}
          <div className={`recall-reading-copy text-slate-100 ${card.kind === "definition" ? "font-medium" : ""}`}>
            {card.answer ? <RecallAnswer answer={card.answer} format={card.answer_format} /> : <p className="text-sm italic text-slate-500">Your content will appear here.</p>}
          </div>
          {card.explanation ? <div className="mt-4 border-t border-white/10 pt-4">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-slate-500">A little more context</p>
            <p className="recall-reading-context whitespace-pre-wrap leading-7 text-slate-400">{card.explanation}</p>
          </div> : null}
        </div>)}
      </div>
    </section>)}
  </div>;
}

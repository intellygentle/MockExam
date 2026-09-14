"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, ScrollText, MessageSquare, BookOpen,
  ChevronDown, ChevronUp, Library, PenLine, ExternalLink
} from "lucide-react";

type DrillSet = {
  id: number;
  title: string;
  description: string;
  subject_id: number | null;
  level: string;
  time_limit_minutes: number;
  question_count: number;
  card_type?: string;
  subjectName: string;
};

type PassageQuestion = {
  id: number;
  question: string;
  instruction?: string;
};

type VocabularyEntry = {
  term: string;
  generalMeaning: string;
  articleMeaning: string;
  context: string;
};

type Props = {
  set: DrillSet;
  questions: PassageQuestion[];
  studentName: string;
  onDone: () => void;
};

export default function PassageCard({
  set,
  questions,
  studentName,
  onDone,
}: Props) {
  const markCompleted = async () => {
    await fetch("/api/drills/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "complete_reading", studentName, drillSetId: set.id, totalQuestions: questions.length }),
    });
    onDone();
  };
  const [showQuestions, setShowQuestions] = useState(true);
  const [showVocabulary, setShowVocabulary] = useState(false);
  const passageText = set.description || "";
  const ARTICLE_IMAGES: Record<string, { src: string; alt: string }> = {
    "Nigeria's Textile Import Dependence": {
      src: "/editorials/image.png",
      alt: "Traditional textile garments displayed for sale",
    },
    "Sickle Cell Epidemic: Tackling Fake Lab Results": {
      src: "/editorials/1000364270.jpg",
      alt: "Crescent-shaped sickled red blood cell",
    },
  };
  const articleImage = ARTICLE_IMAGES[set.title]?.src || "";
  const articleImageAlt = ARTICLE_IMAGES[set.title]?.alt || "Article image";

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 py-4 sm:py-6 px-2 sm:px-0">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between gap-2 sm:gap-4"
      >
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-rose-500/20 to-pink-500/20 flex items-center justify-center border border-rose-500/20 shrink-0">
            <ScrollText size={22} className="text-rose-400" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-heading font-bold text-white">
              {set.title}
            </h1>
            <p className="text-white/50 text-sm mt-0.5">
              {set.subjectName} • {set.level.toUpperCase()} • {questions.length} discussion question{questions.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      <button
        onClick={onDone}
        className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition text-xs sm:text-sm shrink-0">
        <ArrowLeft size={16} /> <span className="hidden sm:inline">Back</span>
      </button>
      </motion.div>

      {set.title === "To Kill a Mockingbird • Reading Companion" && (
        <a href="/reading/to-kill-a-mockingbird" className="flex items-center justify-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/15 px-4 py-3 text-sm font-bold text-amber-200 transition hover:bg-amber-400/25">
          <BookOpen size={17} /> Open PDF.js Reader <ExternalLink size={15} />
        </a>
      )}

      {/* Vocabulary study guide */}
      {set.title === "Nigeria's Textile Import Dependence" && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
          <button onClick={() => setShowVocabulary(!showVocabulary)} className="card border-amber-500/20 hover:border-amber-400/30 transition w-full text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><Library size={18} className="text-amber-400" /><h2 className="text-lg font-heading font-bold text-white">Vocabulary Study Guide (18 terms)</h2></div>
              {showVocabulary ? <ChevronUp size={18} className="text-white/40" /> : <ChevronDown size={18} className="text-white/40" />}
            </div>
          </button>
          {showVocabulary && <VocabularyGuide />}
        </motion.div>
      )}

      {set.title === "Nigeria's Textile Import Dependence" && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card border-sky-500/20 bg-sky-500/[0.04]">
          <div className="flex items-center gap-2 mb-3"><PenLine size={18} className="text-sky-300" /><h2 className="text-lg font-heading font-bold text-white">Writing Task: Develop Your Own Editorial</h2></div>
          <p className="text-sm text-white/80 leading-relaxed">Using the article and vocabulary guide as models, write your own 5–7 paragraph editorial titled <strong className="text-sky-200">Reviving Nigeria's Textile Industry</strong>. Explain the historical importance of the sector, discuss the causes and consequences of import dependence, and recommend practical policies. Mirror the model article's approach: use evidence, connect ideas clearly, include topic sentences, and finish with a strong policy-focused conclusion. Use at least six vocabulary terms from the guide accurately and write in your own words.</p>
          <p className="mt-3 text-xs text-white/45">Planning checklist: introduction and position • historical evidence • current evidence • causes and effects • solutions • concluding recommendation.</p>
        </motion.div>
      )}

      {/* Student info bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white/5 border border-white/10 rounded-xl p-2.5 sm:p-3 flex items-center gap-2 sm:gap-3"
      >
        <div className="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400 text-xs font-bold">
          {studentName ? studentName[0].toUpperCase() : "?"}
        </div>
        <div>
          <p className="text-sm text-white font-semibold">{studentName || "Student"}</p>
          <p className="text-[10px] text-white/40 uppercase tracking-widest">
            📖 Reading Passage — answer questions on paper for class discussion
          </p>
        </div>
      </motion.div>

      {/* Passage Text */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="card border-rose-500/20 bg-gradient-to-br from-rose-500/5 to-pink-500/5"
      >
        {articleImage && (
          <img src={articleImage} alt={articleImageAlt} className="w-full max-h-80 object-cover rounded-xl mb-5 border border-white/10" />
        )}
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/10">
          <BookOpen size={18} className="text-rose-400" />
          <h2 className="text-lg font-heading font-bold text-white">Reading Passage</h2>
        </div>
        <div className="prose prose-invert max-w-none">
          {passageText.split("\n").map((paragraph, i) =>
            paragraph.trim() ? (
              <p key={i} className="text-white/85 leading-relaxed text-[15px] mb-4 last:mb-0">
                {paragraph}
              </p>
            ) : null
          )}
          {!passageText.trim() && (
            <p className="text-white/40 italic">No passage text available.</p>
          )}
        </div>
      </motion.div>

      {/* Discussion Questions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <button
          onClick={() => setShowQuestions(!showQuestions)}
          className="card border-white/10 hover:border-rose-400/30 transition w-full text-left"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare size={18} className="text-rose-400" />
              <h2 className="text-lg font-heading font-bold text-white">
                Discussion Questions ({questions.length})
              </h2>
            </div>
            {showQuestions ? (
              <ChevronUp size={18} className="text-white/40" />
            ) : (
              <ChevronDown size={18} className="text-white/40" />
            )}
          </div>
        </button>

        {showQuestions && (
          <div className="mt-4 space-y-4">
            {questions.length === 0 ? (
              <div className="card border-white/10 text-center py-8">
                <p className="text-white/50">No discussion questions yet.</p>
              </div>
            ) : (
              questions.map((q, idx) => (
                <motion.div
                  key={q.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 + idx * 0.05 }}
                  className="card border-white/10 hover:border-rose-400/20 transition"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center text-rose-400 font-bold text-sm shrink-0">
                      {idx + 1}
                    </div>
                    <div className="space-y-2 flex-1">
                      {q.instruction && (
                        <p className="text-[10px] uppercase tracking-widest text-white/40 bg-white/5 rounded-lg px-2 py-1 inline-block">
                          {q.instruction}
                        </p>
                      )}
                      <p className="text-white/85 text-[15px] leading-relaxed whitespace-pre-line">
                        {q.question}
                      </p>
                      {/* Answer area hint */}
                      <div className="mt-3 p-3 rounded-lg bg-white/[0.03] border border-dashed border-white/10">
                        <p className="text-[11px] text-white/40 italic">
                          ✏️ Write your answer on paper. Discuss with your tutor in class.
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}
      </motion.div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-center pt-4"
      >
        <button
          onClick={markCompleted}
          className="px-6 py-3 rounded-xl bg-rose-500/20 text-rose-300 font-bold hover:bg-rose-500/30 transition border border-rose-500/30"
        >
          <ArrowLeft size={16} className="inline mr-2" />
          Return to Arena
        </button>
      </motion.div>
    </div>
  );
}

const VOCABULARY: VocabularyEntry[] = [
  { term: "roller-coaster experience", generalMeaning: "A situation marked by dramatic ups and downs or unpredictable change.", articleMeaning: "The textile sector moved from post-independence industrial success to a steep decline and dependence on imports.", context: "Nigeria has had a roller-coaster experience with its textile sector." },
  { term: "supply chains", generalMeaning: "The network involved in producing a product and moving it to consumers.", articleMeaning: "The indirect network of cotton farmers, retailers, and other workers connected to the mills.", context: "Millions more were engaged in indirect supply chains such as cotton farming and retail markets." },
  { term: "manufacturing workforce", generalMeaning: "People employed throughout a country's industrial production sector.", articleMeaning: "It shows how important textiles once were: the sector provided more than a quarter of manufacturing jobs.", context: "Accounting for more than 25 per cent of the manufacturing workforce at its peak." },
  { term: "declining", generalMeaning: "Becoming smaller, weaker, or worse over time.", articleMeaning: "It describes the weakening economic conditions that contributed to the textile sector's reversal.", context: "The story changed due to the country's declining economic fortunes." },
  { term: "combating", generalMeaning: "Actively fighting or trying to overcome a problem.", articleMeaning: "The sector is struggling against high costs, unstable policy, poor electricity, old machinery, and smuggling.", context: "Nigeria depends heavily on imported textiles while combating high production costs." },
  { term: "buck the trend", generalMeaning: "To resist or reverse the pattern that is generally happening.", articleMeaning: "The Senate resolution aimed to reverse the rising dependence on imported textiles.", context: "A Senate resolution in June to buck the trend." },
  { term: "underscoring", generalMeaning: "Emphasizing or drawing attention to importance.", articleMeaning: "The rising import figures emphasize Nigeria's growing reliance on foreign fabrics.", context: "Underscoring the country's growing reliance on foreign fabrics." },
  { term: "consistent rise", generalMeaning: "A steady increase over time.", articleMeaning: "Imports continued climbing year after year and quarter after quarter.", context: "Textile imports have recorded a consistent rise over the period." },
  { term: "contend with", generalMeaning: "To struggle with, face, or manage a difficult challenge.", articleMeaning: "Local manufacturers must keep dealing with costs, weak power supply, foreign exchange pressure, and other obstacles.", context: "Local manufacturers continue to contend with high production costs." },
  { term: "conversely", generalMeaning: "In the opposite or reverse way; on the other hand.", articleMeaning: "It introduces the opposite movement: exports fell while imports rose.", context: "Conversely, Nigeria's textile exports have continued to drop." },
  { term: "militating against", generalMeaning: "Having an effect that hinders or prevents success.", articleMeaning: "Structural problems actively hold back textile production.", context: "The major factors militating against production in Nigeria require workable policies." },
  { term: "workable policies", generalMeaning: "Practical policies that can actually be implemented successfully.", articleMeaning: "Long-term government measures that address the industry's real obstacles rather than offering only temporary relief.", context: "The major factors militating against production in Nigeria require workable policies." },
  { term: "stimulate a pivot", generalMeaning: "To encourage a significant change in direction or strategy.", articleMeaning: "The benefits of local production should push Nigeria toward a more sustainable industrial strategy.", context: "Should stimulate a pivot to more sustainable policies." },
  { term: "sustainable policies", generalMeaning: "Policies designed to work effectively over the long term.", articleMeaning: "Structural industrial measures that solve root problems instead of relying only on one-off bailouts or bans.", context: "Should stimulate a pivot to more sustainable policies." },
  { term: "off-grid", generalMeaning: "Operating independently of a central public utility network.", articleMeaning: "Dedicated power solutions for industrial zones that reduce dependence on the unreliable national electricity grid.", context: "Dedicated and reliable off-grid power or renewable energy for industrial zones." },
  { term: "stem the inflow", generalMeaning: "To stop, restrict, or hold back the flow of something entering.", articleMeaning: "Border monitoring and modern equipment should reduce smuggled fabrics entering Nigeria.", context: "Will stem the inflow of smuggled fabrics." },
  { term: "weaned off", generalMeaning: "Gradually stopped from depending on something.", articleMeaning: "Nigerians should gradually rely less on cheap used imports as purchasing power and local alternatives improve.", context: "Nigerians need to be weaned off used fabrics pouring into the country daily." },
  { term: "value chain", generalMeaning: "The connected activities that add value from raw material to finished product and sale.", articleMeaning: "The domestic cotton-textile-garment chain could retain money and create jobs if the market is fully developed.", context: "The domestic cotton-textile-garment value chain can potentially retain and generate billions of dollars yearly." },
];

function VocabularyGuide() {
  return <div className="mt-4 space-y-3">{VOCABULARY.map((entry) => <div key={entry.term} className="card border-amber-500/15 bg-amber-500/[0.03] space-y-2"><h3 className="font-bold text-amber-300">{entry.term}</h3><p className="text-sm text-white/75"><strong className="text-white/90">General meaning:</strong> {entry.generalMeaning}</p><p className="text-sm text-white/75"><strong className="text-white/90">In this article:</strong> {entry.articleMeaning}</p><p className="border-l-2 border-amber-400/40 pl-3 text-xs italic text-white/50">“{entry.context}”</p></div>)}</div>;
}

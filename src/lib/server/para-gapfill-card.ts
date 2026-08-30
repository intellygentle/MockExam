import type { LessonCardDef } from "./lesson-cards";

/**
 * Data for the Subordinating Conjunction Paragraph Exercise card.
 *
 * 6 passages, each with 5 blanks. Students must fill all blanks in a
 * passage correctly before advancing to the next. No hints are given.
 *
 * Gaps use the ___N___ marker (1-indexed) inside the passage text.
 */

export type ParaGapfillBlank = {
  /** 1-indexed gap number */
  index: number;
  /** The correct conjunction */
  answer: string;
  /** Brief explanation (shown in debrief, not as a hint) */
  explanation: string;
};

export type ParaGapfillData = {
  /** Full passage text with ___N___ markers for blanks */
  passage: string;
  /** The blanks in order */
  blanks: ParaGapfillBlank[];
  /** Available words — includes the 5 correct + 1 distractor */
  wordBank: string[];
};

// Helper — marks a question with the para-gapfill data.
function pg(
  source: string,
  passage: string,
  blanks: ParaGapfillBlank[],
  wordBank: string[]
) {
  return {
    prompt: passage,
    answer: JSON.stringify({ blanks }),
    hints: [], // no hints
    source,
    paraGapfill: { passage, blanks, wordBank } as ParaGapfillData,
  };
}

export const paraGapfillCard: LessonCardDef = {
  slug: "subconj-paragraph-exercise",
  title: "Subordinating Conjunction — Paragraph Exercise",
  description:
    "Fill in every blank in each passage with the correct subordinating conjunction. Complete all 5 blanks in a passage to move to the next one.",
  kind: "para_gapfill",
  lesson: [
    {
      kind: "heading",
      text: "📝 Paragraph Gap-Fill Exercise",
    },
    {
      kind: "text",
      text: "Read each passage carefully and fill in every blank with the subordinating conjunction that best fits the logic of the sentence — cause, contrast, condition, time, or purpose. Each word in the word bank is used exactly once per passage, and each passage includes one extra, unused word as a distractor.",
    },
    {
      kind: "heading",
      text: "🧭 Tips for Success",
    },
    {
      kind: "bullets",
      items: [
        "Read the FULL sentence before choosing — the blank's answer depends on the meaning of the whole sentence, not just the words around it.",
        "Cause words: because, since, as — something happened BECAUSE of something else.",
        "Contrast words: although, though, while, whereas, even though — the two halves say OPPOSITE things.",
        "Condition words: if, unless, provided that, as long as — something must be TRUE before something else can happen.",
        "Time words: when, whenever, before, after, once, until — something happens BEFORE or AFTER something else.",
        "Purpose words: so that, in order that — something is done FOR THE PURPOSE OF something else.",
      ],
    },
    {
      kind: "bullets",
      items: [
        "Capitalize a conjunction if it begins a sentence.",
        "Each passage has one extra word that does NOT fit — don't use it!",
        "You must get ALL 5 blanks correct in a passage to move to the next one.",
      ],
    },
  ],
  questions: [
    // ── Passage 1: Remote Work ──
    pg(
      "Passage 1 — Remote Work",
      `Remote work has become increasingly common ___1___ high-speed internet is now available in most regions. ___2___ many employees value the flexibility it offers, others report feeling isolated from their colleagues. Companies often provide subsidies for home office equipment ___3___ staff can work comfortably from home. ___4___ productivity software continues to improve, poor communication remains one of the biggest challenges facing remote teams. Some firms will not allow employees to work remotely ___5___ they demonstrate strong self-discipline during a trial period.`,
      [
        { index: 1, answer: "since", explanation: "cause: internet availability is the reason remote work grew" },
        { index: 2, answer: "while", explanation: "contrast: two different employee reactions are being weighed against each other" },
        { index: 3, answer: "so that", explanation: "purpose: subsidies are given in order to achieve comfort" },
        { index: 4, answer: "although", explanation: "contrast: improving software doesn't resolve the separate issue of communication" },
        { index: 5, answer: "unless", explanation: "negative condition: remote work is permitted only if self-discipline is shown" },
      ],
      ["although", "because", "provided that", "since", "so that", "unless", "while"]
    ),

    // ── Passage 2: Renewable Energy ──
    pg(
      "Passage 2 — Renewable Energy",
      `Solar power has expanded rapidly ___6___ costs have fallen dramatically over the past decade. ___7___ the technology is installed, maintenance costs remain relatively low, which makes it attractive to homeowners. Wealthier nations have invested heavily in renewable infrastructure, ___8___ developing countries still rely mainly on fossil fuels. ___9___ solar panels are widely considered environmentally friendly, their production process generates a significant amount of industrial waste. Regulators carried out extensive safety testing ___10___ the panels were approved for widespread residential use.`,
      [
        { index: 6, answer: "because", explanation: "cause: falling costs directly explain the expansion" },
        { index: 7, answer: "once", explanation: "time: low maintenance costs begin after installation is complete" },
        { index: 8, answer: "whereas", explanation: "contrast between two groups of nations" },
        { index: 9, answer: "even though", explanation: "concession about an established fact (panels ARE considered eco-friendly)" },
        { index: 10, answer: "before", explanation: "sequence: testing precedes approval" },
      ],
      ["because", "before", "even though", "once", "whereas"]
    ),

    // ── Passage 3: Online Learning ──
    pg(
      "Passage 3 — Online Learning",
      `Universities began offering online courses on a large scale ___11___ the pandemic forced a sudden shift to remote learning. Students may now complete an entire degree online ___12___ they attend all scheduled assessments in person. ___13___ online learning offers considerable flexibility, many students say they miss face-to-face interaction with instructors. Institutions have invested heavily in new platforms ___14___ students can access course materials more easily. Enrollment in online programs will likely continue to rise ___15___ tuition fees remain lower than those of traditional campus-based programs.`,
      [
        { index: 11, answer: "since", explanation: "cause/time: the pandemic is both the reason and the starting point" },
        { index: 12, answer: "provided that", explanation: "positive condition required for fully online study" },
        { index: 13, answer: "though", explanation: "contrast between flexibility and missing interaction" },
        { index: 14, answer: "so that", explanation: "purpose: platforms were built in order to improve access" },
        { index: 15, answer: "as long as", explanation: "ongoing condition for continued enrollment growth" },
      ],
      ["as long as", "provided that", "since", "so that", "though"]
    ),

    // ── Passage 4: Urbanization ──
    pg(
      "Passage 4 — Urbanization",
      `Cities across the region have grown rapidly ___16___ job opportunities remain heavily concentrated in urban centers. Urban populations also tend to be younger, ___17___ rural populations skew noticeably older. ___18___ local authorities invest significantly in public housing, homelessness rates are unlikely to fall in the coming years. Infrastructure planners must carefully consider future population growth ___19___ new residential developments are approved. ___20___ traffic congestion continues to worsen year after year, many residents still say they prefer city living for its convenience.`,
      [
        { index: 16, answer: "because", explanation: "cause: job concentration explains city growth" },
        { index: 17, answer: "whereas", explanation: "contrast between two population groups" },
        { index: 18, answer: "unless", explanation: "negative condition: without investment, homelessness will persist" },
        { index: 19, answer: "before", explanation: "sequence: growth must be considered prior to approval" },
        { index: 20, answer: "even if", explanation: "hypothetical concession: even under worsening congestion, preference persists" },
      ],
      ["because", "before", "even if", "unless", "whereas"]
    ),

    // ── Passage 5: Diet and Exercise ──
    pg(
      "Passage 5 — Diet and Exercise",
      `Doctors consistently recommend regular exercise ___21___ it significantly reduces the risk of chronic disease. ___22___ fast food is convenient and inexpensive, it often lacks the nutrients the body needs. Nutritionists design personalized meal plans ___23___ patients can meet their dietary requirements more efficiently. Symptoms of lifestyle-related illness rarely improve ___24___ patients commit to long-term changes in diet and activity. ___25___ a new habit becomes part of a daily routine, it tends to become far easier to maintain.`,
      [
        { index: 21, answer: "since", explanation: "cause: reduced disease risk is the reason for the recommendation" },
        { index: 22, answer: "although", explanation: "contrast between convenience and poor nutrition" },
        { index: 23, answer: "so that", explanation: "purpose: plans are designed in order to meet dietary needs" },
        { index: 24, answer: "unless", explanation: "negative condition: improvement depends on committing to change" },
        { index: 25, answer: "once", explanation: "time: ease of maintenance begins after a habit is established" },
      ],
      ["although", "once", "since", "so that", "unless"]
    ),

    // ── Passage 6: Economy and Trade ──
    pg(
      "Passage 6 — Economy and Trade",
      `Inflation has risen sharply across many economies ___26___ global supply chains were severely disrupted in recent years. ___27___ some economists predict a prolonged recession, others remain cautiously optimistic about recovery. Central banks typically raise interest rates ___28___ inflation spirals further out of control. Regional trade agreements can boost economic growth substantially, ___29___ both nations comply fully with the agreed terms. ___30___ the national currency has weakened considerably, export volumes have not increased as much as economists predicted.`,
      [
        { index: 26, answer: "because", explanation: "cause: disrupted supply chains explain rising inflation" },
        { index: 27, answer: "while", explanation: "contrast between two groups of economists" },
        { index: 28, answer: "before", explanation: "sequence: rate hikes happen ahead of runaway inflation" },
        { index: 29, answer: "provided that", explanation: "positive condition for growth from trade agreements" },
        { index: 30, answer: "even though", explanation: "concession about an established fact (the currency HAS weakened)" },
      ],
      ["because", "before", "even though", "provided that", "while"]
    ),
  ],
};

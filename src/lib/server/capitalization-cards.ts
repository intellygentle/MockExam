import "server-only";

/**
 * ============================================================
 * SERVER-ONLY MODULE — DO NOT IMPORT FROM CLIENT CODE.
 * ============================================================
 *
 * This module is the ONLY place the correct capitalization
 * answers live. The database never contains them and the API
 * routes here never send them to the browser — students only
 * ever receive their own submitted text, a correct/incorrect
 * verdict per line, and guidance hints.
 *
 * The lesson content for the first card ("Capitalization Basics")
 * comes from: New sets of materials/capitalization-lesson.pdf
 * ============================================================
 */

export type CapitalizationLine = {
  /** The uncapitalized sentence shown to the student for editing. */
  prompt: string;
  /** The fully-correct sentence (the hidden answer). */
  answer: string;
  /** Guidance hints shown when this line is wrong (never the answer). */
  hints: string[];
};

export type LessonBlock =
  | { kind: "heading"; text: string }
  | { kind: "subheading"; text: string }
  | { kind: "text"; text: string }
  | { kind: "bullets"; items: string[] }
  | { kind: "examples"; title: string; items: string[] }
  | { kind: "collapsible"; title: string; items: string[] }
  | { kind: "review"; title: string; items: string[] }
  | { kind: "table"; headers: string[]; rows: string[][] };

export type CapitalizationCard = {
  slug: string;
  title: string;
  description: string;
  /** Structured lesson note rendered in the left pane. */
  lesson: LessonBlock[];
  lines: CapitalizationLine[];
};

const CARDS: Record<string, CapitalizationCard> = {
  "capitalization-basics": {
    slug: "capitalization-basics",
    title: "Capitalization Basics",
    description:
      "Master the three golden rules of capitalization, then rewrite five sentences until every capital letter is perfect.",
    lesson: [
      {
        kind: "heading",
        text: "The Three Things to Capitalize",
      },
      {
        kind: "text",
        text: "Before you rewrite the practice sentences, learn the three golden rules of capitalization. Every capital letter you add will follow one of these rules.",
      },
      {
        kind: "bullets",
        items: [
          "Proper nouns — specific people, places, things & brands (Matthew, Chicago, Kleenex)",
          "Titles and headings — except the “little words” (Lord of the Flies)",
          "The first word of a sentence & the pronoun I",
        ],
      },
      {
        kind: "heading",
        text: "Rule 1 — Proper Nouns",
      },
      {
        kind: "text",
        text: "A proper noun names one specific person, place, thing or brand. Proper nouns are always capitalized. A common noun names a general person, place or thing — usually it is NOT capitalized.",
      },
      {
        kind: "examples",
        title: "Proper vs Common",
        items: [
          "Proper: Matthew, Chicago, Kleenex, Eiffel Tower, Africa",
          "Common: kid, city, tissue, teacher, car, language",
        ],
      },
      {
        kind: "subheading",
        text: "Quick Practice",
      },
      {
        kind: "text",
        text: "For each word, decide if it is common or proper. If it is proper, name a common version. If it is common, name a proper version. Check your ideas when you are ready.",
      },
      {
        kind: "collapsible",
        title: "Reveal suggested answers",
        items: [
          "Eiffel Tower → proper noun (a monument)",
          "teacher → common noun (Mr. Morton)",
          "car → common noun (Ford Escort)",
          "Africa → proper noun (a continent)",
          "language → common noun (English)",
        ],
      },
      {
        kind: "heading",
        text: "Rule 2 — Titles and Headings",
      },
      {
        kind: "text",
        text: "Capitalize the important words in a title or heading. Don't capitalize the “little words” — articles (the, a, an), conjunctions (and, or, but) and short prepositions (in, on, at).",
      },
      {
        kind: "examples",
        title: "Examples",
        items: [
          "We read Lord of the Flies.",
          "I listened to \"The Marriage of Figaro\" by Mozart.",
          "Many presidents have met with Prime Minister May.",
        ],
      },
      {
        kind: "subheading",
        text: "Class Titles",
      },
      {
        kind: "text",
        text: "The name of a specific course is a proper noun and is capitalized everywhere. General subjects are common nouns and are only capitalized as the first word of a sentence.",
      },
      {
        kind: "examples",
        title: "Specific course names — capitalize",
        items: ["I am in Earth Science 101.", "I take Algebra 1 and English Literature 2."],
      },
      {
        kind: "examples",
        title: "General subject names — don't capitalize",
        items: ["I like Earth science.", "I like English literature more than algebra."],
      },
      {
        kind: "heading",
        text: "Rule 3 — First Word & the Pronoun I",
      },
      {
        kind: "text",
        text: "Always capitalize the first word of every sentence — and the pronoun I everywhere it appears. Words spoken inside quotation marks are a new sentence, so their first word is capitalized too.",
      },
      {
        kind: "examples",
        title: "Examples",
        items: [
          "We left.",
          "Then Tim said, \"Do you get it?\"",
          "So I said, \"Yes, I get it.\"",
        ],
      },
      {
        kind: "review",
        title: "Remember — capitalize these:",
        items: [
          "Proper nouns (including brand names).",
          "Titles and headings (except the little words).",
          "The first word of a sentence and the pronoun I.",
        ],
      },
      {
        kind: "text",
        text: "Now apply all three rules to the five sentences on the right. You must get every sentence perfect to master this lesson — you'll get a hint for any line you miss, and you can try again!",
      },
    ],
    lines: [
      {
        prompt: "tom ran to the harold washington library.",
        answer: "Tom ran to the Harold Washington Library.",
        hints: [
          "Capitalize the first word of the sentence.",
          "Capitalize the proper nouns: the person's name and the name of one specific library.",
        ],
      },
      {
        prompt: "he met with chief librarian roberts, the woman who ran the whole library.",
        answer: "He met with Chief Librarian Roberts, the woman who ran the whole library.",
        hints: [
          "Capitalize the first word of the sentence.",
          "A job title used together with a person's name is a title — capitalize the title and the name.",
        ],
      },
      {
        prompt: "tom was good at math but was getting a low grade in his reading 101 course.",
        answer: "Tom was good at math but was getting a low grade in his Reading 101 course.",
        hints: [
          "Capitalize the first word of the sentence.",
          "The name of a specific course is a proper noun — capitalize it.",
        ],
      },
      {
        prompt: "the chief librarian helped tom research apple iphones for his report.",
        answer: "The chief librarian helped Tom research Apple iPhones for his report.",
        hints: [
          "Capitalize the first word of the sentence.",
          "Capitalize the person's name.",
          "Brand names are proper nouns — capitalize them.",
        ],
      },
      {
        prompt: `tom said, "thanks for the help with my reading class."`,
        answer: `Tom said, "Thanks for the help with my reading class."`,
        hints: [
          "Capitalize the first word of the sentence.",
          "Capitalize the first word spoken inside the quotation marks.",
        ],
      },
    ],
  },
};

/** Get a card definition by slug. Returns null when the slug is unknown. */
export function getCapitalizationCard(slug: string | null | undefined): CapitalizationCard | null {
  if (!slug) return null;
  return CARDS[slug] ?? null;
}

/**
 * Normalize a submitted sentence: collapse whitespace and trim edges.
 * Comparison stays case-sensitive — that is the whole point of the exercise.
 */
export function normalizeAnswer(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** Check one student line against its hidden answer. */
export function checkLine(studentText: string, line: CapitalizationLine): boolean {
  return normalizeAnswer(studentText) === normalizeAnswer(line.answer);
}

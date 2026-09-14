import "server-only";
import type { LessonCardDef, LessonQuestion } from "./lesson-cards";

/**
 * SERVER-ONLY MODULE — DO NOT IMPORT FROM CLIENT CODE.
 *
 * "Words Table" card for the Editorials stack. The student studies the word
 * families table (noun / verb / adjective / adverb for every editorial word)
 * and writes one original sentence per form. The accepted forms (including
 * inflections) live ONLY in this module — the client just receives the prompt.
 */

type Pos = "noun" | "verb" | "adjective" | "adverb";

type FormItem = { pos: Pos; lemma: string; accepted: string[] };

const POS_LABEL: Record<Pos, string> = {
  noun: "Noun",
  verb: "Verb",
  adjective: "Adjective",
  adverb: "Adverb",
};

const POS_HINT: Record<Pos, string> = {
  noun: "Use it as a NOUN — a thing, person or idea (it can be the subject or follow words like a/the).",
  verb: "Use it as a VERB — an action word in a sensible tense.",
  adjective: "Use it as an ADJECTIVE — a word that describes a noun.",
  adverb: "Use it as an ADVERB — a word that modifies a verb or an adjective.",
};

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Lenient verb inflections for a lemma (junk combinations are harmless). */
function verbForms(lemma: string, extra: string[] = []): string[] {
  const forms = new Set<string>([lemma, ...extra]);
  forms.add(lemma + "s").add(lemma + "es").add(lemma + "d").add(lemma + "ed").add(lemma + "ing");
  if (lemma.endsWith("e")) forms.add(lemma.slice(0, -1) + "ing");
  if (/[a-z]y$/.test(lemma)) forms.add(lemma.slice(0, -1) + "ies");
  if (lemma.endsWith("ise")) {
    const z = lemma.slice(0, -2) + "ze";
    forms.add(z).add(z + "s").add(z + "d").add(z + "ing").add(z.slice(0, -1) + "ing");
  }
  return [...forms];
}

/** Lenient noun plural forms for a lemma. */
function nounForms(lemma: string, extra: string[] = []): string[] {
  const forms = new Set<string>([lemma, ...extra]);
  forms.add(lemma + "s").add(lemma + "es");
  if (/[a-z]y$/.test(lemma)) forms.add(lemma.slice(0, -1) + "ies");
  return [...forms];
}

// ── The word families table ──
// row = display cells [Word, Noun, Verb, Adjective, Adverb]
// items = one practice sentence per existing form ("—" cells are skipped)
const WORD_FAMILIES: { word: string; row: string[]; items: FormItem[] }[] = [
  {
    word: "Scourge",
    row: ["Scourge", "scourge", "scourge (to afflict or whip)", "—", "—"],
    items: [
      { pos: "noun", lemma: "scourge", accepted: nounForms("scourge") },
      { pos: "verb", lemma: "scourge", accepted: verbForms("scourge") },
    ],
  },
  {
    word: "Genotype",
    row: ["Genotype", "genotype", "genotype", "genotypic", "genotypically"],
    items: [
      { pos: "noun", lemma: "genotype", accepted: nounForms("genotype") },
      { pos: "verb", lemma: "genotype", accepted: verbForms("genotype") },
      { pos: "adjective", lemma: "genotypic", accepted: ["genotypic"] },
      { pos: "adverb", lemma: "genotypically", accepted: ["genotypically"] },
    ],
  },
  {
    word: "Discordant",
    row: ["Discordant", "discord", "discord", "discordant", "discordantly"],
    items: [
      { pos: "noun", lemma: "discord", accepted: nounForms("discord") },
      { pos: "verb", lemma: "discord", accepted: verbForms("discord") },
      { pos: "adjective", lemma: "discordant", accepted: ["discordant"] },
      { pos: "adverb", lemma: "discordantly", accepted: ["discordantly"] },
    ],
  },
  {
    word: "Devolved",
    row: ["Devolved", "devolution", "devolve", "devolved / devolutionary", "—"],
    items: [
      { pos: "noun", lemma: "devolution", accepted: nounForms("devolution") },
      { pos: "verb", lemma: "devolve", accepted: verbForms("devolve") },
      { pos: "adjective", lemma: "devolved / devolutionary", accepted: ["devolved", "devolutionary"] },
    ],
  },
  {
    word: "Calibrated",
    row: ["Calibrated", "calibration", "calibrate", "calibrated", "—"],
    items: [
      { pos: "noun", lemma: "calibration", accepted: nounForms("calibration") },
      { pos: "verb", lemma: "calibrate", accepted: verbForms("calibrate") },
      { pos: "adjective", lemma: "calibrated", accepted: ["calibrated"] },
    ],
  },
  {
    word: "Quackery",
    row: ["Quackery", "quack / quackery", "quack", "quackish", "—"],
    items: [
      { pos: "noun", lemma: "quack / quackery", accepted: nounForms("quack", ["quackery"]) },
      { pos: "verb", lemma: "quack", accepted: verbForms("quack") },
      { pos: "adjective", lemma: "quackish", accepted: ["quackish"] },
    ],
  },
  {
    word: "Regulatory deficit",
    row: ["Regulatory deficit", "regulation / regulator / deficiency", "regulate", "regulatory / deficient", "deficiently"],
    items: [
      {
        pos: "noun",
        lemma: "regulation / regulator / deficiency",
        accepted: [...nounForms("regulation"), ...nounForms("regulator"), ...nounForms("deficiency")],
      },
      { pos: "verb", lemma: "regulate", accepted: verbForms("regulate") },
      { pos: "adjective", lemma: "regulatory / deficient", accepted: ["regulatory", "deficient"] },
      { pos: "adverb", lemma: "deficiently", accepted: ["deficiently"] },
    ],
  },
  {
    word: "Compromised",
    row: ["Compromised", "compromise", "compromise", "compromising / compromised", "—"],
    items: [
      { pos: "noun", lemma: "compromise", accepted: nounForms("compromise") },
      { pos: "verb", lemma: "compromise", accepted: verbForms("compromise") },
      { pos: "adjective", lemma: "compromising / compromised", accepted: ["compromising", "compromised"] },
    ],
  },
  {
    word: "Stigma",
    row: ["Stigma", "stigma", "stigmatise", "stigmatic / stigmatised", "—"],
    items: [
      { pos: "noun", lemma: "stigma", accepted: nounForms("stigma") },
      { pos: "verb", lemma: "stigmatise", accepted: verbForms("stigmatise") },
      { pos: "adjective", lemma: "stigmatic / stigmatised", accepted: ["stigmatic", "stigmatised", "stigmatized"] },
    ],
  },
  {
    word: "Cross-verification",
    row: ["Cross-verification", "cross-verification", "cross-verify", "cross-verified", "—"],
    items: [
      { pos: "noun", lemma: "cross-verification", accepted: nounForms("cross-verification") },
      {
        pos: "verb",
        lemma: "cross-verify",
        accepted: verbForms("cross-verify", ["cross-verifies", "cross-verified", "cross-verifying"]),
      },
      { pos: "adjective", lemma: "cross-verified", accepted: ["cross-verified"] },
    ],
  },
  {
    word: "Accredited",
    row: ["Accredited", "accreditation", "accredit", "accredited", "—"],
    items: [
      { pos: "noun", lemma: "accreditation", accepted: nounForms("accreditation") },
      { pos: "verb", lemma: "accredit", accepted: verbForms("accredit") },
      { pos: "adjective", lemma: "accredited", accepted: ["accredited"] },
    ],
  },
  {
    word: "Chromatography",
    row: ["Chromatography", "chromatography", "—", "chromatographic", "chromatographically"],
    items: [
      { pos: "noun", lemma: "chromatography", accepted: nounForms("chromatography") },
      { pos: "adjective", lemma: "chromatographic", accepted: ["chromatographic"] },
      { pos: "adverb", lemma: "chromatographically", accepted: ["chromatographically"] },
    ],
  },
  {
    word: "Dumping ground",
    row: ["Dumping ground", "dump", "dump", "dumped / dumping", "—"],
    items: [
      { pos: "noun", lemma: "dump", accepted: nounForms("dump") },
      { pos: "verb", lemma: "dump", accepted: verbForms("dump") },
      { pos: "adjective", lemma: "dumped / dumping", accepted: ["dumped", "dumping"] },
    ],
  },
  {
    word: "Hollowed out",
    row: ["Hollowed out", "hollow / hollowness", "hollow out", "hollow", "hollowly (rare)"],
    items: [
      { pos: "noun", lemma: "hollow / hollowness", accepted: nounForms("hollow", ["hollowness"]) },
      {
        pos: "verb",
        lemma: "hollow out",
        accepted: verbForms("hollow out", ["hollows out", "hollowed out", "hollowing out"]),
      },
      { pos: "adjective", lemma: "hollow", accepted: ["hollow"] },
      { pos: "adverb", lemma: "hollowly", accepted: ["hollowly"] },
    ],
  },
  {
    word: "Beyond reproach",
    row: ["Beyond reproach", "reproach", "reproach", "reproachful", "reproachfully"],
    items: [
      { pos: "noun", lemma: "reproach", accepted: nounForms("reproach") },
      { pos: "verb", lemma: "reproach", accepted: verbForms("reproach") },
      { pos: "adjective", lemma: "reproachful", accepted: ["reproachful"] },
      { pos: "adverb", lemma: "reproachfully", accepted: ["reproachfully"] },
    ],
  },
  {
    word: "Sprawling",
    row: ["Sprawling", "sprawl", "sprawl", "sprawling", "—"],
    items: [
      { pos: "noun", lemma: "sprawl", accepted: nounForms("sprawl") },
      { pos: "verb", lemma: "sprawl", accepted: verbForms("sprawl") },
      { pos: "adjective", lemma: "sprawling", accepted: ["sprawling"] },
    ],
  },
  {
    word: "Ecosystem",
    row: ["Ecosystem", "ecosystem", "—", "ecosystemic", "ecosystematically"],
    items: [
      { pos: "noun", lemma: "ecosystem", accepted: nounForms("ecosystem") },
      { pos: "adjective", lemma: "ecosystemic", accepted: ["ecosystemic"] },
      { pos: "adverb", lemma: "ecosystematically", accepted: ["ecosystematically"] },
    ],
  },
  {
    word: "Prevalence",
    row: ["Prevalence", "prevalence", "prevail", "prevalent", "prevalently"],
    items: [
      { pos: "noun", lemma: "prevalence", accepted: nounForms("prevalence") },
      { pos: "verb", lemma: "prevail", accepted: verbForms("prevail") },
      { pos: "adjective", lemma: "prevalent", accepted: ["prevalent"] },
      { pos: "adverb", lemma: "prevalently", accepted: ["prevalently"] },
    ],
  },
  {
    word: "Advocacy",
    row: ["Advocacy", "advocacy / advocate", "advocate", "—", "—"],
    items: [
      { pos: "noun", lemma: "advocacy / advocate", accepted: nounForms("advocacy", ["advocate", "advocates"]) },
      { pos: "verb", lemma: "advocate", accepted: verbForms("advocate") },
    ],
  },
  {
    word: "Penalise",
    row: ["Penalise", "penalty / penalisation", "penalise", "penal", "—"],
    items: [
      {
        pos: "noun",
        lemma: "penalty / penalisation",
        accepted: nounForms("penalty", ["penalisation", "penalization"]),
      },
      { pos: "verb", lemma: "penalise", accepted: verbForms("penalise") },
      { pos: "adjective", lemma: "penal", accepted: ["penal"] },
    ],
  },
  {
    word: "Systemic",
    row: ["Systemic", "system", "systemise", "systemic", "systemically"],
    items: [
      { pos: "noun", lemma: "system", accepted: nounForms("system") },
      { pos: "verb", lemma: "systemise", accepted: verbForms("systemise") },
      { pos: "adjective", lemma: "systemic", accepted: ["systemic"] },
      { pos: "adverb", lemma: "systemically", accepted: ["systemically"] },
    ],
  },
  {
    word: "Desperation",
    row: ["Desperation", "desperation", "—", "desperate", "desperately"],
    items: [
      { pos: "noun", lemma: "desperation", accepted: nounForms("desperation") },
      { pos: "adjective", lemma: "desperate", accepted: ["desperate"] },
      { pos: "adverb", lemma: "desperately", accepted: ["desperately"] },
    ],
  },
  {
    word: "Catastrophic",
    row: ["Catastrophic", "catastrophe", "—", "catastrophic", "catastrophically"],
    items: [
      { pos: "noun", lemma: "catastrophe", accepted: nounForms("catastrophe") },
      { pos: "adjective", lemma: "catastrophic", accepted: ["catastrophic"] },
      { pos: "adverb", lemma: "catastrophically", accepted: ["catastrophically"] },
    ],
  },
];

// ── Build the practice questions: one sentence per existing word form ──
const questions: LessonQuestion[] = [];
for (const fam of WORD_FAMILIES) {
  for (const it of fam.items) {
    questions.push({
      prompt: `${POS_LABEL[it.pos]} form: ${it.lemma}`,
      answer: it.lemma,
      hints: [
        `Your sentence must use the ${POS_LABEL[it.pos].toLowerCase()} form: ${it.lemma}.`,
        POS_HINT[it.pos],
      ],
      source: fam.word,
      wordForm: { pos: it.pos, lemma: it.lemma, accepted: it.accepted },
    });
  }
}

export const editorialWordFamiliesCard: LessonCardDef = {
  slug: "editorial-word-families",
  title: "Words Table: Editorial Word Families",
  description:
    "Study the word families table from the editorials, then write one original sentence for every form of each word — noun, verb, adjective and adverb. All forms must be accepted to perfect the lesson.",
  kind: "word_table",
  lesson: [
    { kind: "heading", text: "📖 The Word Families Table" },
    {
      kind: "text",
      text: "One word can wear many clothes — noun, verb, adjective, adverb — and each form has its own spelling and its own job in a sentence. Study the table below carefully; every form in it becomes one practice item on this card.",
    },
    {
      kind: "table",
      headers: ["Word", "Noun", "Verb", "Adjective", "Adverb"],
      rows: WORD_FAMILIES.map((f) => f.row),
    },
    { kind: "heading", text: "🎯 How This Card Works" },
    {
      kind: "bullets",
      items: [
        "Every form in the table gets one practice item — write a full sentence that actually uses that exact form of the word.",
        "Sentences that pass are locked; the rest stay open for you to fix and submit again.",
        `All ${questions.length} forms must be accepted to perfect the lesson.`,
      ],
    },
    {
      kind: "review",
      title: "Remember",
      items: [
        "A noun names something (a scourge, the stigma).",
        "A verb is an action (stigma → stigmatise).",
        "An adjective describes a noun (a discordant note).",
        "An adverb modifies a verb or adjective (discordantly loud).",
      ],
    },
  ],
  questions,
};

/** Grade one word-form sentence: it must be a real sentence that uses the form. */
export function gradeWordForm(
  studentText: string,
  question: LessonQuestion
): { correct: boolean; hints: string[] } {
  const wf = question.wordForm;
  if (!wf) return { correct: false, hints: ["Try again."] };
  const text = (studentText || "").trim();
  if (text.length < 15 || text.split(/\s+/).length < 3) {
    return {
      correct: false,
      hints: ["Write a complete sentence — a few words that make sense together, not just the word on its own."],
    };
  }
  const hit = wf.accepted.some((form) =>
    new RegExp(`(^|[^a-zA-Z])${esc(form)}([^a-zA-Z]|$)`, "i").test(text)
  );
  if (!hit) {
    return {
      correct: false,
      hints: [
        `Your sentence must use the ${POS_LABEL[wf.pos].toLowerCase()} form: ${wf.lemma}.`,
        POS_HINT[wf.pos],
      ],
    };
  }
  return { correct: true, hints: [] };
}

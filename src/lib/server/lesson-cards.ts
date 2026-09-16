import "server-only";
import { getCapitalizationCard, checkLine, type LessonBlock } from "./capitalization-cards";
import { clauseCombiningCard } from "./clause-combining-card";
import { relationshipCombiningCard } from "./relationship-combining-card";
import { errorCorrectionCard } from "./error-correction-card";
import { paraGapfillCard, type ParaGapfillData } from "./para-gapfill-card";
import { getMcqPart1, getMcqPart2 } from "./sentence-expansion-mcq-card";
import { buildFreeWritePart1, buildFreeWritePart2, getRandomNudge } from "./sentence-expansion-card";
import { editorialWordFamiliesCard, gradeWordForm } from "./word-table-cards";
import { definitionRecallCard } from "./definition-recall-card";

/**
 * ============================================================
 * SERVER-ONLY MODULE — DO NOT IMPORT FROM CLIENT CODE.
 * ============================================================
 *
 * Central lesson-card registry. Every lesson card (capitalization,
 * sentence types, future topics) is defined here (or composed from
 * the existing capitalization store) and keyed by slug. The CORRECT
 * ANSWERS for every card live ONLY in this server module — they are
 * never stored in the database and never sent to the browser.
 *
 * Three card kinds are supported:
 *   - "capitalize": the student rewrites a sentence with correct capitals.
 *   - "classify":   the student picks the sentence type for a sentence.
 *   - "combine":    the student rewrites a passage chunk, combining choppy
 *                   simple sentences — graded by rubric (keep every key
 *                   fact, reduce the sentence count, use a connector).
 * ============================================================
 */

/**
 * Rubric for "combine" (sentence-combining) cards. Because rewriting has
 * many valid answers, grading checks three features instead of exact text:
 *   1. Content — every required token (key fact / proper noun) appears.
 *   2. Combination — the rewrite has at most `maxSentences` sentences.
 *   3. Technique — at least one connector (FANBOYS, subordinating
 *      conjunction, or a semicolon) is used to join clauses.
 * Sentence-count and content hints are generated dynamically per attempt.
 */
export type CombineRubric = {
  /** Key facts that must survive the rewrite (lowercase phrases, substring match). */
  requiredTokens: string[];
  /** The rewritten chunk must be 1..maxSentences sentences long. */
  maxSentences: number;
  /** Hint shown when clauses are joined without a proper connector (run-on). */
  hintConnector: string;
};

/** Rubric for "combine_seq" (one-at-a-time typed combining) cards. */
export type CombineSeqRubric = {
  /** The subordinating conjunction the student MUST use (lowercase). */
  conjunction: string;
  /** True when the conjunction is attached to the FIRST sentence, so the
   *  combined sentence must START with the conjunction (dependent clause
   *  first, comma after it). False when the first sentence stays the main
   *  clause and the conjunction appears later. */
  lead: boolean;
  /** Key content words (lowercase) from both sentences that must survive. */
  requiredTokens: string[];
};

export type RelationshipCombineRubric = {
  relationship: "Cause/Effect" | "Contrast" | "Condition" | "Time";
  acceptableConjunctions: string[];
  requiredTokens: string[];
};

/** A single practice item inside a lesson card. */
export type LessonQuestion = {
  /** The sentence shown to the student (uncapitalized for capitalize cards). */
  prompt: string;
  /** The hidden correct answer (for capitalize/classify). For combine cards it
   *  is a model rewrite kept server-side only — it is never graded exactly. */
  answer: string;
  /** Guidance hints shown when this item is wrong (never the answer). */
  hints: string[];
  /** Optional grouping label, e.g. "Lesson Practice" or "Worksheet". */
  source?: string;
  /** Rubric used to grade combine (rewrite) cards. */
  rubric?: CombineRubric;
  /** Rubric used to grade combine_seq (one-at-a-time typed combining) cards. */
  seqRubric?: CombineSeqRubric;
  /** Three-step relationship, conjunction, and sentence-combination grading. */
  relationshipRubric?: RelationshipCombineRubric;
  /** Detailed feedback returned only after the item is answered correctly. */
  explanation?: string;
  /** Choices shown for relationship-analysis questions. */
  relationshipOptions?: string[];
  /** Paragraph gap-fill data (passage + blanks + word bank). */
  paraGapfill?: ParaGapfillData;
  /** Sentence expansion data (topic + conjunction + model answer + key tokens). */
  sentenceExpansion?: {
    topic: string;
    conjunction: string;
    modelAnswer: string;
    keyTokens: string[];
  };
  /** MCQ options for sentence expansion MCQ cards (stored as {a,b,c,d}). */
  mcqOptions?: { a: string; b: string; c: string; d: string };
  /** Word-table cards: the form the student's sentence must use. */
  wordForm?: {
    pos: "noun" | "verb" | "adjective" | "adverb";
    lemma: string;
    /** Accepted spellings/inflections (matched on word boundaries). */
    accepted: string[];
  };
  /** Definition-recall cards: the stage (1-based) this item belongs to. */
  stage?: number;
};

export type CardKind = "capitalize" | "classify" | "combine" | "true_false" | "combine_seq" | "error_correction" | "para_gapfill" | "sentence_expansion" | "word_table" | "definition_recall";

export type LessonCardDef = {
  slug: string;
  title: string;
  description: string;
  kind: CardKind;
  /** Structured lesson note rendered in the left pane. */
  lesson: LessonBlock[];
  questions: LessonQuestion[];
};

/** Normalize a student's classification answer for comparison. */
export function normalizeClassification(text: string): string {
  let s = (text || "").toLowerCase().replace(/\s+/g, " ").trim();
  // Accept "compound sentence", "compound", "compound sentences"…
  s = s.replace(/ sentences?$/, "").trim();
  return s;
}

/** Collapse whitespace + lowercase (used for token matching). */
function normalizeText(text: string): string {
  return (text || "").toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Loose, case-insensitive whole-word match that tolerates common verb
 * inflections. For "rise" it also accepts "rises/rose/rising/rised", for a
 * plural noun like "prices" it accepts "price". This lets genuinely
 * reworded combine_seq answers pass while still requiring every key fact.
 */
function textHasToken(text: string, tokenRaw: string): boolean {
  const token = tokenRaw.toLowerCase().trim();
  if (!token) return false;
  const variants = new Set<string>();
  variants.add(token);
  variants.add(token + "s");
  variants.add(token + "es");
  variants.add(token + "ed");
  variants.add(token + "d");
  variants.add(token + "ing");
  // strip a trailing 'e' to fold rise/raise-style verb forms
  if (token.endsWith("e")) {
    const stem = token.slice(0, -1);
    variants.add(stem + "s");
    variants.add(stem + "d");
    variants.add(stem + "ing");
  }
  // if the token itself is plural, also accept the singular
  if (token.endsWith("es")) variants.add(token.slice(0, -2));
  else if (token.endsWith("s")) variants.add(token.slice(0, -1));
  // irregular quick-map (increase/rose/etc.) handled implicitly by 
  // requiring at least one variant; add a few common irregulars
  const irregular: Record<string, string[]> = {
    rise: ["rose", "risen", "rising", "rises"],
    fall: ["fell", "fallen"],
    drop: ["dropped", "dropping", "drops"],
    pay: ["paid", "paying", "pays"],
    make: ["made", "making", "makes"],
    see: ["saw", "seen", "sees"],
    decline: ["declined", "declining", "declines"],
  };
  if (irregular[token]) irregular[token].forEach((v) => variants.add(v));

  // build a regex that matches any variant as a whole word (only first word
  // of multi-word tokens is used for the boundary — safe for our content words)
  const pattern = Array.from(variants)
    .sort((a, b) => b.length - a.length)
    .map((v) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  return new RegExp(`\\b(?:${pattern})\\b`).test(text);
}

/**
 * Count the sentences in a rewrite. Counts runs of sentence-ending
 * punctuation (. ! ?). Common abbreviations (U.S., Mr., etc.) are stripped
 * first so their periods don't inflate the count.
 */
export function countSentences(text: string): number {
  const s = normalizeText(text)
    .replace(/\bu\.s\./g, "us")
    .replace(/\bmr\./g, "mr")
    .replace(/\bmrs\./g, "mrs")
    .replace(/\bdr\./g, "dr")
    .replace(/\bst\./g, "st")
    .replace(/\bvs\./g, "vs")
    .replace(/\betc\./g, "etc")
    .replace(/\be\.g\./g, "eg");
  const runs = s.match(/[.!?]+/g);
  return runs ? runs.length : 0;
}

/**
 * Did the student use a combining technique? Passes when the rewrite
 * contains a semicolon, a comma + FANBOYS bridge, or any coordinating /
 * subordinating conjunction (a lenient word check so genuinely good
 * rewrites are never rejected). A pure run-on (no connector at all) fails.
 */
export function hasCombiningTechnique(text: string): boolean {
  const s = normalizeText(text);
  if (s.includes(";")) return true;
  const fanboys = /, *(and|but|or|nor|for|yet|so)\b/;
  if (fanboys.test(s)) return true;
  const conjunctions =
    /\b(and|but|or|nor|for|yet|so|because|although|though|while|when|whenever|where|wherever|if|unless|since|until|after|before|whereas)\b/;
  return conjunctions.test(s);
}

/** Grade one combine (rewrite) question against its rubric. */
export function gradeCombine(studentText: string, question: LessonQuestion): { correct: boolean; hints: string[] } {
  const rubric = question.rubric;
  if (!rubric) return { correct: false, hints: question.hints };

  const text = normalizeText(studentText);
  const hints: string[] = [];

  // 1. Content — every key fact must survive the rewrite
  const missing = rubric.requiredTokens.filter((t) => !text.includes(t.toLowerCase()));
  if (missing.length > 0) {
    hints.push(
      `Some key facts are missing — make sure your rewrite still includes: ${missing.join(", ")}. Combine sentences without dropping information.`
    );
  }

  // 2. Combination — the chunk must be condensed to 1..maxSentences
  const sentenceCount = countSentences(text);
  if (sentenceCount === 0) {
    hints.push("Your rewrite needs proper sentence-ending punctuation — end each sentence with a period, exclamation mark or question mark.");
  } else if (sentenceCount > rubric.maxSentences) {
    hints.push(
      `This chunk still reads as ${sentenceCount} short sentences — combine at least two together with a FANBOYS word (and, but, so), a subordinating conjunction (because, although, when) or a semicolon (;) to get it down to ${rubric.maxSentences} or fewer.`
    );
  }

  // 3. Technique — clauses must be joined with a real connector
  if (!hasCombiningTechnique(text)) {
    hints.push(rubric.hintConnector);
  }

  return { correct: hints.length === 0, hints };
}

/**
 * Grade one combine_seq (typed one-at-a-time combining) answer.
 * Accepts the docx's own model answer AND any genuinely equivalent rewrite,
 * as long as: (1) every key content token from both sentences survives, (2)
 * the required subordinating conjunction is used, (3) the dependent clause
 * is placed per the instruction (leading order + comma rule), and (4) it
 * stays a single sentence.
 */
export function gradeCombineSeq(
  studentText: string,
  question: LessonQuestion,
  analysis?: { relationship?: string; conjunction?: string }
): { correct: boolean; hints: string[] } {
  const relationshipRubric = question.relationshipRubric;
  if (relationshipRubric) {
    const text = normalizeText(studentText);
    const relationship = normalizeText(analysis?.relationship || "");
    const conjunction = normalizeText(analysis?.conjunction || "");
    const acceptable = relationshipRubric.acceptableConjunctions.map(normalizeText);
    const relationshipCorrect = relationship === normalizeText(relationshipRubric.relationship);
    const conjunctionCorrect = acceptable.includes(conjunction);
    const conjunctionUsed = conjunctionCorrect && new RegExp(
      `\\b${conjunction.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+")}\\b`
    ).test(text);
    const contentCorrect = relationshipRubric.requiredTokens.every((token) => textHasToken(text, token));
    const oneSentence = countSentences(text) <= 1;
    const startsWithConjunction = conjunctionUsed && text.startsWith(conjunction + " ");
    const frontedCommaCorrect = !startsWithConjunction || text.includes(",");
    const trailingCommaConjunctions = ["although", "though", "whereas", "while", "even though"];
    const conjunctionIndex = conjunctionUsed ? text.indexOf(conjunction) : -1;
    const trailingCommaCorrect =
      conjunctionIndex <= 0 ||
      !trailingCommaConjunctions.includes(conjunction) ||
      text.slice(0, conjunctionIndex).trimEnd().endsWith(",");

    return {
      correct:
        relationshipCorrect &&
        conjunctionCorrect &&
        conjunctionUsed &&
        contentCorrect &&
        oneSentence &&
        frontedCommaCorrect &&
        trailingCommaCorrect,
      hints: [],
    };
  }

  const rubric = question.seqRubric;
  if (!rubric) return { correct: false, hints: question.hints };

  const text = normalizeText(studentText);
  const hints: string[] = [];
  const conj = rubric.conjunction.toLowerCase();

  // 1. Content — every key fact must survive (word-form tolerant)
  const missing = rubric.requiredTokens.filter((t) => !textHasToken(text, t));
  if (missing.length > 0) {
    hints.push(
      `Your combined sentence is missing key information — make sure both parts survive. It should still include: ${missing.join(", ")}. Combine, never delete facts.`
    );
  }

  // 2. Require the specified subordinating conjunction
  if (!text.includes(conj)) {
    hints.push(`You must join the two ideas using the subordinating conjunction “${rubric.conjunction}”.`);
  }

  // 3. Clause order + comma rule
  const startsWithConj = text.startsWith(conj + " ") || text === conj;
  if (rubric.lead) {
    if (!startsWithConj) {
      hints.push(
        `The instruction says to attach the conjunction to the FIRST sentence — so start your combined sentence with “${rubric.conjunction}” (dependent clause first).`
      );
    } else if (!text.includes(",")) {
      hints.push(
        `When the dependent clause comes first, put a comma after it before the main clause (e.g. “${rubric.conjunction[0].toUpperCase()}${rubric.conjunction.slice(1)}, …”).`
      );
    }
  } else if (startsWithConj) {
    hints.push(
      `Keep the first sentence as your main clause — don't begin the whole sentence with “${rubric.conjunction}”. Place the dependent clause after the main clause.`
    );
  }

  // 4. Single sentence
  const sentenceCount = countSentences(text);
  if (sentenceCount > 1) {
    hints.push(
      `This reads as ${sentenceCount} separate sentences — join the two ideas into ONE sentence using “${rubric.conjunction}”.`
    );
  }

  return { correct: hints.length === 0, hints };
}

/**
 * Grade an error_correction answer by comparing the student's rewrite to the
 * hidden model answer using lenient token matching. Returns banter instead of
 * pedagogical hints — wrong answers get a quip, never a giveaway.
 */
export function gradeErrorCorrection(studentText: string, question: LessonQuestion): { correct: boolean; banter: string } {
  const answer = normalizeText(question.answer);
  const text = normalizeText(studentText);

  // Exact-ish match: strip trailing periods/question marks for comparison
  const strip = (s: string) => s.replace(/[.?!]+$/, "").trim();
  if (strip(text) === strip(answer)) return { correct: true, banter: "" };

  // Lenient: every word in the model answer appears in the student's text
  const modelWords = answer.split(/\s+/).filter((w) => w.length > 2);
  const allPresent = modelWords.every((w) => text.includes(w));
  if (allPresent) return { correct: true, banter: "" };

  // Wrong — return banter
  const banterPool = [
    "How many strokes of cane do you think you deserve for that? 😏",
    "Even my grandmother writes better sentences than this! 👵",
    "Is this English or were you inventing a new language? 🤔",
    "I've seen better grammar from a broken typewriter! ⌨️",
    "Your keyboard must be autocorrecting against you! 🤦",
    "Were you typing with your eyes closed? 😂",
    "That answer needs more than a little help — it needs CPR! 🏥",
    "The grammar gods are weeping right now 😭",
    "Even autocorrect gave up on that one! 📱",
    "Are you sure you went to school? 🎓",
    "That sentence just committed a grammar crime! 🚨",
    "I'd give that a C-minus... on a generous day! 📝",
    "Your English teacher would need therapy after reading that! 🛋️",
    "Was that English? I thought it was Morse code! 📡",
    "The comma police are coming for you! 👮",
    "That answer was a grammatical disaster zone! 💥",
    "I've seen neater handwriting from a spider on caffeine! 🕷️",
    "Did that sentence just break up with proper grammar? 💔",
    "Even spellcheck just filed a restraining order! 📋",
    "That was so wrong, even the wrong answers are offended! 😤",
  ];
  const banter = banterPool[Math.floor(Math.random() * banterPool.length)];
  return { correct: false, banter };
}

/**
 * Grade a para_gapfill answer — an array of { blankIndex, word } entries.
 * Returns per-blank correctness (no hints — the UI shows visual feedback only).
 */
export function gradeParaGapfill(
  answers: { blankIndex: number; word: string }[],
  question: LessonQuestion
): { allCorrect: boolean; results: { index: number; correct: boolean }[] } {
  const data = question.paraGapfill;
  if (!data) return { allCorrect: false, results: [] };

  const results = data.blanks.map((blank) => {
    const studentAnswer = answers.find((a) => a.blankIndex === blank.index);
    const correct = studentAnswer?.word?.toLowerCase().trim() === blank.answer.toLowerCase().trim();
    return { index: blank.index, correct };
  });

  const allCorrect = results.every((r) => r.correct);
  return { allCorrect, results };
}

/**
 * Grade a sentence_expansion answer — a free-write sentence.
 * Lenient: checks (1) conjunction present, (2) comma rule, (3) single conjunction,
 * (4) approximate topic relevance via key tokens. Returns correct + nudge.
 */
export function gradeSentenceExpansion(
  studentText: string,
  question: LessonQuestion
): { correct: boolean; nudge: string } {
  const data = question.sentenceExpansion;
  if (!data) return { correct: false, nudge: "Try again." };

  const text = normalizeText(studentText);
  const conj = data.conjunction.toLowerCase();

  // Must be a real sentence (at least ~15 chars)
  if (text.length < 15) {
    return { correct: false, nudge: "Write a complete sentence — it needs a subject, verb, and enough detail to make sense. ✍️" };
  }

  // 1. Conjunction must appear
  if (!text.includes(conj)) {
    return { correct: false, nudge: `Your sentence must use the conjunction "${data.conjunction}". Don't forget it! 📝` };
  }

  // 2. Single conjunction — check no double conjunctions
  const allConjs = ["because", "since", "although", "though", "even though", "whereas", "while", "if", "unless", "provided that", "as long as", "even if", "lest", "supposing that", "before", "after", "once", "so that"];
  const usedConjs = allConjs.filter((c) => text.includes(c));
  if (usedConjs.length > 1) {
    return { correct: false, nudge: "Your sentence uses more than one conjunction — use only ONE per sentence. 🚫" };
  }

  // 3. Comma rule (lenient)
  const frontedConjs = ["if", "although", "though", "even though", "even if", "supposing that", "once", "before", "after", "while", "whereas", "because", "since", "unless", "provided that", "as long as", "lest"];
  const startsWithConj = text.startsWith(conj + " ") || text.startsWith(conj + ",");
  const needsFrontComma = frontedConjs.includes(conj) && startsWithConj;
  if (needsFrontComma && !text.includes(conj + ",") && !text.includes(", " + conj) && !text.match(new RegExp(conj.replace(/ /g, "\\s+") + ",\\s"))) {
    // Check if there's a comma somewhere after the conjunction phrase
    const conjIdx = text.indexOf(conj);
    const afterConj = text.slice(conjIdx + conj.length);
    // Find the end of the subordinate clause (rough: next comma or period)
    const clauseEnd = afterConj.indexOf(",");
    if (clauseEnd === -1) {
      return { correct: false, nudge: "When the conjunction starts the sentence, put a comma after the subordinate clause before the main clause. ✏️" };
    }
  }

  // For whereas/although/though — comma required even when trailing
  const trailingCommaConjs = ["whereas", "although", "though"];
  if (trailingCommaConjs.includes(conj) && !startsWithConj) {
    // Check there's a comma before the conjunction
    const conjIdx = text.indexOf(conj);
    const beforeConj = text.slice(0, conjIdx).trim();
    if (beforeConj && !beforeConj.endsWith(",")) {
      return { correct: false, nudge: "When using 'whereas/although/though' in the middle of a sentence, put a comma before it. ✏️" };
    }
  }

  // 4. Topic relevance (lenient — at least 1 key token from the topic)
  const topicWords = data.topic.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  const hasTopicWord = topicWords.some((w) => text.includes(w));
  const hasKeyToken = data.keyTokens.some((t) => text.includes(t));
  if (!hasTopicWord && !hasKeyToken && data.keyTokens.length > 0) {
    return { correct: false, nudge: "Your sentence doesn't seem to be about the given topic. Make sure it addresses it! 🎯" };
  }

  // Passed all checks
  return { correct: true, nudge: "" };
}

/** Grade one question, returning both the verdict and the hints to show.
 * For combine cards the hints are generated per failed rubric check.
 */
export function gradeQuestionWithHints(
  card: LessonCardDef,
  studentText: string,
  index: number,
  analysis?: { relationship?: string; conjunction?: string }
): { correct: boolean; hints: string[] } {
  const question = card.questions[index];
  if (!question) return { correct: false, hints: [] };
  if (card.kind === "combine_seq") {
    return gradeCombineSeq(studentText, question, analysis);
  }
  if (card.kind === "error_correction") {
    // error_correction uses banter, not hints — handled at the component level
    // This path is only reached via the generic dispatcher; the check route
    // handles error_correction separately.
    const result = gradeErrorCorrection(studentText, question);
    return { correct: result.correct, hints: [] };
  }
  if (card.kind === "word_table") {
    return gradeWordForm(studentText, question);
  }
  if (card.kind === "capitalize") {
    const correct = checkLine(studentText, {
      prompt: question.prompt,
      answer: question.answer,
      hints: question.hints,
    });
    return { correct, hints: correct ? [] : question.hints };
  }
  if (card.kind === "classify") {
    const correct = normalizeClassification(studentText) === normalizeClassification(question.answer);
    return { correct, hints: correct ? [] : question.hints };
  }
  if (card.kind === "true_false") {
    const normalizeTF = (s: string) => (s || "").toLowerCase().replace(/\s+/g, " ").trim();
    const correct = normalizeTF(studentText) === normalizeTF(question.answer);
    return { correct, hints: correct ? [] : question.hints };
  }
  // combine — rubric grading with per-rule hints
  return gradeCombine(studentText, question);
}

/** Get a lesson card by drill card_type + slug. */
export function getLessonCard(cardType: string | null | undefined, slug: string | null | undefined): LessonCardDef | null {
  if (!slug) return null;
  if (cardType === "capitalization") {
    const card = getCapitalizationCard(slug);
    if (!card) return null;
    return {
      slug: card.slug,
      title: card.title,
      description: card.description,
      kind: "capitalize",
      lesson: card.lesson,
      questions: card.lines.map((l) => ({
        prompt: l.prompt,
        answer: l.answer,
        hints: l.hints,
      })),
    };
  }
  if (cardType === "sentence_types" || cardType === "sentence_combining" || cardType === "true_false" || cardType === "combine_seq" || cardType === "error_correction" || cardType === "para_gapfill" || cardType === "sentence_expansion" || cardType === "sentence_expansion_mcq" || cardType === "word_table" || cardType === "definition_recall") {
    return CARDS[slug] ?? null;
  }
  return null;
}

/** All sentence-type style cards (classify kind). */
const CARDS: Record<string, LessonCardDef> = {
  [definitionRecallCard.slug]: definitionRecallCard,
  "sentence-types-basics": {
    slug: "sentence-types-basics",
    title: "Sentence Types",
    description:
      "Learn the four sentence structures — simple, compound, complex and compound-complex — then classify every practice sentence until you get them all right.",
    kind: "classify",
    lesson: [
      {
        kind: "heading",
        text: "📝 Sentence Structures Lesson Note",
      },
      {
        kind: "text",
        text: "Learn the four sentence structures — simple, compound, complex, and compound-complex. Master the distinctive features of each type, then classify every practice sentence until you get them all right!",
      },
      {
        kind: "heading",
        text: "🧭 The Sentence Building Blocks",
      },
      {
        kind: "text",
        text: "Before we look at the four types, you must know the difference between the two types of clauses. Think of a clause as a group of words with a subject (who/what) and a predicate (the verb or action).",
      },
      {
        kind: "bullets",
        items: [
          "🏠 Independent Clause (The House): A complete thought. It has a subject and a verb. It can stand alone as a sentence. Example: I went home.",
          "🧱 Dependent Clause (The Brick): An incomplete thought. It has a subject and a verb, but it starts with a “glue word” that leaves you hanging. It cannot stand alone. Example: Because it was raining... (What happened next?)",
        ],
      },
      {
        kind: "heading",
        text: "🕵️ The Four Sentence Types",
      },
      {
        kind: "text",
        text: "Every sentence in the English language fits into one of these four categories.",
      },
      {
        kind: "heading",
        text: "1. Simple Sentences (The Lone House)",
      },
      {
        kind: "text",
        text: "A simple sentence contains exactly ONE independent clause. It expresses a single, complete thought.",
      },
      {
        kind: "bullets",
        items: [
          "Distinctive Feature: It never joins two clauses together.",
          "Student Tip: Simple sentences can still be long! They can have extra description phrases, multiple subjects, or multiple verbs, but they only contain one main complete thought.",
        ],
      },
      {
        kind: "examples",
        title: "🔍 Examples",
        items: [
          "I went to the park to eat a hamburger.",
          "Kyle, Keith, and Doug went to the playhouse and watched Shakespeare's Hamlet.",
        ],
      },
      {
        kind: "bullets",
        items: [
          "Why it's simple — “I went to the park…”: One subject (“I”) and one main action (“went”). The rest is just extra information.",
          "Why it's simple — “Kyle, Keith, and Doug…”: This has a compound subject (three people) and a compound predicate (two actions), but it is still just one single clause working together.",
        ],
      },
      {
        kind: "heading",
        text: "2. Compound Sentences (The Bridge between Houses)",
      },
      {
        kind: "text",
        text: "A compound sentence joins two or more independent clauses together.",
      },
      {
        kind: "bullets",
        items: [
          "Distinctive Feature: It connects equal, independent thoughts using a coordinating conjunction (a “Bridge Word”).",
          "The Bridge Words (FANBOYS): For, And, Nor, But, Or, Yet, So.",
          "Punctuation Rule: Always place a comma right before the FANBOYS word when it joins two clauses.",
        ],
      },
      {
        kind: "examples",
        title: "🔍 Examples",
        items: [
          "I went home, so I could get some sleep.",
          "Doug did his math work, but he got some wrong, yet he didn't mind.",
        ],
      },
      {
        kind: "bullets",
        items: [
          "Clause 1: I went home (Independent) · Bridge: , so · Clause 2: I could get some sleep (Independent)",
          "Why it's compound — “Doug did his math work…”: It chains three independent clauses together using the bridges , but and , yet.",
        ],
      },
      {
        kind: "heading",
        text: "3. Complex Sentences (The Glue Word)",
      },
      {
        kind: "text",
        text: "A complex sentence joins one independent clause with at least one dependent clause.",
      },
      {
        kind: "bullets",
        items: [
          "Distinctive Feature: It uses a subordinating conjunction (a “Glue Word”). This word attaches itself to a clause and turns it into a dependent clause.",
          "The Glue Words: After, Although, As, Because, Before, Even if, If, Now that, Once, Since, That, Though, Unless, Until, When, Whenever, Where, Wherever, While.",
          "Punctuation Rule (The Flip-Flop): If the Glue Word starts the sentence, use a comma after that clause: [Glue + Dependent], [Independent]. If the Glue Word is in the middle, no comma is needed: [Independent] [Glue + Dependent].",
        ],
      },
      {
        kind: "examples",
        title: "🔍 Examples",
        items: ["Unless you want trouble, you should stop.", "You should stop because I'm getting mad."],
      },
      {
        kind: "bullets",
        items: [
          "Glue + Dependent: Unless you want trouble (Starts with glue, needs a comma!) → Independent: you should stop",
          "Independent: You should stop → Glue + Dependent: because I'm getting mad (Glue is in the middle, no comma!)",
        ],
      },
      {
        kind: "heading",
        text: "4. Compound-Complex Sentences (The Complete Neighborhood)",
      },
      {
        kind: "text",
        text: "A compound-complex sentence is a mix of both! It contains two or more independent clauses AND at least one dependent clause.",
      },
      {
        kind: "bullets",
        items: [
          "Distinctive Feature: Look for both a Bridge Word (FANBOYS) and a Glue Word (Subordinating Conjunction) in the same sentence.",
        ],
      },
      {
        kind: "examples",
        title: "🔍 Examples",
        items: [
          "Because I paid attention, I got an A on the test, and I was so happy.",
          "I went home because it was getting late, but I had to wait on the porch until my mom got home anyway.",
        ],
      },
      {
        kind: "bullets",
        items: [
          "Dependent (Glue): Because I paid attention → Independent 1: I got an A on the test → Independent 2: I was so happy (Linked by the bridge , and)",
          "Independent 1: I went home → Dependent 1 (Glue): because it was getting late → Independent 2: I had to wait on the porch (Linked by the bridge , but) → Dependent 2 (Glue): until my mom got home anyway",
        ],
      },
      {
        kind: "heading",
        text: "⏱️ Quick Cheat-Sheet Checklist",
      },
      {
        kind: "text",
        text: "Use this checklist on every practice sentence to find your answer fast:",
      },
      {
        kind: "table",
        headers: ["Sentence Type", "Independent Clauses", "Dependent Clauses", "What to Look For"],
        rows: [
          ["🟢 Simple", "1", "0", "Only 1 complete thought. No connecting words."],
          ["🔵 Compound", "2 or more", "0", "Look for , FANBOYS joining complete thoughts."],
          ["🟡 Complex", "1", "1 or more", "Look for one Glue Word (if, because, when)."],
          ["🟠 Compound-Complex", "2 or more", "1 or more", "Look for a Glue Word AND a , FANBOYS bridge."],
        ],
      },
      {
        kind: "heading",
        text: "🚀 Ready to Practice?",
      },
      {
        kind: "text",
        text: "Read and analyze each practice sentence on the right.",
      },
      {
        kind: "bullets",
        items: [
          "Count the verbs to find the clauses.",
          "Circle the Bridges (FANBOYS) and Glue Words.",
          "Use the checklist above to select your answer!",
        ],
      },
    ],
    questions: [
      // ── Lesson Practice (simple-compound-and-complex-sentences-lesson.pdf) ──
      {
        prompt: "The weather has been nice but it may snow again any day.",
        answer: "compound",
        hints: [
          "Find the F.A.N.B.O.Y.S. — “but” joins two independent clauses.",
          "Two independent clauses joined by a coordinating conjunction = compound.",
        ],
        source: "Lesson Practice",
      },
      {
        prompt: "Ever since the big blowout, she and I haven't gotten along.",
        answer: "simple",
        hints: [
          "“Ever since the big blowout” has no verb — it's a phrase, not a clause.",
          "Only ONE clause here, so it cannot be compound or complex.",
        ],
        source: "Lesson Practice",
      },
      {
        prompt: "Dad brought candy because he felt bad.",
        answer: "complex",
        hints: [
          "“Because he felt bad” is a dependent clause introduced by a subordinating conjunction.",
          "One independent clause + one dependent clause = complex.",
        ],
        source: "Lesson Practice",
      },
      {
        prompt:
          "If you want to go on the trip, you should bring your signed permission slip and I'll collect it before we go.",
        answer: "compound-complex",
        hints: [
          "“And” joins two independent clauses, while “If…” and “before we go” are dependent clauses.",
          "Independent + independent + dependent(s) = compound-complex.",
        ],
        source: "Lesson Practice",
      },
      {
        prompt: "I left before the fight started.",
        answer: "complex",
        hints: [
          "“Before the fight started” is a dependent clause introduced by a subordinating conjunction.",
          "One independent + one dependent clause = complex.",
        ],
        source: "Lesson Practice",
      },
      {
        prompt: "Candy rots your teeth and TV makes you lazy, but I still like them.",
        answer: "compound",
        hints: [
          "Three independent clauses joined by FANBOYS (“and” and “but”).",
          "No dependent clauses — so it is compound, not compound-complex.",
        ],
        source: "Lesson Practice",
      },
      {
        prompt: "He will call your home unless you are passing.",
        answer: "complex",
        hints: [
          "“Unless you are passing” is a dependent clause introduced by a subordinating conjunction.",
          "One independent + one dependent clause = complex.",
        ],
        source: "Lesson Practice",
      },
      // ── Worksheet (sentence-types.pdf) ──
      {
        prompt: "When I get home from school, I'm going to take a nap.",
        answer: "complex",
        hints: [
          "The sentence starts with the subordinating conjunction “When”.",
          "Dependent clause + independent clause = complex.",
        ],
        source: "Worksheet",
      },
      {
        prompt: "I got in trouble so I can't go to the party, but it would have been fun.",
        answer: "compound",
        hints: [
          "“So” and “but” are both FANBOYS joining independent clauses.",
          "Three independent clauses, no dependent clauses = compound.",
        ],
        source: "Worksheet",
      },
      {
        prompt: "Being alone can be scary unless you keep yourself busy.",
        answer: "complex",
        hints: [
          "“Unless you keep yourself busy” is a dependent clause.",
          "One independent + one dependent clause = complex.",
        ],
        source: "Worksheet",
      },
      {
        prompt: "Mr. Morton, the best reading teacher in the world, taught me sentence structure.",
        answer: "simple",
        hints: [
          "“The best reading teacher in the world” is an appositive phrase — it has no verb and is not a clause.",
          "The whole sentence has just ONE clause.",
        ],
        source: "Worksheet",
      },
      {
        prompt: "Keith, Carrie, and Kyle bought donuts and ate them down by the river.",
        answer: "simple",
        hints: [
          "There is a compound subject and a compound predicate, but still only ONE clause.",
          "No FANBOYS joins a second clause — simple.",
        ],
        source: "Worksheet",
      },
      {
        prompt: "I left early so that I could get some work done, but I'll be back soon.",
        answer: "compound-complex",
        hints: [
          "“So that I could get some work done” is a dependent clause.",
          "“But” joins independent clauses, and there's also a dependent clause = compound-complex.",
        ],
        source: "Worksheet",
      },
      {
        prompt: "Crossing the street is dangerous if you don't look both ways before you cross.",
        answer: "complex",
        hints: [
          "“If you don't look both ways before you cross” is a dependent clause.",
          "One independent + one dependent clause = complex.",
        ],
        source: "Worksheet",
      },
      {
        prompt: "If you don't want to study, you should stay home, but you may regret it.",
        answer: "compound-complex",
        hints: [
          "“If you don't want to study” is a dependent clause.",
          "“But” joins two independent clauses, plus that dependent clause = compound-complex.",
        ],
        source: "Worksheet",
      },
      {
        prompt: "Every time I go to mall, I spend all of my money on things that I don't need.",
        answer: "complex",
        hints: [
          "“Every time I go to mall” and “that I don't need” are both dependent clauses.",
          "One independent clause + dependent clauses = complex.",
        ],
        source: "Worksheet",
      },
      {
        prompt: "Mom said that I can go to the museum with you but I have to be home early.",
        answer: "compound-complex",
        hints: [
          "“That I can go to the museum with you” is a dependent clause.",
          "“But” joins independent clauses, plus that dependent clause = compound-complex.",
        ],
        source: "Worksheet",
      },
      {
        prompt: "Modern Warfare is a fun game but no game is better than Ms. Pac-Man.",
        answer: "compound",
        hints: [
          "Two independent clauses joined by the FANBOYS “but”.",
          "No dependent clauses = compound.",
        ],
        source: "Worksheet",
      },
      {
        prompt: "Todd and Nick are eating chips and salsa on a park bench before dinner.",
        answer: "simple",
        hints: [
          "“Before dinner” is a prepositional phrase, not a clause.",
          "Compound subject and object, but only ONE clause = simple.",
        ],
        source: "Worksheet",
      },
    ],
  },

  // ════════════════════════════════════════════════════════════════
  // Sentence Combining (rubric / rewrite cards) — kind: "combine"
  // Source: New sets of materials/death-of-hamilton-sentence-combining.pdf
  // ════════════════════════════════════════════════════════════════
  "hamilton-sentence-combining": {
    slug: "hamilton-sentence-combining",
    title: "Hamilton Sentence Combining",
    description:
      "Learn the four tools for combining choppy sentences, then rewrite the story of Alexander Hamilton's death until every chunk reads smoothly and keeps every key fact.",
    kind: "combine",
    lesson: [
      {
        kind: "heading",
        text: "📝 Sentence Combining Lesson Note",
      },
      {
        kind: "text",
        text: "The passage on the right tells the story of Alexander Hamilton's death, but it's written almost entirely in simple sentences — which makes it boring and childish. Your job is to add sophistication by combining sentences. Learn the four tools below, then rewrite every chunk until it's smooth, complete and correct!",
      },
      {
        kind: "heading",
        text: "🛠️ The Four Combining Tools",
      },
      {
        kind: "subheading",
        text: "Tool 1 — Coordination (FANBOYS)",
      },
      {
        kind: "text",
        text: "Join two complete thoughts with a coordinating conjunction. Put a comma right before the FANBOYS word: For, And, Nor, But, Or, Yet, So.",
      },
      {
        kind: "examples",
        title: "Before → After",
        items: [
          "Hamilton was a revolutionary war hero. He was George Washington's right-hand man.",
          "Hamilton was a revolutionary war hero, and he was George Washington's right-hand man.",
        ],
      },
      {
        kind: "subheading",
        text: "Tool 2 — Subordination (Glue Words)",
      },
      {
        kind: "text",
        text: "Turn one thought into a dependent clause with a subordinating conjunction such as because, although, though, when, while, if, unless, until, after, before, since. This shows the relationship between the ideas (cause, time, contrast).",
      },
      {
        kind: "examples",
        title: "Before → After",
        items: [
          "Hamilton was mortally wounded. He died the next day.",
          "Hamilton was mortally wounded, and he died the next day — although the nation hoped he would recover.",
        ],
      },
      {
        kind: "subheading",
        text: "Tool 3 — Semicolons (;)",
      },
      {
        kind: "text",
        text: "Join two closely related complete thoughts with a semicolon when a conjunction would feel too heavy.",
      },
      {
        kind: "examples",
        title: "Before → After",
        items: [
          "Jefferson became the president. Burr became vice president.",
          "Jefferson became the president; Burr became vice president.",
        ],
      },
      {
        kind: "subheading",
        text: "Tool 4 — Appositives & Phrases",
      },      {
        kind: "text",
        text: "Turn a whole sentence into a description tucked inside another sentence using an appositive (a noun phrase that renames) or a participial phrase. This is the most elegant tool of all.",
      },
      {
        kind: "examples",
        title: "Before → After",
        items: [
          "The guy on the US ten-dollar bill is Alexander Hamilton. He was killed in a duel.",
          "Alexander Hamilton, the guy on the US ten-dollar bill, was killed in a duel.",
        ],
      },
      {
        kind: "heading",
        text: "✅ The Grading Checklist",
      },
      {
        kind: "text",
        text: "Every chunk you rewrite is checked against these three rules before it counts as perfected:",
      },
      {
        kind: "bullets",
        items: [
          "Keep every key fact — all the important names and details must survive your rewrite (don't delete information to 'combine').",
          "Combine — each chunk must be condensed to 3 sentences or fewer (from 5–6 choppy originals).",
          "Use a connector — join your clauses with a FANBOYS word, a subordinating conjunction, or a semicolon. No run-ons!",
        ],
      },
      {
        kind: "review",
        title: "The three rules to remember:",
        items: [
          "Keep every key fact.",
          "Reduce each chunk to 3 sentences or fewer.",
          "Join clauses with FANBOYS, a subordinating conjunction, or a semicolon.",
        ],
      },
      {
        kind: "heading",
        text: "🚀 Ready to Practice?",
      },
      {
        kind: "text",
        text: "Read each chunk on the right, then rewrite it below the original. All 5 chunks must be perfected before you master this lesson — you'll get a hint for anything you miss, and you can try again!",
      },
    ],
    questions: [
      {
        prompt:
          "The guy on the US ten-dollar bill is Alexander Hamilton.\nHe was killed in a duel by Vice President Aaron Burr.\nHamilton was a revolutionary war hero.\nHe was George Washington's right-hand man.\nHe was the first US Secretary of the Treasury.\nHe formulated an economic policy that got America on its feet.",
        answer:
          "Alexander Hamilton, the guy on the US ten-dollar bill, was killed in a duel by Vice President Aaron Burr. A Revolutionary War hero and George Washington's right-hand man, he served as the first US Secretary of the Treasury, where he formulated an economic policy that got America on its feet.",
        hints: [],
        source: "Chunk 1 · Portrait & Career",
        rubric: {
          requiredTokens: ["hamilton", "burr", "ten-dollar bill", "duel", "washington", "treasury"],
          maxSentences: 3,
          hintConnector:
            "Good sentence count, but it reads like a run-on. Join your clauses properly with a FANBOYS word and a comma (, and / , but / , so), a subordinating conjunction (because / although / when), or a semicolon (;).",
        },
      },
      {
        prompt:
          "Aaron Burr was a colonel in the Continental Army.\nHe served with George Washington at Valley Forge.\nIn the election of 1800, he was in a deadlock with Thomas Jefferson for the presidency.\nThe election went to the House of Representatives to be decided.\nJefferson became the president.\nBurr became vice president.",
        answer:
          "Aaron Burr, a colonel in the Continental Army who served with George Washington at Valley Forge, was in a deadlock with Thomas Jefferson for the presidency in the election of 1800. The election went to the House of Representatives to be decided; Jefferson became president, while Burr became vice president.",
        hints: [],
        source: "Chunk 2 · Burr's Rise",
        rubric: {
          requiredTokens: ["burr", "continental army", "valley forge", "jefferson", "house of representatives"],
          maxSentences: 3,
          hintConnector:
            "Good sentence count, but it reads like a run-on. Join your clauses properly with a FANBOYS word and a comma (, and / , but / , so), a subordinating conjunction (because / although / when), or a semicolon (;).",
        },
      },
      {
        prompt:
          "Hamilton had talked a lot of stuff about Aaron Burr before the election.\nSome thought it may have cost Hamilton the presidency.\nThe hatred between the two men would continue until July 1804.\nBurr challenged Hamilton to a duel.\nHamilton accepted.",
        answer:
          "Hamilton had talked a lot of stuff about Aaron Burr before the election — and some thought it may have cost Hamilton the presidency. The hatred between the two men continued until July 1804, when Burr challenged Hamilton to a duel, and Hamilton accepted.",
        hints: [],
        source: "Chunk 3 · The Rivalry",
        rubric: {
          requiredTokens: ["hamilton", "burr", "1804", "duel", "challenged"],
          maxSentences: 3,
          hintConnector:
            "Good sentence count, but it reads like a run-on. Join your clauses properly with a FANBOYS word and a comma (, and / , but / , so), a subordinating conjunction (because / although / when), or a semicolon (;).",
        },
      },
      {
        prompt:
          "The fateful day came on July 11, 1804.\nVice President Aaron Burr and former Secretary of the Treasury Alexander Hamilton faced off.\nHamilton was mortally wounded.\nHe was dragged from the duelling area.\nHe died the next day.\nWhile the nation mourned, Burr returned to complete his term as vice president.",
        answer:
          "The fateful day came on July 11, 1804, when Vice President Aaron Burr and former Secretary of the Treasury Alexander Hamilton faced off. Hamilton was mortally wounded, dragged from the duelling area, and died the next day; while the nation mourned, Burr returned to complete his term as vice president.",
        hints: [],
        source: "Chunk 4 · The Duel",
        rubric: {
          requiredTokens: ["1804", "burr", "hamilton", "wounded", "died"],
          maxSentences: 3,
          hintConnector:
            "Good sentence count, but it reads like a run-on. Join your clauses properly with a FANBOYS word and a comma (, and / , but / , so), a subordinating conjunction (because / although / when), or a semicolon (;).",
        },
      },
      {
        prompt:
          "His success in the duel proved to work toward his downfall.\nThere was some talk of murder charges being brought against him.\nHowever, the rules of the duel were followed.\nNo indictment was carried forward.\nHe would later go on to be charged for treason.\nHe attempted to establish his own empire in the South.",
        answer:
          "His success in the duel proved to work toward his downfall: there was some talk of murder charges, but because the rules of the duel were followed, no indictment was carried forward. He would later be charged for treason when he attempted to establish his own empire in the South.",
        hints: [],
        source: "Chunk 5 · Aftermath",
        rubric: {
          requiredTokens: ["downfall", "murder", "indictment", "treason", "empire"],
          maxSentences: 3,
          hintConnector:
            "Good sentence count, but it reads like a run-on. Join your clauses properly with a FANBOYS word and a comma (, and / , but / , so), a subordinating conjunction (because / although / when), or a semicolon (;).",
        },
      },
    ],
  },

  [clauseCombiningCard.slug]: clauseCombiningCard,
  [editorialWordFamiliesCard.slug]: editorialWordFamiliesCard,
  [relationshipCombiningCard.slug]: relationshipCombiningCard,

  // ════════════════════════════════════════════════════════════════
  // True or False (true_false kind) — chip-selection cards.
  // Students judge each statement as True or False; the answers live
  // ONLY in this server module and are checked on submit.
  // ════════════════════════════════════════════════════════════════
  "true-false-science-facts": {
    slug: "true-false-science-facts",
    title: "True or False: Science Facts",
    description:
      "Learn how to spot the traps hidden in true/false questions, then judge every science statement until you get them all right.",
    kind: "true_false",
    lesson: [
      {
        kind: "heading",
        text: "📝 True or False Lesson Note",
      },
      {
        kind: "text",
        text: "True or false questions look easy — but they hide sneaky traps. Learn how to read each statement like a scientist, then judge every practice statement until you get them all right!",
      },
      {
        kind: "heading",
        text: "🧭 Read the Whole Statement First",
      },
      {
        kind: "text",
        text: "Never decide before you finish reading. A statement can start true and end false (or the other way round). Read the full sentence, then test it against what you know.",
      },
      {
        kind: "bullets",
        items: [
          "Break it into parts — check every fact separately. One wrong part makes the whole statement false.",
          "Ask: “Is this ALWAYS true?” — a statement is only true if it is true every single time.",
        ],
      },
      {
        kind: "heading",
        text: "🚨 Watch Out for the Absolute Words",
      },
      {
        kind: "text",
        text: "Be suspicious of words that allow no exceptions. Statements with words like always, never, every, all, only and no are usually FALSE — because science is full of exceptions.",
      },
      {
        kind: "examples",
        title: "Absolute-word traps",
        items: [
          "All metals are magnetic. (False — copper and gold are metals, but they are not magnetic.)",
          "Fish never breathe air. (False — some fish can gulp air from the surface!)",
        ],
      },
      {
        kind: "heading",
        text: "🔍 Check the Little Words",
      },
      {
        kind: "text",
        text: "Words like “some”, “most”, “usually” and “can” make a statement easier to be true. Words like “always” and “never” make it almost impossible. Read carefully and you'll catch the trick every time.",
      },
      {
        kind: "table",
        headers: ["Word", "What it does", "Verdict"],
        rows: [
          ["Always / Never / Every / All", "Allows no exceptions", "Almost always False"],
          ["Some / Most / Usually", "Allows exceptions", "Often True"],
          ["Can / May / Sometimes", "Only says it's possible", "Usually True"],
        ],
      },
      {
        kind: "review",
        title: "The three rules to remember:",
        items: [
          "Read the whole statement before deciding.",
          "A statement is only true if it is true every single time.",
          "Beware absolute words: always, never, every, all.",
        ],
      },
      {
        kind: "heading",
        text: "🚀 Ready to Practice?",
      },
      {
        kind: "text",
        text: "Read each statement on the right, then choose True or False. All statements must be right to master the lesson — you'll get a hint for anything you miss, and you can try again!",
      },
    ],
    questions: [
      {
        prompt: "Water boils at 100°C at sea level.",
        answer: "True",
        hints: ["At normal atmospheric pressure (sea level), water boils at exactly 100°C."],
        source: "Practice Statements",
      },
      {
        prompt: "The sun is a planet.",
        answer: "False",
        hints: ["The sun is a star — a giant ball of hot glowing gas at the centre of our solar system."],
        source: "Practice Statements",
      },
      {
        prompt: "Mammals breathe with gills.",
        answer: "False",
        hints: ["Fish breathe with gills. Mammals — including humans — breathe with lungs."],
        source: "Practice Statements",
      },
      {
        prompt: "The Earth revolves around the Sun.",
        answer: "True",
        hints: ["The Earth orbits the Sun once every year — that's what a revolution is."],
        source: "Practice Statements",
      },
      {
        prompt: "Oxygen is needed for burning to take place.",
        answer: "True",
        hints: ["Combustion (burning) needs three things: fuel, heat and oxygen. Remove the oxygen and the fire goes out."],
        source: "Practice Statements",
      },
      {
        prompt: "All metals are magnetic.",
        answer: "False",
        hints: ["Only some metals — like iron, nickel and cobalt — are magnetic. Copper, gold and aluminium are metals that are not magnetic."],
        source: "Practice Statements",
      },
      {
        prompt: "Photosynthesis takes place mainly in the leaves of plants.",
        answer: "True",
        hints: ["Leaves contain chlorophyll, the green pigment that traps sunlight for photosynthesis."],
        source: "Practice Statements",
      },
      {
        prompt: "Sound travels faster than light.",
        answer: "False",
        hints: ["Light travels much faster than sound — that's why you see lightning before you hear the thunder."],
        source: "Practice Statements",
      },
      {
        prompt: "The human heart has four chambers.",
        answer: "True",
        hints: ["The heart has two upper chambers (atria) and two lower chambers (ventricles)."],
        source: "Practice Statements",
      },
      {
        prompt: "Friction is always a disadvantage and is never useful.",
        answer: "False",
        hints: ["Absolute words (“always”, “never”) usually signal a false statement. Friction also helps us walk, grip and brake."],
        source: "Practice Statements",
      },
    ],
  },

  // ════════════════════════════════════════════════════════
  // Subordinating Conjunction Error Correction
  // ════════════════════════════════════════════════════════
  "subconj-error-correction": errorCorrectionCard,

  // ════════════════════════════════════════════════
  // Subordinating Conjunction Paragraph Exercise
  // ════════════════════════════════════════════════
  "subconj-paragraph-exercise": paraGapfillCard,

  // ════════════════════════════════════════════════
  // Sentence Expansion — MCQ Parts 1 & 2
  // ════════════════════════════════════════════════
  "sentence-expansion-mcq-part1": getMcqPart1(),
  "sentence-expansion-mcq-part2": getMcqPart2(),

  // ════════════════════════════════════════════════
  // Sentence Expansion — Free Write Parts 1 & 2
  // ════════════════════════════════════════════════
  "sentence-expansion-part1": buildFreeWritePart1(),
  "sentence-expansion-part2": buildFreeWritePart2(),
};

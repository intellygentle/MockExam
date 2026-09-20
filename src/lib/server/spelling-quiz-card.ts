import "server-only";
import type { LessonCardDef, LessonQuestion } from "./lesson-cards";

/**
 * SERVER-ONLY MODULE — DO NOT IMPORT FROM CLIENT CODE.
 *
 * "Spelling Quiz: Choose the Correct Spelling" card for the Spelling Bee
 * stack. Each question shows one British English (RP) pronunciation and two
 * rival spellings that sound alike — only one is the real word. The student
 * taps the correct spelling: +1 (green) for a hit, -1 (red) for a miss, and
 * the next word appears instantly. One run lasts 5 minutes; when the clock
 * stops the card reports how many words were attempted, right and wrong.
 *
 * Because the drill is graded live, at tap speed, the two options and the
 * correct one are sent to the client (same approach as the definition-recall
 * card). The teacher's answer key below is the single source of truth.
 *
 * Source: "Word_Vault_Spelling_Quiz.docx" — 120 questions in 6 sections.
 */

/** Length of one timed run, in seconds. */
export const SPELLING_QUIZ_RUN_SECONDS = 300;

/**
 * How many correct answers a word needs, in a row, before it counts as
 * learned. A wrong tap resets that word's streak to 0, and a run shows each
 * word at most once — so "3" means three separate runs answered correctly.
 * The card is only mastered once EVERY word reaches this streak.
 */
export const SPELLING_QUIZ_MASTERY_TARGET = 3;

type QuizTuple = [
  /** RP pronunciation shown for the word. */
  string,
  /** Disambiguating note, e.g. "(verb)" — empty when the word is unambiguous. */
  string,
  /** Option A. */
  string,
  /** Option B. */
  string,
  /** Which option is spelled correctly. */
  "a" | "b",
];

type QuizSection = { name: string; items: QuizTuple[] };

const SECTIONS: QuizSection[] = [
  {
    name: "Vowels silently dropped or added",
    items: [
      ["/\u02c8evri/", "", "every", "evry", "a"],
      ["/\u02c8hevi/", "", "hevy", "heavy", "b"],
      ["/h\u025c\u02d0t/", "", "hourt", "hurt", "b"],
      ["/\u02c8l\u026asn/", "", "listen", "lisen", "a"],
      ["/\u02c8b\u026azn\u0259s/", "", "business", "busness", "a"],
      ["/\u02c8d\u026afr\u0259nt/", "", "different", "diffrent", "a"],
      ["/\u02c8t\u0283\u0252kl\u0259t/", "", "choclate", "chocolate", "b"],
      ["/\u02c8ved\u0292t\u0259bl/", "", "vegtable", "vegetable", "b"],
      ["/\u02c8\u026antr\u0259st\u026a\u014b/", "", "interesting", "intresting", "a"],
      ["/\u02c8restr\u0252nt/", "", "restaurant", "resturant", "a"],
      ["/\u02c8k\u028cmft\u0259bl/", "", "comftable", "comfortable", "b"],
      ["/\u02c8f\u00e6m\u0259li/", "", "family", "famly", "a"],
      ["/\u02c8sepr\u0259t/", "(adj.)", "seperate", "separate", "b"],
      ["/\u02c8tempr\u0259t\u0283\u0259(r)/", "", "temperture", "temperature", "b"],
      ["/\u02c8h\u026astri/", "", "history", "histry", "a"],
      ["/\u02c8k\u00e6mr\u0259/", "", "camera", "camra", "a"],
      ["/\u02c8d\u0292enr\u0259l/", "", "general", "genral", "a"],
      ["/\u02c8sevr\u0259l/", "", "sevral", "several", "b"],
      ["/\u02c8\u00e6v\u0259r\u026ad\u0292/", "", "avrage", "average", "b"],
      ["/\u02c8mem\u0259ri/", "", "memry", "memory", "b"],
    ],
  },
  {
    name: "Silent letters",
    items: [
      ["/\u02c8\u0252n\u026ast/", "", "onest", "honest", "b"],
      ["/\u0261\u0251\u02d0d/", "", "guard", "gard", "a"],
      ["/\u02c8\u0251\u02d0ns\u0259(r)/", "", "answer", "anser", "a"],
      ["/\u02c8k\u00e6l\u026and\u0259(r)/", "", "calender", "calendar", "b"],
      ["/h\u0251\u02d0f/", "", "half", "haf", "a"],
      ["/k\u028ad/", "", "could", "coud", "a"],
      ["/w\u028ad/", "", "woud", "would", "b"],
      ["/\u0283\u028ad/", "", "should", "shoud", "a"],
      ["/na\u026af/", "", "nife", "knife", "b"],
      ["/\u02c8a\u026al\u0259nd/", "", "iland", "island", "b"],
      ["/\u02c8\u0254\u02d0t\u0259m/", "", "autum", "autumn", "b"],
      ["/k\u0259n\u02c8dem/", "", "condemn", "condem", "a"],
      ["/\u02c8f\u0252r\u0259n/", "", "forein", "foreign", "b"],
      ["/\u0261\u0259\u028ast/", "", "gost", "ghost", "b"],
      ["/kla\u026am/", "", "clim", "climb", "b"],
      ["/\u03b8\u028cm/", "", "thumb", "thum", "a"],
      ["/k\u0259\u028am/", "", "coam", "comb", "b"],
      ["/r\u026ast/", "", "wrist", "rist", "a"],
      ["/s\u0254\u02d0d/", "", "sword", "sord", "a"],
      ["/\u02c8m\u028csl/", "", "muscle", "mussle", "a"],
    ],
  },
  {
    name: "Unexpected letter combinations",
    items: [
      ["/\u00f0\u0259\u028a/", "", "though", "tho", "a"],
      ["/\u026a\u02c8n\u028cf/", "", "enough", "enuff", "a"],
      ["/l\u0251\u02d0f/", "", "laff", "laugh", "b"],
      ["/\u03b8ru\u02d0/", "", "through", "thorugh", "a"],
      ["/\u03b8\u0254\u02d0t/", "", "thougt", "thought", "b"],
      ["/\u02c8d\u0254\u02d0t\u0259(r)/", "", "daughter", "dauter", "a"],
      ["/\u02c8ne\u026ab\u0259(r)/", "", "nieghbour", "neighbour", "b"],
      ["/ha\u026at/", "", "hieght", "height", "b"],
      ["/we\u026at/", "", "wieght", "weight", "b"],
      ["/stre\u026at/", "", "straight", "streight", "a"],
      ["/k\u0254\u02d0t/", "", "cought", "caught", "b"],
      ["/b\u0254\u02d0t/", "", "bought", "bougth", "a"],
      ["/k\u0252f/", "", "coff", "cough", "b"],
      ["/r\u028cf/", "", "rough", "ruf", "a"],
      ["/t\u028cf/", "", "tuf", "tough", "b"],
      ["/\u02c8\u03b8\u028cr\u0259/", "", "thourough", "thorough", "b"],
      ["/br\u0254\u02d0t/", "", "brought", "brougt", "a"],
      ["/f\u0254\u02d0t/", "", "fought", "faught", "a"],
      ["/e\u026at/", "", "eigth", "eight", "b"],
      ["/fre\u026at/", "", "freight", "frieght", "a"],
    ],
  },
  {
    name: "\u201cie / ei\u201d and doubled-letter confusions",
    items: [
      ["/b\u026a\u02c8li\u02d0v/", "", "believe", "beleive", "a"],
      ["/frend/", "", "friend", "freind", "a"],
      ["/r\u026a\u02c8si\u02d0v/", "", "receive", "recieve", "a"],
      ["/\u02c8pi\u02d0pl/", "", "peaple", "people", "b"],
      ["/\u02c8bju\u02d0t\u026afl/", "", "beutiful", "beautiful", "b"],
      ["/\u02c8nes\u0259s\u0259ri/", "", "necessary", "neccessary", "a"],
      ["/\u0259\u02c8k\u0252m\u0259de\u026at/", "", "accomodate", "accommodate", "b"],
      ["/\u026am\u02c8b\u00e6r\u0259s/", "", "embarass", "embarrass", "b"],
      ["/\u0259\u02c8ke\u026a\u0292n/", "", "occasion", "occassion", "a"],
      ["/\u02ccd\u026as\u0259\u02c8p\u026a\u0259(r)/", "", "dissapear", "disappear", "b"],
      ["/\u0259\u02c8k\u025c\u02d0d/", "", "occurred", "occured", "a"],
      ["/b\u026a\u02c8\u0261\u026an\u026a\u014b/", "", "begining", "beginning", "b"],
      ["/\u0259\u02c8t\u0283i\u02d0v/", "", "acheive", "achieve", "b"],
      ["/r\u026a\u02c8li\u02d0f/", "", "relief", "releif", "a"],
      ["/\u02c8si\u02d0l\u026a\u014b/", "", "cieling", "ceiling", "b"],
      ["/d\u026a\u02c8si\u02d0v/", "", "decieve", "deceive", "b"],
      ["/ni\u02d0s/", "", "neice", "niece", "b"],
      ["/\u03b8i\u02d0f/", "", "thief", "theif", "a"],
      ["/t\u0283i\u02d0f/", "", "chief", "cheif", "a"],
      ["/\u0261ri\u02d0f/", "", "grief", "greif", "a"],
    ],
  },
  {
    name: "Everyday words often misspelled by sound",
    items: [
      ["/sed/", "", "sed", "said", "b"],
      ["/d\u028cz/", "", "does", "duz", "a"],
      ["/b\u026a\u02c8k\u0252z/", "", "becuase", "because", "b"],
      ["/\u02c8def\u026an\u0259tli/", "", "definitely", "definately", "a"],
      ["/\u02c8pr\u0252b\u0259bli/", "", "probaly", "probably", "b"],
      ["/\u02c8\u00e6kt\u0283u\u0259li/", "", "actualy", "actually", "b"],
      ["/\u02c8ri\u02d0\u0259li/", "", "really", "realy", "a"],
      ["/\u02c8febru\u0259ri/", "", "February", "Febuary", "a"],
      ["/\u02c8wenzde\u026a/", "", "Wensday", "Wednesday", "b"],
      ["/\u02c8\u0261\u028cv\u0259nm\u0259nt/", "", "government", "goverment", "a"],
      ["/\u026am\u02c8p\u0254\u02d0tnt/", "", "important", "importent", "a"],
      ["/\u026a\u02c8spe\u0283\u0259li/", "", "especially", "expecially", "a"],
      ["/p\u0259\u02c8t\u026akj\u0259l\u0259li/", "", "particulary", "particularly", "b"],
      ["/\u02c8kwa\u026a\u0259t/", "", "quiet", "quiat", "a"],
      ["/kwa\u026at/", "", "quitte", "quite", "b"],
      ["/\u02c8we\u00f0\u0259(r)/", "", "wheter", "whether", "b"],
      ["/\u02c8we\u00f0\u0259(r)/", "", "wheather", "weather", "b"],
      ["/\u02c8brekf\u0259st/", "", "breakfast", "brekfast", "a"],
      ["/\u02c8m\u026an\u026at/", "(noun)", "minit", "minute", "b"],
      ["/\u03b8ru\u02d0/", "", "threw", "thrue", "a"],
    ],
  },
  {
    name: "British spelling patterns",
    items: [
      ["/\u02c8k\u028cl\u0259(r)/", "", "colour", "color", "a"],
      ["/\u02c8fe\u026av\u0259r\u026at/", "", "favorite", "favourite", "b"],
      ["/\u02c8hju\u02d0m\u0259(r)/", "", "humor", "humour", "b"],
      ["/\u02c8sent\u0259(r)/", "", "centre", "center", "a"],
      ["/\u02c8tr\u00e6v\u0259l\u026a\u014b/", "", "traveling", "travelling", "b"],
      ["/\u02c8\u0254\u02d0\u0261\u0259na\u026az/", "", "organise", "organize", "a"],
      ["/\u02c8r\u026a\u0259la\u026az/", "", "realize", "realise", "b"],
      ["/\u02c8\u0252n\u0259(r)/", "", "honor", "honour", "b"],
      ["/\u02c8le\u026ab\u0259(r)/", "", "labour", "labor", "a"],
      ["/\u02c8\u03b8\u026a\u0259t\u0259(r)/", "", "theatre", "theater", "a"],
      ["/\u02c8mi\u02d0t\u0259(r)/", "", "meter", "metre", "b"],
      ["/\u02c8pr\u0259\u028a\u0261r\u00e6m/", "", "programme", "program", "a"],
      ["/t\u0283ek/", "", "check", "cheque", "b"],
      ["/\u02c8d\u0292u\u02d0\u0259lri/", "", "jewellery", "jewelry", "a"],
      ["/\u02c8pr\u00e6kt\u026as/", "(verb)", "practice", "practise", "b"],
      ["/d\u026a\u02c8fens/", "", "defense", "defence", "b"],
      ["/\u02c8la\u026asns/", "(noun)", "licence", "license", "a"],
      ["/\u0259\u02c8fens/", "", "offense", "offence", "b"],
      ["/\u02c8\u00e6n\u0259la\u026az/", "", "analyse", "analyze", "a"],
      ["/\u0259\u02c8p\u0252l\u0259d\u0292a\u026az/", "", "apologise", "apologize", "a"],
    ],
  },
];

const questions: LessonQuestion[] = SECTIONS.flatMap((section) =>
  section.items.map(([pronunciation, note, a, b, answer]): LessonQuestion => ({
    prompt: pronunciation,
    // The correctly spelled word — kept server-side for the answer key and
    // revealed on the results screen as the one that was right.
    answer: answer === "a" ? a : b,
    hints: [],
    source: section.name,
    spellingOptions: { a, b },
    correctOption: answer,
    note: note || "",
  }))
);

/**
 * The word key used to track progress: the correctly spelled word. All 120
 * are unique, and the key stays valid even if the deck is re-ordered.
 */
export function spellingQuizWordKey(question: LessonQuestion | undefined): string {
  return (question?.answer || "").trim();
}

/** Number of words in the deck (120). */
export const SPELLING_QUIZ_TOTAL_WORDS = questions.length;

export const spellingQuizCard: LessonCardDef = {
  slug: "spelling-speed-quiz",
  title: "Spelling Quiz: Choose the Correct Spelling",
  description:
    "A 5-minute speed run: you get one pronunciation and two spellings that sound alike — tap the one spelled correctly for +1, a wrong tap costs -1 and resets that word. A word is learned after 3 correct runs in a row, and the card is mastered only when all 120 words are learned across many runs.",
  kind: "spelling_quiz",
  lesson: [
    { kind: "heading", text: "⏱️ How this 5-minute speed quiz works" },
    {
      kind: "text",
      text: "Every question gives you one word's pronunciation and two spellings that sound exactly the same. Only one of them is the real word — your job is to spot the correct spelling and tap it before the clock runs out.",
    },
    {
      kind: "bullets",
      items: [
        "⏱️ Each run lasts 5 minutes. The countdown shows exactly how long you have left.",
        "✅ Tap the correct spelling → +1 flashes green and the next word appears instantly.",
        "❌ Tap the wrong spelling → -1 flashes red and the next word appears instantly.",
        "🔀 The 120 words come in a fresh, shuffled order every run — you can't learn the positions.",
        "📊 When the clock stops you get a full report: words attempted, correct, wrong and your score.",
        "🎯 A word is LEARNED only after you spell it correctly 3 runs in a row. A wrong tap resets that word's streak to 0.",
        "🏁 No single run can clear all 120 words, so the card is complete only when every word has been learned. Your progress is saved between runs.",
      ],
    },
    { kind: "subheading", text: "The six sections you're being tested on" },
    { kind: "bullets", items: SECTIONS.map((s, i) => `${i + 1}. ${s.name} — 20 words`) },
    {
      kind: "review",
      title: "⚡ Speed tips — the whole point is to answer faster",
      items: [
        "Read both spellings in one single glance instead of letter by letter.",
        "Say the word in your head once; if a spelling matches that sound, tap it.",
        "Never stare — a wrong tap costs 1 point, but a slow tap costs you 3 more questions.",
        "You won't finish all 120 words: the goal is to reach as many as you possibly can.",
        "Accuracy still matters: a wrong tap wipes that word's streak, so a word you had at 2 goes back to 0.",
      ],
    },
  ],
  questions,
};

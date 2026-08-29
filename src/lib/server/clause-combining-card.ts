import type { LessonCardDef } from "./lesson-cards";

/**
 * Source: /sdcard/Download/Sentence_Combining.docx
 * "IELTS Grammar Practice: Sentence Combining with Subordinating Conjunctions"
 * 30 questions. Students type their combined sentence; grading is lenient-but-correct —
 * accepts the docx model answer or a genuinely equivalent rewrite (same key facts,
 * same conjunction, same clause order + comma rule, single sentence). Grading lives in
 * gradeCombineSeq() using each question's seqRubric. Answers must never reach the browser.
 */
export const clauseCombiningCard: LessonCardDef = {
  slug: "clause-combining-subordinating-conjunctions",
  title: "Sentence Combining with Subordinating Conjunctions",
  description:
    "Combine each pair of sentences into a single, correctly punctuated sentence using the specified subordinating conjunction. Type your answer — you can only move on once it's correct.",
  kind: "combine_seq",
  lesson: [
    {
      kind: "heading",
      text: "📝 Sentence Combining Lesson Note",
    },
    {
      kind: "text",
      text: "Combine each pair of sentences into a single sentence using the subordinating conjunction given. Follow the placement instruction and punctuate correctly. Type out the full combined sentence yourself — you'll only be able to move to the next item once your answer is correct.",
    },
    {
      kind: "heading",
      text: "🧭 The Rule That Never Changes",
    },
    {
      kind: "text",
      text: "A subordinating conjunction (because, although, while, since, whereas, if, unless, before, after, …) turns one clause into a dependent clause that can no longer stand alone. Every question tells you exactly which conjunction to use and which clause to attach it to.",
    },
    {
      kind: "subheading",
      text: "Pattern A — Dependent clause FIRST (start with the conjunction)",
    },
    {
      kind: "text",
      text: "When the instruction says “attach it to the FIRST sentence / start with the conjunction”, open the sentence with the conjunction, then put a comma after the dependent clause before the main clause.",
    },
    {
      kind: "examples",
      title: "Example",
      items: [
        "Because global demand for lithium increased, battery prices rose sharply.",
        "Although the report was well researched, it failed to convince the board.",
      ],
    },
    {
      kind: "subheading",
      text: "Pattern B — Main clause FIRST (keep the first sentence as your main clause)",
    },
    {
      kind: "text",
      text: "When the instruction says “attach it to the SECOND sentence / keep the first sentence as your main clause”, start with the first sentence (main idea) and place the conjunction + dependent clause afterwards — no comma is needed there.",
    },
    {
      kind: "examples",
      title: "Example",
      items: [
        "The conference was postponed because the keynote speaker fell ill.",
        "The bridge remains open to traffic, although engineers have raised safety concerns.",
      ],
    },
    {
      kind: "heading",
      text: "✅ What “correct” means here",
    },
    {
      kind: "bullets",
      items: [
        "Keep ALL the key information from both sentences — never delete facts to combine.",
        "Use exactly the subordinating conjunction the question asks for.",
        "Put the clauses in the order the instruction tells you (which one leads).",
        "Follow the comma rule (comma after a leading dependent clause).",
        "Write ONE complete, properly punctuated sentence.",
      ],
    },
    {
      kind: "review",
      title: "Checklist before you submit",        items: [
          "Did I keep every key fact?",
          "Did I use the required conjunction?",
        "Did I put the clauses in the instructed order?",
        "Is the comma in the right place?",
        "Is it one clean sentence?",
      ],
    },
    {
      kind: "heading",
      text: "🚀 Ready to Practice?",
    },
    {
      kind: "text",
      text: "Type your combined sentence for each pair. If it's not quite right you'll get a hint and can try again — you can't move forward until you get it correct.",
    },
  ],
  questions: [
    {
      prompt: "Global demand for lithium increased.\nBattery prices rose sharply.\nCombine using \"because\", attaching it to the FIRST sentence (start your combined sentence with \"because\").",
      answer: "Because global demand for lithium increased, battery prices rose sharply.",
      hints: [],
      source: "Question 1 · because",
      seqRubric: { conjunction: "because", lead: true, requiredTokens: ["lithium", "battery", "rose"] },
    },
    {
      prompt: "The conference was postponed.\nThe keynote speaker fell ill.\nCombine using \"because\", attaching it to the SECOND sentence (keep the first sentence as your main clause).",
      answer: "The conference was postponed because the keynote speaker fell ill.",
      hints: [],
      source: "Question 2 · because",
      seqRubric: { conjunction: "because", lead: false, requiredTokens: ["conference", "postponed", "keynote"] },
    },
    {
      prompt: "The report was well researched.\nIt failed to convince the board.\nCombine using \"although\", attaching it to the FIRST sentence (start your combined sentence with \"although\").",
      answer: "Although the report was well researched, it failed to convince the board.",
      hints: [],
      source: "Question 3 · although",
      seqRubric: { conjunction: "although", lead: true, requiredTokens: ["report", "researched", "failed", "board"] },
    },
    {
      prompt: "The bridge remains open to traffic.\nEngineers have raised safety concerns.\nCombine using \"although\", attaching it to the SECOND sentence (keep the first sentence as your main clause).",
      answer: "The bridge remains open to traffic, although engineers have raised safety concerns.",
      hints: [],
      source: "Question 4 · although",
      seqRubric: { conjunction: "although", lead: false, requiredTokens: ["bridge", "open", "engineers", "safety"] },
    },
    {
      prompt: "Urban schools have modern facilities.\nRural schools often lack basic resources.\nCombine using \"while\", attaching it to the FIRST sentence (start your combined sentence with \"while\").",
      answer: "While urban schools have modern facilities, rural schools often lack basic resources.",
      hints: [],
      source: "Question 5 · while",
      seqRubric: { conjunction: "while", lead: true, requiredTokens: ["urban", "facilities", "rural", "resources"] },
    },
    {
      prompt: "The manager reviewed the budget.\nThe team prepared the presentation.\nCombine using \"while\", attaching it to the SECOND sentence (keep the first sentence as your main clause).",
      answer: "The manager reviewed the budget while the team prepared the presentation.",
      hints: [],
      source: "Question 6 · while",
      seqRubric: { conjunction: "while", lead: false, requiredTokens: ["manager", "budget", "team", "presentation"] },
    },
    {
      prompt: "Fuel prices dropped.\nAirlines have lowered ticket costs.\nCombine using \"since\", attaching it to the FIRST sentence (start your combined sentence with \"since\").",
      answer: "Since fuel prices dropped, airlines have lowered ticket costs.",
      hints: [],
      source: "Question 7 · since",
      seqRubric: { conjunction: "since", lead: true, requiredTokens: ["fuel", "prices", "airlines", "ticket"] },
    },
    {
      prompt: "The population has doubled.\nThe dam was built.\nCombine using \"since\", attaching it to the SECOND sentence (keep the first sentence as your main clause).",
      answer: "The population has doubled since the dam was built.",
      hints: [],
      source: "Question 8 · since",
      seqRubric: { conjunction: "since", lead: false, requiredTokens: ["population", "doubled", "dam"] },
    },
    {
      prompt: "The coastal region enjoys a mild climate.\nThe interior experiences extreme temperatures.\nCombine using \"whereas\", attaching it to the FIRST sentence (start your combined sentence with \"whereas\").",
      answer: "Whereas the coastal region enjoys a mild climate, the interior experiences extreme temperatures.",
      hints: [],
      source: "Question 9 · whereas",
      seqRubric: { conjunction: "whereas", lead: true, requiredTokens: ["coastal", "mild", "interior", "temperatures"] },
    },
    {
      prompt: "The first design prioritized speed.\nThe second focused on safety.\nCombine using \"whereas\", attaching it to the SECOND sentence (keep the first sentence as your main clause).",
      answer: "The first design prioritized speed, whereas the second focused on safety.",
      hints: [],
      source: "Question 10 · whereas",
      seqRubric: { conjunction: "whereas", lead: false, requiredTokens: ["design", "speed", "second", "safety"] },
    },
    {
      prompt: "The medicine is effective.\nIt causes mild side effects.\nCombine using \"though\", attaching it to the FIRST sentence (start your combined sentence with \"though\").",
      answer: "Though the medicine is effective, it causes mild side effects.",
      hints: [],
      source: "Question 11 · though",
      seqRubric: { conjunction: "though", lead: true, requiredTokens: ["medicine", "effective", "side effects"] },
    },
    {
      prompt: "The negotiations lasted for months.\nNo agreement was reached.\nCombine using \"even though\", attaching it to the FIRST sentence (start your combined sentence with \"even though\").",
      answer: "Even though the negotiations lasted for months, no agreement was reached.",
      hints: [],
      source: "Question 12 · even though",
      seqRubric: { conjunction: "even though", lead: true, requiredTokens: ["negotiations", "months", "agreement"] },
    },
    {
      prompt: "The committee approves the budget.\nThe project cannot proceed.\nCombine using \"unless\", attaching it to the FIRST sentence (start your combined sentence with \"unless\").",
      answer: "Unless the committee approves the budget, the project cannot proceed.",
      hints: [],
      source: "Question 13 · unless",
      seqRubric: { conjunction: "unless", lead: true, requiredTokens: ["committee", "budget", "project", "proceed"] },
    },
    {
      prompt: "The store will close permanently.\nSales improve soon.\nCombine using \"unless\", attaching it to the SECOND sentence (keep the first sentence as your main clause).",
      answer: "The store will close permanently unless sales improve soon.",
      hints: [],
      source: "Question 14 · unless",
      seqRubric: { conjunction: "unless", lead: false, requiredTokens: ["store", "close", "sales"] },
    },
    {
      prompt: "The tenant pays the deposit on time.\nThe lease will be renewed.\nCombine using \"provided that\", attaching it to the FIRST sentence (start your combined sentence with \"provided that\").",
      answer: "Provided that the tenant pays the deposit on time, the lease will be renewed.",
      hints: [],
      source: "Question 15 · provided that",
      seqRubric: { conjunction: "provided that", lead: true, requiredTokens: ["tenant", "deposit", "lease", "renewed"] },
    },
    {
      prompt: "Students may retake the exam.\nThey attend all review sessions.\nCombine using \"provided that\", attaching it to the SECOND sentence (keep the first sentence as your main clause).",
      answer: "Students may retake the exam provided that they attend all review sessions.",
      hints: [],
      source: "Question 16 · provided that",
      seqRubric: { conjunction: "provided that", lead: false, requiredTokens: ["retake", "exam", "attend", "review"] },
    },
    {
      prompt: "The machine is regularly maintained.\nIt will operate efficiently.\nCombine using \"as long as\", attaching it to the FIRST sentence (start your combined sentence with \"as long as\").",
      answer: "As long as the machine is regularly maintained, it will operate efficiently.",
      hints: [],
      source: "Question 17 · as long as",
      seqRubric: { conjunction: "as long as", lead: true, requiredTokens: ["machine", "maintained", "efficiently"] },
    },
    {
      prompt: "The warranty remains valid.\nThe receipt is kept.\nCombine using \"as long as\", attaching it to the SECOND sentence (keep the first sentence as your main clause).",
      answer: "The warranty remains valid as long as the receipt is kept.",
      hints: [],
      source: "Question 18 · as long as",
      seqRubric: { conjunction: "as long as", lead: false, requiredTokens: ["warranty", "valid", "receipt"] },
    },
    {
      prompt: "The plane departs.\nPassengers must complete security checks.\nCombine using \"before\", attaching it to the FIRST sentence (start your combined sentence with \"before\").",
      answer: "Before the plane departs, passengers must complete security checks.",
      hints: [],
      source: "Question 19 · before",
      seqRubric: { conjunction: "before", lead: true, requiredTokens: ["plane", "departs", "passengers", "security"] },
    },
    {
      prompt: "Researchers tested the vaccine on animals.\nIt was approved for human trials.\nCombine using \"before\", attaching it to the SECOND sentence (keep the first sentence as your main clause).",
      answer: "Researchers tested the vaccine on animals before it was approved for human trials.",
      hints: [],
      source: "Question 20 · before",
      seqRubric: { conjunction: "before", lead: false, requiredTokens: ["researchers", "vaccine", "animals", "human"] },
    },
    {
      prompt: "The storm passed.\nCrews began repairing power lines.\nCombine using \"after\", attaching it to the FIRST sentence (start your combined sentence with \"after\").",
      answer: "After the storm passed, crews began repairing power lines.",
      hints: [],
      source: "Question 21 · after",
      seqRubric: { conjunction: "after", lead: true, requiredTokens: ["storm", "crews", "power lines"] },
    },
    {
      prompt: "The company relocated its headquarters.\nProfits declined for two years.\nCombine using \"after\", attaching it to the SECOND sentence (keep the first sentence as your main clause).",
      answer: "The company relocated its headquarters after profits declined for two years.",
      hints: [],
      source: "Question 22 · after",
      seqRubric: { conjunction: "after", lead: false, requiredTokens: ["company", "headquarters", "profits", "declined"] },
    },
    {
      prompt: "The teacher repeated the instructions.\nEvery student could understand them.\nCombine using \"so that\", attaching it to the SECOND sentence (keep the first sentence as your main clause).",
      answer: "The teacher repeated the instructions so that every student could understand them.",
      hints: [],
      source: "Question 23 · so that",
      seqRubric: { conjunction: "so that", lead: false, requiredTokens: ["teacher", "instructions", "student", "understand"] },
    },
    {
      prompt: "Temperatures continue to rise.\nGlaciers will melt faster.\nCombine using \"if\", attaching it to the FIRST sentence (start your combined sentence with \"if\").",
      answer: "If temperatures continue to rise, glaciers will melt faster.",
      hints: [],
      source: "Question 24 · if",
      seqRubric: { conjunction: "if", lead: true, requiredTokens: ["temperatures", "rise", "glaciers", "melt"] },
    },
    {
      prompt: "The flight will be delayed.\nThe storm intensifies.\nCombine using \"if\", attaching it to the SECOND sentence (keep the first sentence as your main clause).",
      answer: "The flight will be delayed if the storm intensifies.",
      hints: [],
      source: "Question 25 · if",
      seqRubric: { conjunction: "if", lead: false, requiredTokens: ["flight", "delayed", "storm", "intensifies"] },
    },
    {
      prompt: "She double-checked every calculation.\nShe make a costly error.\nCombine using \"lest\", attaching it to the SECOND sentence (keep the first sentence as your main clause).",
      answer: "She double-checked every calculation lest she make a costly error.",
      hints: [],
      source: "Question 26 · lest",
      seqRubric: { conjunction: "lest", lead: false, requiredTokens: ["double-checked", "calculation", "costly error"] },
    },
    {
      prompt: "The merger is approved.\nThousands of jobs could be created.\nCombine using \"supposing that\", attaching it to the FIRST sentence (start your combined sentence with \"supposing that\").",
      answer: "Supposing that the merger is approved, thousands of jobs could be created.",
      hints: [],
      source: "Question 27 · supposing that",
      seqRubric: { conjunction: "supposing that", lead: true, requiredTokens: ["merger", "approved", "jobs", "created"] },
    },
    {
      prompt: "The results are inconclusive.\nThe study still offers valuable insights.\nCombine using \"even if\", attaching it to the FIRST sentence (start your combined sentence with \"even if\").",
      answer: "Even if the results are inconclusive, the study still offers valuable insights.",
      hints: [],
      source: "Question 28 · even if",
      seqRubric: { conjunction: "even if", lead: true, requiredTokens: ["results", "inconclusive", "study", "insights"] },
    },
    {
      prompt: "The company will proceed with the launch.\nEarly reviews are mixed.\nCombine using \"even if\", attaching it to the SECOND sentence (keep the first sentence as your main clause).",
      answer: "The company will proceed with the launch even if early reviews are mixed.",
      hints: [],
      source: "Question 29 · even if",
      seqRubric: { conjunction: "even if", lead: false, requiredTokens: ["company", "launch", "reviews", "mixed"] },
    },
    {
      prompt: "The contract is finalized.\nConstruction can begin.\nCombine using \"once\", attaching it to the FIRST sentence (start your combined sentence with \"once\").",
      answer: "Once the contract is finalized, construction can begin.",
      hints: [],
      source: "Question 30 · once",
      seqRubric: { conjunction: "once", lead: true, requiredTokens: ["contract", "finalized", "construction"] },
    },
  ],
};
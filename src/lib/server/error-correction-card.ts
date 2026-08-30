/**
 * Error Correction card for Subordinating Conjunctions.
 * Students see an incorrect sentence and must rewrite it correctly.
 * No hints — just banter on wrong answers.
 */
import type { LessonCardDef } from "./lesson-cards";

export const errorCorrectionCard: LessonCardDef = {
  slug: "subconj-error-correction",
  title: "Subordinating Conjunction Error Correction",
  description:
    "Each sentence below has one planted error — a missing comma, a double conjunction, or a wrong conjunction. Rewrite the sentence correctly. No hints, just teacher banter if you get it wrong! 😏",
  kind: "error_correction",
  lesson: [
    {
      kind: "heading",
      text: "Error Types You'll Encounter",
    },
    {
      kind: "bullets",
      items: [
        "Missing Comma — when a subordinate clause comes before the main clause, put a comma after it.",
        "Double Conjunction — never use two conjunctions like \"Although...but\" or \"Because...so\" — pick one.",
        "Wrong Conjunction — make sure the conjunction matches the logic (cause, contrast, condition, time, purpose).",
      ],
    },
    {
      kind: "review",
      title: "Quick Rules",
      items: [
        "Fronted subordinate clause → comma after it: \"Although X, Y happened.\"",
        "\"Although\" alone signals contrast — don't add \"but\" or \"yet\".",
        "\"Because\" alone signals cause — don't add \"so\".",
        "\"While\" alone signals contrast or simultaneity — don't add \"but\" or \"yet\".",
        "Think about the LOGIC: is it cause? contrast? condition? time? purpose?",
      ],
    },
  ],
  questions: [
    // ═══════════════════════════════════════════════════
    // QUESTIONS 1–10: Missing Comma
    // ═══════════════════════════════════════════════════
    {
      prompt: "Although the budget was tight the team completed the project on time.",
      answer: "Although the budget was tight, the team completed the project on time.",
      hints: [],
      source: "Missing Comma (Q1–10)",
    },
    {
      prompt: "Because the airport expanded flight delays have decreased this year.",
      answer: "Because the airport expanded, flight delays have decreased this year.",
      hints: [],
      source: "Missing Comma (Q1–10)",
    },
    {
      prompt: "Since the treaty was signed trade between the two nations has flourished.",
      answer: "Since the treaty was signed, trade between the two nations has flourished.",
      hints: [],
      source: "Missing Comma (Q1–10)",
    },
    {
      prompt: "While the market remains volatile many investors continue to buy shares.",
      answer: "While the market remains volatile, many investors continue to buy shares.",
      hints: [],
      source: "Missing Comma (Q1–10)",
    },
    {
      prompt: "Whereas the northern factory relies on solar power the southern plant still burns coal.",
      answer: "Whereas the northern factory relies on solar power, the southern plant still burns coal.",
      hints: [],
      source: "Missing Comma (Q1–10)",
    },
    {
      prompt: "Unless the funding is approved the research project will be cancelled.",
      answer: "Unless the funding is approved, the research project will be cancelled.",
      hints: [],
      source: "Missing Comma (Q1–10)",
    },
    {
      prompt: "Before the bridge was repaired traffic was diverted through the old town.",
      answer: "Before the bridge was repaired, traffic was diverted through the old town.",
      hints: [],
      source: "Missing Comma (Q1–10)",
    },
    {
      prompt: "Once the contract is finalized construction can begin immediately.",
      answer: "Once the contract is finalized, construction can begin immediately.",
      hints: [],
      source: "Missing Comma (Q1–10)",
    },
    {
      prompt: "Provided that the tenant pays on time the landlord will renew the lease.",
      answer: "Provided that the tenant pays on time, the landlord will renew the lease.",
      hints: [],
      source: "Missing Comma (Q1–10)",
    },
    {
      prompt: "Even though the results were disappointing the team refused to give up.",
      answer: "Even though the results were disappointing, the team refused to give up.",
      hints: [],
      source: "Missing Comma (Q1–10)",
    },

    // ═══════════════════════════════════════════════════
    // QUESTIONS 11–20: Double Conjunction
    // ═══════════════════════════════════════════════════
    {
      prompt: "Although the exam was difficult, but most students passed.",
      answer: "Although the exam was difficult, most students passed.",
      hints: [],
      source: "Double Conjunction (Q11–20)",
    },
    {
      prompt: "Because the factory closed down, so hundreds of workers lost their jobs.",
      answer: "Because the factory closed down, hundreds of workers lost their jobs.",
      hints: [],
      source: "Double Conjunction (Q11–20)",
    },
    {
      prompt: "While the software is expensive, yet it saves companies hours of labor.",
      answer: "While the software is expensive, it saves companies hours of labor.",
      hints: [],
      source: "Double Conjunction (Q11–20)",
    },
    {
      prompt: "Though the team trained extensively, but they failed to win the tournament.",
      answer: "Though the team trained extensively, they failed to win the tournament.",
      hints: [],
      source: "Double Conjunction (Q11–20)",
    },
    {
      prompt: "Since the fees were raised, so student enrollment has declined.",
      answer: "Since the fees were raised, student enrollment has declined.",
      hints: [],
      source: "Double Conjunction (Q11–20)",
    },
    {
      prompt: "Although global warming is a severe threat, yet many nations ignore the data.",
      answer: "Although global warming is a severe threat, many nations ignore the data.",
      hints: [],
      source: "Double Conjunction (Q11–20)",
    },
    {
      prompt: "Because the algorithm was flawed, so the results were inaccurate.",
      answer: "Because the algorithm was flawed, the results were inaccurate.",
      hints: [],
      source: "Double Conjunction (Q11–20)",
    },
    {
      prompt: "While crime rates dropped in the city, but rural areas saw an increase.",
      answer: "While crime rates dropped in the city, rural areas saw an increase.",
      hints: [],
      source: "Double Conjunction (Q11–20)",
    },
    {
      prompt: "Though the movie received poor reviews, but it grossed millions worldwide.",
      answer: "Though the movie received poor reviews, it grossed millions worldwide.",
      hints: [],
      source: "Double Conjunction (Q11–20)",
    },
    {
      prompt: "Since the application process is complex, so fewer students are applying.",
      answer: "Since the application process is complex, fewer students are applying.",
      hints: [],
      source: "Double Conjunction (Q11–20)",
    },

    // ═══════════════════════════════════════════════════
    // QUESTIONS 21–30: Wrong Conjunction for the Logic
    // ═══════════════════════════════════════════════════
    {
      prompt: "Because the report was flawed, it still influenced policy.",
      answer: "Although the report was flawed, it still influenced policy.",
      hints: [],
      source: "Wrong Conjunction (Q21–30)",
    },
    {
      prompt: "The flight will be cancelled if the fog clears by noon.",
      answer: "The flight will be cancelled unless the fog clears by noon.",
      hints: [],
      source: "Wrong Conjunction (Q21–30)",
    },
    {
      prompt: "The technicians tested the software thoroughly after it was released to the public.",
      answer: "The technicians tested the software thoroughly before it was released to the public.",
      hints: [],
      source: "Wrong Conjunction (Q21–30)",
    },
    {
      prompt: "The engineers reinforced the foundation though the building could withstand earthquakes.",
      answer: "The engineers reinforced the foundation so that the building could withstand earthquakes.",
      hints: [],
      source: "Wrong Conjunction (Q21–30)",
    },
    {
      prompt: "Even if the treatment is expensive, many patients choose it for its effectiveness.",
      answer: "Even though the treatment is expensive, many patients choose it for its effectiveness.",
      hints: [],
      source: "Wrong Conjunction (Q21–30)",
    },
    {
      prompt: "While the company was founded in 1998, it has expanded into twelve countries.",
      answer: "Since the company was founded in 1998, it has expanded into twelve countries.",
      hints: [],
      source: "Wrong Conjunction (Q21–30)",
    },
    {
      prompt: "Employees may work remotely unless they meet their weekly targets.",
      answer: "Employees may work remotely provided that they meet their weekly targets.",
      hints: [],
      source: "Wrong Conjunction (Q21–30)",
    },
    {
      prompt: "The contract remains valid as long as either party formally terminates it.",
      answer: "The contract remains valid unless either party formally terminates it.",
      hints: [],
      source: "Wrong Conjunction (Q21–30)",
    },
    {
      prompt: "The startup secured funding quickly because its business plan was unconventional.",
      answer: "The startup secured funding quickly though its business plan was unconventional.",
      hints: [],
      source: "Wrong Conjunction (Q21–30)",
    },
    {
      prompt: "Double-check the wiring unless you cause a short circuit.",
      answer: "Double-check the wiring lest you cause a short circuit.",
      hints: [],
      source: "Wrong Conjunction (Q21–30)",
    },
  ],
};

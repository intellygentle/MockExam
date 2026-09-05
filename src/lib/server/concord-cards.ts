/**
 * Concord (Subject–Verb Agreement) True/False lesson cards.
 *
 * Source: /sdcard/Download/Concord_Rules_and_WAEC_Questions.md
 *
 * Two cards, both of kind "true_false" (chip selection — judge each
 * statement True or False):
 *   - concord-true-false-sentences — is the sentence grammatically correct?
 *   - concord-true-false-rules     — is the statement about the laws correct?
 *
 * The answers live ONLY in this server module and are checked on submit.
 */
import type { LessonBlock } from "./capitalization-cards";
import type { LessonCardDef, LessonQuestion } from "./lesson-cards";

/** Build a single true/false practice item. */
function tf(prompt: string, correct: boolean, hint: string): LessonQuestion {
  return {
    prompt,
    answer: correct ? "True" : "False",
    hints: [hint],
    source: "Practice Statements",
  };
}

/** Lesson note summarising the 10 laws of concord (shared by both cards). */
function concordLesson(readyText: string): LessonBlock[] {
  return [
    {
      kind: "heading",
      text: "📝 The 10 Laws of Concord — Lesson Note",
    },
    {
      kind: "text",
      text: "Concord (subject–verb agreement) is a favourite WAEC topic: the verb must always agree with its subject in number (singular or plural). Before every practice statement, find the REAL subject of the sentence — then ask: is it singular or plural? The ten laws below tell you how to answer that question.",
    },
    {
      kind: "subheading",
      text: "🔤 Verb Quick Reference",
    },
    {
      kind: "bullets",
      items: [
        "Singular helping verbs: is, was, has, had",
        "Plural helping verbs: are, were, am, have",
        "Singular principal verbs (they carry an -s): goes, takes, speaks, writes",
        "Plural principal verbs (no -s): go, take, speak, write",
      ],
    },
    {
      kind: "subheading",
      text: "Law 1 — Number Agreement",
    },
    {
      kind: "bullets",
      items: [
        "A singular subject takes a singular verb: The teacher beats (not beat).",
        "A plural subject takes a plural verb: Teachers beat (not beats).",
      ],
    },
    {
      kind: "subheading",
      text: "Law 2 — Indefinite Pronouns",
    },
    {
      kind: "bullets",
      items: [
        "These pronouns are ALWAYS singular when they act as the subject: everybody, everyone, everything, somebody, someone, something, nobody, no one, nothing, anybody, anyone, anything (and everywhere, somewhere, nowhere, anywhere).",
        "Examples: Everyone has a name (not have). Nobody knows the answer (not know).",
      ],
    },
    {
      kind: "subheading",
      text: "Law 3 — Additional-Information Agreement",
    },
    {
      kind: "bullets",
      items: [
        "Information set off in brackets or between dashes is NOT the subject — ignore it and agree the verb with the REAL (main) subject.",
        "Examples: The man (not his children) is here. The teachers (not the principal) are here.",
      ],
    },
    {
      kind: "subheading",
      text: "Law 4 — Agreement with EACH",
    },
    {
      kind: "bullets",
      items: [
        "Each + singular noun takes a singular verb: Each boy knows the man (not boys… know).",
        "Extended use — 'each… and each…' is still singular: Each boy and each girl was given a gift.",
      ],
    },
    {
      kind: "subheading",
      text: "Law 5 — Agreement with EVERY",
    },
    {
      kind: "bullets",
      items: [
        "Every + singular noun takes a singular verb: Every day looks fine (not every days look).",
      ],
    },
    {
      kind: "subheading",
      text: "Law 6 — EVERY with a Figure",
    },
    {
      kind: "bullets",
      items: [
        "When a figure/number comes between 'every' and the noun, the NUMBER decides the verb — Law 5 no longer applies automatically.",
        "Example: Every ten boys that come here (plural 'come', not 'comes', because 'ten' is plural).",
      ],
    },
    {
      kind: "subheading",
      text: "Law 7 — BODMAS Agreement",
    },
    {
      kind: "bullets",
      items: [
        "In mathematical sentences (Bracket, Of, Division, Multiplication, Addition, Subtraction), BOTH singular and plural verbs are acceptable.",
        "Examples: Ten multiplied by ten is/are one hundred. Nine minus five is/are four.",
      ],
    },
    {
      kind: "subheading",
      text: "Law 8 — Agreement of Quantity",
    },
    {
      kind: "bullets",
      items: [
        "Expressions of frequency, percentage, length, money or weight are treated as ONE unit and take a singular verb — even when they look plural.",
        "Examples: Sixty kilogrammes is too heavy (not are). Five hundred naira is not enough. 85% makes a good grade.",
      ],
    },
    {
      kind: "subheading",
      text: "Law 9 — Selection Agreement",
    },
    {
      kind: "bullets",
      items: [
        "When a number is selected from a larger plural group, the SELECTED number decides the verb — not the larger group. The noun after 'of' stays plural, but the verb agrees with the number selected.",
        "Examples: One of my teachers knows me (singular → knows). Two of my teachers know me (plural → know).",
      ],
    },
    {
      kind: "subheading",
      text: "Law 10 — Agreement with EITHER… OR",
    },
    {
      kind: "bullets",
      items: [
        "When 'either…or' joins a singular and a plural item, the verb agrees with whichever noun is CLOSER to it (the one immediately before the verb — usually right after 'or').",
        "Example: Either the principal or the teachers pray every day (verb agrees with 'teachers').",
      ],
    },
    {
      kind: "review",
      title: "The ten laws at a glance:",
      items: [
        "1. Number agreement — match the subject's number.",
        "2. Indefinite pronouns (everybody, nobody…) are singular.",
        "3. Bracketed/dashed info is extra — use the real subject.",
        "4. Each → singular. 5. Every → singular.",
        "6. Every + figure → the figure decides.",
        "7. BODMAS → singular or plural are both fine.",
        "8. Quantity (money, weight, %) → singular.",
        "9. Selection (one of / two of…) → the number selected decides.",
        "10. Either…or → agree with the noun nearer the verb.",
      ],
    },
    {
      kind: "heading",
      text: "🚀 Ready to Practice?",
    },
    {
      kind: "text",
      text: readyText,
    },
  ];
}

/**
 * Card 1 — Section 2 of the source file:
 * judge whether each SENTENCE obeys the laws of concord.
 */
export const concordTrueFalseSentencesCard: LessonCardDef = {
  slug: "concord-true-false-sentences",
  title: "Concord: True or False Sentences",
  description:
    "Decide whether each sentence obeys the laws of concord: True if it is grammatically correct, False if it breaks a rule. All 30 statements must be right to perfect the lesson — you'll get a hint for anything you miss, and you can try again!",
  kind: "true_false",
  lesson: concordLesson(
    "Read each sentence on the right and judge it: True = the sentence is grammatically correct, False = it breaks a law of concord. All 30 must be right to perfect the lesson — you'll get a hint for anything you miss, and you can try again!"
  ),
  questions: [
    tf("Everybody know the answer.", false, "Law 2 — indefinite pronouns like 'everybody' take a singular verb, so it should be 'Everybody knows the answer.'"),
    tf("The teachers, not the principal, are on strike.", true, "Law 3 — 'not the principal' is extra information; the real subject 'the teachers' is plural, so 'are' is correct."),
    tf("Each student has a locker.", true, "Law 4 — 'Each' + singular noun takes a singular verb, so 'has' is correct."),
    tf("Every book on the shelf are dusty.", false, "Law 5 — 'Every' takes a singular verb: 'Every book on the shelf is dusty.'"),
    tf("Ten minus three is seven.", true, "Law 7 — BODMAS sentences accept a singular OR plural verb, so 'is' is acceptable."),
    tf("Sixty kilogrammes are too heavy for the boy to lift.", false, "Law 8 — quantity/weight is treated as a single unit: 'Sixty kilogrammes is too heavy…'"),
    tf("One of my sisters live in Lagos.", false, "Law 9 — 'one' is the number selected, so the verb is singular: 'One of my sisters lives in Lagos.'"),
    tf("Two of the players is injured.", false, "Law 9 — 'two' is the number selected, so the verb is plural: 'Two of the players are injured.'"),
    tf("Either the boys or their father is at fault.", true, "Law 10 — the verb agrees with the closer noun 'their father' (singular), so 'is' is correct."),
    tf("Either the manager or the workers is on strike.", false, "Law 10 — the verb should agree with the closer noun 'the workers' (plural): '…or the workers are on strike.'"),
    tf("Every ten pupils that comes here get a prize.", false, "Law 6 — the figure 'ten' between 'every' and the noun makes the verb plural: '…pupils that come here get a prize.'"),
    tf("Nobody know where the keys are.", false, "Law 2 — 'nobody' is an indefinite pronoun and takes a singular verb: 'Nobody knows where the keys are.'"),
    tf("The men in the field is playing football.", false, "Law 1b — 'The men' is a plural subject: 'The men in the field are playing football.'"),
    tf("The captain (not the players) is to blame.", true, "Law 3 — the bracketed 'not the players' is extra info; the real subject 'the captain' is singular, so 'is' is correct."),
    tf("Anybody who tries hard succeeds.", true, "Law 2 — 'anybody' is an indefinite pronoun and correctly takes the singular verb 'succeeds'."),
    tf("Ninety percent of the workers has resigned.", false, "A percentage of a plural countable noun ('workers') takes the plural verb: 'Ninety percent of the workers have resigned.'"),
    tf("Each boy and each girl was given a gift.", true, "Law 4 (extended) — 'each… and each…' still takes a singular verb, so 'was' is correct."),
    tf("Every ten boys that come here register.", true, "Law 6 — the figure 'ten' between 'every' and the noun makes the verb plural, so 'come' and 'register' are correct."),
    tf("Nine multiplied by nine is/are eighty-one.", true, "Law 7 — BODMAS sentences accept either a singular or plural verb, so 'is/are' is acceptable."),
    tf("Five hundred naira are enough to buy the book.", false, "Law 8 — a sum of money is singular: 'Five hundred naira is enough to buy the book.'"),
    tf("Somebody have taken my pen.", false, "Law 2 — 'somebody' takes a singular verb: 'Somebody has taken my pen.'"),
    tf("The students (not the teacher) are noisy.", true, "Law 3 — the bracketed 'not the teacher' is extra info; the real subject 'the students' is plural, so 'are' is correct."),
    tf("Neither of the answers were correct.", false, "Law 9 logic — 'neither' behaves like a singular selection: 'Neither of the answers was correct.'"),
    tf("Everywhere in the town look quiet at night.", false, "Law 2 — 'everywhere' is an indefinite pronoun and takes a singular verb: 'Everywhere in the town looks quiet at night.'"),
    tf("One of the cars is parked outside.", true, "Law 9 — 'one' is selected from the group, so the singular verb 'is' is correct."),
    tf("Twenty percent of the mangoes were rotten.", true, "A percentage of a plural countable noun ('mangoes') takes the plural verb, so 'were' is correct."),
    tf("Either my parents or my brother are picking me up.", false, "Law 10 — the verb agrees with the closer noun 'my brother' (singular): '…or my brother is picking me up.'"),
    tf("Nothing about the plans have changed.", false, "Law 2 — 'nothing' takes a singular verb: 'Nothing about the plans has changed.'"),
    tf("Each of the players know the rules.", false, "Law 4 — 'Each' takes a singular verb: 'Each of the players knows the rules.'"),
    tf("The chairman, along with the board members, is arriving today.", true, "Law 3 — 'along with the board members' is extra info; the real subject 'the chairman' is singular, so 'is' is correct."),
  ],
};

/**
 * Card 2 — Section 3 of the source file:
 * judge whether each statement ABOUT the laws of concord is true or false.
 */
export const concordTrueFalseRulesCard: LessonCardDef = {
  slug: "concord-true-false-rules",
  title: "Concord: True or False Rules",
  description:
    "Each statement below is about the Laws of Concord themselves. Decide whether the rule is stated correctly — True if it is right, False if it is wrong. All 30 statements must be right to perfect the lesson — you'll get a hint for anything you miss, and you can try again!",
  kind: "true_false",
  lesson: concordLesson(
    "Read each statement on the right — it claims something about the laws of concord. Decide whether the claim is TRUE or FALSE. All 30 must be right to perfect the lesson — you'll get a hint for anything you miss, and you can try again!"
  ),
  questions: [
    tf("A singular subject agrees with a singular verb.", true, "Law 1a — Number Agreement: singular subject → singular verb."),
    tf("A plural subject agrees with a singular verb.", false, "Law 1b — a plural subject agrees with a PLURAL verb, not a singular one."),
    tf("'The men' is a plural subject and should therefore take a plural verb.", true, "Law 1b — Number Agreement: plural subject → plural verb."),
    tf("Indefinite pronouns such as 'everybody' and 'everyone' always take a plural verb.", false, "Law 2 — indefinite pronouns take a SINGULAR verb, not a plural one."),
    tf("Words like 'somebody', 'nobody', 'anything', and 'everywhere' take a singular verb when used as subject.", true, "Law 2 — Indefinite Pronouns in Agreements: these are always singular."),
    tf("'Everywhere' is treated as a plural subject.", false, "Law 2 — 'everywhere' is treated as SINGULAR, not plural."),
    tf("Information that appears in brackets or between dashes should be regarded as the main subject of the sentence.", false, "Law 3 — bracketed/dashed information is additional information, NOT the main subject."),
    tf("When additional information appears in brackets, the verb should agree with the real (main) subject, not with the bracketed information.", true, "Law 3 — Additional-Information Agreement: agree with the real subject only."),
    tf("In 'The man (not his children) is here', 'his children' is the subject that determines the verb.", false, "Law 3 — 'the man' is the real subject; 'his children' is only additional information."),
    tf("'Each' is always followed by a singular noun and a singular verb.", true, "Law 4 — Agreement with Each: each + singular noun + singular verb."),
    tf("'Each boy' should correctly be followed by a plural verb.", false, "Law 4 — 'each' takes a SINGULAR verb, not a plural one."),
    tf("'Every' takes a singular noun and a singular verb.", true, "Law 5 — Agreement with Every: every + singular noun + singular verb."),
    tf("'Every day' should correctly be followed by a plural verb.", false, "Law 5 — 'every' takes a SINGULAR verb, not a plural one."),
    tf("When a figure (number) comes between 'every' and a noun, the verb must still remain singular.", false, "Law 6 — when a figure comes between 'every' and the noun, the FIGURE decides the verb; it need not stay singular."),
    tf("In 'every ten boys that come here', the verb is plural because 'ten' is a plural figure.", true, "Law 6 — Agreement of Every and a Figure: the figure decides the verb."),
    tf("In sentences involving BODMAS operations (bracket, of, division, multiplication, addition, subtraction), only a plural verb is acceptable.", false, "Law 7 — BODMAS sentences accept EITHER a singular or plural verb, not only plural."),
    tf("In BODMAS sentences such as 'Nine minus five is/are four', either a singular or plural verb is correct.", true, "Law 7 — BODMAS Agreement: both singular and plural verbs are acceptable."),
    tf("Expressions of money, weight, distance, frequency, or percentage are treated as a single unit and take a singular verb.", true, "Law 8 — Agreement of Quantity: quantity expressions take a singular verb."),
    tf("'60 kilo' should be followed by a plural verb because 'kilo' refers to a large amount.", false, "Law 8 — quantity expressions take a SINGULAR verb regardless of size: '60 kilo is…'."),
    tf("When a number (such as 'one' or 'two') is selected from a larger group, the verb agrees with the number selected, not with the larger group.", true, "Law 9 — Selection Agreement: the selected number decides the verb."),
    tf("In 'One of my teachers is wicked', the verb agrees with 'teachers' because 'teachers' is the noun closest to 'of'.", false, "Law 9 — the verb agrees with 'one' (the number selected), NOT with 'teachers'."),
    tf("In 'Two of my teachers know me', the verb is plural because 'two' was the number selected.", true, "Law 9 — Selection Agreement: 'two' (plural) → plural verb 'know'."),
    tf("In an 'either…or' construction, the verb always agrees with the first noun mentioned, no matter its position in the sentence.", false, "Law 10 — the verb agrees with the noun CLOSER to it, not necessarily the first one mentioned."),
    tf("In an 'either…or' construction, the verb agrees with the noun that comes immediately before it (the one closer to the verb, usually right after 'or').", true, "Law 10 — Agreement with Either…Or: the closer noun decides the verb."),
    tf("In 'Either the principal or the teachers pray every day', the verb agrees with 'the teachers' because it is closer to the verb.", true, "Law 10 — 'the teachers' comes right after 'or', so the plural verb 'pray' is correct."),
    tf("A singular principal verb (such as 'goes' or 'writes') usually carries an 's' at the end.", true, "Introductory note — singular principal verbs carry an -s: goes, writes, speaks."),
    tf("A plural principal verb (such as 'go' or 'write') also carries an 's' at the end.", false, "Introductory note — a plural principal verb does NOT carry an -s: go, write, speak."),
    tf("'Is', 'was', 'has', and 'had' are examples of singular helping verbs.", true, "Introductory note — is/was/has/had are singular helping verbs."),
    tf("'Are', 'were', 'am', and 'have' are examples of plural helping verbs.", true, "Introductory note — are/were/am/have are plural helping verbs."),
    tf("The subject of a sentence must always agree with the Adjunct (adverb) rather than the verb.", false, "Introductory note — the subject agrees with the Predicator (verb), not the Adjunct."),
  ],
};

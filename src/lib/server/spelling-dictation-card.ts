import "server-only";
import type { LessonCardDef, LessonQuestion } from "./lesson-cards";
import { SPELLING_QUIZ_WORDS } from "./spelling-quiz-card";

/**
 * SERVER-ONLY MODULE — DO NOT IMPORT FROM CLIENT CODE.
 *
 * "Spelling Dictation: Type What You Hear" card for the Spelling Bee stack.
 *
 * Each question shows a word's British English (RP) phonetic transcription and
 * offers a button that pronounces the word aloud in a British English voice
 * (the browser's speech synthesiser, lang "en-GB"). The student then TYPES the
 * word. Answers are graded on the server against the hidden key in this module,
 * so the correctly spelled word only ever travels to the browser for the
 * text-to-speech engine and is never displayed before it is earned.
 *
 * The 120 words (and their transcriptions) are shared with the speed quiz so
 * both Spelling Bee cards test exactly the same bank. All 120 must be spelt
 * correctly to master the card; every retry is tracked by the lesson-card
 * submit route.
 */

/** Letters in a word, ignoring anything that is not A–Z. */
function letterCount(word: string): number {
  return word.replace(/[^a-zA-Z]/g, "").length;
}

const questions: LessonQuestion[] = SPELLING_QUIZ_WORDS.map((entry) => ({
  // The transcription is the prompt shown to the student.
  prompt: entry.pronunciation,
  // The hidden answer key.
  answer: entry.word,
  // Sent to the browser so the speech synthesiser can pronounce the word.
  // It is never rendered as text before the student submits.
  speakWord: entry.word,
  hints: [
    "Play the British English pronunciation again and spell the word sound by sound.",
    `Check every letter — the word has ${letterCount(entry.word)} letter${letterCount(entry.word) === 1 ? "" : "s"}${
      entry.note ? ` (${entry.note.replace(/[()]/g, "")})` : ""
    }.`,
  ],
  source: entry.section,
}));

export const spellingDictationCard: LessonCardDef = {
  slug: "spelling-dictation",
  title: "Spelling Dictation: Type What You Hear",
  description:
    "Listen to each word pronounced in British English, study its phonetic transcription, then type the correct spelling. Spell all 120 words correctly to master the card — every retry is tracked.",
  kind: "spelling_dictation",
  lesson: [
    { kind: "heading", text: "🎧 How this dictation card works" },
    {
      kind: "text",
      text: "Every question gives you one word's British English (RP) phonetic transcription plus a button that pronounces the word aloud. Your job is to listen carefully and type the word with the correct spelling.",
    },
    {
      kind: "bullets",
      items: [
        "🔊 Tap “Play pronunciation” to hear the word in a British English voice — play it as many times as you need.",
        "📖 The phonetic transcription (in /slashes/) is shown as a guide — read it alongside the audio.",
        "⌨️ Type the word exactly as it is spelt, then submit. Capital letters are not required (February = february).",
        "✅ Get every word right to perfect the card.",
        "🔁 Any word you miss stays open for another try — you'll get a hint, never the answer.",
        "📊 Every submission is recorded, so you can see how many tries it took to master the card.",
      ],
    },
    { kind: "subheading", text: "🇬🇧 Why British English?" },
    {
      kind: "text",
      text: "The Nigerian curriculum follows British English spelling. These words are pronounced in a British English (RP) accent and use British spellings (colour, centre, organise, travelling) rather than the American forms you may see online.",
    },
    { kind: "subheading", text: "The six sections you're being tested on" },
    {
      kind: "bullets",
      items: [
        "1. Words where a vowel is silently dropped or added",
        "2. Silent letters",
        "3. Unexpected letter combinations",
        "4. “ie / ei” and doubled-letter confusions",
        "5. Everyday words often misspelled by sound",
        "6. British spelling patterns",
      ],
    },
    {
      kind: "review",
      title: "⚡ Dictation tips",
      items: [
        "Play the word twice before you start typing — listen for each syllable.",
        "Cross-check the transcription: the /ə/ schwa is never spelt with the vowel you might expect.",
        "Watch British endings: -our, -re, -ise, doubled l.",
        "A hint tells you the number of letters, not the spelling — count them as you type.",
      ],
    },
    {
      kind: "text",
      text: "Study the words on the right, then type each one. All 120 must be spelt correctly to master the card — you can retry as many times as you need, and every attempt is tracked.",
    },
  ],
  questions,
};

/**
 * Normalise a dictation answer for comparison: drop any parenthetical label,
 * lowercase, and collapse whitespace. Case is ignored on purpose — the point
 * of the exercise is spelling, not capitalisation.
 */
export function normalizeSpellingDictation(text: string): string {
  return (text || "")
    .replace(/\s*\(.*?\)\s*/g, " ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

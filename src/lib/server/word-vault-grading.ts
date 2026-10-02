import "server-only";
import type { DictationItem } from "./word-vault-challenge-content";

/**
 * ============================================================
 * SERVER-ONLY MODULE — DO NOT IMPORT FROM CLIENT CODE.
 * ============================================================
 *
 * Answer checking for the Word Vault Listening & Story Challenge, following
 * the spec's Section 6.1 rules:
 *
 *   - convert to Unicode NFC; curly quotes → straight; en/em dash → space
 *   - trim + collapse runs of spaces
 *   - strip leading/trailing punctuation ( . , ; : ! ? " ( ) ) from tokens
 *   - compare ignoring capital letters, except February and Wednesday, which
 *     must be typed with a capital first letter and the rest lower case
 *   - a token must match exactly: no spell-correction, no phonetic matching,
 *     and American spellings are wrong.
 *
 * The Activity A verdict follows Section 4.3 exactly: Perfect / Word correct /
 * Incorrect / Incomplete. Because a single missing or extra word must not mark
 * everything after it wrong, the sentence is compared with a word-level edit
 * distance alignment (Needleman–Wunsch) and the target word is correct only
 * when its expected token is matched exactly in that alignment.
 */

const PUNCT_EDGES = /^[.,;:!?"()]+|[.,;:!?"()]+$/g;

/** NFC + straight punctuation + collapsed whitespace (Section 6.1). */
export function normalizeForCompare(text: string): string {
  return (text || "")
    .normalize("NFC")
    .replace(/[\u2018\u2019\u2032]/g, "'")
    .replace(/[\u201C\u201D\u2033]/g, '"')
    .replace(/[\u2013\u2014]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Split text into comparison tokens (punctuation stripped from both ends). */
export function tokenize(text: string): string[] {
  return normalizeForCompare(text)
    .split(" ")
    .map((t) => t.replace(PUNCT_EDGES, ""))
    .filter((t) => t.length > 0);
}

/** Strip punctuation from a single word (used for the story gap answer). */
function normalizeWord(word: string): string {
  return normalizeForCompare(word).replace(PUNCT_EDGES, "");
}

/**
 * Are two tokens the same word? Case is ignored except for the two words that
 * must carry a capital first letter (February, Wednesday).
 */
export function tokensMatch(actual: string, expected: string, capitalRequired = false): boolean {
  if (capitalRequired) return actual === expected;
  return actual.toLowerCase() === expected.toLowerCase();
}

/** Capitalised duplicates of the two words that must keep their capital. */
export const CAPITALISED_WORDS = new Set(["February", "Wednesday"]);

/**
 * Word-level alignment of the expected and typed token lists. Returns the
 * matched pairs (expectedIndex → typedIndex) so a single insertion or deletion
 * does not shift every later comparison.
 */
export function alignTokens(
  expected: string[],
  actual: string[],
  equal: (actualToken: string, expectedToken: string) => boolean
): { e: number; a: number }[] {
  const n = expected.length;
  const m = actual.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 1; i <= n; i++) dp[i][0] = i;
  for (let j = 1; j <= m; j++) dp[0][j] = j;

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const sub = dp[i - 1][j - 1] + (equal(actual[j - 1], expected[i - 1]) ? 0 : 1);
      dp[i][j] = Math.min(sub, dp[i - 1][j] + 1, dp[i][j - 1] + 1);
    }
  }

  const pairs: { e: number; a: number }[] = [];
  let i = n;
  let j = m;
  while (i > 0 && j > 0) {
    const eq = equal(actual[j - 1], expected[i - 1]);
    if (dp[i][j] === dp[i - 1][j - 1] + (eq ? 0 : 1)) {
      if (eq) pairs.push({ e: i - 1, a: j - 1 });
      i--;
      j--;
    } else if (dp[i][j] === dp[i - 1][j] + 1) {
      i--;
    } else {
      j--;
    }
  }
  return pairs.reverse();
}

export type DictationResult = "perfect" | "word_correct" | "incorrect" | "incomplete";

export type DictationVerdict = {
  result: DictationResult;
  /** True when the target word itself is spelled exactly right. */
  wordCorrect: boolean;
  /** The words the student got wrong (for polite feedback), target excluded. */
  mistakes: string[];
  /** A friendly message when a known typical error / American spelling was typed. */
  note: string;
};

/** Index of the target word's token inside the sentence (case-insensitive). */
export function targetTokenIndex(item: DictationItem): number {
  const expected = tokenize(item.sentence);
  return expected.findIndex((t) => t.toLowerCase() === item.target.toLowerCase());
}

/** Mark one dictated sentence against its hidden key (Section 4.3). */
export function gradeDictation(item: DictationItem, typed: string): DictationVerdict {
  const expected = tokenize(item.sentence);
  const actual = tokenize(typed);

  // Incomplete: fewer than half the sentence's words were typed.
  if (actual.length * 2 < expected.length) {
    return { result: "incomplete", wordCorrect: false, mistakes: [], note: "" };
  }

  const equal = (a: string, e: string) => tokensMatch(a, e);

  const perfect =
    actual.length === expected.length && expected.every((e, idx) => equal(actual[idx], e));

  if (perfect) {
    return { result: "perfect", wordCorrect: true, mistakes: [], note: "" };
  }

  const targetIndex = targetTokenIndex(item);
  const pairs = alignTokens(expected, actual, equal);
  const wordCorrect = targetIndex >= 0 && pairs.some((p) => p.e === targetIndex);

  const matchedExpected = new Set(pairs.map((p) => p.e));
  const mistakes = expected.filter((_, idx) => idx !== targetIndex && !matchedExpected.has(idx));

  return {
    result: wordCorrect ? "word_correct" : "incorrect",
    wordCorrect,
    mistakes,
    note: wordCorrect ? "" : misspellingNote(item, actual),
  };
}

/** The American → British pairs tested by Word Vault category 6. */
const AMERICAN_FORMS: Record<string, string> = {
  colour: "color",
  favourite: "favorite",
  humour: "humor",
  centre: "center",
  travelling: "traveling",
  organise: "organize",
  realise: "realize",
  honour: "honor",
  labour: "labor",
  theatre: "theater",
  metre: "meter",
  programme: "program",
  cheque: "check",
  jewellery: "jewelry",
  practise: "practice",
  defence: "defense",
  licence: "license",
  offence: "offense",
  analyse: "analyze",
  apologise: "apologize",
};

/**
 * Feedback for a missed target word: the classic misspelling, or the American
 * spelling when the student used it. Never reveals the answer unless the
 * caller is already revealing (the result decides that).
 */
function misspellingNote(item: DictationItem, actual: string[]): string {
  const lowered = actual.map((t) => t.toLowerCase());
  const typical = item.typicalError.toLowerCase();
  const american = AMERICAN_FORMS[item.target.toLowerCase()];

  if (american && lowered.includes(american)) {
    return `That is the American spelling. Use the British spelling of ${item.target}.`;
  }
  if (lowered.includes(typical)) {
    return `That is a common mistake. The correct spelling is ${item.target}.`;
  }
  return "";
}

/** Grade one Activity B story gap (a single word, compared exactly). */
export function gradeStoryGap(word: string, target: string, capitalRequired = false): boolean {
  const typed = tokenize(word);
  if (typed.length !== 1) return false;
  return tokensMatch(typed[0], target, capitalRequired);
}

/** The classic misspelling feedback shared with the dictation card. */
export function typicalErrorNote(target: string, typicalError: string, typed: string): string {
  const lowered = normalizeForCompare(typed).toLowerCase();
  if (typicalError && lowered === typicalError.toLowerCase()) {
    return `That is a common mistake. The correct spelling is ${target}.`;
  }
  const american = AMERICAN_FORMS[target.toLowerCase()];
  if (american && lowered === american) {
    return `That is the American spelling. Use the British spelling of ${target}.`;
  }
  return "";
}

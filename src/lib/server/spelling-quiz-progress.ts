import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  SPELLING_QUIZ_MASTERY_TARGET,
  SPELLING_QUIZ_TOTAL_WORDS,
} from "./spelling-quiz-card";

/**
 * SERVER-ONLY MODULE — DO NOT IMPORT FROM CLIENT CODE.
 *
 * Per-word progress for the 5-minute spelling speed quiz.
 *
 * A student can never clear 120 words in a single 5-minute run, so finishing a
 * run must not mark the card as studied. Instead each word carries its own
 * streak in `spelling_quiz_word_progress`:
 *
 *   correct tap → streak + 1 (capped at the mastery target)
 *   wrong tap   → streak reset to 0
 *
 * Because a run shuffles the deck and shows each word at most once, a streak of
 * 3 can only be built across three separate runs. A word is "learned" at a
 * streak of 3, and the card is mastered only when every word is learned.
 */

export const SPELLING_QUIZ_PROGRESS_TABLE = "spelling_quiz_word_progress";

export type SpellingProgress = {
  /** Words whose streak reached the mastery target (3 corrects in a row). */
  learnedWords: number;
  /** Size of the deck — 120. */
  totalWords: number;
  /** learnedWords / totalWords, rounded to a whole percent. */
  percent: number;
  /** Words the student has answered at least once. */
  seenWords: number;
  /** Words never yet encountered in any run. */
  notSeenWords: number;
  /** Words at streak 1 (one more correct in a row to reach 2). */
  atStreak1: number;
  /** Words at streak 2 (one more correct in a row makes them learned). */
  atStreak2: number;
  /** True only when every word is learned. */
  mastered: boolean;
  /** True once the student has answered at least one word. */
  started: boolean;
};

type ProgressRow = {
  word_key: string;
  streak: number;
  correct_total: number;
  seen_count: number;
};

/** Empty summary (no progress table rows yet). */
function emptyProgress(totalWords: number): SpellingProgress {
  return {
    learnedWords: 0,
    totalWords,
    percent: 0,
    seenWords: 0,
    notSeenWords: totalWords,
    atStreak1: 0,
    atStreak2: 0,
    mastered: false,
    started: false,
  };
}

function summarize(rows: ProgressRow[], totalWords: number): SpellingProgress {
  if (rows.length === 0) return emptyProgress(totalWords);
  let learned = 0;
  let streak1 = 0;
  let streak2 = 0;
  for (const row of rows) {
    const streak = row.streak || 0;
    if (streak >= SPELLING_QUIZ_MASTERY_TARGET) learned++;
    else if (streak === 2) streak2++;
    else if (streak === 1) streak1++;
  }
  const seen = rows.length;
  return {
    learnedWords: learned,
    totalWords,
    percent: totalWords ? Math.round((learned / totalWords) * 100) : 0,
    seenWords: seen,
    notSeenWords: Math.max(totalWords - seen, 0),
    atStreak1: streak1,
    atStreak2: streak2,
    mastered: totalWords > 0 && learned >= totalWords,
    started: seen > 0,
  };
}

/** Read this student's per-word streaks for one spelling-quiz card. */
export async function loadSpellingProgress(
  supabase: SupabaseClient,
  studentName: string,
  drillSetId: number,
  totalWords: number = SPELLING_QUIZ_TOTAL_WORDS
): Promise<SpellingProgress> {
  const name = (studentName || "").trim();
  if (!name) return emptyProgress(totalWords);

  const { data, error } = await supabase
    .from(SPELLING_QUIZ_PROGRESS_TABLE)
    .select("word_key,streak,correct_total,seen_count")
    .eq("student_name", name)
    .eq("drill_set_id", drillSetId);

  if (error || !data) return emptyProgress(totalWords);
  return summarize(data as ProgressRow[], totalWords);
}

export type SpellingRunOutcome = {
  progress: SpellingProgress;
  /** Words that crossed the mastery target during this run. */
  learnedThisRun: string[];
};

/**
 * Fold one run's graded answers into the student's per-word streaks.
 *
 * `answers` must contain each word at most once (the deck guarantees this), and
 * only the words actually answered — the run ends at whichever word the clock
 * cut off, so unanswered words keep whatever streak they already had.
 */
export async function applySpellingRun(
  supabase: SupabaseClient,
  options: {
    studentName: string;
    drillSetId: number;
    answers: { wordKey: string; correct: boolean }[];
    totalWords?: number;
  }
): Promise<SpellingRunOutcome> {
  const totalWords = options.totalWords ?? SPELLING_QUIZ_TOTAL_WORDS;
  const name = (options.studentName || "").trim() || "Anonymous";
  const setId = options.drillSetId;

  // Collapse this run's answers to one outcome per word (defensive — a word
  // should only ever appear once per run).
  const runResults = new Map<string, boolean>();
  for (const answer of options.answers) {
    const key = (answer.wordKey || "").trim();
    if (!key) continue;
    const previous = runResults.get(key);
    runResults.set(key, previous === undefined ? answer.correct : previous && answer.correct);
  }

  const { data: existing, error: readError } = await supabase
    .from(SPELLING_QUIZ_PROGRESS_TABLE)
    .select("word_key,streak,correct_total,seen_count")
    .eq("student_name", name)
    .eq("drill_set_id", setId);

  if (readError) throw readError;

  const rows = (existing || []) as ProgressRow[];
  const byWord = new Map(rows.map((row) => [row.word_key, row]));
  const learnedThisRun: string[] = [];
  const now = new Date().toISOString();

  const upserts = [...runResults.entries()].map(([wordKey, correct]) => {
    const previous = byWord.get(wordKey);
    const previousStreak = previous?.streak || 0;
    const streak = correct
      ? Math.min(previousStreak + 1, SPELLING_QUIZ_MASTERY_TARGET)
      : 0;
    if (streak >= SPELLING_QUIZ_MASTERY_TARGET && previousStreak < SPELLING_QUIZ_MASTERY_TARGET) {
      learnedThisRun.push(wordKey);
    }
    return {
      student_name: name,
      drill_set_id: setId,
      word_key: wordKey,
      streak,
      correct_total: (previous?.correct_total || 0) + (correct ? 1 : 0),
      seen_count: (previous?.seen_count || 0) + 1,
      updated_at: now,
    };
  });

  if (upserts.length > 0) {
    const { error } = await supabase
      .from(SPELLING_QUIZ_PROGRESS_TABLE)
      .upsert(upserts, { onConflict: "student_name,drill_set_id,word_key" });
    if (error) throw error;
  }

  // Rebuild the summary from the freshly written state.
  const merged = new Map<string, ProgressRow>(
    rows.map((row) => [row.word_key, { ...row }])
  );
  for (const row of upserts) {
    merged.set(row.word_key, {
      word_key: row.word_key,
      streak: row.streak,
      correct_total: row.correct_total,
      seen_count: row.seen_count,
    });
  }

  return {
    progress: summarize([...merged.values()], totalWords),
    learnedThisRun,
  };
}

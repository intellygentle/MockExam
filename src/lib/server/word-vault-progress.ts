import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * SERVER-ONLY MODULE — DO NOT IMPORT FROM CLIENT CODE.
 *
 * Per-word progress for the two Word Vault Listening & Story Challenge cards.
 *
 * Each of the 120 Word Vault words keeps its own record per card (activity):
 *
 *   first_try_correct → sticky true once the student got the word right on
 *                       the FIRST attempt of a run. A later first-attempt miss
 *                       does not take the word back off the list — the spec
 *                       says a word answered correctly on a first attempt in
 *                       any session is learned.
 *   attempts          → how many times the word has been graded in this card.
 *   last_typed        → the student's most recent spelling (never the key).
 *
 * The card is mastered when every one of its 120 words is first-try correct,
 * at which point a mastered row is written to capitalization_attempts so the
 * Spelling Bee stack progress bar counts it.
 */

export const WORD_VAULT_PROGRESS_TABLE = "word_vault_progress";

export type WordVaultProgress = {
  learnedWords: number;
  totalWords: number;
  percent: number;
  mastered: boolean;
  started: boolean;
  /** Word IDs answered correctly on the first attempt (safe to send: no spelling). */
  learnedIds: number[];
};

type ProgressRow = {
  word_id: number;
  attempts: number;
  first_try_correct: boolean;
};

function emptyProgress(totalWords: number): WordVaultProgress {
  return { learnedWords: 0, totalWords, percent: 0, mastered: false, started: false, learnedIds: [] };
}

function summarize(rows: ProgressRow[], totalWords: number): WordVaultProgress {
  if (rows.length === 0) return emptyProgress(totalWords);
  const learnedIds = rows.filter((r) => r.first_try_correct).map((r) => r.word_id);
  const learned = learnedIds.length;
  const mastered = learned >= totalWords;
  return {
    learnedWords: learned,
    totalWords,
    percent: totalWords ? Math.round((learned / totalWords) * 100) : 0,
    mastered,
    started: rows.length > 0,
    learnedIds,
  };
}

/** Read this student's per-word progress for one Word Vault card. */
export async function loadWordVaultProgress(
  supabase: SupabaseClient,
  studentName: string,
  drillSetId: number,
  totalWords: number
): Promise<WordVaultProgress> {
  const name = (studentName || "").trim();
  if (!name) return emptyProgress(totalWords);

  const { data, error } = await supabase
    .from(WORD_VAULT_PROGRESS_TABLE)
    .select("word_id,attempts,first_try_correct")
    .eq("student_name", name)
    .eq("drill_set_id", drillSetId);

  if (error || !data) return emptyProgress(totalWords);
  return summarize(data as ProgressRow[], totalWords);
}

export type WordVaultResult = {
  wordId: number;
  /** True when the word was right on the first attempt in this run. */
  firstTryCorrect: boolean;
  /** The student's most recent spelling (never the key). */
  lastTyped: string;
};

export type WordVaultOutcome = {
  progress: WordVaultProgress;
  /** True when this session pushed every word over the line. */
  masteredNow: boolean;
};

/**
 * Fold one finished run's per-word results into the student's history.
 * `firstTryCorrect` is already graded on the server by the caller.
 */
export async function applyWordVaultResults(
  supabase: SupabaseClient,
  options: {
    studentName: string;
    schoolName?: string;
    drillSetId: number;
    wordKeyById: Record<number, string>;
    results: WordVaultResult[];
    totalWords: number;
  }
): Promise<WordVaultOutcome> {
  const name = (options.studentName || "").trim() || "Anonymous";
  const setId = options.drillSetId;

  const { data: existing, error: readError } = await supabase
    .from(WORD_VAULT_PROGRESS_TABLE)
    .select("word_id,attempts,first_try_correct,last_typed")
    .eq("student_name", name)
    .eq("drill_set_id", setId);

  if (readError) throw readError;

  const previous = new Map<number, ProgressRow & { last_typed?: string }>(
    ((existing || []) as (ProgressRow & { last_typed?: string })[]).map((r) => [r.word_id, r])
  );
  const now = new Date().toISOString();

  // Collapse to one row per word (defensive) — a word is only first-try
  // correct if every first attempt for it in this run was correct.
  const perWord = new Map<number, WordVaultResult>();
  for (const result of options.results) {
    const prior = perWord.get(result.wordId);
    perWord.set(
      result.wordId,
      prior
        ? {
            wordId: result.wordId,
            firstTryCorrect: prior.firstTryCorrect && result.firstTryCorrect,
            lastTyped: result.lastTyped,
          }
        : result
    );
  }

  const upserts = [...perWord.values()].map((result) => {
    const before = previous.get(result.wordId);
    return {
      student_name: name,
      drill_set_id: setId,
      word_id: result.wordId,
      word_key: options.wordKeyById[result.wordId] || "",
      attempts: (before?.attempts || 0) + 1,
      first_try_correct: (before?.first_try_correct || false) || result.firstTryCorrect,
      last_typed: result.lastTyped.slice(0, 200),
      updated_at: now,
    };
  });

  if (upserts.length > 0) {
    const { error } = await supabase
      .from(WORD_VAULT_PROGRESS_TABLE)
      .upsert(upserts, { onConflict: "student_name,drill_set_id,word_id" });
    if (error) throw error;
  }

  // Rebuild the summary from the freshly written state.
  const merged = new Map<number, ProgressRow>(
    [...previous.entries()].map(([id, row]) => [
      id,
      { word_id: id, attempts: row.attempts, first_try_correct: row.first_try_correct },
    ])
  );
  for (const row of upserts) {
    merged.set(row.word_id, {
      word_id: row.word_id,
      attempts: row.attempts,
      first_try_correct: row.first_try_correct,
    });
  }
  const progress = summarize([...merged.values()], options.totalWords);

  // Mastery: write a mastered attempt row so the stack progress bar counts it.
  let masteredNow = false;
  if (progress.mastered) {
    const { data: masteredRow } = await supabase
      .from("capitalization_attempts")
      .select("id")
      .eq("student_name", name)
      .eq("drill_set_id", setId)
      .eq("status", "mastered")
      .limit(1)
      .maybeSingle();

    if (!masteredRow) {
      const { error } = await supabase.from("capitalization_attempts").insert({
        student_name: name,
        school_name: (options.schoolName || "").trim(),
        drill_set_id: setId,
        status: "mastered",
        submissions_count: 1,
        lines_correct: progress.learnedWords,
        started_at: now,
        completed_at: now,
      });
      if (error) throw error;
      masteredNow = true;
    }
  }

  return { progress, masteredNow };
}

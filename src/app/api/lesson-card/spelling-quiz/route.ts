import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getLessonCard } from "@/lib/server/lesson-cards";
import { spellingQuizWordKey, SPELLING_QUIZ_TOTAL_WORDS } from "@/lib/server/spelling-quiz-card";
import { applySpellingRun, loadSpellingProgress } from "@/lib/server/spelling-quiz-progress";

/**
 * /api/lesson-card/spelling-quiz
 *
 * GET  ?drill_set_id=51&student_name=Jane   → this student's per-word progress
 * POST { studentName, schoolName, drillSetId, picks: [{ index, choice }] }
 *
 * The 5-minute spelling speed quiz cannot be finished in one run, so progress
 * is tracked per word in spelling_quiz_word_progress: a correct tap moves the
 * word one step closer to a streak of 3, a wrong tap resets that word to 0.
 * The card is only marked "mastered" when all 120 words are learned — finish
 * the run all you like, the card stays in progress until then.
 *
 * Picks are graded here, against the server-side answer key, so the client
 * cannot fake a correct answer.
 */

const CARD_TYPE = "spelling_quiz";

async function loadSet(supabase: any, setId: number) {
  const { data: set, error } = await supabase
    .from("drill_sets")
    .select("id,card_type,capitalization_slug")
    .eq("id", setId)
    .maybeSingle();
  if (error || !set) return { error: NextResponse.json({ error: "Drill set not found" }, { status: 404 }) };
  if ((set.card_type || "") !== CARD_TYPE) {
    return { error: NextResponse.json({ error: "This drill set is not a spelling quiz" }, { status: 400 }) };
  }
  const card = getLessonCard(CARD_TYPE, set.capitalization_slug);
  if (!card) {
    return {
      error: NextResponse.json(
        { error: `No lesson is registered for slug "${set.capitalization_slug || "(empty)"}"` },
        { status: 404 }
      ),
    };
  }
  return { set, card };
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const setId = parseInt(url.searchParams.get("drill_set_id") || "", 10);
    const studentName = (url.searchParams.get("student_name") || "").trim();

    if (isNaN(setId)) {
      return NextResponse.json({ error: "drill_set_id is required" }, { status: 400 });
    }

    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);
    const loaded = await loadSet(supabase, setId);
    if (loaded.error) return loaded.error;

    const progress = await loadSpellingProgress(
      supabase,
      studentName,
      setId,
      loaded.card!.questions.length || SPELLING_QUIZ_TOTAL_WORDS
    );

    return NextResponse.json({ progress });
  } catch (error: any) {
    console.error("Spelling quiz progress API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load progress" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = (body.studentName || "").trim() || "Anonymous";
    const schoolName = (body.schoolName || "").trim();
    const setId = parseInt(String(body.drillSetId ?? ""), 10);
    const picks = Array.isArray(body.picks) ? body.picks : [];

    if (isNaN(setId)) {
      return NextResponse.json({ error: "drillSetId is required" }, { status: 400 });
    }

    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);
    const loaded = await loadSet(supabase, setId);
    if (loaded.error) return loaded.error;
    const card = loaded.card!;
    const totalWords = card.questions.length || SPELLING_QUIZ_TOTAL_WORDS;

    // ── Grade the run against the hidden answer key ──
    const answers: { wordKey: string; correct: boolean }[] = [];
    const results: { index: number; choice: string; correct: boolean; word: string }[] = [];
    for (const pick of picks) {
      const index = parseInt(String(pick?.index ?? ""), 10);
      if (isNaN(index) || index < 0 || index >= card.questions.length) continue;
      const question = card.questions[index];
      const choice = pick?.choice === "b" ? "b" : "a";
      const correct = question.correctOption === choice;
      const wordKey = spellingQuizWordKey(question);
      if (!wordKey) continue;
      answers.push({ wordKey, correct });
      results.push({ index, choice, correct, word: wordKey });
    }

    const correctCount = results.filter((r) => r.correct).length;
    const wrongCount = results.length - correctCount;

    // ── Fold the run into the per-word streaks ──
    const { progress, learnedThisRun } = await applySpellingRun(supabase, {
      studentName: name,
      drillSetId: setId,
      answers,
      totalWords,
    });

    // ── Record the run against the student's attempt row ──
    // "mastered" is only written once every word is learned, so a finished
    // 5-minute run leaves the card in progress.
    const now = new Date().toISOString();
    const { data: existing } = await supabase
      .from("capitalization_attempts")
      .select("id,submissions_count,completed_at")
      .eq("student_name", name)
      .eq("drill_set_id", setId)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const attemptValues = {
      status: progress.mastered ? "mastered" : "in_progress",
      lines_correct: progress.learnedWords,
      completed_at: progress.mastered ? existing?.completed_at || now : null,
    };

    if (existing) {
      await supabase
        .from("capitalization_attempts")
        .update({
          ...attemptValues,
          submissions_count: (existing.submissions_count || 0) + 1,
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("capitalization_attempts").insert({
        student_name: name,
        school_name: schoolName,
        drill_set_id: setId,
        submissions_count: 1,
        started_at: now,
        ...attemptValues,
      });
    }

    return NextResponse.json({
      mastered: progress.mastered,
      progress,
      learnedThisRun,
      results,
      runStats: {
        attempted: results.length,
        correct: correctCount,
        wrong: wrongCount,
        score: correctCount - wrongCount,
      },
    });
  } catch (error: any) {
    console.error("Spelling quiz submit API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save the run" },
      { status: 500 }
    );
  }
}

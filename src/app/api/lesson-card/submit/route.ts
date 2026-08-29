import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getLessonCard, gradeQuestionWithHints } from "@/lib/server/lesson-cards";

/**
 * POST /api/lesson-card/submit
 *
 * Body: { action?, studentName, schoolName, drillSetId, answers: string[] }
 *
 * - action: "start"  → begin a fresh, tracked re-practice session.
 * - otherwise        → grade every answer against the hidden answers, return
 *   per-item verdicts + hints, and record the submission for retry tracking.
 *   The card is only "mastered" when EVERY item is correct.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, studentName, schoolName, drillSetId, answers } = body;

    const name = (studentName || "").trim() || "Anonymous";
    const setId = parseInt(String(drillSetId ?? ""), 10);

    if (isNaN(setId)) {
      return NextResponse.json({ error: "drillSetId is required" }, { status: 400 });
    }

    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ── Shared helpers ──
    const loadSetAndCard = async () => {
      const { data: set, error: setError } = await supabase
        .from("drill_sets")
        .select("*")
        .eq("id", setId)
        .maybeSingle();
      if (setError || !set) {
        return { error: NextResponse.json({ error: "Drill set not found" }, { status: 404 }) };
      }
      const cardType = set.card_type || "quiz";
      if (cardType !== "capitalization" && cardType !== "sentence_types" && cardType !== "sentence_combining" && cardType !== "true_false" && cardType !== "combine_seq") {
        return { error: NextResponse.json({ error: "This drill set is not a lesson card" }, { status: 400 }) };
      }
      const card = getLessonCard(cardType, set.capitalization_slug);
      if (!card) {
        return {
          error: NextResponse.json(
            { error: `No lesson is registered for slug "${set.capitalization_slug || "(empty)"}"` },
            { status: 404 }
          ),
        };
      }
      return { set, card };
    };

    // Find the student's active attempt (resume it) or create a new one.
    const getOrCreateAttempt = async () => {
      const { data: existing } = await supabase
        .from("capitalization_attempts")
        .select("*")
        .eq("student_name", name)
        .eq("drill_set_id", setId)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing && existing.status === "in_progress") {
        return existing;
      }
      const { data, error } = await supabase
        .from("capitalization_attempts")
        .insert({
          student_name: name,
          school_name: (schoolName || "").trim() || "",
          drill_set_id: setId,
          status: "in_progress",
          submissions_count: 0,
          lines_correct: 0,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    };

    // ── START: begin a fresh, tracked re-practice session ──
    if (action === "start") {
      const loaded = await loadSetAndCard();
      if (loaded.error) return loaded.error;
      const attempt = await getOrCreateAttempt();

      return NextResponse.json({
        attempt: {
          id: attempt.id,
          status: attempt.status,
          submissionsCount: attempt.submissions_count || 0,
        },
      });
    }

    if (!Array.isArray(answers)) {
      return NextResponse.json({ error: "answers must be an array" }, { status: 400 });
    }

    const loaded = await loadSetAndCard();
    if (loaded.error) return loaded.error;
    const { card } = loaded;

    if (answers.length !== card.questions.length) {
      return NextResponse.json(
        { error: `Expected ${card.questions.length} answers, received ${answers.length}` },
        { status: 400 }
      );
    }

    const attempt = await getOrCreateAttempt();

    // ── Grade every item against the hidden answers ──
    // The student's own submitted answer is stored back so the UI can restore
    // their picks on resume (it is their text, never the hidden answer).
    const results = card.questions.map((q, i) => {
      const studentText = typeof answers[i] === "string" ? answers[i] : "";
      const { correct, hints } = gradeQuestionWithHints(card, studentText, i);
      return {
        index: i,
        correct,
        hints,
        answer: studentText,
      };
    });

    const correctCount = results.filter((r) => r.correct).length;
    const allCorrect = correctCount === card.questions.length;
    const submissionNumber = (attempt.submissions_count || 0) + 1;
    const now = new Date().toISOString();

    // ── Log the submission (every retry is recorded) ──
    await supabase.from("capitalization_submissions").insert({
      attempt_id: attempt.id,
      submission_number: submissionNumber,
      lines_correct: correctCount,
      all_correct: allCorrect,
      submitted_at: now,
    });

    // ── Update the attempt ──
    await supabase
      .from("capitalization_attempts")
      .update({
        submissions_count: submissionNumber,
        lines_correct: correctCount,
        status: allCorrect ? "mastered" : "in_progress",
        completed_at: allCorrect ? now : null,
        last_results: results,
      })
      .eq("id", attempt.id);

    return NextResponse.json({
      allCorrect,
      mastered: allCorrect,
      linesCorrect: correctCount,
      totalLines: card.questions.length,
      submissionNumber,
      results,
      attempt: {
        status: allCorrect ? "mastered" : "in_progress",
        submissionsCount: submissionNumber,
        linesCorrect: correctCount,
        mastered: allCorrect,
      },
    });
  } catch (error: any) {
    console.error("Lesson card submit API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to check answers" },
      { status: 500 }
    );
  }
}

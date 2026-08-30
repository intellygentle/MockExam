import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getLessonCard, gradeQuestionWithHints, gradeErrorCorrection, gradeParaGapfill, gradeSentenceExpansion } from "@/lib/server/lesson-cards";
import { getRandomNudge } from "@/lib/server/sentence-expansion-card";

/**
 * POST /api/lesson-card/check
 *
 * Body: { drillSetId, index, answer }
 *
 * Grades ONE combine_seq answer in isolation (no attempt tracking here — the
 * sequential card component tracks progress in memory). Returns the verdict +
 * targeted hints. The correct model answer is NEVER returned.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { drillSetId, index, answer } = body;

    const setId = parseInt(String(drillSetId ?? ""), 10);
    const qIndex = parseInt(String(index ?? ""), 10);

    if (isNaN(setId)) {
      return NextResponse.json({ error: "drillSetId is required" }, { status: 400 });
    }
    if (isNaN(qIndex) || qIndex < 0) {
      return NextResponse.json({ error: "index is required" }, { status: 400 });
    }

    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: set, error: setError } = await supabase
      .from("drill_sets")
      .select("*")
      .eq("id", setId)
      .maybeSingle();
    if (setError || !set) {
      return NextResponse.json({ error: "Drill set not found" }, { status: 404 });
    }

    const cardType = set.card_type || "quiz";
    if (cardType !== "combine_seq" && cardType !== "error_correction" && cardType !== "para_gapfill" && cardType !== "sentence_expansion" && cardType !== "sentence_expansion_mcq") {
      return NextResponse.json({ error: "This drill set is not a sequential card" }, { status: 400 });
    }
    const card = getLessonCard(cardType, set.capitalization_slug);
    if (!card) {
      return NextResponse.json(
        { error: `No lesson is registered for slug "${set.capitalization_slug || "(empty)"}"` },
        { status: 404 }
      );
    }
    if (qIndex >= card.questions.length) {
      return NextResponse.json({ error: "Question index out of range" }, { status: 400 });
    }

    // para_gapfill accepts an array of blank answers (no single 'answer' field)
    if (cardType === "para_gapfill") {
      const answers = typeof body.answers === "string" ? JSON.parse(body.answers) : body.answers;
      if (!Array.isArray(answers)) {
        return NextResponse.json({ error: "answers array is required" }, { status: 400 });
      }
      const { allCorrect, results } = gradeParaGapfill(answers, card.questions[qIndex]);
      return NextResponse.json({ correct: allCorrect, hints: [], results });
    }

    const studentText = typeof answer === "string" ? answer : "";
    if (!studentText.trim()) {
      return NextResponse.json({ error: "Please type your answer before checking." }, { status: 400 });
    }

    // error_correction uses banter, not hints
    if (cardType === "error_correction") {
      const { correct, banter } = gradeErrorCorrection(studentText, card.questions[qIndex]);
      return NextResponse.json({ correct, hints: [], banter });
    }

    // sentence_expansion uses lenient grading with nudges
    if (cardType === "sentence_expansion") {
      const { correct, nudge } = gradeSentenceExpansion(studentText, card.questions[qIndex]);
      return NextResponse.json({ correct, hints: [], nudge });
    }

    const { correct, hints } = gradeQuestionWithHints(card, studentText, qIndex, {
      relationship: typeof body.relationship === "string" ? body.relationship : "",
      conjunction: typeof body.conjunction === "string" ? body.conjunction : "",
    });

    return NextResponse.json({
      correct,
      hints,
      explanation: correct ? card.questions[qIndex].explanation || "" : "",
    });
  } catch (error: any) {
    console.error("Lesson card check API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to check answer" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getLessonCard } from "@/lib/server/lesson-cards";

/**
 * GET /api/lesson-card/card?drill_set_id=1&student_name=Jane
 *
 * Serves the lesson note + the practice prompts for any lesson card
 * (capitalization, sentence types, …). The correct answers are NEVER
 * included here — they only exist in the server-only module and are
 * checked on submit.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const drillSetId = parseInt(url.searchParams.get("drill_set_id") || "", 10);
    const studentName = (url.searchParams.get("student_name") || "").trim();

    if (isNaN(drillSetId)) {
      return NextResponse.json({ error: "drill_set_id is required" }, { status: 400 });
    }

    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: set, error: setError } = await supabase
      .from("drill_sets")
      .select("*")
      .eq("id", drillSetId)
      .maybeSingle();

    if (setError || !set) {
      return NextResponse.json({ error: "Drill set not found" }, { status: 404 });
    }

    const cardType = set.card_type || "quiz";
    if (cardType !== "capitalization" && cardType !== "sentence_types" && cardType !== "sentence_combining" && cardType !== "true_false" && cardType !== "combine_seq" && cardType !== "error_correction" && cardType !== "para_gapfill" && cardType !== "sentence_expansion" && cardType !== "sentence_expansion_mcq" && cardType !== "word_table") {
      return NextResponse.json({ error: "This drill set is not a lesson card" }, { status: 400 });
    }

    const card = getLessonCard(cardType, set.capitalization_slug);
    if (!card) {
      return NextResponse.json(
        { error: `No lesson is registered for slug "${set.capitalization_slug || "(empty)"}"` },
        { status: 404 }
      );
    }

    // Existing attempt state for this student (for resume + retry display)
    let attempt: any = null;
    if (studentName) {
      const { data } = await supabase
        .from("capitalization_attempts")
        .select("*")
        .eq("student_name", studentName)
        .eq("drill_set_id", drillSetId)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      attempt = data;
    }

    return NextResponse.json({
      kind: card.kind,
      title: card.title,
      description: card.description || set.description || "",
      lesson: card.lesson,
      items: card.questions.map((q) => ({
        prompt: q.prompt,
        source: q.source || "",
        paraGapfill: q.paraGapfill || null,
        mcqOptions: q.mcqOptions || null,
        sentenceExpansion: q.sentenceExpansion || null,
        relationshipOptions: q.relationshipOptions || null,
      })),
      lineCount: card.questions.length,
      attempt: attempt
        ? {
            status: attempt.status,
            submissionsCount: attempt.submissions_count,
            linesCorrect: attempt.lines_correct,
            mastered: attempt.status === "mastered",
            completedAt: attempt.completed_at,
            lastResults: attempt.last_results || null,
          }
        : null,
    });
  } catch (error: any) {
    console.error("Lesson card API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load lesson card" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/lesson-card/study
 *
 * Body: { studentName, schoolName, drillSetId }
 *
 * Marks a self-paced card as completed for the student by recording a
 * mastered row in capitalization_attempts — the same table lesson cards
 * use, so the stack progress bar counts it. Used by read-only study cards
 * (card_type "study") and definition-recall cards (card_type
 * "definition_recall", graded client-side). Idempotent: a second call with
 * an existing mastered row is a no-op.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = (body.studentName || "").trim() || "Anonymous";
    const setId = parseInt(String(body.drillSetId ?? ""), 10);

    if (isNaN(setId)) {
      return NextResponse.json({ error: "drillSetId is required" }, { status: 400 });
    }

    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: set } = await supabase
      .from("drill_sets")
      .select("id, card_type")
      .eq("id", setId)
      .maybeSingle();

    if (!set || (set.card_type !== "study" && set.card_type !== "definition_recall")) {
      return NextResponse.json({ error: "This drill set is not a self-paced card" }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from("capitalization_attempts")
      .select("id")
      .eq("student_name", name)
      .eq("drill_set_id", setId)
      .eq("status", "mastered")
      .limit(1)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ alreadyStudied: true });
    }

    const now = new Date().toISOString();
    const { error } = await supabase.from("capitalization_attempts").insert({
      student_name: name,
      school_name: (body.schoolName || "").trim(),
      drill_set_id: setId,
      status: "mastered",
      submissions_count: 1,
      lines_correct: 0,
      started_at: now,
      completed_at: now,
    });

    if (error) throw error;
    return NextResponse.json({ studied: true });
  } catch (error: any) {
    console.error("Study card API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to record study progress" },
      { status: 500 }
    );
  }
}

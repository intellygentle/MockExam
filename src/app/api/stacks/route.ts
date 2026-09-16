import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * GET /api/stacks?student_name=Jane
 *
 * Returns all lesson stacks with their drill sets + student progress.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const studentName = url.searchParams.get("student_name") || "";

    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all stacks
    const { data: stacks, error: stacksError } = await supabase
      .from("lesson_stacks")
      .select("*")
      .order("created_at", { ascending: true });

    if (stacksError) throw stacksError;

    // Fetch all stack items with drill set details
    const result = await Promise.all(
      (stacks || []).map(async (stack: any) => {
        const { data: items } = await supabase
          .from("lesson_stack_items")
          .select("drill_set_id, sort_order")
          .eq("stack_id", stack.id)
          .order("sort_order", { ascending: true });

        const drillSetIds = (items || []).map((i: any) => i.drill_set_id);

        if (drillSetIds.length === 0) {
          return { ...stack, drillSets: [] };
        }

        const { data: sets } = await supabase
          .from("drill_sets")
          .select("*")
          .in("id", drillSetIds);

        // Enrich drill sets with subject name and question count
        const enrichedSets = await Promise.all(
          (sets || []).map(async (set: any) => {
            let subjectName = "General";
            if (set.subject_id) {
              const { data: subj } = await supabase
                .from("subjects")
                .select("name")
                .eq("id", set.subject_id)
                .maybeSingle();
              if (subj) subjectName = subj.name;
            }

            const cardType = set.card_type || "quiz";
            const isLessonCard =
              cardType === "capitalization" ||
              cardType === "sentence_types" ||
              cardType === "sentence_combining" ||
              cardType === "true_false" ||
              cardType === "combine_seq" ||
              cardType === "error_correction" ||
              cardType === "para_gapfill" ||
              cardType === "sentence_expansion" ||
              cardType === "sentence_expansion_mcq" ||
              cardType === "word_table" ||
              cardType === "study" ||
              cardType === "definition_recall";
            const isPassageCard = cardType === "passage";
            const isVocabCard = cardType === "vocabulary";

            let questionCount = set.question_count;
            // For lesson cards the count comes from the server-side definition
            if (isLessonCard) {
              try {
                const { getLessonCard } = await import("@/lib/server/lesson-cards");
                const card = getLessonCard(cardType, set.capitalization_slug);
                if (card) questionCount = card.questions.length;
              } catch {}
            }

            // Student progress for this set
            let mastered = false;
            let totalAttempts = 0;
            if (studentName.trim()) {
              // Passage & vocab cards are not auto-graded
              if (isPassageCard || isVocabCard) {
                const { data: attempts } = await supabase
                  .from("drill_attempts")
                  .select("completed, mastered, total_questions, correct_answers")
                  .eq("student_name", studentName.trim())
                  .eq("drill_set_id", set.id);
                const completedAttempts = (attempts || []).filter((a: any) =>
                  !!a.completed && !!a.mastered && (a.total_questions ?? 0) > 0 && (a.correct_answers ?? 0) >= (a.total_questions ?? 0)
                );
                totalAttempts = completedAttempts.length;
                mastered = completedAttempts.length > 0;
              } else if (isLessonCard) {
                const { data: attempts } = await supabase
                  .from("capitalization_attempts")
                  .select("*")
                  .eq("student_name", studentName.trim())
                  .eq("drill_set_id", set.id);
                if (attempts) {
                  totalAttempts = attempts.length;
                  mastered = attempts.some((a: any) => a.status === "mastered");
                }
              } else {
                const { data: attempts } = await supabase
                  .from("drill_attempts")
                  .select("*")
                  .eq("student_name", studentName.trim())
                  .eq("drill_set_id", set.id);
                if (attempts) {
                  totalAttempts = attempts.length;
                  mastered = attempts.some(
                    (a: any) =>
                      !!a.completed &&
                      (a.total_questions ?? 0) > 0 &&
                      (a.correct_answers ?? 0) >= (a.total_questions ?? 0)
                  );
                }
              }
            }

            return {
              ...set,
              question_count: questionCount,
              subjectName,
              mastered,
              totalAttempts,
            };
          })
        );

        return {
          ...stack,
          drillSets: enrichedSets,
        };
      })
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Stacks API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load stacks" },
      { status: 500 }
    );
  }
}

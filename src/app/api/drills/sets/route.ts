import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getLessonCard } from "@/lib/server/lesson-cards";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const studentName = url.searchParams.get("student_name") || "";

    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all drill sets
    const { data: sets, error: setsError } = await supabase
      .from("drill_sets")
      .select("*")
      .order("created_at", { ascending: false });

    if (setsError) throw setsError;

    // For each set, get subject name and question count
    const result = await Promise.all(
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
        const isLessonCard = cardType === "capitalization" || cardType === "sentence_types" || cardType === "sentence_combining" || cardType === "true_false";
        // For lesson cards the item count comes from the server store
        let questionCount = set.question_count;
        if (isLessonCard) {
          const cardDef = getLessonCard(cardType, set.capitalization_slug);
          if (cardDef) questionCount = cardDef.questions.length;
        }

        // Get student's best attempt if studentName provided
        let bestAttempt: any = null;
        let totalAttempts = 0;
        let mastered = false;
        let attemptHistory: any[] = [];
        if (studentName.trim()) {
          if (isLessonCard) {
            // Lesson cards track attempts + retries separately
            const { data: attempts } = await supabase
              .from("capitalization_attempts")
              .select("*")
              .eq("student_name", studentName.trim())
              .eq("drill_set_id", set.id)
              .order("started_at", { ascending: false });
            const capAttempts = attempts || [];

            totalAttempts = capAttempts.length;
            mastered = capAttempts.some((a: any) => a.status === "mastered");

            attemptHistory = capAttempts
              .slice()
              .sort((x: any, y: any) => new Date(x.started_at).getTime() - new Date(y.started_at).getTime())
              .map((a: any, i: number) => {
                const isMastered = a.status === "mastered";
                const duration = a.completed_at
                  ? Math.round((new Date(a.completed_at).getTime() - new Date(a.started_at).getTime()) / 1000)
                  : 0;
                return {
                  tryNumber: i + 1,
                  completed: isMastered,
                  correctAnswers: a.lines_correct,
                  totalQuestions: questionCount,
                  percentage: Math.round((a.lines_correct / Math.max(questionCount, 1)) * 100),
                  timeSpentSeconds: duration,
                  mastered: isMastered,
                  submissions: a.submissions_count,
                };
              });

            if (capAttempts.length > 0) {
              const latest = capAttempts[0];
              const isMastered = latest.status === "mastered";
              const duration = latest.completed_at
                ? Math.round((new Date(latest.completed_at).getTime() - new Date(latest.started_at).getTime()) / 1000)
                : 0;
              bestAttempt = {
                id: latest.id,
                completed: isMastered,
                correctAnswers: latest.lines_correct,
                totalQuestions: questionCount,
                timeSpentSeconds: duration,
                percentage: Math.round((latest.lines_correct / Math.max(questionCount, 1)) * 100),
                submissions: latest.submissions_count,
              };
            }
          } else {
            const { data: attempts } = await supabase
              .from("drill_attempts")
              .select("*")
              .eq("student_name", studentName.trim())
              .eq("drill_set_id", set.id)
              .order("created_at", { ascending: false });

            totalAttempts = (attempts || []).length;
            if (attempts && attempts.length > 0) {
              // Mastered = any completed attempt with every question correct
              mastered = (attempts || []).some(
                (a: any) => !!a.completed && (a.total_questions ?? 0) > 0 && (a.correct_answers ?? 0) >= (a.total_questions ?? 0)
              );

              // Chronological try history (try 1 → try N) for repractice feedback
              attemptHistory = (attempts || [])
                .slice()
                .sort((x: any, y: any) => new Date(x.created_at).getTime() - new Date(y.created_at).getTime())
                .map((a: any, i: number) => ({
                  tryNumber: i + 1,
                  completed: !!a.completed,
                  correctAnswers: a.correct_answers,
                  totalQuestions: a.total_questions,
                  percentage: Math.round((a.correct_answers / Math.max(a.total_questions, 1)) * 100),
                  timeSpentSeconds: a.time_spent_seconds || 0,
                  mastered: !!a.completed && (a.total_questions ?? 0) > 0 && (a.correct_answers ?? 0) >= (a.total_questions ?? 0),
                }));

              // Find best completed attempt by score
              const completed = attempts.filter((a: any) => a.completed);
              if (completed.length > 0) {
                bestAttempt = completed.reduce((best: any, curr: any) =>
                  (curr.correct_answers / Math.max(curr.total_questions, 1)) >
                  (best.correct_answers / Math.max(best.total_questions, 1))
                    ? curr
                    : best
                );
              } else {
                bestAttempt = attempts[0]; // In-progress attempt
              }
            }
          }
        }

        return {
          ...set,
          question_count: questionCount,
          subjectName,
          mastered,
          attemptHistory,
          bestAttempt: bestAttempt
            ? {
                id: bestAttempt.id,
                completed: bestAttempt.completed,
                correctAnswers: bestAttempt.correctAnswers ?? bestAttempt.correct_answers,
                totalQuestions: bestAttempt.totalQuestions ?? bestAttempt.total_questions,
                timeSpentSeconds: bestAttempt.timeSpentSeconds ?? bestAttempt.time_spent_seconds,
                percentage: Math.round(
                  ((bestAttempt.correctAnswers ?? bestAttempt.correct_answers ?? 0) / Math.max(bestAttempt.totalQuestions ?? bestAttempt.total_questions ?? 1, 1)) * 100
                ),
                submissions: bestAttempt.submissions,
              }
            : null,
          totalAttempts,
        };
      })
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Drill sets API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load drill sets" },
      { status: 500 }
    );
  }
}

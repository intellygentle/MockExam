import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { levelIds, studentName } = body as {
      levelIds: number[];
      studentName?: string;
    };

    if (!levelIds || !Array.isArray(levelIds) || levelIds.length === 0) {
      return NextResponse.json({ error: "No level IDs provided" }, { status: 400 });
    }

    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all question IDs linked to these levels
    const { data: levelQuestions, error: lqError } = await supabase
      .from("material_level_questions")
      .select("question_id")
      .in("level_id", levelIds);

    if (lqError) throw lqError;

    if (!levelQuestions || levelQuestions.length === 0) {
      return NextResponse.json({ questions: [], error: "No questions found for these levels" });
    }

    const questionIds = levelQuestions.map((lq: any) => lq.question_id);

    // Fetch the actual questions
    const { data: questions, error: qError } = await supabase
      .from("questions")
      .select("*")
      .in("id", questionIds)
      .order("id");

    if (qError) throw qError;

    // Also fetch progress info for this student if provided
    let progressMap: Record<number, boolean> = {};
    if (studentName) {
      const { data: progress } = await supabase
        .from("student_material_progress")
        .select("level_id, completed")
        .in("level_id", levelIds)
        .eq("student_name", studentName);

      if (progress) {
        for (const p of progress) {
          progressMap[p.level_id] = p.completed;
        }
      }
    }

    // Transform questions to the format expected by QuestionCard
    const formatted = (questions || []).map((q: any) => {
      const options: Record<string, string> = {};
      if (q.option_a) options.a = q.option_a;
      if (q.option_b) options.b = q.option_b;
      if (q.option_c) options.c = q.option_c;
      if (q.option_d) options.d = q.option_d;
      if (q.option_e) options.e = q.option_e;

      return {
        id: q.id,
        category: q.category || "",
        question: q.question,
        options,
        correct: q.correct_option,
        explanation: q.explanation || "",
        passage: q.passage || undefined,
        instruction: q.instruction || undefined,
      };
    });

    return NextResponse.json({
      questions: formatted,
      progress: progressMap,
    });
  } catch (error: any) {
    console.error("Quiz API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load quiz" },
      { status: 500 }
    );
  }
}

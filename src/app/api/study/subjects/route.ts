import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all subjects (study materials can be for any subject)
    const { data: subjects, error: subjError } = await supabase
      .from("subjects")
      .select("*")
      .order("name");

    if (subjError) throw subjError;

    // Fetch all study materials
    const { data: materials, error: matError } = await supabase
      .from("study_materials")
      .select("*")
      .order("title");

    if (matError) throw matError;

    // Count questions per level (for material_level_questions)
    const { data: levelQuestions, error: lqError } = await supabase
      .from("material_level_questions")
      .select("level_id");

    if (lqError) throw lqError;

    // Count question IDs per level
    const questionCountByLevel = new Map<number, number>();
    for (const lq of levelQuestions || []) {
      questionCountByLevel.set(
        lq.level_id,
        (questionCountByLevel.get(lq.level_id) || 0) + 1
      );
    }

    // Count cards per level
    const { data: cards, error: cardsError } = await supabase
      .from("material_cards")
      .select("level_id");

    if (cardsError) throw cardsError;

    const cardCountByLevel = new Map<number, number>();
    for (const c of cards || []) {
      cardCountByLevel.set(c.level_id, (cardCountByLevel.get(c.level_id) || 0) + 1);
    }

    // Fetch levels for count
    const { data: levels, error: levelsError } = await supabase
      .from("material_levels")
      .select("id, material_id")
      .order("level_number");

    if (levelsError) throw levelsError;

    // Deduplicate subjects by name (same subject may exist for different departments/levels)
    const seenSubjects = new Map<string, any>();
    for (const subject of subjects) {
      if (!seenSubjects.has(subject.name)) {
        // Use the first occurrence's id for the grouping
        seenSubjects.set(subject.name, subject);
      }
    }
    const uniqueSubjects = Array.from(seenSubjects.values());

    // Build response — subjects with their materials and level counts
    const result = uniqueSubjects.map((subject: any) => {
      // Find materials matching ANY subject entry with this name
      const matchingSubjectIds = subjects
        .filter((s: any) => s.name === subject.name)
        .map((s: any) => s.id);

      const subjectMaterials = (materials || [])
        .filter((m: any) => matchingSubjectIds.includes(m.subject_id))
        .map((m: any) => {
          const materialLevels = (levels || []).filter(
            (l: any) => l.material_id === m.id
          );
          const totalCards = materialLevels.reduce(
            (sum: number, l: any) => sum + (cardCountByLevel.get(l.id) || 0),
            0
          );
          const totalQuestions = materialLevels.reduce(
            (sum: number, l: any) => sum + (questionCountByLevel.get(l.id) || 0),
            0
          );
          return {
            ...m,
            levelCount: materialLevels.length,
            totalCards,
            totalQuestions,
          };
        });

      return {
        id: subject.id,
        name: subject.name,
        department_id: subject.department_id,
        level: subject.level,
        materials: subjectMaterials,
        materialCount: subjectMaterials.length,
      };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Study subjects API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load study subjects" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ materialId: string }> }
) {
  try {
    const { materialId } = await params;
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const materialIdNum = parseInt(materialId);
    if (isNaN(materialIdNum)) {
      return NextResponse.json({ error: "Invalid material ID" }, { status: 400 });
    }

    // Fetch the material
    const { data: material, error: matError } = await supabase
      .from("study_materials")
      .select("*")
      .eq("id", materialIdNum)
      .single();

    if (matError || !material) {
      return NextResponse.json({ error: "Material not found" }, { status: 404 });
    }

    // Fetch levels
    const { data: levels, error: lvlError } = await supabase
      .from("material_levels")
      .select("*")
      .eq("material_id", materialIdNum)
      .order("level_number");

    if (lvlError) throw lvlError;

    // Fetch all cards for these levels
    const levelIds = (levels || []).map((l: any) => l.id);
    const { data: cards, error: cardsError } = await supabase
      .from("material_cards")
      .select("*")
      .in("level_id", levelIds.length > 0 ? levelIds : [0])
      .order("card_number");

    if (cardsError) throw cardsError;

    // Fetch question count per level
    const { data: levelQuestions, error: lqError } = await supabase
      .from("material_level_questions")
      .select("level_id")
      .in("level_id", levelIds.length > 0 ? levelIds : [0]);

    if (lqError) throw lqError;

    const questionCountByLevel = new Map<number, number>();
    for (const lq of levelQuestions || []) {
      questionCountByLevel.set(
        lq.level_id,
        (questionCountByLevel.get(lq.level_id) || 0) + 1
      );
    }

    // Group cards by level
    const cardsByLevel = new Map<number, any[]>();
    for (const card of cards || []) {
      if (!cardsByLevel.has(card.level_id)) cardsByLevel.set(card.level_id, []);
      cardsByLevel.get(card.level_id)!.push(card);
    }

    // Build levels with nested cards
    const levelsWithCards = (levels || []).map((level: any) => ({
      ...level,
      cards: cardsByLevel.get(level.id) || [],
      cardCount: (cardsByLevel.get(level.id) || []).length,
      questionCount: questionCountByLevel.get(level.id) || 0,
    }));

    return NextResponse.json({
      ...material,
      levels: levelsWithCards,
    });
  } catch (error: any) {
    console.error("Material detail API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load material" },
      { status: 500 }
    );
  }
}

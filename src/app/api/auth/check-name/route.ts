import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const { name } = await req.json();
    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }

    const cleanName = name.trim();
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Case-insensitive exact match
    const { data: exactMatch } = await supabase
      .from("students")
      .select("id, display_name")
      .ilike("name", cleanName)
      .maybeSingle();

    if (exactMatch) {
      return NextResponse.json({
        exists: true,
        displayName: exactMatch.display_name,
        suggestions: [],
      });
    }

    // Find similar names (case-insensitive contains or starts with)
    const { data: similar } = await supabase
      .from("students")
      .select("display_name")
      .or(`name.ilike.%${cleanName}%,name.ilike.${cleanName}%`)
      .limit(10);

    const existingNames = (similar || []).map((s) => s.display_name);

    // Generate suggestions if name is similar to existing ones
    const suggestions = generateSuggestions(cleanName, existingNames);

    return NextResponse.json({
      exists: false,
      displayName: null,
      suggestions,
    });
  } catch {
    return NextResponse.json({ error: "Failed to check name." }, { status: 500 });
  }
}

function generateSuggestions(name: string, existingNames: string[]): string[] {
  const lowerName = name.toLowerCase();
  const suggestions: string[] = [];
  const currentYear = new Date().getFullYear();

  // Check if base name + year is available
  const candidates = [
    `${name}_${currentYear}`,
    `${name}${currentYear}`,
    `${name}_study`,
    `${name}_exam`,
    `${name}_jss3`,
    `${name}_ss3`,
  ];

  // Also try numbered suffixes
  for (let i = 2; candidates.length < 8; i++) {
    candidates.push(`${name}${i}`);
    if (i > 20) break;
  }

  for (const candidate of candidates) {
    if (suggestions.length >= 5) break;
    const isTaken = existingNames.some(
      (en) => en.toLowerCase() === candidate.toLowerCase()
    );
    if (!isTaken && candidate.toLowerCase() !== lowerName) {
      suggestions.push(candidate);
    }
  }

  return suggestions;
}

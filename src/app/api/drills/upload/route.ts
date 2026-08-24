import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  const rawLines = text.split(/\r?\n/);
  let buffer = "";
  let inQuotes = false;

  for (const line of rawLines) {
    buffer += (buffer ? "\n" : "") + line;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') inQuotes = !inQuotes;
    }
    if (!inQuotes && buffer.trim().length > 0) {
      const values: string[] = [];
      let current = "";
      let q = false;
      for (let i = 0; i < buffer.length; i++) {
        const c = buffer[i];
        if (c === '"') {
          q = !q;
        } else if (c === "," && !q) {
          values.push(current.trim());
          current = "";
        } else {
          current += c;
        }
      }
      values.push(current.trim());
      if (values.length > 0 && values[0] !== "") rows.push(values);
      buffer = "";
    }
  }

  return rows;
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const title = (formData.get("title") as string) || "";
    const description = (formData.get("description") as string) || "";
    const timeLimitMin = parseInt((formData.get("time_limit_minutes") as string) || "10", 10);
    const level = (formData.get("level") as string) || "ss3";
    const subjectName = (formData.get("subject_name") as string) || "";
    const cardType = (formData.get("card_type") as string) || "quiz";
    const isPassage = cardType === "passage";
    const isVocab = cardType === "vocabulary";

    if (!file) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }
    if (!title.trim()) {
      return NextResponse.json({ error: "Drill set title is required." }, { status: 400 });
    }
    if (isNaN(timeLimitMin) || timeLimitMin < 1) {
      return NextResponse.json({ error: "Time limit must be at least 1 minute." }, { status: 400 });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    const text = await file.text();
    const rows = parseCSV(text);

    if (rows.length < 2) {
      return NextResponse.json({ error: "CSV must have a header row and at least one data row." }, { status: 400 });
    }

    // Validate header
    const header = rows[0].map((h) => h.toLowerCase());
    const baseHeader = ["question", "option_a", "option_b", "option_c", "option_d", "correct_option", "explanation"];
    const hasOptionE = header.includes("option_e");
    const hasPassage = header.includes("passage");
    const hasInstruction = header.includes("instruction");

    const expectedHeader = [...baseHeader];
    if (hasPassage) expectedHeader.push("passage");
    if (hasInstruction) expectedHeader.push("instruction");
    if (hasOptionE) expectedHeader.push("option_e");

    // For vocabulary, only need question + explanation
    if (isVocab) {
      if (!header.includes("question") || !header.includes("explanation")) {
        return NextResponse.json({
          error: "Vocabulary CSV must have columns: question, explanation (question=word, explanation=meaning)",
        }, { status: 400 });
      }
    } else if (header.length < 7 || !baseHeader.every((h) => header.includes(h))) {
      return NextResponse.json({
        error: `Invalid CSV format. Expected columns: ${expectedHeader.join(", ")}`,
      }, { status: 400 });
    }

    const colIndex = (name: string) => header.indexOf(name);
    const colQ = colIndex("question");
    const colOA = colIndex("option_a");
    const colOB = colIndex("option_b");
    const colOC = colIndex("option_c");
    const colOD = colIndex("option_d");
    const colOE = hasOptionE ? colIndex("option_e") : -1;
    const colPassage = hasPassage ? colIndex("passage") : -1;
    const colCorrect = colIndex("correct_option");
    const colExplanation = colIndex("explanation");
    const colInstruction = hasInstruction ? colIndex("instruction") : -1;

    const dataRows = rows.slice(1);
    const errors: { row: number; message: string }[] = [];
    const questionsToInsert: any[] = [];

    // Find or create subject
    let subjectId: number | null = null;
    if (subjectName.trim()) {
      const { data: existingSubject } = await supabase
        .from("subjects")
        .select("id")
        .eq("name", subjectName.trim())
        .eq("level", level)
        .maybeSingle();

      if (existingSubject) {
        subjectId = existingSubject.id;
      } else {
        const { data: newSubject, error: subjError } = await supabase
          .from("subjects")
          .insert({ name: subjectName.trim(), level })
          .select("id")
          .single();
        if (subjError) throw subjError;
        subjectId = newSubject.id;
      }
    }

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowNum = i + 2;

      const question = row[colQ]?.trim();
      const option_a = row[colOA]?.trim();
      const option_b = row[colOB]?.trim();
      const option_c = row[colOC]?.trim();
      const option_d = row[colOD]?.trim();
      const option_e = colOE >= 0 ? row[colOE]?.trim() : "";
      const passage = colPassage >= 0 ? row[colPassage]?.trim() : "";
      const instruction = colInstruction >= 0 ? row[colInstruction]?.trim() : "";
      const correctOption = row[colCorrect]?.trim();
      const explanation = row[colExplanation]?.trim();

      if (!question) {
        errors.push({ row: rowNum, message: "Missing question text." });
        continue;
      }
      if (!isPassage && !isVocab && (!option_a || !option_b || !option_c || !option_d)) {
        errors.push({ row: rowNum, message: "Missing required option fields." });
        continue;
      }
      if (!isPassage && !isVocab && !["a", "b", "c", "d", "e"].includes(correctOption?.toLowerCase() || "")) {
        errors.push({ row: rowNum, message: `Invalid correct_option "${correctOption}".` });
        continue;
      }

      questionsToInsert.push({
        subject_id: subjectId,
        category: subjectName || "General",
        level,
        year: new Date().getFullYear(),
        question,
        option_a: (isPassage || isVocab) ? "" : option_a,
        option_b: (isPassage || isVocab) ? "" : option_b,
        option_c: (isPassage || isVocab) ? "" : option_c,
        option_d: (isPassage || isVocab) ? "" : option_d,
        option_e: option_e || "",
        passage: passage || "",
        instruction: instruction || "",
        correct_option: (isPassage || isVocab) ? "a" : correctOption.toLowerCase(),
        explanation: explanation || "",
      });
    }

    if (questionsToInsert.length === 0) {
      return NextResponse.json({ error: "No valid questions found in CSV." }, { status: 400 });
    }

    // Insert questions
    const { data: insertedQuestions, error: qError } = await supabase
      .from("questions")
      .insert(questionsToInsert)
      .select("id");

    if (qError) {
      return NextResponse.json({ error: `Failed to insert questions: ${qError.message}` }, { status: 500 });
    }

    // Create drill set
    const { data: drillSet, error: dsError } = await supabase
      .from("drill_sets")
      .insert({
        title: title.trim(),
        description: description.trim(),
        subject_id: subjectId,
        level,
        time_limit_minutes: timeLimitMin,
        question_count: insertedQuestions.length,
        card_type: cardType,
      })
      .select()
      .single();

    if (dsError) throw dsError;

    // Link questions to drill set
    const questionLinks = insertedQuestions.map((q: any, idx: number) => ({
      drill_set_id: drillSet.id,
      question_id: q.id,
      question_number: idx + 1,
    }));

    const { error: linkError } = await supabase
      .from("drill_set_questions")
      .insert(questionLinks);

    if (linkError) throw linkError;

    return NextResponse.json({
      success: true,
      drillSet,
      inserted: insertedQuestions.length,
      errors,
      totalRows: dataRows.length,
    });
  } catch (err: any) {
    console.error("Drill upload error:", err);
    return NextResponse.json({ error: err.message || "Upload failed." }, { status: 500 });
  }
}

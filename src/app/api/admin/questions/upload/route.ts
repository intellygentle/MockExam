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
    // If quotes are closed and buffer has content, parse the complete row
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

    if (!file) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    const text = await file.text();
    const rows = parseCSV(text);

    if (rows.length < 2) {
      return NextResponse.json({ error: "CSV must have a header row and at least one data row." }, { status: 400 });
    }

    // Validate header
    const header = rows[0].map((h) => h.toLowerCase());
    const baseHeader = ["level", "subject", "year", "question", "option_a", "option_b", "option_c", "option_d", "correct_option", "explanation"];
    const optionECol = "option_e";
    const passageCol = "passage";

    // Determine columns: 10 (base), 11 (+passage), 11 (+option_e), 12 (+both)
    const cols = new Set(header);
    const hasOptionEHeader = cols.has(optionECol);
    const hasPassageHeader = cols.has(passageCol);

    // Build the expected header order conditionally
    const expectedHeader = [...baseHeader];
    if (hasPassageHeader) expectedHeader.push(passageCol);
    if (hasOptionEHeader) expectedHeader.push(optionECol);

    if (header.length < 10 || header.length > 12 || !expectedHeader.every((h, i) => header[i] === h)) {
      return NextResponse.json({
        error: `Invalid CSV format. Expected columns: ${baseHeader.join(", ")}${hasPassageHeader ? `, ${passageCol}` : ""}${hasOptionEHeader ? `, ${optionECol}` : ""}`,
      }, { status: 400 });
    }

    // Find column indices
    const colIndex = (name: string) => header.indexOf(name);

    // Initialize Supabase admin client
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // First pass: collect all unique (level, subject) pairs and validate basics
    const dataRows = rows.slice(1);
    const errors: { row: number; message: string }[] = [];
    const maxYear = new Date().getFullYear() + 2;

    // Collect unique subject+level combos and pre-validate rows
    const subjectLevels = new Set<string>();
    const rowSubjects: { index: number; rowNum: number; level: string; subjectName: string }[] = [];

    const colLevel = colIndex("level");
    const colSubject = colIndex("subject");
    const colYear = colIndex("year");
    const colQuestion = colIndex("question");
    const colOA = colIndex("option_a");
    const colOB = colIndex("option_b");
    const colOC = colIndex("option_c");
    const colOD = colIndex("option_d");
    const colCorrect = colIndex("correct_option");
    const colExplanation = colIndex("explanation");
    const colPassage = hasPassageHeader ? colIndex("passage") : -1;
    const colOE = hasOptionEHeader ? colIndex("option_e") : -1;

    const expectedCols = expectedHeader.length;

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowNum = i + 2;

      if (row.length < expectedCols) {
        errors.push({ row: rowNum, message: `Expected ${expectedCols} columns but found ${row.length}. Skipping.` });
        continue;
      }

      const level = row[colLevel]?.trim();
      const subjectName = row[colSubject]?.trim();
      const yearStr = row[colYear]?.trim();

      if (level !== "jss3" && level !== "ss3") {
        errors.push({ row: rowNum, message: `Invalid level "${level}". Must be "jss3" or "ss3".` });
        continue;
      }

      const year = parseInt(yearStr, 10);
      if (isNaN(year) || year < 2000 || year > maxYear) {
        errors.push({ row: rowNum, message: `Invalid year "${yearStr}". Must be between 2000 and ${maxYear}.` });
        continue;
      }

      if (!subjectName) {
        errors.push({ row: rowNum, message: "Subject name is empty." });
        continue;
      }

      subjectLevels.add(`${level}:${subjectName.toLowerCase()}`);
      rowSubjects.push({ index: i, rowNum, level, subjectName });
    }

    // Fetch existing subjects
    const { data: allSubjects } = await supabase.from("subjects").select("id, name, level");
    const subjectMap = new Map<string, number>();
    if (allSubjects) {
      for (const s of allSubjects) {
        subjectMap.set(`${s.level}:${s.name.toLowerCase()}`, s.id);
      }
    }

    // Auto-create any missing subjects
    const subjectsToCreate: { name: string; level: string }[] = [];
    const missingSubjects: string[] = [];

    for (const key of subjectLevels) {
      if (!subjectMap.has(key)) {
        const [level, name] = key.split(":");
        // Restore original casing from the first occurrence in the CSV
        const originalName = rowSubjects.find(
          (rs) => rs.level === level && rs.subjectName.toLowerCase() === name
        )?.subjectName || name;
        subjectsToCreate.push({ name: originalName, level });
        missingSubjects.push(key);
      }
    }

    if (subjectsToCreate.length > 0) {
      const { data: newSubjects, error: insertSubjectError } = await supabase
        .from("subjects")
        .insert(subjectsToCreate)
        .select("id, name, level");

      if (insertSubjectError) {
        return NextResponse.json({
          error: `Failed to auto-create subjects: ${insertSubjectError.message}`,
          missingSubjects,
        }, { status: 500 });
      }

      // Add new subjects to the map
      if (newSubjects) {
        for (const s of newSubjects) {
          subjectMap.set(`${s.level}:${s.name.toLowerCase()}`, s.id);
        }
      }
    }

    // Second pass: build questions array
    const questions: any[] = [];

    for (const { index, rowNum, level, subjectName } of rowSubjects) {
      const row = dataRows[index];
      const yearStr = row[colYear]?.trim();
      const question = row[colQuestion]?.trim();
      const option_a = row[colOA]?.trim();
      const option_b = row[colOB]?.trim();
      const option_c = row[colOC]?.trim();
      const option_d = row[colOD]?.trim();
      const option_e = colOE >= 0 ? row[colOE]?.trim() : "";
      const passage = colPassage >= 0 ? row[colPassage]?.trim() : "";
      const correctOption = row[colCorrect]?.trim();
      const explanation = row[colExplanation]?.trim();

      const year = parseInt(yearStr, 10);
      const subjectKey = `${level}:${subjectName.toLowerCase()}`;
      const subjectId = subjectMap.get(subjectKey);

      if (!subjectId) {
        errors.push({ row: rowNum, message: `Subject "${subjectName}" could not be resolved for ${level}.` });
        continue;
      }

      // Validate correct_option (a, b, c, d, or e)
      if (!["a", "b", "c", "d", "e"].includes(correctOption.toLowerCase())) {
        errors.push({ row: rowNum, message: `Invalid correct_option "${correctOption}". Must be a, b, c, d, or e.` });
        continue;
      }

      if (!question || !option_a || !option_b || !option_c || !option_d) {
        errors.push({ row: rowNum, message: "Missing required fields (question or options A-D)." });
        continue;
      }

      const qRecord: Record<string, any> = {
        subject_id: subjectId,
        category: subjectName,
        level,
        year,
        question,
        option_a,
        option_b,
        option_c,
        option_d,
        option_e: option_e || "",
        passage: passage || "",
        correct_option: correctOption.toLowerCase(),
        explanation,
      };
      questions.push(qRecord);
    }

    // Insert valid questions in batch
    let inserted = 0;
    if (questions.length > 0) {
      const { error: insertError } = await supabase.from("questions").insert(questions);
      if (insertError) {
        return NextResponse.json({ error: `Database insert failed: ${insertError.message}` }, { status: 500 });
      }
      inserted = questions.length;
    }

    return NextResponse.json({
      success: true,
      inserted,
      errors,
      totalRows: dataRows.length,
      autoCreatedSubjects: subjectsToCreate.length > 0
        ? subjectsToCreate.map(s => `${s.name} (${s.level})`)
        : undefined,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Upload failed." }, { status: 500 });
  }
}

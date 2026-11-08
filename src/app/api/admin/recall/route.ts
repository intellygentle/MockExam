import { NextResponse } from "next/server";
import { recallId, recallKinds } from "@/lib/subject-recall";
import { isRecallAdmin, recallClient, recallError } from "@/lib/server/subject-recall";

export const dynamic = "force-dynamic";
const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });

export async function GET(request: Request) {
  try {
    if (!(await isRecallAdmin())) return json({ error: "Sign in to the admin portal." }, 401);
    const params = new URL(request.url).searchParams;
    const id = params.get("lesson");
    const page = Number(params.get("page") || 1);
    if ((id && !recallId(id)) || !Number.isSafeInteger(page) || page < 1 || page > 10000) return json({ error: "Invalid lesson request." }, 400);
    const db = recallClient(true);
    if (id) {
      const [lesson, cards, report, topics] = await Promise.all([
        db.from("recall_lessons").select("*, subject:subjects(id, name, level)").eq("id", id).maybeSingle(),
        db.from("recall_cards").select("id, lesson_id, section_id, heading, kind, prompt, answer, explanation, answer_format, position").eq("lesson_id", id).order("position").limit(50),
        db.rpc("recall_lesson_report", { p_lesson_id: id, p_offset: (page - 1) * 50 }),
        db.rpc("recall_topic_report", { p_lesson_id: id }),
      ]);
      if (lesson.error || cards.error || report.error) throw new Error("Apply the subject-recall migrations (v6, then v7) to set up notes and practice.");
      if (topics.error) throw new Error("Apply migration-v8-recall-refinements.sql to enable note-level learning insights.");
      if (!lesson.data) return json({ error: "Lesson not found." }, 404);
      return json({ lesson: lesson.data, cards: cards.data, report: report.data, topics: topics.data });
    }
    const [lessons, subjects] = await Promise.all([
      db.from("recall_lessons").select("*", { count: "exact" }).order("created_at", { ascending: false }).order("id").range((page - 1) * 20, page * 20 - 1),
      db.from("subjects").select("id, name, level").order("name").limit(200),
    ]);
    if (lessons.error || subjects.error) throw new Error("Apply migration-v6-subject-recall.sql to set up subject notes.");
    return json({ lessons: lessons.data, count: lessons.count, subjects: subjects.data });
  } catch (error) { return json({ error: recallError(error) }, 500); }
}

export async function POST(request: Request) {
  try {
    if (!(await isRecallAdmin())) return json({ error: "Sign in to the admin portal." }, 401);
    const raw = await request.text();
    if (raw.length > 200000) return json({ error: "Split this content into smaller lessons." }, 400);
    const body = JSON.parse(raw);
    if (!body || (body.id != null && !recallId(body.id)) || !Number.isSafeInteger(body.subject_id) || body.subject_id <= 0 ||
      typeof body.title !== "string" || body.title.trim().length < 2 || body.title.length > 120 ||
      typeof body.introduction !== "string" || body.introduction.length > 10000 || typeof body.is_published !== "boolean" ||
      !Number.isSafeInteger(body.revision) || body.revision < 0 || !Array.isArray(body.cards) || body.cards.length > 50) {
      return json({ error: "Provide a subject, title and up to 50 content pieces." }, 400);
    }
    for (const card of body.cards) {
      if (!card || !recallId(card.id) || (card.section_id != null && !recallId(card.section_id)) || !Object.hasOwn(recallKinds, card.kind) ||
        typeof card.heading !== "string" || card.heading.trim().length < 2 || card.heading.length > 120 ||
        typeof card.prompt !== "string" || card.prompt.trim().length < 2 || card.prompt.length > 400 ||
        typeof card.answer !== "string" || !card.answer.trim() || card.answer.length > 1000 ||
        typeof card.explanation !== "string" || card.explanation.length > 2000 ||
        (card.answer_format != null && !["paragraph", "list"].includes(card.answer_format))) return json({ error: "Each content piece needs a heading, question and exact answer (up to 1,000 characters)." }, 400);
      if (card.answer_format === "list" && (card.answer.split("\n").length > 20 || card.answer.split("\n").some((item: string) => !item.trim()))) {
        return json({ error: "Lists need 1 to 20 non-empty items, one per line." }, 400);
      }
    }
    const db = recallClient(true);
    const schema = await db.from("recall_cards").select("answer_format").limit(0);
    if (schema.error) return json({ error: "Apply migration-v7-recall-sessions.sql before saving content blocks." }, 503);
    const { data, error } = await db.rpc("save_recall_lesson", {
      p_id: body.id ?? null, p_subject_id: body.subject_id, p_title: body.title.trim(),
      p_introduction: body.introduction.trim(), p_published: body.is_published,
      p_revision: body.revision, p_cards: body.cards,
    });
    if (error) return json({ error: error.message }, 400);
    return json({ id: data, revision: body.id == null ? 1 : body.revision + 1 });
  } catch (error) { return json({ error: error instanceof SyntaxError ? "Invalid lesson data." : recallError(error) }, 400); }
}

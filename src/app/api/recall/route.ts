import { NextResponse } from "next/server";
import { recallId } from "@/lib/subject-recall";
import { recallClient, recallError } from "@/lib/server/subject-recall";

export const dynamic = "force-dynamic";
const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const student = params.get("studentName")?.trim() ?? "";
    const school = params.get("schoolName")?.trim() ?? "";
    const subject = params.get("subject");
    const lesson = params.get("lesson");
    const page = Number(params.get("page") || 1);
    if (student.length > 80 || school.length > 120 || (lesson && !recallId(lesson)) ||
      (subject && (!Number.isSafeInteger(Number(subject)) || Number(subject) <= 0)) ||
      !Number.isSafeInteger(page) || page < 1 || page > 10000) return json({ error: "Invalid notes request." }, 400);
    const { data, error } = await recallClient().rpc("recall_library", {
      p_student: student, p_school: school, p_subject_id: subject ? Number(subject) : null,
      p_lesson_id: lesson || null, p_offset: (page - 1) * 12,
    });
    if (error) return json({ error: "Subject notes are being set up. Please try again later." }, 503);
    return json(data);
  } catch (error) { return json({ error: recallError(error) }, 500); }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body.studentName !== "string" || !body.studentName.trim() || body.studentName.length > 80 ||
      typeof body.schoolName !== "string" || body.schoolName.length > 120) return json({ error: "Enter your nickname and school first." }, 400);
    const identity = { p_student: body.studentName.trim(), p_school: body.schoolName.trim() };
    const db = recallClient();
    let response;
    if (body.action === "read" && recallId(body.lessonId) && (body.sectionId == null || recallId(body.sectionId))) {
      response = body.sectionId
        ? await db.rpc("read_recall_note", { ...identity, p_lesson_id: body.lessonId, p_section_id: body.sectionId })
        : await db.rpc("read_recall_lesson", { ...identity, p_lesson_id: body.lessonId });
    } else if (body.action === "start-session" && recallId(body.sessionId) &&
      ["due", "note", "lesson", "master"].includes(body.mode) &&
      (body.lessonId == null || recallId(body.lessonId)) && (body.sectionId == null || recallId(body.sectionId))) {
      response = await db.rpc("start_recall_session", { ...identity, p_session_id: body.sessionId,
        p_mode: body.mode, p_lesson_id: body.lessonId ?? null, p_section_id: body.sectionId ?? null });
    } else if (body.action === "session" && recallId(body.sessionId)) {
      response = await db.rpc("get_recall_session", { ...identity, p_session_id: body.sessionId });
    } else if (body.action === "session-next" && recallId(body.sessionId) &&
      Number.isSafeInteger(body.position) && body.position >= 0) {
      response = await db.rpc("advance_recall_session", { ...identity, p_session_id: body.sessionId, p_position: body.position });
    } else if (body.action === "session-answer" && recallId(body.sessionId) && recallId(body.reviewId) && recallId(body.requestId) &&
      typeof body.answer === "string" && body.answer.length <= 2000 && typeof body.reveal === "boolean") {
      response = await db.rpc("submit_recall_session", { ...identity, p_session_id: body.sessionId,
        p_review_id: body.reviewId, p_request_id: body.requestId, p_answer: body.answer, p_reveal: body.reveal });
    } else if (body.action === "next" && (body.lessonId == null || recallId(body.lessonId)) &&
      (body.previousId == null || recallId(body.previousId))) {
      response = await db.rpc("begin_recall_review", { ...identity, p_lesson_id: body.lessonId ?? null, p_previous_card_id: body.previousId ?? null });
    } else if (body.action === "answer" && recallId(body.reviewId) && recallId(body.requestId) &&
      typeof body.answer === "string" && body.answer.length <= 2000 && typeof body.reveal === "boolean") {
      response = await db.rpc("submit_recall_review", { ...identity, p_review_id: body.reviewId,
        p_request_id: body.requestId, p_answer: body.answer, p_reveal: body.reveal });
    } else return json({ error: "Invalid recall request." }, 400);
    if (response.error) return json({ error: response.error.code === "PGRST202"
      ? "Recall is being updated. Please ask your teacher to apply the recall migrations through v8."
      : response.error.message }, response.error.code === "PGRST202" ? 503 : 400);
    return json(response.data);
  } catch (error) { return json({ error: recallError(error) }, 500); }
}

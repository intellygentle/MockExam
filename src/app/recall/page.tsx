import type { Metadata } from "next";
import SubjectRecall from "@/components/SubjectRecall";
import { recallId, type RecallSessionMode } from "@/lib/subject-recall";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Subject Notes & Recall — Scholars Arena" };

export default async function RecallPage({ searchParams }: { searchParams: Promise<{ review?: string; mode?: string; lesson?: string; note?: string; session?: string }> }) {
  const params = await searchParams;
  const lessonId = recallId(params.lesson) ? params.lesson : undefined;
  const sectionId = recallId(params.note) ? params.note : undefined;
  const requested = params.review === "1" ? "due" : params.mode;
  const mode: RecallSessionMode | undefined = requested === "due" || requested === "master" ? requested
    : requested === "lesson" && lessonId ? "lesson" : requested === "note" && lessonId && sectionId ? "note" : undefined;
  return <SubjectRecall initialMode={mode} initialLessonId={mode === "due" || mode === "master" ? undefined : lessonId}
    initialSectionId={mode === "note" || (!mode && lessonId) ? sectionId : undefined}
    initialSessionId={mode && recallId(params.session) ? params.session : undefined} />;
}

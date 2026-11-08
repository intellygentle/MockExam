export const recallKinds = {
  definition: "Definition", terminology: "Terminology", importance: "Importance",
  features: "Features", functions: "Functions", other: "Other notes",
} as const;

export type RecallCard = {
  id: string; section_id?: string; heading: string; kind: keyof typeof recallKinds;
  prompt: string; answer: string; explanation: string; position?: number;
  answer_format?: "paragraph" | "list";
};
export type RecallStats = {
  total_cards: number; studied_cards: number; due_cards: number; retained_cards: number;
  first_attempts: number; first_correct: number; delayed_attempts: number; delayed_correct: number;
  practised_today: number; next_due_at: string | null;
};
export type RecallLesson = RecallStats & {
  id: string; title: string; introduction: string; subject_id: number; subject_name: string; level: string;
};
export type RecallLibrary = {
  lessons: RecallLesson[]; count: number; stats: RecallStats;
  subjects: { id: number; name: string; level: string }[];
  review_notes: RecallReviewNote[]; review_note_count: number;
};
export type RecallReviewNote = {
  section_id: string; lesson_id: string; heading: string; lesson_title: string; subject_name: string;
  due_cards: number; incorrect_cards: number; studied_cards: number;
  first_attempts: number; first_correct: number; next_due_at: string;
};
export type RecallQueue = {
  card: (Pick<RecallCard, "id" | "heading" | "kind" | "prompt"> & {
    lesson_id: string; lesson_title: string; subject_name: string; review_id: string; delayed: boolean;
  }) | null;
  next_due_at: string | null; server_now: string;
};
export type RecallResult = {
  correct: boolean; expected_answer: string; first_attempt: boolean; delayed: boolean;
  next_due_at: string; review_finished: boolean; scheduled?: boolean;
  items?: { position: number; correct: boolean }[] | null;
};
export type RecallSessionMode = "due" | "note" | "lesson" | "master";
export type RecallSessionQuestion = Pick<RecallCard, "id" | "heading" | "kind" | "prompt" | "answer_format"> & {
  section_id: string; lesson_id: string; lesson_title: string; subject_name: string;
  review_id: string; delayed: boolean; scheduled: boolean; item_count: number;
};
export type RecallSessionScore = Pick<RecallSessionQuestion, "section_id" | "lesson_id" | "heading" | "lesson_title" | "subject_name" | "kind" | "prompt"> & {
  card_id: string; correct: boolean;
};
export type RecallSession = {
  id: string; mode: RecallSessionMode; title: string; status: "active" | "complete" | "changed";
  position: number; total: number; completed: number; card: RecallSessionQuestion | null;
  results: RecallSessionScore[];
  feedback: { result: RecallResult; answer: string; revealed: boolean } | null;
};
export type RecallPracticeConfig = {
  id: string; mode: RecallSessionMode; lessonId?: string; sectionId?: string; resume?: boolean;
};
export type RecallResume = RecallPracticeConfig & { title: string; total: number; completed: number };
export type RecallReport = Omit<RecallStats, "practised_today" | "next_due_at"> & {
  student_name: string; school_name: string; last_reviewed_at: string | null;
};
export type RecallTopicReport = {
  section_id: string; heading: string; total_cards: number; students: number;
  due_cards: number; incorrect_cards: number; first_attempts: number; first_correct: number;
  delayed_attempts: number; delayed_correct: number;
};
export const recallAccuracy = (correct: number, attempts: number) =>
  attempts ? `${Math.round(correct * 100 / attempts)}%` : "Not tested yet";
export const recallDate = (date: string | null) => date
  ? new Date(date).toLocaleString("en-GB", { timeZone: "Africa/Lagos", dateStyle: "medium", timeStyle: "short" }) + " WAT"
  : "Not scheduled";
export const recallId = (value: unknown): value is string => typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export function groupRecallCards(cards: RecallCard[]) {
  const groups: { key: string; cards: RecallCard[] }[] = [];
  const byId = new Map<string, (typeof groups)[number]>();
  for (const card of cards) {
    const key = card.section_id ?? card.id;
    const group = byId.get(key);
    if (group) group.cards.push(card);
    else {
      const next = { key, cards: [card] };
      groups.push(next);
      byId.set(key, next);
    }
  }
  return groups;
}

export function recallPrompt(kind: RecallCard["kind"], heading: string) {
  const topic = heading.trim();
  if (!topic) return "";
  switch (kind) {
    case "definition": return `Define ${topic}.`;
    case "importance": return `Why is ${topic} important?`;
    case "features": return `List the features of ${topic}.`;
    case "functions": return `State the functions of ${topic}.`;
    default: return "";
  }
}

export function moveRecallItem<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (index < 0 || target < 0 || index >= items.length || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export const recallSessionKey = (student: string, school: string) =>
  `scholars-arena-recall-session:${JSON.stringify([student, school])}`;

export async function recallRequest<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, body === undefined ? { cache: "no-store" } : {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Could not save your progress. Please try again.");
  return data as T;
}

export const recallKinds = {
  definition: "Definition", terminology: "Terminology", importance: "Importance",
  features: "Features", other: "Other notes",
} as const;

export type RecallCard = {
  id: string; heading: string; kind: keyof typeof recallKinds;
  prompt: string; answer: string; explanation: string; position?: number;
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
};
export type RecallQueue = {
  card: (Pick<RecallCard, "id" | "heading" | "kind" | "prompt"> & {
    lesson_id: string; lesson_title: string; subject_name: string; review_id: string; delayed: boolean;
  }) | null;
  next_due_at: string | null; server_now: string;
};
export type RecallResult = {
  correct: boolean; expected_answer: string; first_attempt: boolean; delayed: boolean;
  next_due_at: string; review_finished: boolean;
};
export type RecallReport = Omit<RecallStats, "practised_today" | "next_due_at"> & {
  student_name: string; school_name: string; last_reviewed_at: string | null;
};
export const recallAccuracy = (correct: number, attempts: number) =>
  attempts ? `${Math.round(correct * 100 / attempts)}%` : "Not tested yet";
export const recallDate = (date: string | null) => date
  ? new Date(date).toLocaleString("en-GB", { timeZone: "Africa/Lagos", dateStyle: "medium", timeStyle: "short" }) + " WAT"
  : "Not scheduled";
export const recallId = (value: unknown): value is string => typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export async function recallRequest<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, body === undefined ? { cache: "no-store" } : {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Could not save your progress. Please try again.");
  return data as T;
}

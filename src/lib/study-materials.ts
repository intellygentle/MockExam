"use client";

// ─── TYPES ───────────────────────────────────────────────────

export type StudyMaterial = {
  id: number;
  subject_id: number;
  title: string;
  description: string;
  level: "ss3";
  created_at: string;
};

export type MaterialLevel = {
  id: number;
  material_id: number;
  title: string;
  description: string;
  level_number: number;
  created_at: string;
};

export type MaterialCard = {
  id: number;
  level_id: number;
  front: string;
  back: string;
  card_number: number;
  created_at: string;
};

export type MaterialLevelQuestion = {
  id: number;
  level_id: number;
  question_id: number;
};

export type StudentProgress = {
  id: number;
  student_name: string;
  material_id: number;
  level_id: number;
  completed: boolean;
  cards_studied: number;
  completed_at: string | null;
  created_at: string;
};

export type StudentTestAttempt = {
  id: number;
  student_name: string;
  material_id: number;
  level_ids: number[];
  score: number;
  total_questions: number;
  passed: boolean;
  completed_at: string;
};

export type SubjectWithMaterials = {
  id: number;
  name: string;
  department_id: number | null;
  level: string;
  materials: StudyMaterial[];
  materialCount: number;
};

export type MaterialWithLevels = StudyMaterial & {
  levels: (MaterialLevel & {
    cardCount: number;
    questionCount: number;
    completed: boolean;
  })[];
};

// ─── HELPERS ─────────────────────────────────────────────────

export function getLocalStudent(): { name: string } | null {
  if (typeof window === "undefined") return null;
  const name = localStorage.getItem("scholars-arena-name");
  return name ? { name } : null;
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

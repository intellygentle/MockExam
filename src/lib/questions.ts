export type Question = {
  id: number;
  category: "English" | "General Knowledge" | "Current Affairs" | "Constitution" | "Ethics";
  question: string;
  options: Record<"a" | "b" | "c" | "d", string>;
  correct: "a" | "b" | "c" | "d";
  explanation: string;
};

/**
 * Starter questions for offline development.
 * Later, load these from Supabase by querying the questions table.
 */
export const mockQuestions: Question[] = [
  {
    id: 1,
    category: "Constitution",
    question: "Which city is the capital of Nigeria?",
    options: {
      a: "Lagos",
      b: "Abuja",
      c: "Kaduna",
      d: "Kano",
    },
    correct: "b",
    explanation: "Abuja became the capital in 1991, replacing Lagos.",
  },
  {
    id: 2,
    category: "English",
    question: "Pick the grammatically correct sentence.",
    options: {
      a: "He have finished.",
      b: "She done it yesterday.",
      c: "They were playing.",
      d: "I am go to school.",
    },
    correct: "c",
    explanation: "'They were playing.' is the only grammatically sound sentence.",
  },
  {
    id: 3,
    category: "General Knowledge",
    question: "Which instrument is used to measure atmospheric pressure?",
    options: {
      a: "Thermometer",
      b: "Barometer",
      c: "Anemometer",
      d: "Hygrometer",
    },
    correct: "b",
    explanation: "A barometer measures atmospheric pressure.",
  },
];

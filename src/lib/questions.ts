// Supported option keys — dynamically determined based on whether option_e exists
const ALL_OPTIONS = ["a", "b", "c", "d", "e"] as const;
export type OptionKey = (typeof ALL_OPTIONS)[number];

// Dynamically build the options record type (4 or 5 options)
export type OptionsRecord = Partial<Record<OptionKey, string>> & Record<"a" | "b" | "c" | "d", string>;

export type Question = {
  id: number;
  category: string;
  level: 'jss3' | 'ss3';
  question: string;
  options: OptionsRecord;
  correct: OptionKey;
  explanation: string;
  passage?: string;
  instruction?: string;
};

/** Return the list of option keys to render based on whether option_e exists */
export function getOptionKeys(options: OptionsRecord): OptionKey[] {
  if (options.e && options.e.trim()) {
    return ["a", "b", "c", "d", "e"];
  }
  return ["a", "b", "c", "d"];
}

/**
 * Starter questions for offline development.
 * Later, load these from Supabase by querying the questions table.
 */
export const mockQuestions: Question[] = [
  {
    id: 1,
    category: "General Knowledge",
    level: 'jss3',
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
    level: 'jss3',
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
    level: 'ss3',
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
  {
    id: 4,
    category: "Mathematics",
    level: 'jss3',
    question: "What is the square root of 144?",
    options: { a: "10", b: "11", c: "12", d: "14" },
    correct: "c",
    explanation: "12 × 12 = 144, so the square root of 144 is 12.",
  },
  {
    id: 5,
    category: "Mathematics",
    level: 'ss3',
    question: "If 2x + 5 = 15, what is the value of x?",
    options: { a: "3", b: "5", c: "7", d: "10" },
    correct: "b",
    explanation: "2x + 5 = 15 → 2x = 10 → x = 5.",
  },
  {
    id: 6,
    category: "English",
    level: 'ss3',
    question: "Choose the correct spelling:",
    options: { a: "Accomodate", b: "Acommodate", c: "Accommodate", d: "Acomodate" },
    correct: "c",
    explanation: "The correct spelling is 'Accommodate' with double c and double m.",
  },
  {
    id: 7,
    category: "Basic Science",
    level: 'jss3',
    question: "Which of these is a renewable source of energy?",
    options: { a: "Coal", b: "Natural gas", c: "Solar", d: "Petrol" },
    correct: "c",
    explanation: "Solar energy is renewable because it comes from the sun, which is inexhaustible.",
  },
  {
    id: 8,
    category: "Current Affairs",
    level: 'ss3',
    question: "Which international organization is responsible for maintaining global peace and security?",
    options: { a: "UNICEF", b: "WHO", c: "United Nations", d: "African Union" },
    correct: "c",
    explanation: "The United Nations (UN) was established to maintain international peace and security.",
  },
];

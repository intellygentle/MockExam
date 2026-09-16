import "server-only";
import type { LessonCardDef, LessonQuestion } from "./lesson-cards";

/**
 * SERVER-ONLY MODULE — DO NOT IMPORT FROM CLIENT CODE.
 *
 * "Definition Recall" card for the Government Lessons stack. The student
 * studies a term + its meaning for 10 seconds, the meaning hides, and they
 * type the definition back word-for-word. A single miss restarts the current
 * stage from its first word.
 *
 * The 35 definitions are split into three stages: 10 / 10 / 15.
 */

type Definition = { term: string; meaning: string };

export const DEFINITION_STAGE_SIZES = [10, 10, 15];

const DEFINITIONS: Definition[] = [
  { term: "Government (as an Institution)", meaning: "The legal machinery, body, or agency through which the will of the state is formulated, expressed, and enforced." },
  { term: "The Legislature", meaning: "The organ of government constitutionally empowered to make, amend, and repeal laws." },
  { term: "Bicameral Legislature", meaning: "A law-making body consisting of two separate chambers or houses (e.g., Senate and House of Representatives)." },
  { term: "Unicameral Legislature", meaning: "A law-making body consisting of a single chamber or house." },
  { term: "The Executive", meaning: "The organ of government responsible for implementing, enforcing, and administering laws and public policies." },
  { term: "The Judiciary", meaning: "The organ of government responsible for interpreting laws, settling legal disputes, and administering justice." },
  { term: "The Civil Service (Bureaucracy)", meaning: "The permanent, non-political, and professional administrative arm of the executive that executes government policies." },
  { term: "Separation of Powers", meaning: "The constitutional principle dividing state powers among the legislature, executive, and judiciary to prevent tyranny." },
  { term: "Checks and Balances", meaning: "The constitutional mechanism allowing each organ of government to limit and monitor the powers of the other two arms." },
  { term: "The State", meaning: "A permanent political community occupying a definite territory, with a structured government and independence (sovereignty)." },
  { term: "Government (as a Process)", meaning: "The ongoing activities, methods, and practices of exercising political power and administering public affairs." },
  { term: "Policy Formulation", meaning: "The administrative process of identifying societal needs and designing strategies, plans, or budgets to address them." },
  { term: "Conflict Resolution", meaning: "The governmental function of settling social, political, or ethnic disputes to preserve national peace and stability." },
  { term: "Maintenance of Law and Order", meaning: "The deployment of security agencies and enforcement of regulations to protect lives, properties, and social stability." },
  { term: "Revenue Allocation", meaning: "The legal distribution of generated national wealth across different tiers of government (federal, state, and local)." },
  { term: "Democracy", meaning: "A system and process of governance where ultimate political power rests with the people and is exercised directly or through elected representatives." },
  { term: "Anarchy", meaning: "A state of total lawlessness, chaos, and disorder resulting from the complete absence of a functional government or ruling authority." },
  { term: "Government (as an Academic Field)", meaning: "The systematic and scientific study of political concepts, theories, institutions, political behavior, and power distribution." },
  { term: "Political Science", meaning: "The formal social science discipline that studies the state, government, power relations, and political systems." },
  { term: "Political Theory", meaning: "The sub-field of political science exploring fundamental political ideas, values, and ideologies (e.g., justice, liberty, and equality) across history." },
  { term: "Comparative Politics", meaning: "The sub-field that systematically analyzes and compares the constitutions, political systems, and institutions of different countries." },
  { term: "International Relations", meaning: "The study of foreign policies, diplomacy, international law, global conflicts, and interactions between sovereign countries and international bodies." },
  { term: "Public Administration", meaning: "The academic study of how the civil service operates, manages public resources, and carries out public policy." },
  { term: "Political Culture", meaning: "The collective attitudes, values, beliefs, orientations, and psychological patterns of a society toward their political system." },
  { term: "Political Socialization", meaning: "The life-long process through which citizens learn, acquire, and internalize political values, culture, and civic attitudes." },
  { term: "Power", meaning: "The capacity or ability of an individual or group to compel others to obey commands, often backed by the threat of force." },
  { term: "Political Authority", meaning: "The legal, constitutional, and institutional right to command obedience and make decisions that are binding on citizens." },
  { term: "Legitimacy", meaning: "The widespread societal acceptance, recognition, and psychological approval of a government's moral right to rule." },
  { term: "Sovereignty", meaning: "The supreme, absolute, and unrestricted power of a state to make and enforce laws within its territory without external interference." },
  { term: "Traditional Authority", meaning: "Leadership and right to rule derived from long-standing customs, ancestral heritage, culture, and systems of inheritance." },
  { term: "Charismatic Authority", meaning: "Leadership power based entirely on a leader's exceptional personal qualities, appeal, heroism, or personal magnetism." },
  { term: "Legal-Rational Authority", meaning: "Power derived from a formalized, written constitution and clearly defined legal positions or offices." },
  { term: "De Jure Sovereignty", meaning: "The legal and constitutional recognition of a state's supreme authority according to international and domestic law." },
  { term: "De Facto Sovereignty", meaning: "The practical, physical control and exercise of power over a territory, regardless of whether it is legally recognized." },
  { term: "Constitution", meaning: "The supreme body of fundamental laws, rules, principles, and conventions by which a sovereign state is governed." },
];

/** Stage number (1-based) for the i-th definition. */
function stageOf(index: number): number {
  let running = 0;
  for (let s = 0; s < DEFINITION_STAGE_SIZES.length; s++) {
    running += DEFINITION_STAGE_SIZES[s];
    if (index < running) return s + 1;
  }
  return DEFINITION_STAGE_SIZES.length;
}

const questions: LessonQuestion[] = DEFINITIONS.map((d, i) => {
  const stage = stageOf(i);
  return {
    prompt: d.term,
    answer: d.meaning,
    hints: [],
    source: `Stage ${stage}`,
    stage,
  };
});

export const definitionRecallCard: LessonCardDef = {
  slug: "government-definitions",
  title: "Government Definitions: Recall Drill",
  description:
    "Study each term and its meaning for 10 seconds, then type the definition back word-for-word. One miss restarts the current stage.",
  kind: "definition_recall",
  lesson: [
    { kind: "heading", text: "How this recall drill works" },
    {
      kind: "bullets",
      items: [
        "Each term and its meaning appear for 10 seconds — read carefully, then it hides.",
        "Type the meaning back exactly, word-for-word, from memory.",
        "Type it correctly to move on. Miss one and the current stage restarts from its first word.",
        "Stage 1 = words 1–10 · Stage 2 = words 11–20 · Stage 3 = words 21–35.",
      ],
    },
    {
      kind: "review",
      title: "Tip",
      items: [
        "Chunk the meaning into its key idea, then say it in your head twice before the timer ends.",
        "Punctuation and capital letters are ignored — focus on the exact words.",
      ],
    },
  ],
  questions,
};

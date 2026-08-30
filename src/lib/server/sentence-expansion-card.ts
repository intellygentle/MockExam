import type { LessonCardDef, LessonQuestion } from "./lesson-cards";

/**
 * Sentence Expansion — Free-write mode.
 *
 * 30 questions: student writes one original sentence using a given conjunction
 * on a given topic. Grading is lenient — checks conjunction use, comma rule,
 * single-conjunction, and approximate topic relevance. No hints — nudges only.
 *
 * Split into Part 1 (Q1–15) and Part 2 (Q16–30) at insert time.
 */

type FreeWriteItem = {
  topic: string;
  conjunction: string;
  /** Model answer — used for lenient grading reference, never shown to student */
  modelAnswer: string;
  /** Key content tokens that should appear (lowercase). Grading is lenient. */
  keyTokens: string[];
};

const ALL_ITEMS: FreeWriteItem[] = [
  {
    topic: "climate change",
    conjunction: "whereas",
    modelAnswer: "Some nations have adopted strict carbon emission targets, whereas others continue to rely heavily on coal-fired power plants.",
    keyTokens: ["climate", "carbon", "emission", "coal", "power"],
  },
  {
    topic: "renewable energy",
    conjunction: "although",
    modelAnswer: "Although renewable energy sources are becoming more affordable, many governments still subsidize fossil fuels.",
    keyTokens: ["renewable", "energy", "affordable", "fossil", "fuel"],
  },
  {
    topic: "urbanization",
    conjunction: "because",
    modelAnswer: "Urbanization has accelerated because rural workers continue to migrate toward cities in search of better wages.",
    keyTokens: ["urban", "rural", "migrate", "cities", "wage"],
  },
  {
    topic: "remote work",
    conjunction: "while",
    modelAnswer: "While some employees appreciate the flexibility of remote work, others struggle to separate their professional and personal lives.",
    keyTokens: ["remote", "work", "employee", "flexibl", "person", "profession"],
  },
  {
    topic: "childhood obesity",
    conjunction: "since",
    modelAnswer: "Childhood obesity rates have risen sharply since fast food became more affordable and widely available.",
    keyTokens: ["obesity", "child", "food", "afford", "rate"],
  },
  {
    topic: "artificial intelligence",
    conjunction: "though",
    modelAnswer: "Artificial intelligence can automate repetitive tasks efficiently, though it still struggles with tasks requiring emotional judgment.",
    keyTokens: ["artificial", "intellig", "automat", "task", "emotion"],
  },
  {
    topic: "plastic pollution",
    conjunction: "even though",
    modelAnswer: "Even though plastic pollution poses a severe threat to marine ecosystems, global plastic production continues to increase every year.",
    keyTokens: ["plastic", "pollut", "marine", "ecosystem", "production"],
  },
  {
    topic: "unemployment",
    conjunction: "unless",
    modelAnswer: "Unemployment will likely remain high unless governments invest more heavily in vocational training programs.",
    keyTokens: ["unemploy", "govern", "invest", "train", "program"],
  },
  {
    topic: "higher education",
    conjunction: "provided that",
    modelAnswer: "Students may qualify for a full scholarship provided that they maintain a high academic average throughout their studies.",
    keyTokens: ["student", "scholarship", "academic", "study", "qualif"],
  },
  {
    topic: "renewable energy funding",
    conjunction: "as long as",
    modelAnswer: "Renewable energy projects will continue to attract investors as long as government subsidies remain in place.",
    keyTokens: ["renewable", "energy", "invest", "subsid", "govern"],
  },
  {
    topic: "air travel",
    conjunction: "before",
    modelAnswer: "Before air travel became widely accessible, most long-distance journeys took several days by ship or train.",
    keyTokens: ["travel", "air", "journey", "distance", "ship", "train"],
  },
  {
    topic: "natural disasters",
    conjunction: "after",
    modelAnswer: "Communities often rebuild stronger infrastructure after a natural disaster exposes weaknesses in the original design.",
    keyTokens: ["disaster", "natural", "rebuild", "infrastructur", "communit"],
  },
  {
    topic: "public transport",
    conjunction: "so that",
    modelAnswer: "Many cities have expanded their public transport networks so that commuters can rely less on private vehicles.",
    keyTokens: ["transport", "public", "commut", "vehicle", "network"],
  },
  {
    topic: "income inequality",
    conjunction: "if",
    modelAnswer: "If income inequality continues to widen, social tension between different economic groups is likely to increase.",
    keyTokens: ["income", "inequal", "social", "tension", "economic"],
  },
  {
    topic: "cybersecurity",
    conjunction: "lest",
    modelAnswer: "Companies now invest heavily in cybersecurity lest a single data breach damage their reputation permanently.",
    keyTokens: ["cyber", "secur", "breach", "data", "reput"],
  },
  {
    topic: "space exploration",
    conjunction: "supposing that",
    modelAnswer: "Supposing that a manned mission to Mars succeeds, it could transform how humanity views long-term space colonization.",
    keyTokens: ["space", "mission", "mars", "human", "coloniz"],
  },
  {
    topic: "genetic engineering",
    conjunction: "even if",
    modelAnswer: "Even if genetic engineering could eliminate certain hereditary diseases, many ethical questions would still remain unresolved.",
    keyTokens: ["genetic", "engine", "disease", "ethic", "heredit"],
  },
  {
    topic: "smart cities",
    conjunction: "once",
    modelAnswer: "Once sensor networks are installed across a city, traffic flow and energy use can be managed far more efficiently.",
    keyTokens: ["sensor", "network", "traffic", "city", "energy"],
  },
  {
    topic: "tourism",
    conjunction: "whereas",
    modelAnswer: "Coastal regions rely heavily on tourism revenue, whereas inland areas depend more on agriculture.",
    keyTokens: ["tourism", "coast", "inland", "revenue", "agricultur"],
  },
  {
    topic: "social media use",
    conjunction: "although",
    modelAnswer: "Although social media use has connected people across the globe, it has also been linked to rising rates of anxiety among teenagers.",
    keyTokens: ["social", "media", "connect", "anxiet", "teenag"],
  },
  {
    topic: "deforestation",
    conjunction: "because",
    modelAnswer: "Deforestation has accelerated in the region because agricultural land is now more profitable than forest conservation.",
    keyTokens: ["deforest", "agricultur", "forest", "land", "profit"],
  },
  {
    topic: "aging population",
    conjunction: "while",
    modelAnswer: "While the aging population places growing pressure on healthcare systems, it also creates new opportunities in elder-care industries.",
    keyTokens: ["aging", "population", "health", "care", "elder"],
  },
  {
    topic: "water scarcity",
    conjunction: "since",
    modelAnswer: "Water scarcity has worsened since prolonged droughts have become more frequent due to climate change.",
    keyTokens: ["water", "scarcit", "drought", "frequent", "climate"],
  },
  {
    topic: "mental health awareness",
    conjunction: "though",
    modelAnswer: "Mental health awareness has improved considerably in recent years, though stigma still prevents many people from seeking help.",
    keyTokens: ["mental", "health", "stigma", "aware", "seek"],
  },
  {
    topic: "globalization",
    conjunction: "even though",
    modelAnswer: "Even though globalization has lifted millions out of poverty, it has also widened the gap between skilled and unskilled workers.",
    keyTokens: ["global", "poverty", "skill", "worker", "gap"],
  },
  {
    topic: "wildlife conservation",
    conjunction: "unless",
    modelAnswer: "Many endangered species will not survive unless their natural habitats are protected from further destruction.",
    keyTokens: ["wildlife", "endanger", "habitat", "species", "protect"],
  },
  {
    topic: "e-commerce growth",
    conjunction: "provided that",
    modelAnswer: "Small businesses can compete with larger retailers provided that they invest in a strong online presence.",
    keyTokens: ["business", "compete", "retail", "online", "invest"],
  },
  {
    topic: "cultural heritage preservation",
    conjunction: "as long as",
    modelAnswer: "Traditional crafts will continue to survive as long as younger generations are willing to learn them.",
    keyTokens: ["cultur", "heritag", "craft", "tradition", "generat"],
  },
  {
    topic: "immigration policy",
    conjunction: "before",
    modelAnswer: "Before immigration policy is reformed, many skilled workers will continue to face lengthy visa delays.",
    keyTokens: ["immigr", "policy", "reform", "visa", "worker"],
  },
  {
    topic: "gender equality in the workplace",
    conjunction: "after",
    modelAnswer: "Workplace culture began to shift noticeably after companies introduced mandatory parental leave for both parents.",
    keyTokens: ["gender", "equal", "workplac", "parent", "compan"],
  },
];

export const sentenceExpansionItems = ALL_ITEMS;

// Banter for wrong answers (no hints — just nudges)
const NUDGE_POOL = [
  "Not quite — check if the conjunction's meaning matches the logic of your sentence. 🤔",
  "Almost! Make sure the comma is in the right place for this conjunction. ✏️",
  "That's not quite right — are you using the conjunction with the correct meaning? 📝",
  "Hmm, try again. Remember: the conjunction should reflect the right relationship between ideas. 🔄",
  "Not quite there yet — double-check your comma placement and conjunction logic. 🔍",
  "Close, but the conjunction needs to fit the logic better. Give it another shot! 💪",
  "Think about what relationship this conjunction expresses — cause, contrast, condition, or time? 🧠",
  "That doesn't quite work — make sure both halves of your sentence make sense together. ✍️",
];

export function getRandomNudge(): string {
  return NUDGE_POOL[Math.floor(Math.random() * NUDGE_POOL.length)];
}

export function buildFreeWritePart1(): LessonCardDef {
  return buildFwCard(
    "sentence-expansion-part1",
    "Sentence Expansion — Free Write (Part 1)",
    "Write one original sentence using the given conjunction on the given topic. Questions 1–15.",
    ALL_ITEMS.slice(0, 15),
    "Part 1 · Q1–Q15"
  );
}

export function buildFreeWritePart2(): LessonCardDef {
  return buildFwCard(
    "sentence-expansion-part2",
    "Sentence Expansion — Free Write (Part 2)",
    "Write one original sentence using the given conjunction on the given topic. Questions 16–Q30.",
    ALL_ITEMS.slice(15),
    "Part 2 · Q16–Q30"
  );
}

function buildFwCard(
  slug: string,
  title: string,
  description: string,
  items: FreeWriteItem[],
  source: string
): LessonCardDef {
  return {
    slug,
    title,
    description,
    kind: "sentence_expansion",
    lesson: [
      { kind: "heading", text: "📝 Sentence Expansion — Free Write" },
      {
        kind: "text",
        text: "For each prompt, write ONE original, correctly punctuated sentence on the given topic using the specified conjunction. Your sentence does not need to match any model — it just needs to be grammatically correct, logically sound, and on-topic.",
      },
      {
        kind: "heading",
        text: "🧭 Rules to Follow",
      },
      {
        kind: "bullets",
        items: [
          "Use the EXACT conjunction given — don't swap it for another.",
          "Place the comma correctly: required after fronted clauses (If..., Although..., Before..., etc.); required before whereas/although/though even when trailing; usually omitted for trailing because/since/unless/after/before/once.",
          "Use only ONE conjunction per sentence — no double-conjunction errors.",
          "The sentence must make logical sense — the conjunction's meaning should match the relationship between your ideas.",
        ],
      },
      {
        kind: "review",
        title: "Conjunction cheat sheet:",
        items: [
          "Contrast: whereas, although, though, even though",
          "Cause: because, since",
          "Condition: if, unless, provided that, as long as, even if, lest, supposing that",
          "Time: before, after, once, while, when",
          "Purpose: so that",
        ],
      },
    ],
    questions: items.map((item): LessonQuestion => ({
      prompt: `Write a sentence about "${item.topic}" using the conjunction "${item.conjunction}".`,
      answer: item.modelAnswer,
      hints: [],
      source,
      sentenceExpansion: {
        topic: item.topic,
        conjunction: item.conjunction,
        modelAnswer: item.modelAnswer,
        keyTokens: item.keyTokens,
      },
    })),
  };
}

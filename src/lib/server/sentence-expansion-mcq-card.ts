import type { LessonCardDef } from "./lesson-cards";

/**
 * Sentence Expansion — MCQ mode.
 *
 * 30 questions: student picks the sentence that correctly uses the given
 * conjunction on the given topic. One correct, three distractors (wrong
 * conjunction, comma error, wrong logic).
 *
 * Split into Part 1 (Q1–15) and Part 2 (Q16–30) at insert time.
 */

type McqItem = {
  topic: string;
  conjunction: string;
  correct: string; // option A
  distractorWrongConj: string; // option B — wrong conjunction
  distractorCommaError: string; // option C — comma error
  distractorWrongLogic: string; // option D — wrong logic
  explanation: string;
};

const ALL_ITEMS: McqItem[] = [
  {
    topic: "climate change",
    conjunction: "whereas",
    correct: "Some nations have adopted strict carbon emission targets, whereas others continue to rely heavily on coal-fired power plants.",
    distractorWrongConj: "Some nations have adopted strict carbon emission targets, because others continue to rely heavily on coal-fired power plants.",
    distractorCommaError: "Some nations have adopted strict carbon emission targets whereas others continue to rely heavily on coal-fired power plants.",
    distractorWrongLogic: "Some nations have adopted strict carbon emission targets, whereas all countries have completely eliminated fossil fuel use.",
    explanation: "Whereas shows contrast. The comma before 'whereas' is required when joining two independent clauses.",
  },
  {
    topic: "renewable energy",
    conjunction: "although",
    correct: "Although renewable energy sources are becoming more affordable, many governments still subsidize fossil fuels.",
    distractorWrongConj: "Because renewable energy sources are becoming more affordable, many governments still subsidize fossil fuels.",
    distractorCommaError: "Although renewable energy sources are becoming more affordable many governments still subsidize fossil fuels.",
    distractorWrongLogic: "Although renewable energy sources are becoming more affordable, they have completely replaced fossil fuels worldwide.",
    explanation: "Although introduces a concession — the two halves should contrast. Comma required after a fronted although-clause.",
  },
  {
    topic: "urbanization",
    conjunction: "because",
    correct: "Urbanization has accelerated because rural workers continue to migrate toward cities in search of better wages.",
    distractorWrongConj: "Urbanization has accelerated whereas rural workers continue to migrate toward cities in search of better wages.",
    distractorCommaError: "Urbanization has accelerated, because rural workers continue to migrate toward cities in search of better wages.",
    distractorWrongLogic: "Urbanization has slowed down because rural workers continue to migrate toward cities in search of better wages.",
    explanation: "Because introduces a cause. No comma is needed before 'because' when the causal clause follows the main clause.",
  },
  {
    topic: "remote work",
    conjunction: "while",
    correct: "While some employees appreciate the flexibility of remote work, others struggle to separate their professional and personal lives.",
    distractorWrongConj: "Because some employees appreciate the flexibility of remote work, others struggle to separate their professional and personal lives.",
    distractorCommaError: "While some employees appreciate the flexibility of remote work others struggle to separate their professional and personal lives.",
    distractorWrongLogic: "While some employees appreciate the flexibility of remote work, all employees prefer working from the office.",
    explanation: "While shows contrast between two groups. Comma required after a fronted while-clause.",
  },
  {
    topic: "childhood obesity",
    conjunction: "since",
    correct: "Childhood obesity rates have risen sharply since fast food became more affordable and widely available.",
    distractorWrongConj: "Childhood obesity rates have risen sharply although fast food became more affordable and widely available.",
    distractorCommaError: "Childhood obesity rates have risen sharply, since fast food became more affordable and widely available.",
    distractorWrongLogic: "Childhood obesity rates have declined since fast food became more affordable and widely available.",
    explanation: "Since introduces a time/cause relationship. No comma needed before 'since' when the clause follows the main clause.",
  },
  {
    topic: "artificial intelligence",
    conjunction: "though",
    correct: "Artificial intelligence can automate repetitive tasks efficiently, though it still struggles with tasks requiring emotional judgment.",
    distractorWrongConj: "Artificial intelligence can automate repetitive tasks efficiently, because it still struggles with tasks requiring emotional judgment.",
    distractorCommaError: "Artificial intelligence can automate repetitive tasks efficiently though it still struggles with tasks requiring emotional judgment.",
    distractorWrongLogic: "Artificial intelligence can automate repetitive tasks efficiently, though it has completely mastered emotional judgment.",
    explanation: "Though introduces a concession. Comma required before 'though' when joining two independent clauses.",
  },
  {
    topic: "plastic pollution",
    conjunction: "even though",
    correct: "Even though plastic pollution poses a severe threat to marine ecosystems, global plastic production continues to increase every year.",
    distractorWrongConj: "Because plastic pollution poses a severe threat to marine ecosystems, global plastic production continues to increase every year.",
    distractorCommaError: "Even though plastic pollution poses a severe threat to marine ecosystems global plastic production continues to increase every year.",
    distractorWrongLogic: "Even though plastic pollution poses a severe threat to marine ecosystems, global plastic production has been completely eliminated.",
    explanation: "Even though introduces a strong concession. Comma required after a fronted even though-clause.",
  },
  {
    topic: "unemployment",
    conjunction: "unless",
    correct: "Unemployment will likely remain high unless governments invest more heavily in vocational training programs.",
    distractorWrongConj: "Unemployment will likely remain high because governments invest more heavily in vocational training programs.",
    distractorCommaError: "Unemployment will likely remain high, unless governments invest more heavily in vocational training programs.",
    distractorWrongLogic: "Unemployment will disappear unless governments invest more heavily in vocational training programs.",
    explanation: "Unless introduces a negative condition. No comma needed before 'unless' when the condition follows the main clause.",
  },
  {
    topic: "higher education",
    conjunction: "provided that",
    correct: "Students may qualify for a full scholarship provided that they maintain a high academic average throughout their studies.",
    distractorWrongConj: "Students may qualify for a full scholarship because they maintain a high academic average throughout their studies.",
    distractorCommaError: "Students may qualify for a full scholarship, provided that they maintain a high academic average throughout their studies.",
    distractorWrongLogic: "Students will automatically receive a full scholarship provided that they maintain a high academic average.",
    explanation: "Provided that introduces a positive condition. No comma needed before 'provided that' when the condition follows.",
  },
  {
    topic: "renewable energy funding",
    conjunction: "as long as",
    correct: "Renewable energy projects will continue to attract investors as long as government subsidies remain in place.",
    distractorWrongConj: "Renewable energy projects will continue to attract investors because government subsidies remain in place.",
    distractorCommaError: "Renewable energy projects will continue to attract investors, as long as government subsidies remain in place.",
    distractorWrongLogic: "Renewable energy projects will stop attracting investors as long as government subsidies remain in place.",
    explanation: "As long as introduces an ongoing condition. No comma needed when the condition follows the main clause.",
  },
  {
    topic: "air travel",
    conjunction: "before",
    correct: "Before air travel became widely accessible, most long-distance journeys took several days by ship or train.",
    distractorWrongConj: "After air travel became widely accessible, most long-distance journeys took several days by ship or train.",
    distractorCommaError: "Before air travel became widely accessible most long-distance journeys took several days by ship or train.",
    distractorWrongLogic: "Before air travel became widely accessible, most people preferred flying to other modes of transport.",
    explanation: "Before introduces a time relationship — the main event happened after the before-clause. Comma required after a fronted before-clause.",
  },
  {
    topic: "natural disasters",
    conjunction: "after",
    correct: "Communities often rebuild stronger infrastructure after a natural disaster exposes weaknesses in the original design.",
    distractorWrongConj: "Communities often rebuild stronger infrastructure before a natural disaster exposes weaknesses in the original design.",
    distractorCommaError: "Communities often rebuild stronger infrastructure, after a natural disaster exposes weaknesses in the original design.",
    distractorWrongLogic: "Communities often abandon their cities after a natural disaster exposes weaknesses in the original design.",
    explanation: "After introduces a time sequence — rebuilding happens AFTER the disaster. No comma needed before 'after' when the clause follows.",
  },
  {
    topic: "public transport",
    conjunction: "so that",
    correct: "Many cities have expanded their public transport networks so that commuters can rely less on private vehicles.",
    distractorWrongConj: "Many cities have expanded their public transport networks because commuters can rely less on private vehicles.",
    distractorCommaError: "Many cities have expanded their public transport networks, so that commuters can rely less on private vehicles.",
    distractorWrongLogic: "Many cities have reduced their public transport networks so that commuters can rely less on private vehicles.",
    explanation: "So that introduces purpose — the expansion was done FOR THE PURPOSE OF helping commuters. No comma needed before 'so that'.",
  },
  {
    topic: "income inequality",
    conjunction: "if",
    correct: "If income inequality continues to widen, social tension between different economic groups is likely to increase.",
    distractorWrongConj: "Because income inequality continues to widen, social tension between different economic groups is likely to increase.",
    distractorCommaError: "If income inequality continues to widen social tension between different economic groups is likely to increase.",
    distractorWrongLogic: "If income inequality continues to narrow, social tension between different economic groups is likely to increase.",
    explanation: "If introduces a condition. Comma required after a fronted if-clause.",
  },
  {
    topic: "cybersecurity",
    conjunction: "lest",
    correct: "Companies now invest heavily in cybersecurity lest a single data breach damage their reputation permanently.",
    distractorWrongConj: "Companies now invest heavily in cybersecurity because a single data breach damage their reputation permanently.",
    distractorCommaError: "Companies now invest heavily in cybersecurity, lest a single data breach damage their reputation permanently.",
    distractorWrongLogic: "Companies now ignore cybersecurity lest a single data breach damage their reputation permanently.",
    explanation: "Lest means 'for fear that' — introduces something to avoid. No comma needed before 'lest'.",
  },
  {
    topic: "space exploration",
    conjunction: "supposing that",
    correct: "Supposing that a manned mission to Mars succeeds, it could transform how humanity views long-term space colonization.",
    distractorWrongConj: "Because a manned mission to Mars succeeds, it could transform how humanity views long-term space colonization.",
    distractorCommaError: "Supposing that a manned mission to Mars succeeds it could transform how humanity views long-term space colonization.",
    distractorWrongLogic: "Supposing that a manned mission to Mars fails, it could transform how humanity views long-term space colonization.",
    explanation: "Supposing that introduces a hypothetical condition. Comma required after a fronted supposing that-clause.",
  },
  {
    topic: "genetic engineering",
    conjunction: "even if",
    correct: "Even if genetic engineering could eliminate certain hereditary diseases, many ethical questions would still remain unresolved.",
    distractorWrongConj: "Because genetic engineering could eliminate certain hereditary diseases, many ethical questions would still remain unresolved.",
    distractorCommaError: "Even if genetic engineering could eliminate certain hereditary diseases many ethical questions would still remain unresolved.",
    distractorWrongLogic: "Even if genetic engineering could eliminate certain hereditary diseases, all ethical questions would be resolved.",
    explanation: "Even if introduces a hypothetical concession. Comma required after a fronted even if-clause.",
  },
  {
    topic: "smart cities",
    conjunction: "once",
    correct: "Once sensor networks are installed across a city, traffic flow and energy use can be managed far more efficiently.",
    distractorWrongConj: "Because sensor networks are installed across a city, traffic flow and energy use can be managed far more efficiently.",
    distractorCommaError: "Once sensor networks are installed across a city traffic flow and energy use can be managed far more efficiently.",
    distractorWrongLogic: "Once sensor networks are installed across a city, traffic congestion and energy waste will increase significantly.",
    explanation: "Once introduces a time condition — something happens AFTER the condition is met. Comma required after a fronted once-clause.",
  },
  {
    topic: "tourism",
    conjunction: "whereas",
    correct: "Coastal regions rely heavily on tourism revenue, whereas inland areas depend more on agriculture.",
    distractorWrongConj: "Coastal regions rely heavily on tourism revenue, because inland areas depend more on agriculture.",
    distractorCommaError: "Coastal regions rely heavily on tourism revenue whereas inland areas depend more on agriculture.",
    distractorWrongLogic: "Coastal regions rely heavily on tourism revenue, whereas all regions depend equally on agriculture.",
    explanation: "Whereas shows contrast. Comma required before 'whereas' when joining two independent clauses.",
  },
  {
    topic: "social media use",
    conjunction: "although",
    correct: "Although social media use has connected people across the globe, it has also been linked to rising rates of anxiety among teenagers.",
    distractorWrongConj: "Because social media use has connected people across the globe, it has also been linked to rising rates of anxiety among teenagers.",
    distractorCommaError: "Although social media use has connected people across the globe it has also been linked to rising rates of anxiety among teenagers.",
    distractorWrongLogic: "Although social media use has connected people across the globe, it has completely eliminated all forms of anxiety.",
    explanation: "Although introduces a concession — connecting people is positive, but anxiety is negative. Comma required after fronted although.",
  },
  {
    topic: "deforestation",
    conjunction: "because",
    correct: "Deforestation has accelerated in the region because agricultural land is now more profitable than forest conservation.",
    distractorWrongConj: "Deforestation has accelerated in the region whereas agricultural land is now more profitable than forest conservation.",
    distractorCommaError: "Deforestation has accelerated in the region, because agricultural land is now more profitable than forest conservation.",
    distractorWrongLogic: "Deforestation has slowed in the region because agricultural land is now more profitable than forest conservation.",
    explanation: "Because introduces the cause. No comma needed before 'because' when the clause follows the main clause.",
  },
  {
    topic: "aging population",
    conjunction: "while",
    correct: "While the aging population places growing pressure on healthcare systems, it also creates new opportunities in elder-care industries.",
    distractorWrongConj: "Because the aging population places growing pressure on healthcare systems, it also creates new opportunities in elder-care industries.",
    distractorCommaError: "While the aging population places growing pressure on healthcare systems it also creates new opportunities in elder-care industries.",
    distractorWrongLogic: "While the aging population places growing pressure on healthcare systems, it has no effect on the economy.",
    explanation: "While shows contrast — pressure vs opportunity. Comma required after a fronted while-clause.",
  },
  {
    topic: "water scarcity",
    conjunction: "since",
    correct: "Water scarcity has worsened since prolonged droughts have become more frequent due to climate change.",
    distractorWrongConj: "Water scarcity has worsened although prolonged droughts have become more frequent due to climate change.",
    distractorCommaError: "Water scarcity has worsened, since prolonged droughts have become more frequent due to climate change.",
    distractorWrongLogic: "Water scarcity has improved since prolonged droughts have become more frequent due to climate change.",
    explanation: "Since introduces a time/cause relationship. No comma needed before 'since' when the clause follows.",
  },
  {
    topic: "mental health awareness",
    conjunction: "though",
    correct: "Mental health awareness has improved considerably in recent years, though stigma still prevents many people from seeking help.",
    distractorWrongConj: "Mental health awareness has improved considerably in recent years, because stigma still prevents many people from seeking help.",
    distractorCommaError: "Mental health awareness has improved considerably in recent years though stigma still prevents many people from seeking help.",
    distractorWrongLogic: "Mental health awareness has declined in recent years, though stigma still prevents many people from seeking help.",
    explanation: "Though introduces a concession. Comma required before 'though' when joining two independent clauses.",
  },
  {
    topic: "globalization",
    conjunction: "even though",
    correct: "Even though globalization has lifted millions out of poverty, it has also widened the gap between skilled and unskilled workers.",
    distractorWrongConj: "Because globalization has lifted millions out of poverty, it has also widened the gap between skilled and unskilled workers.",
    distractorCommaError: "Even though globalization has lifted millions out of poverty it has also widened the gap between skilled and unskilled workers.",
    distractorWrongLogic: "Even though globalization has lifted millions out of poverty, it has completely eliminated all inequality.",
    explanation: "Even though introduces a strong concession. Comma required after a fronted even though-clause.",
  },
  {
    topic: "wildlife conservation",
    conjunction: "unless",
    correct: "Many endangered species will not survive unless their natural habitats are protected from further destruction.",
    distractorWrongConj: "Many endangered species will not survive because their natural habitats are protected from further destruction.",
    distractorCommaError: "Many endangered species will not survive, unless their natural habitats are protected from further destruction.",
    distractorWrongLogic: "Many endangered species will thrive unless their natural habitats are protected from further destruction.",
    explanation: "Unless introduces a negative condition. No comma needed before 'unless' when the clause follows.",
  },
  {
    topic: "e-commerce growth",
    conjunction: "provided that",
    correct: "Small businesses can compete with larger retailers provided that they invest in a strong online presence.",
    distractorWrongConj: "Small businesses can compete with larger retailers because they invest in a strong online presence.",
    distractorCommaError: "Small businesses can compete with larger retailers, provided that they invest in a strong online presence.",
    distractorWrongLogic: "Small businesses cannot compete with larger retailers provided that they invest in a strong online presence.",
    explanation: "Provided that introduces a positive condition. No comma needed when the condition follows the main clause.",
  },
  {
    topic: "cultural heritage preservation",
    conjunction: "as long as",
    correct: "Traditional crafts will continue to survive as long as younger generations are willing to learn them.",
    distractorWrongConj: "Traditional crafts will continue to survive because younger generations are willing to learn them.",
    distractorCommaError: "Traditional crafts will continue to survive, as long as younger generations are willing to learn them.",
    distractorWrongLogic: "Traditional crafts will disappear as long as younger generations are willing to learn them.",
    explanation: "As long as introduces an ongoing condition. No comma needed when the condition follows.",
  },
  {
    topic: "immigration policy",
    conjunction: "before",
    correct: "Before immigration policy is reformed, many skilled workers will continue to face lengthy visa delays.",
    distractorWrongConj: "After immigration policy is reformed, many skilled workers will continue to face lengthy visa delays.",
    distractorCommaError: "Before immigration policy is reformed many skilled workers will continue to face lengthy visa delays.",
    distractorWrongLogic: "Before immigration policy is reformed, all skilled workers will receive immediate visa approval.",
    explanation: "Before introduces a time relationship. Comma required after a fronted before-clause.",
  },
  {
    topic: "gender equality in the workplace",
    conjunction: "after",
    correct: "Workplace culture began to shift noticeably after companies introduced mandatory parental leave for both parents.",
    distractorWrongConj: "Workplace culture began to shift noticeably before companies introduced mandatory parental leave for both parents.",
    distractorCommaError: "Workplace culture began to shift noticeably, after companies introduced mandatory parental leave for both parents.",
    distractorWrongLogic: "Workplace culture remained completely unchanged after companies introduced mandatory parental leave for both parents.",
    explanation: "After introduces a time sequence — the shift happened AFTER the policy change. No comma needed before 'after'.",
  },
];

function buildCard(
  slug: string,
  title: string,
  description: string,
  items: McqItem[],
  source: string
): LessonCardDef {
  return {
    slug,
    title,
    description,
    kind: "classify",
    lesson: [
      { kind: "heading", text: "📝 Sentence Expansion — Choose the Correct Sentence" },
      {
        kind: "text",
        text: "Each question shows a topic and a conjunction. Pick the sentence that correctly uses the conjunction with the right logic AND correct comma placement.",
      },
      {
        kind: "heading",
        text: "🧭 What to Look For",
      },
      {
        kind: "bullets",
        items: [
          "Does the conjunction's MEANING match the logic? (contrast = whereas/although, cause = because/since, condition = if/unless/provided that, time = when/before/after/once, purpose = so that)",
          "Is the comma placed correctly? (Required after fronted clauses; required before whereas/although/though even when trailing; usually omitted for trailing time/cause/condition clauses)",
          "Is there only ONE conjunction per sentence? (No double-conjunction errors)",
        ],
      },
      {
        kind: "review",
        title: "The three rules to remember:",
        items: [
          "Match the conjunction's meaning to the logic.",
          "Place the comma correctly.",
          "Use only one conjunction per sentence.",
        ],
      },
    ],
    questions: items.map((item) => {
      // Shuffle options
      const options = [
        { text: item.correct, key: "a" as const },
        { text: item.distractorWrongConj, key: "b" as const },
        { text: item.distractorCommaError, key: "c" as const },
        { text: item.distractorWrongLogic, key: "d" as const },
      ];
      // Fisher-Yates shuffle
      for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
      }
      const correctKey = options.find((o) => o.text === item.correct)!.key;

      return {
        prompt: `Topic: ${item.topic} | Conjunction: "${item.conjunction}"`,
        answer: correctKey,
        hints: [item.explanation],
        source,
        options: {
          a: options[0].text,
          b: options[1].text,
          c: options[2].text,
          d: options[3].text,
        },
      };
    }),
  };
}

// We export a function that generates the full card, then at insert time
// we split into two halves.

export const sentenceExpansionMcqItems = ALL_ITEMS;

export function getMcqPart1(): LessonCardDef {
  return buildCard(
    "sentence-expansion-mcq-part1",
    "Sentence Expansion — MCQ (Part 1)",
    "Choose the sentence that correctly uses the given conjunction. Questions 1–15.",
    ALL_ITEMS.slice(0, 15),
    "Part 1 · Q1–Q15"
  );
}

export function getMcqPart2(): LessonCardDef {
  return buildCard(
    "sentence-expansion-mcq-part2",
    "Sentence Expansion — MCQ (Part 2)",
    "Choose the sentence that correctly uses the given conjunction. Questions 16–30.",
    ALL_ITEMS.slice(15),
    "Part 2 · Q16–Q30"
  );
}

const fs = require("fs");

// ─────────────────────────────────────────────────────────────
// 1. EXTRACT PARAGRAPHS WITH FORMATTING MARKERS FROM DOCX
// ─────────────────────────────────────────────────────────────
const xml = fs.readFileSync("tmp_dx/word/document.xml", "utf8");
const paras = [];
const pRe = /<w:p\b[^>]*>[\s\S]*?<\/w:p>/g;
let m;
while ((m = pRe.exec(xml)) !== null) paras.push(m[0]);

function decodeEntities(s) {
  return s
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

const blocks = paras.map((p) => {
  let text = "";
  const runs = p.match(/<w:r\b[^>]*>[\s\S]*?<\/w:r>/g) || [];
  for (const r of runs) {
    const rPr = (r.match(/<w:rPr>[\s\S]*?<\/w:rPr>/) || [""])[0];
    const isBold = /<w:b\/>/.test(rPr) || /<w:b w:val="(1|true)"/.test(rPr);
    const isUnderline = /<w:u w:val="[^"]+"/.test(rPr) && !/<w:u w:val="none"/.test(rPr);
    const isItalic = /<w:i\/>/.test(rPr) || /<w:i w:val="(1|true)"/.test(rPr);
    const t = decodeEntities((r.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/) || [])[1] || "");
    if (isBold && isUnderline) text += `**__${t}__**`;
    else if (isBold) text += `**${t}**`;
    else if (isUnderline) text += `__${t}__`;
    else if (isItalic) text += `*${t}*`;
    else text += t;
  }
  return text;
});

// ─────────────────────────────────────────────────────────────
// 2. PARSE STRUCTURE
// ─────────────────────────────────────────────────────────────
const questions = new Map(); // n -> {text, options:{letter:txt}}
let currentQ = null;
let inAnswers = false;
const answerKey = new Map(); // n -> {letter, word, explanation}

for (const raw of blocks) {
  const t = raw.trim();

  if (/^# Answers/i.test(t)) { inAnswers = true; continue; }
  if (/^#{1,3} /.test(t)) continue; // headings

  // Question line
  let qm = t.match(/^(\d{1,3})\.\s+(.+)$/);
  if (qm && !inAnswers) {
    currentQ = parseInt(qm[1], 10);
    questions.set(currentQ, { text: qm[2], options: {} });
    continue;
  }
  // Option line
  let om = t.match(/^([A-E])\.\s+(.+)$/);
  if (om && !inAnswers && currentQ) {
    questions.get(currentQ).options[om[1]] = om[2];
    continue;
  }
  // Answer key line:  1. **B (had)** — explanation
  let am = t.match(/^(\d{1,3})\.\s+\*\*([A-Ea-e])\s*\(([^)]*)\)\*\*\s*(?:—\s*)?(.*)$/);
  if (am && inAnswers) {
    const n = parseInt(am[1], 10);
    const letter = am[2].toLowerCase();
    const word = am[3].trim();
    const expl = am[4].trim() || word;
    answerKey.set(n, { letter, word, explanation: expl.replace(/\*\*/g, "") });
  }
}

// ─────────────────────────────────────────────────────────────
// 3. COMPREHENSION PASSAGE (paragraphs before Q61)
// ─────────────────────────────────────────────────────────────
const passageIdx = blocks.findIndex((b) => /^### Section IX: Reading Comprehension/.test(b.trim()));
const passageParas = [];
for (let i = passageIdx + 1; i < blocks.length; i++) {
  const t = blocks[i].trim();
  if (/^#/.test(t)) break;
  if (/^\d{1,3}\./.test(t)) break;
  if (t.startsWith("*")) continue; // italic instruction line
  if (!t) continue;
  passageParas.push(t);
}
const PASSAGE = passageParas.join("\n\n");

// ─────────────────────────────────────────────────────────────
// 4. EMPHASIS CONVERSION (validated against LatexRenderer pipeline)
// ─────────────────────────────────────────────────────────────
function applyEmphasis(s) {
  let r = s;
  r = r.replace(/\*\*([^*]+)\*\*/g, "\\(\\mathbf{$1}\\)");       // bold
  r = r.replace(/<u>([^<]+)<\/u>/g, "\\(\\underline{\\mathrm{$1}}\\)"); // underline
  r = r.replace(/\*([^*]+)\*/g, "\\(\\textit{$1}\\)");           // italic
  return r;
}

// ─────────────────────────────────────────────────────────────
// 5. SECTION INSTRUCTIONS (by question range)
// ─────────────────────────────────────────────────────────────
function instructionFor(n) {
  if (n >= 21 && n <= 30) return "Choose the option nearest in meaning to the capitalized word.";
  if (n >= 31 && n <= 40) return "Choose the option most opposite in meaning to the capitalized word.";
  if (n >= 61 && n <= 70) return "Read the passage below carefully and answer questions 61 to 70.";
  if (n >= 71 && n <= 75) return "Refer back to the reading passage and choose the option that best answers each question.";
  if (n >= 76 && n <= 85) return "Rewrite or correct the following sentences according to the instructions in brackets. Choose the option that correctly completes each transformation.";
  if (n >= 86 && n <= 90) return "Choose the option that best replaces the underlined word in each sentence without changing its meaning.";
  return "";
}

// ─────────────────────────────────────────────────────────────
// 6. CRAFTED MCQ FOR Q71–90 (based on the document's model answers)
// ─────────────────────────────────────────────────────────────
const crafted = {
  71: {
    text: `State the two main opposing arguments regarding the use of technology in education, as presented in the passage.`,
    options: {
      a: `Supporters argue that technology in education builds student autonomy and accessibility, while critics contend that it widens the digital divide and harms psychological development.`,
      b: `Technology makes lessons shorter, while critics say it makes them longer.`,
      c: `Teachers prefer online classes, while students prefer physical classes.`,
      d: `Schools should use computers for science subjects, while arts subjects should remain traditional.`,
    },
    correct: "a",
    explanation: `Supporters argue that educational technology builds student autonomy and accessibility, while critics contend that it widens the digital divide and hurts psychological development.`,
  },
  72: {
    text: `Based on paragraph 2, which option lists the two infrastructural challenges that affect digital learning in developing regions?`,
    options: {
      a: `Constant electricity blackouts and high financial costs of internet data.`,
      b: `Lack of school buildings and shortage of classroom furniture.`,
      c: `Too few trained teachers and outdated textbooks.`,
      d: `Poor road networks and expensive school uniforms.`,
    },
    correct: "a",
    explanation: `Paragraph 2 mentions frequent power outages and high data costs as massive hurdles for students in developing regions.`,
  },
  73: {
    text: `Which option best explains what the term "digital divide" refers to, in the context of the passage?`,
    options: {
      a: `The economic and social gap between students who have modern technology and internet access and those who do not.`,
      b: `The difference in size between old computers and new computers.`,
      c: `The distance between urban schools and rural schools.`,
      d: `The number of students who refuse to use digital devices.`,
    },
    correct: "a",
    explanation: `The digital divide is the economic and social gap between students who have modern technology and internet access and those who do not.`,
  },
  74: {
    text: `Which option states the two traditional academic skills the author believes must be preserved despite technological advancements?`,
    options: {
      a: `Standard pen-and-paper writing skills and critical analytical thinking.`,
      b: `Sports activities and extracurricular clubs.`,
      c: `Rote memorization and chanting of facts.`,
      d: `Cooking, cleaning and other domestic skills.`,
    },
    correct: "a",
    explanation: `The author says educators must preserve the core values of traditional writing, presentation, and critical analytical thinking.`,
  },
  75: {
    text: `Which option gives the author's ultimate recommendation to schools running a blended curriculum?`,
    options: {
      a: `Schools should abandon technology and return to traditional teaching only.`,
      b: `Schools should maintain a careful balance by building strong digital infrastructure while preserving core traditional academic values and assessments.`,
      c: `Schools should purchase a computer for every single student.`,
      d: `Schools should focus exclusively on online learning.`,
    },
    correct: "b",
    explanation: `The author recommends that schools maintain a careful balance by building strong digital infrastructure while preserving core traditional academic values and assessments.`,
  },
  76: {
    text: `"I have never seen such a brilliant performance," said the Principal. (Change this sentence into Indirect/Reported Speech.) Which option is correct?`,
    options: {
      a: `The Principal said that he/she had never seen such a brilliant performance.`,
      b: `The Principal said that he has never seen such a brilliant performance.`,
      c: `The Principal said that he never saw such a brilliant performance.`,
      d: `The Principal said that he will never see such a brilliant performance.`,
    },
    correct: "a",
    explanation: `In reported speech, the present perfect "have never seen" changes to the past perfect "had never seen" and the quotation marks are removed.`,
  },
  77: {
    text: `The assignment was so difficult that the students could not finish it on time. (Rewrite the sentence using the structure "too... to".) Which option is correct?`,
    options: {
      a: `The assignment was too difficult for the students to finish on time.`,
      b: `The assignment was too difficult to finish it by the students on time.`,
      c: `The assignment was so too difficult for the students to finish on time.`,
      d: `The assignment was too difficult that the students could not finish it.`,
    },
    correct: "a",
    explanation: `The correct "too... to" structure is: The assignment was too difficult for the students to finish on time.`,
  },
  78: {
    text: `If you do not work hard, you will fail the entry test. (Rewrite this sentence starting with the word "Unless".) Which option is correct?`,
    options: {
      a: `Unless you work hard, you will fail the entry test.`,
      b: `Unless you do not work hard, you will fail the entry test.`,
      c: `Unless you will work hard, you will fail the entry test.`,
      d: `Unless you fail the entry test, you will not work hard.`,
    },
    correct: "a",
    explanation: `"Unless" already means "if not", so the negative must be dropped: Unless you work hard, you will fail the entry test.`,
  },
  79: {
    text: `The cat drank the milk. (Change this sentence from Active Voice to Passive Voice.) Which option is correct?`,
    options: {
      a: `The milk was drunk by the cat.`,
      b: `The milk was drank by the cat.`,
      c: `The milk is drunk by the cat.`,
      d: `The milk had been drunk by the cat.`,
    },
    correct: "a",
    explanation: `In the passive voice, the past simple "drank" becomes the past participle "drunk": The milk was drunk by the cat.`,
  },
  80: {
    text: `Neither of the boys have brought their textbooks to class today. (Identify and correct the grammatical error.) Which option is correct?`,
    options: {
      a: `Neither of the boys has brought his textbook to class today.`,
      b: `Neither of the boys have bring their textbooks to class today.`,
      c: `Neither of the boys has brought their textbooks to class today.`,
      d: `Neither of the boys have brought his textbook to class today.`,
    },
    correct: "a",
    explanation: `"Neither" is singular, so the verb must be "has" and the pronoun "his" agrees with the singular subject: Neither of the boys has brought his textbook.`,
  },
  81: {
    text: `Although he was sick, but he still attended the mathematics seminar. (Identify the redundant word and rewrite the sentence correctly.) Which option is correct?`,
    options: {
      a: `Although he was sick, he still attended the mathematics seminar.`,
      b: `Although he was sick, but he attended the mathematics seminar.`,
      c: `Although he was sick, however he still attended the mathematics seminar.`,
      d: `Although he was sick but still attended the mathematics seminar.`,
    },
    correct: "a",
    explanation: `"Although" and "but" cannot be used together; the redundant word "but" is removed.`,
  },
  82: {
    text: `She sings beautiful. (Correct the word form error to make this sentence grammatically accurate.) Which option is correct?`,
    options: {
      a: `She sings beautifully.`,
      b: `She sings beautiful.`,
      c: `She sing beautiful.`,
      d: `She sings beauty.`,
    },
    correct: "a",
    explanation: `An adverb is needed to describe the verb "sings": the adjective "beautiful" becomes the adverb "beautifully".`,
  },
  83: {
    text: `I prefer reading novels than watching television programs. (Correct the prepositional error.) Which option is correct?`,
    options: {
      a: `I prefer reading novels to watching television programs.`,
      b: `I prefer reading novels than to watch television programs.`,
      c: `I prefer reading novels over watching television programs.`,
      d: `I prefer to read novels than watching television programs.`,
    },
    correct: "a",
    explanation: `The verb "prefer" takes the preposition "to", not "than": I prefer reading novels to watching television programs.`,
  },
  84: {
    text: `He is the most tallest boy in the senior secondary class. (Identify and correct the double superlative error.) Which option is correct?`,
    options: {
      a: `He is the tallest boy in the senior secondary class.`,
      b: `He is the most tall boy in the senior secondary class.`,
      c: `He is the most tallest boy in the senior secondary class.`,
      d: `He is taller boy in the senior secondary class.`,
    },
    correct: "a",
    explanation: `"Most" must be removed to eliminate the double superlative: He is the tallest boy in the senior secondary class.`,
  },
  85: {
    text: `The books which are on the table belongs to the new teacher. (Fix the subject-verb agreement error.) Which option is correct?`,
    options: {
      a: `The books which are on the table belong to the new teacher.`,
      b: `The books which is on the table belongs to the new teacher.`,
      c: `The books which are on the table belongs to the new teacher.`,
      d: `The books on the table belongs to the new teacher.`,
    },
    correct: "a",
    explanation: `The plural subject "books" requires the plural verb "belong": The books which are on the table belong to the new teacher.`,
  },
  86: {
    text: String.raw`The school authorities decided to \(\underline{\mathrm{curtail}}\) the closing time due to the approaching storm. Which word best replaces the underlined word without changing the meaning?`,
    options: { a: `shorten`, b: `extend`, c: `celebrate`, d: `ignore` },
    correct: "a",
    explanation: `To curtail means to shorten, reduce or decrease.`,
  },
  87: {
    text: String.raw`His explanation of the chemistry experiment was completely \(\underline{\mathrm{ambiguous}}\). Which word best replaces the underlined word without changing the meaning?`,
    options: { a: `unclear`, b: `precise`, c: `lengthy`, d: `quiet` },
    correct: "a",
    explanation: `Ambiguous means unclear, confusing or vague.`,
  },
  88: {
    text: String.raw`The student showed absolute \(\underline{\mathrm{deference}}\) to the visiting administrators. Which word best replaces the underlined word without changing the meaning?`,
    options: { a: `disrespect`, b: `indifference`, c: `respect`, d: `hostility` },
    correct: "c",
    explanation: `Deference means respect, compliance or submission.`,
  },
  89: {
    text: String.raw`We need to find an \(\underline{\mathrm{expeditious}}\) way to complete the database registration. Which word best replaces the underlined word without changing the meaning?`,
    options: { a: `slow`, b: `speedy`, c: `costly`, d: `complex` },
    correct: "b",
    explanation: `Expeditious means speedy, efficient or fast.`,
  },
  90: {
    text: String.raw`The scholarship committee noted that her essay was written with \(\underline{\mathrm{impeccable}}\) grammar. Which word best replaces the underlined word without changing the meaning?`,
    options: { a: `careless`, b: `basic`, c: `unusual`, d: `flawless` },
    correct: "d",
    explanation: `Impeccable means flawless, faultless or perfect.`,
  },
};

// ─────────────────────────────────────────────────────────────
// 7. BUILD ROWS (Q1–70 from parsed docx, Q71–90 crafted)
// ─────────────────────────────────────────────────────────────
const rows = [];
const problems = [];

for (let n = 1; n <= 90; n++) {
  const inst = applyEmphasis(instructionFor(n));
  const passage = n >= 61 && n <= 75 ? PASSAGE : "";

  if (n <= 70) {
    const q = questions.get(n);
    const key = answerKey.get(n);
    if (!q) { problems.push(`Q${n}: question paragraph not found`); continue; }
    const optLetters = Object.keys(q.options);
    if (optLetters.length !== 4) problems.push(`Q${n}: expected 4 options, got ${optLetters.length}`);
    const expected = ["A", "B", "C", "D"];
    if (!expected.every((L) => q.options[L])) problems.push(`Q${n}: missing option(s)`);
    if (!key) { problems.push(`Q${n}: no answer key entry`); continue; }

    rows.push({
      question: applyEmphasis(q.text),
      option_a: applyEmphasis(q.options.A || ""),
      option_b: applyEmphasis(q.options.B || ""),
      option_c: applyEmphasis(q.options.C || ""),
      option_d: applyEmphasis(q.options.D || ""),
      correct_option: key.letter,
      explanation: key.explanation,
      instruction: inst,
      passage,
    });
  } else {
    const c = crafted[n];
    if (!c) { problems.push(`Q${n}: no crafted data`); continue; }
    rows.push({
      question: applyEmphasis(c.text),
      option_a: applyEmphasis(c.options.a),
      option_b: applyEmphasis(c.options.b),
      option_c: applyEmphasis(c.options.c),
      option_d: applyEmphasis(c.options.d),
      correct_option: c.correct,
      explanation: c.explanation,
      instruction: inst,
      passage,
    });
  }
}

// ─────────────────────────────────────────────────────────────
// 7b. REBALANCE correct answers across A-D (fact-preserving)
//     Each question's 4 option texts stay the SAME — only the
//     LETTER positions are permuted, so the correct answer text
//     is factually identical, just relocated to a balanced slot.
// ─────────────────────────────────────────────────────────────
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Save original option text sets (sorted) for factual-identity validation
const optionSetsBefore = rows.map((r) =>
  [r.option_a, r.option_b, r.option_c, r.option_d]
    .map((s) => String(s).trim())
    .sort()
    .join("\u0001")
);

// Target: 90 questions -> a:23, b:23, c:22, d:22 (sum 90)
const LETTERS = ["a", "b", "c", "d"];
const targetCounts = { a: 23, b: 23, c: 22, d: 22 };

function maxRunLen(arr) {
  let max = 0, run = 1;
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] === arr[i - 1]) run++;
    else run = 1;
    if (run > max) max = run;
  }
  return max;
}

// Build a balanced target-letter list with NO 3+ runs.
// Guaranteed: retries with fresh seeds until maxRun <= 2 (bounded).
function buildTargets(seed) {
  const targets = [];
  for (const L of LETTERS) for (let i = 0; i < targetCounts[L]; i++) targets.push(L);

  const rng = mulberry32(seed);
  for (let i = targets.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [targets[i], targets[j]] = [targets[j], targets[i]];
  }

  // Break up runs of 3+ identical letters (repeat until stable)
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 2; i < targets.length; i++) {
      if (targets[i] === targets[i - 1] && targets[i] === targets[i - 2]) {
        for (let k = i + 1; k < targets.length; k++) {
          if (targets[k] !== targets[i]) {
            [targets[i], targets[k]] = [targets[k], targets[i]];
            changed = true;
            break;
          }
        }
      }
    }
  }
  return targets;
}

let targets = null;
for (let seed = 20260804; seed < 20260804 + 500 && !targets; seed++) {
  const candidate = buildTargets(seed);
  if (maxRunLen(candidate) <= 2) targets = candidate;
}
if (!targets) throw new Error("Failed to build a balanced answer layout");

// Apply: move the correct answer text into its target letter slot
for (let i = 0; i < rows.length; i++) {
  const row = rows[i];
  const target = targets[i];
  if (!target) continue; // guard if rows ever outnumber targets
  const current = row.correct_option;
  if (current === target) continue;
  const curText = row["option_" + current];
  const tgtText = row["option_" + target];
  row["option_" + current] = tgtText;
  row["option_" + target] = curText;
  row.correct_option = target;
}

// ─────────────────────────────────────────────────────────────
// 8. CSV GENERATION (standard quoting; matches upload parseCSV)
// ─────────────────────────────────────────────────────────────
function csvField(s) {
  const v = String(s);
  if (/[",\n]/.test(v)) return '"' + v.replace(/"/g, '""') + '"';
  return v;
}

const header = ["question", "option_a", "option_b", "option_c", "option_d", "correct_option", "explanation", "passage", "instruction"];
const lines = [header.join(",")];
for (const r of rows) {
  lines.push(header.map((h) => csvField(r[h])).join(","));
}
fs.writeFileSync("english-drill-questions.csv", "\ufeff" + lines.join("\r\n"), "utf8");

// ─────────────────────────────────────────────────────────────
// 9. VALIDATION
// ─────────────────────────────────────────────────────────────
// 9a. Re-parse with the upload route's parseCSV logic
function parseCSV(text) {
  const rows2 = [];
  const rawLines = text.split(/\r?\n/);
  let buffer = "";
  let inQuotes = false;
  for (const line of rawLines) {
    buffer += (buffer ? "\n" : "") + line;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') inQuotes = !inQuotes;
    }
    if (!inQuotes && buffer.trim().length > 0) {
      const values = [];
      let current = "";
      let q = false;
      for (let i = 0; i < buffer.length; i++) {
        const c = buffer[i];
        if (c === '"') q = !q;
        else if (c === "," && !q) { values.push(current.trim()); current = ""; }
        else current += c;
      }
      values.push(current.trim());
      if (values.length > 0 && values[0] !== "") rows2.push(values);
      buffer = "";
    }
  }
  return rows2;
}

const parsed = parseCSV(fs.readFileSync("english-drill-questions.csv", "utf8").replace(/^\ufeff/, ""));
const hdr = parsed[0];
const idx = (name) => hdr.indexOf(name);
let answerMismatches = 0;

console.log("=== CSV SUMMARY ===");
console.log("Header:", hdr.join(","));
console.log("Data rows:", parsed.length - 1);
console.log("");

for (let i = 1; i < parsed.length; i++) {
  const row = parsed[i];
  const qNum = i;
  const qText = row[idx("question")];
  const correct = row[idx("correct_option")];

  // Cross-check Q1-70 against the document answer key by ANSWER TEXT
  // (rebalancing intentionally relocates correct answers to new letters,
  // so compare the text in the correct slot against the key's word)
  if (qNum <= 70 && answerKey.has(qNum)) {
    const keyWord = answerKey.get(qNum).word.toLowerCase().replace(/[*_]/g, "").trim();
    if (keyWord) {
      const csvAnswerText = String(row[idx("option_" + correct)] || "").toLowerCase().replace(/[*_]/g, "");
      if (csvAnswerText !== keyWord && !csvAnswerText.includes(keyWord) && !keyWord.includes(csvAnswerText)) {
        answerMismatches++;
        console.log(`!! ANSWER TEXT MISMATCH Q${qNum}: csv="${csvAnswerText}" key="${keyWord}"`);
      }
    }
  }

  // Factual-identity: the 4 option texts must be unchanged after rebalancing
  const rowOptions = [row[idx("option_a")], row[idx("option_b")], row[idx("option_c")], row[idx("option_d")]]
    .map((s) => String(s).trim())
    .sort()
    .join("\u0001");
  if (optionSetsBefore[qNum - 1] !== rowOptions) {
    problems.push(`Q${qNum}: option set changed during rebalance`);
  }
  if (!row[idx("option_a")] || !row[idx("option_b")] || !row[idx("option_c")] || !row[idx("option_d")]) {
    problems.push(`Q${qNum}: empty option`);
  }
  if (!/^[a-e]$/.test(correct)) problems.push(`Q${qNum}: bad correct_option "${correct}"`);

  // LaTeX-corruption scan: words ending in times/imes, stray markdown, stray <u>
  const all = [qText, row[idx("option_a")], row[idx("option_b")], row[idx("option_c")], row[idx("option_d")], row[idx("explanation")], row[idx("instruction")], row[idx("passage")]].join(" ");
  if (/\b\w*times\b/.test(all) || /\b\w*imes\b/.test(all)) problems.push(`Q${qNum}: contains times/imes word (renderer corruption risk)`);
  if (/\*\*|\*[^*]*\*|\*\*__/.test(all.replace(/\\textit\{/g, ""))) problems.push(`Q${qNum}: leftover markdown markers`);
  if (/<u>|<\/u>/.test(all)) problems.push(`Q${qNum}: leftover <u> tag`);
}

console.log("Answer-text mismatches vs document key (Q1-70):", answerMismatches);
console.log("Problems:", problems.length ? problems : "none");
console.log("");

// New distribution + run-length report
const dist = {};
let maxRun = 0, run = 1, prev = "";
for (let i = 1; i < parsed.length; i++) {
  const L = String(parsed[i][idx("correct_option")] || "").toLowerCase();
  dist[L] = (dist[L] || 0) + 1;
  run = L === prev ? run + 1 : 1;
  if (run > maxRun) maxRun = run;
  prev = L;
}
console.log("Rebalanced distribution:", JSON.stringify(dist));
console.log("Longest run of identical letters:", maxRun);
console.log("");

// Preview first 3 and last 3 rows
const preview = [0, 1, 2, parsed.length - 3, parsed.length - 2, parsed.length - 1];
for (const i of preview) {
  if (i < 1 || i >= parsed.length) continue;
  const row = parsed[i];
  const show = (s) => (s && s.length > 95 ? s.slice(0, 95) + "..." : s);
  console.log(`--- Q${i} [${row[idx("correct_option")].toUpperCase()}] ---`);
  console.log("  Q:", show(row[idx("question")]));
  console.log("  A:", show(row[idx("option_a")]));
  console.log("  B:", show(row[idx("option_b")]));
  console.log("  C:", show(row[idx("option_c")]));
  console.log("  D:", show(row[idx("option_d")]));
}

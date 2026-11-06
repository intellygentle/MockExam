import { before, beforeEach, after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const db = new PGlite();
const student = "Ada";
const school = "Civic School";
const answer = "Everyone, including government leaders, is subject to the law.";
const cardId = randomUUID();
let lessonId;
const section = (changes = {}) => ({ id: cardId, heading: "Rule of law", kind: "definition",
  prompt: "Define the rule of law.", answer, explanation: "", ...changes });
const call = async (name, args = []) => (await db.query(
  `select public.${name}(${args.map((_, i) => `$${i + 1}`).join(", ")}) as value`, args)).rows[0].value;
const owner = () => db.exec("reset role");
const pupil = () => db.exec("set role anon");
const library = (name = student, schoolName = school) => call("recall_library", [name, schoolName]);
const read = () => call("read_recall_lesson", [student, school, lessonId]);
const next = (previous = null) => call("begin_recall_review", [student, school, lessonId, previous]);
const submit = (card, text = answer, reveal = false, requestId = randomUUID(), name = student, schoolName = school) =>
  call("submit_recall_review", [name, schoolName, card.review_id, requestId, text, reveal]);
async function progress() {
  await owner();
  const value = (await db.query("select * from public.recall_progress where student_name = $1 and school_name = $2 and card_id = $3", [student, school, cardId])).rows[0];
  await pupil();
  return value;
}
async function makeDue(hours = 0) {
  await owner();
  await db.query("update public.recall_progress set due_at = now() - interval '1 minute', last_seen_at = now() - $1 * interval '1 hour'", [hours]);
  await pupil();
}
async function save(cards, revision = 1, published = true, id = lessonId) {
  await db.exec("set role service_role");
  try { return await call("save_recall_lesson", [id, 1, "Rule of law", "Civic Education notes", published, revision, JSON.stringify(cards)]); }
  finally { await pupil(); }
}

before(async () => {
  await db.exec("create role anon; create role authenticated; create role service_role bypassrls; create table public.subjects(id bigint primary key, name text, level text); insert into public.subjects values(1, 'Civic Education', 'ss3');");
  const migration = await readFile(new URL("../src/supabase/migration-v6-subject-recall.sql", import.meta.url), "utf8");
  await db.exec(migration);
  await db.exec(migration);
});
beforeEach(async () => {
  await owner();
  await db.exec("truncate public.recall_lessons cascade");
  lessonId = await save([section()], 0, true, null);
});
after(() => db.close());

test("published notes appear in the library without model answers; reading starts an immediate check", async () => {
  const initial = await library();
  assert.equal(initial.lessons[0].subject_name, "Civic Education");
  assert.equal(initial.stats.studied_cards, 0);
  assert.ok(!JSON.stringify(initial).includes(answer));
  const notes = await read();
  assert.equal(notes.cards[0].answer, answer);
  const state = await progress();
  assert.ok(new Date(state.due_at) <= new Date(state.last_seen_at));
  const queue = await next();
  assert.equal(queue.card.prompt, section().prompt);
  assert.ok(!JSON.stringify(queue).includes(answer));
});

test("a topic holds definition, terminology, importance and other subtopics studied together", async () => {
  const sectionId = randomUUID();
  const cards = [
    section({ section_id: sectionId }),
    section({ id: randomUUID(), section_id: sectionId, kind: "terminology", prompt: "Law", answer: "A rule enforced by the state." }),
    section({ id: randomUUID(), section_id: sectionId, kind: "importance", prompt: "State one importance.", answer: "It protects rights." }),
    section({ id: randomUUID(), section_id: sectionId, kind: "features", prompt: "Features of the rule of law", answer: "Equality before the law." }),
    section({ id: randomUUID(), section_id: sectionId, kind: "other", prompt: "Example", answer: "A citizen can sue a minister." }),
  ];
  await save(cards);
  const notes = await read();
  assert.deepEqual(notes.cards.map((card) => card.section_id), cards.map(() => sectionId));
  assert.deepEqual(notes.cards.map((card) => card.kind), ["definition", "terminology", "importance", "features", "other"]);
  assert.equal((await library()).stats.due_cards, 5);
  const first = (await next()).card;
  assert.equal((await submit(first, notes.cards.find((card) => card.id === first.id).answer)).correct, true);
  await makeDue();
  const second = (await next(first.id)).card;
  assert.equal((await submit(second, notes.cards.find((card) => card.id === second.id).answer)).correct, true);
  assert.equal((await library()).stats.studied_cards, 5);
});

test("exact checking ignores capitalisation and whitespace", async () => {
  await read(); await makeDue();
  const result = await submit((await next()).card, `  ${answer.toUpperCase().replaceAll(" ", "\n\t\u00a0  ")}  `);
  assert.equal(result.correct, true);
});

test("different wording, punctuation, spelling, missing and extra words are incorrect", async () => {
  for (const text of [answer.slice(0, -1), answer.replace("subject", "subjet"), "Everyone must obey the law.", `${answer} Always.`, answer.replace("government leaders", "leaders government")]) {
    await read(); await makeDue();
    assert.equal((await submit((await next()).card, text)).correct, false);
  }
});

test("correct first answers advance to monthly checks and continue returning", async () => {
  await read();
  for (const [index, minutes] of [10, 1440, 4320, 10080, 20160, 43200, 43200].entries()) {
    await makeDue(25); await submit((await next()).card);
    const state = await progress();
    assert.equal(state.step, Math.min(index + 1, 6));
    assert.equal(new Date(state.due_at) - new Date(state.last_reviewed_at), minutes * 60000);
    assert.equal((await next()).card, null);
  }
});

test("a wrong delayed answer followed by a correct retry stays a failed retention check", async () => {
  await read(); await makeDue(25);
  const card = (await next()).card;
  assert.equal((await submit(card, "No one obeys the law.")).delayed, true);
  const retry = await submit(card);
  assert.equal(retry.correct, true);
  assert.equal(retry.first_attempt, false);
  const state = await progress();
  assert.equal(state.first_attempts, 1);
  assert.equal(state.first_correct, 0);
  assert.equal(state.delayed_attempts, 1);
  assert.equal(state.delayed_correct, 0);
  assert.equal(state.step, 0);
  assert.equal(new Date(state.due_at) - new Date(state.last_reviewed_at), 120000);
});

test("24 hours since the last exposure is required for delayed scoring", async () => {
  await read(); await makeDue(23.9);
  assert.equal((await submit((await next()).card)).delayed, false);
  await makeDue(24);
  assert.equal((await submit((await next()).card)).delayed, true);
  assert.equal((await progress()).delayed_attempts, 1);
});

test("showing the answer is a miss and five tries schedule a break", async () => {
  await read(); await makeDue(25);
  const card = (await next()).card;
  const reveal = await submit(card, "", true);
  assert.equal(reveal.correct, false);
  assert.equal(reveal.expected_answer, answer);
  let result;
  for (let i = 1; i < 5; i++) result = await submit(card, "Still learning.");
  assert.equal(result.review_finished, true);
  assert.equal((await progress()).attempt_ids.length, 5);
  await assert.rejects(() => submit(card), /complete/);
  assert.equal((await next()).card, null);
});

test("duplicate network requests and old request replays cannot inflate counts", async () => {
  await read(); await makeDue(25);
  const card = (await next()).card;
  const wrongId = randomUUID(); const correctId = randomUUID();
  await submit(card, "Not remembered.", false, wrongId);
  await submit(card, answer, false, correctId);
  assert.equal((await submit(card, answer, false, correctId)).correct, true);
  assert.equal((await submit(card, "Not remembered.", false, wrongId)).correct, false);
  const state = await progress();
  assert.equal(state.attempt_ids.length, 2);
  assert.equal(state.first_attempts, 1);
  assert.equal(state.delayed_correct, 0);
  await assert.rejects(() => submit(card), /complete/);
});

test("retained status needs three delayed successes and current reviews", async () => {
  await read();
  for (let i = 0; i < 3; i++) { await makeDue(25); await submit((await next()).card); }
  assert.equal((await library()).stats.retained_cards, 1);
  await makeDue(25);
  assert.equal((await library()).stats.retained_cards, 0);
  await submit((await next()).card, "I forgot.");
  assert.equal((await progress()).delayed_streak, 0);
});

test("rereading invalidates outstanding questions and prevents fresh exposure counting as retention", async () => {
  await read(); await makeDue(25);
  const old = (await next()).card;
  await read();
  await assert.rejects(() => submit(old), /changed/);
  assert.equal((await submit((await next()).card)).delayed, false);
});

test("nickname and school identify independent progress", async () => {
  await read(); await makeDue();
  const card = (await next()).card;
  await assert.rejects(() => submit(card, answer, false, randomUUID(), "Another pupil"), /changed/);
  await assert.rejects(() => submit(card, answer, false, randomUUID(), student, "Another school"), /changed/);
  assert.equal((await library(student, "Another school")).stats.studied_cards, 0);
  assert.equal((await library()).stats.studied_cards, 1);
});

test("unpublished lessons disappear and reject in-flight answers", async () => {
  await read(); await makeDue();
  const card = (await next()).card;
  await save([section()], 1, false);
  assert.equal((await library()).count, 0);
  await assert.rejects(read, /not available/);
  await assert.rejects(next, /not available/);
  await assert.rejects(() => submit(card), /changed/);
});

test("pupils cannot read answer tables, edit notes, change scores or access staff reports", async () => {
  await assert.rejects(() => db.query("select * from public.recall_cards"), /permission/);
  await assert.rejects(() => db.query("update public.recall_progress set first_correct = 100"), /permission/);
  await assert.rejects(() => call("save_recall_lesson", [null, 1, "Unsafe", "", true, 0, "[]"]), /permission/);
  await assert.rejects(() => call("recall_lesson_report", [lessonId]), /permission/);
  await assert.rejects(() => call("recall_lesson_stats", [student, school]), /permission/);
});

test("cosmetic changes preserve progress, while new wording resets only its section", async () => {
  const second = section({ id: randomUUID(), heading: "Importance", prompt: "State one importance.", answer: "It protects rights." });
  await save([section(), second]);
  await read();
  await save([section({ answer: answer.toUpperCase().replaceAll(" ", "  ") }), second], 2);
  assert.equal((await library()).stats.studied_cards, 2);
  await save([section({ prompt: "What is the meaning of the rule of law?" }), second], 3);
  assert.equal((await library()).stats.studied_cards, 1);
  assert.equal(await progress(), undefined);
});

test("stale edits cannot overwrite newer notes", async () => {
  await save([section({ answer: "A revised definition." })]);
  await assert.rejects(() => save([section()], 1), /changed/);
  assert.equal((await read()).cards[0].answer, "A revised definition.");
});

test("invalid section lists roll back atomically", async () => {
  await assert.rejects(() => save([]), /before publishing/);
  await assert.rejects(() => save(Array.from({ length: 51 }, () => section({ id: randomUUID() }))), /50/);
  await assert.rejects(() => save([section(), section()]), /unique/);
  assert.equal((await read()).cards[0].answer, answer);
});

test("daily practice counts distinct sections in West Africa Time", async () => {
  await read(); await makeDue();
  const card = (await next()).card;
  await submit(card, "I forgot."); await submit(card);
  assert.equal((await library()).stats.practised_today, 1);
  await owner();
  await db.exec("update public.recall_progress set last_reviewed_at = ((now() at time zone 'Africa/Lagos')::date - interval '1 minute') at time zone 'Africa/Lagos'");
  await pupil();
  assert.equal((await library()).stats.practised_today, 0);
});

test("mixed practice returns a different due section when possible", async () => {
  const second = section({ id: randomUUID(), heading: "Importance", prompt: "State one importance.", answer: "It protects rights." });
  await save([section(), second]); await read(); await makeDue();
  assert.equal((await next(cardId)).card.id, second.id);
});

test("staff reporting distinguishes learning checks from delayed retention", async () => {
  await read(); await makeDue(); await submit((await next()).card);
  await db.exec("set role service_role");
  const report = (await db.query("select * from public.recall_lesson_report($1)", [lessonId])).rows[0];
  assert.equal(report.student_name, student);
  assert.equal(report.school_name, school);
  assert.equal(Number(report.first_correct), 1);
  assert.equal(Number(report.delayed_correct), 0);
  assert.equal(Number(report.retained_cards), 0);
});

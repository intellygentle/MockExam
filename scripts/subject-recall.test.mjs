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
const startSession = (mode = "master", id = randomUUID(), lesson = null, topic = null) =>
  call("start_recall_session", [student, school, id, mode, lesson, topic]);
const answerSession = (session, text = answer, reveal = false, requestId = randomUUID()) =>
  call("submit_recall_session", [student, school, session.id, session.card.review_id, requestId, text, reveal]);
const advanceSession = (session) => call("advance_recall_session", [student, school, session.id, session.position]);
const getSession = (id, name = student, schoolName = school) => call("get_recall_session", [name, schoolName, id]);
const sessionsMigration = () => readFile(new URL("../src/supabase/migration-v7-recall-sessions.sql", import.meta.url), "utf8");
const refinementsMigration = () => readFile(new URL("../src/supabase/migration-v8-recall-refinements.sql", import.meta.url), "utf8");
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
async function save(cards, revision = 1, published = true, id = lessonId, subjectId = 1) {
  await db.exec("set role service_role");
  try { return await call("save_recall_lesson", [id, subjectId, "Rule of law", "Civic Education notes", published, revision, JSON.stringify(cards)]); }
  finally { await pupil(); }
}

before(async () => {
  await db.exec("create role anon; create role authenticated; create role service_role bypassrls; create table public.subjects(id bigint primary key, name text, level text not null check (level in ('jss3', 'ss3'))); insert into public.subjects values(1, 'Civic Education', 'ss3');");
  const migration = await readFile(new URL("../src/supabase/migration-v6-subject-recall.sql", import.meta.url), "utf8");
  await db.exec(migration);
  await db.exec(migration);
  const upgrade = await sessionsMigration();
  await db.exec(upgrade);
  await db.exec(upgrade);
  await db.exec(await refinementsMigration());
  await db.exec(await refinementsMigration());
});
beforeEach(async () => {
  await owner();
  await db.exec("truncate public.recall_lessons cascade; truncate public.recall_sessions; delete from public.subjects where id <> 1");
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

test("custom subjects and levels work throughout recall and survive rerunning the migration", async () => {
  await owner();
  await db.query("insert into public.subjects values(2, $1, $2)", ["Robotics & Design", "foundation year"]);
  await save([section()], 1, true, lessonId, 2);
  await read();
  await owner();
  await db.exec(await readFile(new URL("../src/supabase/migration-v6-subject-recall.sql", import.meta.url), "utf8"));
  await db.exec(await sessionsMigration());
  await db.exec(await refinementsMigration());
  await pupil();
  const notes = await library();
  assert.deepEqual(notes.subjects, [{ id: 2, name: "Robotics & Design", level: "foundation year" }]);
  assert.equal(notes.lessons[0].level, "foundation year");
  assert.equal(notes.stats.studied_cards, 1);
  assert.equal((await next()).card.subject_name, "Robotics & Design");
});

test("custom levels reject blank and overlong values", async () => {
  await owner();
  for (const level of ["", "   ", "x".repeat(121)]) {
    await assert.rejects(() => db.query("insert into public.subjects values(2, 'Robotics', $1)", [level]), /subjects_level_check/);
  }
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

test("content blocks preserve topic, piece and list ordering across publish and read", async () => {
  const topic = randomUUID();
  const otherTopic = randomUUID();
  const definition = section({ section_id: topic });
  const functions = section({ id: randomUUID(), section_id: topic, kind: "functions", prompt: "State the functions.",
    answer: "Protect rights.\nResolve disputes.\nMaintain order.", answer_format: "list", explanation: "Courts help settle disputes." });
  const second = section({ id: randomUUID(), section_id: otherTopic, heading: "Citizenship", prompt: "Define citizenship.", answer: "Membership of a state." });
  await save([second, functions, definition]);
  const notes = await read();
  assert.deepEqual(notes.cards.map((card) => card.id), [second.id, functions.id, definition.id]);
  assert.deepEqual(notes.cards.map((card) => card.position), [0, 1, 2]);
  assert.equal(notes.cards[1].answer_format, "list");
  assert.equal(notes.cards[1].answer, functions.answer);
  await save([definition, functions, second], 2);
  assert.equal((await library()).stats.studied_cards, 3, "reordering preserves progress");
});

test("content validation rejects blank list items and inconsistent topic headings atomically", async () => {
  await assert.rejects(() => save([section({ answer_format: "list", answer: "First.\n\nThird." })]), /non-empty/);
  await assert.rejects(() => save([section({ answer_format: "list", answer: Array(21).fill("Item.").join("\n") })]), /20/);
  await assert.rejects(() => save([section({ answer_format: "unknown" })]), /answer_format/);
  await assert.rejects(() => save([section({ section_id: cardId }), section({ id: randomUUID(), section_id: cardId, heading: "Different topic" })]), /same heading/);
  assert.equal((await read()).cards[0].answer, answer);
});

test("single-note sessions include just that topic and never expose answers before a check", async () => {
  const topic = randomUUID();
  const list = section({ id: randomUUID(), section_id: topic, kind: "features", prompt: "List the features.",
    answer: "Equality.\nFairness.", answer_format: "list" });
  await save([section({ section_id: topic }), list, section({ id: randomUUID(), heading: "Another note" })]);
  await read();
  let session = await startSession("note", randomUUID(), lessonId, topic);
  assert.equal(session.total, 2);
  assert.equal(session.card.section_id, topic);
  assert.equal(session.card.id, cardId);
  assert.ok(!JSON.stringify(session).includes(answer));
  session = await answerSession(session);
  session = await advanceSession(session);
  assert.equal(session.card.id, list.id);
  assert.equal(session.card.item_count, 2);
  session = await answerSession(session, "Fairness.\nEquality.");
  assert.equal(session.feedback.result.correct, false, "list order matters");
  session = await answerSession(session, " equality.  \n FAIRNESS. ");
  assert.equal(session.feedback.result.correct, true);
  assert.equal(session.completed, 2);
  assert.equal(session.results[1].correct, false, "a retry does not rewrite the first answer");
  session = await advanceSession(session);
  assert.equal(session.status, "complete");
  assert.equal(session.card, null);
});

test("master test includes all studied, published topics across subjects, including not-yet-due questions", async () => {
  await read();
  const unreadId = await save([section({ id: randomUUID() })], 0, true, null);
  await owner(); await db.exec("insert into public.subjects values(2, 'Biology', 'ss3')");
  const biologyCard = section({ id: randomUUID(), heading: "Cells", answer: "The basic unit of life." });
  const biologyId = await save([biologyCard], 0, true, null, 2);
  await call("read_recall_lesson", [student, school, biologyId]);
  const hiddenId = await save([section({ id: randomUUID() })], 0, true, null);
  await call("read_recall_lesson", [student, school, hiddenId]);
  await save([section({ id: randomUUID() })], 1, false, hiddenId);
  await owner(); await db.exec("update public.recall_progress set due_at = now() + interval '3 days'"); await pupil();
  let session = await startSession();
  assert.equal(session.total, 2);
  const ids = [];
  while (session.card) {
    ids.push(session.card.id);
    assert.notEqual(session.card.lesson_id, unreadId);
    assert.equal(session.card.scheduled, false);
    session = await answerSession(session, session.card.id === cardId ? answer : biologyCard.answer);
    session = await advanceSession(session);
  }
  assert.deepEqual(ids.sort(), [cardId, biologyCard.id].sort());
  assert.equal(session.completed, 2);
});

test("master pools are shuffled once per session and remain stable on resume", async () => {
  const cards = Array.from({ length: 8 }, (_, index) => section({ id: randomUUID(), heading: `Topic ${index}` }));
  await save(cards); await read();
  const orders = [];
  for (const seed of [0.1, 0.8]) {
    await db.query("select setseed($1)", [seed]);
    const session = await startSession();
    const resumed = await getSession(session.id);
    assert.equal(resumed.card.id, session.card.id);
    await owner();
    orders.push((await db.query("select cards from public.recall_sessions")).rows[0].cards.map((card) => card.id));
    await pupil();
  }
  assert.deepEqual([...orders[0]].sort(), cards.map((card) => card.id).sort());
  assert.notDeepEqual(orders[0], orders[1]);
});

test("start, answer and next are idempotent and a missed question never re-enters the finite pool", async () => {
  const second = section({ id: randomUUID() });
  await save([section(), second]); await read();
  let session = await startSession("lesson", randomUUID(), lessonId);
  assert.deepEqual(await startSession("lesson", session.id, lessonId), session);
  await assert.rejects(() => advanceSession(session), /Check your answer/);
  const requestId = randomUUID();
  session = await answerSession(session, "I forgot.", false, requestId);
  assert.equal((await answerSession(session, "I forgot.", false, requestId)).completed, 1);
  assert.equal((await getSession(session.id)).feedback.answer, "I forgot.");
  const first = session;
  session = await advanceSession(session);
  assert.equal(session.card.id, second.id);
  assert.equal((await advanceSession(first)).card.id, second.id);
  await makeDue(25);
  session = await answerSession(session);
  session = await advanceSession(session);
  assert.equal(session.status, "complete");
  assert.equal(session.total, 2);
  assert.equal(session.results.filter((result) => result.correct).length, 1);
  assert.equal((await library()).stats.first_attempts, 2);
});

test("early practice preserves the spaced schedule and cannot manufacture delayed retention", async () => {
  await read(); await makeDue(25); await submit((await next()).card);
  const previous = await progress();
  await owner(); await db.exec("update public.recall_progress set last_seen_at = now() - interval '25 hours'"); await pupil();
  const session = await startSession();
  assert.equal(session.card.scheduled, false);
  assert.equal(session.card.delayed, false);
  const result = await answerSession(session);
  assert.equal(result.feedback.result.delayed, false);
  const current = await progress();
  assert.equal(current.step, previous.step);
  assert.deepEqual(current.due_at, previous.due_at);
  assert.equal(current.delayed_attempts, previous.delayed_attempts);
  assert.equal(current.delayed_streak, previous.delayed_streak);
});

test("an early miss schedules relearning and stays highlighted even after a correct retry", async () => {
  await read(); await submit((await next()).card);
  let session = await startSession();
  session = await answerSession(session, "I forgot.");
  session = await answerSession(session);
  const state = await progress();
  assert.equal(state.step, 0);
  assert.equal(new Date(state.due_at) - new Date(state.last_reviewed_at), 120000);
  const data = await library();
  assert.equal(data.stats.first_correct, 1);
  assert.equal(data.stats.first_attempts, 2);
  assert.equal(data.review_note_count, 1);
  assert.equal(data.review_notes[0].incorrect_cards, 1);
  assert.equal(data.review_notes[0].section_id, cardId);
  assert.equal(data.review_notes[0].lesson_id, lessonId);
  await makeDue();
  await answerSession(await startSession());
  assert.equal((await library()).review_note_count, 0);
});

test("daily sessions snapshot due questions and lesson sessions are scoped to the selected lesson", async () => {
  await read(); await submit((await next()).card);
  assert.equal((await startSession("due")).total, 0);
  assert.equal((await startSession("lesson", randomUUID(), lessonId)).total, 1);
  await makeDue(25);
  const due = await startSession("due");
  assert.equal(due.total, 1);
  assert.equal(due.card.delayed, true);
  const checked = await answerSession(due);
  assert.equal(checked.feedback.result.delayed, true);
});

test("session identities, modes and note membership are checked by the database", async () => {
  await read();
  const session = await startSession();
  await assert.rejects(() => getSession(session.id, "Another pupil"), /no longer active/);
  await assert.rejects(() => getSession(session.id, student, "Another school"), /no longer active/);
  await assert.rejects(() => startSession("everything"), /valid recall/);
  await assert.rejects(() => startSession("master", randomUUID(), lessonId), /valid recall/);
  await assert.rejects(() => startSession("note", randomUUID(), lessonId, randomUUID()), /not available/);
  await assert.rejects(() => call("start_recall_session", [" ", school, randomUUID(), "master"]), /nickname/);
});

test("a replacement session invalidates old writes and cannot leak its questions to another identity", async () => {
  await read();
  const old = await startSession();
  const current = await startSession();
  await assert.rejects(() => answerSession(old), /no longer active/);
  await assert.rejects(() => call("submit_recall_session", ["Other", school, current.id, current.card.review_id, randomUUID(), answer, false]), /no longer active/);
  assert.equal((await library()).stats.first_attempts, 0);
});

test("content edits and unpublishing invalidate in-flight questions without accepting stale answers", async () => {
  await read();
  const session = await startSession();
  await save([section({ answer: "A changed definition." })]);
  assert.equal((await getSession(session.id)).status, "changed");
  await assert.rejects(() => answerSession(session), /changed/);
  await read();
  const second = await startSession();
  await save([section({ answer: "A changed definition." })], 2, false);
  assert.equal((await getSession(second.id)).status, "changed");
  await assert.rejects(() => answerSession(second), /changed/);
  assert.equal((await library()).review_note_count, 0);
});

test("format changes reset only their question, while cosmetic prompt changes preserve progress", async () => {
  const second = section({ id: randomUUID() });
  await save([section(), second]); await read();
  await save([section({ prompt: "  DEFINE THE RULE OF LAW.  " }), second], 2);
  assert.equal((await library()).stats.studied_cards, 2);
  await save([section({ answer_format: "list" }), second], 3);
  assert.equal((await library()).stats.studied_cards, 1);
});

test("the upgrade is rerunnable with saved function lists, scores and a live session", async () => {
  await save([section({ kind: "functions", answer_format: "list", answer: "Protect rights.\nMaintain order." })]);
  await read();
  const session = await answerSession(await startSession(), "Protect rights. Maintain order.");
  await owner(); await db.exec(await sessionsMigration()); await db.exec(await refinementsMigration()); await pupil();
  assert.equal((await getSession(session.id)).completed, 1);
  assert.equal((await library()).stats.first_correct, 1);
});

test("pupils cannot read or mutate session tables or execute private state helpers", async () => {
  await assert.rejects(() => db.query("select * from public.recall_sessions"), /permission/);
  await assert.rejects(() => db.query("update public.recall_sessions set results = '[]'"), /permission/);
  await assert.rejects(() => call("recall_session_state", [student, school, randomUUID()]), /permission/);
  await assert.rejects(() => call("recall_note_insights", [student, school]), /permission/);
});

test("reading one note reveals and reschedules only that topic", async () => {
  const topic = randomUUID();
  const other = section({ id: randomUUID(), heading: "Citizenship", answer: "Membership of a state." });
  await save([section({ section_id: topic }), section({ id: randomUUID(), section_id: topic, kind: "importance" }), other]);
  await read();
  await owner();
  await db.exec("update public.recall_progress set step = 3, due_at = now() + interval '7 days', last_seen_at = now() - interval '2 days'");
  const previous = (await db.query("select * from public.recall_progress where card_id = $1", [other.id])).rows[0];
  await pupil();
  const notes = await call("read_recall_note", [student, school, lessonId, topic]);
  assert.equal(notes.cards.length, 2);
  assert.ok(notes.cards.every((card) => card.section_id === topic));
  assert.ok(!JSON.stringify(notes).includes(other.answer));
  assert.equal((await library()).stats.due_cards, 2);
  await owner();
  assert.deepEqual((await db.query("select * from public.recall_progress where card_id = $1", [other.id])).rows[0], previous);
});

test("a note must belong to its published lesson before reading can record exposure", async () => {
  await assert.rejects(() => call("read_recall_note", [student, school, lessonId, randomUUID()]), /not available/);
  await assert.rejects(() => call("read_recall_note", [student, school, randomUUID(), cardId]), /not available/);
  await assert.rejects(() => call("read_recall_note", [" ", school, lessonId, cardId]), /nickname/);
  assert.equal((await library()).stats.studied_cards, 0);
  await save([section()], 1, false);
  await assert.rejects(() => call("read_recall_note", [student, school, lessonId, cardId]), /not available/);
});

test("reading another note preserves the active recall, while rereading its own note invalidates it", async () => {
  const other = section({ id: randomUUID(), heading: "Citizenship" });
  await save([section(), other]); await read();
  const session = await startSession("note", randomUUID(), lessonId, cardId);
  await call("read_recall_note", [student, school, lessonId, other.id]);
  assert.equal((await getSession(session.id)).status, "active");
  await call("read_recall_note", [student, school, lessonId, cardId]);
  assert.equal((await getSession(session.id)).status, "changed");
});

test("an old answer replay cannot replace a later successful retry or change first-answer results", async () => {
  await read();
  const wrongId = randomUUID();
  const session = await answerSession(await startSession(), "I forgot.", false, wrongId);
  const correct = await answerSession(session);
  const replay = await answerSession(session, "A different network payload.", false, wrongId);
  assert.deepEqual(replay.feedback, correct.feedback);
  assert.equal(replay.feedback.result.correct, true);
  assert.equal(replay.feedback.answer, answer);
  assert.equal(replay.results[0].correct, false);
  assert.equal((await progress()).attempt_ids.length, 2);
});

test("list feedback distinguishes exact items without awarding partial credit", async () => {
  await save([section({ answer_format: "list", answer: "Protect rights.\nResolve disputes.\nMaintain order." })]);
  await read();
  let session = await answerSession(await startSession(), " protect RIGHTS.\nMaintain order.\nResolve disputes.");
  assert.equal(session.feedback.result.correct, false);
  assert.deepEqual(session.feedback.result.items, [{ position: 1, correct: true }, { position: 2, correct: false }, { position: 3, correct: false }]);
  assert.equal((await library()).stats.first_correct, 0);
  session = await answerSession(session, "Protect rights. Resolve disputes. Maintain order.");
  assert.equal(session.feedback.result.correct, true);
  assert.equal(session.feedback.result.items, null, "single-line exact answers must not get contradictory item hints");
  assert.equal(session.results[0].correct, false);
});

test("reveals and incomplete list line counts do not produce misleading item feedback", async () => {
  await save([section({ answer_format: "list", answer: "Protect rights.\nMaintain order." })]);
  await read();
  let session = await answerSession(await startSession(), "", true);
  assert.equal(session.feedback.result.items, null);
  session = await answerSession(session, "Protect rights.");
  assert.equal(session.feedback.result.correct, false);
  assert.equal(session.feedback.result.items, null);
});

test("teacher note insights agree with student totals and distinguish school identities", async () => {
  const other = section({ id: randomUUID(), heading: "Citizenship" });
  await save([section(), other]); await read();
  const session = await answerSession(await startSession("note", randomUUID(), lessonId, cardId), "I forgot.");
  await answerSession(session);
  await call("read_recall_note", [student, "Another school", lessonId, cardId]);
  const another = await call("start_recall_session", [student, "Another school", randomUUID(), "note", lessonId, cardId]);
  await call("submit_recall_session", [student, "Another school", another.id, another.card.review_id, randomUUID(), answer, false]);
  const mine = (await library()).stats;
  const theirs = (await library(student, "Another school")).stats;
  await assert.rejects(() => call("recall_topic_report", [lessonId]), /permission/);
  await assert.rejects(() => call("recall_list_feedback", [answer, answer, true, false]), /permission/);
  await db.exec("set role service_role");
  const topics = (await db.query("select * from public.recall_topic_report($1)", [lessonId])).rows;
  assert.equal(topics.length, 2);
  assert.equal(Number(topics[0].students), 2);
  assert.equal(Number(topics[0].total_cards), 1);
  assert.equal(Number(topics[0].first_attempts), mine.first_attempts + theirs.first_attempts);
  assert.equal(Number(topics[0].first_correct), mine.first_correct + theirs.first_correct);
  assert.equal(Number(topics[0].incorrect_cards), 1, "a successful retry keeps the first-answer miss highlighted");
  assert.equal(Number(topics[1].first_attempts), 0);
});

test("the refinements migration preserves a live session and its latest feedback on rerun", async () => {
  await read();
  const session = await answerSession(await startSession());
  await owner(); await db.exec(await refinementsMigration()); await pupil();
  assert.deepEqual(await getSession(session.id), session);
  assert.equal((await library()).stats.first_correct, 1);
});

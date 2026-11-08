# Adding topics to Scholars Arena: agent workflow

Use this guide when a user supplies notes and asks you to add or update a topic,
complete missing material, and create recall questions. It records the process
used for the successful **Taxation (JSS3)** upload on **8 November 2026**.

The workflow is:

**Read the whole source → inspect the existing lesson → complete and organise
the notes → prepare exact-answer cards → validate → publish atomically → verify.**

Read [SUBJECT_RECALL.md](SUBJECT_RECALL.md) for the learning rules and database
setup. Content authoring uses the existing reading layout, definition callouts,
single-note recall, master test, and analytics.

## 1. Start with the entire source

1. Read the supplied file completely, including comments, trailing questions,
   additional content, and instructions to fill gaps.
2. Record the lesson title, headings, definitions, lists, examples, and unanswered
   requests. Turn this into a coverage checklist before writing the lesson.
3. Preserve the original source file. Prepare cleaned content separately.
4. Identify duplicate definitions, unfinished answers, incorrect numbering,
   misplaced headings, ambiguous quantities, and potentially outdated facts.
5. Resolve subject and level from the existing lesson or the user's instructions.
   If neither identifies them, ask the user for the missing information.

For Taxation, the source contained two definitions, objectives, features,
principles, tax examples, agency names, and these additional requests:

- State four principles of taxation **with examples**.
- Briefly explain **five** types of taxation.
- State five tax/regulatory bodies and their names.

Each request needed both completed reading material and a recall question.

## 2. Inspect the live target before preparing an update

Confirm the workspace's configured database and deployment. At the time of the
Taxation upload, the production site was `https://npfmoc.vercel.app`, the Vercel
project was `npfmoc`, and Supabase used project `ifrxmoftzfyhfyconvxa`.
Verify these against the current environment/project configuration.

Load credentials programmatically; report presence or success, not secret values.
For a temporary Node script run with the repository as its working directory:

```js
import { loadEnvFile } from "node:process";
loadEnvFile(".env.local");
```

Use Node 22.13+ for the project's existing tooling.

| Configuration | Purpose |
| --- | --- |
| `SUPABASE_URL` | Identify the configured database project. |
| `SUPABASE_ANON_KEY` | Read the public library and exercise checked student RPCs. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only inspection of lessons/cards and owner reports. |
| `ADMIN_SECRET_KEY` | Sign in to the application's owner API. |
| `SECRET_ADMIN_PATH` | Locate the admin UI at `/<configured-path>/recall`. |
| `SUPABASE_ACCESS_TOKEN` | Optional account token for Management API SQL verification or migrations. |

The anonymous key cannot run migrations. The service-role API key supports owner
data access; it is not a Supabase account access token for executing arbitrary SQL.
Keep environment files, tokens, cookies, and credential-bearing output out of Git
and chat. Do not obtain credentials by dumping old `scripts/insert_*.py` files;
some historical import scripts contain embedded credentials.

Sensitive Vercel variables can appear empty in `vercel env pull`. Verify the
authenticated application's actual access before treating an empty export as a
missing or invalid production key.

### Find the correct lesson

Use the authenticated admin API or a server-only Supabase client:

- `GET /api/admin/recall?page=1` lists lessons and subjects. Follow lesson pages
  when necessary; a first-page miss does not prove that a lesson is absent.
- `GET /api/admin/recall?lesson=<UUID>` returns the lesson, subject, ordered cards,
  student report, and topic insights.
- Direct inspection can select `id,name,level` from `subjects`, lesson metadata
  from `recall_lessons`, and the content fields from `recall_cards` ordered by
  `position`. Use filtered searches if a limited subject list is incomplete.

Inspect existing answers and the **whole lesson**, not just its title. Record its
ID, subject ID, level, publication state, revision, card IDs, section IDs, and order.
Log lesson/content diagnostics without dumping student identities or reports.

Reuse a clearly matching existing lesson. For Taxation, this revealed a published
**JSS3** lesson under the existing **Taxation** subject, with two incomplete cards.
Its existing subject and lesson were reused rather than creating a duplicate or
assuming an Economics/SS3 classification.

If several existing lessons are equally plausible, resolve the intended target
before changing one.

## 3. Edit the material for learning and precise recall

### Combine definitions without losing meaning

- Produce one standard definition rather than two competing model answers.
- Preserve the concept, actor, action, scope, and purpose from the source.
- Prefer one short sentence, approximately 20–40 words when the concept allows.
  This is an editorial target, not a platform limit.
- Correct spelling and grammar; do not shorten by cutting off essential meaning.
- Put examples, qualifications, and extra context in `explanation` rather than
  making the definition unnecessarily long.

The approved 26-word Taxation definition was:

> Taxation is the government's imposition of compulsory levies on incomes, profits,
> goods and services to raise revenue, fund public services and national development,
> and redistribute income.

### Fulfil the instructions inside the source

- An instruction asking for four principles **with examples** needs four named
  principles and an example of each, not just four names.
- An instruction asking to explain five types needs five distinct types and a
  brief explanation of each.
- Give a requested number of examples or bodies explicitly. Distinguish aliases
  from separate entities.
- Move misplaced material under the appropriate heading. In the Taxation source,
  principles followed other objectives without a proper separate heading; they
  became their own content block.

### Check facts that may have changed

For agency names, laws, and other time-sensitive facts, consult authoritative
sources. Follow the environment's web-tool instructions; this environment uses:

```text
tinyfish search query "<focused factual query>"
tinyfish fetch content get "<authoritative URL>"
```

Keep supporting references and historical/current-name explanations in reading
context. Briefly tell the user about substantive corrections.

For Taxation:

- FIRS and NRS were former/current names of the same federal authority, not two
  separate current bodies.
- JTB had been reconstituted as JRB.
- NCS supplied a fifth distinct current body alongside NRS, KWIRS, LIRS, and JRB.
- FIRS and JTB were retained in explanatory material and a former-names question.
- The source's direct-tax examples were retained as textbook examples, with a
  note explaining the legacy Education Tax name and the Development Levy reform.

References used included the [JRB reform page](https://www.jrb.gov.ng/policies-reforms),
the [NRS website](https://www.nrs.gov.ng/),
[NCS statutory functions](https://customs.gov.ng/rules-guidelines/statutory-functions),
and the [NALTF tax-law explanation](https://naltf.gov.ng/understanding-the-new-tax-law-key-changes-and-implications/).
Recheck time-sensitive information for a later upload.

## 4. Map the lesson into topic blocks and recall cards

The data model has three levels:

| Level | Meaning |
| --- | --- |
| Lesson | The complete published lesson, e.g. **Taxation**. |
| Topic/note | A content block sharing one `section_id` and heading. |
| Card/content piece | One exact-answer recall question within that topic. |

Use short, meaningful headings such as **Objectives of taxation**, not a definition
sentence as the heading. Put all content for a section together in the saved array.
Multiple cards in one section must have the same heading.

Each card needs:

```js
{
  id: cardUuid,
  section_id: sectionUuid,
  heading: "Objectives of taxation",
  kind: "functions",
  prompt: "State the three main objectives of taxation, in the order taught.",
  answer: [
    "To generate revenue for the country.",
    "To ensure redistribution of income.",
    "To bring about economic stability."
  ].join("\n"),
  answer_format: "list",
  explanation: "Supporting context for reading; this text is not graded."
}
```

Allowed `kind` values are `definition`, `terminology`, `importance`, `features`,
`functions`, and `other`. Use the closest existing kind; a topic heading and its
prompt can name objectives, examples, principles, or other supplementary material.
Definitions render in callout boxes through the existing reader.

### Author the model answer and question together

- Use `paragraph` for a concise written answer and `list` for ordered items.
- Store list items as one string separated by newline characters. Do not put
  display numbers, bullet symbols, or Markdown list prefixes inside the answer.
- Keep wording consistent between reading content and the graded answer.
- State the expected quantity and order in a list prompt. Use phrases such as
  **in the order taught** when students must reproduce a particular list.
- Put one canonical example in the graded answer. Other valid examples can be
  explained as reading context; they are not alternative accepted answers.
- Remove unfinished placeholders such as `They are...` before publishing.

Grading ignores capitalisation and extra whitespace, including line breaks. It
requires the words, spelling, punctuation, and order to match. The whole list
must match; item-by-item feedback does not award partial credit. One item per line
enables useful list feedback when the line count matches the model.

### Preserve identity and order

Reuse existing card/section IDs when updating the same question or topic. Generate
new UUIDs for new content. Persist those IDs in the preparation plan so a retry
does not regenerate the entire lesson.

The Taxation uploader generated deterministic UUIDs for new content using a fixed
namespace and semantic keys such as `topic:principles` and
`card:principles:four-principles-with-examples`:

```js
import { createHash } from "node:crypto";

function stableRecallId(namespaceUuid, name) {
  const namespace = Buffer.from(namespaceUuid.replaceAll("-", ""), "hex");
  const bytes = createHash("sha1").update(namespace).update(name).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
```

Validate the namespace as a UUID first. For an existing lesson its ID can be the
namespace. For a new lesson, generate and persist a separate namespace before the
first save; keep it after the server assigns the lesson ID. Keep semantic keys
stable during ordinary edits. These IDs support repeatable importing, not access
control.

The saved array determines display order and database `position`. Keep each
section's cards contiguous. Reordering topic blocks or cards, and changing
explanations, preserve progress. Reordering the items inside a model list changes
the exact answer and resets that question, as do substantive answer/question
wording or answer-format changes. See the complete rules in
[SUBJECT_RECALL.md](SUBJECT_RECALL.md).

## 5. Validate the complete plan before writing

Prepare a reusable plan containing the target, expected revision, source path,
title/introduction, stable IDs or namespace, ordered topics, cards, and references.
Resolve lists into newline-separated strings before constructing the API payload.

| Item | Current limit/rule |
| --- | --- |
| Lesson title | 2–120 characters after trimming; maximum input length 120. |
| Introduction | Up to 10,000 characters; use an empty string if omitted. |
| Cards | Up to 50 per lesson; publishing requires at least one. |
| Topic heading | 2–120 characters; consistent within each section. |
| Recall prompt | 2–400 characters. |
| Exact answer | 1–1,000 characters, including the entire joined list. |
| Explanation | Up to 2,000 characters; use an empty string if omitted. |
| Ordered list | 1–20 non-empty items, one per stored line. |
| IDs | Valid UUIDs; unique card IDs; correct lesson ownership. |
| Revision | Non-negative integer; current revision for an update. |
| Request | Maximum body length 200,000 characters in the admin route. |

Print a non-secret dry-run summary: title, subject, level, current revision, topic
count, question count, definition word count, prompts, list lengths, and answer
lengths. Check this against every item in the source coverage checklist.

If material exceeds the limits, divide it into clearer questions or lessons.
Recheck the current API/migrations if these contracts have changed.

## 6. Publish through the existing owner backend

**A lesson save replaces its complete card set. It is not an append operation.**
`save_recall_lesson` upserts the supplied card IDs and deletes omitted cards from
that lesson. Include all existing content you intend to retain. Only replace
incomplete/old material when that is the user's intended update.

Use these application endpoints:

| Endpoint | Use |
| --- | --- |
| `POST /api/admin/login` | Body `{ "secretKey": ADMIN_SECRET_KEY }`; retain the returned owner cookie in memory. |
| `GET /api/admin/recall?lesson=<UUID>` | Reload the lesson and current revision before updating it. |
| `POST /api/admin/recall/subjects` | Resolve/create a subject with `{ id, name, level }`; response contains `subject.id`. |
| `POST /api/admin/recall` | Save the complete validated lesson with its publication state. |
| `POST /api/admin/logout` | End the temporary owner session. |

The secret admin UI path does not change the `/api/admin/...` API paths. Send the
owner cookie on authenticated requests without printing it.

Build the lesson request from the resolved target and complete prepared content:

```js
const payload = {
  id: existingLesson?.id ?? null,
  subject_id: resolvedSubject.id,
  title: preparedTitle,
  introduction: preparedIntroduction ?? "",
  is_published: true,
  revision: existingLesson?.revision ?? 0,
  cards: completeValidatedCards
};
```

For a new lesson, `id: null` allows the server to allocate the ID; its initial
revision is 1. For an existing lesson, use its current revision. The HTTP response
contains `{ id, revision }`. Use `is_published: false` when the user requests a
draft. Resolving a new subject is a separate operation from the atomic lesson save.

A server-only service-role client can also call the same transactional save RPC:

```js
const { data: lessonId, error } = await adminDb.rpc("save_recall_lesson", {
  p_id: payload.id,
  p_subject_id: payload.subject_id,
  p_title: payload.title,
  p_introduction: payload.introduction,
  p_published: payload.is_published,
  p_revision: payload.revision,
  p_cards: payload.cards
});
```

Prefer the application's publishing API, as used for Taxation, to exercise the
same authentication, validation, and save path as the content studio. Use the RPC
rather than independently inserting/updating lesson and card tables when direct
server access is necessary.

### Handle retries and stale edits correctly

- Re-read immediately before saving. If the revision changed, inspect and merge
  the newer edits before preparing another update.
- Do not merely substitute a newer revision to force an old payload through.
- If the complete desired content is already present, skip another write.
- If a save times out, inspect the live state before retrying. Reuse the prepared
  IDs; for a new lesson an existing prepared card ID can identify a save whose
  response was lost.
- Check `response.ok` and the returned body. Successful Management API SQL calls
  can return 201 as well as 200; a local status-code assertion failure does not
  mean the preceding publication failed.
- If publication succeeded but verification failed, rerun **verification only**.

Content is stored in Supabase and appears in the existing app immediately. A
content-only upload does not require a new Vercel deployment. Code/schema changes
have their own release/migration checks; inspect installed migrations before
applying missing ones in order.

## 7. Verify the saved lesson and recall behaviour

### Read-back checks

1. Reload the authenticated lesson detail or ordered database cards.
2. Compare the saved title, introduction, subject, level, publication state,
   revision, IDs, section headings, ordering, kinds, prompts, exact answers,
   explanations, and formats against the complete prepared plan.
3. Request `GET /api/recall?lesson=<UUID>` from production. Find that lesson in
   `lessons` and check `total_cards`, title, subject and level. Library `stats`
   are global even when a lesson/subject filter is supplied.
4. Confirm public library/question responses do not contain an unseen `answer`
   or `expected_answer`. Reading notes and checked feedback legitimately contain
   the model answer.
5. Check the admin's topic insights/report response and, where useful, the student
   reading layout or student preview for the actual published ordering.

### Isolated recall checks

Use a newly generated verification nickname and school, not a real student's
identity. The Taxation workflow exercised the live SQL engine inside a transaction:

```sql
begin;
-- Read one published note with read_recall_note.
-- Start its session with start_recall_session in mode 'note'.
-- Submit an incorrect answer, then the exact answer with a new request UUID.
-- Assert the retry succeeds but the first-answer result remains incorrect.
-- Read a list note and check its item_count and exact model matching.
-- Read the full lesson, start a 'master' session, and check its studied pool.
-- Raise an exception on any failed assertion.
rollback;
select 'passed'::text as recall_verification;
```

This is the verification sequence, not a complete SQL program. Fill in the checked
RPC calls using the verified lesson/section/card IDs and a unique test identity.
The relevant RPCs are:

- `read_recall_note(p_student, p_school, p_lesson_id, p_section_id)`
- `read_recall_lesson(p_student, p_school, p_lesson_id)`
- `start_recall_session(p_student, p_school, p_session_id, p_mode, p_lesson_id, p_section_id)`
- `submit_recall_session(p_student, p_school, p_session_id, p_review_id, p_request_id, p_answer, p_reveal)`
- `advance_recall_session(p_student, p_school, p_session_id, p_position)`

Note/lesson modes need their corresponding IDs. Master mode has no lesson or
section filter. After studying only this lesson with a fresh identity, its master
pool should equal the lesson's card count. With an existing identity, the master
pool can include other studied published lessons too.

The Management API SQL endpoint is
`POST https://api.supabase.com/v1/projects/<verified-project-ref>/database/query`,
authenticated with the account access token. Send the SQL in
`{ query: sql, read_only: false }` for a rolled-back exercise of writing RPCs.
Never include tokens in the SQL or log model/student answers from the checks.

Afterward, confirm both `recall_progress` and `recall_sessions` contain zero rows
for the exact generated verification identity. If using the browser/student API
instead of a rolled-back SQL transaction, clean up only that exact test identity
through the server client and verify removal. Avoid broad prefix-based deletion.

For content-only changes, use content validation, read-back, and focused recall
checks. Run `npm run test:recall`, TypeScript, and build checks when application or
engine code changes. Do not republish a lesson merely to rerun a failed check.

## 8. Worked result: Taxation

Source: `recall-topc.txt`. Existing lesson ID:
`b67f5797-4417-442a-86d4-6ebda3dc43ee`. Existing subject: **Taxation / JSS3**.
The completed upload moved the lesson from revision 3 to revision 4, preserving
the existing lesson and original card IDs while filling their incomplete answers.
These are historical identifiers/revisions, not defaults for another upload.
Fetch the current revision before a later update.

| Published topic block | Recall questions | Answer structure |
| --- | ---: | --- |
| Taxation | 1 | One 26-word combined definition. |
| Objectives of taxation | 2 | Three main objectives; two additional objectives. |
| Features of taxation | 1 | Six ordered features. |
| Principles of taxation | 2 | Five principles with meanings; four principles with examples. |
| Types of taxation | 1 | Direct, indirect, progressive, proportional, and regressive taxation, each briefly explained. |
| Examples of direct tax | 1 | Five textbook examples, with legacy-name context. |
| Examples of indirect tax | 1 | Four ordered examples. |
| Tax authorities and regulatory bodies | 2 | Five distinct bodies/full names; former names of NRS and JRB. |
| **Total** | **11** | **8 topic blocks.** |

The types explanation distinguished direct/indirect classification from
progressive/proportional/regressive tax burdens. Historical/current agency names
were explained rather than counted twice. All answers fitted the platform limits.
Saved content, single-note matching/retries, list items, full-lesson reading, master
pool inclusion, and rollback cleanup were verified.

Published reading entry:
https://npfmoc.vercel.app/recall?lesson=b67f5797-4417-442a-86d4-6ebda3dc43ee

## 9. Finish with a useful report

Return the published lesson link, subject/level, topic and question counts, the
combined definition when one was requested, substantive factual corrections, and
the checks actually completed. Distinguish a saved draft from a published lesson.

Keep temporary credential files out of the workspace/commit and remove them after
use. Commit, push, or deploy only when requested. Preserve the user's source files.

## Implementation references

- [Learning rules and setup](SUBJECT_RECALL.md)
- [Admin lesson API](src/app/api/admin/recall/route.ts)
- [Subject resolver API](src/app/api/admin/recall/subjects/route.ts)
- [Student recall API](src/app/api/recall/route.ts)
- [Shared types and grouping helpers](src/lib/subject-recall.ts)
- [Content studio](src/app/admin/recall/page.tsx)
- [Student note renderer](src/components/recall/RecallNotes.tsx)
- [v7 transactional publishing/session engine](src/supabase/migration-v7-recall-sessions.sql)
- [v8 note-only reading and feedback refinements](src/supabase/migration-v8-recall-refinements.sql)

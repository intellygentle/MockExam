# Subject Notes & Recall

The **Subject Notes & Recall** stack appears in MockExam's Arena (`/drill`),
student progress dashboard and main navigation. The library at `/recall` groups
published notes by the existing subjects and levels.

## Setup

1. Run `src/supabase/migration-v6-subject-recall.sql` in the MockExam Supabase
   project's SQL Editor. The migration is transactional and safe to rerun.
2. Add `SUPABASE_SERVICE_ROLE_KEY` to the server environment for note management.
   Keep it server-only; it must never use a `NEXT_PUBLIC_` prefix or be committed.
3. Use the existing owner login (`ADMIN_SECRET_KEY` and `SECRET_ADMIN_PATH`) to
   open **Notes & Recall** in the admin menu.

Student reads and reviews use the existing `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
New tables have RLS enabled with direct public reads/writes revoked. Students use
checked RPCs; the owner editor and reports require the existing signed admin
session plus the server service-role client.

No AI service is involved. The feature uses MockExam's existing nickname/school
identity convention. Students should use the same pair on each device; it is not
a new account-authentication system.

## Publishing a lesson

- Open the admin **Notes & Recall** tab and create a lesson for a subject.
- Add a title and optional introduction.
- Add up to 50 entries. Each section is a topic with its own heading, definition,
  terminology, importance and any other subtopics; students study the whole topic
  together.
- Use **Add term** for each key term, and **Add subtopic** for features or any other
  notes the topic needs. A topic can mix all of them freely.
- Use the optional example/note field for supporting context. Entries left without an
  answer are not saved.
- Select **Publish for students** and save. Drafts remain hidden from students.

Each answer is limited to 1,000 characters. Split long lists into separate
questions with clear prompts. Saving changes is atomic; stale edits cannot
overwrite newer versions. A changed question or answer wording resets only that
section's student progress. Capitalisation and whitespace changes preserve it.

## Learning routine

1. Review due questions first, aiming for a manageable session of up to 10 cards.
2. Open a short lesson and read its notes.
3. Hide the notes and type the model answer from memory; the first check is
   available immediately after opening the notes.
4. Compare incorrect answers against the model, hide it, and retry or practise
   another card. Five unsuccessful attempts cause a short break.
5. Return for scheduled checks; mix questions from all subjects or one lesson.

Matching ignores capitalisation, repeated spaces, line breaks and non-breaking
spaces. Words, spelling, order and punctuation must match. No keyword or
meaning-based partial credit is used.

Review intervals are **10 minutes → 1 day → 3 days → 7 days → 14 days → 30 days**,
with monthly reviews continuing. A missed answer or reveal returns the section to
a two-minute learning cycle. The queue prioritises older due days,
randomises within that priority and avoids the previous section when possible.

Rereading records a fresh exposure and restarts the short cycle. Use **Review**
before reading the notes again to check longer-term recall.

## Retention tracking

- **First-try accuracy:** correct first answers across review rounds.
- **Delayed recall:** first answers on rounds begun at least 24 hours after the
  model answer was last shown. Immediate retries never improve this metric.
- **Retained sections:** three consecutive successful delayed checks, no pending
  delayed recheck, and a next review in the future. A miss resets the streak.
- **Practised today:** distinct sections answered on the current date in
  `Africa/Lagos`, including unsuccessful attempts.

The library shows overall and per-lesson retention. Owner reports show nickname,
school, started/due/retained sections, first-try accuracy, delayed checks and last
practice. Percentages are accompanied by test counts and remain untested until
there is evidence. These metrics measure recall of the published wording.

One compact `recall_progress` row per nickname/school/section stores the schedule
and counters. Up to five request IDs make network retries idempotent. Typed
answers are returned for immediate feedback rather than kept in an unbounded log.

## Verification

`npm run test:recall` runs the real SQL migration twice in PGlite and tests exact
matching, delayed grading, review intervals, duplicates, publication, ownership
permissions, identity isolation, edits and daily counts.

`npx tsc --noEmit --incremental false` checks TypeScript. Use Node 22.13+ for
`npm run build`; the project's existing PDF reader depends on that Node version.

After setup, publish a short lesson, open it with a student nickname, wait for a
check, submit a wrong answer, then retry correctly. The correct retry must leave
that round's first-try score as a miss and delayed recall untested. Confirm the
same figures in the admin report.

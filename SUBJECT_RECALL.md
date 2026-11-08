# Subject Notes & Recall

The **Subject Notes & Recall** stack appears in MockExam's Arena (`/drill`),
student progress dashboard and main navigation. The library at `/recall` groups
published notes by the existing subjects and levels.

## Setup

1. In the project's SQL Editor, apply these migrations **in order**:
   - `src/supabase/migration-v6-subject-recall.sql`
   - `src/supabase/migration-v7-recall-sessions.sql`
   - `src/supabase/migration-v8-recall-refinements.sql`
   Existing v6 installations need v7 and v8; existing v7 installations only need
   v8. The upgrades are transactional and rerunnable without losing notes, scores,
   or active sessions. Do not rerun an earlier migration over a newer installation.
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

For converting a supplied file into published notes and recall questions, use the
step-by-step [topic authoring workflow](RECALL_TOPIC_WORKFLOW.md). It includes the
successful Taxation upload, exact payload rules, and live verification guidance.

- Open the admin **Notes & Recall** tab and create a lesson. Type any subject name
  and level; matching subjects are reused and new combinations are created on save.
- Add a title and optional introduction.
- Use **Add topic block** for each heading and definition. **Add a sub-section**
  supports definitions, terminology, features, functions, importance, and other notes.
  A lesson can contain up to 50 recall questions across its topics.
- Each content piece has its own recall question, exact answer, and optional
  explanation. Definitions appear in a distinct callout. Explanations appear as
  supporting context and are not graded.
- Choose **Written answer** or **Ordered list**. Lists have up to 20 individually
  editable items. Students type the items in order, without the displayed numbers.
- Use the arrow controls to reorder topics, content pieces, and list items. Remove
  individual pieces or an entire topic; empty content is flagged rather than silently
  discarded. **Undo removal** restores the most recently removed topic or piece while
  preserving subsequent edits. **Duplicate topic** creates independent content IDs.
  Jump to a topic or collapse/expand all blocks while working on longer lessons.
  Validation opens the relevant block and focuses the field that needs attention.
- Switch to **Student preview** to see the actual reading layout and order.
- **Save draft** keeps the lesson private. **Publish lesson** / **Publish updates**
  makes the saved version available to students. Published lessons can be unpublished
  using **Unpublish & save draft**. Changes stay local to the editor until saved.

Each answer (including the whole list) is limited to 1,000 characters. Split long
lists into separate questions with clear prompts. Lesson saves are atomic; stale
edits cannot overwrite newer versions. Changed question wording, answer wording,
or answer format resets only that question's progress. Capitalisation, whitespace,
topic/card reordering, and explanation changes preserve it. Changing the order of
items inside an answer list changes the model answer and resets that question.
Custom subjects are reused or created before the lesson save.

## Learning routine

1. Review due questions first. A daily session snapshots the currently due pool;
   checked questions do not re-enter that session.
2. Open a short lesson and read its notes.
3. Hide the notes and type the model answer from memory; the first check is
   available immediately after opening the notes.
4. Compare incorrect answers against the model, hide it, and retry or practise
   another card. Five unsuccessful attempts cause a short break.
5. Return for scheduled checks, or choose one of the focused practice modes below.

The reading phase has an active topic outline, mobile topic navigation, a quiet
typography hierarchy, and distinct definition callouts. Choose **Standard** or
**Large** text. **Focus mode** provides a quiet background and hides the site's outer
navigation during reading and recall; it can be switched off at any time. These
reading preferences are remembered on the device.

**Read note** links from feedback and the dashboard show just the selected note.
Only that note's exposure and short review cycle restart; other topics retain their
existing schedules. **Read full lesson** opens and records exposure for every topic.

### Practice modes

- **Recall this note:** only the content pieces in that topic, in published order.
- **Recall lesson:** all studied questions in one lesson, in published order.
- **Master test:** every studied question across all published lessons and subjects,
  shuffled once into a finite pool. Subject-library filters do not restrict it.
- **Daily review:** questions due at the start of the session, older due days first,
  shuffled within that priority.

The progress bar shows checked questions out of the total pool. Each question is
counted once, even when retried. All answers are checked on the server; an unseen
model answer is not included in question payloads. A wrong answer or reveal can be
retried up to five attempts, or followed by the next question. Results show correct
and incorrect first answers, a question breakdown, and actionable notes to revisit.

**Save & exit** preserves checked answers and the current session. This browser
offers **Resume practice** on the library; reloading a practice entry link also
resumes the matching session. The session ID in the practice URL also restores
completed results on reload. Unsubmitted text and hidden-answer retries are saved
locally on the current device, scoped to the identity, session, and question; they
are cleared after a successful submission or when that question changes. Checked
answers and progress are stored on the server. Starting another session replaces the previous
active session for that nickname/school, while keeping recorded progress. Edits,
unpublishing, or rereading that invalidate a current question ask the student to
start fresh rather than grade stale content.

Matching ignores capitalisation, repeated spaces, line breaks and non-breaking
spaces. Words, spelling, order and punctuation must match. For lists, displayed
numbers and bullets are not part of the answer. No keyword or
meaning-based partial credit is used. After an incorrect list answer, one item per
line enables **item-by-item feedback** when the line count matches the model list.
These hints identify exact and missed items without awarding partial credit. A
replayed network request returns the latest feedback, preserving subsequent retries.

Review intervals are **10 minutes → 1 day → 3 days → 7 days → 14 days → 30 days**,
with monthly reviews continuing. A missed answer or reveal returns the question to
a two-minute learning cycle. Extra practice before a question is due counts toward
first-answer accuracy but cannot advance its scheduled interval or count as delayed
retention. A correct early answer keeps the existing review date; an early miss
starts the two-minute learning cycle.

Rereading records a fresh exposure and restarts the short cycle. Use **Review**
before reading the notes again to check longer-term recall.

## Retention tracking

- **First-try accuracy:** correct first answers across review rounds.
- **Delayed recall:** first answers on rounds begun at least 24 hours after the
  model answer was last shown. Immediate retries never improve this metric.
- **Retained questions:** three consecutive successful delayed checks, no pending
  delayed recheck, and a next review in the future. A miss resets the streak.
- **Practised today:** distinct questions answered on the current date in
  `Africa/Lagos`, including unsuccessful attempts.

The library and `/dashboard` show correct and incorrect first-answer totals,
accuracy, due questions, and retention. **Needs another look** prioritises topics
with missed first answers, followed by questions due for review, with direct
single-note practice links. A correct retry does not remove a first-answer miss;
a later successful first answer clears it. The highest-priority notes are shown,
with their total count; daily review includes the full due pool.
The progress dashboard refreshes when the tab becomes visible, after practice in
another tab, and when the next scheduled review becomes due. **Refresh progress**
is also available on the dashboard.

Owner reports read the same progress rows and show nickname, school,
studied/due/retained questions, correct and incorrect totals, first-try accuracy,
delayed checks, and last practice. Percentages show their sample counts and remain
untested until there is evidence. These metrics measure recall of the published wording.
**How each note is landing** uses the same first-answer data, grouped by topic,
with student counts, correct/incorrect totals, current misses, due questions, and
direct links back to the corresponding content block. Refresh the report after
student practice to see the latest figures.

One compact `recall_progress` row per nickname/school/question stores the schedule
and counters. Up to five request IDs make network retries idempotent. Typed
answers are returned for immediate feedback rather than kept in an unbounded log.
`recall_sessions` keeps one session per identity: a fixed question pool, first-answer
results, and only the current typed answer/feedback for resuming. Public table access
is revoked. Session starts, answers, and advances are retry-safe checked RPCs.

## Verification

`npm run test:recall` runs the real SQL migrations repeatedly in PGlite. It covers
exact/list matching, content order, atomic publishing, note scope, master-pool
randomization, finite completion, resume, duplicate requests, early versus delayed
grading, review intervals, analytics, permissions, identity isolation, edits, and
daily counts. The v8 coverage also verifies note-only exposure, stable latest
feedback on replay, list-item hints, and agreement between student and per-note
teacher reports.

`npx tsc --noEmit --incremental false` checks TypeScript. Use Node 22.13+ for
`npm run build`; the project's existing PDF reader depends on that Node version.

After setup, publish a short lesson with two topics and an ordered list. Confirm the
preview and student reading order agree, recall one note, then try a master test.
Submit a wrong answer and retry correctly: the first-try result must remain a miss
and delayed recall must stay untested. Refresh the student dashboard and admin
report to confirm the same figures. Reload mid-session to check resume, and test
both desktop and mobile layouts. Check that an unfinished answer survives reload,
that reading a weak note does not restart unrelated notes, and that duplicate,
remove/undo, list arrows, and field-focused validation work in the editor.

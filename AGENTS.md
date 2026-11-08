# Project instructions for AI agents

Scholars Arena is a Next.js/React/TypeScript learning platform backed by Supabase.

## Adding or updating learning topics

Read [RECALL_TOPIC_WORKFLOW.md](RECALL_TOPIC_WORKFLOW.md) before changing live
subject notes. It documents the source-to-lesson process used for the approved
Taxation upload: editorial preparation, content blocks, exact recall questions,
stable IDs, atomic publishing, and isolated verification.

- Read the complete supplied material, including extra requests and unanswered questions.
- Inspect the existing lesson and subject/level; retain the intended target and unrelated content.
- Prepare concise definitions, clearly ordered lists, and one canonical exact answer per question.
- Explain substantive factual corrections and distinguish former/current names from separate entities.
- Validate the complete lesson before publishing. Lesson saves replace the full card set.
- Reuse appropriate IDs, check the current revision, and inspect uncertain saves before retrying.
- Verify the published content and recall with an isolated identity; remove or roll back test data.
- Use the existing content studio, reader, and recall model for content-only requests.

## References and credentials

- [SUBJECT_RECALL.md](SUBJECT_RECALL.md) defines grading, retention, and migration rules.
- Load environment credentials programmatically; do not print, paste, or commit secrets or owner cookies.
- Some historical `scripts/insert_*.py` files contain embedded credentials; do not dump them to obtain keys.
- Preserve supplied source files and existing user work. Commit, push, and deploy only when requested.

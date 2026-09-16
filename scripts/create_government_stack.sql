-- Creates the empty "Government Lessons" lesson stack (idempotent).
-- Run via the Supabase dashboard SQL editor or the Management API.
-- Safe to re-run: inserts only when a stack with this title is absent,
-- and never deletes anything. Link drill sets later via lesson_stack_items.

INSERT INTO lesson_stacks (title, description, icon)
SELECT 'Government Lessons', 'Government studies and practice lessons', '🏛️'
WHERE NOT EXISTS (
  SELECT 1 FROM lesson_stacks WHERE title = 'Government Lessons'
)
RETURNING id, title, created_at;

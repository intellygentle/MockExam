-- Migration v7: Add passage column for comprehension-style questions
-- passage is nullable/empty by default for backward compatibility

ALTER TABLE questions ADD COLUMN IF NOT EXISTS passage TEXT DEFAULT '';

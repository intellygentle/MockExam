-- Migration v6: Add option_e for questions with 5 options (A-E)
-- option_e is nullable for backward compatibility with 4-option questions

ALTER TABLE questions ADD COLUMN IF NOT EXISTS option_e TEXT DEFAULT '';

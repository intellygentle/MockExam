-- Migration v8: Update correct_option check constraint to allow 'e'
-- The previous constraint only allowed 'a', 'b', 'c', 'd' but we now support 5-option questions

-- First, drop the old constraint (it may have different names depending on how it was created)
ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_correct_option_check;

-- Then add the updated constraint that includes 'e'
ALTER TABLE questions ADD CONSTRAINT questions_correct_option_check
  CHECK (correct_option IN ('a', 'b', 'c', 'd', 'e'));

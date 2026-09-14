-- Widen drill_sets.card_type check constraint to allow the new
-- "word_table" lesson-card type (Words Table: Editorial Word Families).
--
-- Run this ONCE in the Supabase dashboard SQL editor, then re-run
-- scripts/insert_word_table_card.py.
--
-- List = every card_type used by the app today (the old constraint
-- predated error_correction / para_gapfill / sentence_expansion* too).
ALTER TABLE drill_sets DROP CONSTRAINT IF EXISTS drill_sets_card_type_check;
ALTER TABLE drill_sets ADD CONSTRAINT drill_sets_card_type_check CHECK (card_type = ANY (ARRAY[
  'quiz',
  'capitalization',
  'sentence_types',
  'sentence_combining',
  'true_false',
  'passage',
  'vocabulary',
  'combine_seq',
  'error_correction',
  'para_gapfill',
  'sentence_expansion',
  'sentence_expansion_mcq',
  'word_table'
]));

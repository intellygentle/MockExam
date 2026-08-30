DELETE FROM lesson_stack_items;
DELETE FROM lesson_stacks;

INSERT INTO lesson_stacks (title, description, icon) VALUES
  ('Sentence Lessons', 'Master sentence types and sentence combining in one stack', ''),
  ('Drill Questions', 'Practice timed exam questions for English', ''),
  ('Testing', 'Platform feature test questions and experiments', '');

INSERT INTO lesson_stack_items (stack_id, drill_set_id, sort_order) VALUES
  (1, 9, 1),
  (1, 10, 2),
  (2, 4, 1),
  (2, 6, 2),
  (3, 7, 1);
CREATE TABLE IF NOT EXISTS lesson_stacks (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  icon TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lesson_stack_items (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  stack_id BIGINT NOT NULL REFERENCES lesson_stacks(id) ON DELETE CASCADE,
  drill_set_id INTEGER NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (stack_id, drill_set_id)
);

CREATE INDEX IF NOT EXISTS idx_stack_items_stack ON lesson_stack_items (stack_id);

CREATE INDEX IF NOT EXISTS idx_stack_items_drill_set ON lesson_stack_items (drill_set_id);

ALTER TABLE lesson_stacks ENABLE ROW LEVEL SECURITY;

ALTER TABLE lesson_stack_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read lesson_stacks" ON lesson_stacks FOR SELECT USING (true);

CREATE POLICY "Allow public read lesson_stack_items" ON lesson_stack_items FOR SELECT USING (true);

CREATE POLICY "Allow public insert lesson_stacks" ON lesson_stacks FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update lesson_stacks" ON lesson_stacks FOR UPDATE USING (true);

CREATE POLICY "Allow public delete lesson_stacks" ON lesson_stacks FOR DELETE USING (true);

CREATE POLICY "Allow public insert lesson_stack_items" ON lesson_stack_items FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update lesson_stack_items" ON lesson_stack_items FOR UPDATE USING (true);

CREATE POLICY "Allow public delete lesson_stack_items" ON lesson_stack_items FOR DELETE USING (true);
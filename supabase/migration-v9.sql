-- =====================================================
-- Scholars Arena: v9 Migration — A-Level Study Materials
-- =====================================================
-- Run this AFTER migration-v8.sql
--
-- Adds a complete study materials system for A-level (SS3)
-- students. Each material has levels, each level has a
-- deck of keypoint cards, and each level can link to
-- questions for post-study testing.
-- =====================================================

-- 1. Create study_materials table
CREATE TABLE IF NOT EXISTS study_materials (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  subject_id BIGINT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  level TEXT NOT NULL CHECK (level IN ('ss3')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create material_levels table
CREATE TABLE IF NOT EXISTS material_levels (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  material_id BIGINT NOT NULL REFERENCES study_materials(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  level_number INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create material_cards table (keypoint cards for each level)
CREATE TABLE IF NOT EXISTS material_cards (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  level_id BIGINT NOT NULL REFERENCES material_levels(id) ON DELETE CASCADE,
  front TEXT NOT NULL,
  back TEXT NOT NULL DEFAULT '',
  card_number INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Create material_level_questions table (links questions to levels)
CREATE TABLE IF NOT EXISTS material_level_questions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  level_id BIGINT NOT NULL REFERENCES material_levels(id) ON DELETE CASCADE,
  question_id BIGINT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(level_id, question_id)
);

-- 5. Create student_material_progress table
CREATE TABLE IF NOT EXISTS student_material_progress (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_name TEXT NOT NULL,
  material_id BIGINT NOT NULL REFERENCES study_materials(id) ON DELETE CASCADE,
  level_id BIGINT NOT NULL REFERENCES material_levels(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT false,
  cards_studied INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_name, material_id, level_id)
);

-- 6. Create student_test_attempts table (tracks what test scope was chosen)
CREATE TABLE IF NOT EXISTS student_test_attempts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_name TEXT NOT NULL,
  material_id BIGINT NOT NULL REFERENCES study_materials(id) ON DELETE CASCADE,
  level_ids BIGINT[] NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  passed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sm_subject ON study_materials (subject_id);
CREATE INDEX IF NOT EXISTS idx_sm_level ON study_materials (level);
CREATE INDEX IF NOT EXISTS idx_ml_material ON material_levels (material_id, level_number);
CREATE INDEX IF NOT EXISTS idx_mc_level ON material_cards (level_id, card_number);
CREATE INDEX IF NOT EXISTS idx_mlq_level ON material_level_questions (level_id);
CREATE INDEX IF NOT EXISTS idx_mlq_question ON material_level_questions (question_id);
CREATE INDEX IF NOT EXISTS idx_smp_student ON student_material_progress (student_name);
CREATE INDEX IF NOT EXISTS idx_smp_material ON student_material_progress (student_name, material_id);
CREATE INDEX IF NOT EXISTS idx_sta_student ON student_test_attempts (student_name, material_id);

-- RLS (same pattern as other tables — public access)
ALTER TABLE study_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_level_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_material_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_test_attempts ENABLE ROW LEVEL SECURITY;

-- Allow public read
CREATE POLICY "Allow public read study_materials" ON study_materials FOR SELECT USING (true);
CREATE POLICY "Allow public read material_levels" ON material_levels FOR SELECT USING (true);
CREATE POLICY "Allow public read material_cards" ON material_cards FOR SELECT USING (true);
CREATE POLICY "Allow public read material_level_questions" ON material_level_questions FOR SELECT USING (true);
CREATE POLICY "Allow public read student_material_progress" ON student_material_progress FOR SELECT USING (true);
CREATE POLICY "Allow public read student_test_attempts" ON student_test_attempts FOR SELECT USING (true);

-- Allow public insert/update (for admin & students)
CREATE POLICY "Allow public insert study_materials" ON study_materials FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update study_materials" ON study_materials FOR UPDATE USING (true);
CREATE POLICY "Allow public delete study_materials" ON study_materials FOR DELETE USING (true);

CREATE POLICY "Allow public insert material_levels" ON material_levels FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update material_levels" ON material_levels FOR UPDATE USING (true);
CREATE POLICY "Allow public delete material_levels" ON material_levels FOR DELETE USING (true);

CREATE POLICY "Allow public insert material_cards" ON material_cards FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update material_cards" ON material_cards FOR UPDATE USING (true);
CREATE POLICY "Allow public delete material_cards" ON material_cards FOR DELETE USING (true);

CREATE POLICY "Allow public insert material_level_questions" ON material_level_questions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete material_level_questions" ON material_level_questions FOR DELETE USING (true);

CREATE POLICY "Allow public insert student_material_progress" ON student_material_progress FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update student_material_progress" ON student_material_progress FOR UPDATE USING (true);

CREATE POLICY "Allow public insert student_test_attempts" ON student_test_attempts FOR INSERT WITH CHECK (true);

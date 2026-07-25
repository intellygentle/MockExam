-- =====================================================
-- Scholars Arena: v2 Migration — Departments & Subjects
-- =====================================================
-- Run this AFTER migration.sql (the v1 schema)

-- 1. Create departments table (for SS3 level)
CREATE TABLE IF NOT EXISTS departments (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('ss3')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint to prevent duplicate departments
CREATE UNIQUE INDEX IF NOT EXISTS idx_departments_name_level ON departments (name, level);

-- 2. Create subjects table (for both JSS3 and SS3)
CREATE TABLE IF NOT EXISTS subjects (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  department_id BIGINT REFERENCES departments(id) ON DELETE SET NULL,
  level TEXT NOT NULL CHECK (level IN ('jss3', 'ss3')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint to prevent duplicate subjects
CREATE UNIQUE INDEX IF NOT EXISTS idx_subjects_name_dept_level ON subjects (name, COALESCE(department_id, 0), level);

-- 3. Add subject_id and year columns to questions
ALTER TABLE questions ADD COLUMN IF NOT EXISTS subject_id BIGINT REFERENCES subjects(id);
ALTER TABLE questions ADD COLUMN IF NOT EXISTS year INTEGER;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_subjects_department ON subjects (department_id);
CREATE INDEX IF NOT EXISTS idx_subjects_level ON subjects (level);
CREATE INDEX IF NOT EXISTS idx_questions_subject ON questions (subject_id);
CREATE INDEX IF NOT EXISTS idx_questions_year ON questions (year);

-- 4. Add subject and year columns to progress table (for tracking what was practiced)
ALTER TABLE progress ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE progress ADD COLUMN IF NOT EXISTS year INTEGER;

-- =====================================================
-- SEED DATA: Nigerian Secondary School Curriculum
-- =====================================================

-- --- JSS3 Subjects (no departments) ---
INSERT INTO subjects (name, level) VALUES
  ('Mathematics', 'jss3'),
  ('English Language', 'jss3'),
  ('Basic Science', 'jss3'),
  ('Basic Technology', 'jss3'),
  ('Social Studies', 'jss3'),
  ('Civic Education', 'jss3'),
  ('Christian Religious Studies', 'jss3'),
  ('History', 'jss3'),
  ('Yoruba Language', 'jss3'),
  ('Computer Studies', 'jss3'),
  ('Physical & Health Education', 'jss3'),
  ('Home Economics', 'jss3')
ON CONFLICT DO NOTHING;

-- --- SS3 Departments ---
INSERT INTO departments (name, level) VALUES
  ('Science', 'ss3'),
  ('Arts', 'ss3'),
  ('Commercial', 'ss3')
ON CONFLICT DO NOTHING;

-- --- SS3 Subjects (linked to departments) ---
-- Science
INSERT INTO subjects (name, department_id, level)
SELECT 'Mathematics', id, 'ss3' FROM departments WHERE name = 'Science'
UNION ALL
SELECT 'English Language', id, 'ss3' FROM departments WHERE name = 'Science'
UNION ALL
SELECT 'Physics', id, 'ss3' FROM departments WHERE name = 'Science'
UNION ALL
SELECT 'Chemistry', id, 'ss3' FROM departments WHERE name = 'Science'
UNION ALL
SELECT 'Biology', id, 'ss3' FROM departments WHERE name = 'Science'
UNION ALL
SELECT 'Further Mathematics', id, 'ss3' FROM departments WHERE name = 'Science'
UNION ALL
SELECT 'Agricultural Science', id, 'ss3' FROM departments WHERE name = 'Science'
ON CONFLICT DO NOTHING;

-- Arts
INSERT INTO subjects (name, department_id, level)
SELECT 'English Language', id, 'ss3' FROM departments WHERE name = 'Arts'
UNION ALL
SELECT 'Literature in English', id, 'ss3' FROM departments WHERE name = 'Arts'
UNION ALL
SELECT 'Government', id, 'ss3' FROM departments WHERE name = 'Arts'
UNION ALL
SELECT 'Christian Religious Studies', id, 'ss3' FROM departments WHERE name = 'Arts'
UNION ALL
SELECT 'History', id, 'ss3' FROM departments WHERE name = 'Arts'
UNION ALL
SELECT 'Yoruba Language', id, 'ss3' FROM departments WHERE name = 'Arts'
ON CONFLICT DO NOTHING;

-- Commercial
INSERT INTO subjects (name, department_id, level)
SELECT 'English Language', id, 'ss3' FROM departments WHERE name = 'Commercial'
UNION ALL
SELECT 'Mathematics', id, 'ss3' FROM departments WHERE name = 'Commercial'
UNION ALL
SELECT 'Accounting', id, 'ss3' FROM departments WHERE name = 'Commercial'
UNION ALL
SELECT 'Commerce', id, 'ss3' FROM departments WHERE name = 'Commercial'
UNION ALL
SELECT 'Economics', id, 'ss3' FROM departments WHERE name = 'Commercial'
UNION ALL
SELECT 'Business Studies', id, 'ss3' FROM departments WHERE name = 'Commercial'
ON CONFLICT DO NOTHING;

-- Enable RLS for new tables (optional)
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read departments" ON departments FOR SELECT USING (true);
CREATE POLICY "Allow public read subjects" ON subjects FOR SELECT USING (true);

-- Allow public write (for admin)
CREATE POLICY "Allow public insert departments" ON departments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update departments" ON departments FOR UPDATE USING (true);
CREATE POLICY "Allow public delete departments" ON departments FOR DELETE USING (true);
CREATE POLICY "Allow public insert subjects" ON subjects FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update subjects" ON subjects FOR UPDATE USING (true);
CREATE POLICY "Allow public delete subjects" ON subjects FOR DELETE USING (true);

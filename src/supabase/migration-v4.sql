-- =====================================================
-- Scholars Arena: v4 Migration — Question-Level Tracking
-- =====================================================
-- Run this AFTER migration-v3.sql
-- 
-- Tracks every individual answer a student gives so we
-- can show year completion status, progress tracking,
-- and missed-questions review.
-- =====================================================

-- 1. Create question_answers table
CREATE TABLE IF NOT EXISTS question_answers (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_name TEXT NOT NULL,
  question_id BIGINT NOT NULL,
  subject_id BIGINT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('jss3', 'ss3')),
  year INTEGER NOT NULL,
  correct BOOLEAN NOT NULL,
  selected_option TEXT NOT NULL CHECK (selected_option IN ('a', 'b', 'c', 'd')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast per-student / per-subject queries
CREATE INDEX IF NOT EXISTS idx_qa_student ON question_answers (student_name);
CREATE INDEX IF NOT EXISTS idx_qa_student_subject ON question_answers (student_name, subject_id);
CREATE INDEX IF NOT EXISTS idx_qa_student_subject_correct ON question_answers (student_name, subject_id, correct);
CREATE INDEX IF NOT EXISTS idx_qa_subject_year ON question_answers (subject_id, year);
CREATE INDEX IF NOT EXISTS idx_qa_question ON question_answers (question_id);

-- 2. Enable RLS
ALTER TABLE question_answers ENABLE ROW LEVEL SECURITY;

-- Allow public read (for the student to see their own data and for stats)
CREATE POLICY "Allow public read question_answers"
  ON question_answers FOR SELECT
  USING (true);

-- Allow public insert (for saving answers during quiz)
CREATE POLICY "Allow public insert question_answers"
  ON question_answers FOR INSERT
  WITH CHECK (true);

-- 3. Enable Realtime for live progress updates (optional)
-- ALTER PUBLICATION supabase_realtime ADD TABLE question_answers;

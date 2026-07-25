-- =====================================================
-- Scholars Arena: Database Migration
-- Run this SQL in your Supabase SQL Editor
-- =====================================================

-- 1. Add level column to questions table
ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS level TEXT NOT NULL DEFAULT 'jss3';

-- Add a check constraint to ensure valid levels
ALTER TABLE questions
  ADD CONSTRAINT questions_level_check
  CHECK (level IN ('jss3', 'ss3'));

-- 2. Create progress table for tracking student scores
CREATE TABLE IF NOT EXISTS progress (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_name TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('jss3', 'ss3')),
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  percentage NUMERIC(5,2) NOT NULL,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  badges TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster leaderboard queries
CREATE INDEX IF NOT EXISTS idx_progress_level_percentage
  ON progress (level, percentage DESC);

CREATE INDEX IF NOT EXISTS idx_progress_created_at
  ON progress (created_at DESC);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;

-- Allow public read access for leaderboard
CREATE POLICY "Allow public read progress"
  ON progress FOR SELECT
  USING (true);

-- Allow public insert for saving scores
CREATE POLICY "Allow public insert progress"
  ON progress FOR INSERT
  WITH CHECK (true);

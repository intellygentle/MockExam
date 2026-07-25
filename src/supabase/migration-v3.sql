-- =====================================================
-- Scholars Arena: v3 Migration — School Name & Realtime
-- =====================================================
-- Run this AFTER migration-v2.sql

-- Add school_name column to progress table
ALTER TABLE progress
  ADD COLUMN IF NOT EXISTS school_name TEXT DEFAULT '';

-- Enable Realtime for the progress table (for live leaderboard)
-- Run this in your Supabase SQL Editor or enable via dashboard
-- ALTER PUBLICATION supabase_realtime ADD TABLE progress;

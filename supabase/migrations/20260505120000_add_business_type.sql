-- Phase 1: Add business_type to profiles for multi-niche support
-- Default 'sport_school' ensures all existing users continue working without changes

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_type TEXT NOT NULL DEFAULT 'sport_school'
  CHECK (business_type IN ('sport_school', 'arena', 'other'));

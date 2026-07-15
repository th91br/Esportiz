-- Migration to add missing Google token columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS google_access_token text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS google_refresh_token text;

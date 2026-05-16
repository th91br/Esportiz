-- Migration to fix missing columns and do backfill
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS google_calendar_id text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sheets_spreadsheet_id text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sheets_webhook_active boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pix_key text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pix_receiver text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS niche_settings jsonb DEFAULT '{}'::jsonb;

-- Backfill for legacy users
UPDATE profiles
SET onboarding_completed = true
WHERE (onboarding_completed IS NOT TRUE)
  AND (ct_name IS NOT NULL OR niche_settings IS NOT NULL);

-- Add integrations fields to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS google_access_token TEXT,
ADD COLUMN IF NOT EXISTS google_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS google_calendar_id TEXT,
ADD COLUMN IF NOT EXISTS sheets_spreadsheet_id TEXT,
ADD COLUMN IF NOT EXISTS sheets_webhook_active BOOLEAN DEFAULT false;

-- Add google_event_id to trainings
ALTER TABLE public.trainings
ADD COLUMN IF NOT EXISTS google_event_id TEXT;

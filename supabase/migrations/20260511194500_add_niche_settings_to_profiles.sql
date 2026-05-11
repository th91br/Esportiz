-- Add niche_settings column to profiles to support multi-niche isolated branding and configurations
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS niche_settings JSONB DEFAULT '{}'::jsonb;

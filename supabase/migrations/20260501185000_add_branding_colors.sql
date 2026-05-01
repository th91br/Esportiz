-- Add branding colors to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#1DB874',
ADD COLUMN IF NOT EXISTS secondary_color TEXT DEFAULT '#0A1628';

-- Update existing profiles to have default colors if they are null
UPDATE public.profiles 
SET 
  primary_color = COALESCE(primary_color, '#1DB874'),
  secondary_color = COALESCE(secondary_color, '#0A1628');

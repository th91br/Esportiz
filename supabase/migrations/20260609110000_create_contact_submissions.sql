-- Migration: Create contact_submissions table for storing contact leads
CREATE TABLE IF NOT EXISTS public.contact_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    arena_name TEXT,
    reason TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

-- Deny all public access by default. 
-- The table will be inserted to only via the Edge Function using the service_role key, bypassing RLS safely on the server side.
GRANT INSERT ON public.contact_submissions TO service_role;
GRANT SELECT, UPDATE, DELETE ON public.contact_submissions TO service_role;

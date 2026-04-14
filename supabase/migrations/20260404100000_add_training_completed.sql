-- Add completed status to trainings table
-- This persists the "training done" state in the database instead of localStorage
ALTER TABLE public.trainings
  ADD COLUMN completed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN completed_at TIMESTAMPTZ;

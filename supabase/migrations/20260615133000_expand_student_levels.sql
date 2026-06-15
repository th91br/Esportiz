-- Migration: Expand student level check constraint
-- Date: 2026-06-15

-- 1. Drop existing inline level check constraint if it exists (usually named students_level_check)
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_level_check;

-- 2. Add the updated check constraint supporting the new levels (avançado_pro and profissional)
ALTER TABLE public.students ADD CONSTRAINT students_level_check CHECK (level IN ('iniciante', 'intermediário', 'avançado', 'avançado_pro', 'profissional'));

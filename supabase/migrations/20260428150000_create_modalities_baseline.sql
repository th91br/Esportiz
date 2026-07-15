-- Restore the modalities baseline that originally existed outside migration history.
-- This migration is intentionally idempotent so established projects remain unchanged.

CREATE TABLE IF NOT EXISTS public.modalities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#4285F4',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS modality_id UUID
REFERENCES public.modalities(id) ON DELETE SET NULL;

ALTER TABLE public.trainings
ADD COLUMN IF NOT EXISTS modality_id UUID
REFERENCES public.modalities(id) ON DELETE SET NULL;

ALTER TABLE public.modalities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own modalities" ON public.modalities;
DROP POLICY IF EXISTS "Users can create their own modalities" ON public.modalities;
DROP POLICY IF EXISTS "Users can update their own modalities" ON public.modalities;
DROP POLICY IF EXISTS "Users can delete their own modalities" ON public.modalities;

CREATE POLICY "Users can view their own modalities"
ON public.modalities
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own modalities"
ON public.modalities
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own modalities"
ON public.modalities
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own modalities"
ON public.modalities
FOR DELETE
USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_modalities_updated_at ON public.modalities;
CREATE TRIGGER update_modalities_updated_at
BEFORE UPDATE ON public.modalities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_modalities_user_id
ON public.modalities(user_id);

CREATE INDEX IF NOT EXISTS idx_students_modality_id
ON public.students(modality_id);

CREATE INDEX IF NOT EXISTS idx_trainings_modality_id
ON public.trainings(modality_id);

REVOKE ALL ON TABLE public.modalities FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.modalities TO authenticated;

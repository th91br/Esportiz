-- Restore the student birth date column before portal indexes depend on it.
-- Existing projects already containing the column remain unchanged.

ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS birth_date DATE;

CREATE INDEX IF NOT EXISTS idx_students_birth_date
ON public.students(birth_date);

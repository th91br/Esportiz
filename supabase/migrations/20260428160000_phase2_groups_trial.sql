-- ============================================================
-- FASE 2: Turmas/Grupos + Aula Experimental
-- ============================================================

-- ── 1. Tabela de turmas ──
CREATE TABLE IF NOT EXISTS public.groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  schedule JSONB NOT NULL DEFAULT '[]',
  location TEXT NOT NULL DEFAULT '',
  modality_id UUID REFERENCES public.modalities(id) ON DELETE SET NULL,
  max_students INTEGER DEFAULT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  color TEXT DEFAULT '#6366f1',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own groups" ON public.groups FOR ALL USING (auth.uid() = user_id);

-- ── 2. Tabela de alunos por turma (junção) ──
CREATE TABLE IF NOT EXISTS public.group_students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_id, student_id)
);

ALTER TABLE public.group_students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own group students" ON public.group_students FOR ALL USING (auth.uid() = user_id);

-- ── 3. Campos de aula experimental no aluno ──
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS trial_converted_at TIMESTAMPTZ DEFAULT NULL;

-- ── 4. Índices para performance ──
CREATE INDEX IF NOT EXISTS idx_groups_user_id ON public.groups(user_id);
CREATE INDEX IF NOT EXISTS idx_group_students_group_id ON public.group_students(group_id);
CREATE INDEX IF NOT EXISTS idx_group_students_student_id ON public.group_students(student_id);
CREATE INDEX IF NOT EXISTS idx_students_is_trial ON public.students(is_trial) WHERE is_trial = true;

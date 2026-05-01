-- ============================================================
-- FASE 1: Campos de aluno (CPF, RG, Endereço, Foto) + Duração de treino
-- ============================================================

-- ── 1. Novos campos no aluno ──
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS cpf TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS rg TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS address TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS city TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS state TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS zip_code TEXT DEFAULT NULL;

-- ── 2. Duração de treino (minutos) ──
ALTER TABLE public.trainings
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER NOT NULL DEFAULT 60;

-- ── 3. Bucket para fotos de alunos ──
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'student-photos',
  'student-photos',
  true,
  2097152, -- 2MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- ── 4. Policies de storage para fotos de alunos ──
-- Permitir upload para usuários autenticados
CREATE POLICY "Users can upload student photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'student-photos');

-- Permitir atualização
CREATE POLICY "Users can update student photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'student-photos');

-- Permitir leitura pública (fotos são públicas para exibição)
CREATE POLICY "Student photos are publicly accessible"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'student-photos');

-- Permitir deleção pelo dono
CREATE POLICY "Users can delete student photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'student-photos');

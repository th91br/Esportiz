-- 1. Reforço de Segurança: Tabela training_students
-- Adicionando user_id para isolamento total de multi-tenant
ALTER TABLE public.training_students ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 2. Garantir que todas as tabelas tenham RLS ativo
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_students ENABLE ROW LEVEL SECURITY;

-- 3. Criar Políticas de Isolamento (Caso não existam)

-- Students
DO $$ BEGIN
    CREATE POLICY "Isolamento Students" ON public.students 
    FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Payments
DO $$ BEGIN
    CREATE POLICY "Isolamento Payments" ON public.payments 
    FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Plans
DO $$ BEGIN
    CREATE POLICY "Isolamento Plans" ON public.plans 
    FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Trainings
DO $$ BEGIN
    CREATE POLICY "Isolamento Trainings" ON public.trainings 
    FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Training Students (Isolamento Cirúrgico)
DO $$ BEGIN
    CREATE POLICY "Isolamento Training Students" ON public.training_students 
    FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Attendance
DO $$ BEGIN
    CREATE POLICY "Isolamento Attendance" ON public.attendance 
    FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

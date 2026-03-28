
-- Create plans table
CREATE TABLE public.plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sessions_per_week INTEGER NOT NULL DEFAULT 1,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create students table
CREATE TABLE public.students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  level TEXT NOT NULL DEFAULT 'iniciante' CHECK (level IN ('iniciante', 'intermediário', 'avançado')),
  join_date DATE NOT NULL DEFAULT CURRENT_DATE,
  photo TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create trainings table
CREATE TABLE public.trainings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT '',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create training_students junction table
CREATE TABLE public.training_students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  training_id UUID NOT NULL REFERENCES public.trainings(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  UNIQUE(training_id, student_id)
);

-- Create attendance table
CREATE TABLE public.attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  training_id UUID NOT NULL REFERENCES public.trainings(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  present BOOLEAN NOT NULL DEFAULT false,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(training_id, student_id)
);

-- Enable RLS on all tables
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- RLS policies for plans
CREATE POLICY "Users can view their own plans" ON public.plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own plans" ON public.plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own plans" ON public.plans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own plans" ON public.plans FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for students
CREATE POLICY "Users can view their own students" ON public.students FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own students" ON public.students FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own students" ON public.students FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own students" ON public.students FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for trainings
CREATE POLICY "Users can view their own trainings" ON public.trainings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own trainings" ON public.trainings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own trainings" ON public.trainings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own trainings" ON public.trainings FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for training_students (user owns the training)
CREATE POLICY "Users can view their training students" ON public.training_students FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.trainings WHERE id = training_id AND user_id = auth.uid())
);
CREATE POLICY "Users can add training students" ON public.training_students FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.trainings WHERE id = training_id AND user_id = auth.uid())
);
CREATE POLICY "Users can delete training students" ON public.training_students FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.trainings WHERE id = training_id AND user_id = auth.uid())
);

-- RLS policies for attendance
CREATE POLICY "Users can view their own attendance" ON public.attendance FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own attendance" ON public.attendance FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own attendance" ON public.attendance FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own attendance" ON public.attendance FOR DELETE USING (auth.uid() = user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add triggers
CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON public.plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_trainings_updated_at BEFORE UPDATE ON public.trainings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

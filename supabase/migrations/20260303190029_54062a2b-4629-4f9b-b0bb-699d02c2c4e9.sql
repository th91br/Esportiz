
-- Add payment_due_day to students
ALTER TABLE public.students ADD COLUMN payment_due_day integer;

-- Create payments table
CREATE TABLE public.payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  due_date date NOT NULL,
  paid boolean NOT NULL DEFAULT false,
  paid_at timestamp with time zone,
  month_ref text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own payments"
ON public.payments FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own payments"
ON public.payments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payments"
ON public.payments FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own payments"
ON public.payments FOR DELETE
USING (auth.uid() = user_id);

-- Unique constraint to prevent duplicate payments per student/month
CREATE UNIQUE INDEX payments_student_month_unique ON public.payments (user_id, student_id, month_ref);

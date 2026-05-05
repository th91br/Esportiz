-- Phase 2: Create expenses table for PJ financial control
-- Enables tracking of business costs (rent, salaries, utilities, etc.)

CREATE TABLE expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  category TEXT NOT NULL DEFAULT 'geral',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  paid BOOLEAN NOT NULL DEFAULT false,
  paid_at TIMESTAMPTZ,
  recurrence TEXT DEFAULT 'none' CHECK (recurrence IN ('none', 'monthly')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS - each user sees only their own expenses
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own expenses"
  ON expenses FOR ALL USING (auth.uid() = user_id);

-- Index for fast monthly queries
CREATE INDEX idx_expenses_user_date ON expenses(user_id, date);

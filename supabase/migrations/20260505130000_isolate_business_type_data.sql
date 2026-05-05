-- ============================================================
-- Isolação de dados por tipo de negócio
-- Cada negócio (school, arena, other) vê SOMENTE seus dados
-- DEFAULT 'sport_school' garante que todos os dados existentes
-- continuam aparecendo para os usuários atuais sem nenhuma quebra
-- ============================================================

ALTER TABLE students   ADD COLUMN IF NOT EXISTS business_type TEXT NOT NULL DEFAULT 'sport_school';
ALTER TABLE trainings  ADD COLUMN IF NOT EXISTS business_type TEXT NOT NULL DEFAULT 'sport_school';
ALTER TABLE plans      ADD COLUMN IF NOT EXISTS business_type TEXT NOT NULL DEFAULT 'sport_school';
ALTER TABLE modalities ADD COLUMN IF NOT EXISTS business_type TEXT NOT NULL DEFAULT 'sport_school';
ALTER TABLE expenses   ADD COLUMN IF NOT EXISTS business_type TEXT NOT NULL DEFAULT 'sport_school';
ALTER TABLE products   ADD COLUMN IF NOT EXISTS business_type TEXT NOT NULL DEFAULT 'sport_school';
ALTER TABLE sales      ADD COLUMN IF NOT EXISTS business_type TEXT NOT NULL DEFAULT 'sport_school';
ALTER TABLE payments   ADD COLUMN IF NOT EXISTS business_type TEXT NOT NULL DEFAULT 'sport_school';
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS business_type TEXT NOT NULL DEFAULT 'sport_school';
ALTER TABLE groups     ADD COLUMN IF NOT EXISTS business_type TEXT NOT NULL DEFAULT 'sport_school';

-- Índices para performance nas queries filtradas
CREATE INDEX IF NOT EXISTS idx_students_user_btype   ON students(user_id, business_type);
CREATE INDEX IF NOT EXISTS idx_trainings_user_btype  ON trainings(user_id, business_type);
CREATE INDEX IF NOT EXISTS idx_plans_user_btype      ON plans(user_id, business_type);
CREATE INDEX IF NOT EXISTS idx_modalities_user_btype ON modalities(user_id, business_type);
CREATE INDEX IF NOT EXISTS idx_expenses_user_btype   ON expenses(user_id, business_type);
CREATE INDEX IF NOT EXISTS idx_products_user_btype   ON products(user_id, business_type);
CREATE INDEX IF NOT EXISTS idx_sales_user_btype      ON sales(user_id, business_type);
CREATE INDEX IF NOT EXISTS idx_payments_user_btype   ON payments(user_id, business_type);
CREATE INDEX IF NOT EXISTS idx_attendance_user_btype ON attendance(user_id, business_type);
CREATE INDEX IF NOT EXISTS idx_groups_user_btype     ON groups(user_id, business_type);

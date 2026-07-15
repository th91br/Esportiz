-- Phase 2.12.8.4: remaining sensitive table grant hardening.
-- Safe permission-only migration:
-- - Removes inherited/direct anon grants from all core sensitive tables.
-- - Keeps authenticated grants required by the current frontend/RLS flow.
-- - Keeps financial audit logs read-only for authenticated users.
-- - Does not change data, policies, functions, triggers, or table structure.

REVOKE ALL ON TABLE public.attendance FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.comanda_items FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.comandas FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.expenses FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.financial_audit_logs FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.group_students FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.groups FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.modalities FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.payments FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.plans FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.products FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.sales FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.student_training_requests FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.students FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.training_students FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.trainings FROM PUBLIC, anon;

-- Current authenticated frontend CRUD flows.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.attendance TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.comandas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.comanda_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.expenses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.group_students TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.groups TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.modalities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.plans TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.products TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.students TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.training_students TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.trainings TO authenticated;

-- RPC-controlled/read-focused flows.
GRANT SELECT, UPDATE, DELETE ON TABLE public.payments TO authenticated;
REVOKE INSERT ON TABLE public.payments FROM authenticated;

GRANT SELECT, UPDATE, DELETE ON TABLE public.sales TO authenticated;
REVOKE INSERT ON TABLE public.sales FROM authenticated;

GRANT SELECT, UPDATE, DELETE ON TABLE public.student_training_requests TO authenticated;
REVOKE INSERT ON TABLE public.student_training_requests FROM authenticated;

-- Audit logs should be written only by controlled database functions.
REVOKE ALL ON TABLE public.financial_audit_logs FROM authenticated;
GRANT SELECT ON TABLE public.financial_audit_logs TO authenticated;

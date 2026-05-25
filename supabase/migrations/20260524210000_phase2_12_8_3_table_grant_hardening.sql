-- Phase 2.12.8.3: sensitive table grant hardening.
-- Safe permission-only migration:
-- - Removes direct anon table grants from sensitive operational tables.
-- - Keeps authenticated grants required by the current frontend/RLS flow.
-- - Removes authenticated INSERT where writes should go through RPC/public portal functions.
-- - Does not change data, policies, functions, triggers, or table structure.

REVOKE ALL ON TABLE public.attendance FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.comanda_items FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.comandas FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.payments FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.sales FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.student_training_requests FROM PUBLIC, anon;

-- These writes are still part of the current authenticated frontend flow.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.attendance TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.comandas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.comanda_items TO authenticated;

-- Financial writes and portal request creation should use controlled RPCs.
REVOKE INSERT ON TABLE public.payments FROM authenticated;
REVOKE INSERT ON TABLE public.sales FROM authenticated;
REVOKE INSERT ON TABLE public.student_training_requests FROM authenticated;

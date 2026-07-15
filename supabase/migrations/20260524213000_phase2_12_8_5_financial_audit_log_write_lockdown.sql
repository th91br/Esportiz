-- Phase 2.12.8.5: financial audit log write lockdown.
-- Safe permission-only migration:
-- - Keeps audit logs readable by authenticated users.
-- - Prevents direct authenticated inserts, updates, and deletes.
-- - Audit log writes remain centralized in SECURITY DEFINER RPCs.

REVOKE INSERT, UPDATE, DELETE ON TABLE public.financial_audit_logs FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.financial_audit_logs FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.financial_audit_logs TO authenticated;

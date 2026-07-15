-- Phase 2.12.8.2: revoke unexpected anon EXECUTE grants from internal RPCs.
-- Safe permission-only migration:
-- - Keeps only intended public portal RPCs callable by anon.
-- - Preserves authenticated access for RPCs used by the application.
-- - Does not change data, tables, policies, or function bodies.

REVOKE ALL ON FUNCTION public.add_arena_partial_payment_atomic(UUID, NUMERIC, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_access_organization_financials(UUID, TEXT[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_access_owner_user_data(UUID, TEXT[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancel_payment_atomic(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancel_student_open_payments_atomic(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cleanup_student_future_trainings(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.close_comanda_atomic(UUID, UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_sale_and_restore_stock(UUID, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ensure_owner_organization_for_profile() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.generate_monthly_payments(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.generate_student_schedule(UUID, UUID, JSONB, INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_auth_organization_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_auth_owner_user_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_auth_tenant_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.guard_arena_reservation_payment_fields() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_organization_role(UUID, TEXT[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_organization_member(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_organization_owner(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_valid_cpf(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.process_sale(UUID, TEXT, UUID, TEXT, INTEGER, NUMERIC, NUMERIC, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.process_sale(UUID, UUID, TEXT, INTEGER, NUMERIC, NUMERIC, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.process_sale_cart_atomic(UUID, TEXT, JSONB, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.receive_payment_atomic(UUID, NUMERIC) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.receive_payments_batch_atomic(UUID[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.record_financial_audit_log(UUID, TEXT, TEXT, UUID, TEXT, JSONB, JSONB, TEXT, JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reopen_comanda_atomic(UUID, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reopen_payment_atomic(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reopen_payments_batch_atomic(UUID[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_arena_reservation_payment_status_atomic(UUID, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_organization_id_from_user_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_training_students_organization_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_user_id_from_organization_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_user_id_from_training_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sync_all_unpaid_payments_for_plan(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sync_student_unpaid_payments(UUID, BOOLEAN, UUID, INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon;

-- Ensure operational RPCs remain available to authenticated users.
GRANT EXECUTE ON FUNCTION public.add_arena_partial_payment_atomic(UUID, NUMERIC, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_organization_financials(UUID, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_owner_user_data(UUID, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_payment_atomic(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_student_open_payments_atomic(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_student_future_trainings(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_comanda_atomic(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_sale_and_restore_stock(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_monthly_payments(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_student_schedule(UUID, UUID, JSONB, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_auth_organization_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_auth_owner_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_auth_tenant_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_organization_role(UUID, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_organization_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_organization_owner(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_sale(UUID, TEXT, UUID, TEXT, INTEGER, NUMERIC, NUMERIC, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_sale(UUID, UUID, TEXT, INTEGER, NUMERIC, NUMERIC, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_sale_cart_atomic(UUID, TEXT, JSONB, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.receive_payment_atomic(UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.receive_payments_batch_atomic(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reopen_comanda_atomic(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reopen_payment_atomic(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reopen_payments_batch_atomic(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_arena_reservation_payment_status_atomic(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_all_unpaid_payments_for_plan(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_student_unpaid_payments(UUID, BOOLEAN, UUID, INTEGER) TO authenticated;

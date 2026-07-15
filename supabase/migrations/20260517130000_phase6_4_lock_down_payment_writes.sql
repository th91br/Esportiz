-- Phase 6.4: lock down direct writes to payments.
-- Users keep direct read access to their own payments, while writes go through
-- audited RPCs that validate auth.uid() and tenant ownership.

ALTER FUNCTION public.generate_monthly_payments(TEXT) SECURITY DEFINER;
ALTER FUNCTION public.receive_payment_atomic(UUID, NUMERIC) SECURITY DEFINER;
ALTER FUNCTION public.reopen_payment_atomic(UUID) SECURITY DEFINER;
ALTER FUNCTION public.cancel_payment_atomic(UUID) SECURITY DEFINER;
ALTER FUNCTION public.receive_payments_batch_atomic(UUID[]) SECURITY DEFINER;
ALTER FUNCTION public.reopen_payments_batch_atomic(UUID[]) SECURITY DEFINER;
ALTER FUNCTION public.cancel_student_open_payments_atomic(UUID) SECURITY DEFINER;
ALTER FUNCTION public.sync_student_unpaid_payments(UUID, BOOLEAN, UUID, INT) SECURITY DEFINER;
ALTER FUNCTION public.sync_all_unpaid_payments_for_plan(UUID) SECURITY DEFINER;

ALTER FUNCTION public.generate_monthly_payments(TEXT) SET search_path = public;
ALTER FUNCTION public.receive_payment_atomic(UUID, NUMERIC) SET search_path = public;
ALTER FUNCTION public.reopen_payment_atomic(UUID) SET search_path = public;
ALTER FUNCTION public.cancel_payment_atomic(UUID) SET search_path = public;
ALTER FUNCTION public.receive_payments_batch_atomic(UUID[]) SET search_path = public;
ALTER FUNCTION public.reopen_payments_batch_atomic(UUID[]) SET search_path = public;
ALTER FUNCTION public.cancel_student_open_payments_atomic(UUID) SET search_path = public;
ALTER FUNCTION public.sync_student_unpaid_payments(UUID, BOOLEAN, UUID, INT) SET search_path = public;
ALTER FUNCTION public.sync_all_unpaid_payments_for_plan(UUID) SET search_path = public;

REVOKE ALL ON FUNCTION public.generate_monthly_payments(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.receive_payment_atomic(UUID, NUMERIC) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reopen_payment_atomic(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_payment_atomic(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.receive_payments_batch_atomic(UUID[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reopen_payments_batch_atomic(UUID[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_student_open_payments_atomic(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_student_unpaid_payments(UUID, BOOLEAN, UUID, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_all_unpaid_payments_for_plan(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.generate_monthly_payments(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.receive_payment_atomic(UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reopen_payment_atomic(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_payment_atomic(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.receive_payments_batch_atomic(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reopen_payments_batch_atomic(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_student_open_payments_atomic(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_student_unpaid_payments(UUID, BOOLEAN, UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_all_unpaid_payments_for_plan(UUID) TO authenticated;

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Isolamento Payments" ON public.payments;
DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can create their own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can update their own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can delete their own payments" ON public.payments;

CREATE POLICY "Users can view their own payments"
ON public.payments
FOR SELECT
USING (auth.uid() = user_id);

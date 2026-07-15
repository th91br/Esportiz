-- Allow the explicit restoration of intentionally cancelled school payments
-- to be recorded in the immutable financial audit trail.

DO $allow_payment_restored_audit_action$
BEGIN
    IF to_regclass('public.financial_audit_logs') IS NOT NULL THEN
        ALTER TABLE public.financial_audit_logs
            DROP CONSTRAINT IF EXISTS financial_audit_logs_action_check;

        ALTER TABLE public.financial_audit_logs
            ADD CONSTRAINT financial_audit_logs_action_check
            CHECK (
                action IN (
                    'payment_received',
                    'payment_partially_received',
                    'payment_reopened',
                    'payment_cancelled',
                    'payment_balance_cancelled',
                    'payment_restored',
                    'arena_reservation_received',
                    'arena_reservation_reopened'
                )
            );
    END IF;
END;
$allow_payment_restored_audit_action$;

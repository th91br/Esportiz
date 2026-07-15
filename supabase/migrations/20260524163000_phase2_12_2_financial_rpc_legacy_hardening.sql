-- Phase 2.12.2: harden legacy financial RPC signatures.
-- Safe, compatible migration:
-- - Keeps the legacy process_sale signature for backward compatibility.
-- - Routes legacy calls through the canonical, organization-aware process_sale RPC.
-- - Adds SET search_path = public to the legacy SECURITY DEFINER function.
-- - Reasserts PUBLIC revoke/authenticated execute grants for financial RPCs when they exist.
-- - Does not delete functions, does not alter tables, and does not modify existing data.

CREATE OR REPLACE FUNCTION public.process_sale(
    p_user_id UUID,
    p_business_type TEXT,
    p_product_id UUID,
    p_product_name TEXT,
    p_quantity INTEGER,
    p_unit_price NUMERIC,
    p_total NUMERIC,
    p_payment_method TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $phase2122_process_sale_legacy_wrapper$
DECLARE
    v_payment_method TEXT;
BEGIN
    -- Older clients used "cartao". Keep compatibility while storing the
    -- detailed card method introduced later in the Arena/PDV evolution.
    v_payment_method := CASE
        WHEN p_payment_method = 'cartao' THEN 'cartao_credito'
        ELSE p_payment_method
    END;

    RETURN public.process_sale(
        p_user_id,
        p_product_id,
        p_product_name,
        p_quantity,
        p_unit_price,
        p_total,
        v_payment_method,
        COALESCE(NULLIF(p_business_type, ''), 'sport_school')
    );
END;
$phase2122_process_sale_legacy_wrapper$;

DO $phase2122_financial_rpc_grants$
DECLARE
    v_signature TEXT;
    v_function REGPROCEDURE;
BEGIN
    FOREACH v_signature IN ARRAY ARRAY[
        'public.process_sale(uuid,uuid,text,integer,numeric,numeric,text,text)',
        'public.process_sale(uuid,text,uuid,text,integer,numeric,numeric,text)',
        'public.process_sale_cart_atomic(uuid,text,jsonb,text)',
        'public.delete_sale_and_restore_stock(uuid,uuid)',
        'public.close_comanda_atomic(uuid,uuid,text)',
        'public.reopen_comanda_atomic(uuid,uuid)',
        'public.receive_payment_atomic(uuid,numeric)',
        'public.reopen_payment_atomic(uuid)',
        'public.cancel_payment_atomic(uuid)',
        'public.receive_payments_batch_atomic(uuid[])',
        'public.reopen_payments_batch_atomic(uuid[])',
        'public.cancel_student_open_payments_atomic(uuid)',
        'public.set_arena_reservation_payment_status_atomic(uuid,text,text)',
        'public.add_arena_partial_payment_atomic(uuid,numeric,text)',
        'public.generate_monthly_payments(text)',
        'public.sync_student_unpaid_payments(uuid,boolean,uuid,integer)',
        'public.sync_all_unpaid_payments_for_plan(uuid)'
    ]
    LOOP
        v_function := to_regprocedure(v_signature);

        IF v_function IS NOT NULL THEN
            EXECUTE FORMAT('REVOKE ALL ON FUNCTION %s FROM PUBLIC', v_function);
            EXECUTE FORMAT('GRANT EXECUTE ON FUNCTION %s TO authenticated', v_function);
        END IF;
    END LOOP;
END;
$phase2122_financial_rpc_grants$;

COMMENT ON FUNCTION public.process_sale(UUID, TEXT, UUID, TEXT, INTEGER, NUMERIC, NUMERIC, TEXT)
IS 'Legacy compatibility wrapper. Delegates to the canonical organization-aware process_sale RPC.';

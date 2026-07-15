-- Phase 2.12.10.2: progressively deprecate the legacy process_sale RPC.
-- Safe permission-only migration:
-- - Does not drop functions.
-- - Does not alter tables, policies, or data.
-- - Removes client EXECUTE access from the oldest legacy process_sale signature.
-- - Keeps the current canonical sale RPC and cart checkout RPC available to authenticated users.
-- - Allows rollback by granting authenticated EXECUTE back to the legacy signature.

DO $phase212102_deprecate_legacy_process_sale$
DECLARE
    v_legacy_process_sale REGPROCEDURE;
    v_current_process_sale REGPROCEDURE;
    v_cart_checkout REGPROCEDURE;
BEGIN
    v_legacy_process_sale := to_regprocedure(
        'public.process_sale(uuid,text,uuid,text,integer,numeric,numeric,text)'
    );
    v_current_process_sale := to_regprocedure(
        'public.process_sale(uuid,uuid,text,integer,numeric,numeric,text,text)'
    );
    v_cart_checkout := to_regprocedure(
        'public.process_sale_cart_atomic(uuid,text,jsonb,text)'
    );

    IF v_cart_checkout IS NULL THEN
        RAISE EXCEPTION 'Required canonical checkout RPC process_sale_cart_atomic(uuid,text,jsonb,text) was not found.';
    END IF;

    IF v_legacy_process_sale IS NOT NULL THEN
        EXECUTE FORMAT(
            'REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated',
            v_legacy_process_sale
        );
        EXECUTE FORMAT(
            'COMMENT ON FUNCTION %s IS %L',
            v_legacy_process_sale,
            'Deprecated legacy compatibility wrapper. Client execution disabled in phase 2.12.10.2 after frontend migrated to process_sale_cart_atomic.'
        );
    END IF;

    IF v_current_process_sale IS NOT NULL THEN
        EXECUTE FORMAT('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', v_current_process_sale);
        EXECUTE FORMAT('GRANT EXECUTE ON FUNCTION %s TO authenticated', v_current_process_sale);
        EXECUTE FORMAT(
            'COMMENT ON FUNCTION %s IS %L',
            v_current_process_sale,
            'Current single-sale compatibility RPC. Temporarily kept for authenticated users while cached clients age out; new frontend uses process_sale_cart_atomic.'
        );
    END IF;

    EXECUTE FORMAT('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', v_cart_checkout);
    EXECUTE FORMAT('GRANT EXECUTE ON FUNCTION %s TO authenticated', v_cart_checkout);
    EXECUTE FORMAT(
        'COMMENT ON FUNCTION %s IS %L',
        v_cart_checkout,
        'Canonical atomic sales checkout RPC used by the current frontend for single-item and cart sales.'
    );
END;
$phase212102_deprecate_legacy_process_sale$;

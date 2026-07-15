-- Phase 2.12.1 hotfix: make comanda reopen reconcile sales reliably.
-- Safe intent:
-- - Keeps the same RPC signature used by the frontend.
-- - Restores stock from the linked comanda sales, deletes those sales, and verifies no sale remains.
-- - Adds a separate diagnostic/cleanup query in the deployment notes for already-open comandas with stale sales.

CREATE OR REPLACE FUNCTION public.reopen_comanda_atomic(
    p_user_id UUID,
    p_comanda_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $phase2121_reopen_comanda_cleanup$
DECLARE
    v_comanda RECORD;
    v_sale RECORD;
    v_product RECORD;
    v_sales_count INTEGER := 0;
    v_deleted_sales_count INTEGER := 0;
    v_remaining_sales_count INTEGER := 0;
    v_restored_quantity INTEGER := 0;
BEGIN
    IF NOT public.can_access_owner_user_data(p_user_id, ARRAY['owner', 'manager']) THEN
        RAISE EXCEPTION 'Usuario nao autorizado.';
    END IF;

    SELECT *
    INTO v_comanda
    FROM public.comandas
    WHERE id = p_comanda_id
      AND user_id = p_user_id
      AND business_type = 'arena'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Comanda nao encontrada.';
    END IF;

    IF v_comanda.status <> 'closed' THEN
        RAISE EXCEPTION 'Apenas comandas fechadas podem ser reabertas.';
    END IF;

    FOR v_sale IN
        SELECT *
        FROM public.sales
        WHERE comanda_id = p_comanda_id
          AND user_id = p_user_id
          AND business_type = 'arena'
        ORDER BY sold_at, id
        FOR UPDATE
    LOOP
        v_sales_count := v_sales_count + 1;

        IF v_sale.product_id IS NOT NULL THEN
            SELECT *
            INTO v_product
            FROM public.products
            WHERE id = v_sale.product_id
              AND user_id = p_user_id
              AND business_type = 'arena'
            FOR UPDATE;

            IF FOUND AND v_product.track_stock THEN
                UPDATE public.products
                SET stock_quantity = stock_quantity + v_sale.quantity
                WHERE id = v_sale.product_id
                  AND user_id = p_user_id
                  AND business_type = 'arena';

                v_restored_quantity := v_restored_quantity + v_sale.quantity;
            END IF;
        END IF;
    END LOOP;

    WITH deleted_sales AS (
        DELETE FROM public.sales
        WHERE comanda_id = p_comanda_id
          AND user_id = p_user_id
          AND business_type = 'arena'
        RETURNING id
    )
    SELECT COUNT(*)::INTEGER
    INTO v_deleted_sales_count
    FROM deleted_sales;

    SELECT COUNT(*)::INTEGER
    INTO v_remaining_sales_count
    FROM public.sales
    WHERE comanda_id = p_comanda_id
      AND user_id = p_user_id
      AND business_type = 'arena';

    IF v_remaining_sales_count > 0 THEN
        RAISE EXCEPTION 'Falha ao estornar vendas da comanda. Ainda existem % venda(s) vinculadas.', v_remaining_sales_count;
    END IF;

    UPDATE public.comandas
    SET status = 'open',
        closed_at = NULL
    WHERE id = p_comanda_id
      AND user_id = p_user_id;

    RETURN JSON_BUILD_OBJECT(
        'success', TRUE,
        'sales_count', v_sales_count,
        'deleted_sales_count', v_deleted_sales_count,
        'restored_quantity', v_restored_quantity
    );
END;
$phase2121_reopen_comanda_cleanup$;

REVOKE ALL ON FUNCTION public.reopen_comanda_atomic(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reopen_comanda_atomic(UUID, UUID) TO authenticated;

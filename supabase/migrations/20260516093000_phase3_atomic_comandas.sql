-- Phase 3: atomic comanda close/reopen with synchronized sales and stock.
-- The frontend no longer performs multi-step financial/stock writes for comandas.

CREATE OR REPLACE FUNCTION public.close_comanda_atomic(
    p_user_id UUID,
    p_comanda_id UUID,
    p_payment_method TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_comanda RECORD;
    v_item RECORD;
    v_product RECORD;
    v_sales_count INTEGER := 0;
    v_total_amount NUMERIC := 0;
    v_item_total NUMERIC;
    v_closed_at TIMESTAMPTZ := NOW();
BEGIN
    IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    IF p_payment_method NOT IN ('dinheiro', 'pix', 'cartao_credito', 'cartao_debito') THEN
        RAISE EXCEPTION 'Forma de pagamento invalida.';
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

    IF v_comanda.status <> 'open' THEN
        RAISE EXCEPTION 'Comanda ja esta fechada.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.sales
        WHERE comanda_id = p_comanda_id
          AND user_id = p_user_id
    ) THEN
        RAISE EXCEPTION 'Esta comanda ja possui vendas registradas.';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.comanda_items
        WHERE comanda_id = p_comanda_id
          AND user_id = p_user_id
    ) THEN
        RAISE EXCEPTION 'Comanda sem itens para fechamento.';
    END IF;

    FOR v_item IN
        SELECT *
        FROM public.comanda_items
        WHERE comanda_id = p_comanda_id
          AND user_id = p_user_id
        ORDER BY created_at, id
    LOOP
        IF v_item.quantity <= 0 THEN
            RAISE EXCEPTION 'Quantidade invalida no item %.', v_item.product_name;
        END IF;

        IF v_item.unit_price < 0 THEN
            RAISE EXCEPTION 'Preco invalido no item %.', v_item.product_name;
        END IF;

        v_item_total := ROUND((v_item.quantity::NUMERIC * v_item.unit_price::NUMERIC), 2);

        IF v_item.product_id IS NOT NULL THEN
            SELECT *
            INTO v_product
            FROM public.products
            WHERE id = v_item.product_id
              AND user_id = p_user_id
              AND business_type = 'arena'
            FOR UPDATE;

            IF NOT FOUND THEN
                RAISE EXCEPTION 'Produto da comanda nao encontrado ou sem permissao: %.', v_item.product_name;
            END IF;

            IF v_product.track_stock THEN
                UPDATE public.products
                SET stock_quantity = stock_quantity - v_item.quantity
                WHERE id = v_item.product_id
                  AND user_id = p_user_id
                  AND business_type = 'arena'
                  AND stock_quantity >= v_item.quantity;

                IF NOT FOUND THEN
                    RAISE EXCEPTION 'Estoque insuficiente para o produto: %.', v_product.name;
                END IF;
            END IF;
        END IF;

        INSERT INTO public.sales (
            user_id,
            business_type,
            product_id,
            product_name,
            quantity,
            unit_price,
            total,
            payment_method,
            sold_at,
            comanda_id
        ) VALUES (
            p_user_id,
            'arena',
            v_item.product_id,
            v_item.product_name,
            v_item.quantity,
            v_item.unit_price,
            v_item_total,
            p_payment_method,
            v_closed_at,
            p_comanda_id
        );

        v_sales_count := v_sales_count + 1;
        v_total_amount := v_total_amount + v_item_total;
    END LOOP;

    UPDATE public.comandas
    SET status = 'closed',
        closed_at = v_closed_at
    WHERE id = p_comanda_id
      AND user_id = p_user_id;

    RETURN JSON_BUILD_OBJECT(
        'success', true,
        'sales_count', v_sales_count,
        'total_amount', v_total_amount,
        'closed_at', v_closed_at
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.reopen_comanda_atomic(
    p_user_id UUID,
    p_comanda_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_comanda RECORD;
    v_sale RECORD;
    v_product RECORD;
    v_sales_count INTEGER := 0;
    v_restored_quantity INTEGER := 0;
BEGIN
    IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
        RAISE EXCEPTION 'Unauthorized';
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

    DELETE FROM public.sales
    WHERE comanda_id = p_comanda_id
      AND user_id = p_user_id
      AND business_type = 'arena';

    UPDATE public.comandas
    SET status = 'open',
        closed_at = NULL
    WHERE id = p_comanda_id
      AND user_id = p_user_id;

    RETURN JSON_BUILD_OBJECT(
        'success', true,
        'sales_count', v_sales_count,
        'restored_quantity', v_restored_quantity
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.close_comanda_atomic(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reopen_comanda_atomic(UUID, UUID) TO authenticated;

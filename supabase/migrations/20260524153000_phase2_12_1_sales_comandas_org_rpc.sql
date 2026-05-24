-- Phase 2.12.1: organization-aware sales and comandas RPCs.
-- Safe, compatible migration:
-- - Keeps the same RPC signatures currently used by the frontend.
-- - Keeps p_user_id as the owner/tenant data boundary for compatibility.
-- - Adds organization/member authorization through can_access_owner_user_data().
-- - Does not change table RLS policies or direct financial writes.

CREATE OR REPLACE FUNCTION public.process_sale(
    p_user_id UUID,
    p_product_id UUID,
    p_product_name TEXT,
    p_quantity INTEGER,
    p_unit_price NUMERIC,
    p_total NUMERIC,
    p_payment_method TEXT,
    p_business_type TEXT DEFAULT 'sport_school'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $phase2121_process_sale$
DECLARE
    v_product_record RECORD;
    v_sale_id UUID;
    v_real_unit_price NUMERIC;
    v_calculated_total NUMERIC;
BEGIN
    IF NOT public.can_access_owner_user_data(p_user_id, ARRAY['owner', 'manager', 'receptionist']) THEN
        RAISE EXCEPTION 'Usuario nao autorizado.';
    END IF;

    IF p_business_type NOT IN ('sport_school', 'arena') THEN
        RAISE EXCEPTION 'Tipo de negocio invalido.';
    END IF;

    IF p_payment_method NOT IN ('dinheiro', 'pix', 'cartao_credito', 'cartao_debito') THEN
        RAISE EXCEPTION 'Forma de pagamento invalida.';
    END IF;

    IF p_quantity IS NULL OR p_quantity <= 0 THEN
        RAISE EXCEPTION 'Quantidade invalida.';
    END IF;

    SELECT price, track_stock, stock_quantity, business_type, name
    INTO v_product_record
    FROM public.products
    WHERE id = p_product_id
      AND user_id = p_user_id
      AND business_type = p_business_type
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Produto nao encontrado ou acesso negado.';
    END IF;

    v_real_unit_price := v_product_record.price;
    v_calculated_total := ROUND((v_real_unit_price * p_quantity), 2);

    IF v_product_record.track_stock THEN
        UPDATE public.products
        SET stock_quantity = stock_quantity - p_quantity
        WHERE id = p_product_id
          AND user_id = p_user_id
          AND business_type = p_business_type
          AND stock_quantity >= p_quantity;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Estoque insuficiente para o produto: %.', v_product_record.name;
        END IF;
    END IF;

    INSERT INTO public.sales (
        user_id,
        product_id,
        product_name,
        quantity,
        unit_price,
        total,
        payment_method,
        business_type,
        sold_at
    ) VALUES (
        p_user_id,
        p_product_id,
        v_product_record.name,
        p_quantity,
        v_real_unit_price,
        v_calculated_total,
        p_payment_method,
        p_business_type,
        NOW()
    ) RETURNING id INTO v_sale_id;

    RETURN JSON_BUILD_OBJECT('success', TRUE, 'sale_id', v_sale_id, 'calculated_total', v_calculated_total);
END;
$phase2121_process_sale$;

CREATE OR REPLACE FUNCTION public.process_sale_cart_atomic(
    p_user_id UUID,
    p_business_type TEXT,
    p_items JSONB,
    p_payment_method TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $phase2121_sales_checkout$
DECLARE
    v_item JSONB;
    v_product_id UUID;
    v_quantity INT;
    v_product RECORD;
    v_item_total NUMERIC;
    v_checkout_id UUID := gen_random_uuid();
    v_sales_count INT := 0;
    v_total_amount NUMERIC := 0;
BEGIN
    IF NOT public.can_access_owner_user_data(p_user_id, ARRAY['owner', 'manager', 'receptionist']) THEN
        RAISE EXCEPTION 'Usuario nao autorizado.';
    END IF;

    IF p_business_type NOT IN ('sport_school', 'arena') THEN
        RAISE EXCEPTION 'Tipo de negocio invalido.';
    END IF;

    IF p_payment_method NOT IN ('dinheiro', 'pix', 'cartao_credito', 'cartao_debito') THEN
        RAISE EXCEPTION 'Forma de pagamento invalida.';
    END IF;

    IF p_items IS NULL
       OR jsonb_typeof(p_items) <> 'array'
       OR jsonb_array_length(p_items) = 0
    THEN
        RAISE EXCEPTION 'Carrinho vazio.';
    END IF;

    FOR v_item IN
        SELECT value
        FROM jsonb_array_elements(p_items)
    LOOP
        IF COALESCE(v_item->>'productId', '') = '' THEN
            RAISE EXCEPTION 'Produto invalido no carrinho.';
        END IF;

        BEGIN
            v_product_id := (v_item->>'productId')::UUID;
        EXCEPTION WHEN invalid_text_representation THEN
            RAISE EXCEPTION 'Produto invalido no carrinho.';
        END;

        IF COALESCE(v_item->>'quantity', '') !~ '^[0-9]+$' THEN
            RAISE EXCEPTION 'Quantidade invalida no carrinho.';
        END IF;

        v_quantity := (v_item->>'quantity')::INT;

        IF v_quantity <= 0 THEN
            RAISE EXCEPTION 'Quantidade invalida no carrinho.';
        END IF;

        SELECT id, name, price, track_stock, stock_quantity
        INTO v_product
        FROM public.products
        WHERE id = v_product_id
          AND user_id = p_user_id
          AND business_type = p_business_type
          AND active = TRUE
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Produto nao encontrado ou inativo.';
        END IF;

        IF v_product.price < 0 THEN
            RAISE EXCEPTION 'Preco invalido para o produto: %.', v_product.name;
        END IF;

        IF v_product.track_stock THEN
            UPDATE public.products
            SET stock_quantity = stock_quantity - v_quantity
            WHERE id = v_product.id
              AND user_id = p_user_id
              AND business_type = p_business_type
              AND stock_quantity >= v_quantity;

            IF NOT FOUND THEN
                RAISE EXCEPTION 'Estoque insuficiente para o produto: %.', v_product.name;
            END IF;
        END IF;

        v_item_total := ROUND((v_product.price::NUMERIC * v_quantity::NUMERIC), 2);

        INSERT INTO public.sales (
            user_id,
            business_type,
            checkout_id,
            product_id,
            product_name,
            quantity,
            unit_price,
            total,
            payment_method,
            sold_at
        ) VALUES (
            p_user_id,
            p_business_type,
            v_checkout_id,
            v_product.id,
            v_product.name,
            v_quantity,
            v_product.price,
            v_item_total,
            p_payment_method,
            NOW()
        );

        v_sales_count := v_sales_count + 1;
        v_total_amount := v_total_amount + v_item_total;
    END LOOP;

    RETURN jsonb_build_object(
        'success', TRUE,
        'checkout_id', v_checkout_id,
        'sales_count', v_sales_count,
        'total_amount', ROUND(v_total_amount, 2)
    );
END;
$phase2121_sales_checkout$;

CREATE OR REPLACE FUNCTION public.delete_sale_and_restore_stock(
    p_sale_id UUID,
    p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $phase2121_delete_sale$
DECLARE
    v_sale_record RECORD;
BEGIN
    IF NOT public.can_access_owner_user_data(p_user_id, ARRAY['owner', 'manager']) THEN
        RAISE EXCEPTION 'Usuario nao autorizado.';
    END IF;

    SELECT *
    INTO v_sale_record
    FROM public.sales
    WHERE id = p_sale_id
      AND user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Venda nao encontrada.';
    END IF;

    IF v_sale_record.product_id IS NOT NULL THEN
        UPDATE public.products
        SET stock_quantity = stock_quantity + v_sale_record.quantity
        WHERE id = v_sale_record.product_id
          AND user_id = p_user_id
          AND business_type = v_sale_record.business_type
          AND track_stock = TRUE;
    END IF;

    DELETE FROM public.sales
    WHERE id = p_sale_id
      AND user_id = p_user_id;

    RETURN JSON_BUILD_OBJECT('success', TRUE);
END;
$phase2121_delete_sale$;

CREATE OR REPLACE FUNCTION public.close_comanda_atomic(
    p_user_id UUID,
    p_comanda_id UUID,
    p_payment_method TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $phase2121_close_comanda$
DECLARE
    v_comanda RECORD;
    v_item RECORD;
    v_product RECORD;
    v_sales_count INTEGER := 0;
    v_total_amount NUMERIC := 0;
    v_item_total NUMERIC;
    v_closed_at TIMESTAMPTZ := NOW();
BEGIN
    IF NOT public.can_access_owner_user_data(p_user_id, ARRAY['owner', 'manager', 'receptionist']) THEN
        RAISE EXCEPTION 'Usuario nao autorizado.';
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
        'success', TRUE,
        'sales_count', v_sales_count,
        'total_amount', v_total_amount,
        'closed_at', v_closed_at
    );
END;
$phase2121_close_comanda$;

CREATE OR REPLACE FUNCTION public.reopen_comanda_atomic(
    p_user_id UUID,
    p_comanda_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $phase2121_reopen_comanda$
DECLARE
    v_comanda RECORD;
    v_sale RECORD;
    v_product RECORD;
    v_sales_count INTEGER := 0;
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
        'success', TRUE,
        'sales_count', v_sales_count,
        'restored_quantity', v_restored_quantity
    );
END;
$phase2121_reopen_comanda$;

REVOKE ALL ON FUNCTION public.process_sale(UUID, UUID, TEXT, INTEGER, NUMERIC, NUMERIC, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.process_sale_cart_atomic(UUID, TEXT, JSONB, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_sale_and_restore_stock(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.close_comanda_atomic(UUID, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reopen_comanda_atomic(UUID, UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.process_sale(UUID, UUID, TEXT, INTEGER, NUMERIC, NUMERIC, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_sale_cart_atomic(UUID, TEXT, JSONB, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_sale_and_restore_stock(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_comanda_atomic(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reopen_comanda_atomic(UUID, UUID) TO authenticated;

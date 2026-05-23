-- Phase 13.7: atomic direct sales checkout.
-- Groups direct cart sales with checkout_id and processes every item in one transaction.

ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS checkout_id UUID;

CREATE INDEX IF NOT EXISTS idx_sales_user_checkout
ON public.sales(user_id, checkout_id)
WHERE checkout_id IS NOT NULL;

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
AS $phase137_sales_checkout$
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
    IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
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
$phase137_sales_checkout$;

REVOKE ALL ON FUNCTION public.process_sale_cart_atomic(UUID, TEXT, JSONB, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_sale_cart_atomic(UUID, TEXT, JSONB, TEXT) TO authenticated;

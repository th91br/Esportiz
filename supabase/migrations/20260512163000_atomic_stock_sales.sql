-- Migration: Atomic stock decrement for sales
-- Date: 2026-05-12

CREATE OR REPLACE FUNCTION public.process_sale(
    p_user_id UUID,
    p_business_type TEXT,
    p_product_id UUID,
    p_product_name TEXT,
    p_quantity INT,
    p_unit_price NUMERIC,
    p_total NUMERIC,
    p_payment_method TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sale_id UUID;
    v_track_stock BOOLEAN;
    v_stock_qty INT;
BEGIN
    -- 1. Insert the sale record
    INSERT INTO public.sales (
        user_id,
        business_type,
        product_id,
        product_name,
        quantity,
        unit_price,
        total,
        payment_method
    ) VALUES (
        p_user_id,
        p_business_type,
        p_product_id,
        p_product_name,
        p_quantity,
        p_unit_price,
        p_total,
        p_payment_method
    ) RETURNING id INTO v_sale_id;

    -- 2. Handle stock atomically using Row-Level Locks
    IF p_product_id IS NOT NULL THEN
        -- Select FOR UPDATE locks the row so concurrent sales wait
        SELECT track_stock, stock_quantity 
        INTO v_track_stock, v_stock_qty
        FROM public.products
        WHERE id = p_product_id
        FOR UPDATE;

        IF v_track_stock THEN
            UPDATE public.products
            SET stock_quantity = GREATEST(0, stock_quantity - p_quantity)
            WHERE id = p_product_id;
        END IF;
    END IF;

    RETURN JSON_BUILD_OBJECT('success', true, 'sale_id', v_sale_id);
END;
$$;


CREATE OR REPLACE FUNCTION public.delete_sale_and_restore_stock(
    p_sale_id UUID,
    p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_product_id UUID;
    v_quantity INT;
    v_track_stock BOOLEAN;
BEGIN
    -- 1. Fetch the sale to get product and quantity
    SELECT product_id, quantity 
    INTO v_product_id, v_quantity
    FROM public.sales
    WHERE id = p_sale_id AND user_id = p_user_id;

    IF v_product_id IS NOT NULL THEN
        -- Lock product row
        SELECT track_stock INTO v_track_stock
        FROM public.products
        WHERE id = v_product_id
        FOR UPDATE;

        -- Restore stock if tracked
        IF v_track_stock THEN
            UPDATE public.products
            SET stock_quantity = stock_quantity + v_quantity
            WHERE id = v_product_id;
        END IF;
    END IF;

    -- 2. Delete the sale
    DELETE FROM public.sales
    WHERE id = p_sale_id AND user_id = p_user_id;

    RETURN JSON_BUILD_OBJECT('success', true);
END;
$$;

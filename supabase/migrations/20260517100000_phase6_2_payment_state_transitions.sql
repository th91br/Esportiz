-- Phase 6.2: transactional payment state transitions.
-- Centralizes receive, reopen, batch updates, and safe cancellation paths.

CREATE OR REPLACE FUNCTION public.receive_payment_atomic(
    p_payment_id UUID,
    p_paid_amount NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
DECLARE
    v_user_id UUID;
    v_payment RECORD;
    v_found BOOLEAN := FALSE;
    v_next_paid_amount NUMERIC;
    v_is_fully_paid BOOLEAN;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario nao autenticado.';
    END IF;

    FOR v_payment IN
        SELECT id, amount, paid_amount, full_price
        FROM public.payments
        WHERE id = p_payment_id
          AND user_id = v_user_id
        FOR UPDATE
    LOOP
        v_found := TRUE;
    END LOOP;

    IF NOT v_found THEN
        RAISE EXCEPTION 'Pagamento nao encontrado.';
    END IF;

    IF COALESCE(v_payment.full_price, 0) = -1 THEN
        RAISE EXCEPTION 'Pagamento cancelado nao pode receber baixa.';
    END IF;

    IF p_paid_amount IS NULL THEN
        v_next_paid_amount := v_payment.amount;
    ELSE
        v_next_paid_amount := p_paid_amount;
    END IF;

    IF v_next_paid_amount < 0 THEN
        RAISE EXCEPTION 'Valor recebido invalido.';
    END IF;

    -- The UI sends the cumulative paid amount. Never let a stale client reduce it.
    v_next_paid_amount := LEAST(
        v_payment.amount,
        GREATEST(v_next_paid_amount, COALESCE(v_payment.paid_amount, 0))
    );
    v_is_fully_paid := v_next_paid_amount >= v_payment.amount;

    UPDATE public.payments
    SET
        paid = v_is_fully_paid,
        paid_amount = v_next_paid_amount,
        paid_at = CASE WHEN v_next_paid_amount > 0 THEN NOW() ELSE NULL END
    WHERE id = v_payment.id
      AND user_id = v_user_id;

    RETURN jsonb_build_object(
        'success', TRUE,
        'payment_id', v_payment.id,
        'paid', v_is_fully_paid,
        'paid_amount', v_next_paid_amount
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.reopen_payment_atomic(p_payment_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
DECLARE
    v_user_id UUID;
    v_payment RECORD;
    v_found BOOLEAN := FALSE;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario nao autenticado.';
    END IF;

    FOR v_payment IN
        SELECT id, full_price
        FROM public.payments
        WHERE id = p_payment_id
          AND user_id = v_user_id
        FOR UPDATE
    LOOP
        v_found := TRUE;
    END LOOP;

    IF NOT v_found THEN
        RAISE EXCEPTION 'Pagamento nao encontrado.';
    END IF;

    IF COALESCE(v_payment.full_price, 0) = -1 THEN
        RAISE EXCEPTION 'Pagamento cancelado nao pode ser reaberto.';
    END IF;

    UPDATE public.payments
    SET
        paid = FALSE,
        paid_amount = 0,
        paid_at = NULL
    WHERE id = v_payment.id
      AND user_id = v_user_id;

    RETURN jsonb_build_object(
        'success', TRUE,
        'payment_id', v_payment.id,
        'paid', FALSE,
        'paid_amount', 0
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.cancel_payment_atomic(p_payment_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
DECLARE
    v_user_id UUID;
    v_payment RECORD;
    v_found BOOLEAN := FALSE;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario nao autenticado.';
    END IF;

    FOR v_payment IN
        SELECT id, full_price
        FROM public.payments
        WHERE id = p_payment_id
          AND user_id = v_user_id
        FOR UPDATE
    LOOP
        v_found := TRUE;
    END LOOP;

    IF NOT v_found THEN
        RAISE EXCEPTION 'Pagamento nao encontrado.';
    END IF;

    IF COALESCE(v_payment.full_price, 0) = -1 THEN
        RETURN jsonb_build_object(
            'success', TRUE,
            'payment_id', v_payment.id,
            'cancelled', FALSE
        );
    END IF;

    UPDATE public.payments
    SET
        amount = 0,
        paid_amount = 0,
        paid = TRUE,
        paid_at = NULL,
        full_price = -1
    WHERE id = v_payment.id
      AND user_id = v_user_id;

    RETURN jsonb_build_object(
        'success', TRUE,
        'payment_id', v_payment.id,
        'cancelled', TRUE
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.receive_payments_batch_atomic(p_payment_ids UUID[])
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
DECLARE
    v_user_id UUID;
    v_payment_ids UUID[];
    v_requested_count INT;
    v_found_count INT;
    v_updated_count INT := 0;
    v_updated_id UUID;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario nao autenticado.';
    END IF;

    v_payment_ids := ARRAY(
        SELECT DISTINCT payment_id
        FROM unnest(COALESCE(p_payment_ids, ARRAY[]::UUID[])) AS input(payment_id)
        WHERE payment_id IS NOT NULL
    );
    v_requested_count := COALESCE(array_length(v_payment_ids, 1), 0);

    IF v_requested_count = 0 THEN
        RETURN jsonb_build_object('success', TRUE, 'updated_count', 0);
    END IF;

    v_found_count := (
        SELECT COUNT(*)::INT
        FROM public.payments
        WHERE id = ANY(v_payment_ids)
          AND user_id = v_user_id
          AND COALESCE(full_price, 0) <> -1
    );

    IF v_found_count <> v_requested_count THEN
        RAISE EXCEPTION 'Um ou mais pagamentos nao foram encontrados ou estao cancelados.';
    END IF;

    FOR v_updated_id IN
        UPDATE public.payments
        SET
            paid = TRUE,
            paid_amount = amount,
            paid_at = NOW()
        WHERE id = ANY(v_payment_ids)
          AND user_id = v_user_id
          AND COALESCE(full_price, 0) <> -1
        RETURNING id
    LOOP
        v_updated_count := v_updated_count + 1;
    END LOOP;

    RETURN jsonb_build_object('success', TRUE, 'updated_count', v_updated_count);
END;
$function$;

CREATE OR REPLACE FUNCTION public.reopen_payments_batch_atomic(p_payment_ids UUID[])
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
DECLARE
    v_user_id UUID;
    v_payment_ids UUID[];
    v_requested_count INT;
    v_found_count INT;
    v_updated_count INT := 0;
    v_updated_id UUID;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario nao autenticado.';
    END IF;

    v_payment_ids := ARRAY(
        SELECT DISTINCT payment_id
        FROM unnest(COALESCE(p_payment_ids, ARRAY[]::UUID[])) AS input(payment_id)
        WHERE payment_id IS NOT NULL
    );
    v_requested_count := COALESCE(array_length(v_payment_ids, 1), 0);

    IF v_requested_count = 0 THEN
        RETURN jsonb_build_object('success', TRUE, 'updated_count', 0);
    END IF;

    v_found_count := (
        SELECT COUNT(*)::INT
        FROM public.payments
        WHERE id = ANY(v_payment_ids)
          AND user_id = v_user_id
          AND COALESCE(full_price, 0) <> -1
    );

    IF v_found_count <> v_requested_count THEN
        RAISE EXCEPTION 'Um ou mais pagamentos nao foram encontrados ou estao cancelados.';
    END IF;

    FOR v_updated_id IN
        UPDATE public.payments
        SET
            paid = FALSE,
            paid_amount = 0,
            paid_at = NULL
        WHERE id = ANY(v_payment_ids)
          AND user_id = v_user_id
          AND COALESCE(full_price, 0) <> -1
        RETURNING id
    LOOP
        v_updated_count := v_updated_count + 1;
    END LOOP;

    RETURN jsonb_build_object('success', TRUE, 'updated_count', v_updated_count);
END;
$function$;

CREATE OR REPLACE FUNCTION public.cancel_student_open_payments_atomic(p_student_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
DECLARE
    v_user_id UUID;
    v_cancelled_count INT := 0;
    v_updated_id UUID;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario nao autenticado.';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.students
        WHERE id = p_student_id
          AND user_id = v_user_id
    ) THEN
        RAISE EXCEPTION 'Aluno nao encontrado.';
    END IF;

    -- Preserve partial receipts as realized revenue and cancel only the remaining balance.
    FOR v_updated_id IN
        UPDATE public.payments
        SET
            amount = paid_amount,
            paid = TRUE,
            paid_at = COALESCE(paid_at, NOW()),
            full_price = CASE WHEN full_price IS NULL THEN amount ELSE full_price END
        WHERE student_id = p_student_id
          AND user_id = v_user_id
          AND paid = FALSE
          AND paid_amount > 0
          AND COALESCE(full_price, 0) <> -1
        RETURNING id
    LOOP
        v_cancelled_count := v_cancelled_count + 1;
    END LOOP;

    -- Hide open charges without receipts so they are not regenerated automatically.
    FOR v_updated_id IN
        UPDATE public.payments
        SET
            amount = 0,
            paid_amount = 0,
            paid = TRUE,
            paid_at = NULL,
            full_price = -1
        WHERE student_id = p_student_id
          AND user_id = v_user_id
          AND paid = FALSE
          AND COALESCE(paid_amount, 0) = 0
          AND COALESCE(full_price, 0) <> -1
        RETURNING id
    LOOP
        v_cancelled_count := v_cancelled_count + 1;
    END LOOP;

    RETURN v_cancelled_count;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.receive_payment_atomic(UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reopen_payment_atomic(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_payment_atomic(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.receive_payments_batch_atomic(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reopen_payments_batch_atomic(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_student_open_payments_atomic(UUID) TO authenticated;

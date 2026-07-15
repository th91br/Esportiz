-- Phase 6.6: financial audit trail.
-- Adds append-only audit logs for payment and arena reservation financial transitions.

CREATE TABLE IF NOT EXISTS public.financial_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    business_type TEXT NOT NULL CHECK (business_type IN ('sport_school', 'arena')),
    entity_type TEXT NOT NULL CHECK (entity_type IN ('payment', 'arena_reservation')),
    entity_id UUID NOT NULL,
    action TEXT NOT NULL CHECK (
        action IN (
            'payment_received',
            'payment_partially_received',
            'payment_reopened',
            'payment_cancelled',
            'payment_balance_cancelled',
            'arena_reservation_received',
            'arena_reservation_reopened'
        )
    ),
    source TEXT NOT NULL DEFAULT 'rpc',
    previous_state JSONB NOT NULL DEFAULT '{}'::jsonb,
    new_state JSONB NOT NULL DEFAULT '{}'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS financial_audit_logs_user_created_idx
ON public.financial_audit_logs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS financial_audit_logs_entity_idx
ON public.financial_audit_logs (entity_type, entity_id, created_at DESC);

ALTER TABLE public.financial_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own financial audit logs" ON public.financial_audit_logs;

CREATE POLICY "Users can view their own financial audit logs"
ON public.financial_audit_logs
FOR SELECT
USING (auth.uid() = user_id);

REVOKE ALL ON TABLE public.financial_audit_logs FROM PUBLIC;
GRANT SELECT ON TABLE public.financial_audit_logs TO authenticated;

CREATE OR REPLACE FUNCTION public.record_financial_audit_log(
    p_user_id UUID,
    p_business_type TEXT,
    p_entity_type TEXT,
    p_entity_id UUID,
    p_action TEXT,
    p_previous_state JSONB,
    p_new_state JSONB,
    p_source TEXT DEFAULT 'rpc',
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_log_id UUID;
BEGIN
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario da auditoria nao informado.';
    END IF;

    IF p_business_type NOT IN ('sport_school', 'arena') THEN
        RAISE EXCEPTION 'Tipo de negocio invalido para auditoria.';
    END IF;

    IF p_entity_type NOT IN ('payment', 'arena_reservation') THEN
        RAISE EXCEPTION 'Entidade invalida para auditoria.';
    END IF;

    INSERT INTO public.financial_audit_logs (
        user_id,
        business_type,
        entity_type,
        entity_id,
        action,
        source,
        previous_state,
        new_state,
        metadata,
        created_by
    )
    VALUES (
        p_user_id,
        p_business_type,
        p_entity_type,
        p_entity_id,
        p_action,
        COALESCE(NULLIF(p_source, ''), 'rpc'),
        COALESCE(p_previous_state, '{}'::jsonb),
        COALESCE(p_new_state, '{}'::jsonb),
        COALESCE(p_metadata, '{}'::jsonb),
        auth.uid()
    )
    RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.record_financial_audit_log(UUID, TEXT, TEXT, UUID, TEXT, JSONB, JSONB, TEXT, JSONB) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.receive_payment_atomic(
    p_payment_id UUID,
    p_paid_amount NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_user_id UUID;
    v_payment RECORD;
    v_found BOOLEAN := FALSE;
    v_next_paid_amount NUMERIC;
    v_is_fully_paid BOOLEAN;
    v_previous_state JSONB;
    v_new_state JSONB;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario nao autenticado.';
    END IF;

    FOR v_payment IN
        SELECT id, user_id, business_type, student_id, plan_id, month_ref, due_date, amount, paid, paid_amount, paid_at, full_price
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

    v_previous_state := jsonb_build_object(
        'paid', v_payment.paid,
        'paid_amount', COALESCE(v_payment.paid_amount, 0),
        'paid_at', v_payment.paid_at,
        'amount', v_payment.amount,
        'full_price', v_payment.full_price
    );

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

    v_new_state := jsonb_build_object(
        'paid', v_is_fully_paid,
        'paid_amount', v_next_paid_amount,
        'paid_at', CASE WHEN v_next_paid_amount > 0 THEN NOW() ELSE NULL END,
        'amount', v_payment.amount,
        'full_price', v_payment.full_price
    );

    PERFORM public.record_financial_audit_log(
        v_user_id,
        COALESCE(NULLIF(v_payment.business_type, ''), 'sport_school'),
        'payment',
        v_payment.id,
        CASE WHEN v_is_fully_paid THEN 'payment_received' ELSE 'payment_partially_received' END,
        v_previous_state,
        v_new_state,
        'payments',
        jsonb_build_object(
            'student_id', v_payment.student_id,
            'plan_id', v_payment.plan_id,
            'month_ref', v_payment.month_ref,
            'due_date', v_payment.due_date
        )
    );

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
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_user_id UUID;
    v_payment RECORD;
    v_found BOOLEAN := FALSE;
    v_previous_state JSONB;
    v_new_state JSONB;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario nao autenticado.';
    END IF;

    FOR v_payment IN
        SELECT id, user_id, business_type, student_id, plan_id, month_ref, due_date, amount, paid, paid_amount, paid_at, full_price
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

    v_previous_state := jsonb_build_object(
        'paid', v_payment.paid,
        'paid_amount', COALESCE(v_payment.paid_amount, 0),
        'paid_at', v_payment.paid_at,
        'amount', v_payment.amount,
        'full_price', v_payment.full_price
    );

    UPDATE public.payments
    SET
        paid = FALSE,
        paid_amount = 0,
        paid_at = NULL
    WHERE id = v_payment.id
      AND user_id = v_user_id;

    v_new_state := jsonb_build_object(
        'paid', FALSE,
        'paid_amount', 0,
        'paid_at', NULL,
        'amount', v_payment.amount,
        'full_price', v_payment.full_price
    );

    PERFORM public.record_financial_audit_log(
        v_user_id,
        COALESCE(NULLIF(v_payment.business_type, ''), 'sport_school'),
        'payment',
        v_payment.id,
        'payment_reopened',
        v_previous_state,
        v_new_state,
        'payments',
        jsonb_build_object(
            'student_id', v_payment.student_id,
            'plan_id', v_payment.plan_id,
            'month_ref', v_payment.month_ref,
            'due_date', v_payment.due_date
        )
    );

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
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_user_id UUID;
    v_payment RECORD;
    v_found BOOLEAN := FALSE;
    v_previous_state JSONB;
    v_new_state JSONB;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario nao autenticado.';
    END IF;

    FOR v_payment IN
        SELECT id, user_id, business_type, student_id, plan_id, month_ref, due_date, amount, paid, paid_amount, paid_at, full_price
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

    v_previous_state := jsonb_build_object(
        'paid', v_payment.paid,
        'paid_amount', COALESCE(v_payment.paid_amount, 0),
        'paid_at', v_payment.paid_at,
        'amount', v_payment.amount,
        'full_price', v_payment.full_price
    );

    UPDATE public.payments
    SET
        amount = 0,
        paid_amount = 0,
        paid = TRUE,
        paid_at = NULL,
        full_price = -1
    WHERE id = v_payment.id
      AND user_id = v_user_id;

    v_new_state := jsonb_build_object(
        'paid', TRUE,
        'paid_amount', 0,
        'paid_at', NULL,
        'amount', 0,
        'full_price', -1
    );

    PERFORM public.record_financial_audit_log(
        v_user_id,
        COALESCE(NULLIF(v_payment.business_type, ''), 'sport_school'),
        'payment',
        v_payment.id,
        'payment_cancelled',
        v_previous_state,
        v_new_state,
        'payments',
        jsonb_build_object(
            'student_id', v_payment.student_id,
            'plan_id', v_payment.plan_id,
            'month_ref', v_payment.month_ref,
            'due_date', v_payment.due_date
        )
    );

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
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_user_id UUID;
    v_payment_ids UUID[];
    v_requested_count INT;
    v_found_count INT;
    v_updated_count INT := 0;
    v_payment_id UUID;
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

    FOREACH v_payment_id IN ARRAY v_payment_ids
    LOOP
        PERFORM public.receive_payment_atomic(v_payment_id, NULL);
        v_updated_count := v_updated_count + 1;
    END LOOP;

    RETURN jsonb_build_object('success', TRUE, 'updated_count', v_updated_count);
END;
$function$;

CREATE OR REPLACE FUNCTION public.reopen_payments_batch_atomic(p_payment_ids UUID[])
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_user_id UUID;
    v_payment_ids UUID[];
    v_requested_count INT;
    v_found_count INT;
    v_updated_count INT := 0;
    v_payment_id UUID;
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

    FOREACH v_payment_id IN ARRAY v_payment_ids
    LOOP
        PERFORM public.reopen_payment_atomic(v_payment_id);
        v_updated_count := v_updated_count + 1;
    END LOOP;

    RETURN jsonb_build_object('success', TRUE, 'updated_count', v_updated_count);
END;
$function$;

CREATE OR REPLACE FUNCTION public.cancel_student_open_payments_atomic(p_student_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_user_id UUID;
    v_cancelled_count INT := 0;
    v_payment RECORD;
    v_previous_state JSONB;
    v_new_state JSONB;
    v_paid_at TIMESTAMPTZ;
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
    FOR v_payment IN
        SELECT id, user_id, business_type, student_id, plan_id, month_ref, due_date, amount, paid, paid_amount, paid_at, full_price
        FROM public.payments
        WHERE student_id = p_student_id
          AND user_id = v_user_id
          AND paid = FALSE
          AND paid_amount > 0
          AND COALESCE(full_price, 0) <> -1
        FOR UPDATE
    LOOP
        v_paid_at := COALESCE(v_payment.paid_at, NOW());
        v_previous_state := jsonb_build_object(
            'paid', v_payment.paid,
            'paid_amount', COALESCE(v_payment.paid_amount, 0),
            'paid_at', v_payment.paid_at,
            'amount', v_payment.amount,
            'full_price', v_payment.full_price
        );

        UPDATE public.payments
        SET
            amount = paid_amount,
            paid = TRUE,
            paid_at = v_paid_at,
            full_price = CASE WHEN full_price IS NULL THEN amount ELSE full_price END
        WHERE id = v_payment.id
          AND user_id = v_user_id;

        v_new_state := jsonb_build_object(
            'paid', TRUE,
            'paid_amount', COALESCE(v_payment.paid_amount, 0),
            'paid_at', v_paid_at,
            'amount', COALESCE(v_payment.paid_amount, 0),
            'full_price', COALESCE(v_payment.full_price, v_payment.amount)
        );

        PERFORM public.record_financial_audit_log(
            v_user_id,
            COALESCE(NULLIF(v_payment.business_type, ''), 'sport_school'),
            'payment',
            v_payment.id,
            'payment_balance_cancelled',
            v_previous_state,
            v_new_state,
            'student_deactivation',
            jsonb_build_object(
                'student_id', v_payment.student_id,
                'plan_id', v_payment.plan_id,
                'month_ref', v_payment.month_ref,
                'due_date', v_payment.due_date
            )
        );

        v_cancelled_count := v_cancelled_count + 1;
    END LOOP;

    -- Hide open charges without receipts so they are not regenerated automatically.
    FOR v_payment IN
        SELECT id, user_id, business_type, student_id, plan_id, month_ref, due_date, amount, paid, paid_amount, paid_at, full_price
        FROM public.payments
        WHERE student_id = p_student_id
          AND user_id = v_user_id
          AND paid = FALSE
          AND COALESCE(paid_amount, 0) = 0
          AND COALESCE(full_price, 0) <> -1
        FOR UPDATE
    LOOP
        v_previous_state := jsonb_build_object(
            'paid', v_payment.paid,
            'paid_amount', COALESCE(v_payment.paid_amount, 0),
            'paid_at', v_payment.paid_at,
            'amount', v_payment.amount,
            'full_price', v_payment.full_price
        );

        UPDATE public.payments
        SET
            amount = 0,
            paid_amount = 0,
            paid = TRUE,
            paid_at = NULL,
            full_price = -1
        WHERE id = v_payment.id
          AND user_id = v_user_id;

        v_new_state := jsonb_build_object(
            'paid', TRUE,
            'paid_amount', 0,
            'paid_at', NULL,
            'amount', 0,
            'full_price', -1
        );

        PERFORM public.record_financial_audit_log(
            v_user_id,
            COALESCE(NULLIF(v_payment.business_type, ''), 'sport_school'),
            'payment',
            v_payment.id,
            'payment_cancelled',
            v_previous_state,
            v_new_state,
            'student_deactivation',
            jsonb_build_object(
                'student_id', v_payment.student_id,
                'plan_id', v_payment.plan_id,
                'month_ref', v_payment.month_ref,
                'due_date', v_payment.due_date
            )
        );

        v_cancelled_count := v_cancelled_count + 1;
    END LOOP;

    RETURN v_cancelled_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_arena_reservation_payment_status_atomic(
    p_reservation_id UUID,
    p_payment_status TEXT,
    p_payment_method TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_user_id UUID;
    v_training RECORD;
    v_found BOOLEAN := FALSE;
    v_meta JSONB;
    v_previous_state JSONB;
    v_new_state JSONB;
    v_payment_method TEXT;
    v_final_price NUMERIC;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario nao autenticado.';
    END IF;

    IF p_payment_status NOT IN ('paid', 'pending') THEN
        RAISE EXCEPTION 'Status de pagamento invalido.';
    END IF;

    IF p_payment_method IS NOT NULL
       AND p_payment_method NOT IN ('pix', 'cartao', 'dinheiro', 'a_receber')
    THEN
        RAISE EXCEPTION 'Metodo de pagamento invalido.';
    END IF;

    FOR v_training IN
        SELECT id, metadata
        FROM public.trainings
        WHERE id = p_reservation_id
          AND user_id = v_user_id
          AND business_type = 'arena'
        FOR UPDATE
    LOOP
        v_found := TRUE;
    END LOOP;

    IF NOT v_found THEN
        RAISE EXCEPTION 'Reserva nao encontrada.';
    END IF;

    v_meta := COALESCE(v_training.metadata::jsonb, '{}'::jsonb);

    IF COALESCE(v_meta->>'reservationType', 'avulsa') = 'blocked' THEN
        RAISE EXCEPTION 'Bloqueio de quadra nao possui baixa financeira.';
    END IF;

    IF COALESCE(v_meta->>'status', 'confirmed') = 'cancelled' THEN
        RAISE EXCEPTION 'Reserva cancelada nao pode ter pagamento alterado.';
    END IF;

    IF COALESCE(v_meta->>'finalPrice', '') ~ '^[0-9]+(\.[0-9]+)?$' THEN
        v_final_price := GREATEST((v_meta->>'finalPrice')::NUMERIC, 0);
    ELSE
        v_final_price := 0;
    END IF;

    v_previous_state := jsonb_build_object(
        'paymentStatus', COALESCE(v_meta->>'paymentStatus', 'pending'),
        'paymentMethod', COALESCE(v_meta->>'paymentMethod', 'pix'),
        'paymentUpdatedAt', v_meta->>'paymentUpdatedAt',
        'paymentPaidAt', v_meta->>'paymentPaidAt',
        'finalPrice', v_final_price
    );

    v_payment_method := COALESCE(NULLIF(p_payment_method, ''), NULLIF(v_meta->>'paymentMethod', ''), 'pix');
    IF v_payment_method NOT IN ('pix', 'cartao', 'dinheiro', 'a_receber') THEN
        v_payment_method := 'pix';
    END IF;

    IF p_payment_status = 'paid' AND v_payment_method = 'a_receber' THEN
        v_payment_method := 'pix';
    END IF;

    IF v_final_price = 0 THEN
        p_payment_status := 'paid';
    END IF;

    v_meta := jsonb_set(v_meta, '{paymentStatus}', to_jsonb(p_payment_status), TRUE);
    v_meta := jsonb_set(v_meta, '{paymentMethod}', to_jsonb(v_payment_method), TRUE);
    v_meta := jsonb_set(v_meta, '{paymentUpdatedAt}', to_jsonb(NOW()::TEXT), TRUE);

    IF p_payment_status = 'paid' THEN
        v_meta := jsonb_set(v_meta, '{paymentPaidAt}', to_jsonb(NOW()::TEXT), TRUE);
    ELSE
        v_meta := v_meta - 'paymentPaidAt';
    END IF;

    v_new_state := jsonb_build_object(
        'paymentStatus', p_payment_status,
        'paymentMethod', v_payment_method,
        'paymentUpdatedAt', v_meta->>'paymentUpdatedAt',
        'paymentPaidAt', v_meta->>'paymentPaidAt',
        'finalPrice', v_final_price
    );

    PERFORM set_config('app.allow_arena_payment_status_update', 'on', TRUE);

    UPDATE public.trainings
    SET
        metadata = v_meta,
        updated_at = NOW()
    WHERE id = p_reservation_id
      AND user_id = v_user_id
      AND business_type = 'arena';

    PERFORM public.record_financial_audit_log(
        v_user_id,
        'arena',
        'arena_reservation',
        p_reservation_id,
        CASE WHEN p_payment_status = 'paid' THEN 'arena_reservation_received' ELSE 'arena_reservation_reopened' END,
        v_previous_state,
        v_new_state,
        'arena_reservations',
        jsonb_build_object(
            'reservation_type', COALESCE(v_meta->>'reservationType', 'avulsa'),
            'reservation_status', COALESCE(v_meta->>'status', 'confirmed')
        )
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'reservation_id', p_reservation_id,
        'paymentStatus', p_payment_status,
        'paymentMethod', v_payment_method,
        'finalPrice', v_final_price
    );
END;
$function$;

REVOKE ALL ON FUNCTION public.receive_payment_atomic(UUID, NUMERIC) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reopen_payment_atomic(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_payment_atomic(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.receive_payments_batch_atomic(UUID[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reopen_payments_batch_atomic(UUID[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_student_open_payments_atomic(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_arena_reservation_payment_status_atomic(UUID, TEXT, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.receive_payment_atomic(UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reopen_payment_atomic(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_payment_atomic(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.receive_payments_batch_atomic(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reopen_payments_batch_atomic(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_student_open_payments_atomic(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_arena_reservation_payment_status_atomic(UUID, TEXT, TEXT) TO authenticated;

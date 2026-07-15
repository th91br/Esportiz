-- Phase 2.12.4: organization-aware Arena reservation financial RPCs.
-- Safe, compatible migration:
-- - Keeps the same RPC signatures currently used by the frontend.
-- - Preserves owner-user behavior.
-- - Adds organization/member authorization for future team roles.
-- - Keeps the payment guard, partial payments, debit/credit methods, and audit trail.
-- - Does not alter tables and does not modify existing data by itself.

CREATE OR REPLACE FUNCTION public.set_arena_reservation_payment_status_atomic(
    p_reservation_id UUID,
    p_payment_status TEXT,
    p_payment_method TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $phase2124_set_arena_reservation_payment$
DECLARE
    v_training RECORD;
    v_found BOOLEAN := FALSE;
    v_meta JSONB;
    v_previous_state JSONB;
    v_new_state JSONB;
    v_payment_method TEXT;
    v_final_price NUMERIC;
    v_allowed_roles TEXT[];
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Usuario nao autenticado.';
    END IF;

    IF p_payment_status NOT IN ('paid', 'pending') THEN
        RAISE EXCEPTION 'Status de pagamento invalido.';
    END IF;

    IF p_payment_method IS NOT NULL
       AND p_payment_method NOT IN ('pix', 'cartao', 'cartao_debito', 'cartao_credito', 'dinheiro', 'a_receber')
    THEN
        RAISE EXCEPTION 'Metodo de pagamento invalido.';
    END IF;

    FOR v_training IN
        SELECT id, user_id, organization_id, metadata
        FROM public.trainings
        WHERE id = p_reservation_id
          AND business_type = 'arena'
        FOR UPDATE
    LOOP
        v_found := TRUE;
    END LOOP;

    IF NOT v_found THEN
        RAISE EXCEPTION 'Reserva nao encontrada.';
    END IF;

    v_allowed_roles := CASE
        WHEN p_payment_status = 'paid' THEN ARRAY['owner', 'manager', 'receptionist']
        ELSE ARRAY['owner', 'manager']
    END;

    IF NOT (
        public.can_access_organization_financials(v_training.organization_id, v_allowed_roles)
        OR public.can_access_owner_user_data(v_training.user_id, v_allowed_roles)
    ) THEN
        RAISE EXCEPTION 'Usuario nao autorizado.';
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
        'finalPrice', v_final_price,
        'partialPayments', COALESCE(v_meta->'partialPayments', '[]'::jsonb)
    );

    v_payment_method := COALESCE(NULLIF(p_payment_method, ''), NULLIF(v_meta->>'paymentMethod', ''), 'pix');
    IF v_payment_method NOT IN ('pix', 'cartao', 'cartao_debito', 'cartao_credito', 'dinheiro', 'a_receber') THEN
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
        v_meta := jsonb_set(v_meta, '{partialPayments}', '[]'::jsonb, TRUE);
    END IF;

    v_new_state := jsonb_build_object(
        'paymentStatus', p_payment_status,
        'paymentMethod', v_payment_method,
        'paymentUpdatedAt', v_meta->>'paymentUpdatedAt',
        'paymentPaidAt', v_meta->>'paymentPaidAt',
        'finalPrice', v_final_price,
        'partialPayments', COALESCE(v_meta->'partialPayments', '[]'::jsonb)
    );

    PERFORM set_config('app.allow_arena_payment_status_update', 'on', TRUE);

    UPDATE public.trainings
    SET
        metadata = v_meta,
        updated_at = NOW()
    WHERE id = p_reservation_id
      AND user_id = v_training.user_id
      AND business_type = 'arena';

    PERFORM public.record_financial_audit_log(
        v_training.user_id,
        'arena',
        'arena_reservation',
        p_reservation_id,
        CASE WHEN p_payment_status = 'paid' THEN 'arena_reservation_received' ELSE 'arena_reservation_reopened' END,
        v_previous_state,
        v_new_state,
        'arena_reservations',
        jsonb_build_object(
            'reservation_type', COALESCE(v_meta->>'reservationType', 'avulsa'),
            'reservation_status', COALESCE(v_meta->>'status', 'confirmed'),
            'organization_id', v_training.organization_id
        )
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'reservation_id', p_reservation_id,
        'paymentStatus', p_payment_status,
        'paymentMethod', v_payment_method,
        'finalPrice', v_final_price,
        'partialPayments', COALESCE(v_meta->'partialPayments', '[]'::jsonb)
    );
END;
$phase2124_set_arena_reservation_payment$;

CREATE OR REPLACE FUNCTION public.add_arena_partial_payment_atomic(
    p_reservation_id UUID,
    p_amount NUMERIC,
    p_method TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $phase2124_add_arena_partial_payment$
DECLARE
    v_training RECORD;
    v_found BOOLEAN := FALSE;
    v_meta JSONB;
    v_partial_payments JSONB;
    v_new_payment JSONB;
    v_total_paid NUMERIC := 0;
    v_final_price NUMERIC := 0;
    v_payment_status TEXT;
    v_previous_state JSONB;
    v_new_state JSONB;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Usuario nao autenticado.';
    END IF;

    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Valor do pagamento deve ser maior que zero.';
    END IF;

    IF p_method NOT IN ('pix', 'cartao', 'cartao_debito', 'cartao_credito', 'dinheiro') THEN
        RAISE EXCEPTION 'Metodo de pagamento invalido.';
    END IF;

    FOR v_training IN
        SELECT id, user_id, organization_id, metadata
        FROM public.trainings
        WHERE id = p_reservation_id
          AND business_type = 'arena'
        FOR UPDATE
    LOOP
        v_found := TRUE;
    END LOOP;

    IF NOT v_found THEN
        RAISE EXCEPTION 'Reserva nao encontrada.';
    END IF;

    IF NOT (
        public.can_access_organization_financials(v_training.organization_id, ARRAY['owner', 'manager', 'receptionist'])
        OR public.can_access_owner_user_data(v_training.user_id, ARRAY['owner', 'manager', 'receptionist'])
    ) THEN
        RAISE EXCEPTION 'Usuario nao autorizado.';
    END IF;

    v_meta := COALESCE(v_training.metadata::jsonb, '{}'::jsonb);

    IF COALESCE(v_meta->>'reservationType', 'avulsa') = 'blocked' THEN
        RAISE EXCEPTION 'Bloqueio de quadra nao possui baixa financeira.';
    END IF;

    IF COALESCE(v_meta->>'status', 'confirmed') = 'cancelled' THEN
        RAISE EXCEPTION 'Reserva cancelada nao pode receber pagamentos.';
    END IF;

    IF COALESCE(v_meta->>'finalPrice', '') ~ '^[0-9]+(\.[0-9]+)?$' THEN
        v_final_price := GREATEST((v_meta->>'finalPrice')::NUMERIC, 0);
    END IF;

    IF v_final_price = 0 THEN
        RAISE EXCEPTION 'Reserva com valor zero nao requer pagamento parcial.';
    END IF;

    v_partial_payments := COALESCE(v_meta->'partialPayments', '[]'::jsonb);

    SELECT COALESCE(SUM((val->>'amount')::NUMERIC), 0)
    INTO v_total_paid
    FROM jsonb_array_elements(v_partial_payments) AS val;

    IF v_total_paid + p_amount > v_final_price THEN
        RAISE EXCEPTION 'Valor ultrapassa o saldo devedor restante.';
    END IF;

    v_new_payment := jsonb_build_object(
        'id', gen_random_uuid(),
        'amount', p_amount,
        'method', p_method,
        'date', NOW()::TEXT
    );

    v_partial_payments := v_partial_payments || v_new_payment;
    v_total_paid := v_total_paid + p_amount;

    v_payment_status := CASE WHEN v_total_paid >= v_final_price THEN 'paid' ELSE 'pending' END;

    v_previous_state := jsonb_build_object(
        'paymentStatus', COALESCE(v_meta->>'paymentStatus', 'pending'),
        'paymentMethod', COALESCE(v_meta->>'paymentMethod', 'pix'),
        'paymentUpdatedAt', v_meta->>'paymentUpdatedAt',
        'paymentPaidAt', v_meta->>'paymentPaidAt',
        'finalPrice', v_final_price,
        'partialPayments', COALESCE(v_meta->'partialPayments', '[]'::jsonb)
    );

    v_meta := jsonb_set(v_meta, '{partialPayments}', v_partial_payments, TRUE);
    v_meta := jsonb_set(v_meta, '{paymentStatus}', to_jsonb(v_payment_status), TRUE);
    v_meta := jsonb_set(v_meta, '{paymentMethod}', to_jsonb(p_method), TRUE);
    v_meta := jsonb_set(v_meta, '{paymentUpdatedAt}', to_jsonb(NOW()::TEXT), TRUE);

    IF v_payment_status = 'paid' THEN
        v_meta := jsonb_set(v_meta, '{paymentPaidAt}', to_jsonb(NOW()::TEXT), TRUE);
    END IF;

    v_new_state := jsonb_build_object(
        'paymentStatus', v_payment_status,
        'paymentMethod', p_method,
        'paymentUpdatedAt', v_meta->>'paymentUpdatedAt',
        'paymentPaidAt', v_meta->>'paymentPaidAt',
        'finalPrice', v_final_price,
        'partialPayments', v_partial_payments
    );

    PERFORM set_config('app.allow_arena_payment_status_update', 'on', TRUE);

    UPDATE public.trainings
    SET
        metadata = v_meta,
        updated_at = NOW()
    WHERE id = p_reservation_id
      AND user_id = v_training.user_id
      AND business_type = 'arena';

    PERFORM public.record_financial_audit_log(
        v_training.user_id,
        'arena',
        'arena_reservation',
        p_reservation_id,
        CASE WHEN v_payment_status = 'paid' THEN 'arena_reservation_received' ELSE 'payment_partially_received' END,
        v_previous_state,
        v_new_state,
        'arena_reservations_partial',
        jsonb_build_object(
            'reservation_type', COALESCE(v_meta->>'reservationType', 'avulsa'),
            'reservation_status', COALESCE(v_meta->>'status', 'confirmed'),
            'added_amount', p_amount,
            'organization_id', v_training.organization_id
        )
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'reservation_id', p_reservation_id,
        'paymentStatus', v_payment_status,
        'totalPaid', v_total_paid,
        'remainingBalance', v_final_price - v_total_paid
    );
END;
$phase2124_add_arena_partial_payment$;

REVOKE ALL ON FUNCTION public.set_arena_reservation_payment_status_atomic(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.add_arena_partial_payment_atomic(UUID, NUMERIC, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.set_arena_reservation_payment_status_atomic(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_arena_partial_payment_atomic(UUID, NUMERIC, TEXT) TO authenticated;

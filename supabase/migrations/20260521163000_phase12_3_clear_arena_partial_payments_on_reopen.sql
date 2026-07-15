-- Phase 12.3: keep Arena reservation reopen/chargeback financially consistent.
-- When a paid reservation is reopened as pending, clear partial payment ledger too.

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
        'finalPrice', v_final_price,
        'partialPayments', COALESCE(v_meta->'partialPayments', '[]'::jsonb)
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
        'finalPrice', v_final_price,
        'partialPayments', COALESCE(v_meta->'partialPayments', '[]'::jsonb)
    );
END;
$function$;

REVOKE ALL ON FUNCTION public.set_arena_reservation_payment_status_atomic(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_arena_reservation_payment_status_atomic(UUID, TEXT, TEXT) TO authenticated;

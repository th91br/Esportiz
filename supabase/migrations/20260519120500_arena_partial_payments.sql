-- Adds support for partial payments (Rachadinha) in Arena reservations

CREATE OR REPLACE FUNCTION public.add_arena_partial_payment_atomic(
    p_reservation_id UUID,
    p_amount NUMERIC,
    p_method TEXT
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
    v_partial_payments JSONB;
    v_new_payment JSONB;
    v_total_paid NUMERIC := 0;
    v_final_price NUMERIC := 0;
    v_payment_status TEXT;
    v_previous_state JSONB;
    v_new_state JSONB;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario nao autenticado.';
    END IF;

    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Valor do pagamento deve ser maior que zero.';
    END IF;

    IF p_method NOT IN ('pix', 'cartao', 'dinheiro', 'a_receber') THEN
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
    
    -- Calculate current total paid
    SELECT COALESCE(SUM((val->>'amount')::NUMERIC), 0)
    INTO v_total_paid
    FROM jsonb_array_elements(v_partial_payments) AS val;

    IF v_total_paid + p_amount > v_final_price THEN
        RAISE EXCEPTION 'Valor ultrapassa o saldo devedor restante.';
    END IF;

    -- Create new payment object
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
    v_meta := jsonb_set(v_meta, '{paymentMethod}', to_jsonb(p_method), TRUE); -- Update primary method to last method used
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
      AND user_id = v_user_id
      AND business_type = 'arena';

    -- Audit log is important
    PERFORM public.record_financial_audit_log(
        v_user_id,
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
            'added_amount', p_amount
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
$function$;

REVOKE ALL ON FUNCTION public.add_arena_partial_payment_atomic(UUID, NUMERIC, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_arena_partial_payment_atomic(UUID, NUMERIC, TEXT) TO authenticated;

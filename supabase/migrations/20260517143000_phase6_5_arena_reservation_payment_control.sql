-- Phase 6.5: harden arena reservation payment transitions.
-- Keeps reservation scheduling intact while centralizing payment status updates.

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

    PERFORM set_config('app.allow_arena_payment_status_update', 'on', TRUE);

    UPDATE public.trainings
    SET
        metadata = v_meta,
        updated_at = NOW()
    WHERE id = p_reservation_id
      AND user_id = v_user_id
      AND business_type = 'arena';

    RETURN jsonb_build_object(
        'success', TRUE,
        'reservation_id', p_reservation_id,
        'paymentStatus', p_payment_status,
        'paymentMethod', v_payment_method,
        'finalPrice', v_final_price
    );
END;
$function$;

REVOKE ALL ON FUNCTION public.set_arena_reservation_payment_status_atomic(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_arena_reservation_payment_status_atomic(UUID, TEXT, TEXT) TO authenticated;

UPDATE public.trainings
SET
    metadata = jsonb_set(COALESCE(metadata::jsonb, '{}'::jsonb), '{reservationType}', to_jsonb('avulsa'::TEXT), TRUE),
    updated_at = NOW()
WHERE business_type = 'arena'
  AND COALESCE(metadata::jsonb->>'reservationType', '') = 'experimental';

CREATE OR REPLACE FUNCTION public.guard_arena_reservation_payment_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_old_meta JSONB := COALESCE(OLD.metadata::jsonb, '{}'::jsonb);
    v_new_meta JSONB := COALESCE(NEW.metadata::jsonb, '{}'::jsonb);
    v_allowed BOOLEAN := COALESCE(current_setting('app.allow_arena_payment_status_update', TRUE), '') = 'on';
    v_new_final_price NUMERIC := 0;
BEGIN
    IF COALESCE(OLD.business_type, '') <> 'arena'
       OR COALESCE(NEW.business_type, '') <> 'arena'
    THEN
        RETURN NEW;
    END IF;

    IF v_allowed THEN
        RETURN NEW;
    END IF;

    IF COALESCE(v_new_meta->>'finalPrice', '') ~ '^[0-9]+(\.[0-9]+)?$' THEN
        v_new_final_price := GREATEST((v_new_meta->>'finalPrice')::NUMERIC, 0);
    END IF;

    IF COALESCE(v_new_meta->>'reservationType', 'avulsa') = 'blocked'
       OR v_new_final_price = 0
    THEN
        RETURN NEW;
    END IF;

    IF COALESCE(v_old_meta->>'paymentStatus', 'pending') IS DISTINCT FROM COALESCE(v_new_meta->>'paymentStatus', 'pending')
       OR COALESCE(v_old_meta->>'paymentMethod', 'pix') IS DISTINCT FROM COALESCE(v_new_meta->>'paymentMethod', 'pix')
       OR COALESCE(v_old_meta->>'paymentUpdatedAt', '') IS DISTINCT FROM COALESCE(v_new_meta->>'paymentUpdatedAt', '')
       OR COALESCE(v_old_meta->>'paymentPaidAt', '') IS DISTINCT FROM COALESCE(v_new_meta->>'paymentPaidAt', '')
    THEN
        RAISE EXCEPTION 'Use set_arena_reservation_payment_status_atomic para alterar pagamento de reservas.';
    END IF;

    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS guard_arena_reservation_payment_fields_trigger ON public.trainings;

CREATE TRIGGER guard_arena_reservation_payment_fields_trigger
BEFORE UPDATE OF metadata ON public.trainings
FOR EACH ROW
EXECUTE FUNCTION public.guard_arena_reservation_payment_fields();

REVOKE ALL ON FUNCTION public.guard_arena_reservation_payment_fields() FROM PUBLIC;

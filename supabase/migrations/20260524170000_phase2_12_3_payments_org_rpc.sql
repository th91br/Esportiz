-- Phase 2.12.3: organization-aware payment RPCs.
-- Safe, compatible migration:
-- - Keeps all RPC signatures currently used by the frontend.
-- - Preserves owner-user behavior.
-- - Adds organization/member authorization for future team roles.
-- - Keeps financial audit logs under the owner user_id and created_by = auth.uid().
-- - Does not alter tables and does not modify existing data by itself.

CREATE OR REPLACE FUNCTION public.receive_payment_atomic(
    p_payment_id UUID,
    p_paid_amount NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $phase2123_receive_payment$
DECLARE
    v_payment RECORD;
    v_found BOOLEAN := FALSE;
    v_next_paid_amount NUMERIC;
    v_is_fully_paid BOOLEAN;
    v_previous_state JSONB;
    v_new_state JSONB;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Usuario nao autenticado.';
    END IF;

    FOR v_payment IN
        SELECT
            id,
            user_id,
            organization_id,
            business_type,
            student_id,
            plan_id,
            month_ref,
            due_date,
            amount,
            paid,
            paid_amount,
            paid_at,
            full_price
        FROM public.payments
        WHERE id = p_payment_id
        FOR UPDATE
    LOOP
        v_found := TRUE;
    END LOOP;

    IF NOT v_found THEN
        RAISE EXCEPTION 'Pagamento nao encontrado.';
    END IF;

    IF NOT (
        public.can_access_organization_financials(v_payment.organization_id, ARRAY['owner', 'manager', 'receptionist'])
        OR public.can_access_owner_user_data(v_payment.user_id, ARRAY['owner', 'manager', 'receptionist'])
    ) THEN
        RAISE EXCEPTION 'Usuario nao autorizado.';
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
      AND user_id = v_payment.user_id;

    v_new_state := jsonb_build_object(
        'paid', v_is_fully_paid,
        'paid_amount', v_next_paid_amount,
        'paid_at', CASE WHEN v_next_paid_amount > 0 THEN NOW() ELSE NULL END,
        'amount', v_payment.amount,
        'full_price', v_payment.full_price
    );

    PERFORM public.record_financial_audit_log(
        v_payment.user_id,
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
            'due_date', v_payment.due_date,
            'organization_id', v_payment.organization_id
        )
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'payment_id', v_payment.id,
        'paid', v_is_fully_paid,
        'paid_amount', v_next_paid_amount
    );
END;
$phase2123_receive_payment$;

CREATE OR REPLACE FUNCTION public.reopen_payment_atomic(p_payment_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $phase2123_reopen_payment$
DECLARE
    v_payment RECORD;
    v_found BOOLEAN := FALSE;
    v_previous_state JSONB;
    v_new_state JSONB;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Usuario nao autenticado.';
    END IF;

    FOR v_payment IN
        SELECT
            id,
            user_id,
            organization_id,
            business_type,
            student_id,
            plan_id,
            month_ref,
            due_date,
            amount,
            paid,
            paid_amount,
            paid_at,
            full_price
        FROM public.payments
        WHERE id = p_payment_id
        FOR UPDATE
    LOOP
        v_found := TRUE;
    END LOOP;

    IF NOT v_found THEN
        RAISE EXCEPTION 'Pagamento nao encontrado.';
    END IF;

    IF NOT (
        public.can_access_organization_financials(v_payment.organization_id, ARRAY['owner', 'manager'])
        OR public.can_access_owner_user_data(v_payment.user_id, ARRAY['owner', 'manager'])
    ) THEN
        RAISE EXCEPTION 'Usuario nao autorizado.';
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
      AND user_id = v_payment.user_id;

    v_new_state := jsonb_build_object(
        'paid', FALSE,
        'paid_amount', 0,
        'paid_at', NULL,
        'amount', v_payment.amount,
        'full_price', v_payment.full_price
    );

    PERFORM public.record_financial_audit_log(
        v_payment.user_id,
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
            'due_date', v_payment.due_date,
            'organization_id', v_payment.organization_id
        )
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'payment_id', v_payment.id,
        'paid', FALSE,
        'paid_amount', 0
    );
END;
$phase2123_reopen_payment$;

CREATE OR REPLACE FUNCTION public.cancel_payment_atomic(p_payment_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $phase2123_cancel_payment$
DECLARE
    v_payment RECORD;
    v_found BOOLEAN := FALSE;
    v_previous_state JSONB;
    v_new_state JSONB;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Usuario nao autenticado.';
    END IF;

    FOR v_payment IN
        SELECT
            id,
            user_id,
            organization_id,
            business_type,
            student_id,
            plan_id,
            month_ref,
            due_date,
            amount,
            paid,
            paid_amount,
            paid_at,
            full_price
        FROM public.payments
        WHERE id = p_payment_id
        FOR UPDATE
    LOOP
        v_found := TRUE;
    END LOOP;

    IF NOT v_found THEN
        RAISE EXCEPTION 'Pagamento nao encontrado.';
    END IF;

    IF NOT (
        public.can_access_organization_financials(v_payment.organization_id, ARRAY['owner', 'manager'])
        OR public.can_access_owner_user_data(v_payment.user_id, ARRAY['owner', 'manager'])
    ) THEN
        RAISE EXCEPTION 'Usuario nao autorizado.';
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
      AND user_id = v_payment.user_id;

    v_new_state := jsonb_build_object(
        'paid', TRUE,
        'paid_amount', 0,
        'paid_at', NULL,
        'amount', 0,
        'full_price', -1
    );

    PERFORM public.record_financial_audit_log(
        v_payment.user_id,
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
            'due_date', v_payment.due_date,
            'organization_id', v_payment.organization_id
        )
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'payment_id', v_payment.id,
        'cancelled', TRUE
    );
END;
$phase2123_cancel_payment$;

CREATE OR REPLACE FUNCTION public.receive_payments_batch_atomic(p_payment_ids UUID[])
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $phase2123_receive_batch$
DECLARE
    v_payment_ids UUID[];
    v_requested_count INT;
    v_found_count INT;
    v_updated_count INT := 0;
    v_payment_id UUID;
BEGIN
    IF auth.uid() IS NULL THEN
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
        FROM public.payments p
        WHERE p.id = ANY(v_payment_ids)
          AND COALESCE(p.full_price, 0) <> -1
          AND (
              public.can_access_organization_financials(p.organization_id, ARRAY['owner', 'manager', 'receptionist'])
              OR public.can_access_owner_user_data(p.user_id, ARRAY['owner', 'manager', 'receptionist'])
          )
    );

    IF v_found_count <> v_requested_count THEN
        RAISE EXCEPTION 'Um ou mais pagamentos nao foram encontrados, nao autorizados ou estao cancelados.';
    END IF;

    FOREACH v_payment_id IN ARRAY v_payment_ids
    LOOP
        PERFORM public.receive_payment_atomic(v_payment_id, NULL);
        v_updated_count := v_updated_count + 1;
    END LOOP;

    RETURN jsonb_build_object('success', TRUE, 'updated_count', v_updated_count);
END;
$phase2123_receive_batch$;

CREATE OR REPLACE FUNCTION public.reopen_payments_batch_atomic(p_payment_ids UUID[])
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $phase2123_reopen_batch$
DECLARE
    v_payment_ids UUID[];
    v_requested_count INT;
    v_found_count INT;
    v_updated_count INT := 0;
    v_payment_id UUID;
BEGIN
    IF auth.uid() IS NULL THEN
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
        FROM public.payments p
        WHERE p.id = ANY(v_payment_ids)
          AND COALESCE(p.full_price, 0) <> -1
          AND (
              public.can_access_organization_financials(p.organization_id, ARRAY['owner', 'manager'])
              OR public.can_access_owner_user_data(p.user_id, ARRAY['owner', 'manager'])
          )
    );

    IF v_found_count <> v_requested_count THEN
        RAISE EXCEPTION 'Um ou mais pagamentos nao foram encontrados, nao autorizados ou estao cancelados.';
    END IF;

    FOREACH v_payment_id IN ARRAY v_payment_ids
    LOOP
        PERFORM public.reopen_payment_atomic(v_payment_id);
        v_updated_count := v_updated_count + 1;
    END LOOP;

    RETURN jsonb_build_object('success', TRUE, 'updated_count', v_updated_count);
END;
$phase2123_reopen_batch$;

CREATE OR REPLACE FUNCTION public.cancel_student_open_payments_atomic(p_student_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $phase2123_cancel_student_payments$
DECLARE
    v_student RECORD;
    v_cancelled_count INT := 0;
    v_payment RECORD;
    v_previous_state JSONB;
    v_new_state JSONB;
    v_paid_at TIMESTAMPTZ;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Usuario nao autenticado.';
    END IF;

    SELECT id, user_id, organization_id
    INTO v_student
    FROM public.students
    WHERE id = p_student_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Aluno nao encontrado.';
    END IF;

    IF NOT (
        public.can_access_organization_financials(v_student.organization_id, ARRAY['owner', 'manager'])
        OR public.can_access_owner_user_data(v_student.user_id, ARRAY['owner', 'manager'])
    ) THEN
        RAISE EXCEPTION 'Usuario nao autorizado.';
    END IF;

    -- Preserve partial receipts as realized revenue and cancel only the remaining balance.
    FOR v_payment IN
        SELECT
            id,
            user_id,
            organization_id,
            business_type,
            student_id,
            plan_id,
            month_ref,
            due_date,
            amount,
            paid,
            paid_amount,
            paid_at,
            full_price
        FROM public.payments
        WHERE student_id = p_student_id
          AND user_id = v_student.user_id
          AND organization_id = v_student.organization_id
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
          AND user_id = v_payment.user_id;

        v_new_state := jsonb_build_object(
            'paid', TRUE,
            'paid_amount', COALESCE(v_payment.paid_amount, 0),
            'paid_at', v_paid_at,
            'amount', COALESCE(v_payment.paid_amount, 0),
            'full_price', COALESCE(v_payment.full_price, v_payment.amount)
        );

        PERFORM public.record_financial_audit_log(
            v_payment.user_id,
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
                'due_date', v_payment.due_date,
                'organization_id', v_payment.organization_id
            )
        );

        v_cancelled_count := v_cancelled_count + 1;
    END LOOP;

    -- Hide open charges without receipts so they are not regenerated automatically.
    FOR v_payment IN
        SELECT
            id,
            user_id,
            organization_id,
            business_type,
            student_id,
            plan_id,
            month_ref,
            due_date,
            amount,
            paid,
            paid_amount,
            paid_at,
            full_price
        FROM public.payments
        WHERE student_id = p_student_id
          AND user_id = v_student.user_id
          AND organization_id = v_student.organization_id
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
          AND user_id = v_payment.user_id;

        v_new_state := jsonb_build_object(
            'paid', TRUE,
            'paid_amount', 0,
            'paid_at', NULL,
            'amount', 0,
            'full_price', -1
        );

        PERFORM public.record_financial_audit_log(
            v_payment.user_id,
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
                'due_date', v_payment.due_date,
                'organization_id', v_payment.organization_id
            )
        );

        v_cancelled_count := v_cancelled_count + 1;
    END LOOP;

    RETURN v_cancelled_count;
END;
$phase2123_cancel_student_payments$;

REVOKE ALL ON FUNCTION public.receive_payment_atomic(UUID, NUMERIC) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reopen_payment_atomic(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_payment_atomic(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.receive_payments_batch_atomic(UUID[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reopen_payments_batch_atomic(UUID[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_student_open_payments_atomic(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.receive_payment_atomic(UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reopen_payment_atomic(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_payment_atomic(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.receive_payments_batch_atomic(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reopen_payments_batch_atomic(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_student_open_payments_atomic(UUID) TO authenticated;

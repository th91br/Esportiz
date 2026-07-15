-- Restore intentionally cancelled school payments when a user cancelled by mistake.
-- Safe and compatible:
-- - Does not change existing generation/cancel/reopen functions.
-- - Restores only one previously cancelled payment row (full_price = -1).
-- - Recalculates against the student's current monthly plan, due day, discounts and pro-rata rules.
-- - Keeps the unique (user_id, student_id, month_ref) contract intact.

CREATE OR REPLACE FUNCTION public.restore_cancelled_payment_atomic(p_payment_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $restore_cancelled_payment$
DECLARE
    v_payment RECORD;
    v_student RECORD;
    v_plan RECORD;
    v_year INT;
    v_month INT;
    v_days_in_month INT;
    v_due_day INT;
    v_base_amount NUMERIC;
    v_final_amount NUMERIC;
    v_months_diff INT;
    v_is_prorata BOOLEAN;
    v_previous_state JSONB;
    v_new_state JSONB;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Usuario nao autenticado.';
    END IF;

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
    INTO v_payment
    FROM public.payments
    WHERE id = p_payment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pagamento nao encontrado.';
    END IF;

    IF COALESCE(v_payment.full_price, 0) <> -1 THEN
        RAISE EXCEPTION 'Este pagamento nao esta cancelado.';
    END IF;

    IF NOT (
        public.can_access_organization_financials(v_payment.organization_id, ARRAY['owner'])
        OR public.can_access_owner_user_data(v_payment.user_id, ARRAY['owner'])
    ) THEN
        RAISE EXCEPTION 'Usuario nao autorizado.';
    END IF;

    IF v_payment.month_ref !~ '^\d{4}-(0[1-9]|1[0-2])$' THEN
        RAISE EXCEPTION 'Referencia mensal invalida.';
    END IF;

    SELECT
        id,
        user_id,
        organization_id,
        plan_id,
        payment_due_day,
        payment_start_date,
        business_type,
        active,
        discount_type,
        discount_value,
        discount_duration_months,
        discount_start_month
    INTO v_student
    FROM public.students
    WHERE id = v_payment.student_id
      AND user_id = v_payment.user_id
      AND organization_id IS NOT DISTINCT FROM v_payment.organization_id
      AND business_type = v_payment.business_type
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Aluno nao encontrado para restaurar a cobranca.';
    END IF;

    IF v_student.active IS NOT TRUE THEN
        RAISE EXCEPTION 'Nao e possivel restaurar cobranca de aluno inativo.';
    END IF;

    IF v_student.plan_id IS NULL THEN
        RAISE EXCEPTION 'Aluno nao possui plano mensal ativo.';
    END IF;

    v_due_day := v_student.payment_due_day;
    IF v_due_day IS NULL OR v_due_day NOT BETWEEN 1 AND 31 THEN
        RAISE EXCEPTION 'Aluno nao possui dia de vencimento valido.';
    END IF;

    IF v_student.payment_start_date IS NOT NULL
       AND v_payment.month_ref < TO_CHAR(v_student.payment_start_date, 'YYYY-MM')
    THEN
        RAISE EXCEPTION 'Aluno ainda nao iniciou cobranca nesta competencia.';
    END IF;

    SELECT id, price, billing_type, business_type, user_id, organization_id
    INTO v_plan
    FROM public.plans
    WHERE id = v_student.plan_id
      AND user_id = v_payment.user_id
      AND organization_id IS NOT DISTINCT FROM v_payment.organization_id
      AND business_type = v_payment.business_type
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Plano atual do aluno nao encontrado.';
    END IF;

    IF v_plan.billing_type <> 'monthly' THEN
        RAISE EXCEPTION 'Somente planos mensais podem restaurar cobrancas.';
    END IF;

    IF v_plan.price < 0 THEN
        RAISE EXCEPTION 'Valor do plano invalido.';
    END IF;

    v_year := CAST(SPLIT_PART(v_payment.month_ref, '-', 1) AS INT);
    v_month := CAST(SPLIT_PART(v_payment.month_ref, '-', 2) AS INT);
    v_days_in_month := EXTRACT(
        DAY FROM (DATE_TRUNC('month', MAKE_DATE(v_year, v_month, 1)) + INTERVAL '1 month' - INTERVAL '1 day')
    )::INT;

    v_is_prorata :=
        v_student.payment_start_date IS NOT NULL
        AND TO_CHAR(v_student.payment_start_date, 'YYYY-MM') = v_payment.month_ref
        AND EXTRACT(DAY FROM v_student.payment_start_date) > 1;

    IF v_is_prorata THEN
        v_base_amount := ROUND(
            v_plan.price * (
                (v_days_in_month - EXTRACT(DAY FROM v_student.payment_start_date) + 1)
                / v_days_in_month
            ),
            2
        );
    ELSE
        v_base_amount := v_plan.price;
    END IF;

    v_final_amount := v_base_amount;

    IF v_student.discount_type IS NOT NULL
       AND v_student.discount_start_month ~ '^\d{4}-(0[1-9]|1[0-2])$'
    THEN
        v_months_diff :=
            (v_year - CAST(SPLIT_PART(v_student.discount_start_month, '-', 1) AS INT)) * 12
            + (v_month - CAST(SPLIT_PART(v_student.discount_start_month, '-', 2) AS INT));

        IF v_months_diff >= 0
           AND (
               v_student.discount_duration_months IS NULL
               OR v_months_diff < v_student.discount_duration_months
           )
        THEN
            IF v_student.discount_type = 'percentage' THEN
                v_final_amount := ROUND(
                    v_base_amount * (1.0 - LEAST(GREATEST(COALESCE(v_student.discount_value, 0), 0), 100) / 100.0),
                    2
                );
            ELSIF v_student.discount_type = 'fixed' THEN
                v_final_amount := ROUND(
                    GREATEST(0.0, v_base_amount - GREATEST(COALESCE(v_student.discount_value, 0), 0)),
                    2
                );
            END IF;
        END IF;
    END IF;

    v_final_amount := GREATEST(v_final_amount, 0);

    v_previous_state := jsonb_build_object(
        'paid', v_payment.paid,
        'paid_amount', COALESCE(v_payment.paid_amount, 0),
        'paid_at', v_payment.paid_at,
        'amount', v_payment.amount,
        'full_price', v_payment.full_price,
        'plan_id', v_payment.plan_id,
        'due_date', v_payment.due_date
    );

    UPDATE public.payments
    SET
        organization_id = v_student.organization_id,
        business_type = v_student.business_type,
        plan_id = v_plan.id,
        amount = v_final_amount,
        due_date = MAKE_DATE(v_year, v_month, LEAST(v_due_day, v_days_in_month)),
        paid = FALSE,
        paid_amount = 0,
        paid_at = NULL,
        is_prorata = v_is_prorata,
        full_price = CASE WHEN v_is_prorata THEN v_plan.price ELSE NULL END
    WHERE id = v_payment.id
      AND user_id = v_payment.user_id;

    v_new_state := jsonb_build_object(
        'paid', FALSE,
        'paid_amount', 0,
        'paid_at', NULL,
        'amount', v_final_amount,
        'full_price', CASE WHEN v_is_prorata THEN v_plan.price ELSE NULL END,
        'plan_id', v_plan.id,
        'due_date', MAKE_DATE(v_year, v_month, LEAST(v_due_day, v_days_in_month))
    );

    PERFORM public.record_financial_audit_log(
        v_payment.user_id,
        COALESCE(NULLIF(v_payment.business_type, ''), 'sport_school'),
        'payment',
        v_payment.id,
        'payment_restored',
        v_previous_state,
        v_new_state,
        'payments',
        jsonb_build_object(
            'student_id', v_payment.student_id,
            'plan_id', v_plan.id,
            'month_ref', v_payment.month_ref,
            'due_date', MAKE_DATE(v_year, v_month, LEAST(v_due_day, v_days_in_month)),
            'organization_id', v_payment.organization_id
        )
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'payment_id', v_payment.id,
        'restored', TRUE,
        'amount', v_final_amount,
        'due_date', MAKE_DATE(v_year, v_month, LEAST(v_due_day, v_days_in_month))
    );
END;
$restore_cancelled_payment$;

REVOKE ALL ON FUNCTION public.restore_cancelled_payment_atomic(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.restore_cancelled_payment_atomic(UUID) TO authenticated;

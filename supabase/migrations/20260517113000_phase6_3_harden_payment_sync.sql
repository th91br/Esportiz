-- Phase 6.3: harden pending payment synchronization.
-- Replaces legacy sync RPCs with tenant-safe, discount-aware, partial-payment-safe logic.

CREATE OR REPLACE FUNCTION public.sync_student_unpaid_payments(
    p_student_id UUID,
    p_plan_changed BOOLEAN,
    p_new_plan_id UUID,
    p_new_due_day INT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
DECLARE
    v_user_id UUID;
    v_student RECORD;
    v_plan RECORD;
    v_payment RECORD;
    v_student_found BOOLEAN := FALSE;
    v_plan_found BOOLEAN := FALSE;
    v_target_plan_id UUID;
    v_due_day INT;
    v_year INT;
    v_month INT;
    v_days_in_month INT;
    v_base_amount NUMERIC;
    v_final_amount NUMERIC;
    v_months_diff INT;
    v_next_paid_amount NUMERIC;
    v_is_fully_paid BOOLEAN;
    v_is_prorata BOOLEAN;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario nao autenticado.';
    END IF;

    IF p_new_due_day IS NOT NULL AND p_new_due_day NOT BETWEEN 1 AND 31 THEN
        RAISE EXCEPTION 'Dia de vencimento invalido.';
    END IF;

    FOR v_student IN
        SELECT
            id,
            user_id,
            plan_id,
            payment_due_day,
            payment_start_date,
            business_type,
            discount_type,
            discount_value,
            discount_duration_months,
            discount_start_month
        FROM public.students
        WHERE id = p_student_id
          AND user_id = v_user_id
        FOR UPDATE
    LOOP
        v_student_found := TRUE;
    END LOOP;

    IF NOT v_student_found THEN
        RAISE EXCEPTION 'Aluno nao encontrado.';
    END IF;

    v_target_plan_id := COALESCE(p_new_plan_id, v_student.plan_id);
    v_due_day := COALESCE(p_new_due_day, v_student.payment_due_day);

    IF v_target_plan_id IS NULL THEN
        FOR v_payment IN
            SELECT id, paid_amount, amount, full_price
            FROM public.payments
            WHERE student_id = p_student_id
              AND user_id = v_user_id
              AND paid = FALSE
              AND COALESCE(full_price, 0) <> -1
            FOR UPDATE
        LOOP
            IF COALESCE(v_payment.paid_amount, 0) > 0 THEN
                UPDATE public.payments
                SET
                    amount = paid_amount,
                    paid = TRUE,
                    paid_at = COALESCE(paid_at, NOW()),
                    full_price = CASE WHEN full_price IS NULL THEN amount ELSE full_price END
                WHERE id = v_payment.id
                  AND user_id = v_user_id;
            ELSE
                UPDATE public.payments
                SET
                    amount = 0,
                    paid_amount = 0,
                    paid = TRUE,
                    paid_at = NULL,
                    full_price = -1
                WHERE id = v_payment.id
                  AND user_id = v_user_id;
            END IF;
        END LOOP;

        RETURN;
    END IF;

    FOR v_plan IN
        SELECT id, price, billing_type, business_type
        FROM public.plans
        WHERE id = v_target_plan_id
          AND user_id = v_user_id
          AND business_type = v_student.business_type
        FOR UPDATE
    LOOP
        v_plan_found := TRUE;
    END LOOP;

    IF NOT v_plan_found THEN
        RAISE EXCEPTION 'Plano nao encontrado.';
    END IF;

    IF v_plan.price < 0 THEN
        RAISE EXCEPTION 'Valor do plano invalido.';
    END IF;

    IF v_plan.billing_type <> 'monthly' THEN
        FOR v_payment IN
            SELECT id, paid_amount, amount, full_price
            FROM public.payments
            WHERE student_id = p_student_id
              AND user_id = v_user_id
              AND paid = FALSE
              AND COALESCE(full_price, 0) <> -1
            FOR UPDATE
        LOOP
            IF COALESCE(v_payment.paid_amount, 0) > 0 THEN
                UPDATE public.payments
                SET
                    amount = paid_amount,
                    paid = TRUE,
                    paid_at = COALESCE(paid_at, NOW()),
                    full_price = CASE WHEN full_price IS NULL THEN amount ELSE full_price END
                WHERE id = v_payment.id
                  AND user_id = v_user_id;
            ELSE
                UPDATE public.payments
                SET
                    amount = 0,
                    paid_amount = 0,
                    paid = TRUE,
                    paid_at = NULL,
                    full_price = -1
                WHERE id = v_payment.id
                  AND user_id = v_user_id;
            END IF;
        END LOOP;

        RETURN;
    END IF;

    IF v_due_day IS NULL OR v_due_day NOT BETWEEN 1 AND 31 THEN
        FOR v_payment IN
            SELECT id, paid_amount, amount, full_price
            FROM public.payments
            WHERE student_id = p_student_id
              AND user_id = v_user_id
              AND paid = FALSE
              AND COALESCE(full_price, 0) <> -1
            FOR UPDATE
        LOOP
            IF COALESCE(v_payment.paid_amount, 0) > 0 THEN
                UPDATE public.payments
                SET
                    amount = paid_amount,
                    paid = TRUE,
                    paid_at = COALESCE(paid_at, NOW()),
                    full_price = CASE WHEN full_price IS NULL THEN amount ELSE full_price END
                WHERE id = v_payment.id
                  AND user_id = v_user_id;
            ELSE
                UPDATE public.payments
                SET
                    amount = 0,
                    paid_amount = 0,
                    paid = TRUE,
                    paid_at = NULL,
                    full_price = -1
                WHERE id = v_payment.id
                  AND user_id = v_user_id;
            END IF;
        END LOOP;

        RETURN;
    END IF;

    FOR v_payment IN
        SELECT id, month_ref, paid_amount, paid_at
        FROM public.payments
        WHERE student_id = p_student_id
          AND user_id = v_user_id
          AND paid = FALSE
          AND COALESCE(full_price, 0) <> -1
        FOR UPDATE
    LOOP
        IF v_payment.month_ref !~ '^\d{4}-(0[1-9]|1[0-2])$' THEN
            CONTINUE;
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
        v_next_paid_amount := LEAST(COALESCE(v_payment.paid_amount, 0), v_final_amount);
        v_is_fully_paid := v_next_paid_amount >= v_final_amount;

        UPDATE public.payments
        SET
            plan_id = v_plan.id,
            business_type = v_student.business_type,
            amount = v_final_amount,
            due_date = MAKE_DATE(v_year, v_month, LEAST(v_due_day, v_days_in_month)),
            is_prorata = v_is_prorata,
            full_price = CASE WHEN v_is_prorata THEN v_plan.price ELSE NULL END,
            paid_amount = v_next_paid_amount,
            paid = v_is_fully_paid,
            paid_at = CASE
                WHEN v_is_fully_paid THEN COALESCE(v_payment.paid_at, NOW())
                WHEN v_next_paid_amount > 0 THEN v_payment.paid_at
                ELSE NULL
            END
        WHERE id = v_payment.id
          AND user_id = v_user_id;
    END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_all_unpaid_payments_for_plan(p_plan_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
DECLARE
    v_user_id UUID;
    v_plan RECORD;
    v_payment RECORD;
    v_plan_found BOOLEAN := FALSE;
    v_year INT;
    v_month INT;
    v_days_in_month INT;
    v_due_day INT;
    v_base_amount NUMERIC;
    v_final_amount NUMERIC;
    v_months_diff INT;
    v_next_paid_amount NUMERIC;
    v_is_fully_paid BOOLEAN;
    v_is_prorata BOOLEAN;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario nao autenticado.';
    END IF;

    FOR v_plan IN
        SELECT id, price, billing_type, business_type
        FROM public.plans
        WHERE id = p_plan_id
          AND user_id = v_user_id
        FOR UPDATE
    LOOP
        v_plan_found := TRUE;
    END LOOP;

    IF NOT v_plan_found THEN
        RAISE EXCEPTION 'Plano nao encontrado.';
    END IF;

    IF v_plan.price < 0 THEN
        RAISE EXCEPTION 'Valor do plano invalido.';
    END IF;

    IF v_plan.billing_type <> 'monthly' THEN
        FOR v_payment IN
            SELECT py.id, py.paid_amount, py.amount, py.full_price
            FROM public.payments py
            WHERE py.plan_id = p_plan_id
              AND py.user_id = v_user_id
              AND py.paid = FALSE
              AND COALESCE(py.full_price, 0) <> -1
            FOR UPDATE OF py
        LOOP
            IF COALESCE(v_payment.paid_amount, 0) > 0 THEN
                UPDATE public.payments
                SET
                    amount = paid_amount,
                    paid = TRUE,
                    paid_at = COALESCE(paid_at, NOW()),
                    full_price = CASE WHEN full_price IS NULL THEN amount ELSE full_price END
                WHERE id = v_payment.id
                  AND user_id = v_user_id;
            ELSE
                UPDATE public.payments
                SET
                    amount = 0,
                    paid_amount = 0,
                    paid = TRUE,
                    paid_at = NULL,
                    full_price = -1
                WHERE id = v_payment.id
                  AND user_id = v_user_id;
            END IF;
        END LOOP;

        RETURN;
    END IF;

    FOR v_payment IN
        SELECT
            py.id,
            py.month_ref,
            py.paid_amount,
            py.paid_at,
            s.payment_due_day,
            s.payment_start_date,
            s.business_type,
            s.discount_type,
            s.discount_value,
            s.discount_duration_months,
            s.discount_start_month
        FROM public.payments py
        JOIN public.students s
          ON s.id = py.student_id
         AND s.user_id = py.user_id
         AND s.business_type = v_plan.business_type
        WHERE py.plan_id = p_plan_id
          AND py.user_id = v_user_id
          AND py.paid = FALSE
          AND COALESCE(py.full_price, 0) <> -1
        FOR UPDATE OF py
    LOOP
        IF v_payment.month_ref !~ '^\d{4}-(0[1-9]|1[0-2])$' THEN
            CONTINUE;
        END IF;

        v_due_day := v_payment.payment_due_day;

        IF v_due_day IS NULL OR v_due_day NOT BETWEEN 1 AND 31 THEN
            CONTINUE;
        END IF;

        v_year := CAST(SPLIT_PART(v_payment.month_ref, '-', 1) AS INT);
        v_month := CAST(SPLIT_PART(v_payment.month_ref, '-', 2) AS INT);
        v_days_in_month := EXTRACT(
            DAY FROM (DATE_TRUNC('month', MAKE_DATE(v_year, v_month, 1)) + INTERVAL '1 month' - INTERVAL '1 day')
        )::INT;

        v_is_prorata :=
            v_payment.payment_start_date IS NOT NULL
            AND TO_CHAR(v_payment.payment_start_date, 'YYYY-MM') = v_payment.month_ref
            AND EXTRACT(DAY FROM v_payment.payment_start_date) > 1;

        IF v_is_prorata THEN
            v_base_amount := ROUND(
                v_plan.price * (
                    (v_days_in_month - EXTRACT(DAY FROM v_payment.payment_start_date) + 1)
                    / v_days_in_month
                ),
                2
            );
        ELSE
            v_base_amount := v_plan.price;
        END IF;

        v_final_amount := v_base_amount;

        IF v_payment.discount_type IS NOT NULL
           AND v_payment.discount_start_month ~ '^\d{4}-(0[1-9]|1[0-2])$'
        THEN
            v_months_diff :=
                (v_year - CAST(SPLIT_PART(v_payment.discount_start_month, '-', 1) AS INT)) * 12
                + (v_month - CAST(SPLIT_PART(v_payment.discount_start_month, '-', 2) AS INT));

            IF v_months_diff >= 0
               AND (
                   v_payment.discount_duration_months IS NULL
                   OR v_months_diff < v_payment.discount_duration_months
               )
            THEN
                IF v_payment.discount_type = 'percentage' THEN
                    v_final_amount := ROUND(
                        v_base_amount * (1.0 - LEAST(GREATEST(COALESCE(v_payment.discount_value, 0), 0), 100) / 100.0),
                        2
                    );
                ELSIF v_payment.discount_type = 'fixed' THEN
                    v_final_amount := ROUND(
                        GREATEST(0.0, v_base_amount - GREATEST(COALESCE(v_payment.discount_value, 0), 0)),
                        2
                    );
                END IF;
            END IF;
        END IF;

        v_final_amount := GREATEST(v_final_amount, 0);
        v_next_paid_amount := LEAST(COALESCE(v_payment.paid_amount, 0), v_final_amount);
        v_is_fully_paid := v_next_paid_amount >= v_final_amount;

        UPDATE public.payments
        SET
            business_type = v_plan.business_type,
            amount = v_final_amount,
            due_date = MAKE_DATE(v_year, v_month, LEAST(v_due_day, v_days_in_month)),
            is_prorata = v_is_prorata,
            full_price = CASE WHEN v_is_prorata THEN v_plan.price ELSE NULL END,
            paid_amount = v_next_paid_amount,
            paid = v_is_fully_paid,
            paid_at = CASE
                WHEN v_is_fully_paid THEN COALESCE(v_payment.paid_at, NOW())
                WHEN v_next_paid_amount > 0 THEN v_payment.paid_at
                ELSE NULL
            END
        WHERE id = v_payment.id
          AND user_id = v_user_id;
    END LOOP;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.sync_student_unpaid_payments(UUID, BOOLEAN, UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_all_unpaid_payments_for_plan(UUID) TO authenticated;

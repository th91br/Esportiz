-- Phase 2.12.5: organization-aware monthly payment generation and synchronization RPCs.
-- Safe, compatible migration:
-- - Keeps the same RPC signatures currently used by the frontend.
-- - Preserves current owner-user behavior.
-- - Adds organization/member authorization for future team roles.
-- - Keeps pro-rata, discounts, partial-payment protection, and cancellation semantics.
-- - Ensures generated/updated payments keep organization_id aligned with students/plans.
-- - Does not alter tables and does not modify existing data by itself.

CREATE OR REPLACE FUNCTION public.generate_monthly_payments(p_month_ref TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $phase2125_generate_monthly_payments$
DECLARE
    v_year INT;
    v_month INT;
    v_count INT := 0;
    v_auth_user_id UUID;
    v_owner_user_id UUID;
    v_organization_id UUID;
    v_business_type TEXT;
    v_accessible_org_count INT := 0;
BEGIN
    v_auth_user_id := auth.uid();

    IF v_auth_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario nao autenticado.';
    END IF;

    IF p_month_ref IS NULL OR p_month_ref !~ '^\d{4}-(0[1-9]|1[0-2])$' THEN
        RAISE EXCEPTION 'Referencia mensal invalida. Use o formato YYYY-MM.';
    END IF;

    v_year := CAST(SPLIT_PART(p_month_ref, '-', 1) AS INT);
    v_month := CAST(SPLIT_PART(p_month_ref, '-', 2) AS INT);

    SELECT
        p.user_id,
        p.organization_id,
        COALESCE(NULLIF(p.business_type, ''), 'sport_school')
    INTO
        v_owner_user_id,
        v_organization_id,
        v_business_type
    FROM public.profiles p
    WHERE p.user_id = v_auth_user_id
    LIMIT 1;

    IF v_owner_user_id IS NULL THEN
        SELECT COUNT(*)::INT
        INTO v_accessible_org_count
        FROM public.organization_members om
        JOIN public.organizations o
          ON o.id = om.organization_id
        WHERE om.user_id = v_auth_user_id
          AND om.active = TRUE
          AND om.role IN ('owner', 'manager', 'receptionist')
          AND o.status = 'active';

        IF v_accessible_org_count <> 1 THEN
            RAISE EXCEPTION 'Contexto de organizacao invalido ou ambiguo.';
        END IF;

        SELECT
            o.owner_user_id,
            o.id,
            COALESCE(NULLIF(p.business_type, ''), 'sport_school')
        INTO
            v_owner_user_id,
            v_organization_id,
            v_business_type
        FROM public.organization_members om
        JOIN public.organizations o
          ON o.id = om.organization_id
        LEFT JOIN public.profiles p
          ON p.user_id = o.owner_user_id
        WHERE om.user_id = v_auth_user_id
          AND om.active = TRUE
          AND om.role IN ('owner', 'manager', 'receptionist')
          AND o.status = 'active'
        LIMIT 1;
    END IF;

    IF v_owner_user_id IS NULL OR v_organization_id IS NULL THEN
        RAISE EXCEPTION 'Organizacao nao encontrada.';
    END IF;

    IF NOT (
        public.can_access_organization_financials(v_organization_id, ARRAY['owner', 'manager', 'receptionist'])
        OR public.can_access_owner_user_data(v_owner_user_id, ARRAY['owner', 'manager', 'receptionist'])
    ) THEN
        RAISE EXCEPTION 'Usuario nao autorizado.';
    END IF;

    IF v_business_type NOT IN ('sport_school', 'arena') THEN
        v_business_type := 'sport_school';
    END IF;

    -- Serializes concurrent generation attempts for the same organization, business type, and month.
    PERFORM pg_advisory_xact_lock(
        hashtext(v_organization_id::TEXT),
        hashtext('payments:' || v_business_type || ':' || p_month_ref)
    );

    WITH eligible_students AS (
        SELECT
            s.id AS student_id,
            s.user_id,
            s.organization_id,
            s.plan_id,
            s.payment_due_day,
            s.payment_start_date,
            s.business_type,
            s.discount_type,
            s.discount_value,
            s.discount_duration_months,
            s.discount_start_month,
            p.price AS amount
        FROM public.students s
        JOIN public.plans p
          ON p.id = s.plan_id
         AND p.user_id = s.user_id
         AND p.organization_id = s.organization_id
         AND p.business_type = s.business_type
        WHERE s.user_id = v_owner_user_id
          AND s.organization_id = v_organization_id
          AND s.business_type = v_business_type
          AND s.active = TRUE
          AND s.plan_id IS NOT NULL
          AND s.payment_due_day BETWEEN 1 AND 31
          AND p.billing_type = 'monthly'
          AND p.price >= 0
          AND (
              s.payment_start_date IS NULL
              OR p_month_ref >= SUBSTRING(s.payment_start_date::TEXT FROM 1 FOR 7)
          )
          AND NOT EXISTS (
              SELECT 1
              FROM public.payments py
              WHERE py.user_id = v_owner_user_id
                AND py.organization_id = v_organization_id
                AND py.student_id = s.id
                AND py.month_ref = p_month_ref
          )
    ),
    calculated_payments AS (
        SELECT
            es.student_id,
            es.user_id,
            es.organization_id,
            es.plan_id,
            es.payment_due_day,
            es.payment_start_date,
            es.business_type,
            es.amount AS full_price,
            CASE
                WHEN es.payment_start_date IS NOT NULL
                 AND TO_CHAR(es.payment_start_date, 'YYYY-MM') = p_month_ref
                 AND EXTRACT(DAY FROM es.payment_start_date) > 1 THEN
                    ROUND(
                        es.amount * (
                            (
                                EXTRACT(DAY FROM (DATE_TRUNC('month', es.payment_start_date) + INTERVAL '1 month' - INTERVAL '1 day'))
                                - EXTRACT(DAY FROM es.payment_start_date)
                                + 1
                            )
                            / EXTRACT(DAY FROM (DATE_TRUNC('month', es.payment_start_date) + INTERVAL '1 month' - INTERVAL '1 day'))
                        ),
                        2
                    )
                ELSE
                    es.amount
            END AS base_amount,
            CASE
                WHEN es.payment_start_date IS NOT NULL
                 AND TO_CHAR(es.payment_start_date, 'YYYY-MM') = p_month_ref
                 AND EXTRACT(DAY FROM es.payment_start_date) > 1 THEN
                    TRUE
                ELSE
                    FALSE
            END AS is_prorata,
            es.discount_type,
            GREATEST(COALESCE(es.discount_value, 0), 0) AS discount_value,
            es.discount_duration_months,
            es.discount_start_month
        FROM eligible_students es
    ),
    discounted_payments AS (
        SELECT
            cp.student_id,
            cp.user_id,
            cp.organization_id,
            cp.plan_id,
            cp.payment_due_day,
            cp.business_type,
            cp.full_price,
            cp.is_prorata,
            CASE
                WHEN cp.discount_type IS NOT NULL
                 AND cp.discount_start_month ~ '^\d{4}-(0[1-9]|1[0-2])$'
                 AND (
                     (v_year - CAST(SPLIT_PART(cp.discount_start_month, '-', 1) AS INT)) * 12
                     + (v_month - CAST(SPLIT_PART(cp.discount_start_month, '-', 2) AS INT))
                 ) >= 0
                 AND (
                     cp.discount_duration_months IS NULL
                     OR (
                         (v_year - CAST(SPLIT_PART(cp.discount_start_month, '-', 1) AS INT)) * 12
                         + (v_month - CAST(SPLIT_PART(cp.discount_start_month, '-', 2) AS INT))
                     ) < cp.discount_duration_months
                 ) THEN
                    CASE
                        WHEN cp.discount_type = 'percentage' THEN
                            ROUND(cp.base_amount * (1.0 - LEAST(cp.discount_value, 100) / 100.0), 2)
                        WHEN cp.discount_type = 'fixed' THEN
                            ROUND(GREATEST(0.0, cp.base_amount - cp.discount_value), 2)
                        ELSE
                            cp.base_amount
                    END
                ELSE
                    cp.base_amount
            END AS calculated_amount
        FROM calculated_payments cp
    ),
    inserted AS (
        INSERT INTO public.payments (
            user_id,
            organization_id,
            student_id,
            plan_id,
            amount,
            due_date,
            paid,
            month_ref,
            is_prorata,
            full_price,
            business_type,
            paid_amount
        )
        SELECT
            dp.user_id,
            dp.organization_id,
            dp.student_id,
            dp.plan_id,
            dp.calculated_amount,
            MAKE_DATE(
                v_year,
                v_month,
                LEAST(
                    dp.payment_due_day,
                    EXTRACT(DAY FROM (DATE_TRUNC('month', MAKE_DATE(v_year, v_month, 1)) + INTERVAL '1 month' - INTERVAL '1 day'))::INTEGER
                )
            ),
            FALSE,
            p_month_ref,
            dp.is_prorata,
            CASE WHEN dp.is_prorata THEN dp.full_price ELSE NULL END,
            dp.business_type,
            0
        FROM discounted_payments dp
        ON CONFLICT (user_id, student_id, month_ref) DO NOTHING
        RETURNING 1
    )
    SELECT COUNT(*) INTO v_count FROM inserted;

    RETURN v_count;
END;
$phase2125_generate_monthly_payments$;

CREATE OR REPLACE FUNCTION public.sync_student_unpaid_payments(
    p_student_id UUID,
    p_plan_changed BOOLEAN,
    p_new_plan_id UUID,
    p_new_due_day INT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $phase2125_sync_student_payments$
DECLARE
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
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Usuario nao autenticado.';
    END IF;

    IF p_new_due_day IS NOT NULL AND p_new_due_day NOT BETWEEN 1 AND 31 THEN
        RAISE EXCEPTION 'Dia de vencimento invalido.';
    END IF;

    FOR v_student IN
        SELECT
            id,
            user_id,
            organization_id,
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
        FOR UPDATE
    LOOP
        v_student_found := TRUE;
    END LOOP;

    IF NOT v_student_found THEN
        RAISE EXCEPTION 'Aluno nao encontrado.';
    END IF;

    IF NOT (
        public.can_access_organization_financials(v_student.organization_id, ARRAY['owner', 'manager'])
        OR public.can_access_owner_user_data(v_student.user_id, ARRAY['owner', 'manager'])
    ) THEN
        RAISE EXCEPTION 'Usuario nao autorizado.';
    END IF;

    v_target_plan_id := COALESCE(p_new_plan_id, v_student.plan_id);
    v_due_day := COALESCE(p_new_due_day, v_student.payment_due_day);

    IF v_target_plan_id IS NULL THEN
        FOR v_payment IN
            SELECT id, paid_amount, amount, full_price
            FROM public.payments
            WHERE student_id = p_student_id
              AND user_id = v_student.user_id
              AND organization_id = v_student.organization_id
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
                  AND user_id = v_student.user_id;
            ELSE
                UPDATE public.payments
                SET
                    amount = 0,
                    paid_amount = 0,
                    paid = TRUE,
                    paid_at = NULL,
                    full_price = -1
                WHERE id = v_payment.id
                  AND user_id = v_student.user_id;
            END IF;
        END LOOP;

        RETURN;
    END IF;

    FOR v_plan IN
        SELECT id, price, billing_type, business_type, user_id, organization_id
        FROM public.plans
        WHERE id = v_target_plan_id
          AND user_id = v_student.user_id
          AND organization_id = v_student.organization_id
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
              AND user_id = v_student.user_id
              AND organization_id = v_student.organization_id
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
                  AND user_id = v_student.user_id;
            ELSE
                UPDATE public.payments
                SET
                    amount = 0,
                    paid_amount = 0,
                    paid = TRUE,
                    paid_at = NULL,
                    full_price = -1
                WHERE id = v_payment.id
                  AND user_id = v_student.user_id;
            END IF;
        END LOOP;

        RETURN;
    END IF;

    IF v_due_day IS NULL OR v_due_day NOT BETWEEN 1 AND 31 THEN
        FOR v_payment IN
            SELECT id, paid_amount, amount, full_price
            FROM public.payments
            WHERE student_id = p_student_id
              AND user_id = v_student.user_id
              AND organization_id = v_student.organization_id
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
                  AND user_id = v_student.user_id;
            ELSE
                UPDATE public.payments
                SET
                    amount = 0,
                    paid_amount = 0,
                    paid = TRUE,
                    paid_at = NULL,
                    full_price = -1
                WHERE id = v_payment.id
                  AND user_id = v_student.user_id;
            END IF;
        END LOOP;

        RETURN;
    END IF;

    FOR v_payment IN
        SELECT id, month_ref, paid_amount, paid_at
        FROM public.payments
        WHERE student_id = p_student_id
          AND user_id = v_student.user_id
          AND organization_id = v_student.organization_id
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
            organization_id = v_student.organization_id,
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
          AND user_id = v_student.user_id;
    END LOOP;
END;
$phase2125_sync_student_payments$;

CREATE OR REPLACE FUNCTION public.sync_all_unpaid_payments_for_plan(p_plan_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $phase2125_sync_plan_payments$
DECLARE
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
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Usuario nao autenticado.';
    END IF;

    FOR v_plan IN
        SELECT id, user_id, organization_id, price, billing_type, business_type
        FROM public.plans
        WHERE id = p_plan_id
        FOR UPDATE
    LOOP
        v_plan_found := TRUE;
    END LOOP;

    IF NOT v_plan_found THEN
        RAISE EXCEPTION 'Plano nao encontrado.';
    END IF;

    IF NOT (
        public.can_access_organization_financials(v_plan.organization_id, ARRAY['owner', 'manager'])
        OR public.can_access_owner_user_data(v_plan.user_id, ARRAY['owner', 'manager'])
    ) THEN
        RAISE EXCEPTION 'Usuario nao autorizado.';
    END IF;

    IF v_plan.price < 0 THEN
        RAISE EXCEPTION 'Valor do plano invalido.';
    END IF;

    IF v_plan.billing_type <> 'monthly' THEN
        FOR v_payment IN
            SELECT py.id, py.paid_amount, py.amount, py.full_price
            FROM public.payments py
            WHERE py.plan_id = p_plan_id
              AND py.user_id = v_plan.user_id
              AND py.organization_id = v_plan.organization_id
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
                  AND user_id = v_plan.user_id;
            ELSE
                UPDATE public.payments
                SET
                    amount = 0,
                    paid_amount = 0,
                    paid = TRUE,
                    paid_at = NULL,
                    full_price = -1
                WHERE id = v_payment.id
                  AND user_id = v_plan.user_id;
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
         AND s.organization_id = py.organization_id
         AND s.business_type = v_plan.business_type
        WHERE py.plan_id = p_plan_id
          AND py.user_id = v_plan.user_id
          AND py.organization_id = v_plan.organization_id
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
            organization_id = v_plan.organization_id,
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
          AND user_id = v_plan.user_id;
    END LOOP;
END;
$phase2125_sync_plan_payments$;

REVOKE ALL ON FUNCTION public.generate_monthly_payments(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_student_unpaid_payments(UUID, BOOLEAN, UUID, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_all_unpaid_payments_for_plan(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.generate_monthly_payments(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_student_unpaid_payments(UUID, BOOLEAN, UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_all_unpaid_payments_for_plan(UUID) TO authenticated;

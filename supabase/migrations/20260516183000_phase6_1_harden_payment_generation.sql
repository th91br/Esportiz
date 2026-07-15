-- Phase 6.1: harden monthly payment generation.
-- Keeps the existing RPC signature while making generation tenant, business-type,
-- month, and concurrency safe.

CREATE OR REPLACE FUNCTION public.generate_monthly_payments(p_month_ref TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
DECLARE
    v_year INT;
    v_month INT;
    v_count INT := 0;
    v_user_id UUID;
    v_business_type TEXT;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario nao autenticado.';
    END IF;

    IF p_month_ref IS NULL OR p_month_ref !~ '^\d{4}-(0[1-9]|1[0-2])$' THEN
        RAISE EXCEPTION 'Referencia mensal invalida. Use o formato YYYY-MM.';
    END IF;

    v_year := CAST(SPLIT_PART(p_month_ref, '-', 1) AS INT);
    v_month := CAST(SPLIT_PART(p_month_ref, '-', 2) AS INT);

    v_business_type := (
        SELECT COALESCE(NULLIF(business_type, ''), 'sport_school')
        FROM public.profiles
        WHERE user_id = v_user_id
        LIMIT 1
    );

    IF v_business_type IS NULL THEN
        v_business_type := 'sport_school';
    END IF;

    IF v_business_type NOT IN ('sport_school', 'arena') THEN
        v_business_type := 'sport_school';
    END IF;

    -- Serializes concurrent generation attempts for the same tenant, business type, and month.
    PERFORM pg_advisory_xact_lock(
        hashtext(v_user_id::TEXT),
        hashtext('payments:' || v_business_type || ':' || p_month_ref)
    );

    WITH eligible_students AS (
        SELECT
            s.id AS student_id,
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
         AND p.business_type = s.business_type
        WHERE s.user_id = v_user_id
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
              WHERE py.user_id = v_user_id
                AND py.student_id = s.id
                AND py.month_ref = p_month_ref
          )
    ),
    calculated_payments AS (
        SELECT
            es.student_id,
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
            v_user_id,
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
$function$;

GRANT EXECUTE ON FUNCTION public.generate_monthly_payments(TEXT) TO authenticated;

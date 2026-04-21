-- Migration to update generate_monthly_payments to correctly calculate pro-rata based on days

CREATE OR REPLACE FUNCTION generate_monthly_payments(p_month_ref TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    v_year INT;
    v_month INT;
    v_count INT := 0;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuário não autenticado';
    END IF;

    v_year := CAST(SPLIT_PART(p_month_ref, '-', 1) AS INT);
    v_month := CAST(SPLIT_PART(p_month_ref, '-', 2) AS INT);

    WITH eligible_students AS (
        SELECT 
            s.id AS student_id,
            s.plan_id,
            s.payment_due_day,
            s.payment_start_date,
            p.price AS amount
        FROM public.students s
        JOIN public.plans p ON s.plan_id = p.id
        WHERE s.user_id = v_user_id
          AND s.active = TRUE
          AND s.plan_id IS NOT NULL
          AND s.payment_due_day IS NOT NULL
          AND p.billing_type = 'monthly'
          AND (
              s.payment_start_date IS NULL
              OR 
              p_month_ref >= SUBSTRING(s.payment_start_date::text FROM 1 FOR 7)
          )
          AND NOT EXISTS (
              SELECT 1 FROM public.payments py 
              WHERE py.student_id = s.id 
                AND py.month_ref = p_month_ref
          )
    ),
    calculated_payments AS (
        SELECT
            es.student_id,
            es.plan_id,
            es.payment_due_day,
            es.payment_start_date,
            es.amount AS full_price,
            CASE 
                WHEN es.payment_start_date IS NOT NULL AND TO_CHAR(es.payment_start_date, 'YYYY-MM') = p_month_ref AND EXTRACT(DAY FROM es.payment_start_date) > 1 THEN
                    ROUND(es.amount * ( ( EXTRACT(DAY FROM (DATE_TRUNC('month', es.payment_start_date) + INTERVAL '1 month' - INTERVAL '1 day')) - EXTRACT(DAY FROM es.payment_start_date) + 1 ) / EXTRACT(DAY FROM (DATE_TRUNC('month', es.payment_start_date) + INTERVAL '1 month' - INTERVAL '1 day')) ), 2)
                ELSE
                    es.amount
            END AS calculated_amount,
            CASE
                WHEN es.payment_start_date IS NOT NULL AND TO_CHAR(es.payment_start_date, 'YYYY-MM') = p_month_ref AND EXTRACT(DAY FROM es.payment_start_date) > 1 THEN
                    TRUE
                ELSE
                    FALSE
            END AS is_prorata
        FROM eligible_students es
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
            full_price
        )
        SELECT 
            v_user_id,
            cp.student_id,
            cp.plan_id,
            cp.calculated_amount,
            MAKE_DATE(
                v_year, 
                v_month, 
                LEAST(
                    cp.payment_due_day, 
                    EXTRACT(DAY FROM (DATE_TRUNC('month', MAKE_DATE(v_year, v_month, 1)) + INTERVAL '1 month' - INTERVAL '1 day'))::INTEGER
                )
            ),
            FALSE,
            p_month_ref,
            cp.is_prorata,
            CASE WHEN cp.is_prorata THEN cp.full_price ELSE NULL END
        FROM calculated_payments cp
        RETURNING 1
    )
    SELECT COUNT(*) INTO v_count FROM inserted;

    RETURN v_count;
END;
$$;


CREATE OR REPLACE FUNCTION sync_student_unpaid_payments(
    p_student_id UUID, 
    p_plan_changed BOOLEAN,
    p_new_plan_id UUID,
    p_new_due_day INT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    v_year INT;
    v_month INT;
    v_new_price NUMERIC;
    v_new_plan_billing_type TEXT;
    rec RECORD;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuário não autenticado';
    END IF;

    -- Verify ownership
    IF NOT EXISTS (SELECT 1 FROM public.students WHERE id = p_student_id AND user_id = v_user_id) THEN
        RAISE EXCEPTION 'Acesso Negado';
    END IF;

    -- Get new plan info if applicable
    IF p_new_plan_id IS NOT NULL THEN
        SELECT price, billing_type INTO v_new_price, v_new_plan_billing_type 
        FROM public.plans 
        WHERE id = p_new_plan_id AND user_id = v_user_id;
    END IF;

    IF p_plan_changed THEN
        IF v_new_plan_billing_type = 'per_session' OR v_new_plan_billing_type IS NULL THEN
            DELETE FROM public.payments 
            WHERE student_id = p_student_id AND paid = FALSE AND user_id = v_user_id;
        ELSE
            FOR rec IN SELECT id, month_ref, is_prorata, full_price, amount FROM public.payments WHERE student_id = p_student_id AND paid = FALSE AND user_id = v_user_id LOOP
                v_year := CAST(SPLIT_PART(rec.month_ref, '-', 1) AS INT);
                v_month := CAST(SPLIT_PART(rec.month_ref, '-', 2) AS INT);
                
                UPDATE public.payments
                SET 
                    amount = CASE 
                        WHEN rec.is_prorata = TRUE AND v_new_price IS NOT NULL AND rec.full_price > 0 THEN
                            ROUND(v_new_price * (rec.amount / rec.full_price), 2)
                        ELSE
                            COALESCE(v_new_price, amount)
                    END,
                    full_price = CASE
                        WHEN rec.is_prorata = TRUE AND v_new_price IS NOT NULL THEN
                            v_new_price
                        ELSE
                            full_price
                    END,
                    plan_id = COALESCE(p_new_plan_id, plan_id),
                    due_date = CASE 
                        WHEN p_new_due_day IS NOT NULL THEN
                            MAKE_DATE(
                                v_year, 
                                v_month, 
                                LEAST(
                                    p_new_due_day, 
                                    EXTRACT(DAY FROM (DATE_TRUNC('month', MAKE_DATE(v_year, v_month, 1)) + INTERVAL '1 month' - INTERVAL '1 day'))::INTEGER
                                )
                            )
                        ELSE due_date
                    END
                WHERE id = rec.id AND user_id = v_user_id;
            END LOOP;
        END IF;

    ELSE
        FOR rec IN SELECT id, month_ref FROM public.payments WHERE student_id = p_student_id AND paid = FALSE AND user_id = v_user_id LOOP
            v_year := CAST(SPLIT_PART(rec.month_ref, '-', 1) AS INT);
            v_month := CAST(SPLIT_PART(rec.month_ref, '-', 2) AS INT);

            UPDATE public.payments
            SET 
                due_date = CASE 
                    WHEN p_new_due_day IS NOT NULL THEN
                        MAKE_DATE(
                            v_year, 
                            v_month, 
                            LEAST(
                                p_new_due_day, 
                                EXTRACT(DAY FROM (DATE_TRUNC('month', MAKE_DATE(v_year, v_month, 1)) + INTERVAL '1 month' - INTERVAL '1 day'))::INTEGER
                            )
                        )
                    ELSE due_date
                END
            WHERE id = rec.id AND user_id = v_user_id;
        END LOOP;
    END IF;
END;
$$;


CREATE OR REPLACE FUNCTION sync_all_unpaid_payments_for_plan(p_plan_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    v_user_id UUID;
    v_plan_price NUMERIC;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuário não autenticado';
    END IF;

    SELECT price INTO v_plan_price FROM public.plans WHERE id = p_plan_id AND user_id = v_user_id;

    IF v_plan_price IS NULL THEN
        RETURN;
    END IF;

    UPDATE public.payments
    SET 
        amount = CASE 
            WHEN is_prorata = TRUE AND full_price > 0 THEN ROUND(v_plan_price * (amount / full_price), 2) 
            ELSE v_plan_price 
        END,
        full_price = CASE WHEN is_prorata = TRUE THEN v_plan_price ELSE full_price END
    WHERE plan_id = p_plan_id AND paid = FALSE AND user_id = v_user_id;

END;
$$;

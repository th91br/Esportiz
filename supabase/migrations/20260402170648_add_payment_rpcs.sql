-- Migration for adding payment optimization RPCs
-- 1. generate_monthly_payments (Atomic transaction for generating bulk monthly invoices)
-- 2. sync_student_unpaid_payments (Atomic transaction for updating bulk payments without network roundtrips)

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
    inserted AS (
        INSERT INTO public.payments (
            user_id, 
            student_id, 
            plan_id, 
            amount, 
            due_date, 
            paid, 
            month_ref
        )
        SELECT 
            v_user_id,
            es.student_id,
            es.plan_id,
            es.amount,
            MAKE_DATE(
                v_year, 
                v_month, 
                LEAST(
                    es.payment_due_day, 
                    EXTRACT(DAY FROM (DATE_TRUNC('month', MAKE_DATE(v_year, v_month, 1)) + INTERVAL '1 month' - INTERVAL '1 day'))::INTEGER
                )
            ),
            FALSE,
            p_month_ref
        FROM eligible_students es
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
    rec RECORD;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuário não autenticado';
    END IF;

    -- Verify ownership to prevent modifying other users' resources
    IF NOT EXISTS (SELECT 1 FROM public.students WHERE id = p_student_id AND user_id = v_user_id) THEN
        RAISE EXCEPTION 'Acesso Negado';
    END IF;

    IF p_plan_changed THEN
        DELETE FROM public.payments 
        WHERE student_id = p_student_id AND paid = FALSE AND user_id = v_user_id;
    ELSE
        IF p_new_plan_id IS NOT NULL THEN
            SELECT price INTO v_new_price FROM public.plans WHERE id = p_new_plan_id AND user_id = v_user_id;
        END IF;

        FOR rec IN SELECT id, month_ref FROM public.payments WHERE student_id = p_student_id AND paid = FALSE AND user_id = v_user_id LOOP
            v_year := CAST(SPLIT_PART(rec.month_ref, '-', 1) AS INT);
            v_month := CAST(SPLIT_PART(rec.month_ref, '-', 2) AS INT);

            UPDATE public.payments
            SET 
                amount = COALESCE(v_new_price, amount),
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
END;
$$;

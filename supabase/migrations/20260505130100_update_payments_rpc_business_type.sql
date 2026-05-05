-- Atualiza a função generate_monthly_payments para copiar o business_type
-- do aluno para a tabela de pagamentos.

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
            s.business_type,
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
            es.business_type,
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
            full_price,
            business_type
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
            CASE WHEN cp.is_prorata THEN cp.full_price ELSE NULL END,
            cp.business_type
        FROM calculated_payments cp
        RETURNING 1
    )
    SELECT COUNT(*) INTO v_count FROM inserted;

    RETURN v_count;
END;
$$;

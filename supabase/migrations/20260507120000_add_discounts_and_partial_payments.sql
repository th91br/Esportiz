-- Migration: Add partial payments and student promotional discounts
-- Date: 2026-05-07

-- 1. Alter payments table to support partial payments
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS paid_amount numeric NOT NULL DEFAULT 0;

-- 2. Alter students table to support promotional discounts
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS discount_type text CHECK (discount_type IN ('percentage', 'fixed'));
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS discount_value numeric NOT NULL DEFAULT 0;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS discount_duration_months integer;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS discount_start_month text;

-- 3. Update generate_monthly_payments to dynamically apply active discounts
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
            s.discount_type,
            s.discount_value,
            s.discount_duration_months,
            s.discount_start_month,
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
            -- Calculate base monthly amount (with pro-rata if applicable)
            CASE 
                WHEN es.payment_start_date IS NOT NULL AND TO_CHAR(es.payment_start_date, 'YYYY-MM') = p_month_ref AND EXTRACT(DAY FROM es.payment_start_date) > 1 THEN
                    ROUND(es.amount * ( ( EXTRACT(DAY FROM (DATE_TRUNC('month', es.payment_start_date) + INTERVAL '1 month' - INTERVAL '1 day')) - EXTRACT(DAY FROM es.payment_start_date) + 1 ) / EXTRACT(DAY FROM (DATE_TRUNC('month', es.payment_start_date) + INTERVAL '1 month' - INTERVAL '1 day')) ), 2)
                ELSE
                    es.amount
            END AS base_amount,
            CASE
                WHEN es.payment_start_date IS NOT NULL AND TO_CHAR(es.payment_start_date, 'YYYY-MM') = p_month_ref AND EXTRACT(DAY FROM es.payment_start_date) > 1 THEN
                    TRUE
                ELSE
                    FALSE
            END AS is_prorata,
            es.discount_type,
            es.discount_value,
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
            -- Apply discount if it is currently active
            CASE
                WHEN cp.discount_type IS NOT NULL AND cp.discount_start_month IS NOT NULL AND 
                     ((v_year - CAST(SPLIT_PART(cp.discount_start_month, '-', 1) AS INT)) * 12 + (v_month - CAST(SPLIT_PART(cp.discount_start_month, '-', 2) AS INT))) >= 0 AND 
                     (cp.discount_duration_months IS NULL OR 
                      ((v_year - CAST(SPLIT_PART(cp.discount_start_month, '-', 1) AS INT)) * 12 + (v_month - CAST(SPLIT_PART(cp.discount_start_month, '-', 2) AS INT))) < cp.discount_duration_months)
                THEN
                    CASE
                        WHEN cp.discount_type = 'percentage' THEN
                            ROUND(cp.base_amount * (1.0 - cp.discount_value / 100.0), 2)
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
        RETURNING 1
    )
    SELECT COUNT(*) INTO v_count FROM inserted;

    RETURN v_count;
END;
$$;


-- 4. Update sync_student_unpaid_payments to apply student discounts dynamically when syncing
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
    v_discount_type TEXT;
    v_discount_value NUMERIC;
    v_discount_duration_months INT;
    v_discount_start_month TEXT;
    v_months_diff INT;
    rec RECORD;
    v_user_id UUID;
    v_base_amount NUMERIC;
    v_final_amount NUMERIC;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuário não autenticado';
    END IF;

    -- Verify ownership
    IF NOT EXISTS (SELECT 1 FROM public.students WHERE id = p_student_id AND user_id = v_user_id) THEN
        RAISE EXCEPTION 'Acesso Negado';
    END IF;

    -- Get student's discount configuration
    SELECT 
        discount_type, 
        discount_value, 
        discount_duration_months, 
        discount_start_month 
    INTO 
        v_discount_type, 
        v_discount_value, 
        v_discount_duration_months, 
        v_discount_start_month
    FROM public.students 
    WHERE id = p_student_id AND user_id = v_user_id;

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
                
                -- Determine the base amount (considering pro-rata)
                v_base_amount := CASE 
                    WHEN rec.is_prorata = TRUE AND v_new_price IS NOT NULL AND rec.full_price > 0 THEN
                        ROUND(v_new_price * (rec.amount / rec.full_price), 2)
                    ELSE
                        COALESCE(v_new_price, rec.amount)
                END;

                -- Calculate months diff for discount
                v_months_diff := -1;
                IF v_discount_start_month IS NOT NULL THEN
                    v_months_diff := (v_year - CAST(SPLIT_PART(v_discount_start_month, '-', 1) AS INT)) * 12 + 
                                     (v_month - CAST(SPLIT_PART(v_discount_start_month, '-', 2) AS INT));
                END IF;

                -- Apply discount if active
                IF v_discount_type IS NOT NULL AND v_discount_start_month IS NOT NULL AND v_months_diff >= 0 AND 
                   (v_discount_duration_months IS NULL OR v_months_diff < v_discount_duration_months) 
                THEN
                    IF v_discount_type = 'percentage' THEN
                        v_final_amount := ROUND(v_base_amount * (1.0 - v_discount_value / 100.0), 2);
                    ELSIF v_discount_type = 'fixed' THEN
                        v_final_amount := ROUND(GREATEST(0.0, v_base_amount - v_discount_value), 2);
                    ELSE
                        v_final_amount := v_base_amount;
                    END IF;
                ELSE
                    v_final_amount := v_base_amount;
                END IF;

                UPDATE public.payments
                SET 
                    amount = v_final_amount,
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
        FOR rec IN SELECT id, month_ref, is_prorata, full_price, amount FROM public.payments WHERE student_id = p_student_id AND paid = FALSE AND user_id = v_user_id LOOP
            v_year := CAST(SPLIT_PART(rec.month_ref, '-', 1) AS INT);
            v_month := CAST(SPLIT_PART(rec.month_ref, '-', 2) AS INT);

            -- Determine base amount (if plan price is not changed, we keep rec.amount, but recalculate discount in case discount settings changed!)
            -- To find original plan price, get it from public.plans
            SELECT p.price INTO v_new_price 
            FROM public.students s 
            JOIN public.plans p ON s.plan_id = p.id 
            WHERE s.id = p_student_id AND s.user_id = v_user_id;

            v_base_amount := COALESCE(v_new_price, rec.amount);

            -- Calculate months diff for discount
            v_months_diff := -1;
            IF v_discount_start_month IS NOT NULL THEN
                v_months_diff := (v_year - CAST(SPLIT_PART(v_discount_start_month, '-', 1) AS INT)) * 12 + 
                                 (v_month - CAST(SPLIT_PART(v_discount_start_month, '-', 2) AS INT));
            END IF;

            -- Apply discount if active
            IF v_discount_type IS NOT NULL AND v_discount_start_month IS NOT NULL AND v_months_diff >= 0 AND 
               (v_discount_duration_months IS NULL OR v_months_diff < v_discount_duration_months) 
            THEN
                IF v_discount_type = 'percentage' THEN
                    v_final_amount := ROUND(v_base_amount * (1.0 - v_discount_value / 100.0), 2);
                ELSIF v_discount_type = 'fixed' THEN
                    v_final_amount := ROUND(GREATEST(0.0, v_base_amount - v_discount_value), 2);
                ELSE
                    v_final_amount := v_base_amount;
                END IF;
            ELSE
                v_final_amount := v_base_amount;
            END IF;

            UPDATE public.payments
            SET 
                amount = v_final_amount,
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

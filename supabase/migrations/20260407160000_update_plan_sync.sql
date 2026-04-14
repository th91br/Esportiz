-- Migration for syncing plan updates properly without losing payment continuity

-- Modify existing RPC to UPDATE instead of DELETE when plan changes
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
        -- If changing to a plan that doesn't generate monthly payments (like 'per_session')
        -- we should delete future unpaid recurring payments, as they don't apply.
        IF v_new_plan_billing_type = 'per_session' OR v_new_plan_billing_type IS NULL THEN
            DELETE FROM public.payments 
            WHERE student_id = p_student_id AND paid = FALSE AND user_id = v_user_id;
        ELSE
            -- changing from monthly to monthly -> we purely UPDATE the pending payments!
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

    ELSE
        -- Just changing due date or something else without changing plan_id
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


-- Create new RPC that updates all pending payments for all students of a specific plan when the global plan price changes
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

    -- Get the new price
    SELECT price INTO v_plan_price FROM public.plans WHERE id = p_plan_id AND user_id = v_user_id;

    IF v_plan_price IS NULL THEN
        RETURN;
    END IF;

    -- Update all unpaid payments where plan_id matches
    UPDATE public.payments
    SET amount = v_plan_price
    WHERE plan_id = p_plan_id AND paid = FALSE AND user_id = v_user_id;

END;
$$;

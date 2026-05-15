-- Migration: Harden Student Portal, Sales and Arena Security
-- Date: 2026-05-15
-- Version: 3.0 (Enterprise Hardening)

-- 1. get_student_portal_data: Authentication via CPF + Birth Date
CREATE OR REPLACE FUNCTION public.get_student_portal_data(
    p_cpf TEXT DEFAULT NULL,
    p_birth_date DATE DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_student RECORD;
    v_plan_name TEXT;
    v_school_name TEXT;
    v_groups JSON;
    v_attendance_logs JSON;
    v_attendance_stats JSON;
    v_payments JSON;
    v_total_classes INT := 0;
    v_presences INT := 0;
    v_absences INT := 0;
    v_percent NUMERIC := 100;
BEGIN
    IF p_cpf IS NOT NULL AND p_birth_date IS NOT NULL THEN
        SELECT * INTO v_student FROM public.students 
        WHERE regexp_replace(cpf, '[^0-9]', '', 'g') = regexp_replace(p_cpf, '[^0-9]', '', 'g') 
          AND birth_date = p_birth_date
        LIMIT 1;
    END IF;

    IF v_student IS NULL THEN
        RETURN JSON_BUILD_OBJECT('authenticated', false);
    END IF;

    SELECT name INTO v_plan_name FROM public.plans WHERE id = v_student.plan_id;
    SELECT COALESCE(ct_name, 'Esportiz Club') INTO v_school_name FROM public.profiles WHERE user_id = v_student.user_id;

    SELECT COALESCE(JSON_AGG(JSON_BUILD_OBJECT(
        'id', g.id, 'name', g.name, 'schedule', g.schedule, 'location', g.location
    )), '[]'::JSON) INTO v_groups
    FROM public.groups g
    JOIN public.group_students gs ON gs.group_id = g.id
    WHERE gs.student_id = v_student.id;

    SELECT COUNT(*), COUNT(CASE WHEN status = 'present' THEN 1 END), COUNT(CASE WHEN status = 'absent' THEN 1 END)
    INTO v_total_classes, v_presences, v_absences
    FROM public.attendance WHERE student_id = v_student.id;

    IF v_total_classes > 0 THEN
        v_percent := ROUND((v_presences::NUMERIC / v_total_classes::NUMERIC) * 100, 1);
    END IF;

    SELECT JSON_BUILD_OBJECT('total_classes', v_total_classes, 'presences', v_presences, 'absences', v_absences, 'percent', v_percent) INTO v_attendance_stats;

    SELECT COALESCE(JSON_AGG(JSON_BUILD_OBJECT(
        'id', id, 'amount', amount, 'paid_amount', paid_amount, 'paid', paid, 'due_date', due_date, 'paid_at', paid_at, 'month_ref', month_ref
    ) ORDER BY due_date DESC), '[]'::JSON) INTO v_payments
    FROM public.payments WHERE student_id = v_student.id;

    SELECT COALESCE(JSON_AGG(JSON_BUILD_OBJECT(
        'date', date, 'status', status, 'notes', notes
    ) ORDER BY date DESC), '[]'::JSON) INTO v_attendance_logs
    FROM public.attendance WHERE student_id = v_student.id;

    RETURN JSON_BUILD_OBJECT(
        'authenticated', true,
        'student', JSON_BUILD_OBJECT(
            'id', v_student.id, 'name', v_student.name, 'cpf', v_student.cpf, 'email', v_student.email, 'phone', v_student.phone,
            'plan_name', COALESCE(v_plan_name, 'Nenhum curso associado'), 'school_name', v_school_name, 'owner_id', v_student.user_id
        ),
        'groups', v_groups, 'attendance_stats', v_attendance_stats, 'attendance_logs', v_attendance_logs, 'payments', v_payments
    );
END;
$$;

-- 2. submit_public_enrollment: Secure public enrollment with ownership validation
CREATE OR REPLACE FUNCTION public.submit_public_enrollment(
    p_user_id UUID,
    p_name TEXT,
    p_cpf TEXT,
    p_birth_date DATE,
    p_email TEXT,
    p_phone TEXT,
    p_plan_id UUID,
    p_group_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_student_id UUID;
    v_business_type TEXT;
    v_plan_valid BOOLEAN;
    v_group_valid BOOLEAN;
BEGIN
    -- 1. Validate Profile and Get Business Type
    SELECT business_type INTO v_business_type FROM public.profiles WHERE user_id = p_user_id;
    IF v_business_type IS NULL THEN
        RETURN JSON_BUILD_OBJECT('success', false, 'error', 'Escola não encontrada.');
    END IF;

    -- 2. Validate Plan ownership and business type
    SELECT EXISTS (
        SELECT 1 FROM public.plans 
        WHERE id = p_plan_id AND user_id = p_user_id AND business_type = v_business_type
    ) INTO v_plan_valid;
    
    IF NOT v_plan_valid THEN
        RETURN JSON_BUILD_OBJECT('success', false, 'error', 'Plano inválido para esta escola.');
    END IF;

    -- 3. Validate Group (if provided)
    IF p_group_id IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM public.groups 
            WHERE id = p_group_id AND user_id = p_user_id AND business_type = v_business_type AND active = true
        ) INTO v_group_valid;
        
        IF NOT v_group_valid THEN
            RETURN JSON_BUILD_OBJECT('success', false, 'error', 'Turma inválida ou inativa.');
        END IF;
    END IF;

    -- 4. Check for duplicate CPF in the same school
    IF EXISTS (
        SELECT 1 FROM public.students 
        WHERE regexp_replace(cpf, '[^0-9]', '', 'g') = regexp_replace(p_cpf, '[^0-9]', '', 'g') AND user_id = p_user_id
    ) THEN
        RETURN JSON_BUILD_OBJECT('success', false, 'error', 'CPF já cadastrado nesta unidade.');
    END IF;

    -- 5. Insert Student
    INSERT INTO public.students (
        user_id, name, cpf, birth_date, email, phone, plan_id, active, business_type, join_date, payment_due_day
    ) VALUES (
        p_user_id, p_name, p_cpf, p_birth_date, p_email, p_phone, p_plan_id, true, v_business_type, CURRENT_DATE, 10
    ) RETURNING id INTO v_student_id;

    -- 6. Associate with Group
    IF p_group_id IS NOT NULL THEN
        INSERT INTO public.group_students (group_id, student_id, user_id)
        VALUES (p_group_id, v_student_id, p_user_id);
    END IF;

    -- 7. Trigger Payment Generation for the month
    PERFORM public.generate_monthly_payments(TO_CHAR(CURRENT_DATE, 'YYYY-MM'));

    RETURN JSON_BUILD_OBJECT('success', true, 'student_id', v_student_id, 'message', 'Matrícula concluída com sucesso!');
END;
$$;

-- 3. process_sale: ATOMIC PDV sale with SERVER-SIDE PRICE validation
CREATE OR REPLACE FUNCTION public.process_sale(
    p_user_id UUID,
    p_product_id UUID,
    p_product_name TEXT,
    p_quantity INTEGER,
    p_unit_price NUMERIC, -- Kept for interface compatibility but IGNORED for calculation
    p_total NUMERIC,      -- Kept for interface compatibility but IGNORED for calculation
    p_payment_method TEXT,
    p_business_type TEXT DEFAULT 'sport_school'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_product_record RECORD;
    v_sale_id UUID;
    v_real_unit_price NUMERIC;
    v_calculated_total NUMERIC;
BEGIN
    -- 1. REQUIRE AUTHENTICATED USER
    IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    -- 2. Fetch Source of Truth for Price and Stock
    SELECT price, track_stock, stock_quantity, business_type, name 
    INTO v_product_record 
    FROM public.products 
    WHERE id = p_product_id AND user_id = p_user_id AND business_type = p_business_type;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Produto não encontrado ou acesso negado.';
    END IF;

    -- 3. Calculate Totals on Server
    v_real_unit_price := v_product_record.price;
    v_calculated_total := v_real_unit_price * p_quantity;

    -- 4. Atomic Stock Check and Decrement
    IF v_product_record.track_stock THEN
        UPDATE public.products 
        SET stock_quantity = stock_quantity - p_quantity 
        WHERE id = p_product_id 
          AND user_id = p_user_id 
          AND stock_quantity >= p_quantity;
        
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Estoque insuficiente para o produto: %', v_product_record.name;
        END IF;
    END IF;

    -- 5. Insert Sale with server-side values
    INSERT INTO public.sales (
        user_id, product_id, product_name, quantity, unit_price, total, payment_method, business_type, sold_at
    ) VALUES (
        p_user_id, p_product_id, v_product_record.name, p_quantity, v_real_unit_price, v_calculated_total, p_payment_method, p_business_type, NOW()
    ) RETURNING id INTO v_sale_id;

    RETURN JSON_BUILD_OBJECT('success', true, 'sale_id', v_sale_id, 'calculated_total', v_calculated_total);
END;
$$;

-- 4. delete_sale_and_restore_stock: Atomic restoration
CREATE OR REPLACE FUNCTION public.delete_sale_and_restore_stock(
    p_sale_id UUID,
    p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_sale_record RECORD;
BEGIN
    IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    SELECT * INTO v_sale_record FROM public.sales WHERE id = p_sale_id AND user_id = p_user_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Venda não encontrada.';
    END IF;

    IF v_sale_record.product_id IS NOT NULL THEN
        UPDATE public.products
        SET stock_quantity = stock_quantity + v_sale_record.quantity
        WHERE id = v_sale_record.product_id AND track_stock = true;
    END IF;

    DELETE FROM public.sales WHERE id = p_sale_id;
    RETURN JSON_BUILD_OBJECT('success', true);
END;
$$;

-- 5. submit_public_reservation: Arena Overlap Protection
CREATE OR REPLACE FUNCTION public.submit_public_reservation(
    p_user_id UUID,
    p_court_id UUID,
    p_date DATE,
    p_time TEXT,
    p_duration_minutes INTEGER,
    p_client_name TEXT,
    p_client_phone TEXT,
    p_client_email TEXT,
    p_client_cpf TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_student_id UUID;
    v_training_id UUID;
    v_new_start TIME;
    v_new_end TIME;
    v_court_record RECORD;
BEGIN
    IF p_duration_minutes NOT IN (60, 90, 120) THEN
        RETURN JSON_BUILD_OBJECT('success', false, 'error', 'Duração inválida.');
    END IF;

    IF p_date < CURRENT_DATE THEN
        RETURN JSON_BUILD_OBJECT('success', false, 'error', 'Data no passado.');
    END IF;

    SELECT * INTO v_court_record FROM public.modalities WHERE id = p_court_id AND user_id = p_user_id AND business_type = 'arena';
    IF NOT FOUND THEN
        RETURN JSON_BUILD_OBJECT('success', false, 'error', 'Quadra inválida.');
    END IF;

    v_new_start := p_time::TIME;
    v_new_end := (p_time::TIME + (p_duration_minutes || ' minutes')::INTERVAL);

    IF EXISTS (
        SELECT 1 FROM public.trainings
        WHERE modality_id = p_court_id AND date = p_date AND COALESCE((metadata::jsonb->>'status'), 'confirmed') <> 'cancelled'
          AND ((time::TIME < v_new_end) AND ((time::TIME + (COALESCE(duration_minutes, 60) || ' minutes')::INTERVAL) > v_new_start))
    ) THEN
        RETURN JSON_BUILD_OBJECT('success', false, 'error', 'Conflito de horário.');
    END IF;

    SELECT id INTO v_student_id FROM public.students WHERE user_id = p_user_id AND regexp_replace(cpf, '[^0-9]', '', 'g') = regexp_replace(p_client_cpf, '[^0-9]', '', 'g') LIMIT 1;
    IF v_student_id IS NULL THEN
        INSERT INTO public.students (user_id, name, cpf, email, phone, active, business_type, join_date)
        VALUES (p_user_id, p_client_name, p_client_cpf, p_client_email, p_client_phone, true, 'arena', CURRENT_DATE)
        RETURNING id INTO v_student_id;
    END IF;

    INSERT INTO public.trainings (user_id, business_type, date, time, modality_id, duration_minutes, completed, metadata, notes)
    VALUES (p_user_id, 'arena', p_date, p_time, p_court_id, p_duration_minutes, false, 
        JSONB_BUILD_OBJECT('status', 'confirmed', 'online', true), 'Agendamento Online')
    RETURNING id INTO v_training_id;

    INSERT INTO public.training_students (training_id, student_id, user_id) VALUES (v_training_id, v_student_id, p_user_id);

    RETURN JSON_BUILD_OBJECT('success', true, 'message', 'Agendamento realizado!');
END;
$$;

-- Migration: Add online enrollment and student portal functions (Segmented by Business Type - Fixed Profiles column names)
-- Date: 2026-05-07

-- 1. Fetch public enrollment configuration (courses/plans + groups) for a given CT Owner ID
CREATE OR REPLACE FUNCTION public.get_public_enrollment_data(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_plans JSON;
    v_groups JSON;
    v_result JSON;
    v_school_name TEXT;
    v_business_type TEXT;
BEGIN
    -- Get school details and active business profile (using user_id and ct_name)
    SELECT COALESCE(ct_name, 'Esportiz Club'), COALESCE(business_type, 'sport_school') 
    INTO v_school_name, v_business_type 
    FROM public.profiles 
    WHERE user_id = p_user_id;

    -- Query plans belonging to this user and matching their active business profile
    SELECT COALESCE(JSON_AGG(JSON_BUILD_OBJECT(
        'id', id,
        'name', name,
        'price', price
    )), '[]'::JSON) INTO v_plans
    FROM public.plans
    WHERE user_id = p_user_id AND business_type = v_business_type;

    -- Query groups belonging to this user and matching their active business profile
    SELECT COALESCE(JSON_AGG(JSON_BUILD_OBJECT(
        'id', g.id,
        'name', g.name,
        'schedule', g.schedule,
        'location', g.location,
        'max_students', g.max_students,
        'current_students', (SELECT COUNT(*) FROM public.group_students gs WHERE gs.group_id = g.id)
    )), '[]'::JSON) INTO v_groups
    FROM public.groups g
    WHERE g.user_id = p_user_id AND g.business_type = v_business_type AND g.active = true;

    SELECT JSON_BUILD_OBJECT(
        'school_name', v_school_name,
        'plans', v_plans,
        'groups', v_groups
    ) INTO v_result;

    RETURN v_result;
END;
$$;


-- 2. Process an anonymous student registration and automatically link to group and generate payments
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
AS $$
DECLARE
    v_student_id UUID;
    v_current_count INTEGER;
    v_max_students INTEGER;
    v_business_type TEXT;
BEGIN
    -- Check for CPF duplication under the same tenant
    IF EXISTS (
        SELECT 1 FROM public.students 
        WHERE regexp_replace(cpf, '[^0-9]', '', 'g') = regexp_replace(p_cpf, '[^0-9]', '', 'g') AND user_id = p_user_id
    ) THEN
        RETURN JSON_BUILD_OBJECT('success', false, 'error', 'CPF já cadastrado nesta escola.');
    END IF;

    -- Validate group capacity if group selected
    IF p_group_id IS NOT NULL THEN
        SELECT max_students INTO v_max_students FROM public.groups WHERE id = p_group_id;
        IF v_max_students IS NOT NULL THEN
            SELECT COUNT(*) INTO v_current_count FROM public.group_students WHERE group_id = p_group_id;
            IF v_current_count >= v_max_students THEN
                RETURN JSON_BUILD_OBJECT('success', false, 'error', 'Capacidade esgotada para esta turma.');
            END IF;
        END IF;
    END IF;

    -- Get business type of the school owner from profiles table (using user_id instead of id)
    SELECT COALESCE(business_type, 'other') INTO v_business_type FROM public.profiles WHERE user_id = p_user_id;

    -- Insert student record
    INSERT INTO public.students (
        user_id,
        name,
        cpf,
        birth_date,
        email,
        phone,
        plan_id,
        active,
        payment_due_day,
        payment_start_date,
        business_type
    ) VALUES (
        p_user_id,
        p_name,
        p_cpf,
        p_birth_date,
        p_email,
        p_phone,
        p_plan_id,
        true,
        10, -- default due day
        CURRENT_DATE,
        v_business_type
    ) RETURNING id INTO v_student_id;

    -- Associate with group
    IF p_group_id IS NOT NULL THEN
        INSERT INTO public.group_students (
            group_id,
            student_id,
            user_id
        ) VALUES (
            p_group_id,
            v_student_id,
            p_user_id
        );
    END IF;

    -- Trigger payment generation for the current month
    PERFORM public.generate_monthly_payments(TO_CHAR(CURRENT_DATE, 'YYYY-MM'));

    RETURN JSON_BUILD_OBJECT(
        'success', true, 
        'student_id', v_student_id,
        'message', 'Matrícula efetuada com sucesso!'
    );
END;
$$;


-- 3. Retrieve secure profile details, attendance metrics, and payment records for Student Portal
CREATE OR REPLACE FUNCTION public.get_student_portal_data(
    p_student_id UUID DEFAULT NULL,
    p_cpf TEXT DEFAULT NULL,
    p_birth_date DATE DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
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
    -- Identify student
    IF p_student_id IS NOT NULL THEN
        SELECT * INTO v_student FROM public.students WHERE id = p_student_id;
    ELSIF p_cpf IS NOT NULL AND p_birth_date IS NOT NULL THEN
        SELECT * INTO v_student FROM public.students 
        WHERE regexp_replace(cpf, '[^0-9]', '', 'g') = regexp_replace(p_cpf, '[^0-9]', '', 'g') 
          AND birth_date = p_birth_date
        LIMIT 1;
    END IF;

    IF v_student IS NULL THEN
        RETURN JSON_BUILD_OBJECT('authenticated', false);
    END IF;

    -- Fetch Plan and School name
    SELECT name INTO v_plan_name FROM public.plans WHERE id = v_student.plan_id;
    SELECT COALESCE(ct_name, 'Esportiz Club') INTO v_school_name FROM public.profiles WHERE user_id = v_student.user_id;

    -- Fetch Student Groups
    SELECT COALESCE(JSON_AGG(JSON_BUILD_OBJECT(
        'id', g.id,
        'name', g.name,
        'schedule', g.schedule,
        'location', g.location
    )), '[]'::JSON) INTO v_groups
    FROM public.groups g
    JOIN public.group_students gs ON gs.group_id = g.id
    WHERE gs.student_id = v_student.id;

    -- Calculate Attendance Stats
    SELECT COUNT(*), 
           COUNT(CASE WHEN status = 'present' THEN 1 END),
           COUNT(CASE WHEN status = 'absent' THEN 1 END)
    INTO v_total_classes, v_presences, v_absences
    FROM public.attendance
    WHERE student_id = v_student.id;

    IF v_total_classes > 0 THEN
        v_percent := ROUND((v_presences::NUMERIC / v_total_classes::NUMERIC) * 100, 1);
    END IF;

    SELECT JSON_BUILD_OBJECT(
        'total_classes', v_total_classes,
        'presences', v_presences,
        'absences', v_absences,
        'percent', v_percent
    ) INTO v_attendance_stats;

    -- Fetch Payments
    SELECT COALESCE(JSON_AGG(JSON_BUILD_OBJECT(
        'id', id,
        'amount', amount,
        'paid_amount', paid_amount,
        'paid', paid,
        'due_date', due_date,
        'paid_at', paid_at,
        'month_ref', month_ref
    ) ORDER BY due_date DESC), '[]'::JSON) INTO v_payments;

    -- Fetch Attendance Logs
    SELECT COALESCE(JSON_AGG(JSON_BUILD_OBJECT(
        'date', date,
        'status', status,
        'notes', notes
    ) ORDER BY date DESC), '[]'::JSON) INTO v_attendance_logs
    FROM public.attendance
    WHERE student_id = v_student.id;

    -- Combine results
    RETURN JSON_BUILD_OBJECT(
        'authenticated', true,
        'student', JSON_BUILD_OBJECT(
            'id', v_student.id,
            'name', v_student.name,
            'cpf', v_student.cpf,
            'email', v_student.email,
            'phone', v_student.phone,
            'plan_name', COALESCE(v_plan_name, 'Nenhum curso associado'),
            'school_name', v_school_name,
            'owner_id', v_student.user_id
        ),
        'groups', v_groups,
        'attendance_stats', v_attendance_stats,
        'attendance_logs', v_attendance_logs,
        'payments', v_payments
    );
END;
$$;

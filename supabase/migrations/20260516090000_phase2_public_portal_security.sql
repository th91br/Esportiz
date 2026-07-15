-- Phase 2: harden public portals without changing admin flows.
-- Focus:
-- - Remove legacy student portal access by student_id token.
-- - Scope student portal by tenant when ct is provided.
-- - Return payment configuration only after student authentication.
-- - Validate public enrollment and booking inputs on the server.

ALTER TABLE public.trainings
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.modalities
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION public.is_valid_cpf(p_cpf TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
    v_cpf TEXT := regexp_replace(COALESCE(p_cpf, ''), '[^0-9]', '', 'g');
    v_sum INTEGER := 0;
    v_digit INTEGER;
    v_index INTEGER;
BEGIN
    IF length(v_cpf) <> 11 OR v_cpf ~ '^(\d)\1{10}$' THEN
        RETURN false;
    END IF;

    FOR v_index IN 1..9 LOOP
        v_sum := v_sum + substring(v_cpf, v_index, 1)::INTEGER * (11 - v_index);
    END LOOP;

    v_digit := 11 - (v_sum % 11);
    IF v_digit >= 10 THEN
        v_digit := 0;
    END IF;

    IF v_digit <> substring(v_cpf, 10, 1)::INTEGER THEN
        RETURN false;
    END IF;

    v_sum := 0;
    FOR v_index IN 1..10 LOOP
        v_sum := v_sum + substring(v_cpf, v_index, 1)::INTEGER * (12 - v_index);
    END LOOP;

    v_digit := 11 - (v_sum % 11);
    IF v_digit >= 10 THEN
        v_digit := 0;
    END IF;

    RETURN v_digit = substring(v_cpf, 11, 1)::INTEGER;
END;
$$;

DROP FUNCTION IF EXISTS public.get_student_portal_data(UUID, TEXT, DATE);
DROP FUNCTION IF EXISTS public.get_student_portal_data(TEXT, DATE);

CREATE OR REPLACE FUNCTION public.get_student_portal_data(
    p_cpf TEXT DEFAULT NULL,
    p_birth_date DATE DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_student RECORD;
    v_matches INTEGER := 0;
    v_plan_name TEXT;
    v_school_name TEXT;
    v_pix_key TEXT;
    v_pix_receiver TEXT;
    v_groups JSON;
    v_attendance_logs JSON;
    v_attendance_stats JSON;
    v_payments JSON;
    v_total_classes INT := 0;
    v_presences INT := 0;
    v_absences INT := 0;
    v_percent NUMERIC := 100;
BEGIN
    IF p_birth_date IS NULL OR p_birth_date > CURRENT_DATE OR NOT public.is_valid_cpf(p_cpf) THEN
        RETURN JSON_BUILD_OBJECT('authenticated', false);
    END IF;

    SELECT COUNT(*) INTO v_matches
    FROM public.students s
    WHERE regexp_replace(COALESCE(s.cpf, ''), '[^0-9]', '', 'g') = regexp_replace(COALESCE(p_cpf, ''), '[^0-9]', '', 'g')
      AND s.birth_date = p_birth_date
      AND s.active = true
      AND (p_user_id IS NULL OR s.user_id = p_user_id);

    IF v_matches <> 1 THEN
        RETURN JSON_BUILD_OBJECT('authenticated', false);
    END IF;

    SELECT * INTO v_student
    FROM public.students s
    WHERE regexp_replace(COALESCE(s.cpf, ''), '[^0-9]', '', 'g') = regexp_replace(COALESCE(p_cpf, ''), '[^0-9]', '', 'g')
      AND s.birth_date = p_birth_date
      AND s.active = true
      AND (p_user_id IS NULL OR s.user_id = p_user_id)
    ORDER BY s.created_at DESC
    LIMIT 1;

    SELECT p.name INTO v_plan_name
    FROM public.plans p
    WHERE p.id = v_student.plan_id
      AND p.user_id = v_student.user_id;

    SELECT
        COALESCE(p.ct_name, 'Esportiz Club'),
        NULLIF(p.pix_key, ''),
        NULLIF(p.pix_receiver, '')
    INTO v_school_name, v_pix_key, v_pix_receiver
    FROM public.profiles p
    WHERE p.user_id = v_student.user_id;

    SELECT COALESCE(JSON_AGG(JSON_BUILD_OBJECT(
        'id', g.id,
        'name', g.name,
        'schedule', g.schedule,
        'location', g.location
    )), '[]'::JSON) INTO v_groups
    FROM public.groups g
    JOIN public.group_students gs ON gs.group_id = g.id
    WHERE gs.student_id = v_student.id
      AND gs.user_id = v_student.user_id;

    SELECT
        COUNT(*),
        COUNT(CASE WHEN present = true THEN 1 END),
        COUNT(CASE WHEN present = false THEN 1 END)
    INTO v_total_classes, v_presences, v_absences
    FROM public.attendance
    WHERE student_id = v_student.id
      AND user_id = v_student.user_id;

    IF v_total_classes > 0 THEN
        v_percent := ROUND((v_presences::NUMERIC / v_total_classes::NUMERIC) * 100, 1);
    END IF;

    SELECT JSON_BUILD_OBJECT(
        'total_classes', v_total_classes,
        'presences', v_presences,
        'absences', v_absences,
        'percent', v_percent
    ) INTO v_attendance_stats;

    SELECT COALESCE(JSON_AGG(JSON_BUILD_OBJECT(
        'id', id,
        'amount', amount,
        'paid_amount', paid_amount,
        'paid', paid,
        'due_date', due_date,
        'paid_at', paid_at,
        'month_ref', month_ref
    ) ORDER BY due_date DESC), '[]'::JSON) INTO v_payments
    FROM public.payments
    WHERE student_id = v_student.id
      AND user_id = v_student.user_id
      AND (full_price IS NULL OR full_price <> -1);

    SELECT COALESCE(JSON_AGG(JSON_BUILD_OBJECT(
        'date', date,
        'status', CASE WHEN present = true THEN 'present' ELSE 'absent' END,
        'notes', NULL
    ) ORDER BY date DESC), '[]'::JSON) INTO v_attendance_logs
    FROM public.attendance
    WHERE student_id = v_student.id
      AND user_id = v_student.user_id;

    RETURN JSON_BUILD_OBJECT(
        'authenticated', true,
        'student', JSON_BUILD_OBJECT(
            'id', v_student.id,
            'name', v_student.name,
            'plan_name', COALESCE(v_plan_name, 'Nenhum curso associado'),
            'school_name', COALESCE(v_school_name, 'Esportiz Club')
        ),
        'payment_config', JSON_BUILD_OBJECT(
            'pix_key', v_pix_key,
            'pix_receiver', v_pix_receiver
        ),
        'groups', v_groups,
        'attendance_stats', v_attendance_stats,
        'attendance_logs', v_attendance_logs,
        'payments', v_payments
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_student_portal_data(TEXT, DATE, UUID) TO anon, authenticated;

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
    v_max_students INTEGER;
    v_current_count INTEGER;
    v_clean_name TEXT := left(regexp_replace(trim(COALESCE(p_name, '')), '\s+', ' ', 'g'), 120);
    v_clean_email TEXT := lower(left(trim(COALESCE(p_email, '')), 254));
    v_phone_digits TEXT := regexp_replace(COALESCE(p_phone, ''), '[^0-9]', '', 'g');
BEGIN
    IF p_user_id IS NULL THEN
        RETURN JSON_BUILD_OBJECT('success', false, 'error', 'Link de matricula invalido.');
    END IF;

    IF length(v_clean_name) < 3 THEN
        RETURN JSON_BUILD_OBJECT('success', false, 'error', 'Nome invalido.');
    END IF;

    IF NOT public.is_valid_cpf(p_cpf) THEN
        RETURN JSON_BUILD_OBJECT('success', false, 'error', 'CPF invalido.');
    END IF;

    IF p_birth_date IS NULL OR p_birth_date > CURRENT_DATE THEN
        RETURN JSON_BUILD_OBJECT('success', false, 'error', 'Data de nascimento invalida.');
    END IF;

    IF v_clean_email !~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$' THEN
        RETURN JSON_BUILD_OBJECT('success', false, 'error', 'E-mail invalido.');
    END IF;

    IF length(v_phone_digits) NOT IN (10, 11) THEN
        RETURN JSON_BUILD_OBJECT('success', false, 'error', 'Telefone invalido.');
    END IF;

    SELECT business_type INTO v_business_type
    FROM public.profiles
    WHERE user_id = p_user_id;

    IF v_business_type IS NULL THEN
        RETURN JSON_BUILD_OBJECT('success', false, 'error', 'Escola nao encontrada.');
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM public.plans
        WHERE id = p_plan_id
          AND user_id = p_user_id
          AND business_type = v_business_type
    ) INTO v_plan_valid;

    IF NOT v_plan_valid THEN
        RETURN JSON_BUILD_OBJECT('success', false, 'error', 'Plano invalido para esta escola.');
    END IF;

    IF p_group_id IS NOT NULL THEN
        SELECT max_students INTO v_max_students
        FROM public.groups
        WHERE id = p_group_id
          AND user_id = p_user_id
          AND business_type = v_business_type
          AND active = true
        FOR UPDATE;

        IF NOT FOUND THEN
            RETURN JSON_BUILD_OBJECT('success', false, 'error', 'Turma invalida ou inativa.');
        END IF;

        IF v_max_students IS NOT NULL THEN
            SELECT COUNT(*) INTO v_current_count
            FROM public.group_students
            WHERE group_id = p_group_id;

            IF v_current_count >= v_max_students THEN
                RETURN JSON_BUILD_OBJECT('success', false, 'error', 'Capacidade esgotada para esta turma.');
            END IF;
        END IF;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.students
        WHERE regexp_replace(COALESCE(cpf, ''), '[^0-9]', '', 'g') = regexp_replace(COALESCE(p_cpf, ''), '[^0-9]', '', 'g')
          AND user_id = p_user_id
    ) THEN
        RETURN JSON_BUILD_OBJECT('success', false, 'error', 'CPF ja cadastrado nesta unidade.');
    END IF;

    INSERT INTO public.students (
        user_id,
        name,
        cpf,
        birth_date,
        email,
        phone,
        plan_id,
        active,
        business_type,
        join_date,
        payment_start_date,
        payment_due_day
    ) VALUES (
        p_user_id,
        v_clean_name,
        p_cpf,
        p_birth_date,
        v_clean_email,
        p_phone,
        p_plan_id,
        true,
        v_business_type,
        CURRENT_DATE,
        CURRENT_DATE,
        10
    ) RETURNING id INTO v_student_id;

    IF p_group_id IS NOT NULL THEN
        INSERT INTO public.group_students (group_id, student_id, user_id)
        VALUES (p_group_id, v_student_id, p_user_id);
    END IF;

    BEGIN
        PERFORM public.generate_monthly_payments(TO_CHAR(CURRENT_DATE, 'YYYY-MM'));
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    RETURN JSON_BUILD_OBJECT(
        'success', true,
        'student_id', v_student_id,
        'message', 'Matricula concluida com sucesso!'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_public_enrollment(UUID, TEXT, TEXT, DATE, TEXT, TEXT, UUID, UUID) TO anon, authenticated;

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
    v_court_meta JSONB := '{}'::jsonb;
    v_hourly_price NUMERIC := 80;
    v_use_peak BOOLEAN := false;
    v_peak_price NUMERIC := 0;
    v_peak_start TIME := '18:00';
    v_peak_end TIME := '22:00';
    v_opening_time TIME := '07:00';
    v_closing_time TIME := '23:00';
    v_final_hourly NUMERIC;
    v_calculated_price NUMERIC;
    v_meta JSONB;
    v_clean_name TEXT := left(regexp_replace(trim(COALESCE(p_client_name, '')), '\s+', ' ', 'g'), 120);
    v_clean_email TEXT := lower(left(trim(COALESCE(p_client_email, '')), 254));
    v_phone_digits TEXT := regexp_replace(COALESCE(p_client_phone, ''), '[^0-9]', '', 'g');
BEGIN
    IF p_user_id IS NULL THEN
        RETURN JSON_BUILD_OBJECT('success', false, 'error', 'Link de agendamento invalido.');
    END IF;

    IF length(v_clean_name) < 3 THEN
        RETURN JSON_BUILD_OBJECT('success', false, 'error', 'Nome invalido.');
    END IF;

    IF NOT public.is_valid_cpf(p_client_cpf) THEN
        RETURN JSON_BUILD_OBJECT('success', false, 'error', 'CPF invalido.');
    END IF;

    IF v_clean_email !~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$' THEN
        RETURN JSON_BUILD_OBJECT('success', false, 'error', 'E-mail invalido.');
    END IF;

    IF length(v_phone_digits) NOT IN (10, 11) THEN
        RETURN JSON_BUILD_OBJECT('success', false, 'error', 'Telefone invalido.');
    END IF;

    IF p_duration_minutes NOT IN (60, 90, 120) THEN
        RETURN JSON_BUILD_OBJECT('success', false, 'error', 'Duracao invalida.');
    END IF;

    IF p_date IS NULL OR p_date < CURRENT_DATE THEN
        RETURN JSON_BUILD_OBJECT('success', false, 'error', 'Data invalida.');
    END IF;

    IF COALESCE(p_time, '') !~ '^(?:[01][0-9]|2[0-3]):[0-5][0-9]$' THEN
        RETURN JSON_BUILD_OBJECT('success', false, 'error', 'Horario invalido.');
    END IF;

    SELECT * INTO v_court_record
    FROM public.modalities
    WHERE id = p_court_id
      AND user_id = p_user_id
      AND business_type = 'arena';

    IF NOT FOUND THEN
        RETURN JSON_BUILD_OBJECT('success', false, 'error', 'Quadra invalida.');
    END IF;

    BEGIN
        v_court_meta := COALESCE(v_court_record.metadata::jsonb, '{}'::jsonb);
        v_hourly_price := COALESCE((v_court_meta->>'pricePerHour')::NUMERIC, 80);
        v_use_peak := COALESCE((v_court_meta->>'usePeakPricing')::BOOLEAN, false);
        v_peak_price := COALESCE((v_court_meta->>'peakPrice')::NUMERIC, 0);
        v_peak_start := COALESCE(v_court_meta->>'peakStart', '18:00')::TIME;
        v_peak_end := COALESCE(v_court_meta->>'peakEnd', '22:00')::TIME;
        v_opening_time := COALESCE(v_court_meta->>'openingTime', '07:00')::TIME;
        v_closing_time := COALESCE(v_court_meta->>'closingTime', '23:00')::TIME;
    EXCEPTION WHEN OTHERS THEN
        v_court_meta := '{}'::jsonb;
        v_hourly_price := 80;
        v_use_peak := false;
        v_peak_price := 0;
        v_peak_start := '18:00';
        v_peak_end := '22:00';
        v_opening_time := '07:00';
        v_closing_time := '23:00';
    END;

    v_new_start := p_time::TIME;
    v_new_end := (p_time::TIME + (p_duration_minutes || ' minutes')::INTERVAL);

    IF v_new_start < v_opening_time OR v_new_end > v_closing_time THEN
        RETURN JSON_BUILD_OBJECT('success', false, 'error', 'Horario fora do funcionamento da quadra.');
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.trainings t
        WHERE t.user_id = p_user_id
          AND t.business_type = 'arena'
          AND t.modality_id = p_court_id
          AND t.date = p_date
          AND COALESCE((t.metadata::jsonb->>'status'), 'confirmed') <> 'cancelled'
          AND ((t.time::TIME < v_new_end) AND ((t.time::TIME + (COALESCE(t.duration_minutes, 60) || ' minutes')::INTERVAL) > v_new_start))
    ) THEN
        RETURN JSON_BUILD_OBJECT('success', false, 'error', 'Conflito de horario.');
    END IF;

    IF v_use_peak AND v_peak_price > 0 AND v_new_start >= v_peak_start AND v_new_start < v_peak_end THEN
        v_final_hourly := v_peak_price;
    ELSE
        v_final_hourly := v_hourly_price;
    END IF;

    v_calculated_price := (v_final_hourly * p_duration_minutes) / 60.0;

    SELECT id INTO v_student_id
    FROM public.students
    WHERE user_id = p_user_id
      AND regexp_replace(COALESCE(cpf, ''), '[^0-9]', '', 'g') = regexp_replace(COALESCE(p_client_cpf, ''), '[^0-9]', '', 'g')
    LIMIT 1;

    IF v_student_id IS NULL THEN
        INSERT INTO public.students (user_id, name, cpf, email, phone, active, business_type, join_date)
        VALUES (p_user_id, v_clean_name, p_client_cpf, v_clean_email, p_client_phone, true, 'arena', CURRENT_DATE)
        RETURNING id INTO v_student_id;
    END IF;

    v_meta := JSONB_BUILD_OBJECT(
        'price', v_calculated_price,
        'discount', 0,
        'finalPrice', v_calculated_price,
        'reservationType', 'avulsa',
        'paymentMethod', 'pix',
        'paymentStatus', 'pending',
        'status', 'confirmed',
        'online', true
    );

    INSERT INTO public.trainings (
        user_id,
        business_type,
        date,
        time,
        modality_id,
        duration_minutes,
        completed,
        metadata,
        notes
    ) VALUES (
        p_user_id,
        'arena',
        p_date,
        p_time,
        p_court_id,
        p_duration_minutes,
        false,
        v_meta,
        'Agendamento Online'
    ) RETURNING id INTO v_training_id;

    INSERT INTO public.training_students (training_id, student_id, user_id)
    VALUES (v_training_id, v_student_id, p_user_id);

    RETURN JSON_BUILD_OBJECT(
        'success', true,
        'reservation_id', v_training_id,
        'message', 'Agendamento realizado!'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_public_reservation(UUID, UUID, DATE, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

-- Phase 2.12.6: organization-aware public portal RPCs.
-- Safe, compatible migration:
-- - Keeps the same RPC signatures currently used by the frontend.
-- - Preserves public anon access where required.
-- - Requires a tenant owner id for the student portal to avoid cross-tenant CPF/date lookup.
-- - Filters public Arena data and reservations by owner user_id + organization_id.
-- - Inserts public reservations with organization_id aligned across students/trainings/training_students.
-- - Does not alter tables and does not modify existing data by itself.

CREATE OR REPLACE FUNCTION public.get_student_portal_data(
    p_cpf TEXT DEFAULT NULL,
    p_birth_date DATE DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $phase2126_student_portal$
DECLARE
    v_profile RECORD;
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
    v_clean_cpf TEXT;
BEGIN
    IF p_user_id IS NULL
       OR p_birth_date IS NULL
       OR p_birth_date > CURRENT_DATE
       OR NOT public.is_valid_cpf(p_cpf)
    THEN
        RETURN JSON_BUILD_OBJECT('authenticated', false);
    END IF;

    v_clean_cpf := regexp_replace(COALESCE(p_cpf, ''), '[^0-9]', '', 'g');

    SELECT user_id, organization_id, ct_name, pix_key, pix_receiver
    INTO v_profile
    FROM public.profiles
    WHERE user_id = p_user_id
      AND organization_id IS NOT NULL
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN JSON_BUILD_OBJECT('authenticated', false);
    END IF;

    SELECT COUNT(*) INTO v_matches
    FROM public.students s
    WHERE s.user_id = v_profile.user_id
      AND s.organization_id = v_profile.organization_id
      AND regexp_replace(COALESCE(s.cpf, ''), '[^0-9]', '', 'g') = v_clean_cpf
      AND s.birth_date = p_birth_date
      AND s.active = TRUE;

    IF v_matches <> 1 THEN
        RETURN JSON_BUILD_OBJECT('authenticated', false);
    END IF;

    SELECT *
    INTO v_student
    FROM public.students s
    WHERE s.user_id = v_profile.user_id
      AND s.organization_id = v_profile.organization_id
      AND regexp_replace(COALESCE(s.cpf, ''), '[^0-9]', '', 'g') = v_clean_cpf
      AND s.birth_date = p_birth_date
      AND s.active = TRUE
    ORDER BY s.created_at DESC
    LIMIT 1;

    SELECT p.name
    INTO v_plan_name
    FROM public.plans p
    WHERE p.id = v_student.plan_id
      AND p.user_id = v_student.user_id
      AND p.organization_id = v_student.organization_id;

    SELECT
        COALESCE(v_profile.ct_name, 'Esportiz Club'),
        NULLIF(v_profile.pix_key, ''),
        NULLIF(v_profile.pix_receiver, '')
    INTO v_school_name, v_pix_key, v_pix_receiver;

    SELECT COALESCE(JSON_AGG(JSON_BUILD_OBJECT(
        'id', g.id,
        'name', g.name,
        'schedule', g.schedule,
        'location', g.location
    )), '[]'::JSON)
    INTO v_groups
    FROM public.groups g
    JOIN public.group_students gs
      ON gs.group_id = g.id
     AND gs.user_id = g.user_id
     AND gs.organization_id = g.organization_id
    WHERE gs.student_id = v_student.id
      AND gs.user_id = v_student.user_id
      AND gs.organization_id = v_student.organization_id
      AND g.user_id = v_student.user_id
      AND g.organization_id = v_student.organization_id;

    SELECT
        COUNT(*),
        COUNT(CASE WHEN present = TRUE THEN 1 END),
        COUNT(CASE WHEN present = FALSE THEN 1 END)
    INTO v_total_classes, v_presences, v_absences
    FROM public.attendance
    WHERE student_id = v_student.id
      AND user_id = v_student.user_id
      AND organization_id = v_student.organization_id;

    IF v_total_classes > 0 THEN
        v_percent := ROUND((v_presences::NUMERIC / v_total_classes::NUMERIC) * 100, 1);
    END IF;

    SELECT JSON_BUILD_OBJECT(
        'total_classes', v_total_classes,
        'presences', v_presences,
        'absences', v_absences,
        'percent', v_percent
    )
    INTO v_attendance_stats;

    SELECT COALESCE(JSON_AGG(JSON_BUILD_OBJECT(
        'id', id,
        'amount', amount,
        'paid_amount', paid_amount,
        'paid', paid,
        'due_date', due_date,
        'paid_at', paid_at,
        'month_ref', month_ref
    ) ORDER BY due_date DESC), '[]'::JSON)
    INTO v_payments
    FROM public.payments
    WHERE student_id = v_student.id
      AND user_id = v_student.user_id
      AND organization_id = v_student.organization_id
      AND (full_price IS NULL OR full_price <> -1);

    SELECT COALESCE(JSON_AGG(JSON_BUILD_OBJECT(
        'date', date,
        'status', CASE WHEN present = TRUE THEN 'present' ELSE 'absent' END,
        'notes', NULL
    ) ORDER BY date DESC), '[]'::JSON)
    INTO v_attendance_logs
    FROM public.attendance
    WHERE student_id = v_student.id
      AND user_id = v_student.user_id
      AND organization_id = v_student.organization_id;

    RETURN JSON_BUILD_OBJECT(
        'authenticated', TRUE,
        'student', JSON_BUILD_OBJECT(
            'id', v_student.id,
            'name', v_student.name,
            'plan_name', COALESCE(v_plan_name, 'Nenhum plano associado'),
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
$phase2126_student_portal$;

CREATE OR REPLACE FUNCTION public.get_public_arena_data(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $phase2126_public_arena_data$
DECLARE
    v_profile RECORD;
    v_arena_name TEXT := 'Esportiz Arena';
    v_logo_url TEXT;
    v_niche_settings JSONB;
    v_courts JSON;
    v_reservations JSON;
BEGIN
    IF p_user_id IS NULL THEN
        RETURN JSON_BUILD_OBJECT(
            'arena_name', v_arena_name,
            'logo_url', NULL,
            'courts', '[]'::JSON,
            'reservations', '[]'::JSON
        );
    END IF;

    SELECT user_id, organization_id, niche_settings, ct_name, logo_url
    INTO v_profile
    FROM public.profiles
    WHERE user_id = p_user_id
      AND organization_id IS NOT NULL
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN JSON_BUILD_OBJECT(
            'arena_name', v_arena_name,
            'logo_url', NULL,
            'courts', '[]'::JSON,
            'reservations', '[]'::JSON
        );
    END IF;

    v_niche_settings := COALESCE(v_profile.niche_settings::jsonb, '{}'::jsonb);
    v_arena_name := v_profile.ct_name;
    v_logo_url := v_profile.logo_url;

    IF v_niche_settings ? 'arena' THEN
        IF NULLIF(v_niche_settings->'arena'->>'ct_name', '') IS NOT NULL THEN
            v_arena_name := v_niche_settings->'arena'->>'ct_name';
        END IF;

        IF NULLIF(v_niche_settings->'arena'->>'logo_url', '') IS NOT NULL THEN
            v_logo_url := v_niche_settings->'arena'->>'logo_url';
        END IF;
    END IF;

    v_arena_name := COALESCE(NULLIF(v_arena_name, ''), 'Esportiz Arena');

    SELECT COALESCE(JSON_AGG(JSON_BUILD_OBJECT(
        'id', m.id,
        'name', m.name,
        'color', m.color,
        'metadata', m.metadata
    ) ORDER BY m.name), '[]'::JSON)
    INTO v_courts
    FROM public.modalities m
    WHERE m.user_id = v_profile.user_id
      AND m.organization_id = v_profile.organization_id
      AND m.business_type = 'arena';

    SELECT COALESCE(JSON_AGG(JSON_BUILD_OBJECT(
        'id', t.id,
        'date', t.date,
        'time', t.time,
        'courtId', t.modality_id,
        'durationMinutes', t.duration_minutes,
        'status', COALESCE((t.metadata::jsonb->>'status'), 'confirmed')
    ) ORDER BY t.date, t.time), '[]'::JSON)
    INTO v_reservations
    FROM public.trainings t
    WHERE t.user_id = v_profile.user_id
      AND t.organization_id = v_profile.organization_id
      AND t.business_type = 'arena'
      AND t.date >= CURRENT_DATE - INTERVAL '2 days';

    RETURN JSON_BUILD_OBJECT(
        'arena_name', v_arena_name,
        'logo_url', v_logo_url,
        'courts', v_courts,
        'reservations', v_reservations
    );
END;
$phase2126_public_arena_data$;

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
AS $phase2126_submit_public_reservation$
DECLARE
    v_profile RECORD;
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
    v_day_of_week INTEGER;
    v_clean_name TEXT := left(regexp_replace(trim(COALESCE(p_client_name, '')), '\s+', ' ', 'g'), 120);
    v_clean_email TEXT := lower(left(trim(COALESCE(p_client_email, '')), 254));
    v_phone_digits TEXT := regexp_replace(COALESCE(p_client_phone, ''), '[^0-9]', '', 'g');
BEGIN
    IF p_user_id IS NULL THEN
        RETURN JSON_BUILD_OBJECT('success', false, 'error', 'Link de agendamento invalido.');
    END IF;

    SELECT user_id, organization_id
    INTO v_profile
    FROM public.profiles
    WHERE user_id = p_user_id
      AND organization_id IS NOT NULL
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN JSON_BUILD_OBJECT('success', false, 'error', 'Arena nao encontrada.');
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

    SELECT *
    INTO v_court_record
    FROM public.modalities
    WHERE id = p_court_id
      AND user_id = v_profile.user_id
      AND organization_id = v_profile.organization_id
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

    v_day_of_week := EXTRACT(DOW FROM p_date)::INTEGER;

    IF jsonb_typeof(v_court_meta->'daysOfWeek') = 'array'
       AND NOT EXISTS (
           SELECT 1
           FROM jsonb_array_elements_text(v_court_meta->'daysOfWeek') AS day_value(value)
           WHERE day_value.value ~ '^\d+$'
             AND day_value.value::INTEGER = v_day_of_week
       ) THEN
        RETURN JSON_BUILD_OBJECT('success', false, 'error', 'Quadra indisponivel neste dia da semana.');
    END IF;

    -- Public reservations for the same organization/court/date are processed one at a time.
    PERFORM pg_advisory_xact_lock(
        hashtext(v_profile.organization_id::TEXT || ':' || p_court_id::TEXT),
        hashtext(p_date::TEXT)
    );

    IF EXISTS (
        SELECT 1
        FROM public.trainings t
        WHERE t.user_id = v_profile.user_id
          AND t.organization_id = v_profile.organization_id
          AND t.business_type = 'arena'
          AND t.modality_id = p_court_id
          AND t.date = p_date
          AND COALESCE((t.metadata::jsonb->>'status'), 'confirmed') <> 'cancelled'
          AND (
              (t.time::TIME < v_new_end)
              AND ((t.time::TIME + (COALESCE(t.duration_minutes, 60) || ' minutes')::INTERVAL) > v_new_start)
          )
    ) THEN
        RETURN JSON_BUILD_OBJECT(
            'success', false,
            'error', 'Este horario acabou de ser reservado. Escolha outro horario.',
            'conflict', true
        );
    END IF;

    IF v_use_peak AND v_peak_price > 0 AND v_new_start >= v_peak_start AND v_new_start < v_peak_end THEN
        v_final_hourly := v_peak_price;
    ELSE
        v_final_hourly := v_hourly_price;
    END IF;

    v_calculated_price := ROUND((v_final_hourly * p_duration_minutes) / 60.0, 2);

    SELECT id
    INTO v_student_id
    FROM public.students
    WHERE user_id = v_profile.user_id
      AND organization_id = v_profile.organization_id
      AND business_type = 'arena'
      AND regexp_replace(COALESCE(cpf, ''), '[^0-9]', '', 'g') = regexp_replace(COALESCE(p_client_cpf, ''), '[^0-9]', '', 'g')
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_student_id IS NULL THEN
        INSERT INTO public.students (
            user_id,
            organization_id,
            name,
            cpf,
            email,
            phone,
            active,
            business_type,
            join_date
        )
        VALUES (
            v_profile.user_id,
            v_profile.organization_id,
            v_clean_name,
            p_client_cpf,
            v_clean_email,
            p_client_phone,
            TRUE,
            'arena',
            CURRENT_DATE
        )
        RETURNING id INTO v_student_id;
    END IF;

    v_meta := JSONB_BUILD_OBJECT(
        'price', v_calculated_price,
        'discount', 0,
        'finalPrice', v_calculated_price,
        'reservationType', 'avulsa',
        'paymentMethod', 'pix',
        'paymentStatus', 'pending',
        'partialPayments', '[]'::jsonb,
        'status', 'confirmed',
        'online', true
    );

    INSERT INTO public.trainings (
        user_id,
        organization_id,
        business_type,
        date,
        time,
        modality_id,
        duration_minutes,
        completed,
        metadata,
        notes
    ) VALUES (
        v_profile.user_id,
        v_profile.organization_id,
        'arena',
        p_date,
        p_time,
        p_court_id,
        p_duration_minutes,
        FALSE,
        v_meta,
        'Agendamento Online'
    )
    RETURNING id INTO v_training_id;

    INSERT INTO public.training_students (
        training_id,
        student_id,
        user_id,
        organization_id
    )
    VALUES (
        v_training_id,
        v_student_id,
        v_profile.user_id,
        v_profile.organization_id
    );

    RETURN JSON_BUILD_OBJECT(
        'success', true,
        'reservation_id', v_training_id,
        'message', 'Agendamento realizado!'
    );
END;
$phase2126_submit_public_reservation$;

REVOKE ALL ON FUNCTION public.get_student_portal_data(TEXT, DATE, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_arena_data(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_public_reservation(UUID, UUID, DATE, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_student_portal_data(TEXT, DATE, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_arena_data(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_public_reservation(UUID, UUID, DATE, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

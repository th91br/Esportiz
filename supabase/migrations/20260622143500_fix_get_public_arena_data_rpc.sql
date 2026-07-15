-- Migration: Fix public arena RPC queries and make them resilient to organization mappings.
-- Date: 2026-06-22

-- 1. Redefine get_public_arena_data to use the correct table and column mappings
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
    v_whatsapp TEXT;
    v_niche_settings JSONB;
    v_courts JSON;
    v_reservations JSON;
BEGIN
    IF p_user_id IS NULL THEN
        RETURN JSON_BUILD_OBJECT(
            'arena_name', v_arena_name,
            'logo_url', NULL,
            'whatsapp', NULL,
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
            'whatsapp', NULL,
            'courts', '[]'::JSON,
            'reservations', '[]'::JSON
        );
    END IF;

    v_niche_settings := COALESCE(v_profile.niche_settings::jsonb, '{}'::jsonb);
    v_arena_name := v_profile.ct_name;
    v_logo_url := v_profile.logo_url;
    v_whatsapp := NULL;

    IF v_niche_settings ? 'arena' THEN
        IF NULLIF(v_niche_settings->'arena'->>'ct_name', '') IS NOT NULL THEN
            v_arena_name := v_niche_settings->'arena'->>'ct_name';
        END IF;

        IF NULLIF(v_niche_settings->'arena'->>'logo_url', '') IS NOT NULL THEN
            v_logo_url := v_niche_settings->'arena'->>'logo_url';
        END IF;

        IF NULLIF(v_niche_settings->'arena'->>'whatsapp', '') IS NOT NULL THEN
            v_whatsapp := v_niche_settings->'arena'->>'whatsapp';
        END IF;
    END IF;

    v_arena_name := COALESCE(NULLIF(v_arena_name, ''), 'Esportiz Arena');

    -- Modalities (Courts) query: resilient to organization_id = NULL
    SELECT COALESCE(JSON_AGG(JSON_BUILD_OBJECT(
        'id', m.id,
        'name', m.name,
        'color', m.color,
        'metadata', m.metadata
    ) ORDER BY m.name), '[]'::JSON)
    INTO v_courts
    FROM public.modalities m
    WHERE m.user_id = v_profile.user_id
      AND (m.organization_id = v_profile.organization_id OR m.organization_id IS NULL)
      AND m.business_type = 'arena';

    -- Reservations query: queries public.trainings, resilient to organization_id = NULL, maps variables correctly
    SELECT COALESCE(JSON_AGG(JSON_BUILD_OBJECT(
        'id', t.id,
        'courtId', t.modality_id,
        'date', t.date,
        'time', t.time,
        'durationMinutes', t.duration_minutes,
        'status', COALESCE((t.metadata::jsonb->>'status'), 'confirmed')
    ) ORDER BY t.date, t.time), '[]'::JSON)
    INTO v_reservations
    FROM public.trainings t
    WHERE t.user_id = v_profile.user_id
      AND (t.organization_id = v_profile.organization_id OR t.organization_id IS NULL)
      AND t.business_type = 'arena'
      AND t.date >= CURRENT_DATE - INTERVAL '2 days';

    RETURN JSON_BUILD_OBJECT(
        'arena_name', v_arena_name,
        'logo_url', v_logo_url,
        'whatsapp', v_whatsapp,
        'courts', v_courts,
        'reservations', v_reservations
    );
END;
$phase2126_public_arena_data$;

REVOKE ALL ON FUNCTION public.get_public_arena_data(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_arena_data(UUID) TO anon, authenticated;


-- 2. Redefine submit_public_reservation to be organization-resilient when checking existing entities
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

    -- Resilient court selection (organization_id check flexibilized)
    SELECT *
    INTO v_court_record
    FROM public.modalities
    WHERE id = p_court_id
      AND user_id = v_profile.user_id
      AND (organization_id = v_profile.organization_id OR organization_id IS NULL)
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

    -- Public reservations advisory lock
    PERFORM pg_advisory_xact_lock(
        hashtext(v_profile.organization_id::TEXT || ':' || p_court_id::TEXT),
        hashtext(p_date::TEXT)
    );

    -- Resilient conflict check (organization_id check flexibilized)
    IF EXISTS (
        SELECT 1
        FROM public.trainings t
        WHERE t.user_id = v_profile.user_id
          AND (t.organization_id = v_profile.organization_id OR t.organization_id IS NULL)
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

    -- Resilient student lookup (organization_id check flexibilized)
    SELECT id
    INTO v_student_id
    FROM public.students
    WHERE user_id = v_profile.user_id
      AND (organization_id = v_profile.organization_id OR organization_id IS NULL)
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

REVOKE ALL ON FUNCTION public.submit_public_reservation(UUID, UUID, DATE, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_public_reservation(UUID, UUID, DATE, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

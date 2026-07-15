-- Phase 4: make public online booking concurrency-safe.
-- Public bookings are serialized by court/date before conflict checking and insertion.

CREATE INDEX IF NOT EXISTS idx_trainings_arena_public_conflict
ON public.trainings (user_id, modality_id, date, business_type)
WHERE business_type = 'arena' AND modality_id IS NOT NULL;

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
    v_day_of_week INTEGER;
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

    SELECT *
    INTO v_court_record
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

    -- Critical section: public reservations for the same court/date are processed one at a time.
    -- This closes the race between "is this slot free?" and "insert reservation".
    PERFORM pg_advisory_xact_lock(hashtext(p_court_id::TEXT), hashtext(p_date::TEXT));

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

    v_calculated_price := (v_final_hourly * p_duration_minutes) / 60.0;

    SELECT id
    INTO v_student_id
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

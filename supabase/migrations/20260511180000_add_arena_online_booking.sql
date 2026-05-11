-- Migration: Add online booking and client registration for Esportiz Arena
-- Date: 2026-05-11

-- 1. Fetch public arena configuration (courts + current schedules) for a given CT Owner ID
CREATE OR REPLACE FUNCTION public.get_public_arena_data(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_arena_name TEXT;
    v_courts JSON;
    v_reservations JSON;
    v_result JSON;
BEGIN
    -- Get arena details (using user_id and ct_name)
    SELECT COALESCE(ct_name, 'Esportiz Arena')
    INTO v_arena_name 
    FROM public.profiles 
    WHERE user_id = p_user_id;

    -- Query courts belonging to this user (modalities with business_type = 'arena')
    SELECT COALESCE(JSON_AGG(JSON_BUILD_OBJECT(
        'id', id,
        'name', name,
        'color', color,
        'metadata', metadata
    )), '[]'::JSON) INTO v_courts
    FROM public.modalities
    WHERE user_id = p_user_id AND business_type = 'arena';

    -- Query active reservations (trainings) to block busy slots on public front
    SELECT COALESCE(JSON_AGG(JSON_BUILD_OBJECT(
        'id', id,
        'date', date,
        'time', time,
        'courtId', modality_id,
        'durationMinutes', duration_minutes,
        'status', COALESCE((metadata::jsonb->>'status'), 'confirmed')
    )), '[]'::JSON) INTO v_reservations
    FROM public.trainings
    WHERE user_id = p_user_id AND business_type = 'arena' AND date >= CURRENT_DATE - INTERVAL '2 days';

    SELECT JSON_BUILD_OBJECT(
        'arena_name', v_arena_name,
        'courts', v_courts,
        'reservations', v_reservations
    ) INTO v_result;

    RETURN v_result;
END;
$$;


-- 2. Process an anonymous court reservation, check time overlaps, register client if new and associate them
CREATE OR REPLACE FUNCTION public.submit_public_reservation(
    p_user_id UUID,
    p_court_id UUID,
    p_date DATE,
    p_time TEXT,
    p_duration_minutes INT,
    p_client_name TEXT,
    p_client_phone TEXT,
    p_client_email TEXT,
    p_client_cpf TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_student_id UUID;
    v_training_id UUID;
    v_new_start_time TIME;
    v_new_end_time TIME;
    v_meta JSONB;
    v_court_meta_text TEXT;
    v_court_meta JSONB;
    v_hourly_price NUMERIC;
    v_use_peak BOOLEAN;
    v_peak_price NUMERIC;
    v_peak_start TEXT;
    v_peak_end TEXT;
    v_final_hourly NUMERIC;
    v_calculated_price NUMERIC;
BEGIN
    -- Parse new reservation interval
    v_new_start_time := p_time::TIME;
    v_new_end_time := (p_time::TIME + (p_duration_minutes || ' minutes')::INTERVAL);

    -- Check for overlapping reservations on the same court and date
    -- Overlap formula: (start1 < end2) AND (end1 > start2)
    IF EXISTS (
        SELECT 1 
        FROM public.trainings t
        WHERE t.user_id = p_user_id 
          AND t.business_type = 'arena'
          AND t.modality_id = p_court_id
          AND t.date = p_date
          AND COALESCE((t.metadata::jsonb->>'status'), 'confirmed') != 'cancelled'
          AND (
              (t.time::TIME < v_new_end_time) AND 
              ((t.time::TIME + (COALESCE(t.duration_minutes, 60) || ' minutes')::INTERVAL) > v_new_start_time)
          )
    ) THEN
        RETURN JSON_BUILD_OBJECT('success', false, 'error', 'Este horário já está reservado ou possui conflito de tempo.');
    END IF;

    -- Retrieve court metadata to compute price dynamically
    SELECT metadata INTO v_court_meta_text
    FROM public.modalities
    WHERE id = p_court_id;

    v_hourly_price := 80;
    v_use_peak := false;
    v_peak_price := 0;
    v_peak_start := '18:00';
    v_peak_end := '22:00';

    IF v_court_meta_text IS NOT NULL THEN
        BEGIN
            v_court_meta := v_court_meta_text::JSONB;
            v_hourly_price := COALESCE((v_court_meta->>'pricePerHour')::NUMERIC, 80);
            v_use_peak := COALESCE((v_court_meta->>'usePeakPricing')::BOOLEAN, false);
            v_peak_price := COALESCE((v_court_meta->>'peakPrice')::NUMERIC, 0);
            v_peak_start := COALESCE(v_court_meta->>'peakStart', '18:00');
            v_peak_end := COALESCE(v_court_meta->>'peakEnd', '22:00');
        EXCEPTION WHEN OTHERS THEN
            -- fallback on defaults
        END;
    END IF;

    IF v_use_peak AND v_peak_price > 0 AND p_time >= v_peak_start AND p_time < v_peak_end THEN
        v_final_hourly := v_peak_price;
    ELSE
        v_final_hourly := v_hourly_price;
    END IF;

    v_calculated_price := (v_final_hourly * p_duration_minutes) / 60.0;

    -- Retrieve or insert student (client)
    SELECT id INTO v_student_id 
    FROM public.students
    WHERE user_id = p_user_id 
      AND regexp_replace(cpf, '[^0-9]', '', 'g') = regexp_replace(p_client_cpf, '[^0-9]', '', 'g')
    LIMIT 1;

    IF v_student_id IS NULL THEN
        INSERT INTO public.students (
            user_id,
            name,
            cpf,
            email,
            phone,
            active,
            business_type,
            join_date
        ) VALUES (
            p_user_id,
            p_client_name,
            p_client_cpf,
            p_client_email,
            p_client_phone,
            true,
            'arena',
            CURRENT_DATE
        ) RETURNING id INTO v_student_id;
    END IF;

    -- Build reservation metadata with actual calculated prices
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

    -- Insert the reservation (training)
    INSERT INTO public.trainings (
        user_id,
        business_type,
        date,
        time,
        modality_id,
        duration_minutes,
        notes,
        location,
        completed,
        metadata
    ) VALUES (
        p_user_id,
        'arena',
        p_date,
        p_time,
        p_court_id,
        p_duration_minutes,
        'Agendamento Online via Web',
        '',
        false,
        v_meta::text
    ) RETURNING id INTO v_training_id;

    -- Link client to reservation
    INSERT INTO public.training_students (
        training_id,
        student_id,
        user_id
    ) VALUES (
        v_training_id,
        v_student_id,
        p_user_id
    );

    RETURN JSON_BUILD_OBJECT(
        'success', true,
        'message', 'Agendamento concluído com sucesso!'
    );
END;
$$;

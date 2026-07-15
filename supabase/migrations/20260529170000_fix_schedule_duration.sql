-- Migration: Fix generate_student_schedule to use group's duration_minutes
-- Date: 2026-05-29
-- Purpose: The RPC was hard-coding duration_minutes = 60 for all generated trainings.
--          Now it accepts an optional p_duration_minutes parameter (defaults to 60)
--          so the frontend can pass the group's real duration.

CREATE OR REPLACE FUNCTION public.generate_student_schedule(
    p_user_id UUID,
    p_student_id UUID,
    p_schedules JSONB, -- Array of { dayOfWeek: number, time: string }
    p_months_ahead INT DEFAULT 3,
    p_duration_minutes INT DEFAULT 60
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_today DATE := CURRENT_DATE;
    v_end_date DATE := CURRENT_DATE + (p_months_ahead || ' months')::INTERVAL;
    v_current_date DATE;
    v_schedule JSONB;
    v_day_of_week INT;
    v_time TEXT;
    v_existing_training_id UUID;
    v_existing_student_ids UUID[];
    v_safe_duration INT;
BEGIN
    -- Sanitize duration: must be between 15 and 360 minutes
    v_safe_duration := GREATEST(15, LEAST(360, COALESCE(p_duration_minutes, 60)));

    -- For each schedule provided
    FOR v_schedule IN SELECT * FROM jsonb_array_elements(p_schedules)
    LOOP
        v_day_of_week := (v_schedule->>'dayOfWeek')::INT;
        v_time := v_schedule->>'time';
        
        v_current_date := v_today;
        
        WHILE v_current_date <= v_end_date LOOP
            -- PostgreSQL DOW: 0 = Sunday, 1 = Monday...
            IF EXTRACT(DOW FROM v_current_date) = v_day_of_week THEN
                
                -- Check if training exists for this date, time and user
                SELECT t.id, ARRAY(SELECT ts.student_id FROM public.training_students ts WHERE ts.training_id = t.id)
                INTO v_existing_training_id, v_existing_student_ids
                FROM public.trainings t
                WHERE t.date = v_current_date AND t.time = v_time AND t.user_id = p_user_id
                LIMIT 1;
                
                IF v_existing_training_id IS NOT NULL THEN
                    -- Check if student is already in this training
                    IF NOT p_student_id = ANY(v_existing_student_ids) THEN
                        INSERT INTO public.training_students (training_id, student_id, user_id)
                        VALUES (v_existing_training_id, p_student_id, p_user_id);
                    END IF;
                ELSE
                    -- Create new training with the group's real duration
                    INSERT INTO public.trainings (user_id, date, time, location, duration_minutes, business_type)
                    VALUES (p_user_id, v_current_date, v_time, 'Esportiz', v_safe_duration, 'sport_school')
                    RETURNING id INTO v_existing_training_id;
                    
                    INSERT INTO public.training_students (training_id, student_id, user_id)
                    VALUES (v_existing_training_id, p_student_id, p_user_id);
                END IF;
                
            END IF;
            
            v_current_date := v_current_date + INTERVAL '1 day';
        END LOOP;
    END LOOP;

    RETURN JSON_BUILD_OBJECT('success', true, 'message', 'Agenda gerada com sucesso.');
END;
$$;

-- Re-grant permissions (signature changed due to new parameter)
REVOKE ALL ON FUNCTION public.generate_student_schedule(UUID, UUID, JSONB, INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_student_schedule(UUID, UUID, JSONB, INTEGER, INTEGER) TO authenticated;

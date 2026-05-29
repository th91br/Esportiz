-- Migration: Add duration_minutes to get_student_portal_data groups representation
-- Date: 2026-05-29
-- Purpose: Return the real duration_minutes of each group so the student portal can accurately compute training end times.

CREATE OR REPLACE FUNCTION public.get_student_portal_data(
    p_cpf TEXT DEFAULT NULL,
    p_birth_date DATE DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $portal_duration_migration$
DECLARE
    v_profile RECORD;
    v_student RECORD;
    v_matches INTEGER := 0;
    v_plan_name TEXT;
    v_school_name TEXT;
    v_school_logo_url TEXT;
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
    v_niche_settings JSONB;
BEGIN
    IF p_user_id IS NULL
       OR p_birth_date IS NULL
       OR p_birth_date > CURRENT_DATE
       OR NOT public.is_valid_cpf(p_cpf)
    THEN
        RETURN JSON_BUILD_OBJECT('authenticated', false);
    END IF;

    v_clean_cpf := regexp_replace(COALESCE(p_cpf, ''), '[^0-9]', '', 'g');

    SELECT user_id, organization_id, niche_settings, ct_name, logo_url, pix_key, pix_receiver
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
      AND s.business_type = 'sport_school'
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
      AND s.business_type = 'sport_school'
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

    v_niche_settings := COALESCE(v_profile.niche_settings::jsonb, '{}'::jsonb);

    v_school_name := COALESCE(
        NULLIF(v_niche_settings->'sport_school'->>'ct_name', ''),
        NULLIF(v_profile.ct_name, ''),
        'Esportiz Sport'
    );

    v_school_logo_url := COALESCE(
        NULLIF(v_niche_settings->'sport_school'->>'logo_url', ''),
        NULLIF(v_profile.logo_url, '')
    );

    v_pix_key := COALESCE(
        NULLIF(v_niche_settings->'sport_school'->>'pix_key', ''),
        NULLIF(v_profile.pix_key, '')
    );

    v_pix_receiver := COALESCE(
        NULLIF(v_niche_settings->'sport_school'->>'pix_receiver', ''),
        NULLIF(v_profile.pix_receiver, '')
    );

    -- Modified JSON_BUILD_OBJECT here to include duration_minutes:
    SELECT COALESCE(JSON_AGG(JSON_BUILD_OBJECT(
        'id', g.id,
        'name', g.name,
        'schedule', g.schedule,
        'location', g.location,
        'durationMinutes', COALESCE(g.duration_minutes, 60)
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
            'school_name', COALESCE(v_school_name, 'Esportiz Sport'),
            'logo_url', v_school_logo_url
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
$portal_duration_migration$;

REVOKE ALL ON FUNCTION public.get_student_portal_data(TEXT, DATE, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_student_portal_data(TEXT, DATE, UUID) TO anon, authenticated;

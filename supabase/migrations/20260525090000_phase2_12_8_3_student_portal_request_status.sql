-- Phase 2.12.8.3: student portal request status.
-- Safe additive migration:
-- - Adds a public RPC that returns only the authenticated student's own requests.
-- - Uses the same CPF + birth date + school owner validation as the student portal.
-- - Does not change existing portal, payment, attendance, or request submission behavior.

CREATE OR REPLACE FUNCTION public.get_student_portal_requests(
    p_cpf TEXT DEFAULT NULL,
    p_birth_date DATE DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $phase21283_student_portal_requests$
DECLARE
    v_profile RECORD;
    v_student RECORD;
    v_clean_cpf TEXT;
    v_requests JSON;
BEGIN
    IF p_user_id IS NULL
       OR p_birth_date IS NULL
       OR p_birth_date > CURRENT_DATE
       OR NOT public.is_valid_cpf(p_cpf)
    THEN
        RETURN JSON_BUILD_OBJECT('success', false, 'requests', '[]'::JSON);
    END IF;

    SELECT user_id, organization_id
    INTO v_profile
    FROM public.profiles
    WHERE user_id = p_user_id
      AND organization_id IS NOT NULL
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN JSON_BUILD_OBJECT('success', false, 'requests', '[]'::JSON);
    END IF;

    v_clean_cpf := regexp_replace(COALESCE(p_cpf, ''), '[^0-9]', '', 'g');

    SELECT id, user_id, organization_id
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

    IF NOT FOUND THEN
        RETURN JSON_BUILD_OBJECT('success', false, 'requests', '[]'::JSON);
    END IF;

    SELECT COALESCE(JSON_AGG(JSON_BUILD_OBJECT(
        'id', r.id,
        'request_type', r.request_type,
        'preferred_date', r.preferred_date,
        'preferred_time', r.preferred_time,
        'message', r.message,
        'status', r.status,
        'created_at', r.created_at,
        'resolved_at', r.resolved_at
    ) ORDER BY r.created_at DESC), '[]'::JSON)
    INTO v_requests
    FROM public.student_training_requests r
    WHERE r.student_id = v_student.id
      AND r.user_id = v_student.user_id
      AND r.organization_id = v_student.organization_id;

    RETURN JSON_BUILD_OBJECT(
        'success', true,
        'requests', v_requests
    );
END;
$phase21283_student_portal_requests$;

REVOKE ALL ON FUNCTION public.get_student_portal_requests(TEXT, DATE, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_student_portal_requests(TEXT, DATE, UUID) TO anon, authenticated;

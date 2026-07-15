-- Phase 2.12.7: Student portal branding and safe training/makeup requests.
-- Safe migration:
-- - Adds a pending-request inbox for sport_school only.
-- - Public portal submits requests through a SECURITY DEFINER RPC after CPF + birth date validation.
-- - Requests do not create trainings automatically.
-- - Keeps student portal RPC signature compatible and only adds logo_url to the response.

CREATE TABLE IF NOT EXISTS public.student_training_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    student_name_snapshot TEXT NOT NULL,
    student_phone_snapshot TEXT,
    request_type TEXT NOT NULL CHECK (request_type IN ('training', 'makeup')),
    preferred_date DATE,
    preferred_time TEXT CHECK (preferred_time IS NULL OR preferred_time ~ '^(?:[01][0-9]|2[0-3]):[0-5][0-9]$'),
    message TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    source TEXT NOT NULL DEFAULT 'student_portal' CHECK (source IN ('student_portal', 'staff')),
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS student_training_requests_owner_status_idx
ON public.student_training_requests(user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS student_training_requests_org_status_idx
ON public.student_training_requests(organization_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS student_training_requests_student_status_idx
ON public.student_training_requests(student_id, status, created_at DESC);

DROP TRIGGER IF EXISTS update_student_training_requests_updated_at ON public.student_training_requests;
CREATE TRIGGER update_student_training_requests_updated_at
BEFORE UPDATE ON public.student_training_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.student_training_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "student_training_requests_org_select" ON public.student_training_requests;
CREATE POLICY "student_training_requests_org_select"
ON public.student_training_requests
FOR SELECT
TO authenticated
USING (
    public.can_access_owner_user_data(user_id, ARRAY['owner', 'manager', 'receptionist', 'teacher'])
);

DROP POLICY IF EXISTS "student_training_requests_org_update" ON public.student_training_requests;
CREATE POLICY "student_training_requests_org_update"
ON public.student_training_requests
FOR UPDATE
TO authenticated
USING (
    public.can_access_owner_user_data(user_id, ARRAY['owner', 'manager', 'receptionist', 'teacher'])
)
WITH CHECK (
    public.can_access_owner_user_data(user_id, ARRAY['owner', 'manager', 'receptionist', 'teacher'])
);

DROP POLICY IF EXISTS "student_training_requests_org_delete" ON public.student_training_requests;
CREATE POLICY "student_training_requests_org_delete"
ON public.student_training_requests
FOR DELETE
TO authenticated
USING (
    public.can_access_owner_user_data(user_id, ARRAY['owner', 'manager'])
);

REVOKE ALL ON TABLE public.student_training_requests FROM PUBLIC;
GRANT SELECT, UPDATE, DELETE ON TABLE public.student_training_requests TO authenticated;

CREATE OR REPLACE FUNCTION public.get_student_portal_branding(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $phase2127_student_portal_branding$
DECLARE
    v_profile RECORD;
    v_niche_settings JSONB;
    v_school_name TEXT := 'Esportiz Sport';
    v_logo_url TEXT;
BEGIN
    IF p_user_id IS NULL THEN
        RETURN JSON_BUILD_OBJECT(
            'success', false,
            'school_name', v_school_name,
            'logo_url', NULL
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
            'success', false,
            'school_name', v_school_name,
            'logo_url', NULL
        );
    END IF;

    v_niche_settings := COALESCE(v_profile.niche_settings::jsonb, '{}'::jsonb);

    v_school_name := COALESCE(
        NULLIF(v_niche_settings->'sport_school'->>'ct_name', ''),
        NULLIF(v_profile.ct_name, ''),
        'Esportiz Sport'
    );

    v_logo_url := COALESCE(
        NULLIF(v_niche_settings->'sport_school'->>'logo_url', ''),
        NULLIF(v_profile.logo_url, '')
    );

    RETURN JSON_BUILD_OBJECT(
        'success', true,
        'school_name', v_school_name,
        'logo_url', v_logo_url
    );
END;
$phase2127_student_portal_branding$;

CREATE OR REPLACE FUNCTION public.get_student_portal_data(
    p_cpf TEXT DEFAULT NULL,
    p_birth_date DATE DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $phase2127_student_portal$
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
$phase2127_student_portal$;

CREATE OR REPLACE FUNCTION public.submit_student_training_request(
    p_cpf TEXT,
    p_birth_date DATE,
    p_user_id UUID,
    p_request_type TEXT,
    p_preferred_date DATE DEFAULT NULL,
    p_preferred_time TEXT DEFAULT NULL,
    p_message TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $phase2127_submit_student_training_request$
DECLARE
    v_profile RECORD;
    v_student RECORD;
    v_clean_cpf TEXT;
    v_message TEXT;
    v_existing_id UUID;
    v_pending_count INT := 0;
    v_request_id UUID;
BEGIN
    IF p_user_id IS NULL
       OR p_birth_date IS NULL
       OR p_birth_date > CURRENT_DATE
       OR NOT public.is_valid_cpf(p_cpf)
    THEN
        RETURN JSON_BUILD_OBJECT('success', false, 'error', 'Dados de acesso invalidos.');
    END IF;

    IF p_request_type NOT IN ('training', 'makeup') THEN
        RETURN JSON_BUILD_OBJECT('success', false, 'error', 'Tipo de solicitacao invalido.');
    END IF;

    IF p_preferred_date IS NOT NULL AND p_preferred_date < CURRENT_DATE THEN
        RETURN JSON_BUILD_OBJECT('success', false, 'error', 'Data desejada invalida.');
    END IF;

    IF p_preferred_time IS NOT NULL AND p_preferred_time !~ '^(?:[01][0-9]|2[0-3]):[0-5][0-9]$' THEN
        RETURN JSON_BUILD_OBJECT('success', false, 'error', 'Horario desejado invalido.');
    END IF;

    SELECT user_id, organization_id
    INTO v_profile
    FROM public.profiles
    WHERE user_id = p_user_id
      AND organization_id IS NOT NULL
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN JSON_BUILD_OBJECT('success', false, 'error', 'Escola nao encontrada.');
    END IF;

    v_clean_cpf := regexp_replace(COALESCE(p_cpf, ''), '[^0-9]', '', 'g');

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

    IF NOT FOUND THEN
        RETURN JSON_BUILD_OBJECT('success', false, 'error', 'Aluno nao encontrado.');
    END IF;

    SELECT COUNT(*)
    INTO v_pending_count
    FROM public.student_training_requests r
    WHERE r.student_id = v_student.id
      AND r.user_id = v_student.user_id
      AND r.organization_id = v_student.organization_id
      AND r.status = 'pending';

    IF v_pending_count >= 5 THEN
        RETURN JSON_BUILD_OBJECT('success', false, 'error', 'Voce ja possui solicitacoes pendentes. Aguarde o retorno da escola.');
    END IF;

    SELECT id
    INTO v_existing_id
    FROM public.student_training_requests r
    WHERE r.student_id = v_student.id
      AND r.user_id = v_student.user_id
      AND r.organization_id = v_student.organization_id
      AND r.status = 'pending'
      AND r.request_type = p_request_type
      AND COALESCE(r.preferred_date, DATE '1900-01-01') = COALESCE(p_preferred_date, DATE '1900-01-01')
      AND COALESCE(r.preferred_time, '') = COALESCE(p_preferred_time, '')
    ORDER BY r.created_at DESC
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
        RETURN JSON_BUILD_OBJECT(
            'success', true,
            'request_id', v_existing_id,
            'message', 'Esta solicitacao ja esta pendente para analise da escola.'
        );
    END IF;

    v_message := NULLIF(left(trim(COALESCE(p_message, '')), 500), '');

    INSERT INTO public.student_training_requests (
        user_id,
        organization_id,
        student_id,
        student_name_snapshot,
        student_phone_snapshot,
        request_type,
        preferred_date,
        preferred_time,
        message,
        status,
        source
    )
    VALUES (
        v_student.user_id,
        v_student.organization_id,
        v_student.id,
        v_student.name,
        NULLIF(v_student.phone, ''),
        p_request_type,
        p_preferred_date,
        p_preferred_time,
        v_message,
        'pending',
        'student_portal'
    )
    RETURNING id INTO v_request_id;

    RETURN JSON_BUILD_OBJECT(
        'success', true,
        'request_id', v_request_id,
        'message', 'Solicitacao enviada para a escola.'
    );
END;
$phase2127_submit_student_training_request$;

REVOKE ALL ON FUNCTION public.get_student_portal_branding(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_student_portal_data(TEXT, DATE, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_student_training_request(TEXT, DATE, UUID, TEXT, DATE, TEXT, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_student_portal_branding(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_student_portal_data(TEXT, DATE, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_student_training_request(TEXT, DATE, UUID, TEXT, DATE, TEXT, TEXT) TO anon, authenticated;

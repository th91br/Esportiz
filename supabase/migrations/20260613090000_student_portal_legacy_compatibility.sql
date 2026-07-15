-- Student Portal legacy compatibility and tenant-safe identity resolution.
-- Safe migration:
-- - Does not alter or delete student data.
-- - Accepts the owner id, organization id, or one active organization member id.
-- - Rejects ambiguous member links associated with more than one organization.
-- - Supports legacy CPF values that lost leading zeroes during spreadsheet imports.
-- - Keeps every lookup restricted to the resolved organization or legacy owner.

CREATE OR REPLACE FUNCTION public.normalize_student_portal_cpf(p_cpf TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $normalize_student_portal_cpf$
DECLARE
    v_digits TEXT;
BEGIN
    v_digits := regexp_replace(COALESCE(p_cpf, ''), '[^0-9]', '', 'g');

    IF length(v_digits) BETWEEN 1 AND 10 THEN
        RETURN lpad(v_digits, 11, '0');
    END IF;

    RETURN v_digits;
END;
$normalize_student_portal_cpf$;

CREATE OR REPLACE FUNCTION public.resolve_student_portal_tenant(p_scope_id UUID)
RETURNS TABLE (
    owner_user_id UUID,
    organization_id UUID
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $resolve_student_portal_tenant$
DECLARE
    v_membership_count INTEGER := 0;
BEGIN
    IF p_scope_id IS NULL THEN
        RETURN;
    END IF;

    -- Current links use the owner id. Organization ids are also accepted so
    -- future links can remain stable if the organization owner changes.
    RETURN QUERY
    SELECT o.owner_user_id, o.id
    FROM public.organizations o
    WHERE o.status = 'active'
      AND (o.owner_user_id = p_scope_id OR o.id = p_scope_id)
    ORDER BY CASE WHEN o.owner_user_id = p_scope_id THEN 0 ELSE 1 END
    LIMIT 1;

    IF FOUND THEN
        RETURN;
    END IF;

    -- Older links could contain the id of the employee who copied the link.
    -- Only one active membership is accepted; ambiguity fails closed.
    SELECT COUNT(DISTINCT om.organization_id)
    INTO v_membership_count
    FROM public.organization_members om
    JOIN public.organizations o
      ON o.id = om.organization_id
     AND o.status = 'active'
    WHERE om.user_id = p_scope_id
      AND om.active = TRUE;

    IF v_membership_count = 1 THEN
        RETURN QUERY
        SELECT o.owner_user_id, o.id
        FROM public.organization_members om
        JOIN public.organizations o
          ON o.id = om.organization_id
         AND o.status = 'active'
        WHERE om.user_id = p_scope_id
          AND om.active = TRUE
        ORDER BY CASE WHEN om.role = 'owner' THEN 0 ELSE 1 END, om.created_at ASC
        LIMIT 1;
        RETURN;
    END IF;

    -- Compatibility for schools created before organizations existed.
    RETURN QUERY
    SELECT p.user_id, NULL::UUID
    FROM public.profiles p
    WHERE p.user_id = p_scope_id
      AND p.organization_id IS NULL
    LIMIT 1;
END;
$resolve_student_portal_tenant$;

CREATE OR REPLACE FUNCTION public.resolve_student_portal_identity(
    p_scope_id UUID,
    p_cpf TEXT,
    p_birth_date DATE
)
RETURNS TABLE (
    student_id UUID,
    owner_user_id UUID,
    organization_id UUID
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $resolve_student_portal_identity$
DECLARE
    v_tenant RECORD;
    v_clean_cpf TEXT;
BEGIN
    v_clean_cpf := regexp_replace(COALESCE(p_cpf, ''), '[^0-9]', '', 'g');

    IF p_scope_id IS NULL
       OR p_birth_date IS NULL
       OR p_birth_date > CURRENT_DATE
       OR length(v_clean_cpf) <> 11
       OR v_clean_cpf = repeat(substr(v_clean_cpf, 1, 1), 11)
    THEN
        RETURN;
    END IF;

    SELECT *
    INTO v_tenant
    FROM public.resolve_student_portal_tenant(p_scope_id)
    LIMIT 1;

    IF NOT FOUND OR v_tenant.owner_user_id IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        s.id,
        v_tenant.owner_user_id,
        COALESCE(s.organization_id, v_tenant.organization_id)
    FROM public.students s
    WHERE s.business_type = 'sport_school'
      AND s.birth_date = p_birth_date
      AND s.active = TRUE
      AND public.normalize_student_portal_cpf(s.cpf) = v_clean_cpf
      AND (
          (
              v_tenant.organization_id IS NOT NULL
              AND s.organization_id = v_tenant.organization_id
          )
          OR (
              s.user_id = v_tenant.owner_user_id
              AND (
                  s.organization_id IS NULL
                  OR v_tenant.organization_id IS NULL
              )
          )
      )
    ORDER BY
        CASE
            WHEN v_tenant.organization_id IS NOT NULL
             AND s.organization_id = v_tenant.organization_id THEN 0
            ELSE 1
        END,
        CASE
            WHEN length(regexp_replace(COALESCE(s.cpf, ''), '[^0-9]', '', 'g')) = 11 THEN 0
            ELSE 1
        END,
        s.updated_at DESC NULLS LAST,
        s.created_at DESC
    LIMIT 1;
END;
$resolve_student_portal_identity$;

REVOKE ALL ON FUNCTION public.normalize_student_portal_cpf(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.resolve_student_portal_tenant(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.resolve_student_portal_identity(UUID, TEXT, DATE) FROM PUBLIC, anon, authenticated;

CREATE INDEX IF NOT EXISTS students_portal_org_lookup_idx
ON public.students (
    organization_id,
    business_type,
    birth_date
)
WHERE active = TRUE;

CREATE INDEX IF NOT EXISTS students_portal_legacy_owner_lookup_idx
ON public.students (
    user_id,
    business_type,
    birth_date
)
WHERE active = TRUE AND organization_id IS NULL;

CREATE OR REPLACE FUNCTION public.get_student_portal_branding(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $student_portal_branding_compat$
DECLARE
    v_tenant RECORD;
    v_profile RECORD;
    v_niche_settings JSONB;
    v_school_name TEXT := 'Esportiz Sport';
    v_logo_url TEXT;
BEGIN
    SELECT *
    INTO v_tenant
    FROM public.resolve_student_portal_tenant(p_user_id)
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN JSON_BUILD_OBJECT(
            'success', false,
            'school_name', v_school_name,
            'logo_url', NULL
        );
    END IF;

    SELECT niche_settings, ct_name, logo_url
    INTO v_profile
    FROM public.profiles
    WHERE user_id = v_tenant.owner_user_id
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
$student_portal_branding_compat$;

CREATE OR REPLACE FUNCTION public.get_student_portal_data(
    p_cpf TEXT DEFAULT NULL,
    p_birth_date DATE DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $student_portal_data_compat$
DECLARE
    v_identity RECORD;
    v_profile RECORD;
    v_student RECORD;
    v_plan_name TEXT;
    v_plan_price NUMERIC;
    v_modality_name TEXT;
    v_school_name TEXT;
    v_school_logo_url TEXT;
    v_pix_key TEXT;
    v_pix_receiver TEXT;
    v_groups JSON;
    v_attendance_logs JSON;
    v_attendance_stats JSON;
    v_payments JSON;
    v_signature_signed_at TIMESTAMP WITH TIME ZONE;
    v_signature_ip TEXT;
    v_total_classes INT := 0;
    v_presences INT := 0;
    v_absences INT := 0;
    v_percent NUMERIC := 100;
    v_niche_settings JSONB;
BEGIN
    SELECT *
    INTO v_identity
    FROM public.resolve_student_portal_identity(p_user_id, p_cpf, p_birth_date)
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN JSON_BUILD_OBJECT('authenticated', false);
    END IF;

    SELECT *
    INTO v_student
    FROM public.students
    WHERE id = v_identity.student_id
    LIMIT 1;

    SELECT niche_settings, ct_name, logo_url, pix_key, pix_receiver
    INTO v_profile
    FROM public.profiles
    WHERE user_id = v_identity.owner_user_id
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN JSON_BUILD_OBJECT('authenticated', false);
    END IF;

    SELECT p.name, p.price
    INTO v_plan_name, v_plan_price
    FROM public.plans p
    WHERE p.id = v_student.plan_id
      AND (
          (
              v_identity.organization_id IS NOT NULL
              AND p.organization_id = v_identity.organization_id
          )
          OR (
              p.user_id = v_identity.owner_user_id
              AND (
                  p.organization_id IS NULL
                  OR v_identity.organization_id IS NULL
              )
          )
      )
    LIMIT 1;

    SELECT m.name
    INTO v_modality_name
    FROM public.modalities m
    WHERE m.id = v_student.modality_id
      AND (
          (
              v_identity.organization_id IS NOT NULL
              AND m.organization_id = v_identity.organization_id
          )
          OR (
              m.user_id = v_identity.owner_user_id
              AND (
                  m.organization_id IS NULL
                  OR v_identity.organization_id IS NULL
              )
          )
      )
    LIMIT 1;

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
        'location', g.location,
        'durationMinutes', COALESCE(g.duration_minutes, 60)
    ) ORDER BY g.name), '[]'::JSON)
    INTO v_groups
    FROM public.groups g
    JOIN public.group_students gs ON gs.group_id = g.id
    WHERE gs.student_id = v_student.id
      AND (
          (
              v_identity.organization_id IS NOT NULL
              AND gs.organization_id = v_identity.organization_id
              AND g.organization_id = v_identity.organization_id
          )
          OR (
              gs.user_id = v_identity.owner_user_id
              AND g.user_id = v_identity.owner_user_id
              AND gs.organization_id IS NULL
              AND g.organization_id IS NULL
          )
      );

    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE a.present = TRUE),
        COUNT(*) FILTER (WHERE a.present = FALSE)
    INTO v_total_classes, v_presences, v_absences
    FROM public.attendance a
    WHERE a.student_id = v_student.id
      AND (
          (
              v_identity.organization_id IS NOT NULL
              AND a.organization_id = v_identity.organization_id
          )
          OR (
              a.user_id = v_identity.owner_user_id
              AND a.organization_id IS NULL
          )
      );

    IF v_total_classes > 0 THEN
        v_percent := ROUND((v_presences::NUMERIC / v_total_classes::NUMERIC) * 100, 1);
    END IF;

    v_attendance_stats := JSON_BUILD_OBJECT(
        'total_classes', v_total_classes,
        'presences', v_presences,
        'absences', v_absences,
        'percent', v_percent
    );

    SELECT COALESCE(JSON_AGG(JSON_BUILD_OBJECT(
        'id', py.id,
        'amount', py.amount,
        'paid_amount', py.paid_amount,
        'paid', py.paid,
        'due_date', py.due_date,
        'paid_at', py.paid_at,
        'month_ref', py.month_ref
    ) ORDER BY py.due_date DESC), '[]'::JSON)
    INTO v_payments
    FROM public.payments py
    WHERE py.student_id = v_student.id
      AND (py.full_price IS NULL OR py.full_price <> -1)
      AND (
          (
              v_identity.organization_id IS NOT NULL
              AND py.organization_id = v_identity.organization_id
          )
          OR (
              py.user_id = v_identity.owner_user_id
              AND py.organization_id IS NULL
          )
      );

    SELECT COALESCE(JSON_AGG(JSON_BUILD_OBJECT(
        'date', a.date,
        'status', CASE WHEN a.present = TRUE THEN 'present' ELSE 'absent' END,
        'notes', NULL
    ) ORDER BY a.date DESC), '[]'::JSON)
    INTO v_attendance_logs
    FROM public.attendance a
    WHERE a.student_id = v_student.id
      AND (
          (
              v_identity.organization_id IS NOT NULL
              AND a.organization_id = v_identity.organization_id
          )
          OR (
              a.user_id = v_identity.owner_user_id
              AND a.organization_id IS NULL
          )
      );

    SELECT cs.signed_at, cs.ip_address
    INTO v_signature_signed_at, v_signature_ip
    FROM public.contract_signatures cs
    WHERE cs.student_id = v_student.id
    LIMIT 1;

    RETURN JSON_BUILD_OBJECT(
        'authenticated', true,
        'student', JSON_BUILD_OBJECT(
            'id', v_student.id,
            'name', v_student.name,
            'cpf', v_student.cpf,
            'rg', v_student.rg,
            'address', v_student.address,
            'city', v_student.city,
            'state', v_student.state,
            'zip_code', v_student.zip_code,
            'level', v_student.level,
            'email', v_student.email,
            'phone', v_student.phone,
            'plan_name', COALESCE(v_plan_name, 'Nenhum plano associado'),
            'plan_price', COALESCE(v_plan_price, 0),
            'modality_name', COALESCE(v_modality_name, 'Nao informada'),
            'school_name', v_school_name,
            'logo_url', v_school_logo_url,
            'owner_id', v_identity.owner_user_id,
            'payment_due_day', v_student.payment_due_day,
            'signed', (v_signature_signed_at IS NOT NULL),
            'signed_at', v_signature_signed_at,
            'signature_ip', v_signature_ip
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
$student_portal_data_compat$;

CREATE OR REPLACE FUNCTION public.get_student_portal_requests(
    p_cpf TEXT DEFAULT NULL,
    p_birth_date DATE DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $student_portal_requests_compat$
DECLARE
    v_identity RECORD;
    v_requests JSON;
BEGIN
    SELECT *
    INTO v_identity
    FROM public.resolve_student_portal_identity(p_user_id, p_cpf, p_birth_date)
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
    WHERE r.student_id = v_identity.student_id
      AND (
          (
              v_identity.organization_id IS NOT NULL
              AND r.organization_id = v_identity.organization_id
          )
          OR (
              r.user_id = v_identity.owner_user_id
              AND r.organization_id IS NULL
          )
      );

    RETURN JSON_BUILD_OBJECT('success', true, 'requests', v_requests);
END;
$student_portal_requests_compat$;

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
AS $submit_student_training_request_compat$
DECLARE
    v_identity RECORD;
    v_student RECORD;
    v_message TEXT;
    v_existing_id UUID;
    v_pending_count INTEGER := 0;
    v_request_id UUID;
BEGIN
    IF p_request_type NOT IN ('training', 'makeup') THEN
        RETURN JSON_BUILD_OBJECT('success', false, 'error', 'Tipo de solicitacao invalido.');
    END IF;

    IF p_preferred_date IS NOT NULL AND p_preferred_date < CURRENT_DATE THEN
        RETURN JSON_BUILD_OBJECT('success', false, 'error', 'Data desejada invalida.');
    END IF;

    IF p_preferred_time IS NOT NULL
       AND p_preferred_time !~ '^(?:[01][0-9]|2[0-3]):[0-5][0-9]$'
    THEN
        RETURN JSON_BUILD_OBJECT('success', false, 'error', 'Horario desejado invalido.');
    END IF;

    SELECT *
    INTO v_identity
    FROM public.resolve_student_portal_identity(p_user_id, p_cpf, p_birth_date)
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN JSON_BUILD_OBJECT('success', false, 'error', 'Dados de acesso invalidos.');
    END IF;

    IF v_identity.organization_id IS NULL THEN
        RETURN JSON_BUILD_OBJECT(
            'success', false,
            'error', 'A escola precisa concluir a configuracao da organizacao para receber solicitacoes.'
        );
    END IF;

    SELECT *
    INTO v_student
    FROM public.students
    WHERE id = v_identity.student_id
    LIMIT 1;

    SELECT COUNT(*)
    INTO v_pending_count
    FROM public.student_training_requests r
    WHERE r.student_id = v_identity.student_id
      AND r.organization_id = v_identity.organization_id
      AND r.status = 'pending';

    IF v_pending_count >= 5 THEN
        RETURN JSON_BUILD_OBJECT(
            'success', false,
            'error', 'Voce ja possui solicitacoes pendentes. Aguarde o retorno da escola.'
        );
    END IF;

    SELECT r.id
    INTO v_existing_id
    FROM public.student_training_requests r
    WHERE r.student_id = v_identity.student_id
      AND r.organization_id = v_identity.organization_id
      AND r.status = 'pending'
      AND r.request_type = p_request_type
      AND COALESCE(r.preferred_date, DATE '1900-01-01') =
          COALESCE(p_preferred_date, DATE '1900-01-01')
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
        v_identity.owner_user_id,
        v_identity.organization_id,
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
$submit_student_training_request_compat$;

CREATE OR REPLACE FUNCTION public.sign_student_contract(
    p_student_id UUID,
    p_cpf TEXT,
    p_birth_date DATE,
    p_ip_address TEXT,
    p_user_agent TEXT,
    p_contract_text TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $sign_student_contract_compat$
DECLARE
    v_student RECORD;
    v_clean_cpf TEXT;
BEGIN
    v_clean_cpf := regexp_replace(COALESCE(p_cpf, ''), '[^0-9]', '', 'g');

    IF p_student_id IS NULL
       OR p_birth_date IS NULL
       OR p_birth_date > CURRENT_DATE
       OR length(v_clean_cpf) <> 11
       OR v_clean_cpf = repeat(substr(v_clean_cpf, 1, 1), 11)
    THEN
        RETURN JSON_BUILD_OBJECT('success', false, 'error', 'Credenciais invalidas.');
    END IF;

    SELECT
        s.*,
        COALESCE(o.owner_user_id, s.user_id) AS resolved_owner_user_id
    INTO v_student
    FROM public.students s
    LEFT JOIN public.organizations o
      ON o.id = s.organization_id
     AND o.status = 'active'
    WHERE s.id = p_student_id
      AND s.business_type = 'sport_school'
      AND s.active = TRUE
      AND s.birth_date = p_birth_date
      AND public.normalize_student_portal_cpf(s.cpf) = v_clean_cpf
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN JSON_BUILD_OBJECT(
            'success', false,
            'error', 'Aluno nao encontrado ou credenciais incorretas.'
        );
    END IF;

    INSERT INTO public.contract_signatures (
        student_id,
        user_id,
        organization_id,
        ip_address,
        user_agent,
        contract_text
    )
    VALUES (
        p_student_id,
        v_student.resolved_owner_user_id,
        v_student.organization_id,
        NULLIF(left(trim(COALESCE(p_ip_address, '')), 100), ''),
        NULLIF(left(trim(COALESCE(p_user_agent, '')), 500), ''),
        p_contract_text
    )
    ON CONFLICT (student_id) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        organization_id = EXCLUDED.organization_id,
        signed_at = timezone('utc'::text, now()),
        ip_address = EXCLUDED.ip_address,
        user_agent = EXCLUDED.user_agent,
        contract_text = EXCLUDED.contract_text;

    RETURN JSON_BUILD_OBJECT(
        'success', true,
        'message', 'Contrato assinado digitalmente com sucesso.'
    );
END;
$sign_student_contract_compat$;

REVOKE ALL ON FUNCTION public.get_student_portal_branding(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_student_portal_data(TEXT, DATE, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_student_portal_requests(TEXT, DATE, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_student_training_request(TEXT, DATE, UUID, TEXT, DATE, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sign_student_contract(UUID, TEXT, DATE, TEXT, TEXT, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_student_portal_branding(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_student_portal_data(TEXT, DATE, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_student_portal_requests(TEXT, DATE, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_student_training_request(TEXT, DATE, UUID, TEXT, DATE, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sign_student_contract(UUID, TEXT, DATE, TEXT, TEXT, TEXT) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

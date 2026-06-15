-- Migration: Update RPCs to return active niche WhatsApp number
-- Date: 2026-06-15

-- 1. get_public_arena_data
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
        'court_id', t.court_id,
        'date', t.date,
        'start_time', t.start_time,
        'end_time', t.end_time
    )), '[]'::JSON)
    INTO v_reservations
    FROM public.reservations t
    WHERE t.user_id = v_profile.user_id
      AND t.organization_id = v_profile.organization_id
      AND t.business_type = 'arena'
      AND t.date >= CURRENT_DATE;

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


-- 2. get_student_portal_branding
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
    v_school_whatsapp TEXT;
BEGIN
    SELECT *
    INTO v_tenant
    FROM public.resolve_student_portal_tenant(p_user_id)
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN JSON_BUILD_OBJECT(
            'success', false,
            'school_name', v_school_name,
            'logo_url', NULL,
            'school_whatsapp', NULL
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
            'logo_url', NULL,
            'school_whatsapp', NULL
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
    v_school_whatsapp := NULLIF(v_niche_settings->'sport_school'->>'whatsapp', '');

    RETURN JSON_BUILD_OBJECT(
        'success', true,
        'school_name', v_school_name,
        'logo_url', v_logo_url,
        'school_whatsapp', v_school_whatsapp
    );
END;
$student_portal_branding_compat$;

REVOKE ALL ON FUNCTION public.get_student_portal_branding(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_student_portal_branding(UUID) TO anon, authenticated;


-- 3. get_student_portal_data
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
    v_school_whatsapp TEXT;
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
    v_school_whatsapp := NULLIF(v_niche_settings->'sport_school'->>'whatsapp', '');
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
            'school_whatsapp', v_school_whatsapp,
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

REVOKE ALL ON FUNCTION public.get_student_portal_data(TEXT, DATE, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_student_portal_data(TEXT, DATE, UUID) TO anon, authenticated;

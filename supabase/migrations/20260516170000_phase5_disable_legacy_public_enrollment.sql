-- Phase 5: remove the legacy public enrollment surface.
-- The product now supports only Sportiz Sport and Esportiz Arena.
-- Internal student registration remains available in the authenticated admin panel.

DO $$
DECLARE
    v_table_name TEXT;
BEGIN
    FOREACH v_table_name IN ARRAY ARRAY[
        'students',
        'trainings',
        'plans',
        'modalities',
        'expenses',
        'products',
        'sales',
        'payments',
        'attendance',
        'groups',
        'comandas'
    ]
    LOOP
        IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = v_table_name
              AND column_name = 'business_type'
        ) THEN
            EXECUTE format(
                'UPDATE public.%I SET business_type = %L WHERE business_type = %L',
                v_table_name,
                'sport_school',
                'other'
            );
        END IF;
    END LOOP;
END;
$$;

UPDATE public.profiles
SET business_type = 'sport_school',
    updated_at = NOW()
WHERE business_type = 'other';

ALTER TABLE public.profiles
    DROP CONSTRAINT IF EXISTS profiles_business_type_check;

ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_business_type_check
    CHECK (business_type IN ('sport_school', 'arena'));

CREATE OR REPLACE FUNCTION public.get_public_enrollment_data(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN JSON_BUILD_OBJECT(
        'success', false,
        'enabled', false,
        'error', 'Inscricao publica indisponivel. Use o painel administrativo.'
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_public_enrollment(
    p_user_id UUID,
    p_name TEXT,
    p_cpf TEXT,
    p_birth_date DATE,
    p_email TEXT,
    p_phone TEXT,
    p_plan_id UUID,
    p_group_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN JSON_BUILD_OBJECT(
        'success', false,
        'enabled', false,
        'error', 'Inscricao publica indisponivel. Use o painel administrativo.'
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_public_enrollment_data(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.submit_public_enrollment(UUID, TEXT, TEXT, DATE, TEXT, TEXT, UUID, UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_public_enrollment_data(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_public_enrollment(UUID, TEXT, TEXT, DATE, TEXT, TEXT, UUID, UUID) TO anon, authenticated;

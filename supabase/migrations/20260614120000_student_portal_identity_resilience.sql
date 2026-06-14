-- Student Portal identity resilience.
-- Keeps CPF + birth date authentication isolated by organization/owner while
-- supporting legacy CPF values imported as numeric, decimal, or scientific text.

-- Remove the incompatible overload introduced by the first signature draft.
DROP FUNCTION IF EXISTS public.get_student_portal_data(UUID, TEXT, DATE);

CREATE OR REPLACE FUNCTION public.normalize_student_portal_cpf(p_cpf TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $normalize_student_portal_cpf_resilient$
DECLARE
    v_raw TEXT;
    v_digits TEXT;
BEGIN
    v_raw := upper(trim(COALESCE(p_cpf, '')));

    -- Spreadsheet imports may persist a CPF as "5140773027.0".
    IF v_raw ~ '^[0-9]+[.,]0+$' THEN
        v_raw := regexp_replace(v_raw, '[.,]0+$', '');
    -- Scientific notation can also appear after CSV/Excel numeric conversion.
    ELSIF replace(v_raw, ',', '.') ~ '^[0-9]+([.][0-9]+)?E[+][0-9]+$' THEN
        BEGIN
            v_raw := trunc(replace(v_raw, ',', '.')::NUMERIC)::TEXT;
        EXCEPTION
            WHEN numeric_value_out_of_range OR invalid_text_representation THEN
                RETURN '';
        END;
    END IF;

    v_digits := regexp_replace(v_raw, '[^0-9]', '', 'g');

    IF length(v_digits) BETWEEN 1 AND 10 THEN
        RETURN lpad(v_digits, 11, '0');
    END IF;

    RETURN v_digits;
END;
$normalize_student_portal_cpf_resilient$;

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
AS $resolve_student_portal_identity_resilient$
DECLARE
    v_tenant RECORD;
    v_clean_cpf TEXT;
BEGIN
    v_clean_cpf := public.normalize_student_portal_cpf(p_cpf);

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
    WHERE COALESCE(NULLIF(s.business_type, ''), 'sport_school') = 'sport_school'
      AND s.birth_date = p_birth_date
      AND s.active = TRUE
      AND public.normalize_student_portal_cpf(s.cpf) = v_clean_cpf
      AND (
          (
              v_tenant.organization_id IS NOT NULL
              AND s.organization_id = v_tenant.organization_id
          )
          OR s.user_id = v_tenant.owner_user_id
          OR EXISTS (
              SELECT 1
              FROM public.organizations student_org
              WHERE student_org.id = s.organization_id
                AND student_org.owner_user_id = v_tenant.owner_user_id
          )
      )
    ORDER BY
        CASE
            WHEN v_tenant.organization_id IS NOT NULL
             AND s.organization_id = v_tenant.organization_id THEN 0
            WHEN s.user_id = v_tenant.owner_user_id THEN 1
            ELSE 2
        END,
        s.updated_at DESC NULLS LAST,
        s.created_at DESC
    LIMIT 1;
END;
$resolve_student_portal_identity_resilient$;

REVOKE ALL ON FUNCTION public.normalize_student_portal_cpf(TEXT)
FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.resolve_student_portal_identity(UUID, TEXT, DATE)
FROM PUBLIC, anon, authenticated;

-- Apply the immutable-signature policy to databases where the original
-- contract migration has already been executed.
ALTER TABLE public.contract_signatures ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Managers can manage signatures" ON public.contract_signatures;
CREATE POLICY "Managers can manage signatures"
ON public.contract_signatures
FOR SELECT TO authenticated
USING (
    auth.uid() = user_id
    OR public.has_organization_role(organization_id, ARRAY['owner', 'manager'])
);

REVOKE ALL ON TABLE public.contract_signatures FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.contract_signatures TO authenticated;

NOTIFY pgrst, 'reload schema';

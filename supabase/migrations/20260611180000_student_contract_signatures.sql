-- Add digital contract signatures without changing the student portal login RPC.

CREATE TABLE IF NOT EXISTS public.contract_signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    signed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    contract_text TEXT NOT NULL,
    CONSTRAINT unique_student_signature UNIQUE (student_id)
);

ALTER TABLE public.contract_signatures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Managers can manage signatures" ON public.contract_signatures;

-- Signatures are immutable from the client. Managers can only read them;
-- creation/update happens through the validated SECURITY DEFINER RPC below.
CREATE POLICY "Managers can manage signatures"
ON public.contract_signatures
FOR SELECT TO authenticated
USING (
    auth.uid() = user_id
    OR public.has_organization_role(organization_id, ARRAY['owner', 'manager'])
);

REVOKE ALL ON TABLE public.contract_signatures FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.contract_signatures TO authenticated;

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
AS $sign_student_contract$
DECLARE
    v_student RECORD;
BEGIN
    SELECT *
    INTO v_student
    FROM public.students
    WHERE id = p_student_id
      AND regexp_replace(COALESCE(cpf, ''), '[^0-9]', '', 'g') =
          regexp_replace(COALESCE(p_cpf, ''), '[^0-9]', '', 'g')
      AND birth_date = p_birth_date
      AND active = TRUE
      AND business_type = 'sport_school'
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
        v_student.user_id,
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
$sign_student_contract$;

REVOKE ALL ON FUNCTION public.sign_student_contract(UUID, TEXT, DATE, TEXT, TEXT, TEXT)
FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sign_student_contract(UUID, TEXT, DATE, TEXT, TEXT, TEXT)
TO authenticated, anon;

-- get_student_portal_data intentionally remains tenant-scoped as
-- (TEXT, DATE, UUID). The compatibility migration extends its response.

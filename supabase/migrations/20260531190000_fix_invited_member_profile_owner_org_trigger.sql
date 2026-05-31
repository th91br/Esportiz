-- Fase 2.13.8 - Corrige criacao indevida de organizacao propria para membros convidados.
-- Contexto:
-- - Donos continuam recebendo organizacao propria quando criam perfil sem organization_id.
-- - Funcionarios convidados ja chegam com organization_id da empresa que convidou.
-- - Nesse caso, a trigger nao deve criar uma segunda organizacao nem promover o funcionario a owner.

CREATE OR REPLACE FUNCTION public.ensure_owner_organization_for_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_organization_id UUID;
BEGIN
    IF NEW.user_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Perfil ja vinculado a uma organizacao: trata-se de membro/equipe.
    -- Nao cria organizacao propria nem cargo owner indevido.
    IF NEW.organization_id IS NOT NULL THEN
        UPDATE public.organizations
        SET
            name = CASE
                WHEN NULLIF(NEW.ct_name, '') IS NOT NULL AND NEW.ct_name <> 'Esportiz' THEN NEW.ct_name
                ELSE public.organizations.name
            END,
            updated_at = NOW()
        WHERE id = NEW.organization_id
          AND owner_user_id = NEW.user_id;

        RETURN NEW;
    END IF;

    -- Fluxo normal do dono/CEO criando a propria conta.
    INSERT INTO public.organizations (owner_user_id, name)
    VALUES (NEW.user_id, COALESCE(NULLIF(NEW.ct_name, ''), 'Esportiz'))
    ON CONFLICT (owner_user_id)
    DO UPDATE SET
        name = CASE
            WHEN NULLIF(EXCLUDED.name, '') IS NOT NULL AND EXCLUDED.name <> 'Esportiz' THEN EXCLUDED.name
            ELSE public.organizations.name
        END,
        updated_at = NOW()
    RETURNING id INTO v_organization_id;

    INSERT INTO public.organization_members (organization_id, user_id, role, active)
    VALUES (v_organization_id, NEW.user_id, 'owner', TRUE)
    ON CONFLICT (organization_id, user_id)
    DO UPDATE SET
        role = 'owner',
        active = TRUE,
        updated_at = NOW();

    NEW.organization_id := v_organization_id;

    RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.ensure_owner_organization_for_profile() FROM PUBLIC, anon;

-- Limpeza conservadora de organizacoes vazias criadas indevidamente para funcionarios.
-- Remove somente organizacoes sem dados operacionais e cujo dono tem profile apontando
-- para outra organizacao onde ele e membro nao-owner.
WITH accidental_organizations AS (
    SELECT o.id
    FROM public.organizations o
    JOIN public.profiles p
      ON p.user_id = o.owner_user_id
     AND p.organization_id IS NOT NULL
     AND p.organization_id <> o.id
    WHERE EXISTS (
        SELECT 1
        FROM public.organization_members om
        WHERE om.organization_id = p.organization_id
          AND om.user_id = p.user_id
          AND om.role <> 'owner'
    )
      AND NOT EXISTS (SELECT 1 FROM public.students x WHERE x.organization_id = o.id)
      AND NOT EXISTS (SELECT 1 FROM public.groups x WHERE x.organization_id = o.id)
      AND NOT EXISTS (SELECT 1 FROM public.modalities x WHERE x.organization_id = o.id)
      AND NOT EXISTS (SELECT 1 FROM public.plans x WHERE x.organization_id = o.id)
      AND NOT EXISTS (SELECT 1 FROM public.products x WHERE x.organization_id = o.id)
      AND NOT EXISTS (SELECT 1 FROM public.trainings x WHERE x.organization_id = o.id)
      AND NOT EXISTS (SELECT 1 FROM public.payments x WHERE x.organization_id = o.id)
      AND NOT EXISTS (SELECT 1 FROM public.attendance x WHERE x.organization_id = o.id)
      AND NOT EXISTS (SELECT 1 FROM public.group_students x WHERE x.organization_id = o.id)
      AND NOT EXISTS (SELECT 1 FROM public.training_students x WHERE x.organization_id = o.id)
      AND NOT EXISTS (SELECT 1 FROM public.expenses x WHERE x.organization_id = o.id)
      AND NOT EXISTS (SELECT 1 FROM public.sales x WHERE x.organization_id = o.id)
      AND NOT EXISTS (SELECT 1 FROM public.comandas x WHERE x.organization_id = o.id)
      AND NOT EXISTS (SELECT 1 FROM public.comanda_items x WHERE x.organization_id = o.id)
      AND NOT EXISTS (SELECT 1 FROM public.financial_audit_logs x WHERE x.organization_id = o.id)
      AND NOT EXISTS (SELECT 1 FROM public.student_training_requests x WHERE x.organization_id = o.id)
)
DELETE FROM public.organization_members om
USING accidental_organizations ao
WHERE om.organization_id = ao.id;

WITH accidental_organizations AS (
    SELECT o.id
    FROM public.organizations o
    JOIN public.profiles p
      ON p.user_id = o.owner_user_id
     AND p.organization_id IS NOT NULL
     AND p.organization_id <> o.id
    WHERE EXISTS (
        SELECT 1
        FROM public.organization_members om
        WHERE om.organization_id = p.organization_id
          AND om.user_id = p.user_id
          AND om.role <> 'owner'
    )
      AND NOT EXISTS (SELECT 1 FROM public.students x WHERE x.organization_id = o.id)
      AND NOT EXISTS (SELECT 1 FROM public.groups x WHERE x.organization_id = o.id)
      AND NOT EXISTS (SELECT 1 FROM public.modalities x WHERE x.organization_id = o.id)
      AND NOT EXISTS (SELECT 1 FROM public.plans x WHERE x.organization_id = o.id)
      AND NOT EXISTS (SELECT 1 FROM public.products x WHERE x.organization_id = o.id)
      AND NOT EXISTS (SELECT 1 FROM public.trainings x WHERE x.organization_id = o.id)
      AND NOT EXISTS (SELECT 1 FROM public.payments x WHERE x.organization_id = o.id)
      AND NOT EXISTS (SELECT 1 FROM public.attendance x WHERE x.organization_id = o.id)
      AND NOT EXISTS (SELECT 1 FROM public.group_students x WHERE x.organization_id = o.id)
      AND NOT EXISTS (SELECT 1 FROM public.training_students x WHERE x.organization_id = o.id)
      AND NOT EXISTS (SELECT 1 FROM public.expenses x WHERE x.organization_id = o.id)
      AND NOT EXISTS (SELECT 1 FROM public.sales x WHERE x.organization_id = o.id)
      AND NOT EXISTS (SELECT 1 FROM public.comandas x WHERE x.organization_id = o.id)
      AND NOT EXISTS (SELECT 1 FROM public.comanda_items x WHERE x.organization_id = o.id)
      AND NOT EXISTS (SELECT 1 FROM public.financial_audit_logs x WHERE x.organization_id = o.id)
      AND NOT EXISTS (SELECT 1 FROM public.student_training_requests x WHERE x.organization_id = o.id)
)
DELETE FROM public.organizations o
USING accidental_organizations ao
WHERE o.id = ao.id;

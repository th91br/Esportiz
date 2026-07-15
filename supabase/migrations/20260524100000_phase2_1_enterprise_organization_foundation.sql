-- Phase 2.1: enterprise organization foundation.
-- Safe, additive migration:
-- - Does not remove user_id from existing business tables.
-- - Does not change current RLS policies for operational tables.
-- - Creates a canonical organization layer for future multi-user access.

CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Esportiz',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(owner_user_id)
);

CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'receptionist' CHECK (role IN ('owner', 'manager', 'receptionist', 'instructor')),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    invited_email TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS organizations_owner_user_id_idx
ON public.organizations(owner_user_id);

CREATE INDEX IF NOT EXISTS organization_members_user_active_idx
ON public.organization_members(user_id, active);

CREATE INDEX IF NOT EXISTS organization_members_org_role_idx
ON public.organization_members(organization_id, role, active);

CREATE UNIQUE INDEX IF NOT EXISTS organization_members_one_active_owner_idx
ON public.organization_members(organization_id)
WHERE role = 'owner' AND active = TRUE;

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_organization_owner(p_organization_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.organizations o
        WHERE o.id = p_organization_id
          AND o.owner_user_id = auth.uid()
          AND o.status = 'active'
    );
$$;

CREATE OR REPLACE FUNCTION public.is_organization_member(p_organization_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.organization_members om
        JOIN public.organizations o ON o.id = om.organization_id
        WHERE om.organization_id = p_organization_id
          AND om.user_id = auth.uid()
          AND om.active = TRUE
          AND o.status = 'active'
    );
$$;

CREATE OR REPLACE FUNCTION public.get_auth_organization_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_organization_id UUID;
BEGIN
    SELECT om.organization_id
    INTO v_organization_id
    FROM public.organization_members om
    JOIN public.organizations o ON o.id = om.organization_id
    WHERE om.user_id = auth.uid()
      AND om.active = TRUE
      AND o.status = 'active'
    ORDER BY CASE WHEN om.role = 'owner' THEN 0 ELSE 1 END, om.created_at ASC
    LIMIT 1;

    IF v_organization_id IS NOT NULL THEN
        RETURN v_organization_id;
    END IF;

    SELECT id
    INTO v_organization_id
    FROM public.organizations
    WHERE owner_user_id = auth.uid()
      AND status = 'active'
    LIMIT 1;

    RETURN v_organization_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_auth_owner_user_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_owner_user_id UUID;
BEGIN
    SELECT o.owner_user_id
    INTO v_owner_user_id
    FROM public.organizations o
    WHERE o.id = public.get_auth_organization_id()
      AND o.status = 'active'
    LIMIT 1;

    RETURN COALESCE(v_owner_user_id, auth.uid());
END;
$$;

-- Compatibility bridge for the previous tenant helper.
-- Future RLS phases can use get_auth_owner_user_id() while existing data still has user_id.
CREATE OR REPLACE FUNCTION public.get_auth_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.get_auth_owner_user_id();
$$;

DROP POLICY IF EXISTS "Organizations are visible to active members" ON public.organizations;
DROP POLICY IF EXISTS "Owners can create organizations" ON public.organizations;
DROP POLICY IF EXISTS "Owners can update organizations" ON public.organizations;
DROP POLICY IF EXISTS "Organization members are visible to owners and self" ON public.organization_members;
DROP POLICY IF EXISTS "Owners can manage organization members" ON public.organization_members;

CREATE POLICY "Organizations are visible to active members"
ON public.organizations
FOR SELECT
USING (
    owner_user_id = auth.uid()
    OR public.is_organization_member(id)
);

CREATE POLICY "Owners can create organizations"
ON public.organizations
FOR INSERT
WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Owners can update organizations"
ON public.organizations
FOR UPDATE
USING (owner_user_id = auth.uid())
WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Organization members are visible to owners and self"
ON public.organization_members
FOR SELECT
USING (
    user_id = auth.uid()
    OR public.is_organization_owner(organization_id)
);

CREATE POLICY "Owners can manage organization members"
ON public.organization_members
FOR ALL
USING (public.is_organization_owner(organization_id))
WITH CHECK (public.is_organization_owner(organization_id));

WITH tenant_users AS (
    SELECT user_id, NULLIF(ct_name, '') AS display_name FROM public.profiles WHERE user_id IS NOT NULL
    UNION ALL SELECT DISTINCT user_id, NULL::TEXT FROM public.students WHERE user_id IS NOT NULL
    UNION ALL SELECT DISTINCT user_id, NULL::TEXT FROM public.plans WHERE user_id IS NOT NULL
    UNION ALL SELECT DISTINCT user_id, NULL::TEXT FROM public.trainings WHERE user_id IS NOT NULL
    UNION ALL SELECT DISTINCT user_id, NULL::TEXT FROM public.payments WHERE user_id IS NOT NULL
    UNION ALL SELECT DISTINCT user_id, NULL::TEXT FROM public.products WHERE user_id IS NOT NULL
    UNION ALL SELECT DISTINCT user_id, NULL::TEXT FROM public.sales WHERE user_id IS NOT NULL
    UNION ALL SELECT DISTINCT user_id, NULL::TEXT FROM public.expenses WHERE user_id IS NOT NULL
    UNION ALL SELECT DISTINCT user_id, NULL::TEXT FROM public.comandas WHERE user_id IS NOT NULL
)
INSERT INTO public.organizations (owner_user_id, name)
SELECT
    user_id,
    COALESCE(MAX(display_name), 'Esportiz')
FROM tenant_users
GROUP BY user_id
ON CONFLICT (owner_user_id) DO NOTHING;

INSERT INTO public.organization_members (organization_id, user_id, role, active)
SELECT
    o.id,
    o.owner_user_id,
    'owner',
    TRUE
FROM public.organizations o
ON CONFLICT (organization_id, user_id)
DO UPDATE SET
    role = 'owner',
    active = TRUE,
    updated_at = NOW();

DO $$
BEGIN
    IF to_regclass('public.team_members') IS NOT NULL THEN
        EXECUTE $team_members_backfill$
            INSERT INTO public.organization_members (
                organization_id,
                user_id,
                role,
                active,
                invited_email
            )
            SELECT
                o.id,
                tm.member_auth_id,
                CASE
                    WHEN tm.role IN ('manager', 'receptionist', 'instructor') THEN tm.role
                    ELSE 'receptionist'
                END,
                COALESCE(tm.active, TRUE),
                tm.email
            FROM public.team_members tm
            JOIN public.organizations o ON o.owner_user_id = tm.tenant_id
            WHERE tm.member_auth_id IS NOT NULL
              AND tm.member_auth_id <> o.owner_user_id
            ON CONFLICT (organization_id, user_id)
            DO UPDATE SET
                role = EXCLUDED.role,
                active = EXCLUDED.active,
                invited_email = EXCLUDED.invited_email,
                updated_at = NOW()
        $team_members_backfill$;
    END IF;
END;
$$;

DROP TRIGGER IF EXISTS update_organizations_updated_at ON public.organizations;
CREATE TRIGGER update_organizations_updated_at
BEFORE UPDATE ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_organization_members_updated_at ON public.organization_members;
CREATE TRIGGER update_organization_members_updated_at
BEFORE UPDATE ON public.organization_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

REVOKE ALL ON TABLE public.organizations FROM PUBLIC;
REVOKE ALL ON TABLE public.organization_members FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE ON TABLE public.organizations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.organization_members TO authenticated;

REVOKE ALL ON FUNCTION public.is_organization_owner(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_organization_member(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_auth_organization_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_auth_owner_user_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_auth_tenant_id() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_organization_owner(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_organization_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_auth_organization_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_auth_owner_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_auth_tenant_id() TO authenticated;

-- Phase 2.10: financial RPC organization-readiness foundation.
-- Safe, additive migration:
-- - Does not change existing financial RPC behavior.
-- - Adds reusable authorization helpers for future organization-aware financial RPCs.
-- - Keeps current owner-user flows compatible while allowing controlled team access in later phases.
-- - Does not alter payments, sales, comandas, reservations, or audit data.

CREATE OR REPLACE FUNCTION public.can_access_owner_user_data(
    p_owner_user_id UUID,
    p_roles TEXT[] DEFAULT ARRAY['owner', 'manager']
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
    SELECT
        auth.uid() IS NOT NULL
        AND p_owner_user_id IS NOT NULL
        AND (
            auth.uid() = p_owner_user_id
            OR EXISTS (
                SELECT 1
                FROM public.organizations o
                JOIN public.organization_members om
                  ON om.organization_id = o.id
                WHERE o.owner_user_id = p_owner_user_id
                  AND o.status = 'active'
                  AND om.user_id = auth.uid()
                  AND om.active = TRUE
                  AND om.role = ANY(p_roles)
            )
        );
$function$;

CREATE OR REPLACE FUNCTION public.can_access_organization_financials(
    p_organization_id UUID,
    p_roles TEXT[] DEFAULT ARRAY['owner', 'manager']
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
    SELECT
        auth.uid() IS NOT NULL
        AND p_organization_id IS NOT NULL
        AND EXISTS (
            SELECT 1
            FROM public.organizations o
            JOIN public.organization_members om
              ON om.organization_id = o.id
            WHERE o.id = p_organization_id
              AND o.status = 'active'
              AND om.user_id = auth.uid()
              AND om.active = TRUE
              AND om.role = ANY(p_roles)
        );
$function$;

REVOKE ALL ON FUNCTION public.can_access_owner_user_data(UUID, TEXT[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_access_organization_financials(UUID, TEXT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_owner_user_data(UUID, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_organization_financials(UUID, TEXT[]) TO authenticated;

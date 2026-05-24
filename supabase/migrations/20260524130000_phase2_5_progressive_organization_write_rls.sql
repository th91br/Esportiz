-- Phase 2.5: progressive organization-based write RLS for low-risk operational catalogs.
-- Safe, additive migration:
-- - Keeps current user_id policies untouched for owner/frontend compatibility.
-- - Adds owner/manager organization write policies only to lower-risk catalog tables.
-- - Does not change payments, sales, comandas, agenda/trainings, attendance, or audit logs.
-- - Guards optional tables so production schemas with removed/unused tables do not fail.

CREATE OR REPLACE FUNCTION public.has_organization_role(
    p_organization_id UUID,
    p_roles TEXT[]
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
    SELECT EXISTS (
        SELECT 1
        FROM public.organization_members om
        JOIN public.organizations o
          ON o.id = om.organization_id
        WHERE om.organization_id = p_organization_id
          AND om.user_id = auth.uid()
          AND om.active = TRUE
          AND o.status = 'active'
          AND om.role = ANY(p_roles)
    );
$function$;

DO $phase25_progressive_org_write_rls$
DECLARE
    v_table TEXT;
    v_insert_policy TEXT;
    v_update_policy TEXT;
    v_delete_policy TEXT;
BEGIN
    FOREACH v_table IN ARRAY ARRAY[
        'categories',
        'modalities',
        'groups',
        'group_students',
        'products'
    ]
    LOOP
        IF to_regclass('public.' || v_table) IS NOT NULL
           AND EXISTS (
               SELECT 1
               FROM information_schema.columns
               WHERE table_schema = 'public'
                 AND table_name = v_table
                 AND column_name = 'organization_id'
           )
        THEN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_table);

            v_insert_policy := 'Organization managers can insert ' || v_table;
            v_update_policy := 'Organization managers can update ' || v_table;
            v_delete_policy := 'Organization managers can delete ' || v_table;

            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_insert_policy, v_table);
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_update_policy, v_table);
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_delete_policy, v_table);

            EXECUTE format(
                'CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK (public.has_organization_role(organization_id, ARRAY[''owner'', ''manager'']))',
                v_insert_policy,
                v_table
            );

            EXECUTE format(
                'CREATE POLICY %I ON public.%I FOR UPDATE USING (public.has_organization_role(organization_id, ARRAY[''owner'', ''manager''])) WITH CHECK (public.has_organization_role(organization_id, ARRAY[''owner'', ''manager'']))',
                v_update_policy,
                v_table
            );

            EXECUTE format(
                'CREATE POLICY %I ON public.%I FOR DELETE USING (public.has_organization_role(organization_id, ARRAY[''owner'', ''manager'']))',
                v_delete_policy,
                v_table
            );
        END IF;
    END LOOP;
END;
$phase25_progressive_org_write_rls$;

REVOKE ALL ON FUNCTION public.has_organization_role(UUID, TEXT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_organization_role(UUID, TEXT[]) TO authenticated;

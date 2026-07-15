-- Phase 2.4: progressive organization-based RLS.
-- Safe, additive migration:
-- - Keeps existing user_id policies untouched for current frontend compatibility.
-- - Adds organization-member SELECT policies to core tenant-owned tables.
-- - Does not enable organization-based writes yet; write access remains governed by current policies/RPCs.
-- - Guards optional tables so production schemas with removed/unused tables do not fail.

DO $phase24_progressive_org_select_rls$
DECLARE
    v_table TEXT;
    v_policy TEXT;
BEGIN
    FOREACH v_table IN ARRAY ARRAY[
        'profiles',
        'students',
        'plans',
        'trainings',
        'training_students',
        'attendance',
        'payments',
        'categories',
        'groups',
        'group_students',
        'modalities',
        'expenses',
        'products',
        'sales',
        'comandas',
        'comanda_items',
        'financial_audit_logs'
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

            v_policy := 'Organization members can view ' || v_table;

            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', v_policy, v_table);
            EXECUTE format(
                'CREATE POLICY %I ON public.%I FOR SELECT USING (public.is_organization_member(organization_id))',
                v_policy,
                v_table
            );
        END IF;
    END LOOP;
END;
$phase24_progressive_org_select_rls$;

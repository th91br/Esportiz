-- Phase 2.12.8.2: organization-based RLS policy audit.
-- Audit-only script: it does not create, update, delete, revoke, grant, or alter anything.
-- Run each section in Supabase SQL Editor and review the "status" columns.

-- 1) Organization-aware RLS coverage by table and command.
-- Tables marked "direct_*_required" still depend on authenticated frontend CRUD today.
-- Tables marked not required should be written through RPCs, triggers, or controlled public functions.
WITH expected_tables(
    table_name,
    direct_select_required,
    direct_insert_required,
    direct_update_required,
    direct_delete_required
) AS (
    VALUES
        ('students', true, true, true, true),
        ('plans', true, true, true, true),
        ('trainings', true, true, true, true),
        ('training_students', true, true, true, true),
        ('attendance', true, true, true, true),
        ('groups', true, true, true, true),
        ('group_students', true, true, true, true),
        ('modalities', true, true, true, true),
        ('products', true, true, true, true),
        ('expenses', true, true, true, true),
        ('comandas', true, true, true, true),
        ('comanda_items', true, true, true, true),
        ('payments', true, false, false, false),
        ('sales', true, false, false, false),
        ('financial_audit_logs', true, false, false, false),
        ('student_training_requests', true, false, true, true),
        ('organizations', true, true, true, false),
        ('organization_members', true, true, true, true)
),
policy_base AS (
    SELECT
        p.tablename AS table_name,
        p.policyname,
        p.cmd,
        lower(COALESCE(p.qual, '') || ' ' || COALESCE(p.with_check, '')) AS policy_text
    FROM pg_policies p
    JOIN expected_tables e ON e.table_name = p.tablename
    WHERE p.schemaname = 'public'
),
policy_flags AS (
    SELECT
        table_name,
        policyname,
        cmd,
        policy_text,
        (
            policy_text LIKE '%organization_id%'
            AND (
                policy_text LIKE '%is_organization_member%'
                OR policy_text LIKE '%has_organization_role%'
                OR policy_text LIKE '%is_organization_owner%'
                OR policy_text LIKE '%get_auth_organization_id%'
                OR policy_text LIKE '%can_access_organization_financials%'
                OR policy_text LIKE '%can_access_owner_user_data%'
            )
        ) OR (
            table_name = 'organizations'
            AND policy_text LIKE '%is_organization_member%'
        ) OR (
            table_name = 'organizations'
            AND policy_text LIKE '%owner_user_id%'
            AND policy_text LIKE '%auth.uid%'
        ) AS is_org_aware,
        policy_text LIKE '%auth.uid%' AND policy_text LIKE '%user_id%' AS is_legacy_user_aware
    FROM policy_base
),
coverage AS (
    SELECT
        table_name,
        bool_or((cmd IN ('SELECT', 'ALL')) AND is_org_aware) AS org_select_policy,
        bool_or((cmd IN ('INSERT', 'ALL')) AND is_org_aware) AS org_insert_policy,
        bool_or((cmd IN ('UPDATE', 'ALL')) AND is_org_aware) AS org_update_policy,
        bool_or((cmd IN ('DELETE', 'ALL')) AND is_org_aware) AS org_delete_policy,
        bool_or((cmd IN ('SELECT', 'ALL')) AND is_legacy_user_aware) AS legacy_select_policy,
        bool_or((cmd IN ('INSERT', 'ALL')) AND is_legacy_user_aware) AS legacy_insert_policy,
        bool_or((cmd IN ('UPDATE', 'ALL')) AND is_legacy_user_aware) AS legacy_update_policy,
        bool_or((cmd IN ('DELETE', 'ALL')) AND is_legacy_user_aware) AS legacy_delete_policy
    FROM policy_flags
    GROUP BY table_name
)
SELECT
    e.table_name,
    CASE
        WHEN c.org_select_policy THEN 'ok'
        WHEN e.direct_select_required AND c.legacy_select_policy THEN 'review_legacy_select_only'
        WHEN e.direct_select_required THEN 'review_missing_org_select_policy'
        ELSE 'not_required'
    END AS select_policy,
    CASE
        WHEN NOT e.direct_insert_required THEN 'not_required'
        WHEN c.org_insert_policy THEN 'ok'
        WHEN c.legacy_insert_policy THEN 'review_legacy_insert_only'
        ELSE 'review_missing_org_insert_policy'
    END AS insert_policy,
    CASE
        WHEN NOT e.direct_update_required THEN 'not_required'
        WHEN c.org_update_policy THEN 'ok'
        WHEN c.legacy_update_policy THEN 'review_legacy_update_only'
        ELSE 'review_missing_org_update_policy'
    END AS update_policy,
    CASE
        WHEN NOT e.direct_delete_required THEN 'not_required'
        WHEN c.org_delete_policy THEN 'ok'
        WHEN c.legacy_delete_policy THEN 'review_legacy_delete_only'
        ELSE 'review_missing_org_delete_policy'
    END AS delete_policy
FROM expected_tables e
LEFT JOIN coverage c ON c.table_name = e.table_name
ORDER BY e.table_name;

-- 2) Policy inventory classified by guard type.
WITH sensitive_tables(table_name) AS (
    VALUES
        ('students'),
        ('plans'),
        ('trainings'),
        ('training_students'),
        ('attendance'),
        ('groups'),
        ('group_students'),
        ('modalities'),
        ('products'),
        ('expenses'),
        ('comandas'),
        ('comanda_items'),
        ('payments'),
        ('sales'),
        ('financial_audit_logs'),
        ('student_training_requests'),
        ('organizations'),
        ('organization_members')
),
policy_inventory AS (
    SELECT
        p.tablename AS table_name,
        p.policyname,
        p.cmd,
        p.roles,
        COALESCE(p.qual, '') AS using_expression,
        COALESCE(p.with_check, '') AS check_expression,
        lower(COALESCE(p.qual, '') || ' ' || COALESCE(p.with_check, '')) AS policy_text
    FROM pg_policies p
    JOIN sensitive_tables st ON st.table_name = p.tablename
    WHERE p.schemaname = 'public'
)
SELECT
    table_name,
    policyname,
    cmd,
    roles,
    CASE
        WHEN policy_text LIKE '%organization_id%'
             AND (
                 policy_text LIKE '%is_organization_member%'
                 OR policy_text LIKE '%has_organization_role%'
                 OR policy_text LIKE '%is_organization_owner%'
                 OR policy_text LIKE '%get_auth_organization_id%'
                 OR policy_text LIKE '%can_access_organization_financials%'
                 OR policy_text LIKE '%can_access_owner_user_data%'
             )
            THEN 'ok_org_aware'
        WHEN table_name = 'organizations'
             AND policy_text LIKE '%owner_user_id%'
             AND policy_text LIKE '%auth.uid%'
            THEN 'ok_owner_guard'
        WHEN table_name = 'organization_members'
             AND policy_text LIKE '%is_organization_owner%'
            THEN 'ok_org_owner_guard'
        WHEN policy_text LIKE '%auth.uid%' AND policy_text LIKE '%user_id%'
            THEN 'legacy_user_guard'
        WHEN policy_text IN ('true', '(true)', '')
            THEN 'review_broad_or_empty_policy'
        ELSE 'review_unclassified_policy'
    END AS guard_classification,
    using_expression,
    check_expression
FROM policy_inventory
ORDER BY table_name, cmd, policyname;

-- 3) Broad policies on sensitive tables.
WITH sensitive_tables(table_name) AS (
    VALUES
        ('students'),
        ('plans'),
        ('trainings'),
        ('training_students'),
        ('attendance'),
        ('groups'),
        ('group_students'),
        ('modalities'),
        ('products'),
        ('expenses'),
        ('comandas'),
        ('comanda_items'),
        ('payments'),
        ('sales'),
        ('financial_audit_logs'),
        ('student_training_requests'),
        ('organizations'),
        ('organization_members')
)
SELECT
    p.tablename AS table_name,
    p.policyname,
    p.cmd,
    p.roles,
    COALESCE(p.qual, '') AS using_expression,
    COALESCE(p.with_check, '') AS check_expression,
    CASE
        WHEN lower(COALESCE(p.qual, '')) IN ('true', '(true)')
          OR lower(COALESCE(p.with_check, '')) IN ('true', '(true)')
            THEN 'review_true_policy'
        WHEN COALESCE(p.qual, '') = ''
         AND COALESCE(p.with_check, '') = ''
            THEN 'review_empty_policy'
        WHEN lower(COALESCE(p.qual, '') || ' ' || COALESCE(p.with_check, '')) NOT LIKE '%auth.uid%'
         AND lower(COALESCE(p.qual, '') || ' ' || COALESCE(p.with_check, '')) NOT LIKE '%organization%'
            THEN 'review_policy_without_auth_or_org_guard'
        ELSE 'ok'
    END AS status
FROM pg_policies p
JOIN sensitive_tables st ON st.table_name = p.tablename
WHERE p.schemaname = 'public'
  AND (
      lower(COALESCE(p.qual, '')) IN ('true', '(true)')
      OR lower(COALESCE(p.with_check, '')) IN ('true', '(true)')
      OR (COALESCE(p.qual, '') = '' AND COALESCE(p.with_check, '') = '')
      OR (
          lower(COALESCE(p.qual, '') || ' ' || COALESCE(p.with_check, '')) NOT LIKE '%auth.uid%'
          AND lower(COALESCE(p.qual, '') || ' ' || COALESCE(p.with_check, '')) NOT LIKE '%organization%'
      )
  )
ORDER BY p.tablename, p.policyname;

-- 4) Helper functions used by org policies: SECURITY DEFINER, search_path, and grants.
WITH expected_helpers(function_name, args) AS (
    VALUES
        ('is_organization_owner', 'uuid'),
        ('is_organization_member', 'uuid'),
        ('has_organization_role', 'uuid,text[]'),
        ('get_auth_organization_id', ''),
        ('get_auth_owner_user_id', ''),
        ('get_auth_tenant_id', ''),
        ('can_access_organization_financials', 'uuid,text[]'),
        ('can_access_owner_user_data', 'uuid,text[]')
),
resolved AS (
    SELECT
        eh.*,
        CASE
            WHEN eh.args = '' THEN to_regprocedure(format('public.%s()', eh.function_name))
            ELSE to_regprocedure(format('public.%s(%s)', eh.function_name, eh.args))
        END AS function_oid
    FROM expected_helpers eh
),
details AS (
    SELECT
        r.function_name,
        r.args,
        r.function_oid,
        p.proowner,
        p.prosecdef,
        COALESCE(array_to_string(p.proconfig, ','), '') AS config_text
    FROM resolved r
    LEFT JOIN pg_proc p ON p.oid = r.function_oid
),
grants AS (
    SELECT
        d.function_name,
        d.args,
        bool_or(grantee_role.rolname = 'anon' AND acl.privilege_type = 'EXECUTE') AS anon_execute,
        bool_or(grantee_role.rolname = 'authenticated' AND acl.privilege_type = 'EXECUTE') AS authenticated_execute
    FROM details d
    LEFT JOIN pg_proc p ON p.oid = d.function_oid
    LEFT JOIN LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) acl ON true
    LEFT JOIN pg_roles grantee_role ON grantee_role.oid = acl.grantee
    GROUP BY d.function_name, d.args
)
SELECT
    d.function_name,
    d.args,
    CASE WHEN d.function_oid IS NOT NULL THEN 'ok' ELSE 'missing_function' END AS function_exists,
    CASE WHEN d.prosecdef THEN 'ok' ELSE 'review_not_security_definer' END AS security_definer,
    CASE WHEN d.config_text LIKE '%search_path=public%' THEN 'ok' ELSE 'review_missing_search_path' END AS search_path,
    CASE WHEN COALESCE(g.anon_execute, false) = false THEN 'ok' ELSE 'review_anon_execute' END AS anon_execute,
    CASE WHEN COALESCE(g.authenticated_execute, false) = true THEN 'ok' ELSE 'review_authenticated_execute_missing' END AS authenticated_execute
FROM details d
LEFT JOIN grants g
  ON g.function_name = d.function_name
 AND g.args = d.args
ORDER BY d.function_name, d.args;

-- 5) Cross-organization data consistency across linked tables.
WITH checks AS (
    SELECT
        'payments_student_org_mismatch' AS check_name,
        COUNT(*)::BIGINT AS issue_count
    FROM public.payments p
    JOIN public.students s ON s.id = p.student_id
    WHERE p.organization_id IS DISTINCT FROM s.organization_id

    UNION ALL

    SELECT
        'payments_plan_org_mismatch',
        COUNT(*)::BIGINT
    FROM public.payments p
    JOIN public.plans pl ON pl.id = p.plan_id
    WHERE p.organization_id IS DISTINCT FROM pl.organization_id

    UNION ALL

    SELECT
        'training_students_training_org_mismatch',
        COUNT(*)::BIGINT
    FROM public.training_students ts
    JOIN public.trainings t ON t.id = ts.training_id
    WHERE ts.organization_id IS DISTINCT FROM t.organization_id

    UNION ALL

    SELECT
        'training_students_student_org_mismatch',
        COUNT(*)::BIGINT
    FROM public.training_students ts
    JOIN public.students s ON s.id = ts.student_id
    WHERE ts.organization_id IS DISTINCT FROM s.organization_id

    UNION ALL

    SELECT
        'attendance_training_org_mismatch',
        COUNT(*)::BIGINT
    FROM public.attendance a
    JOIN public.trainings t ON t.id = a.training_id
    WHERE a.organization_id IS DISTINCT FROM t.organization_id

    UNION ALL

    SELECT
        'attendance_student_org_mismatch',
        COUNT(*)::BIGINT
    FROM public.attendance a
    JOIN public.students s ON s.id = a.student_id
    WHERE a.organization_id IS DISTINCT FROM s.organization_id

    UNION ALL

    SELECT
        'group_students_group_org_mismatch',
        COUNT(*)::BIGINT
    FROM public.group_students gs
    JOIN public.groups g ON g.id = gs.group_id
    WHERE gs.organization_id IS DISTINCT FROM g.organization_id

    UNION ALL

    SELECT
        'group_students_student_org_mismatch',
        COUNT(*)::BIGINT
    FROM public.group_students gs
    JOIN public.students s ON s.id = gs.student_id
    WHERE gs.organization_id IS DISTINCT FROM s.organization_id

    UNION ALL

    SELECT
        'comanda_items_comanda_org_mismatch',
        COUNT(*)::BIGINT
    FROM public.comanda_items ci
    JOIN public.comandas c ON c.id = ci.comanda_id
    WHERE ci.organization_id IS DISTINCT FROM c.organization_id

    UNION ALL

    SELECT
        'comanda_items_product_org_mismatch',
        COUNT(*)::BIGINT
    FROM public.comanda_items ci
    JOIN public.products p ON p.id = ci.product_id
    WHERE ci.organization_id IS DISTINCT FROM p.organization_id
)
SELECT
    check_name,
    issue_count,
    CASE WHEN issue_count = 0 THEN 'ok' ELSE 'review_cross_org_inconsistency' END AS status
FROM checks
ORDER BY check_name;

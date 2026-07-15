-- Phase 2.12.8.1: Public RPC and portal security audit.
-- Audit-only script: it does not create, update, delete, revoke, grant, or alter anything.
-- Run each section in Supabase SQL Editor and review the "status" columns.

-- 1) Expected public RPCs: existence, SECURITY DEFINER, search_path, anon/authenticated grants.
WITH expected_functions(function_name, args, anon_expected, authenticated_expected, expected_scope) AS (
    VALUES
        ('get_student_portal_branding', 'uuid', true, true, 'student_portal_branding'),
        ('get_student_portal_data', 'text,date,uuid', true, true, 'student_portal_authenticated_read'),
        ('submit_student_training_request', 'text,date,uuid,text,date,text,text', true, true, 'student_portal_pending_request'),
        ('get_public_arena_data', 'uuid', true, true, 'arena_public_read'),
        ('submit_public_reservation', 'uuid,uuid,date,text,integer,text,text,text,text', true, true, 'arena_public_booking')
),
resolved AS (
    SELECT
        e.*,
        to_regprocedure(format('public.%s(%s)', e.function_name, e.args)) AS function_oid
    FROM expected_functions e
),
function_details AS (
    SELECT
        r.*,
        p.proowner,
        p.prosecdef,
        COALESCE(array_to_string(p.proconfig, ','), '') AS config_text
    FROM resolved r
    LEFT JOIN pg_proc p ON p.oid = r.function_oid
),
function_grants AS (
    SELECT
        fd.function_name,
        fd.args,
        bool_or(grantee_role.rolname = 'anon' AND acl.privilege_type = 'EXECUTE') AS anon_has_execute,
        bool_or(grantee_role.rolname = 'authenticated' AND acl.privilege_type = 'EXECUTE') AS authenticated_has_execute
    FROM function_details fd
    LEFT JOIN pg_proc p ON p.oid = fd.function_oid
    LEFT JOIN LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) acl ON true
    LEFT JOIN pg_roles grantee_role ON grantee_role.oid = acl.grantee
    GROUP BY fd.function_name, fd.args
)
SELECT
    fd.function_name,
    fd.args,
    fd.expected_scope,
    CASE WHEN fd.function_oid IS NOT NULL THEN 'ok' ELSE 'missing' END AS function_exists,
    CASE WHEN fd.prosecdef THEN 'ok' ELSE 'review_security_definer' END AS security_definer,
    CASE WHEN fd.config_text LIKE '%search_path=public%' THEN 'ok' ELSE 'review_search_path' END AS search_path,
    CASE WHEN COALESCE(fg.anon_has_execute, false) = fd.anon_expected THEN 'ok' ELSE 'review_anon_execute' END AS anon_execute,
    CASE WHEN COALESCE(fg.authenticated_has_execute, false) = fd.authenticated_expected THEN 'ok' ELSE 'review_authenticated_execute' END AS authenticated_execute
FROM function_details fd
LEFT JOIN function_grants fg
  ON fg.function_name = fd.function_name
 AND fg.args = fd.args
ORDER BY fd.function_name, fd.args;

-- 2) Unexpected anon EXECUTE grants on public functions.
WITH allowed_anon(function_name, args) AS (
    VALUES
        ('get_student_portal_branding', 'uuid'),
        ('get_student_portal_data', 'text,date,uuid'),
        ('submit_student_training_request', 'text,date,uuid,text,date,text,text'),
        ('get_public_arena_data', 'uuid'),
        ('submit_public_reservation', 'uuid,uuid,date,text,integer,text,text,text,text'),
        ('get_public_enrollment_data', 'uuid'),
        ('submit_public_enrollment', 'uuid,text,text,date,text,text,uuid,uuid')
),
anon_executable AS (
    SELECT
        p.proname AS function_name,
        oidvectortypes(p.proargtypes) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    JOIN LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) acl ON true
    JOIN pg_roles grantee_role ON grantee_role.oid = acl.grantee
    WHERE n.nspname = 'public'
      AND grantee_role.rolname = 'anon'
      AND acl.privilege_type = 'EXECUTE'
)
SELECT
    ae.function_name,
    ae.args,
    CASE WHEN aa.function_name IS NULL THEN 'review_unexpected_anon_execute' ELSE 'ok' END AS status
FROM anon_executable ae
LEFT JOIN allowed_anon aa
  ON aa.function_name = ae.function_name
 AND aa.args = replace(ae.args, ' ', '')
WHERE aa.function_name IS NULL
ORDER BY ae.function_name, ae.args;

-- 3) Sensitive tables: RLS and direct table grants.
WITH sensitive_tables(table_name, expected_select, expected_insert, expected_update, expected_delete) AS (
    VALUES
        ('students', true, true, true, true),
        ('payments', true, false, true, true),
        ('trainings', true, true, true, true),
        ('training_students', true, true, true, true),
        ('attendance', true, true, true, true),
        ('groups', true, true, true, true),
        ('group_students', true, true, true, true),
        ('modalities', true, true, true, true),
        ('plans', true, true, true, true),
        ('products', true, true, true, true),
        ('sales', true, false, true, true),
        -- Current frontend still opens comandas and manages comanda items directly.
        -- Keep these inserts authenticated + RLS until they are moved behind RPCs.
        ('comandas', true, true, true, true),
        ('comanda_items', true, true, true, true),
        ('expenses', true, true, true, true),
        ('financial_audit_logs', true, false, false, false),
        ('student_training_requests', true, false, true, true)
),
table_state AS (
    SELECT
        st.table_name,
        st.expected_select,
        st.expected_insert,
        st.expected_update,
        st.expected_delete,
        c.oid,
        c.relrowsecurity,
        c.relforcerowsecurity
    FROM sensitive_tables st
    LEFT JOIN pg_class c
      ON c.relname = st.table_name
     AND c.relnamespace = 'public'::regnamespace
),
grants AS (
    SELECT
        table_name,
        bool_or(grantee = 'anon') AS anon_has_any_grant,
        bool_or(grantee = 'authenticated' AND privilege_type = 'SELECT') AS authenticated_select,
        bool_or(grantee = 'authenticated' AND privilege_type = 'INSERT') AS authenticated_insert,
        bool_or(grantee = 'authenticated' AND privilege_type = 'UPDATE') AS authenticated_update,
        bool_or(grantee = 'authenticated' AND privilege_type = 'DELETE') AS authenticated_delete
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public'
      AND grantee IN ('anon', 'authenticated')
    GROUP BY table_name
)
SELECT
    ts.table_name,
    CASE WHEN ts.oid IS NOT NULL THEN 'ok' ELSE 'missing_table' END AS table_exists,
    CASE WHEN ts.relrowsecurity THEN 'ok' ELSE 'review_rls_disabled' END AS rls,
    CASE WHEN COALESCE(g.anon_has_any_grant, false) = false THEN 'ok' ELSE 'review_anon_table_grant' END AS anon_table_grants,
    CASE
        WHEN COALESCE(g.authenticated_select, false) = ts.expected_select THEN 'ok'
        ELSE 'review_authenticated_select'
    END AS authenticated_select,
    CASE
        WHEN COALESCE(g.authenticated_insert, false) = ts.expected_insert THEN 'ok'
        ELSE 'review_authenticated_insert'
    END AS authenticated_insert,
    CASE
        WHEN COALESCE(g.authenticated_update, false) = ts.expected_update THEN 'ok'
        ELSE 'review_authenticated_update'
    END AS authenticated_update,
    CASE
        WHEN COALESCE(g.authenticated_delete, false) = ts.expected_delete THEN 'ok'
        ELSE 'review_authenticated_delete'
    END AS authenticated_delete
FROM table_state ts
LEFT JOIN grants g ON g.table_name = ts.table_name
ORDER BY ts.table_name;

-- 4) Organization isolation columns on core sensitive tables.
WITH expected_org_tables(table_name) AS (
    VALUES
        ('students'),
        ('payments'),
        ('trainings'),
        ('training_students'),
        ('attendance'),
        ('groups'),
        ('group_students'),
        ('modalities'),
        ('plans'),
        ('products'),
        ('sales'),
        ('comandas'),
        ('comanda_items'),
        ('expenses'),
        ('financial_audit_logs'),
        ('student_training_requests')
)
SELECT
    e.table_name,
    CASE
        WHEN c.column_name IS NOT NULL THEN 'ok'
        ELSE 'review_missing_organization_id'
    END AS organization_id_column
FROM expected_org_tables e
LEFT JOIN information_schema.columns c
  ON c.table_schema = 'public'
 AND c.table_name = e.table_name
 AND c.column_name = 'organization_id'
ORDER BY e.table_name;

-- 5) Public RPC function body guardrails.
WITH function_defs AS (
    SELECT
        p.proname AS function_name,
        oidvectortypes(p.proargtypes) AS args,
        pg_get_functiondef(p.oid) AS definition
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
          'get_student_portal_branding',
          'get_student_portal_data',
          'submit_student_training_request',
          'get_public_arena_data',
          'submit_public_reservation'
      )
)
SELECT
    function_name,
    args,
    CASE
        WHEN definition ILIKE '%organization_id%' THEN 'ok'
        ELSE 'review_missing_organization_guard'
    END AS organization_guard,
    CASE
        WHEN function_name IN ('get_student_portal_data', 'submit_student_training_request')
             AND definition ILIKE '%business_type = ''sport_school''%' THEN 'ok'
        WHEN function_name NOT IN ('get_student_portal_data', 'submit_student_training_request') THEN 'not_applicable'
        ELSE 'review_missing_sport_school_guard'
    END AS sport_school_guard,
    CASE
        WHEN function_name IN ('get_public_arena_data', 'submit_public_reservation')
             AND definition ILIKE '%business_type = ''arena''%' THEN 'ok'
        WHEN function_name NOT IN ('get_public_arena_data', 'submit_public_reservation') THEN 'not_applicable'
        ELSE 'review_missing_arena_guard'
    END AS arena_guard,
    CASE
        WHEN function_name = 'submit_student_training_request'
             AND definition NOT ILIKE '%INSERT INTO public.trainings%' THEN 'ok'
        WHEN function_name <> 'submit_student_training_request' THEN 'not_applicable'
        ELSE 'review_request_creates_training'
    END AS request_does_not_create_training
FROM function_defs
ORDER BY function_name, args;

-- 6) Student portal request data integrity.
SELECT
    COUNT(*) AS total_requests,
    COUNT(*) FILTER (WHERE organization_id IS NULL) AS missing_organization_id,
    COUNT(*) FILTER (WHERE user_id IS NULL) AS missing_user_id,
    COUNT(*) FILTER (WHERE student_id IS NULL) AS missing_student_id,
    COUNT(*) FILTER (WHERE status NOT IN ('pending', 'approved', 'rejected', 'cancelled')) AS invalid_status,
    COUNT(*) FILTER (WHERE request_type NOT IN ('training', 'makeup')) AS invalid_request_type
FROM public.student_training_requests;

-- 7) Student portal request cross-tenant consistency.
SELECT
    COUNT(*) AS inconsistent_requests
FROM public.student_training_requests r
JOIN public.students s ON s.id = r.student_id
WHERE r.user_id <> s.user_id
   OR r.organization_id <> s.organization_id
   OR s.business_type <> 'sport_school';

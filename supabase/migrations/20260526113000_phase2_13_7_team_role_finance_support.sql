-- Phase 2.13.7: team role alignment.
-- Safe, additive intent:
-- - Keeps existing organization_members rows untouched.
-- - Expands the role check constraint to include the finance role already used by the app.
-- - Does not change RLS policies or ownership rules.

DO $$
DECLARE
    v_constraint_name TEXT;
BEGIN
    SELECT con.conname
    INTO v_constraint_name
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'organization_members'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) LIKE '%role%'
    ORDER BY con.conname
    LIMIT 1;

    IF v_constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.organization_members DROP CONSTRAINT %I', v_constraint_name);
    END IF;

    ALTER TABLE public.organization_members
    ADD CONSTRAINT organization_members_role_check
    CHECK (role IN ('owner', 'manager', 'receptionist', 'instructor', 'finance'));
END;
$$;

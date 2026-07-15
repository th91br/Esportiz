-- Phase 2.6: progressive organization-based write RLS for students and plans.
-- Safe, additive migration:
-- - Keeps current user_id policies untouched for owner/frontend compatibility.
-- - Adds controlled organization write policies for students and plans.
-- - Preserves legacy frontend compatibility by keeping user_id aligned with the organization owner.
-- - Does not alter payments, generated monthly charges, trainings, attendance, or financial flows.

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

CREATE OR REPLACE FUNCTION public.set_user_id_from_organization_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_owner_user_id UUID;
BEGIN
    IF NEW.organization_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT owner_user_id
    INTO v_owner_user_id
    FROM public.organizations
    WHERE id = NEW.organization_id
      AND status = 'active'
    LIMIT 1;

    IF v_owner_user_id IS NOT NULL THEN
        NEW.user_id := v_owner_user_id;
    END IF;

    RETURN NEW;
END;
$function$;

DO $phase26_students_plans_write_rls$
BEGIN
    IF to_regclass('public.students') IS NOT NULL
       AND EXISTS (
           SELECT 1
           FROM information_schema.columns
           WHERE table_schema = 'public'
             AND table_name = 'students'
             AND column_name = 'organization_id'
       )
       AND EXISTS (
           SELECT 1
           FROM information_schema.columns
           WHERE table_schema = 'public'
             AND table_name = 'students'
             AND column_name = 'user_id'
       )
    THEN
        ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

        DROP TRIGGER IF EXISTS set_students_owner_user_id_trigger ON public.students;
        CREATE TRIGGER set_students_owner_user_id_trigger
        BEFORE INSERT OR UPDATE OF organization_id, user_id ON public.students
        FOR EACH ROW
        EXECUTE FUNCTION public.set_user_id_from_organization_id();

        DROP POLICY IF EXISTS "Organization staff can insert students" ON public.students;
        DROP POLICY IF EXISTS "Organization staff can update students" ON public.students;
        DROP POLICY IF EXISTS "Organization managers can delete students" ON public.students;

        CREATE POLICY "Organization staff can insert students"
        ON public.students
        FOR INSERT
        WITH CHECK (public.has_organization_role(organization_id, ARRAY['owner', 'manager', 'receptionist']));

        CREATE POLICY "Organization staff can update students"
        ON public.students
        FOR UPDATE
        USING (public.has_organization_role(organization_id, ARRAY['owner', 'manager', 'receptionist']))
        WITH CHECK (public.has_organization_role(organization_id, ARRAY['owner', 'manager', 'receptionist']));

        CREATE POLICY "Organization managers can delete students"
        ON public.students
        FOR DELETE
        USING (public.has_organization_role(organization_id, ARRAY['owner', 'manager']));
    END IF;

    IF to_regclass('public.plans') IS NOT NULL
       AND EXISTS (
           SELECT 1
           FROM information_schema.columns
           WHERE table_schema = 'public'
             AND table_name = 'plans'
             AND column_name = 'organization_id'
       )
       AND EXISTS (
           SELECT 1
           FROM information_schema.columns
           WHERE table_schema = 'public'
             AND table_name = 'plans'
             AND column_name = 'user_id'
       )
    THEN
        ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

        DROP TRIGGER IF EXISTS set_plans_owner_user_id_trigger ON public.plans;
        CREATE TRIGGER set_plans_owner_user_id_trigger
        BEFORE INSERT OR UPDATE OF organization_id, user_id ON public.plans
        FOR EACH ROW
        EXECUTE FUNCTION public.set_user_id_from_organization_id();

        DROP POLICY IF EXISTS "Organization managers can insert plans" ON public.plans;
        DROP POLICY IF EXISTS "Organization managers can update plans" ON public.plans;
        DROP POLICY IF EXISTS "Organization managers can delete plans" ON public.plans;

        CREATE POLICY "Organization managers can insert plans"
        ON public.plans
        FOR INSERT
        WITH CHECK (public.has_organization_role(organization_id, ARRAY['owner', 'manager']));

        CREATE POLICY "Organization managers can update plans"
        ON public.plans
        FOR UPDATE
        USING (public.has_organization_role(organization_id, ARRAY['owner', 'manager']))
        WITH CHECK (public.has_organization_role(organization_id, ARRAY['owner', 'manager']));

        CREATE POLICY "Organization managers can delete plans"
        ON public.plans
        FOR DELETE
        USING (public.has_organization_role(organization_id, ARRAY['owner', 'manager']));
    END IF;
END;
$phase26_students_plans_write_rls$;

REVOKE ALL ON FUNCTION public.has_organization_role(UUID, TEXT[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_user_id_from_organization_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_organization_role(UUID, TEXT[]) TO authenticated;

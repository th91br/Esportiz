-- Phase 2.7: progressive organization-based write RLS for agenda and attendance.
-- Safe, additive migration:
-- - Keeps current user_id policies untouched for owner/frontend compatibility.
-- - Adds controlled organization write policies for trainings, training_students, and attendance.
-- - Preserves legacy frontend compatibility by keeping user_id aligned with the organization owner.
-- - Does not alter payments, sales, comandas, products, or financial audit flows.

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

CREATE OR REPLACE FUNCTION public.set_user_id_from_training_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_training RECORD;
BEGIN
    IF NEW.training_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT user_id, organization_id
    INTO v_training
    FROM public.trainings
    WHERE id = NEW.training_id
    LIMIT 1;

    IF v_training.user_id IS NOT NULL THEN
        NEW.user_id := v_training.user_id;
    END IF;

    IF v_training.organization_id IS NOT NULL THEN
        NEW.organization_id := v_training.organization_id;
    END IF;

    RETURN NEW;
END;
$function$;

DO $phase27_agenda_attendance_write_rls$
BEGIN
    IF to_regclass('public.trainings') IS NOT NULL
       AND EXISTS (
           SELECT 1
           FROM information_schema.columns
           WHERE table_schema = 'public'
             AND table_name = 'trainings'
             AND column_name = 'organization_id'
       )
       AND EXISTS (
           SELECT 1
           FROM information_schema.columns
           WHERE table_schema = 'public'
             AND table_name = 'trainings'
             AND column_name = 'user_id'
       )
    THEN
        ALTER TABLE public.trainings ENABLE ROW LEVEL SECURITY;

        DROP TRIGGER IF EXISTS set_trainings_owner_user_id_trigger ON public.trainings;
        CREATE TRIGGER set_trainings_owner_user_id_trigger
        BEFORE INSERT OR UPDATE OF organization_id, user_id ON public.trainings
        FOR EACH ROW
        EXECUTE FUNCTION public.set_user_id_from_organization_id();

        DROP POLICY IF EXISTS "Organization staff can insert trainings" ON public.trainings;
        DROP POLICY IF EXISTS "Organization staff can update trainings" ON public.trainings;
        DROP POLICY IF EXISTS "Organization managers can delete trainings" ON public.trainings;

        CREATE POLICY "Organization staff can insert trainings"
        ON public.trainings
        FOR INSERT
        WITH CHECK (public.has_organization_role(organization_id, ARRAY['owner', 'manager', 'receptionist', 'instructor']));

        CREATE POLICY "Organization staff can update trainings"
        ON public.trainings
        FOR UPDATE
        USING (public.has_organization_role(organization_id, ARRAY['owner', 'manager', 'receptionist', 'instructor']))
        WITH CHECK (public.has_organization_role(organization_id, ARRAY['owner', 'manager', 'receptionist', 'instructor']));

        CREATE POLICY "Organization managers can delete trainings"
        ON public.trainings
        FOR DELETE
        USING (public.has_organization_role(organization_id, ARRAY['owner', 'manager']));
    END IF;

    IF to_regclass('public.training_students') IS NOT NULL
       AND EXISTS (
           SELECT 1
           FROM information_schema.columns
           WHERE table_schema = 'public'
             AND table_name = 'training_students'
             AND column_name = 'organization_id'
       )
       AND EXISTS (
           SELECT 1
           FROM information_schema.columns
           WHERE table_schema = 'public'
             AND table_name = 'training_students'
             AND column_name = 'user_id'
       )
       AND EXISTS (
           SELECT 1
           FROM information_schema.columns
           WHERE table_schema = 'public'
             AND table_name = 'training_students'
             AND column_name = 'training_id'
       )
    THEN
        ALTER TABLE public.training_students ENABLE ROW LEVEL SECURITY;

        DROP TRIGGER IF EXISTS set_training_students_owner_user_id_trigger ON public.training_students;
        CREATE TRIGGER set_training_students_owner_user_id_trigger
        BEFORE INSERT OR UPDATE OF training_id, organization_id, user_id ON public.training_students
        FOR EACH ROW
        EXECUTE FUNCTION public.set_user_id_from_training_id();

        DROP POLICY IF EXISTS "Organization staff can insert training students" ON public.training_students;
        DROP POLICY IF EXISTS "Organization staff can update training students" ON public.training_students;
        DROP POLICY IF EXISTS "Organization staff can delete training students" ON public.training_students;

        CREATE POLICY "Organization staff can insert training students"
        ON public.training_students
        FOR INSERT
        WITH CHECK (public.has_organization_role(organization_id, ARRAY['owner', 'manager', 'receptionist', 'instructor']));

        CREATE POLICY "Organization staff can update training students"
        ON public.training_students
        FOR UPDATE
        USING (public.has_organization_role(organization_id, ARRAY['owner', 'manager', 'receptionist', 'instructor']))
        WITH CHECK (public.has_organization_role(organization_id, ARRAY['owner', 'manager', 'receptionist', 'instructor']));

        CREATE POLICY "Organization staff can delete training students"
        ON public.training_students
        FOR DELETE
        USING (public.has_organization_role(organization_id, ARRAY['owner', 'manager', 'receptionist', 'instructor']));
    END IF;

    IF to_regclass('public.attendance') IS NOT NULL
       AND EXISTS (
           SELECT 1
           FROM information_schema.columns
           WHERE table_schema = 'public'
             AND table_name = 'attendance'
             AND column_name = 'organization_id'
       )
       AND EXISTS (
           SELECT 1
           FROM information_schema.columns
           WHERE table_schema = 'public'
             AND table_name = 'attendance'
             AND column_name = 'user_id'
       )
       AND EXISTS (
           SELECT 1
           FROM information_schema.columns
           WHERE table_schema = 'public'
             AND table_name = 'attendance'
             AND column_name = 'training_id'
       )
    THEN
        ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

        DROP TRIGGER IF EXISTS set_attendance_owner_user_id_trigger ON public.attendance;
        CREATE TRIGGER set_attendance_owner_user_id_trigger
        BEFORE INSERT OR UPDATE OF training_id, organization_id, user_id ON public.attendance
        FOR EACH ROW
        EXECUTE FUNCTION public.set_user_id_from_training_id();

        DROP POLICY IF EXISTS "Organization staff can insert attendance" ON public.attendance;
        DROP POLICY IF EXISTS "Organization staff can update attendance" ON public.attendance;
        DROP POLICY IF EXISTS "Organization managers can delete attendance" ON public.attendance;

        CREATE POLICY "Organization staff can insert attendance"
        ON public.attendance
        FOR INSERT
        WITH CHECK (public.has_organization_role(organization_id, ARRAY['owner', 'manager', 'receptionist', 'instructor']));

        CREATE POLICY "Organization staff can update attendance"
        ON public.attendance
        FOR UPDATE
        USING (public.has_organization_role(organization_id, ARRAY['owner', 'manager', 'receptionist', 'instructor']))
        WITH CHECK (public.has_organization_role(organization_id, ARRAY['owner', 'manager', 'receptionist', 'instructor']));

        CREATE POLICY "Organization managers can delete attendance"
        ON public.attendance
        FOR DELETE
        USING (public.has_organization_role(organization_id, ARRAY['owner', 'manager', 'receptionist']));
    END IF;
END;
$phase27_agenda_attendance_write_rls$;

REVOKE ALL ON FUNCTION public.has_organization_role(UUID, TEXT[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_user_id_from_organization_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_user_id_from_training_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_organization_role(UUID, TEXT[]) TO authenticated;

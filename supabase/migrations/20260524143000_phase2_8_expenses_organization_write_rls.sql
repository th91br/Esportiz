-- Phase 2.8: progressive organization-based write RLS for expenses.
-- Safe, additive migration:
-- - Keeps current user_id policy untouched for owner/frontend compatibility.
-- - Adds owner/manager organization write policies for expenses only.
-- - Preserves legacy frontend compatibility by keeping user_id aligned with the organization owner.
-- - Does not alter payments, revenue, sales, comandas, reservations, or audit logs.

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

DO $phase28_expenses_write_rls$
BEGIN
    IF to_regclass('public.expenses') IS NOT NULL
       AND EXISTS (
           SELECT 1
           FROM information_schema.columns
           WHERE table_schema = 'public'
             AND table_name = 'expenses'
             AND column_name = 'organization_id'
       )
       AND EXISTS (
           SELECT 1
           FROM information_schema.columns
           WHERE table_schema = 'public'
             AND table_name = 'expenses'
             AND column_name = 'user_id'
       )
    THEN
        ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

        DROP TRIGGER IF EXISTS set_expenses_owner_user_id_trigger ON public.expenses;
        CREATE TRIGGER set_expenses_owner_user_id_trigger
        BEFORE INSERT OR UPDATE OF organization_id, user_id ON public.expenses
        FOR EACH ROW
        EXECUTE FUNCTION public.set_user_id_from_organization_id();

        DROP POLICY IF EXISTS "Organization managers can insert expenses" ON public.expenses;
        DROP POLICY IF EXISTS "Organization managers can update expenses" ON public.expenses;
        DROP POLICY IF EXISTS "Organization managers can delete expenses" ON public.expenses;

        CREATE POLICY "Organization managers can insert expenses"
        ON public.expenses
        FOR INSERT
        WITH CHECK (public.has_organization_role(organization_id, ARRAY['owner', 'manager']));

        CREATE POLICY "Organization managers can update expenses"
        ON public.expenses
        FOR UPDATE
        USING (public.has_organization_role(organization_id, ARRAY['owner', 'manager']))
        WITH CHECK (public.has_organization_role(organization_id, ARRAY['owner', 'manager']));

        CREATE POLICY "Organization managers can delete expenses"
        ON public.expenses
        FOR DELETE
        USING (public.has_organization_role(organization_id, ARRAY['owner', 'manager']));
    END IF;
END;
$phase28_expenses_write_rls$;

REVOKE ALL ON FUNCTION public.has_organization_role(UUID, TEXT[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_user_id_from_organization_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_organization_role(UUID, TEXT[]) TO authenticated;

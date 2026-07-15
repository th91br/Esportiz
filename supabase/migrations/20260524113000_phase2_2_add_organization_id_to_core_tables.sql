-- Phase 2.2: add organization_id to core tenant-owned tables.
-- Safe, additive migration:
-- - Keeps current user_id columns and current RLS policies untouched.
-- - Adds nullable organization_id columns and backfills from organizations.owner_user_id.
-- - Adds indexes for future organization-based RLS and dashboard queries.
-- - Guards optional tables so production schemas with removed/unused tables do not fail.

DO $phase22_add_organization_columns$
DECLARE
    v_table TEXT;
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
        IF to_regclass('public.' || v_table) IS NOT NULL THEN
            EXECUTE format(
                'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL',
                v_table
            );
        END IF;
    END LOOP;
END;
$phase22_add_organization_columns$;

CREATE OR REPLACE FUNCTION public.ensure_owner_organization_for_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_organization_id UUID;
BEGIN
    IF NEW.user_id IS NULL THEN
        RETURN NEW;
    END IF;

    INSERT INTO public.organizations (owner_user_id, name)
    VALUES (NEW.user_id, COALESCE(NULLIF(NEW.ct_name, ''), 'Esportiz'))
    ON CONFLICT (owner_user_id)
    DO UPDATE SET
        name = CASE
            WHEN NULLIF(EXCLUDED.name, '') IS NOT NULL AND EXCLUDED.name <> 'Esportiz' THEN EXCLUDED.name
            ELSE public.organizations.name
        END,
        updated_at = NOW()
    RETURNING id INTO v_organization_id;

    INSERT INTO public.organization_members (organization_id, user_id, role, active)
    VALUES (v_organization_id, NEW.user_id, 'owner', TRUE)
    ON CONFLICT (organization_id, user_id)
    DO UPDATE SET
        role = 'owner',
        active = TRUE,
        updated_at = NOW();

    IF NEW.organization_id IS NULL THEN
        NEW.organization_id := v_organization_id;
    END IF;

    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_organization_id_from_user_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_organization_id UUID;
BEGIN
    IF NEW.organization_id IS NULL AND NEW.user_id IS NOT NULL THEN
        SELECT id
        INTO v_organization_id
        FROM public.organizations
        WHERE owner_user_id = NEW.user_id
        LIMIT 1;

        IF v_organization_id IS NOT NULL THEN
            NEW.organization_id := v_organization_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_training_students_organization_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_organization_id UUID;
BEGIN
    IF NEW.organization_id IS NOT NULL THEN
        RETURN NEW;
    END IF;

    IF NEW.user_id IS NOT NULL THEN
        SELECT id
        INTO v_organization_id
        FROM public.organizations
        WHERE owner_user_id = NEW.user_id
        LIMIT 1;
    END IF;

    IF v_organization_id IS NULL AND NEW.training_id IS NOT NULL THEN
        SELECT organization_id
        INTO v_organization_id
        FROM public.trainings
        WHERE id = NEW.training_id
        LIMIT 1;
    END IF;

    IF v_organization_id IS NOT NULL THEN
        NEW.organization_id := v_organization_id;
    END IF;

    RETURN NEW;
END;
$function$;

DO $phase22_create_triggers$
DECLARE
    v_table TEXT;
    v_trigger TEXT;
BEGIN
    IF to_regclass('public.profiles') IS NOT NULL
       AND EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'user_id'
       )
       AND EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'ct_name'
       )
       AND EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'organization_id'
       )
    THEN
        DROP TRIGGER IF EXISTS ensure_profile_organization_trigger ON public.profiles;
        CREATE TRIGGER ensure_profile_organization_trigger
        BEFORE INSERT OR UPDATE OF user_id, ct_name, organization_id ON public.profiles
        FOR EACH ROW
        EXECUTE FUNCTION public.ensure_owner_organization_for_profile();
    END IF;

    FOREACH v_table IN ARRAY ARRAY[
        'students',
        'plans',
        'trainings',
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
               SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = v_table AND column_name = 'user_id'
           )
           AND EXISTS (
               SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = v_table AND column_name = 'organization_id'
           )
        THEN
            v_trigger := 'set_' || v_table || '_organization_id_trigger';
            EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', v_trigger, v_table);
            EXECUTE format(
                'CREATE TRIGGER %I BEFORE INSERT OR UPDATE OF user_id, organization_id ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_organization_id_from_user_id()',
                v_trigger,
                v_table
            );
        END IF;
    END LOOP;

    IF to_regclass('public.training_students') IS NOT NULL
       AND EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = 'training_students' AND column_name = 'user_id'
       )
       AND EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = 'training_students' AND column_name = 'training_id'
       )
       AND EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = 'training_students' AND column_name = 'organization_id'
       )
    THEN
        DROP TRIGGER IF EXISTS set_training_students_organization_id_trigger ON public.training_students;
        CREATE TRIGGER set_training_students_organization_id_trigger
        BEFORE INSERT OR UPDATE OF user_id, training_id, organization_id ON public.training_students
        FOR EACH ROW
        EXECUTE FUNCTION public.set_training_students_organization_id();
    END IF;
END;
$phase22_create_triggers$;

DO $phase22_backfill_organization_ids$
DECLARE
    v_table TEXT;
BEGIN
    FOREACH v_table IN ARRAY ARRAY[
        'profiles',
        'students',
        'plans',
        'trainings',
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
               SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = v_table AND column_name = 'user_id'
           )
           AND EXISTS (
               SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = v_table AND column_name = 'organization_id'
           )
        THEN
            EXECUTE format(
                'UPDATE public.%I t SET organization_id = o.id FROM public.organizations o WHERE t.organization_id IS NULL AND t.user_id = o.owner_user_id',
                v_table
            );
        END IF;
    END LOOP;

    IF to_regclass('public.training_students') IS NOT NULL
       AND EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = 'training_students' AND column_name = 'organization_id'
       )
       AND EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = 'training_students' AND column_name = 'training_id'
       )
       AND to_regclass('public.trainings') IS NOT NULL
       AND EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = 'trainings' AND column_name = 'organization_id'
       )
    THEN
        UPDATE public.training_students ts
        SET organization_id = t.organization_id
        FROM public.trainings t
        WHERE ts.organization_id IS NULL
          AND ts.training_id = t.id
          AND t.organization_id IS NOT NULL;
    END IF;
END;
$phase22_backfill_organization_ids$;

DO $phase22_create_indexes$
BEGIN
    IF to_regclass('public.profiles') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON public.profiles(organization_id);
    END IF;

    IF to_regclass('public.students') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS idx_students_organization_btype ON public.students(organization_id, business_type);
    END IF;

    IF to_regclass('public.plans') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS idx_plans_organization_btype ON public.plans(organization_id, business_type);
    END IF;

    IF to_regclass('public.trainings') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS idx_trainings_organization_btype_date ON public.trainings(organization_id, business_type, date);
    END IF;

    IF to_regclass('public.training_students') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS idx_training_students_organization_training ON public.training_students(organization_id, training_id);
    END IF;

    IF to_regclass('public.attendance') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS idx_attendance_organization_btype_date ON public.attendance(organization_id, business_type, date);
    END IF;

    IF to_regclass('public.payments') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS idx_payments_organization_btype_month ON public.payments(organization_id, business_type, month_ref);
        CREATE INDEX IF NOT EXISTS idx_payments_organization_due_date ON public.payments(organization_id, due_date);
    END IF;

    IF to_regclass('public.categories') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS idx_categories_organization_id ON public.categories(organization_id);
    END IF;

    IF to_regclass('public.groups') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS idx_groups_organization_btype ON public.groups(organization_id, business_type);
    END IF;

    IF to_regclass('public.group_students') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS idx_group_students_organization_group ON public.group_students(organization_id, group_id);
    END IF;

    IF to_regclass('public.modalities') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS idx_modalities_organization_btype ON public.modalities(organization_id, business_type);
    END IF;

    IF to_regclass('public.expenses') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS idx_expenses_organization_btype_date ON public.expenses(organization_id, business_type, date);
    END IF;

    IF to_regclass('public.products') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS idx_products_organization_btype_active ON public.products(organization_id, business_type, active);
    END IF;

    IF to_regclass('public.sales') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS idx_sales_organization_btype_sold_at ON public.sales(organization_id, business_type, sold_at);
    END IF;

    IF to_regclass('public.comandas') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS idx_comandas_organization_btype_status ON public.comandas(organization_id, business_type, status);
    END IF;

    IF to_regclass('public.comanda_items') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS idx_comanda_items_organization_comanda ON public.comanda_items(organization_id, comanda_id);
    END IF;

    IF to_regclass('public.financial_audit_logs') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS idx_financial_audit_logs_organization_created ON public.financial_audit_logs(organization_id, created_at DESC);
    END IF;
END;
$phase22_create_indexes$;

REVOKE ALL ON FUNCTION public.ensure_owner_organization_for_profile() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_organization_id_from_user_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_training_students_organization_id() FROM PUBLIC;

-- Restrict sensitive organization reads to the approved role matrix.
-- Existing owner policies, write policies, triggers, and RPCs remain unchanged.

DO $harden_financial_dataset_reads$
BEGIN
    IF to_regclass('public.payments') IS NOT NULL
       AND EXISTS (
           SELECT 1
           FROM information_schema.columns
           WHERE table_schema = 'public'
             AND table_name = 'payments'
             AND column_name = 'organization_id'
       )
    THEN
        ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Organization members can view payments" ON public.payments;
        DROP POLICY IF EXISTS "Organization roles can view payments" ON public.payments;

        CREATE POLICY "Organization roles can view payments"
        ON public.payments
        FOR SELECT
        TO authenticated
        USING (
            public.has_organization_role(
                organization_id,
                ARRAY['owner', 'manager', 'receptionist', 'finance']
            )
        );
    END IF;

    IF to_regclass('public.sales') IS NOT NULL
       AND EXISTS (
           SELECT 1
           FROM information_schema.columns
           WHERE table_schema = 'public'
             AND table_name = 'sales'
             AND column_name = 'organization_id'
       )
    THEN
        ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Organization members can view sales" ON public.sales;
        DROP POLICY IF EXISTS "Organization roles can view sales" ON public.sales;

        CREATE POLICY "Organization roles can view sales"
        ON public.sales
        FOR SELECT
        TO authenticated
        USING (
            public.has_organization_role(
                organization_id,
                ARRAY['owner', 'manager', 'receptionist', 'finance']
            )
        );
    END IF;

    IF to_regclass('public.expenses') IS NOT NULL
       AND EXISTS (
           SELECT 1
           FROM information_schema.columns
           WHERE table_schema = 'public'
             AND table_name = 'expenses'
             AND column_name = 'organization_id'
       )
    THEN
        ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Organization members can view expenses" ON public.expenses;
        DROP POLICY IF EXISTS "Organization roles can view expenses" ON public.expenses;

        CREATE POLICY "Organization roles can view expenses"
        ON public.expenses
        FOR SELECT
        TO authenticated
        USING (
            public.has_organization_role(
                organization_id,
                ARRAY['owner', 'manager', 'finance']
            )
        );
    END IF;

    IF to_regclass('public.products') IS NOT NULL
       AND EXISTS (
           SELECT 1
           FROM information_schema.columns
           WHERE table_schema = 'public'
             AND table_name = 'products'
             AND column_name = 'organization_id'
       )
    THEN
        ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Organization members can view products" ON public.products;
        DROP POLICY IF EXISTS "Organization roles can view products" ON public.products;

        CREATE POLICY "Organization roles can view products"
        ON public.products
        FOR SELECT
        TO authenticated
        USING (
            public.has_organization_role(
                organization_id,
                ARRAY['owner', 'manager', 'receptionist']
            )
        );
    END IF;
END;
$harden_financial_dataset_reads$;

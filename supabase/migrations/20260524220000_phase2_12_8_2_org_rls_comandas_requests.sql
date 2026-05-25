-- Phase 2.12.8.2: organization-aware RLS hardening for comandas and student requests.
-- Safe, additive migration:
-- - Adds organization-based write policies for comandas and comanda_items.
-- - Replaces student_training_requests policies with direct organization_id guards.
-- - Keeps legacy user_id policies intact for current frontend compatibility.
-- - Does not change data, table structure, grants, or RPC behavior.

ALTER TABLE public.comandas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comanda_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_training_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Organization staff can insert comandas" ON public.comandas;
DROP POLICY IF EXISTS "Organization staff can update comandas" ON public.comandas;
DROP POLICY IF EXISTS "Organization staff can delete comandas" ON public.comandas;

CREATE POLICY "Organization staff can insert comandas"
ON public.comandas
FOR INSERT
TO authenticated
WITH CHECK (
    public.has_organization_role(organization_id, ARRAY['owner', 'manager', 'receptionist'])
);

CREATE POLICY "Organization staff can update comandas"
ON public.comandas
FOR UPDATE
TO authenticated
USING (
    public.has_organization_role(organization_id, ARRAY['owner', 'manager', 'receptionist'])
)
WITH CHECK (
    public.has_organization_role(organization_id, ARRAY['owner', 'manager', 'receptionist'])
);

CREATE POLICY "Organization staff can delete comandas"
ON public.comandas
FOR DELETE
TO authenticated
USING (
    public.has_organization_role(organization_id, ARRAY['owner', 'manager'])
);

DROP POLICY IF EXISTS "Organization staff can insert comanda items" ON public.comanda_items;
DROP POLICY IF EXISTS "Organization staff can update comanda items" ON public.comanda_items;
DROP POLICY IF EXISTS "Organization staff can delete comanda items" ON public.comanda_items;

CREATE POLICY "Organization staff can insert comanda items"
ON public.comanda_items
FOR INSERT
TO authenticated
WITH CHECK (
    public.has_organization_role(organization_id, ARRAY['owner', 'manager', 'receptionist'])
);

CREATE POLICY "Organization staff can update comanda items"
ON public.comanda_items
FOR UPDATE
TO authenticated
USING (
    public.has_organization_role(organization_id, ARRAY['owner', 'manager', 'receptionist'])
)
WITH CHECK (
    public.has_organization_role(organization_id, ARRAY['owner', 'manager', 'receptionist'])
);

CREATE POLICY "Organization staff can delete comanda items"
ON public.comanda_items
FOR DELETE
TO authenticated
USING (
    public.has_organization_role(organization_id, ARRAY['owner', 'manager', 'receptionist'])
);

DROP POLICY IF EXISTS "student_training_requests_org_select" ON public.student_training_requests;
DROP POLICY IF EXISTS "student_training_requests_org_update" ON public.student_training_requests;
DROP POLICY IF EXISTS "student_training_requests_org_delete" ON public.student_training_requests;

CREATE POLICY "student_training_requests_org_select"
ON public.student_training_requests
FOR SELECT
TO authenticated
USING (
    public.has_organization_role(organization_id, ARRAY['owner', 'manager', 'receptionist', 'instructor'])
);

CREATE POLICY "student_training_requests_org_update"
ON public.student_training_requests
FOR UPDATE
TO authenticated
USING (
    public.has_organization_role(organization_id, ARRAY['owner', 'manager', 'receptionist', 'instructor'])
)
WITH CHECK (
    public.has_organization_role(organization_id, ARRAY['owner', 'manager', 'receptionist', 'instructor'])
);

CREATE POLICY "student_training_requests_org_delete"
ON public.student_training_requests
FOR DELETE
TO authenticated
USING (
    public.has_organization_role(organization_id, ARRAY['owner', 'manager'])
);

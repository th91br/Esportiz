-- Migration: Enterprise RBAC (Role-Based Access Control) & Team Members
-- Date: 2026-05-12

-- 1. Create team_members table to associate multiple login emails to a single "tenant" (owner's user_id)
CREATE TABLE IF NOT EXISTS public.team_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE, -- The owner/arena ID
    member_auth_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,       -- The invited user Auth ID
    role TEXT NOT NULL DEFAULT 'receptionist' CHECK (role IN ('manager', 'receptionist', 'instructor')),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(tenant_id, email),
    UNIQUE(member_auth_id) -- A user can only belong to one tenant for now
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Only owner can manage their team
CREATE POLICY "Owners manage their team" ON public.team_members
    FOR ALL USING (auth.uid() = tenant_id);

-- Members can view their own membership
CREATE POLICY "Members can view their own membership" ON public.team_members
    FOR SELECT USING (auth.uid() = member_auth_id);


-- 2. Create a unified secure function to get the current user's effective tenant_id
-- If the user is an owner, their auth.uid() IS the tenant_id.
-- If the user is a team member, their tenant_id is retrieved from team_members.
CREATE OR REPLACE FUNCTION public.get_auth_tenant_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER STABLE
AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    -- First check if the user is a team member
    SELECT tenant_id INTO v_tenant_id
    FROM public.team_members
    WHERE member_auth_id = auth.uid() AND active = true
    LIMIT 1;

    IF v_tenant_id IS NOT NULL THEN
        RETURN v_tenant_id;
    END IF;

    -- Otherwise, assume the user is the owner (tenant_id = auth.uid())
    RETURN auth.uid();
END;
$$;


-- 3. To fully adopt Enterprise RBAC, future RLS policies across the entire database
-- should be migrated from:
--   USING (auth.uid() = user_id)
-- to:
--   USING (public.get_auth_tenant_id() = user_id)
--
-- Example of upgrading a core table securely without breaking existing data:
-- ALTER POLICY "Users manage own students" ON public.students 
--    USING (public.get_auth_tenant_id() = user_id);
--
-- Note: Applying this RLS change to all tables at once requires careful orchestration.
-- For now, the structural foundation is laid down for frontend integration.

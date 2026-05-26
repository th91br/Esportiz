import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  normalizeOrganizationRole,
  type OrganizationRole,
} from '@/lib/rolePermissions';

export interface OrganizationMembership {
  id: string;
  organizationId: string;
  userId: string;
  role: OrganizationRole;
  active: boolean;
}

const ROLE_PRIORITY: OrganizationRole[] = [
  'owner',
  'manager',
  'finance',
  'receptionist',
  'instructor',
];

function getRolePriority(role: OrganizationRole) {
  const index = ROLE_PRIORITY.indexOf(role);
  return index === -1 ? ROLE_PRIORITY.length : index;
}

export function useOrganizationMembership() {
  const { user } = useAuth();

  const membershipQuery = useQuery({
    queryKey: ['organization-membership', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('organization_members')
        .select('id, organization_id, user_id, role, active, created_at')
        .eq('user_id', user.id)
        .eq('active', true)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching organization membership:', error);
        throw error;
      }

      const memberships = (data || [])
        .map((row) => ({
          id: row.id,
          organizationId: row.organization_id,
          userId: row.user_id,
          role: normalizeOrganizationRole(row.role),
          active: row.active,
        }))
        .sort((a, b) => getRolePriority(a.role) - getRolePriority(b.role));

      return memberships[0] || null;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const effectiveRole = useMemo<OrganizationRole>(() => {
    if (membershipQuery.data?.role) return membershipQuery.data.role;

    // Compatibility fallback: legacy owners keep the current full experience
    // until team role adoption is complete and verified tenant by tenant.
    return 'owner';
  }, [membershipQuery.data?.role]);

  return {
    membership: membershipQuery.data,
    effectiveRole,
    organizationId: membershipQuery.data?.organizationId || null,
    loadingMembership: membershipQuery.isLoading,
    isErrorMembership: membershipQuery.isError,
    errorMembership: membershipQuery.error,
    isRoleKnown: Boolean(membershipQuery.data?.role && !membershipQuery.isError),
  };
}

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { normalizeOrganizationRole, type OrganizationRole } from '@/lib/rolePermissions';

export interface OrganizationTeamMember {
  id: string;
  organizationId: string;
  userId: string;
  role: OrganizationRole;
  active: boolean;
  invitedEmail: string | null;
  createdAt: string;
  updatedAt: string;
}

interface UseOrganizationTeamMembersOptions {
  organizationId: string | null;
  currentUserId?: string | null;
  enabled?: boolean;
  viewAllMembers?: boolean;
}

export function useOrganizationTeamMembers({
  organizationId,
  currentUserId = null,
  enabled = true,
  viewAllMembers = false,
}: UseOrganizationTeamMembersOptions) {
  const teamMembersQuery = useQuery({
    queryKey: ['organization-team-members', organizationId, viewAllMembers ? 'all' : currentUserId],
    queryFn: async () => {
      if (!organizationId) return [];
      if (!viewAllMembers && !currentUserId) return [];

      let query = supabase
        .from('organization_members')
        .select('id, organization_id, user_id, role, active, invited_email, created_at, updated_at')
        .eq('organization_id', organizationId);

      if (!viewAllMembers) {
        query = query.eq('user_id', currentUserId);
      }

      const { data, error } = await query
        .order('active', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching organization team members:', error);
        throw error;
      }

      return (data || []).map((member) => ({
        id: member.id,
        organizationId: member.organization_id,
        userId: member.user_id,
        role: normalizeOrganizationRole(member.role),
        active: member.active,
        invitedEmail: member.invited_email,
        createdAt: member.created_at,
        updatedAt: member.updated_at,
      })) satisfies OrganizationTeamMember[];
    },
    enabled: Boolean(enabled && organizationId),
    staleTime: 2 * 60 * 1000,
  });

  return {
    teamMembers: teamMembersQuery.data || [],
    loadingTeamMembers: teamMembersQuery.isLoading,
    isErrorTeamMembers: teamMembersQuery.isError,
    errorTeamMembers: teamMembersQuery.error,
    refetchTeamMembers: teamMembersQuery.refetch,
  };
}

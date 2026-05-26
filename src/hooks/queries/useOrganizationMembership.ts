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

      // 1. Obter a organizacao ativa vinculada ao perfil do usuario
      const { data: profileData } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .maybeSingle();

      const activeOrgId = profileData?.organization_id;

      // 2. Buscar membresias ativas (filtrando pela organizacao ativa se existir)
      let memberQuery = supabase
        .from('organization_members')
        .select('id, organization_id, user_id, role, active, created_at')
        .eq('user_id', user.id)
        .eq('active', true);

      if (activeOrgId) {
        memberQuery = memberQuery.eq('organization_id', activeOrgId);
      }

      const { data: memberData, error: memberError } = await memberQuery
        .order('created_at', { ascending: true });

      if (memberError) {
        console.error('Error fetching organization membership:', memberError);
        throw memberError;
      }

      // 3. Verificar se e proprietario da organizacao ativa ou de alguma organizacao no banco
      let orgData = null;
      if (activeOrgId) {
        const { data } = await supabase
          .from('organizations')
          .select('id')
          .eq('id', activeOrgId)
          .eq('owner_user_id', user.id)
          .maybeSingle();
        orgData = data;
      } else {
        const { data } = await supabase
          .from('organizations')
          .select('id')
          .eq('owner_user_id', user.id)
          .maybeSingle();
        orgData = data;
      }

      const memberships = (memberData || [])
        .map((row) => ({
          id: row.id,
          organizationId: row.organization_id,
          userId: row.user_id,
          role: normalizeOrganizationRole(row.role),
          active: row.active,
        }))
        .sort((a, b) => getRolePriority(a.role) - getRolePriority(b.role));

      const activeMember = memberships[0] || null;

      return {
        member: activeMember,
        isOwner: Boolean(orgData?.id),
        ownedOrgId: orgData?.id || null,
      };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const effectiveRole = useMemo<OrganizationRole>(() => {
    // Se o banco retornou cargo na tabela de membros, usamos ele.
    if (membershipQuery.data?.member?.role) {
      return membershipQuery.data.member.role;
    }

    // Se ele for o proprietario da organizacao no banco, ele e o owner
    if (membershipQuery.data?.isOwner) {
      return 'owner';
    }

    // Fallback de seguranca: se nao for o dono no banco e nao tiver membresia, 
    // assume o cargo restrito (receptionist) em vez de dar super-poderes (owner).
    return 'receptionist';
  }, [membershipQuery.data]);

  const organizationId = useMemo(() => {
    return membershipQuery.data?.member?.organizationId 
      || membershipQuery.data?.ownedOrgId 
      || null;
  }, [membershipQuery.data]);

  return {
    membership: membershipQuery.data?.member || null,
    effectiveRole,
    organizationId,
    loadingMembership: membershipQuery.isLoading,
    isErrorMembership: membershipQuery.isError,
    errorMembership: membershipQuery.error,
    isRoleKnown: Boolean(membershipQuery.data && !membershipQuery.isError),
  };
}

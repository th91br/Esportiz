import { useCallback } from 'react';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import {
  canAccessPath as canAccessRolePath,
  canPerformAction,
  type PermissionAction,
  type PermissionModule,
} from '@/lib/rolePermissions';

export function useRolePermissions() {
  const {
    businessType,
    organizationRole,
    isRolePermissionFilterActive,
  } = useBusinessContext();

  const can = useCallback((module: PermissionModule, action: PermissionAction = 'view') => {
    if (!isRolePermissionFilterActive) return true;

    return canPerformAction({
      role: organizationRole,
      businessType,
      module,
      action,
    });
  }, [businessType, isRolePermissionFilterActive, organizationRole]);

  const canAccessPath = useCallback((pathname: string, action: PermissionAction = 'view') => {
    if (!isRolePermissionFilterActive) return true;

    return canAccessRolePath({
      role: organizationRole,
      businessType,
      pathname,
      action,
    });
  }, [businessType, isRolePermissionFilterActive, organizationRole]);

  return {
    can,
    canAccessPath,
    isPermissionFilterActive: isRolePermissionFilterActive,
    organizationRole,
  };
}

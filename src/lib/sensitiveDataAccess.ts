import {
  canPerformAction,
  type PermissionBusinessType,
} from '@/lib/rolePermissions';

export interface SensitiveDataAccess {
  payments: boolean;
  sales: boolean;
  expenses: boolean;
  products: boolean;
}

export function getSensitiveDataAccess(
  role?: string | null,
  businessType: PermissionBusinessType = 'sport_school',
): SensitiveDataAccess {
  return {
    payments: canPerformAction({ role, businessType, module: 'payments', action: 'view' }),
    sales: canPerformAction({ role, businessType, module: 'sales', action: 'view' }),
    expenses: canPerformAction({ role, businessType, module: 'expenses', action: 'view' }),
    products: canPerformAction({ role, businessType, module: 'products', action: 'view' }),
  };
}

import {
  normalizeOrganizationRole,
  type PermissionBusinessType,
} from '@/lib/rolePermissions';
import { getSensitiveDataAccess } from '@/lib/sensitiveDataAccess';

export interface DashboardAccess {
  isFinancialOnly: boolean;
  showOperationalContext: boolean;
  showOperationalSections: boolean;
  loadStudents: boolean;
  loadPlans: boolean;
  loadTrainings: boolean;
  loadAttendance: boolean;
  loadGroups: boolean;
  loadModalities: boolean;
  loadPayments: boolean;
  loadExpenses: boolean;
  loadProducts: boolean;
  loadReservations: boolean;
  loadCourts: boolean;
  loadSales: boolean;
  loadComandas: boolean;
}

export function getDashboardAccess(
  role?: string | null,
  businessType: PermissionBusinessType = 'sport_school',
): DashboardAccess {
  const isFinancialOnly = normalizeOrganizationRole(role) === 'finance';
  const sensitiveDataAccess = getSensitiveDataAccess(role, businessType);

  if (!isFinancialOnly) {
    return {
      isFinancialOnly: false,
      showOperationalContext: true,
      showOperationalSections: true,
      loadStudents: true,
      loadPlans: true,
      loadTrainings: true,
      loadAttendance: true,
      loadGroups: true,
      loadModalities: true,
      loadPayments: sensitiveDataAccess.payments,
      loadExpenses: sensitiveDataAccess.expenses,
      loadProducts: sensitiveDataAccess.products,
      loadReservations: true,
      loadCourts: true,
      loadSales: sensitiveDataAccess.sales,
      loadComandas: true,
    };
  }

  const isArena = businessType === 'arena';

  return {
    isFinancialOnly: true,
    showOperationalContext: false,
    showOperationalSections: false,
    loadStudents: false,
    loadPlans: false,
    loadTrainings: false,
    loadAttendance: false,
    loadGroups: false,
    loadModalities: false,
    loadPayments: sensitiveDataAccess.payments,
    loadExpenses: sensitiveDataAccess.expenses,
    loadProducts: sensitiveDataAccess.products,
    loadReservations: isArena,
    loadCourts: false,
    loadSales: sensitiveDataAccess.sales,
    loadComandas: false,
  };
}

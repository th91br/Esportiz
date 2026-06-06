import {
  normalizeOrganizationRole,
  type PermissionBusinessType,
} from '@/lib/rolePermissions';

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
      loadProducts: true,
      loadReservations: true,
      loadCourts: true,
      loadSales: true,
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
    loadProducts: false,
    loadReservations: isArena,
    loadCourts: false,
    loadSales: isArena,
    loadComandas: false,
  };
}

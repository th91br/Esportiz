import { describe, expect, it } from 'vitest';

import { getDashboardAccess } from './dashboardAccess';

describe('getDashboardAccess', () => {
  it('limits school finance dashboards to financial data and sections', () => {
    expect(getDashboardAccess('finance', 'sport_school')).toEqual({
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
      loadReservations: false,
      loadCourts: false,
      loadSales: false,
      loadComandas: false,
    });
  });

  it('keeps arena financial sources without exposing operational sections', () => {
    const access = getDashboardAccess('finance', 'arena');

    expect(access.isFinancialOnly).toBe(true);
    expect(access.showOperationalContext).toBe(false);
    expect(access.showOperationalSections).toBe(false);
    expect(access.loadReservations).toBe(true);
    expect(access.loadSales).toBe(true);
    expect(access.loadStudents).toBe(false);
    expect(access.loadCourts).toBe(false);
    expect(access.loadProducts).toBe(false);
    expect(access.loadComandas).toBe(false);
  });

  it('preserves the existing dashboard for non-finance roles', () => {
    expect(getDashboardAccess('owner', 'sport_school')).toMatchObject({
      isFinancialOnly: false,
      showOperationalContext: true,
      showOperationalSections: true,
      loadStudents: true,
      loadPlans: true,
      loadTrainings: true,
      loadAttendance: true,
      loadGroups: true,
      loadModalities: true,
    });
  });
});

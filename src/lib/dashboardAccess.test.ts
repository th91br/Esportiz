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
      loadPayments: true,
      loadExpenses: true,
      loadProducts: false,
      loadReservations: false,
      loadCourts: false,
      loadSales: true,
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
    expect(access.loadPayments).toBe(true);
    expect(access.loadExpenses).toBe(true);
    expect(access.loadStudents).toBe(false);
    expect(access.loadCourts).toBe(false);
    expect(access.loadProducts).toBe(false);
    expect(access.loadComandas).toBe(false);
  });

  it('preserves the owner dashboard data sources', () => {
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
      loadPayments: true,
      loadExpenses: true,
      loadProducts: true,
      loadSales: true,
    });
  });

  it('loads only authorized sensitive datasets for operational roles', () => {
    expect(getDashboardAccess('receptionist', 'sport_school')).toMatchObject({
      loadPayments: true,
      loadExpenses: false,
      loadProducts: true,
      loadSales: true,
    });

    expect(getDashboardAccess('instructor', 'sport_school')).toMatchObject({
      loadPayments: false,
      loadExpenses: false,
      loadProducts: false,
      loadSales: false,
    });
  });
});

import { describe, expect, it } from 'vitest';
import {
  canAccessModule,
  canAccessPath,
  canPerformAction,
  getPermissionModuleForPath,
  getRolePermissions,
  isModuleAvailableForBusiness,
  normalizeOrganizationRole,
  type OrganizationRole,
  type PermissionBusinessType,
} from './rolePermissions';

describe('rolePermissions', () => {
  const expectRouteMatrix = ({
    role,
    businessType,
    allowed,
    denied,
  }: {
    role: OrganizationRole;
    businessType: PermissionBusinessType;
    allowed: string[];
    denied: string[];
  }) => {
    for (const pathname of allowed) {
      expect(
        canAccessPath({ role, businessType, pathname }),
        `${role} should access ${pathname} in ${businessType}`,
      ).toBe(true);
    }

    for (const pathname of denied) {
      expect(
        canAccessPath({ role, businessType, pathname }),
        `${role} should not access ${pathname} in ${businessType}`,
      ).toBe(false);
    }
  };

  it('normalizes database roles and safe aliases', () => {
    expect(normalizeOrganizationRole('owner')).toBe('owner');
    expect(normalizeOrganizationRole('manager')).toBe('manager');
    expect(normalizeOrganizationRole('receptionist')).toBe('receptionist');
    expect(normalizeOrganizationRole('instructor')).toBe('instructor');
    expect(normalizeOrganizationRole('professor')).toBe('instructor');
    expect(normalizeOrganizationRole('financeiro')).toBe('finance');
    expect(normalizeOrganizationRole('unknown')).toBe('receptionist');
    expect(normalizeOrganizationRole(null)).toBe('receptionist');
  });

  it('keeps modules scoped to the correct business universe', () => {
    expect(isModuleAvailableForBusiness('students', 'sport_school')).toBe(true);
    expect(isModuleAvailableForBusiness('students', 'arena')).toBe(false);

    expect(isModuleAvailableForBusiness('agenda', 'arena')).toBe(true);
    expect(isModuleAvailableForBusiness('agenda', 'sport_school')).toBe(false);

    expect(isModuleAvailableForBusiness('payments', 'sport_school')).toBe(true);
    expect(isModuleAvailableForBusiness('payments', 'arena')).toBe(true);
  });

  it('gives owners full access only inside the selected business scope', () => {
    expect(canPerformAction({ role: 'owner', businessType: 'sport_school', module: 'team', action: 'manage_team' })).toBe(true);
    expect(canPerformAction({ role: 'owner', businessType: 'arena', module: 'reports', action: 'view_sensitive_financials' })).toBe(true);
    expect(canAccessModule({ role: 'owner', businessType: 'arena', module: 'students' })).toBe(false);
    expect(canAccessModule({ role: 'owner', businessType: 'sport_school', module: 'comandas' })).toBe(false);
  });

  it('lets managers operate the business without team or audit privileges', () => {
    expect(canPerformAction({ role: 'manager', businessType: 'arena', module: 'agenda', action: 'update' })).toBe(true);
    expect(canPerformAction({ role: 'manager', businessType: 'sport_school', module: 'payments', action: 'receive_payment' })).toBe(true);
    expect(canPerformAction({ role: 'manager', businessType: 'arena', module: 'reports', action: 'view_sensitive_financials' })).toBe(true);
    expect(canPerformAction({ role: 'manager', businessType: 'arena', module: 'team', action: 'manage_team' })).toBe(false);
    expect(canAccessModule({ role: 'manager', businessType: 'arena', module: 'audit' })).toBe(false);
  });

  it('keeps receptionist access focused on daily operation', () => {
    expect(canPerformAction({ role: 'receptionist', businessType: 'arena', module: 'agenda', action: 'create' })).toBe(true);
    expect(canPerformAction({ role: 'receptionist', businessType: 'arena', module: 'comandas', action: 'close_comanda' })).toBe(true);
    expect(canPerformAction({ role: 'receptionist', businessType: 'arena', module: 'comandas', action: 'reopen_payment' })).toBe(false);
    expect(canPerformAction({ role: 'receptionist', businessType: 'arena', module: 'sales', action: 'create' })).toBe(true);
    expect(canPerformAction({ role: 'receptionist', businessType: 'arena', module: 'sales', action: 'delete' })).toBe(false);
    expect(canPerformAction({ role: 'receptionist', businessType: 'sport_school', module: 'payments', action: 'receive_payment' })).toBe(true);
    expect(canAccessModule({ role: 'receptionist', businessType: 'arena', module: 'expenses' })).toBe(false);
    expect(canPerformAction({ role: 'receptionist', businessType: 'arena', module: 'expenses', action: 'create' })).toBe(false);
    expect(canPerformAction({ role: 'receptionist', businessType: 'arena', module: 'reports', action: 'view_sensitive_financials' })).toBe(false);
  });

  it('keeps instructors away from financial and inventory actions', () => {
    expect(canPerformAction({ role: 'instructor', businessType: 'sport_school', module: 'attendance', action: 'create' })).toBe(true);
    expect(canPerformAction({ role: 'professor', businessType: 'sport_school', module: 'student_training_requests', action: 'approve_request' })).toBe(true);
    expect(canAccessModule({ role: 'instructor', businessType: 'sport_school', module: 'payments' })).toBe(false);
    expect(canAccessModule({ role: 'instructor', businessType: 'arena', module: 'products' })).toBe(false);
  });

  it('prepares finance role for financial modules without operational takeover', () => {
    expect(canPerformAction({ role: 'finance', businessType: 'arena', module: 'payments', action: 'receive_payment' })).toBe(true);
    expect(canPerformAction({ role: 'financeiro', businessType: 'sport_school', module: 'expenses', action: 'view_sensitive_financials' })).toBe(true);
    expect(canPerformAction({ role: 'financeiro', businessType: 'arena', module: 'expenses', action: 'create' })).toBe(true);
    expect(canPerformAction({ role: 'finance', businessType: 'arena', module: 'reports', action: 'export' })).toBe(true);
    expect(canPerformAction({ role: 'finance', businessType: 'arena', module: 'sales', action: 'create' })).toBe(false);
    expect(canAccessModule({ role: 'finance', businessType: 'arena', module: 'agenda' })).toBe(false);
    expect(canPerformAction({ role: 'finance', businessType: 'arena', module: 'settings', action: 'manage_settings' })).toBe(false);
  });

  it('maps routes to permission modules without applying the guard globally yet', () => {
    expect(getPermissionModuleForPath('/agenda')).toBe('agenda');
    expect(getPermissionModuleForPath('/alunos/123')).toBe('students');
    expect(getPermissionModuleForPath('/configuracoes')).toBe('settings');
    expect(getPermissionModuleForPath('/portal/aluno/teste')).toBe(null);

    expect(canAccessPath({ role: 'owner', businessType: 'arena', pathname: '/agenda' })).toBe(true);
    expect(canAccessPath({ role: 'manager', businessType: 'arena', pathname: '/configuracoes' })).toBe(true);
    expect(canAccessPath({ role: 'receptionist', businessType: 'arena', pathname: '/configuracoes' })).toBe(false);
    expect(canAccessPath({ role: 'receptionist', businessType: 'arena', pathname: '/despesas' })).toBe(false);
    expect(canAccessPath({ role: 'instructor', businessType: 'sport_school', pathname: '/presenca' })).toBe(true);
    expect(canAccessPath({ role: 'instructor', businessType: 'arena', pathname: '/produtos' })).toBe(false);
  });

  it('returns only scoped permissions for the current modality', () => {
    const schoolModules = getRolePermissions('manager', 'sport_school').map((permission) => permission.module);
    const arenaModules = getRolePermissions('manager', 'arena').map((permission) => permission.module);

    expect(schoolModules).toContain('students');
    expect(schoolModules).not.toContain('agenda');
    expect(arenaModules).toContain('agenda');
    expect(arenaModules).not.toContain('students');
  });

  it('protects school routes by organization role', () => {
    expectRouteMatrix({
      role: 'owner',
      businessType: 'sport_school',
      allowed: [
        '/dashboard',
        '/calendario',
        '/alunos',
        '/alunos/123',
        '/presenca',
        '/planos',
        '/modalidades',
        '/turmas',
        '/aniversariantes',
        '/contratos',
        '/pagamentos',
        '/despesas',
        '/relatorios',
        '/comunicacao',
        '/configuracoes',
      ],
      denied: ['/agenda', '/reservantes', '/quadras', '/comandas', '/produtos', '/vendas'],
    });

    expectRouteMatrix({
      role: 'receptionist',
      businessType: 'sport_school',
      allowed: ['/dashboard', '/calendario', '/alunos', '/presenca', '/aniversariantes', '/pagamentos', '/comunicacao'],
      denied: ['/planos', '/modalidades', '/turmas', '/contratos', '/despesas', '/relatorios', '/configuracoes', '/agenda'],
    });

    expectRouteMatrix({
      role: 'instructor',
      businessType: 'sport_school',
      allowed: ['/dashboard', '/calendario', '/alunos', '/presenca', '/turmas'],
      denied: ['/pagamentos', '/despesas', '/relatorios', '/configuracoes', '/planos', '/modalidades', '/contratos'],
    });

    expectRouteMatrix({
      role: 'finance',
      businessType: 'sport_school',
      allowed: ['/dashboard', '/pagamentos', '/despesas', '/relatorios'],
      denied: ['/calendario', '/alunos', '/presenca', '/turmas', '/configuracoes', '/vendas'],
    });
  });

  it('protects arena routes by organization role', () => {
    expectRouteMatrix({
      role: 'owner',
      businessType: 'arena',
      allowed: [
        '/dashboard',
        '/agenda',
        '/reservantes',
        '/quadras',
        '/comandas',
        '/produtos',
        '/vendas',
        '/pagamentos',
        '/despesas',
        '/relatorios',
        '/comunicacao',
        '/configuracoes',
      ],
      denied: ['/calendario', '/alunos', '/presenca', '/planos', '/modalidades', '/turmas', '/contratos'],
    });

    expectRouteMatrix({
      role: 'manager',
      businessType: 'arena',
      allowed: ['/dashboard', '/agenda', '/reservantes', '/quadras', '/comandas', '/produtos', '/vendas', '/pagamentos', '/despesas', '/relatorios', '/comunicacao', '/configuracoes'],
      denied: ['/calendario', '/alunos', '/presenca', '/planos', '/modalidades', '/turmas'],
    });

    expectRouteMatrix({
      role: 'receptionist',
      businessType: 'arena',
      allowed: ['/dashboard', '/agenda', '/reservantes', '/quadras', '/comandas', '/produtos', '/vendas', '/pagamentos', '/comunicacao'],
      denied: ['/despesas', '/relatorios', '/configuracoes', '/calendario', '/alunos'],
    });

    expectRouteMatrix({
      role: 'instructor',
      businessType: 'arena',
      allowed: ['/dashboard', '/agenda', '/reservantes'],
      denied: ['/quadras', '/comandas', '/produtos', '/vendas', '/pagamentos', '/despesas', '/relatorios', '/configuracoes'],
    });

    expectRouteMatrix({
      role: 'finance',
      businessType: 'arena',
      allowed: ['/dashboard', '/pagamentos', '/despesas', '/relatorios', '/vendas', '/comandas'],
      denied: ['/agenda', '/reservantes', '/quadras', '/produtos', '/configuracoes', '/calendario', '/alunos'],
    });
  });
});

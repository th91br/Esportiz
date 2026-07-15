import { describe, expect, it } from 'vitest';
import { canAccessBusinessRoute, getRouteAccessScope } from './businessRouteAccess';

describe('businessRouteAccess', () => {
  it('keeps shared routes available for both business types', () => {
    for (const route of ['/dashboard', '/pagamentos', '/produtos', '/vendas', '/despesas', '/relatorios', '/configuracoes']) {
      expect(getRouteAccessScope(route)).toBe('shared');
      expect(canAccessBusinessRoute('sport_school', route)).toBe(true);
      expect(canAccessBusinessRoute('arena', route)).toBe(true);
    }
  });

  it('allows sport school routes only for sport school profiles', () => {
    for (const route of ['/calendario', '/alunos', '/alunos/123', '/presenca', '/planos', '/modalidades', '/turmas', '/aniversariantes', '/contratos']) {
      expect(getRouteAccessScope(route)).toBe('sport_school');
      expect(canAccessBusinessRoute('sport_school', route)).toBe(true);
      expect(canAccessBusinessRoute('arena', route)).toBe(false);
    }
  });

  it('allows arena routes only for arena profiles', () => {
    for (const route of ['/quadras', '/agenda', '/reservantes', '/reservantes/123', '/comandas']) {
      expect(getRouteAccessScope(route)).toBe('arena');
      expect(canAccessBusinessRoute('arena', route)).toBe(true);
      expect(canAccessBusinessRoute('sport_school', route)).toBe(false);
    }
  });

  it('defaults unknown or missing business type to sport school', () => {
    expect(canAccessBusinessRoute(null, '/alunos')).toBe(true);
    expect(canAccessBusinessRoute(undefined, '/vendas')).toBe(true);
  });
});

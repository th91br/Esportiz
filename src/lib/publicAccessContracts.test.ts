import { describe, expect, it } from 'vitest';
import {
  getRouteAccessLevel,
  isKnownProtectedRoute,
  isKnownPublicRoute,
  resolvePublicOwnerScope,
} from './publicAccessContracts';

const validOwnerId = '03c363bd-188b-4263-82a0-375c7fc1cb6a';

describe('publicAccessContracts', () => {
  it('keeps public portals public and private modules protected', () => {
    expect(isKnownPublicRoute('/')).toBe(true);
    expect(isKnownPublicRoute('/agendar')).toBe(true);
    expect(isKnownPublicRoute('/portal-aluno?ct=abc')).toBe(true);
    expect(isKnownProtectedRoute('/dashboard')).toBe(true);
    expect(isKnownProtectedRoute('/alunos/123')).toBe(true);
  });

  it('does not accidentally expose unknown nested public-looking paths', () => {
    expect(getRouteAccessLevel('/portal-aluno/admin')).toBe('unknown');
    expect(getRouteAccessLevel('/agendar/private')).toBe('unknown');
    expect(getRouteAccessLevel('/rota-inexistente')).toBe('unknown');
  });

  it('normalizes and validates tenant scope from public ct links', () => {
    expect(resolvePublicOwnerScope(null)).toEqual({
      rawOwnerId: null,
      hasOwnerId: false,
      hasInvalidOwnerId: false,
      scopedOwnerId: null,
    });

    expect(resolvePublicOwnerScope('abc')).toEqual({
      rawOwnerId: 'abc',
      hasOwnerId: true,
      hasInvalidOwnerId: true,
      scopedOwnerId: null,
    });

    expect(resolvePublicOwnerScope(validOwnerId)).toEqual({
      rawOwnerId: validOwnerId,
      hasOwnerId: true,
      hasInvalidOwnerId: false,
      scopedOwnerId: validOwnerId,
    });
  });
});

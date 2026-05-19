import { isValidUuid } from './publicPortalSecurity';

export type RouteAccessLevel = 'public' | 'protected' | 'unknown';

export const PUBLIC_ROUTE_PATHS = [
  '/',
  '/matricula',
  '/agendar',
  '/agendamento',
  '/portal-aluno',
  '/login',
  '/reset-password',
] as const;

export const PROTECTED_ROUTE_PATHS = [
  '/dashboard',
  '/onboarding',
  '/calendario',
  '/alunos',
  '/presenca',
  '/planos',
  '/pagamentos',
  '/despesas',
  '/produtos',
  '/vendas',
  '/aniversariantes',
  '/relatorios',
  '/comunicacao',
  '/contratos',
  '/modalidades',
  '/turmas',
  '/configuracoes',
  '/quadras',
  '/agenda',
  '/reservantes',
  '/comandas',
] as const;

export interface PublicOwnerScope {
  rawOwnerId: string | null;
  hasOwnerId: boolean;
  hasInvalidOwnerId: boolean;
  scopedOwnerId: string | null;
}

function normalizePathname(pathname: string): string {
  const pathWithoutQuery = pathname.split('?')[0].split('#')[0] || '/';
  if (pathWithoutQuery === '/') return '/';
  return pathWithoutQuery.replace(/\/+$/, '');
}

export function resolvePublicOwnerScope(ownerId: string | null): PublicOwnerScope {
  const scopedOwnerId = isValidUuid(ownerId) ? ownerId : null;

  return {
    rawOwnerId: ownerId,
    hasOwnerId: ownerId !== null,
    hasInvalidOwnerId: ownerId !== null && !scopedOwnerId,
    scopedOwnerId,
  };
}

export function getRouteAccessLevel(pathname: string): RouteAccessLevel {
  const normalizedPath = normalizePathname(pathname);

  if ((PUBLIC_ROUTE_PATHS as readonly string[]).includes(normalizedPath)) {
    return 'public';
  }

  if ((PROTECTED_ROUTE_PATHS as readonly string[]).includes(normalizedPath)) {
    return 'protected';
  }

  if (normalizedPath.startsWith('/alunos/')) {
    return 'protected';
  }

  return 'unknown';
}

export function isKnownPublicRoute(pathname: string): boolean {
  return getRouteAccessLevel(pathname) === 'public';
}

export function isKnownProtectedRoute(pathname: string): boolean {
  return getRouteAccessLevel(pathname) === 'protected';
}

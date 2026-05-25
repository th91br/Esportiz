export type BusinessRouteType = 'sport_school' | 'arena';
export type RouteAccessScope = BusinessRouteType | 'shared';

const SPORT_SCHOOL_ROUTE_PREFIXES = [
  '/calendario',
  '/alunos',
  '/presenca',
  '/planos',
  '/aniversariantes',
  '/modalidades',
  '/turmas',
  '/contratos',
];

const ARENA_ROUTE_PREFIXES = [
  '/quadras',
  '/agenda',
  '/reservantes',
  '/comandas',
  '/produtos',
  '/vendas',
];

function normalizeBusinessType(value?: string | null): BusinessRouteType {
  return value === 'arena' ? 'arena' : 'sport_school';
}

function matchesRoutePrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function getRouteAccessScope(pathname: string): RouteAccessScope {
  if (SPORT_SCHOOL_ROUTE_PREFIXES.some((prefix) => matchesRoutePrefix(pathname, prefix))) {
    return 'sport_school';
  }

  if (ARENA_ROUTE_PREFIXES.some((prefix) => matchesRoutePrefix(pathname, prefix))) {
    return 'arena';
  }

  return 'shared';
}

export function canAccessBusinessRoute(
  businessType: string | null | undefined,
  pathname: string,
) {
  const normalizedBusinessType = normalizeBusinessType(businessType);
  const scope = getRouteAccessScope(pathname);

  return scope === 'shared' || scope === normalizedBusinessType;
}

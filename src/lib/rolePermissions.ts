export type PermissionBusinessType = 'sport_school' | 'arena';

export type OrganizationRole =
  | 'owner'
  | 'manager'
  | 'receptionist'
  | 'instructor'
  | 'finance';

export type PermissionModule =
  | 'dashboard'
  | 'calendar'
  | 'agenda'
  | 'students'
  | 'reservants'
  | 'attendance'
  | 'plans'
  | 'modalities'
  | 'groups'
  | 'birthdays'
  | 'contracts'
  | 'payments'
  | 'expenses'
  | 'products'
  | 'sales'
  | 'comandas'
  | 'courts'
  | 'reports'
  | 'communication'
  | 'settings'
  | 'team'
  | 'audit'
  | 'student_training_requests';

export type PermissionAction =
  | 'view'
  | 'create'
  | 'update'
  | 'delete'
  | 'receive_payment'
  | 'reopen_payment'
  | 'close_comanda'
  | 'manage_stock'
  | 'manage_settings'
  | 'manage_team'
  | 'view_sensitive_financials'
  | 'export'
  | 'send_message'
  | 'approve_request';

export type ModuleScope = PermissionBusinessType | 'shared';

export interface RolePermission {
  module: PermissionModule;
  actions: readonly PermissionAction[];
  scope: ModuleScope;
}

interface PermissionCheck {
  role?: string | null;
  businessType?: string | null;
  module: PermissionModule;
  action?: PermissionAction;
}

interface RoutePermissionCheck {
  role?: string | null;
  businessType?: string | null;
  pathname: string;
  action?: PermissionAction;
}

const MODULE_SCOPES: Record<PermissionModule, ModuleScope> = {
  dashboard: 'shared',
  payments: 'shared',
  expenses: 'shared',
  reports: 'shared',
  communication: 'shared',
  settings: 'shared',
  team: 'shared',
  audit: 'shared',
  calendar: 'sport_school',
  students: 'sport_school',
  attendance: 'sport_school',
  plans: 'sport_school',
  modalities: 'sport_school',
  groups: 'sport_school',
  birthdays: 'sport_school',
  contracts: 'sport_school',
  student_training_requests: 'sport_school',
  agenda: 'arena',
  reservants: 'arena',
  products: 'arena',
  sales: 'arena',
  comandas: 'arena',
  courts: 'arena',
};

const MODULE_ACTIONS: Record<PermissionModule, readonly PermissionAction[]> = {
  dashboard: ['view'],
  calendar: ['view', 'create', 'update', 'delete'],
  agenda: ['view', 'create', 'update', 'delete'],
  students: ['view', 'create', 'update', 'delete'],
  reservants: ['view', 'create', 'update', 'delete'],
  attendance: ['view', 'create', 'update', 'delete'],
  plans: ['view', 'create', 'update', 'delete'],
  modalities: ['view', 'create', 'update', 'delete'],
  groups: ['view', 'create', 'update', 'delete'],
  birthdays: ['view', 'send_message'],
  contracts: ['view', 'create', 'update', 'delete', 'send_message'],
  payments: ['view', 'create', 'update', 'delete', 'receive_payment', 'reopen_payment', 'export'],
  expenses: ['view', 'create', 'update', 'delete', 'export', 'view_sensitive_financials'],
  products: ['view', 'create', 'update', 'delete', 'manage_stock'],
  sales: ['view', 'create', 'delete', 'export'],
  comandas: ['view', 'create', 'update', 'delete', 'close_comanda', 'reopen_payment'],
  courts: ['view', 'create', 'update', 'delete'],
  reports: ['view', 'export', 'view_sensitive_financials'],
  communication: ['view', 'send_message'],
  settings: ['view', 'update', 'manage_settings'],
  team: ['view', 'create', 'update', 'delete', 'manage_team'],
  audit: ['view', 'export'],
  student_training_requests: ['view', 'update', 'approve_request'],
};

const ROUTE_MODULE_PREFIXES: Array<{ prefix: string; module: PermissionModule }> = [
  { prefix: '/dashboard', module: 'dashboard' },
  { prefix: '/calendario', module: 'calendar' },
  { prefix: '/agenda', module: 'agenda' },
  { prefix: '/alunos', module: 'students' },
  { prefix: '/reservantes', module: 'reservants' },
  { prefix: '/presenca', module: 'attendance' },
  { prefix: '/planos', module: 'plans' },
  { prefix: '/modalidades', module: 'modalities' },
  { prefix: '/turmas', module: 'groups' },
  { prefix: '/aniversariantes', module: 'birthdays' },
  { prefix: '/contratos', module: 'contracts' },
  { prefix: '/pagamentos', module: 'payments' },
  { prefix: '/despesas', module: 'expenses' },
  { prefix: '/produtos', module: 'products' },
  { prefix: '/vendas', module: 'sales' },
  { prefix: '/comandas', module: 'comandas' },
  { prefix: '/quadras', module: 'courts' },
  { prefix: '/relatorios', module: 'reports' },
  { prefix: '/comunicacao', module: 'communication' },
  { prefix: '/configuracoes', module: 'settings' },
];

const ROLE_ALIASES: Record<string, OrganizationRole> = {
  owner: 'owner',
  dono: 'owner',
  ceo: 'owner',
  manager: 'manager',
  gerente: 'manager',
  admin: 'manager',
  administrator: 'manager',
  receptionist: 'receptionist',
  recepcao: 'receptionist',
  secretaria: 'receptionist',
  secretary: 'receptionist',
  instructor: 'instructor',
  professor: 'instructor',
  coach: 'instructor',
  teacher: 'instructor',
  finance: 'finance',
  financeiro: 'finance',
};

const MANAGER_PERMISSIONS: Partial<Record<PermissionModule, readonly PermissionAction[]>> = {
  // Dashboard — acesso completo a todos os KPIs e graficos
  dashboard: MODULE_ACTIONS.dashboard,
  // Escola Esportiva
  calendar: MODULE_ACTIONS.calendar,
  students: MODULE_ACTIONS.students,
  attendance: MODULE_ACTIONS.attendance,
  plans: MODULE_ACTIONS.plans,
  modalities: MODULE_ACTIONS.modalities,
  groups: MODULE_ACTIONS.groups,
  birthdays: MODULE_ACTIONS.birthdays,
  contracts: MODULE_ACTIONS.contracts,
  // Arena
  agenda: MODULE_ACTIONS.agenda,
  reservants: MODULE_ACTIONS.reservants,
  products: MODULE_ACTIONS.products,
  sales: MODULE_ACTIONS.sales,
  comandas: ['view', 'create', 'update', 'close_comanda'], // Criar, editar e fechar comandas (sem excluir/reabrir pagamentos)
  courts: MODULE_ACTIONS.courts,
  // Compartilhados — acesso parcial (sem excluir em financeiro nem gerenciar equipe)
  payments: ['view', 'create', 'update', 'receive_payment', 'reopen_payment', 'export'],
  expenses: ['view', 'create', 'update', 'export', 'view_sensitive_financials'],
  reports: MODULE_ACTIONS.reports,
  communication: MODULE_ACTIONS.communication,
  settings: ['view', 'update'],
  team: ['view'],
};

const RECEPTIONIST_PERMISSIONS: Partial<Record<PermissionModule, readonly PermissionAction[]>> = {
  dashboard: ['view'],
  calendar: ['view', 'create', 'update'],
  agenda: ['view', 'create', 'update'],
  students: ['view', 'create', 'update'],
  reservants: ['view', 'create', 'update'],
  attendance: ['view', 'create', 'update'],
  birthdays: ['view', 'send_message'],
  payments: ['view', 'receive_payment'],
  products: ['view'],
  sales: ['view', 'create'],
  comandas: ['view', 'create', 'update', 'close_comanda'],
  courts: ['view'],
  reports: ['view'], // Permite visualizar relatorios básicos/operacionais
  communication: ['view', 'send_message'],
  student_training_requests: ['view', 'update'],
  settings: ['view'], // Permite visualizar configurações básicas
  team: ['view'],
};

const INSTRUCTOR_PERMISSIONS: Partial<Record<PermissionModule, readonly PermissionAction[]>> = {
  dashboard: ['view'],
  calendar: ['view'],
  agenda: ['view'],
  students: ['view'],
  reservants: ['view'],
  attendance: ['view', 'create', 'update'],
  groups: ['view'],
  birthdays: ['view'],              // Professor precisa saber aniversarios dos alunos
  communication: ['view'],          // Acesso de leitura a comunicacoes
  student_training_requests: ['view', 'update', 'approve_request'],
  settings: ['view'], // Permite visualizar configurações básicas
  team: ['view'],
};

const FINANCE_PERMISSIONS: Partial<Record<PermissionModule, readonly PermissionAction[]>> = {
  // Compartilhados (Escola Esportiva e Arena)
  dashboard: ['view'],
  payments: ['view', 'create', 'update', 'receive_payment', 'reopen_payment', 'export'],
  expenses: ['view', 'create', 'update', 'export', 'view_sensitive_financials'],
  reports: ['view', 'export', 'view_sensitive_financials'],
  settings: ['view'], // Permite visualizar configurações básicas
  team: ['view'],
  // Arena apenas — filtrados automaticamente pelo scope em sport_school
  sales: ['view', 'export'],
  comandas: ['view'],
  reservants: ['view'], // Permite consultar reservantes de referência
};

const ROLE_PERMISSIONS: Record<Exclude<OrganizationRole, 'owner'>, Partial<Record<PermissionModule, readonly PermissionAction[]>>> = {
  manager: MANAGER_PERMISSIONS,
  receptionist: RECEPTIONIST_PERMISSIONS,
  instructor: INSTRUCTOR_PERMISSIONS,
  finance: FINANCE_PERMISSIONS,
};

function normalizeBusinessType(value?: string | null): PermissionBusinessType {
  return value === 'arena' ? 'arena' : 'sport_school';
}

function matchesRoutePrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function normalizeOrganizationRole(role?: string | null): OrganizationRole {
  const normalized = String(role || '').trim().toLowerCase();
  return ROLE_ALIASES[normalized] || 'receptionist';
}

export function getModuleScope(module: PermissionModule): ModuleScope {
  return MODULE_SCOPES[module];
}

export function isModuleAvailableForBusiness(
  module: PermissionModule,
  businessType?: string | null,
): boolean {
  const scope = getModuleScope(module);
  const normalizedBusinessType = normalizeBusinessType(businessType);

  return scope === 'shared' || scope === normalizedBusinessType;
}

export function getPermissionModuleForPath(pathname: string): PermissionModule | null {
  return ROUTE_MODULE_PREFIXES.find(({ prefix }) => matchesRoutePrefix(pathname, prefix))?.module || null;
}

export function getRolePermissions(
  role?: string | null,
  businessType?: string | null,
): RolePermission[] {
  const normalizedRole = normalizeOrganizationRole(role);
  const normalizedBusinessType = normalizeBusinessType(businessType);

  return (Object.keys(MODULE_SCOPES) as PermissionModule[])
    .filter((module) => isModuleAvailableForBusiness(module, normalizedBusinessType))
    .map((module) => {
      const actions = normalizedRole === 'owner'
        ? MODULE_ACTIONS[module]
        : ROLE_PERMISSIONS[normalizedRole][module] || [];

      return {
        module,
        actions,
        scope: MODULE_SCOPES[module],
      };
    })
    .filter((permission) => permission.actions.length > 0);
}

export function canPerformAction({
  role,
  businessType,
  module,
  action = 'view',
}: PermissionCheck): boolean {
  if (!isModuleAvailableForBusiness(module, businessType)) return false;

  return getRolePermissions(role, businessType).some((permission) => (
    permission.module === module && permission.actions.includes(action)
  ));
}

export function canAccessModule(check: PermissionCheck): boolean {
  return canPerformAction({ ...check, action: 'view' });
}

export function canAccessPath({
  role,
  businessType,
  pathname,
  action = 'view',
}: RoutePermissionCheck): boolean {
  const module = getPermissionModuleForPath(pathname);
  if (!module) return true;

  return canPerformAction({ role, businessType, module, action });
}

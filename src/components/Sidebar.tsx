import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/contexts/sidebar';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { useProfile } from '@/hooks/queries/useProfile';
import { Logo, EsportizIcon } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Trophy,
  UsersRound,
  ClipboardCheck,
  FileText,
  DollarSign,
  TrendingDown,
  Package,
  ShoppingCart,
  Cake,
  BarChart3,
  MessageSquare,
  Receipt,
  Grid,
  CalendarRange,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const PATH_TO_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  '/dashboard': LayoutDashboard,
  '/calendario': Calendar,
  '/agenda': CalendarRange,
  '/alunos': Users,
  '/reservantes': Users,
  '/modalidades': Trophy,
  '/quadras': Grid,
  '/turmas': UsersRound,
  '/presenca': ClipboardCheck,
  '/planos': FileText,
  '/pagamentos': DollarSign,
  '/despesas': TrendingDown,
  '/produtos': Package,
  '/vendas': ShoppingCart,
  '/aniversariantes': Cake,
  '/relatorios': BarChart3,
  '/comunicacao': MessageSquare,
  '/comandas': Receipt
};

const PATH_TO_GROUP: Record<string, string> = {
  '/dashboard': 'Visão Geral',
  '/relatorios': 'Visão Geral',
  
  '/calendario': 'Operação',
  '/agenda': 'Operação',
  '/modalidades': 'Operação',
  '/quadras': 'Operação',
  '/turmas': 'Operação',
  '/presenca': 'Operação',
  
  '/alunos': 'Relacionamento / Alunos',
  '/reservantes': 'Relacionamento / Alunos',
  '/aniversariantes': 'Relacionamento / Alunos',
  '/comunicacao': 'Relacionamento / Alunos',
  
  '/planos': 'Financeiro',
  '/pagamentos': 'Financeiro',
  '/despesas': 'Financeiro',
  '/vendas': 'Financeiro',
  
  '/produtos': 'Gestão',
  '/comandas': 'Consumo e Estoque'
};

const GROUPS_ORDER = [
  'Visão Geral',
  'Operação',
  'Relacionamento / Alunos',
  'Financeiro',
  'Consumo e Estoque',
  'Gestão'
];

export function Sidebar() {
  const location = useLocation();
  const { isCollapsed, toggleCollapse, isActive } = useSidebar();
  const { businessType, navModules } = useBusinessContext();
  const { profile } = useProfile();

  if (!isActive) return null;

  // Active route check helper
  const isActiveRoute = (path: string) => {
    if (location.pathname === path) return true;
    if (path !== '/' && location.pathname.startsWith(path + '/')) return true;
    return false;
  };

  // Group modules dynamically based on business type rules
  const getGroupForPath = (path: string): string => {
    if (businessType === 'arena') {
      if (path === '/produtos' || path === '/comandas') {
        return 'Consumo e Estoque';
      }
      if (path === '/reservantes') {
        return 'Operação';
      }
    } else {
      if (path === '/produtos') {
        return 'Gestão';
      }
    }
    return PATH_TO_GROUP[path] || 'Outros';
  };

  // Group current navModules safely
  const modulesByGroup = (navModules || []).reduce((acc, module) => {
    const group = getGroupForPath(module.path);
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(module);
    return acc;
  }, {} as Record<string, typeof navModules>);

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col h-screen fixed top-0 left-0 z-40 bg-card border-r border-border/40 transition-all duration-300 ease-in-out shadow-sm",
        isCollapsed ? "w-[72px]" : "w-[240px]"
      )}
    >
      {/* Header / Logo */}
      <div className="flex h-14 items-center px-4 border-b border-border/40 shrink-0">
        {isCollapsed ? (
          <Link to="/dashboard" className="mx-auto transition-transform hover:scale-105 active:scale-95" aria-label="Ir para o dashboard">
            {profile?.logo_url ? (
              <img
                src={profile.logo_url}
                alt={profile.ct_name || 'Logo'}
                className="h-7 w-7 object-contain rounded-md shrink-0"
              />
            ) : (
              <EsportizIcon size={28} />
            )}
          </Link>
        ) : (
          <Link to="/dashboard" className="flex items-center gap-2 overflow-hidden truncate transition-transform hover:scale-101 active:scale-99">
            {profile?.logo_url ? (
              <img
                src={profile.logo_url}
                alt={profile.ct_name || 'Logo'}
                className="h-7 w-7 object-contain rounded-md shrink-0"
              />
            ) : (
              <EsportizIcon size={28} />
            )}
            <span className="font-display font-bold text-xs lg:text-sm text-foreground truncate" title={profile?.ct_name || 'Esportiz'}>
              {profile?.ct_name || 'Esportiz'}
            </span>
          </Link>
        )}
      </div>

      {/* Main Navigation List */}
      <nav aria-label="Navegação lateral" className="flex-1 overflow-y-auto no-scrollbar py-4 space-y-4">
        {GROUPS_ORDER.map(groupName => {
          const groupModules = modulesByGroup[groupName] || [];
          if (groupModules.length === 0) return null;

          return (
            <div key={groupName} className="space-y-1">
              {!isCollapsed && (
                <h3 className="px-4 text-[9px] font-bold font-display tracking-wider text-muted-foreground uppercase">
                  {groupName}
                </h3>
              )}
              <div className="space-y-0.5 px-2">
                {groupModules.map(module => {
                  const Icon = PATH_TO_ICON[module.path] || LayoutDashboard;
                  const active = isActiveRoute(module.path);

                  const linkContent = (
                    <Link
                      to={module.path}
                      aria-label={isCollapsed ? module.label : undefined}
                      className={cn(
                        "flex items-center rounded-lg text-xs font-medium transition-colors w-full",
                        isCollapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2",
                        active
                          ? "bg-primary/10 text-primary font-semibold"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/65"
                      )}
                    >
                      <Icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
                      {!isCollapsed && <span className="truncate">{module.label}</span>}
                    </Link>
                  );

                  if (isCollapsed) {
                    return (
                      <Tooltip key={module.path} delayDuration={100}>
                        <TooltipTrigger asChild>
                          {linkContent}
                        </TooltipTrigger>
                        <TooltipContent side="right" className="font-display text-xs font-bold px-2.5 py-1">
                          {module.label}
                        </TooltipContent>
                      </Tooltip>
                    );
                  }

                  return <React.Fragment key={module.path}>{linkContent}</React.Fragment>;
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Bottom Collapse Button */}
      <div className="p-3 border-t border-border/40 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleCollapse}
          className={cn(
            "w-full flex items-center h-9 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-200",
            isCollapsed ? "justify-center" : "justify-start px-3 gap-2"
          )}
          aria-label={isCollapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span className="text-[10px] font-bold font-display uppercase tracking-wider">Recolher</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}

import { useState } from 'react';
import {
  ChevronDown,
  Crown,
  ShieldCheck,
  BookOpen,
  Calculator,
  Phone,
  CheckCircle2,
  XCircle,
  Eye,
  Pencil,
  PlusCircle,
  Trash2,
  Download,
  MessageSquare,
  Key,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type BusinessTab = 'sport_school' | 'arena';

interface PermissionItem {
  label: string;
  access: 'full' | 'limited' | 'view' | 'none';
  detail?: string;
}

interface RoleCard {
  role: string;
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
  permissions: PermissionItem[];
}

function AccessBadge({ access, detail }: { access: PermissionItem['access']; detail?: string }) {
  // Sem acesso — inalterado
  if (access === 'none') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wide">
        <XCircle className="h-3 w-3" />
        Sem acesso
      </span>
    );
  }

  // Ver — icone + texto curto "Ver"
  if (access === 'view') {
    return (
      <span
        className="inline-flex items-center gap-1 text-[10px] font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wide"
        title={detail}
      >
        <Eye className="h-3 w-3" />
        Ver
      </span>
    );
  }

  // Parcial — icone + "Parcial" sempre visivel; detalhe completo no tooltip (hover desktop)
  if (access === 'limited') {
    return (
      <span
        className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide cursor-help"
        title={detail || 'Acesso parcial'}
      >
        <Pencil className="h-3 w-3" />
        Parcial
      </span>
    );
  }

  // Completo — icone + detalhe descritivo sempre visivel
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
      <CheckCircle2 className="h-3 w-3" />
      {detail || 'Acesso completo'}
    </span>
  );
}


const SCHOOL_ROLES: RoleCard[] = [
  {
    role: 'owner',
    label: 'CEO / Dono',
    icon: Crown,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    borderColor: 'border-amber-200 dark:border-amber-800',
    permissions: [
      { label: 'Dashboard', access: 'full', detail: 'Todos os KPIs e graficos' },
      { label: 'Calendario de Aulas', access: 'full', detail: 'Criar, editar e excluir' },
      { label: 'Alunos', access: 'full', detail: 'Criar, editar e excluir' },
      { label: 'Presenca', access: 'full', detail: 'Registro e historico completo' },
      { label: 'Planos', access: 'full', detail: 'Criar, editar e excluir' },
      { label: 'Modalidades', access: 'full', detail: 'Criar, editar e excluir' },
      { label: 'Turmas', access: 'full', detail: 'Criar, editar e excluir' },
      { label: 'Aniversariantes', access: 'full', detail: 'Ver e enviar mensagens' },
      { label: 'Contratos', access: 'full', detail: 'Criar, editar e excluir' },
      { label: 'Pagamentos', access: 'full', detail: 'CRUD + exportar' },
      { label: 'Despesas', access: 'full', detail: 'CRUD + dados sensiveis' },
      { label: 'Relatorios', access: 'full', detail: 'Completo com exportacao' },
      { label: 'Comunicacao', access: 'full', detail: 'Ver e enviar mensagens' },
      { label: 'Configuracoes', access: 'full', detail: 'Gerenciar tudo' },
      { label: 'Equipe', access: 'full', detail: 'Adicionar, ativar e excluir' },
      { label: 'Solicit. de Treino', access: 'full', detail: 'Aprovar e gerenciar' },
    ],
  },
  {
    role: 'manager',
    label: 'Gerente',
    icon: ShieldCheck,
    color: 'text-violet-600 dark:text-violet-400',
    bgColor: 'bg-violet-50 dark:bg-violet-950/30',
    borderColor: 'border-violet-200 dark:border-violet-800',
    permissions: [
      { label: 'Dashboard', access: 'full', detail: 'Todos os KPIs e graficos' },
      { label: 'Calendario de Aulas', access: 'full', detail: 'Criar, editar e excluir' },
      { label: 'Alunos', access: 'full', detail: 'Criar, editar e excluir' },
      { label: 'Presenca', access: 'full', detail: 'Registro e historico completo' },
      { label: 'Planos', access: 'full', detail: 'Criar, editar e excluir' },
      { label: 'Modalidades', access: 'full', detail: 'Criar, editar e excluir' },
      { label: 'Turmas', access: 'full', detail: 'Criar, editar e excluir' },
      { label: 'Aniversariantes', access: 'full', detail: 'Ver e enviar mensagens' },
      { label: 'Contratos', access: 'full', detail: 'Criar, editar e excluir' },
      { label: 'Pagamentos', access: 'limited', detail: 'Receber e reabrir (sem excluir)' },
      { label: 'Despesas', access: 'limited', detail: 'Ver + dados sensiveis (sem excluir)' },
      { label: 'Relatorios', access: 'full', detail: 'Completo com exportacao' },
      { label: 'Comunicacao', access: 'full', detail: 'Ver e enviar mensagens' },
      { label: 'Configuracoes', access: 'limited', detail: 'Editar (sem gerenciar equipe)' },
      { label: 'Equipe', access: 'view', detail: 'Somente visualizacao' },
      { label: 'Solicit. de Treino', access: 'none' },
    ],
  },
  {
    role: 'receptionist',
    label: 'Recepcao / Atendente',
    icon: Phone,
    color: 'text-rose-600 dark:text-rose-400',
    bgColor: 'bg-rose-50 dark:bg-rose-950/30',
    borderColor: 'border-rose-200 dark:border-rose-800',
    permissions: [
      { label: 'Dashboard', access: 'view', detail: 'Metricas operacionais' },
      { label: 'Calendario de Aulas', access: 'limited', detail: 'Criar e editar (sem excluir)' },
      { label: 'Alunos', access: 'limited', detail: 'Criar e editar (sem excluir)' },
      { label: 'Presenca', access: 'limited', detail: 'Registrar presencas' },
      { label: 'Planos', access: 'none' },
      { label: 'Modalidades', access: 'none' },
      { label: 'Turmas', access: 'none' },
      { label: 'Aniversariantes', access: 'limited', detail: 'Ver e felicitar' },
      { label: 'Contratos', access: 'none' },
      { label: 'Pagamentos', access: 'limited', detail: 'Dar baixa / receber' },
      { label: 'Despesas', access: 'none' },
      { label: 'Relatorios', access: 'none' },
      { label: 'Comunicacao', access: 'limited', detail: 'Ver e enviar mensagens' },
      { label: 'Configuracoes', access: 'view', detail: 'Somente leitura' },
      { label: 'Equipe', access: 'view', detail: 'Somente visualizacao' },
      { label: 'Solicit. de Treino', access: 'limited', detail: 'Ver e atualizar' },
    ],
  },
  {
    role: 'instructor',
    label: 'Professor / Instrutor',
    icon: BookOpen,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    permissions: [
      { label: 'Dashboard', access: 'view', detail: 'Metricas operacionais' },
      { label: 'Calendario de Aulas', access: 'view', detail: 'Somente leitura' },
      { label: 'Alunos', access: 'view', detail: 'Somente leitura' },
      { label: 'Presenca', access: 'limited', detail: 'Criar e registrar (sem excluir)' },
      { label: 'Planos', access: 'none' },
      { label: 'Modalidades', access: 'none' },
      { label: 'Turmas', access: 'view', detail: 'Somente leitura' },
      { label: 'Aniversariantes', access: 'view', detail: 'Somente leitura' },
      { label: 'Contratos', access: 'none' },
      { label: 'Pagamentos', access: 'none' },
      { label: 'Despesas', access: 'none' },
      { label: 'Relatorios', access: 'none' },
      { label: 'Comunicacao', access: 'view', detail: 'Somente leitura' },
      { label: 'Configuracoes', access: 'view', detail: 'Somente leitura' },
      { label: 'Equipe', access: 'view', detail: 'Somente visualizacao' },
      { label: 'Solicit. de Treino', access: 'full', detail: 'Ver, editar e aprovar' },
    ],
  },
  {
    role: 'finance',
    label: 'Financeiro',
    icon: Calculator,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-blue-200 dark:border-blue-800',
    permissions: [
      { label: 'Dashboard', access: 'view', detail: 'KPIs financeiros' },
      { label: 'Calendario de Aulas', access: 'none' },
      { label: 'Alunos', access: 'none' },
      { label: 'Presenca', access: 'none' },
      { label: 'Planos', access: 'none' },
      { label: 'Modalidades', access: 'none' },
      { label: 'Turmas', access: 'none' },
      { label: 'Aniversariantes', access: 'none' },
      { label: 'Contratos', access: 'none' },
      { label: 'Pagamentos', access: 'full', detail: 'Receber, reabrir e exportar' },
      { label: 'Despesas', access: 'full', detail: 'Ver + dados sensiveis + exportar' },
      { label: 'Relatorios', access: 'full', detail: 'Completo com exportacao' },
      { label: 'Comunicacao', access: 'view', detail: 'Somente leitura' },
      { label: 'Configuracoes', access: 'view', detail: 'Somente leitura' },
      { label: 'Equipe', access: 'view', detail: 'Somente visualizacao' },
      { label: 'Solicit. de Treino', access: 'none' },
    ],
  },
];

const ARENA_ROLES: RoleCard[] = [
  {
    role: 'owner',
    label: 'CEO / Dono',
    icon: Crown,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    borderColor: 'border-amber-200 dark:border-amber-800',
    permissions: [
      { label: 'Dashboard', access: 'full', detail: 'Todos os KPIs e graficos' },
      { label: 'Agenda de Quadras', access: 'full', detail: 'Criar, editar e excluir' },
      { label: 'Reservantes', access: 'full', detail: 'Criar, editar e excluir' },
      { label: 'Produtos / Estoque', access: 'full', detail: 'CRUD + gestao de estoque' },
      { label: 'Vendas', access: 'full', detail: 'CRUD + exportar' },
      { label: 'Comandas', access: 'full', detail: 'Criar, editar, fechar e excluir' },
      { label: 'Quadras', access: 'full', detail: 'Criar, editar e excluir' },
      { label: 'Pagamentos', access: 'full', detail: 'CRUD + exportar' },
      { label: 'Despesas', access: 'full', detail: 'CRUD + dados sensiveis' },
      { label: 'Relatorios', access: 'full', detail: 'Completo com exportacao' },
      { label: 'Comunicacao', access: 'full', detail: 'Ver e enviar mensagens' },
      { label: 'Configuracoes', access: 'full', detail: 'Gerenciar tudo' },
      { label: 'Equipe', access: 'full', detail: 'Adicionar, ativar e excluir' },
    ],
  },
  {
    role: 'manager',
    label: 'Gerente',
    icon: ShieldCheck,
    color: 'text-violet-600 dark:text-violet-400',
    bgColor: 'bg-violet-50 dark:bg-violet-950/30',
    borderColor: 'border-violet-200 dark:border-violet-800',
    permissions: [
      { label: 'Dashboard', access: 'full', detail: 'Todos os KPIs e graficos' },
      { label: 'Agenda de Quadras', access: 'full', detail: 'Criar, editar e excluir' },
      { label: 'Reservantes', access: 'full', detail: 'Criar, editar e excluir' },
      { label: 'Produtos / Estoque', access: 'full', detail: 'CRUD + gestao de estoque' },
      { label: 'Vendas', access: 'full', detail: 'CRUD + exportar' },
      { label: 'Comandas', access: 'limited', detail: 'Criar, editar e fechar' },
      { label: 'Quadras', access: 'full', detail: 'Criar, editar e excluir' },
      { label: 'Pagamentos', access: 'limited', detail: 'Receber e reabrir (sem excluir)' },
      { label: 'Despesas', access: 'limited', detail: 'Ver + dados sensiveis (sem excluir)' },
      { label: 'Relatorios', access: 'full', detail: 'Completo com exportacao' },
      { label: 'Comunicacao', access: 'full', detail: 'Ver e enviar mensagens' },
      { label: 'Configuracoes', access: 'limited', detail: 'Editar (sem gerenciar equipe)' },
      { label: 'Equipe', access: 'view', detail: 'Somente visualizacao' },
    ],
  },
  {
    role: 'receptionist',
    label: 'Recepcao / Atendente',
    icon: Phone,
    color: 'text-rose-600 dark:text-rose-400',
    bgColor: 'bg-rose-50 dark:bg-rose-950/30',
    borderColor: 'border-rose-200 dark:border-rose-800',
    permissions: [
      { label: 'Dashboard', access: 'view', detail: 'Metricas operacionais' },
      { label: 'Agenda de Quadras', access: 'limited', detail: 'Criar e editar (sem excluir)' },
      { label: 'Reservantes', access: 'limited', detail: 'Criar e editar (sem excluir)' },
      { label: 'Produtos / Estoque', access: 'view', detail: 'Somente leitura' },
      { label: 'Vendas', access: 'limited', detail: 'Criar apenas' },
      { label: 'Comandas', access: 'limited', detail: 'Criar, editar e fechar' },
      { label: 'Quadras', access: 'view', detail: 'Somente leitura' },
      { label: 'Pagamentos', access: 'limited', detail: 'Dar baixa em pagamentos' },
      { label: 'Despesas', access: 'none' },
      { label: 'Relatorios', access: 'view', detail: 'Metricas operacionais apenas' },
      { label: 'Comunicacao', access: 'limited', detail: 'Ver e enviar mensagens' },
      { label: 'Configuracoes', access: 'view', detail: 'Somente leitura' },
      { label: 'Equipe', access: 'view', detail: 'Somente visualizacao' },
    ],
  },
  {
    role: 'finance',
    label: 'Financeiro',
    icon: Calculator,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-blue-200 dark:border-blue-800',
    permissions: [
      { label: 'Dashboard', access: 'view', detail: 'KPIs financeiros' },
      { label: 'Agenda de Quadras', access: 'none' },
      { label: 'Reservantes', access: 'view', detail: 'Somente leitura (referencia)' },
      { label: 'Produtos / Estoque', access: 'none' },
      { label: 'Vendas', access: 'view', detail: 'Ver e exportar' },
      { label: 'Comandas', access: 'view', detail: 'Somente leitura' },
      { label: 'Quadras', access: 'none' },
      { label: 'Pagamentos', access: 'full', detail: 'Receber, reabrir e exportar' },
      { label: 'Despesas', access: 'full', detail: 'Ver + dados sensiveis + exportar' },
      { label: 'Relatorios', access: 'full', detail: 'Completo com exportacao' },
      { label: 'Comunicacao', access: 'view', detail: 'Somente leitura' },
      { label: 'Configuracoes', access: 'view', detail: 'Somente leitura' },
      { label: 'Equipe', access: 'view', detail: 'Somente visualizacao' },
    ],
  },
];

function AccessLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] font-semibold uppercase tracking-wide">
      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="h-3 w-3" /> Completo
      </span>
      <span
        className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 cursor-help"
        title="Passe o mouse sobre o badge para ver o detalhe do acesso parcial"
      >
        <Pencil className="h-3 w-3" />
        <span>Parcial</span>
        <span className="text-amber-400/60 dark:text-amber-600/60 normal-case font-normal tracking-normal hidden sm:inline">
          (passe o mouse)
        </span>
      </span>
      <span className="flex items-center gap-1 text-sky-600 dark:text-sky-400">
        <Eye className="h-3 w-3" /> Ver
      </span>
      <span className="flex items-center gap-1 text-muted-foreground/50">
        <XCircle className="h-3 w-3" /> Sem acesso
      </span>
    </div>
  );
}


function RoleAccordionCard({ card, defaultOpen = false }: { card: RoleCard; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const Icon = card.icon;

  return (
    <div className={cn('rounded-xl border-2 overflow-hidden transition-all duration-200', card.borderColor, card.bgColor)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'w-full flex items-center gap-3 px-4 py-3 text-left hover:opacity-90 transition-opacity',
        )}
      >
        <div className={cn('flex items-center justify-center h-8 w-8 rounded-lg', card.bgColor)}>
          <Icon className={cn('h-4 w-4', card.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm font-bold', card.color)}>{card.label}</p>
          <p className="text-[10px] text-muted-foreground">
            {card.permissions.filter(p => p.access !== 'none').length} modulo(s) com acesso
          </p>
        </div>
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform duration-200', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-1.5 animate-fade-in">
          {card.permissions.map((perm) => (
            <div
              key={perm.label}
              className={cn(
                'flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border',
                perm.access === 'none'
                  ? 'bg-muted/10 border-border/30 opacity-40'
                  : 'bg-background/60 border-border/50'
              )}
            >
              <span className="text-xs font-medium text-foreground truncate">{perm.label}</span>
              <AccessBadge access={perm.access} detail={perm.detail} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import type { OrganizationRole } from '@/lib/rolePermissions';

interface RolePermissionsPanelProps {
  businessType: 'sport_school' | 'arena';
  organizationRole?: OrganizationRole;
}

export function RolePermissionsPanel({ businessType, organizationRole }: RolePermissionsPanelProps) {
  const isOwner = !organizationRole || organizationRole === 'owner';
  const [tab, setTab] = useState<BusinessTab>(businessType);

  // Para nao-CEO: mostra apenas o card do proprio cargo na modalidade ativa
  if (!isOwner) {
    const roles = businessType === 'sport_school' ? SCHOOL_ROLES : ARENA_ROLES;
    const myCard = roles.find(r => r.role === organizationRole);

    if (!myCard) return null;

    const modalityLabel = businessType === 'arena' ? 'Arena / CT Quadra' : 'Escola Esportiva';
    const modalityEmoji = businessType === 'arena' ? '🏟️' : '🏐';

    return (
      <div className="space-y-4">
        {/* Cabecalho contextual */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Suas permissoes em</span>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 rounded-full px-2 py-0.5">
            {modalityEmoji} {modalityLabel}
          </span>
        </div>

        {/* Legenda */}
        <AccessLegend />

        {/* Card do proprio cargo — sempre expandido */}
        <RoleAccordionCard card={myCard} defaultOpen={true} />

        {/* Nota informativa */}
        <div className="flex items-start gap-2 rounded-lg border border-border/40 bg-muted/20 px-3 py-2.5">
          <Key className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Estas sao as permissoes atribuidas ao seu cargo. Acesso restrito ao necessario para o exercicio da sua funcao.
            Qualquer acesso fora deste escopo nao esta disponivel no sistema.
          </p>
        </div>
      </div>
    );
  }

  // CEO: visao completa com tabs e todos os cargos
  const roles = tab === 'sport_school' ? SCHOOL_ROLES : ARENA_ROLES;

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex rounded-xl border border-border/50 bg-muted/30 p-1 gap-1">
        <button
          type="button"
          onClick={() => setTab('sport_school')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200',
            tab === 'sport_school'
              ? 'bg-background shadow-sm text-foreground border border-border/50'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <span>🏐</span>
          <span className="hidden sm:inline">Escola Esportiva</span>
          <span className="sm:hidden">Escola</span>
        </button>
        <button
          type="button"
          onClick={() => setTab('arena')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200',
            tab === 'arena'
              ? 'bg-background shadow-sm text-foreground border border-border/50'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <span>🏟️</span>
          <span className="hidden sm:inline">Arena / CT Quadra</span>
          <span className="sm:hidden">Arena</span>
        </button>
      </div>

      {/* Legenda */}
      <div className="px-1">
        <AccessLegend />
      </div>

      {/* Cards por cargo — CEO ve todos */}
      <div className="space-y-2">
        {roles.map((card, index) => (
          <RoleAccordionCard
            key={card.role}
            card={card}
            defaultOpen={index === 0}
          />
        ))}
      </div>

      <p className="text-[10px] text-muted-foreground px-1 leading-relaxed">
        Estas permissoes sao aplicadas automaticamente no sistema conforme o cargo atribuido.
        Nenhum funcionario pode elevar seus proprios privilegios.
      </p>
    </div>
  );
}

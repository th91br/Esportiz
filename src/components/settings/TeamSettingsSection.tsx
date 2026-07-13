import { useEffect, useState, type ElementType } from 'react';
import { SettingsCardHeader } from '@/components/layout/SettingsCardHeader';
import { SettingsGroupTitle } from '@/components/layout/SettingsGroupTitle';
import { SettingsSection } from '@/components/layout/SettingsSection';
import { IconAlertDialogTitle } from '@/components/layout/IconAlertDialogTitle';
import { RolePermissionsPanel } from '@/components/RolePermissionsPanel';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
} from '@/components/ui/alert-dialog';
import {
  AlertCircle,
  BookOpen,
  Calculator,
  Crown,
  Eye,
  EyeOff,
  Info,
  Loader2,
  Phone,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
  UsersRound,
  UserX,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { useOrganizationTeamMembers, type OrganizationTeamMember } from '@/hooks/queries/useOrganizationTeamMembers';
import type { BusinessType } from '@/hooks/queries/useProfile';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { supabase } from '@/integrations/supabase/client';
import { getErrorMessage } from '@/lib/errorUtils';
import { getFunctionErrorMessage } from '@/lib/functionErrorUtils';
import type { OrganizationRole } from '@/lib/rolePermissions';
import { cn } from '@/lib/utils';

const TEAM_ROLE_LABELS: Record<OrganizationRole, { label: string; description: string; color: string; bg: string; border: string }> = {
  owner: {
    label: 'CEO / Dono',
    description: 'Acesso irrestrito: configuracoes, equipe, financeiro e todas as areas sensiveis do sistema.',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-200 dark:border-amber-800',
  },
  manager: {
    label: 'Gerente',
    description: 'Operacao ampla: agenda, clientes, pagamentos e relatorios. Sem acesso a equipe nem configuracoes avancadas.',
    color: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-50 dark:bg-violet-950/30',
    border: 'border-violet-200 dark:border-violet-800',
  },
  receptionist: {
    label: 'Recepcao / Atendente',
    description: 'Atendimento ao cliente: agenda, cadastros, vendas, comandas e baixas de pagamento do dia a dia.',
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-50 dark:bg-rose-950/30',
    border: 'border-rose-200 dark:border-rose-800',
  },
  instructor: {
    label: 'Professor / Instrutor',
    description: 'Foco pedagogico: aulas, presenças, turmas e aprovacao de solicitacoes de treino dos alunos.',
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    border: 'border-emerald-200 dark:border-emerald-800',
  },
  finance: {
    label: 'Financeiro',
    description: 'Gestao financeira: pagamentos, relatorios e caixa. Acesso a dados sensiveis de faturamento.',
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-200 dark:border-blue-800',
  },
};

function getRoleIcon(role: OrganizationRole): ElementType {
  switch (role) {
    case 'owner': return Crown;
    case 'manager': return ShieldCheck;
    case 'receptionist': return Phone;
    case 'instructor': return BookOpen;
    case 'finance': return Calculator;
    default: return Users;
  }
}

type InvitableOrganizationRole = Exclude<OrganizationRole, 'owner'>;

const SCHOOL_TEAM_INVITE_OPTIONS: Array<{ role: InvitableOrganizationRole; label: string; description: string }> = [
  { role: 'instructor', label: TEAM_ROLE_LABELS.instructor.label, description: 'Aulas, presencas e solicitacoes de treino' },
  { role: 'receptionist', label: TEAM_ROLE_LABELS.receptionist.label, description: 'Atendimento, matriculas, calendario e recebimentos' },
  { role: 'manager', label: TEAM_ROLE_LABELS.manager.label, description: 'Operacao ampla exceto equipe' },
  { role: 'finance', label: TEAM_ROLE_LABELS.finance.label, description: 'Pagamentos e relatorios' },
];

const ARENA_TEAM_INVITE_OPTIONS: Array<{ role: InvitableOrganizationRole; label: string; description: string }> = [
  { role: 'receptionist', label: TEAM_ROLE_LABELS.receptionist.label, description: 'Agenda, vendas e comandas do dia a dia' },
  { role: 'manager', label: TEAM_ROLE_LABELS.manager.label, description: 'Operacao ampla exceto equipe' },
  { role: 'finance', label: TEAM_ROLE_LABELS.finance.label, description: 'Pagamentos, despesas e relatorios' },
];

function getShortUserId(userId: string) {
  return `${userId.slice(0, 8)}...${userId.slice(-4)}`;
}

type TeamSettingsSectionProps = {
  businessType: BusinessType;
};

export function TeamSettingsSection({ businessType }: TeamSettingsSectionProps) {
  const { user } = useAuth();
  const { organizationId } = useBusinessContext();
  const rolePermissions = useRolePermissions();
  const canViewTeam = rolePermissions.can('team', 'view');
  const canManageTeam = rolePermissions.can('team', 'manage_team');
  const canViewAllTeamMembers = rolePermissions.organizationRole === 'owner' || canManageTeam;
  const {
    teamMembers,
    loadingTeamMembers,
    isErrorTeamMembers,
    refetchTeamMembers,
  } = useOrganizationTeamMembers({
    organizationId,
    currentUserId: user?.id,
    enabled: canViewTeam,
    viewAllMembers: canViewAllTeamMembers,
  });
  const [teamInviteEmail, setTeamInviteEmail] = useState('');
  const [teamInviteRole, setTeamInviteRole] = useState<InvitableOrganizationRole>('receptionist');
  const [teamInvitePassword, setTeamInvitePassword] = useState('');
  const [showInvitePassword, setShowInvitePassword] = useState(false);
  const [isInvitingTeamMember, setIsInvitingTeamMember] = useState(false);
  const [memberToConfirmDelete, setMemberToConfirmDelete] = useState<OrganizationTeamMember | null>(null);
  const [isDeletingMember, setIsDeletingMember] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState<string | null>(null);

  const selectedBusinessType = businessType;
  const teamInviteOptions = selectedBusinessType === 'sport_school'
    ? SCHOOL_TEAM_INVITE_OPTIONS
    : ARENA_TEAM_INVITE_OPTIONS;
  const selectedTeamInviteOption = teamInviteOptions.find((option) => option.role === teamInviteRole);
  const selectedTeamInviteRoleStyle = selectedTeamInviteOption ? TEAM_ROLE_LABELS[selectedTeamInviteOption.role] : null;
  const SelectedTeamInviteRoleIcon = selectedTeamInviteOption ? getRoleIcon(selectedTeamInviteOption.role) : null;

  useEffect(() => {
    setTeamInviteRole(selectedBusinessType === 'sport_school' ? 'instructor' : 'receptionist');
  }, [selectedBusinessType]);

  const handleInviteTeamMember = async () => {
    const email = teamInviteEmail.trim().toLowerCase();
    const password = teamInvitePassword.trim();

    if (!organizationId) {
      toast.error('Organizacao nao identificada. Atualize a pagina e tente novamente.');
      return;
    }

    if (!email || !email.includes('@')) {
      toast.error('Informe um e-mail valido para o novo membro.');
      return;
    }

    if (!password || password.length < 6) {
      toast.error('Informe uma senha provisoria de pelo menos 6 caracteres.');
      return;
    }

    setIsInvitingTeamMember(true);
    const toastId = toast.loading('Criando conta do novo membro...');

    try {
      const { error } = await supabase.functions.invoke('team-invite', {
        body: {
          action: 'create',
          organization_id: organizationId,
          email,
          role: teamInviteRole,
          password,
        },
      });

      if (error) throw error;

      setTeamInviteEmail('');
      setTeamInvitePassword('');
      setTeamInviteRole(selectedBusinessType === 'sport_school' ? 'instructor' : 'receptionist');
      await refetchTeamMembers();
      toast.success('Conta criada e membro registrado na equipe com sucesso!', { id: toastId });
    } catch (error) {
      const message = await getFunctionErrorMessage(error);
      toast.error('Nao foi possivel criar a conta: ' + message, { id: toastId });
    } finally {
      setIsInvitingTeamMember(false);
    }
  };

  const handleToggleMemberStatus = async (member: OrganizationTeamMember) => {
    if (member.userId === user?.id) {
      toast.error('Voce nao pode alterar o seu proprio status.');
      return;
    }

    setIsTogglingStatus(member.id);
    const newActiveState = !member.active;
    const toastId = toast.loading(newActiveState ? 'Ativando membro...' : 'Inativando membro...');

    try {
      const { error } = await supabase
        .from('organization_members')
        .update({ active: newActiveState, updated_at: new Date().toISOString() })
        .eq('id', member.id);

      if (error) throw error;

      await refetchTeamMembers();
      toast.success(newActiveState ? 'Membro ativado com sucesso!' : 'Membro inativado com sucesso.', { id: toastId });
    } catch (error) {
      toast.error('Erro ao alterar status do membro: ' + getErrorMessage(error), { id: toastId });
    } finally {
      setIsTogglingStatus(null);
    }
  };

  const handleDeleteMember = async () => {
    if (!memberToConfirmDelete || !organizationId) return;

    setIsDeletingMember(true);
    const toastId = toast.loading('Excluindo membro definitivamente...');

    try {
      const { error } = await supabase.functions.invoke('team-invite', {
        body: {
          action: 'delete',
          organization_id: organizationId,
          user_id: memberToConfirmDelete.userId,
        },
      });

      if (error) throw error;

      await refetchTeamMembers();
      toast.success('Membro excluido permanentemente da equipe.', { id: toastId });
      setMemberToConfirmDelete(null);
    } catch (error) {
      const message = await getFunctionErrorMessage(error);
      toast.error('Erro ao excluir membro: ' + message, { id: toastId });
    } finally {
      setIsDeletingMember(false);
    }
  };

  return (
    <>
        {canViewTeam && (
          <SettingsSection
            title="Equipe e Permissoes"
            description={rolePermissions.organizationRole === 'owner'
              ? 'Visao segura dos membros vinculados a sua organizacao.'
              : 'Visao segura do seu vinculo e das permissoes do seu cargo.'}
          >
            <Card className="border-primary/10">
              <SettingsCardHeader
                className="pb-3"
                icon={UsersRound}
                title="Equipe"
                description={rolePermissions.can('team', 'manage_team')
                  ? 'Adicione novos membros com e-mail e senha inicial, ou gerencie os acessos ativos da sua equipe.'
                  : 'Consulte o seu cargo ativo nesta organizacao e as permissoes vinculadas a ele.'}
              />
              <CardContent className="space-y-3">
                {organizationId && rolePermissions.can('team', 'manage_team') && (
                  <div className="rounded-xl border-2 border-primary/10 bg-muted/10 p-4 animate-fade-in space-y-4">
                    {/* Cabecalho do formulario com indicador de modalidade */}
                    <div className="flex items-center justify-between">
                      <SettingsGroupTitle>
                        Adicionar novo membro
                      </SettingsGroupTitle>
                      <span className={cn(
                        'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border',
                        selectedBusinessType === 'arena'
                          ? 'bg-primary/10 text-primary border-primary/20'
                          : 'bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800 dark:text-emerald-400'
                      )}>
                        {selectedBusinessType === 'arena' ? '🏟️ Arena' : '🏐 Escola Esportiva'}
                      </span>
                    </div>

                    {/* Linha 1 — E-mail + Senha */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="team-invite-email" className="text-xs font-semibold">
                          E-mail do novo membro
                        </Label>
                        <Input
                          id="team-invite-email"
                          type="email"
                          placeholder="nome@exemplo.com"
                          value={teamInviteEmail}
                          onChange={(event) => setTeamInviteEmail(event.target.value)}
                          disabled={isInvitingTeamMember}
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="team-invite-password" className="text-xs font-semibold">
                          Senha Provisória
                        </Label>
                        <div className="relative">
                          <Input
                            id="team-invite-password"
                            type={showInvitePassword ? 'text' : 'password'}
                            placeholder="Mínimo 6 caracteres"
                            value={teamInvitePassword}
                            onChange={(event) => setTeamInvitePassword(event.target.value)}
                            disabled={isInvitingTeamMember}
                            className="pr-10 h-9"
                          />
                          <button
                            type="button"
                            onClick={() => setShowInvitePassword(!showInvitePassword)}
                            aria-label={showInvitePassword ? 'Ocultar senha provisoria' : 'Mostrar senha provisoria'}
                            aria-pressed={showInvitePassword}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {showInvitePassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Linha 2 — Cargo + Botao */}
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-start">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Cargo</Label>
                        <Select
                          value={teamInviteRole}
                          onValueChange={(value) => setTeamInviteRole(value as InvitableOrganizationRole)}
                          disabled={isInvitingTeamMember}
                        >
                          <SelectTrigger className="h-10">
                            {selectedTeamInviteOption && selectedTeamInviteRoleStyle && SelectedTeamInviteRoleIcon ? (
                              <div className="flex min-w-0 items-center gap-2">
                                <SelectedTeamInviteRoleIcon className={cn('h-3.5 w-3.5 shrink-0', selectedTeamInviteRoleStyle.color)} />
                                <span className="truncate text-sm font-medium">{selectedTeamInviteOption.label}</span>
                              </div>
                            ) : (
                              <SelectValue placeholder="Selecione o cargo" />
                            )}
                          </SelectTrigger>
                          <SelectContent>
                            {teamInviteOptions.map((option) => {
                              const RoleIc = getRoleIcon(option.role);
                              const roleStyle = TEAM_ROLE_LABELS[option.role];
                              return (
                                <SelectItem key={option.role} value={option.role} textValue={option.label}>
                                  <div className="flex items-center gap-2 py-0.5">
                                    <RoleIc className={cn('h-3.5 w-3.5 shrink-0', roleStyle.color)} />
                                    <div>
                                      <p className="text-sm font-medium">{option.label}</p>
                                      <p className="text-[10px] text-muted-foreground">{option.description}</p>
                                    </div>
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        {/* Descricao do cargo selecionado */}
                        {selectedTeamInviteOption && selectedTeamInviteRoleStyle && SelectedTeamInviteRoleIcon ? (
                            <div className={cn(
                              'flex items-start gap-2 rounded-lg px-2.5 py-1.5 text-[11px] border mt-1',
                              selectedTeamInviteRoleStyle.bg, selectedTeamInviteRoleStyle.border
                            )}>
                              <SelectedTeamInviteRoleIcon className={cn('h-3.5 w-3.5 mt-0.5 shrink-0', selectedTeamInviteRoleStyle.color)} />
                              <span className={cn('font-medium leading-snug', selectedTeamInviteRoleStyle.color)}>
                                {selectedTeamInviteOption.description}
                              </span>
                            </div>
                        ) : null}
                      </div>

                      <div className="sm:pt-6">
                        <Button
                          type="button"
                          className="w-full sm:w-auto btn-primary-gradient h-9 px-5 whitespace-nowrap"
                          onClick={handleInviteTeamMember}
                          disabled={isInvitingTeamMember || !teamInviteEmail.trim() || !teamInvitePassword.trim()}
                        >
                          {isInvitingTeamMember ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Criando...
                            </>
                          ) : (
                            'Adicionar Membro'
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Nota de seguranca */}
                    <div className="flex items-start gap-2 rounded-lg bg-background/60 border border-border/50 px-3 py-2">
                      <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        A conta é criada diretamente no sistema e vinculada ao cargo desta organização.
                        O funcionário poderá entrar imediatamente com estes dados.
                      </p>
                    </div>
                  </div>
                )}


                {!organizationId ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    Organizacao ainda nao identificada para este perfil. As permissoes seguem em modo de compatibilidade.
                  </div>
                ) : loadingTeamMembers ? (
                  <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Carregando membros da equipe...
                  </div>
                ) : isErrorTeamMembers ? (
                  <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
                    Nao foi possivel carregar a equipe agora. Tente novamente em instantes.
                  </div>
                ) : teamMembers.length === 0 ? (
                  <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                    Nenhum membro ativo encontrado para esta organizacao.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {teamMembers
                      .filter((member) => rolePermissions.organizationRole === 'owner' || member.userId === user?.id)
                      .sort((a, b) => {
                        const roleOrder: Record<string, number> = { owner: 0, manager: 1, finance: 2, receptionist: 3, instructor: 4 };
                        return (roleOrder[a.role] ?? 5) - (roleOrder[b.role] ?? 5);
                      })
                      .map((member) => {
                      const roleInfo = TEAM_ROLE_LABELS[member.role];
                      const RoleIcon = getRoleIcon(member.role);
                      const memberLabel = member.invitedEmail
                        || (member.userId === user?.id && user?.email ? user.email : `Funcionário ${getShortUserId(member.userId)}`);
                      const isCurrentUser = member.userId === user?.id;
                      const isOwnerRole = member.role === 'owner';
                      const canManageThisMember = !isCurrentUser && !isOwnerRole && rolePermissions.can('team', 'manage_team');

                      return (
                        <div
                          key={member.id}
                          className={cn(
                            'flex flex-col gap-3 rounded-xl border-2 p-3 sm:flex-row sm:items-center sm:justify-between transition-all duration-200',
                            roleInfo.border,
                            !member.active && 'opacity-60',
                            isCurrentUser && 'ring-1 ring-primary/30',
                          )}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={cn('flex items-center justify-center h-9 w-9 rounded-lg shrink-0', roleInfo.bg)}>
                              <RoleIcon className={cn('h-4 w-4', roleInfo.color)} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <p className="truncate text-sm font-semibold text-foreground">{memberLabel}</p>
                                {isCurrentUser && (
                                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                                    Você
                                  </span>
                                )}
                                {!member.active && (
                                  <span className="rounded-full bg-amber-500/10 border border-amber-300 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-600">
                                    Inativo
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-muted-foreground leading-snug mt-0.5 line-clamp-1">{roleInfo.description}</p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            <div className={cn(
                              'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold',
                              roleInfo.color, roleInfo.bg, roleInfo.border
                            )}>
                              <RoleIcon className="h-3 w-3" />
                              {roleInfo.label}
                            </div>

                            {canManageThisMember && (
                              <div className="flex items-center gap-1.5 border-l pl-2 border-border">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className={cn(
                                    "h-7 px-2.5 text-[11px] font-medium transition-colors",
                                    member.active
                                      ? "text-amber-600 hover:text-amber-700 hover:bg-amber-50 border-amber-200"
                                      : "text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                                  )}
                                  onClick={() => handleToggleMemberStatus(member)}
                                  disabled={isTogglingStatus !== null}
                                >
                                  {isTogglingStatus === member.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : member.active ? (
                                    <>
                                      <UserX className="h-3.5 w-3.5 mr-1" />
                                      Inativar
                                    </>
                                  ) : (
                                    <>
                                      <UserCheck className="h-3.5 w-3.5 mr-1" />
                                      Ativar
                                    </>
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors"
                                  onClick={() => setMemberToConfirmDelete(member)}
                                  disabled={isTogglingStatus !== null || isDeletingMember}
                                  aria-label="Excluir funcionário permanentemente"
                                  title="Excluir funcionário permanentemente"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            )}

                            {isOwnerRole && !isCurrentUser && (
                              <div className="flex items-center gap-1 text-[10px] text-muted-foreground border-l pl-2 border-border">
                                <Crown className="h-3 w-3 text-amber-500" />
                                <span>Protegido</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </SettingsSection>
        )}

        {/* Painel de Permissoes por Cargo */}
        {canViewTeam && (() => {
          const isOwnerRole = rolePermissions.organizationRole === 'owner';
          return (
            <SettingsSection
              title={isOwnerRole ? 'Permissoes por Cargo' : 'Minhas Permissoes'}
              description={isOwnerRole
                ? 'O que cada cargo pode acessar e executar em cada modalidade do sistema.'
                : 'O que o seu cargo permite acessar e executar no sistema.'}
            >
              <Card className="border-primary/10">
                <SettingsCardHeader
                  className="pb-3"
                  icon={ShieldCheck}
                  title={isOwnerRole ? 'Matriz de Acesso' : 'Minhas Permissoes'}
                  description={isOwnerRole
                    ? 'Cada cargo tem permissoes especificas para Escola Esportiva e Arena. Clique em um cargo para expandir.'
                    : 'Estas sao as acoes e modulos disponiveis para o seu cargo na modalidade ativa.'}
                />
                <CardContent>
                  <RolePermissionsPanel
                    businessType={selectedBusinessType}
                    organizationRole={rolePermissions.organizationRole}
                  />
                </CardContent>
              </Card>
            </SettingsSection>
          );
        })()}

        {/* Delete Member Confirmation Modal */}
        <AlertDialog
          open={memberToConfirmDelete !== null}
          onOpenChange={(open) => { if (!open) setMemberToConfirmDelete(null); }}
        >
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <IconAlertDialogTitle icon={AlertCircle}>
                Excluir Membro de Equipe?
              </IconAlertDialogTitle>
              <AlertDialogDescription className="space-y-4 pt-2">
                <p className="text-sm leading-relaxed text-foreground">
                  Você tem certeza de que deseja excluir permanentemente o funcionário{' '}
                  <strong className="font-semibold text-primary">
                    {memberToConfirmDelete?.invitedEmail || `Usuário ${memberToConfirmDelete ? getShortUserId(memberToConfirmDelete.userId) : ''}`}
                  </strong>?
                </p>
                <div className="space-y-2 text-muted-foreground text-xs leading-relaxed">
                  <p className="text-destructive font-semibold">
                    ⚠️ Esta ação é irreversível e apagará definitivamente o login deste funcionário do sistema.
                  </p>
                  <p>
                    • Todas as configurações de perfil dele serão removidas imediatamente.
                  </p>
                  <p>
                    • Se você preferir apenas bloquear o acesso dele mantendo os registros históricos nos relatórios de auditoria, use a opção de <strong className="text-foreground">Inativar</strong>.
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-4">
              <AlertDialogCancel disabled={isDeletingMember} onClick={() => setMemberToConfirmDelete(null)}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={isDeletingMember}
                onClick={handleDeleteMember}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeletingMember ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  'Sim, excluir definitivamente'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </>
  );
}
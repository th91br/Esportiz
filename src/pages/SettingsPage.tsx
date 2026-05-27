import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/Header';
import { useProfile } from '@/hooks/queries/useProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
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
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { UploadCloud, Save, Building, Trash2, Calendar, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, Tag, GraduationCap, CheckCircle, Copy, ExternalLink, UsersRound, ShieldCheck, Eye, EyeOff, UserCheck, UserX, Crown, BookOpen, Calculator, Phone, Info, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { ModalityManager } from '@/components/ModalityManager';
import { RolePermissionsPanel } from '@/components/RolePermissionsPanel';
import { supabase, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/integrations/supabase/client';
import { type BusinessType } from '@/hooks/queries/useProfile';
import { cn } from '@/lib/utils';
import { getErrorMessage } from '@/lib/errorUtils';
import { getDefaultCommunicationTemplate } from '@/lib/communicationContracts';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { useOrganizationTeamMembers } from '@/hooks/queries/useOrganizationTeamMembers';
import type { OrganizationRole } from '@/lib/rolePermissions';

const BUSINESS_OPTIONS: { type: BusinessType; title: string; description: string; emoji: string }[] = [
  { type: 'sport_school', title: 'Escola Esportiva', description: 'Esportiz Sport — Futevôlei, Vôlei, Futebol, Artes Marciais...', emoji: '🏐' },
  { type: 'arena', title: 'Arena / CT de Quadras', description: 'Esportiz Arena — Locação de quadras, Day Use, Eventos esportivos...', emoji: '🏟️' },
];

function getBusinessTypeLabel(type: BusinessType | null | undefined) {
  return type === 'arena' ? 'Arena / CT de Quadras' : 'Escola Esportiva';
}

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
    description: 'Gestao financeira: pagamentos, despesas, relatorios e caixa. Acesso a dados sensiveis de faturamento.',
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-200 dark:border-blue-800',
  },
};

function getRoleIcon(role: OrganizationRole): React.ElementType {
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
  { role: 'manager', label: TEAM_ROLE_LABELS.manager.label, description: 'Operacao ampla exceto equipe' },
  { role: 'finance', label: TEAM_ROLE_LABELS.finance.label, description: 'Pagamentos, despesas e relatorios' },
];

const ARENA_TEAM_INVITE_OPTIONS: Array<{ role: InvitableOrganizationRole; label: string; description: string }> = [
  { role: 'receptionist', label: TEAM_ROLE_LABELS.receptionist.label, description: 'Agenda, vendas e comandas do dia a dia' },
  { role: 'manager', label: TEAM_ROLE_LABELS.manager.label, description: 'Operacao ampla exceto equipe' },
  { role: 'finance', label: TEAM_ROLE_LABELS.finance.label, description: 'Pagamentos, despesas e relatorios' },
];

function getShortUserId(userId: string) {
  return `${userId.slice(0, 8)}...${userId.slice(-4)}`;
}

const GOOGLE_CLIENT_ID = '101916210739-8dd7avpijkt4oc5t053fg7tqtahfakdr.apps.googleusercontent.com';
const GOOGLE_REDIRECT_URI = window.location.origin + '/configuracoes';
const GOOGLE_SCOPES = 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/spreadsheets';
const GOOGLE_OAUTH_STATE_KEY = 'esportiz_google_oauth_state';
const GOOGLE_OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const DEFAULT_ARENA_BOOKING_CONFIRMATION_TEMPLATE = getDefaultCommunicationTemplate('arena', 'booking_confirmation') || '';
const DEFAULT_ARENA_PAYMENT_REMINDER_TEMPLATE = getDefaultCommunicationTemplate('arena', 'payment_reminder') || '';

type GoogleOAuthStatePayload = {
  state: string;
  createdAt: number;
};

function createGoogleOAuthState() {
  const bytes = new Uint8Array(24);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function saveGoogleOAuthState(state: string) {
  const payload = JSON.stringify({ state, createdAt: Date.now() } satisfies GoogleOAuthStatePayload);
  let saved = false;

  try {
    window.sessionStorage.setItem(GOOGLE_OAUTH_STATE_KEY, payload);
    saved = true;
  } catch {
    // Ignore storage failures and try the next storage.
  }

  try {
    window.localStorage.setItem(GOOGLE_OAUTH_STATE_KEY, payload);
    saved = true;
  } catch {
    // Ignore storage failures and return whether any storage worked.
  }

  return saved;
}

function parseGoogleOAuthState(raw: string | null): GoogleOAuthStatePayload | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<GoogleOAuthStatePayload>;
    if (typeof parsed.state === 'string' && typeof parsed.createdAt === 'number') {
      return { state: parsed.state, createdAt: parsed.createdAt };
    }
  } catch {
    if (raw.length > 0) {
      return { state: raw, createdAt: Date.now() };
    }
  }

  return null;
}

function getStoredGoogleOAuthPayload() {
  const storages = [window.sessionStorage, window.localStorage];

  for (const storage of storages) {
    try {
      const payload = parseGoogleOAuthState(storage.getItem(GOOGLE_OAUTH_STATE_KEY));
      if (payload) return payload;
    } catch {
      // Continue to the next storage.
    }
  }

  return null;
}

function getGoogleOAuthState() {
  try {
    const payload = getStoredGoogleOAuthPayload();

    if (!payload) return null;

    if (Date.now() - payload.createdAt > GOOGLE_OAUTH_STATE_TTL_MS) {
      clearGoogleOAuthState();
      return null;
    }

    return payload.state;
  } catch {
    return null;
  }
}

function clearGoogleOAuthState() {
  try {
    window.sessionStorage.removeItem(GOOGLE_OAUTH_STATE_KEY);
  } catch {
    // Ignore storage cleanup failures.
  }

  try {
    window.localStorage.removeItem(GOOGLE_OAUTH_STATE_KEY);
  } catch {
    // Ignore storage cleanup failures.
  }
}

async function invokeGoogleAuth(payload: { code: string; userId: string; redirectUri: string }) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) throw sessionError;

  const accessToken = sessionData.session?.access_token;
  if (!accessToken) {
    throw new Error('Sessão expirada. Entre novamente e tente conectar o Google.');
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/google-auth`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: SUPABASE_PUBLISHABLE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      code: payload.code,
      user_id: payload.userId,
      redirect_uri: payload.redirectUri,
    }),
  });

  let responseBody: unknown = null;

  try {
    responseBody = await response.json();
  } catch {
    responseBody = null;
  }

  if (!response.ok) {
    const message =
      responseBody && typeof responseBody === 'object' && 'error' in responseBody
        ? String((responseBody as { error?: unknown }).error || '')
        : '';

    throw new Error(message || `Google Auth falhou com status ${response.status}.`);
  }

  return responseBody;
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { profile, rawProfile, loadingProfile, updateProfile, uploadLogo, isUpdatingProfile, isUploadingLogo } = useProfile();
  const [showNicheConfirmation, setShowNicheConfirmation] = useState(false);
  const [pendingBusinessType, setPendingBusinessType] = useState<BusinessType | null>(null);
  const { user } = useAuth();
  const { labels, organizationId } = useBusinessContext();
  const rolePermissions = useRolePermissions();
  const canViewTeam = rolePermissions.can('team', 'view');
  const canUpdateSettings = rolePermissions.can('settings', 'update');
  const {
    teamMembers,
    loadingTeamMembers,
    isErrorTeamMembers,
    refetchTeamMembers,
  } = useOrganizationTeamMembers({
    organizationId,
    enabled: canViewTeam,
  });
  const [selectedBusinessType, setSelectedBusinessType] = useState<BusinessType>('sport_school');
  const [teamInviteEmail, setTeamInviteEmail] = useState('');
  const [teamInviteRole, setTeamInviteRole] = useState<InvitableOrganizationRole>('receptionist');
  const [teamInvitePassword, setTeamInvitePassword] = useState('');
  const [showInvitePassword, setShowInvitePassword] = useState(false);
  const [isInvitingTeamMember, setIsInvitingTeamMember] = useState(false);
  const [memberToConfirmDelete, setMemberToConfirmDelete] = useState<any | null>(null);
  const [isDeletingMember, setIsDeletingMember] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState<string | null>(null);

  const [ctName, setCtName] = useState('');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isDeletingLogo, setIsDeletingLogo] = useState(false);
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const [pixKey, setPixKey] = useState('');
  const [pixReceiver, setPixReceiver] = useState('');
  const [bookingConfirmationTemplate, setBookingConfirmationTemplate] = useState('');
  const [paymentReminderTemplate, setPaymentReminderTemplate] = useState('');
  const processedGoogleCodeRef = useRef<string | null>(null);

  const dynamicCtLabel = selectedBusinessType === 'sport_school' ? 'Escola Esportiva' : 'Arena';
  const dynamicCtLabelShort = selectedBusinessType === 'sport_school' ? 'Escola' : 'CT';
  const ctPreposition = selectedBusinessType === 'sport_school' ? 'da' : 'do';
  const ctGenderedPronoun = selectedBusinessType === 'sport_school' ? 'sua' : 'seu';
  const isGoogleConnected = Boolean(profile?.google_access_token);
  const hasGoogleSpreadsheetId = Boolean(profile?.sheets_spreadsheet_id?.trim());
  const studentPortalUrl = profile?.owner_user_id || user?.id 
    ? `${window.location.origin}/portal-aluno?ct=${profile?.owner_user_id || user?.id}` 
    : '';

  // Keep the settings card aligned with the persisted profile value.
  useEffect(() => {
    if (rawProfile) {
      setSelectedBusinessType(rawProfile.business_type || 'sport_school');
    }
  }, [rawProfile]);

  // Load niche-specific settings or fallbacks when selected business type changes
  useEffect(() => {
    if (rawProfile) {
      const activeNiche = rawProfile.niche_settings?.[selectedBusinessType] || {};
      
      setCtName(activeNiche.ct_name !== undefined && activeNiche.ct_name !== null ? activeNiche.ct_name : (rawProfile.ct_name || ''));
      setLogoPreview(activeNiche.logo_url !== undefined && activeNiche.logo_url !== null ? activeNiche.logo_url : (rawProfile.logo_url || null));
      setPixKey(activeNiche.pix_key !== undefined && activeNiche.pix_key !== null ? activeNiche.pix_key : (rawProfile.pix_key || ''));
      setPixReceiver(activeNiche.pix_receiver !== undefined && activeNiche.pix_receiver !== null ? activeNiche.pix_receiver : (rawProfile.pix_receiver || ''));
      
      const templates = activeNiche.templates || {};
      setBookingConfirmationTemplate(templates.booking_confirmation || '');
      setPaymentReminderTemplate(templates.payment_reminder || '');
    }
  }, [rawProfile, selectedBusinessType]);

  // Reset selected invite role to first valid role of the active niche
  useEffect(() => {
    setTeamInviteRole(selectedBusinessType === 'sport_school' ? 'instructor' : 'receptionist');
  }, [selectedBusinessType]);

  const clearGoogleOAuthParams = useCallback(() => {
    const url = new URL(window.location.href);
    const paramsToClear = ['code', 'scope', 'authuser', 'prompt', 'error', 'error_description', 'state'];
    let changed = false;

    paramsToClear.forEach((param) => {
      if (url.searchParams.has(param)) {
        url.searchParams.delete(param);
        changed = true;
      }
    });

    if (changed) {
      window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
    }
  }, []);

  const handleGoogleCallback = useCallback(async (code: string) => {
    if (processedGoogleCodeRef.current === code) return;

    processedGoogleCodeRef.current = code;
    setIsConnectingGoogle(true);
    const toastId = toast.loading('Finalizando conexão com Google...');
    
    try {
      if (!user?.id) {
        throw new Error('Usuário não autenticado. Entre novamente e tente conectar o Google.');
      }

      await invokeGoogleAuth({
        code,
        userId: user.id,
        redirectUri: GOOGLE_REDIRECT_URI,
      });

      // Trigger initial analysis without creating students automatically.
      try {
        const { data: syncData } = await supabase.functions.invoke('google-sync', {
          body: { user_id: user?.id }
        });
        const contactsFound = Number(syncData?.contactsFound ?? syncData?.count ?? 0);
        toast.success(`${contactsFound} contato${contactsFound !== 1 ? 's' : ''} analisado${contactsFound !== 1 ? 's' : ''}. Nenhum ${labels.studentLabelSingular.toLowerCase()} foi criado automaticamente.`);
      } catch (syncErr) {
        console.error('Initial sync error:', syncErr);
      }

      toast.success('Google Agenda conectado com sucesso!', { id: toastId });
    } catch (error: unknown) {
      console.error('OAuth Error:', error);
      toast.error('Erro ao conectar com Google: ' + getErrorMessage(error), { id: toastId });
    } finally {
      clearGoogleOAuthState();
      clearGoogleOAuthParams();
      setIsConnectingGoogle(false);
    }
  }, [clearGoogleOAuthParams, user?.id, labels.studentLabelSingular]);

  // Handle Google OAuth Redirect
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const oauthError = urlParams.get('error');

    if (oauthError) {
      const errorDescription = urlParams.get('error_description');
      toast.error(errorDescription || `Google retornou erro: ${oauthError}`);
      clearGoogleOAuthState();
      clearGoogleOAuthParams();
      return;
    }

    if (code && user && !isConnectingGoogle && processedGoogleCodeRef.current !== code) {
      const returnedState = urlParams.get('state');
      const expectedState = getGoogleOAuthState();

      if (!returnedState || !expectedState || returnedState !== expectedState) {
        toast.error('Sessão de segurança do Google expirada ou inválida. Clique em conectar e tente novamente.');
        clearGoogleOAuthState();
        clearGoogleOAuthParams();
        return;
      }

      clearGoogleOAuthState();
      handleGoogleCallback(code);
    }
  }, [user, isConnectingGoogle, handleGoogleCallback, clearGoogleOAuthParams]);

  const handleConnectGoogle = () => {
    const state = createGoogleOAuthState();

    if (!saveGoogleOAuthState(state)) {
      toast.error('Não foi possível iniciar a conexão segura com Google. Tente novamente.');
      return;
    }

    const authParams = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: GOOGLE_REDIRECT_URI,
      response_type: 'code',
      scope: GOOGLE_SCOPES,
      access_type: 'offline',
      prompt: 'consent',
      state,
    });
    
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${authParams.toString()}`;
  };
  const handleCopyStudentPortalLink = async () => {
    if (!studentPortalUrl) {
      toast.error('Link do Portal do Aluno indisponível. Entre novamente e tente outra vez.');
      return;
    }

    try {
      await navigator.clipboard.writeText(studentPortalUrl);
      toast.success('Link do Portal do Aluno copiado.');
    } catch {
      toast.error('Não foi possível copiar o link automaticamente.');
    }
  };

  const handleOpenStudentPortal = () => {
    if (!studentPortalUrl) {
      toast.error('Link do Portal do Aluno indisponível. Entre novamente e tente outra vez.');
      return;
    }

    window.open(studentPortalUrl, '_blank', 'noopener,noreferrer');
  };

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
      toast.error('Nao foi possivel criar a conta: ' + getErrorMessage(error), { id: toastId });
    } finally {
      setIsInvitingTeamMember(false);
    }
  };

  const handleToggleMemberStatus = async (member: any) => {
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
    } catch (err) {
      toast.error('Erro ao alterar status do membro: ' + getErrorMessage(err), { id: toastId });
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
    } catch (err) {
      toast.error('Erro ao excluir membro: ' + getErrorMessage(err), { id: toastId });
    } finally {
      setIsDeletingMember(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Imagem muito grande. O limite é 2MB.');
        return;
      }
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveLogo = async () => {
    setIsDeletingLogo(true);
    try {
      const currentNicheSettings = rawProfile?.niche_settings || {};
      const updatedNicheSettings = {
        ...currentNicheSettings,
        [selectedBusinessType]: {
          ...(currentNicheSettings[selectedBusinessType] || {}),
          logo_url: null
        }
      };

      await updateProfile({
        logo_url: null,
        niche_settings: updatedNicheSettings
      });

      setLogoFile(null);
      setLogoPreview(null);
      // Reset file input
      const input = document.getElementById('logo-input') as HTMLInputElement;
      if (input) input.value = '';
      toast.success('Logo removida com sucesso.');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao remover a logo.');
    } finally {
      setIsDeletingLogo(false);
    }
  };

  const handleCancelLogo = () => {
    setLogoFile(null);
    const activeNiche = rawProfile?.niche_settings?.[selectedBusinessType] || {};
    const fallbackLogo = activeNiche.logo_url !== undefined && activeNiche.logo_url !== null ? activeNiche.logo_url : (rawProfile?.logo_url || null);
    setLogoPreview(fallbackLogo);
    const input = document.getElementById('logo-input') as HTMLInputElement;
    if (input) input.value = '';
  };

  const handleSave = async () => {
    if (!ctName.trim()) {
      toast.error(`O nome ${ctPreposition === 'da' ? 'da' : 'do'} ${dynamicCtLabelShort} é obrigatório.`);
      return;
    }

    try {
      const targetBusinessType = selectedBusinessType;
      let logoUrl = logoPreview; // Use current preview

      if (logoFile) {
        try {
          logoUrl = await uploadLogo(logoFile);
        } catch (uploadErr) {
          console.error("Failed to upload logo inside settings:", uploadErr);
          toast.warning("Não foi possível salvar o arquivo da logo, mas estamos atualizando os outros dados!");
        }
      }

      const currentNicheSettings = rawProfile?.niche_settings || {};
      const updatedNicheSettings = {
        ...currentNicheSettings,
        [targetBusinessType]: {
          ct_name: ctName,
          logo_url: logoUrl,
          pix_key: pixKey,
          pix_receiver: pixReceiver,
          templates: {
            ...(currentNicheSettings[targetBusinessType]?.templates || {}),
            booking_confirmation: bookingConfirmationTemplate,
            payment_reminder: paymentReminderTemplate
          }
        }
      };

      await updateProfile({
        business_type: targetBusinessType,
        ct_name: ctName,
        logo_url: logoUrl,
        pix_key: pixKey,
        pix_receiver: pixReceiver,
        niche_settings: updatedNicheSettings
      });

      setSelectedBusinessType(targetBusinessType);
      await queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      setLogoFile(null);
      const input = document.getElementById('logo-input') as HTMLInputElement;
      if (input) input.value = '';
      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar configurações.');
    }
  };

  const handleCardClick = (type: BusinessType) => {
    const activeNiche = rawProfile?.business_type || selectedBusinessType;
    if (type === activeNiche) {
      setSelectedBusinessType(type);
      return;
    }

    if (type !== activeNiche) {
      setPendingBusinessType(type);
      setShowNicheConfirmation(true);
    }
  };

  const handleConfirmNicheChange = async () => {
    if (!pendingBusinessType) return;

    const targetBusinessType = pendingBusinessType;
    setShowNicheConfirmation(false);

    try {
      const logoUrl = logoPreview;
      const currentNicheSettings = rawProfile?.niche_settings || {};

      const targetNicheSettings = currentNicheSettings[targetBusinessType] || {};
      const updatedNicheSettings = {
        ...currentNicheSettings,
        [targetBusinessType]: {
          ct_name: targetNicheSettings.ct_name || ctName || rawProfile?.ct_name || '',
          logo_url: targetNicheSettings.logo_url || logoUrl || rawProfile?.logo_url || null,
          pix_key: targetNicheSettings.pix_key || pixKey || rawProfile?.pix_key || '',
          pix_receiver: targetNicheSettings.pix_receiver || pixReceiver || rawProfile?.pix_receiver || '',
          templates: targetNicheSettings.templates || {
            booking_confirmation: bookingConfirmationTemplate,
            payment_reminder: paymentReminderTemplate
          }
        }
      };

      await updateProfile({
        business_type: targetBusinessType,
        ct_name: updatedNicheSettings[targetBusinessType].ct_name,
        logo_url: updatedNicheSettings[targetBusinessType].logo_url,
        pix_key: updatedNicheSettings[targetBusinessType].pix_key,
        pix_receiver: updatedNicheSettings[targetBusinessType].pix_receiver,
        niche_settings: updatedNicheSettings
      });

      setSelectedBusinessType(targetBusinessType);
      await queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      toast.success('Segmento alterado com sucesso! Reiniciando aplicação...');
      setTimeout(() => {
        queryClient.clear();
        window.location.href = '/dashboard';
      }, 1500);
    } catch (error) {
      console.error('Erro ao alternar de segmento:', error);
      toast.error('Erro ao alternar de segmento.');
    } finally {
      setPendingBusinessType(null);
    }
  };

  const handleCancelNicheChange = () => {
    setShowNicheConfirmation(false);
    setPendingBusinessType(null);
  };

  if (loadingProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-medium">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  const hasLogo = !!logoPreview;
  const isNewLogoSelected = !!logoFile;
  const isBusy = isUpdatingProfile || isUploadingLogo || isDeletingLogo;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-6 md:py-8 space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold">Configurações {ctPreposition} {dynamicCtLabelShort}</h1>
          <p className="text-muted-foreground mt-1">Gerencie as informações da sua conta e {ctPreposition === 'da' ? 'da sua' : 'do seu'} {dynamicCtLabel}.</p>
        </div>

        {/* Business Type Card */}
        {rolePermissions.organizationRole === 'owner' && (
          <div className="grid gap-6 md:grid-cols-3 animate-fade-in">
            <div className="md:col-span-1 space-y-1">
              <h3 className="font-medium">Tipo de Negócio</h3>
              <p className="text-sm text-muted-foreground">
                O sistema adapta a interface e termos automaticamente ao seu tipo de negócio.
              </p>
            </div>
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building className="h-5 w-5 text-primary" />
                  Segmento do Negócio
                </CardTitle>
                <CardDescription>Escolha o tipo que melhor representa sua atividade.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {BUSINESS_OPTIONS.map((option) => {
                  const isSelected = selectedBusinessType === option.type;
                  return (
                    <button
                      key={option.type}
                      onClick={() => {
                        handleCardClick(option.type);
                      }}
                      aria-pressed={isSelected}
                      aria-label={`${option.title}${isSelected ? ' ativo' : ''}`}
                      disabled={isBusy || !canUpdateSettings}
                      className={cn(
                        'w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200 text-left group',
                        isSelected
                          ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
                          : 'border-border hover:border-primary/40 hover:bg-muted/50'
                      )}
                    >
                      <div className={cn(
                        'flex items-center justify-center h-10 w-10 rounded-xl text-xl shrink-0 transition-all',
                        isSelected ? 'bg-primary/10 scale-110' : 'bg-muted group-hover:bg-primary/5'
                      )}>
                        {option.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn('font-semibold text-sm', isSelected && 'text-primary')}>{option.title}</p>
                        <p className="text-xs text-muted-foreground">{option.description}</p>
                      </div>
                      <div className={cn(
                        'h-5 w-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all',
                        isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30'
                      )}>
                        {isSelected && <CheckCircle className="h-3 w-3 text-primary-foreground" />}
                      </div>
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        )}

        {selectedBusinessType === 'sport_school' && (
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-1 space-y-1">
              <h3 className="font-medium">Portal do Aluno</h3>
              <p className="text-sm text-muted-foreground">
                Link oficial da sua escola para acesso de alunos e responsáveis.
              </p>
            </div>

            <Card className="md:col-span-2 border-primary/10">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <GraduationCap className="h-5 w-5 text-primary" />
                  Portal do Aluno
                </CardTitle>
                <CardDescription>
                  Envie este acesso para o aluno consultar pagamentos, turmas e presenças.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={studentPortalUrl}
                    readOnly
                    aria-label="Link do Portal do Aluno"
                    className="font-mono text-xs"
                  />
                  <div className="flex gap-2 sm:shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 sm:flex-none"
                      onClick={handleCopyStudentPortalLink}
                      disabled={!studentPortalUrl}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copiar
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 sm:flex-none"
                      onClick={handleOpenStudentPortal}
                      disabled={!studentPortalUrl}
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Abrir
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  O link já inclui o identificador seguro da sua escola.
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {canViewTeam && (
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-1 space-y-1">
              <h3 className="font-medium">Equipe e Permissoes</h3>
              <p className="text-sm text-muted-foreground">
                Visao segura dos membros vinculados a sua organizacao.
              </p>
            </div>

            <Card className="md:col-span-2 border-primary/10">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <UsersRound className="h-5 w-5 text-primary" />
                  Equipe
                </CardTitle>
                <CardDescription>
                  Adicione novos membros com e-mail e senha inicial, ou gerencie os acessos ativos da sua equipe.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {organizationId && rolePermissions.can('team', 'manage_team') && (
                  <div className="rounded-xl border-2 border-primary/10 bg-muted/10 p-4 animate-fade-in space-y-4">
                    {/* Cabecalho do formulario com indicador de modalidade */}
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Adicionar novo membro
                      </p>
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
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Selecione o cargo" />
                          </SelectTrigger>
                          <SelectContent>
                            {(selectedBusinessType === 'sport_school' ? SCHOOL_TEAM_INVITE_OPTIONS : ARENA_TEAM_INVITE_OPTIONS).map((option) => {
                              const RoleIc = getRoleIcon(option.role);
                              const roleStyle = TEAM_ROLE_LABELS[option.role];
                              return (
                                <SelectItem key={option.role} value={option.role}>
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
                        {(() => {
                          const opts = selectedBusinessType === 'sport_school' ? SCHOOL_TEAM_INVITE_OPTIONS : ARENA_TEAM_INVITE_OPTIONS;
                          const selected = opts.find(o => o.role === teamInviteRole);
                          const roleStyle = selected ? TEAM_ROLE_LABELS[selected.role] : null;
                          const RoleIc = selected ? getRoleIcon(selected.role) : null;
                          return selected && roleStyle && RoleIc ? (
                            <div className={cn(
                              'flex items-start gap-2 rounded-lg px-2.5 py-1.5 text-[11px] border mt-1',
                              roleStyle.bg, roleStyle.border
                            )}>
                              <RoleIc className={cn('h-3.5 w-3.5 mt-0.5 shrink-0', roleStyle.color)} />
                              <span className={cn('font-medium leading-snug', roleStyle.color)}>
                                {selected.description}
                              </span>
                            </div>
                          ) : null;
                        })()}
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
                      .filter((member) => rolePermissions.organizationRole === 'owner' || rolePermissions.organizationRole === 'manager' || member.userId === user?.id)
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
          </div>
        )}

        {/* Painel de Permissoes por Cargo */}
        {canViewTeam && (() => {
          const isOwnerRole = rolePermissions.organizationRole === 'owner';
          return (
            <div className="grid gap-6 md:grid-cols-3">
              <div className="md:col-span-1 space-y-1">
                <h3 className="font-medium">
                  {isOwnerRole ? 'Permissoes por Cargo' : 'Minhas Permissoes'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {isOwnerRole
                    ? 'O que cada cargo pode acessar e executar em cada modalidade do sistema.'
                    : 'O que o seu cargo permite acessar e executar no sistema.'}
                </p>
              </div>
              <Card className="md:col-span-2 border-primary/10">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    {isOwnerRole ? 'Matriz de Acesso' : 'Minhas Permissoes'}
                  </CardTitle>
                  <CardDescription>
                    {isOwnerRole
                      ? 'Cada cargo tem permissoes especificas para Escola Esportiva e Arena. Clique em um cargo para expandir.'
                      : 'Estas sao as acoes e modulos disponiveis para o seu cargo na modalidade ativa.'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RolePermissionsPanel
                    businessType={selectedBusinessType}
                    organizationRole={rolePermissions.organizationRole}
                  />
                </CardContent>
              </Card>
            </div>
          );
        })()}

        {/* Delete Member Confirmation Modal */}
        <AlertDialog 
          open={memberToConfirmDelete !== null} 
          onOpenChange={(open) => { if (!open) setMemberToConfirmDelete(null); }}
        >
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-xl font-bold">
                <AlertCircle className="h-6 w-6 text-destructive shrink-0" />
                Excluir Membro de Equipe?
              </AlertDialogTitle>
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

        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-1 space-y-1">
            <h3 className="font-medium">Perfil e Marca</h3>
            <p className="text-sm text-muted-foreground">
              Estas informações aparecem no cabeçalho do sistema e em relatórios.
            </p>
          </div>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building className="h-5 w-5 text-primary" />
                Dados {ctPreposition} {dynamicCtLabel}
              </CardTitle>
              <CardDescription>Personalize sua experiência no Esportiz.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail da Conta (Acesso)</Label>
                <Input id="email" value={user?.email || ''} disabled className="bg-muted" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ct-name">Nome {ctPreposition === 'da' ? 'da' : 'do'} {dynamicCtLabelShort}</Label>
                <Input
                  id="ct-name"
                  placeholder={`Ex: ${dynamicCtLabel} Exemplo`}
                  value={ctName}
                  onChange={(e) => setCtName(e.target.value)}
                  disabled={!canUpdateSettings}
                />
              </div>

              <div className="border-t border-border/30 pt-4 space-y-4">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Configuração de Recebimentos (Pix)</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pix-key">Chave Pix {ctPreposition === 'da' ? 'da' : 'do'} {dynamicCtLabelShort} (Opcional)</Label>
                    <Input
                      id="pix-key"
                      placeholder="Ex: CNPJ, E-mail, Celular, etc."
                      value={pixKey}
                      onChange={(e) => setPixKey(e.target.value)}
                      disabled={!canUpdateSettings}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pix-receiver">Beneficiário do Pix (Nome Completo)</Label>
                    <Input
                      id="pix-receiver"
                      placeholder="Ex: Nome do Dono ou Razão Social"
                      value={pixReceiver}
                      onChange={(e) => setPixReceiver(e.target.value)}
                      disabled={!canUpdateSettings}
                    />
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Se configurados, estes dados serão incluídos automaticamente nas mensagens de cobrança enviadas aos clientes.
                </p>
              </div>

              {/* Logo Section */}
              <div className="space-y-3">
                <Label>Logo {ctPreposition === 'da' ? 'da' : 'do'} {dynamicCtLabelShort} (Opcional)</Label>
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">

                  {/* Preview */}
                  <div className="flex-shrink-0 h-24 w-24 border-2 border-dashed border-border rounded-xl bg-muted/30 overflow-hidden flex items-center justify-center relative group">
                    {hasLogo ? (
                      <img src={logoPreview!} alt="Logo Preview" className="h-full w-full object-contain p-1" />
                    ) : (
                      <Building className="h-8 w-8 text-muted-foreground/30" />
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {/* Upload button */}
                      {canUpdateSettings && (
                        <label
                          className="inline-flex items-center justify-center rounded-md text-sm font-medium
                            ring-offset-background transition-colors focus-visible:outline-none
                            focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
                            disabled:pointer-events-none disabled:opacity-50
                            border border-input bg-background hover:bg-accent hover:text-accent-foreground
                            h-9 px-4 py-2 cursor-pointer"
                        >
                          <UploadCloud className="mr-2 h-4 w-4" />
                          {hasLogo ? 'Trocar imagem' : 'Escolher imagem'}
                          <input
                            id="logo-input"
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={handleLogoChange}
                            disabled={!canUpdateSettings}
                          />
                        </label>
                      )}

                      {/* Remove logo button — só aparece se há logo salva no perfil */}
                      {canUpdateSettings && profile?.logo_url && !isNewLogoSelected && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-9 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/60"
                              disabled={isBusy}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Remover logo
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remover logo {ctPreposition} {dynamicCtLabelShort}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                A logo atual será removida permanentemente. O sistema voltará a exibir o ícone padrão do Esportiz no cabeçalho.
                                Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={handleRemoveLogo}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                {isDeletingLogo ? 'Removendo...' : 'Sim, remover'}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}

                      {/* Cancelar nova seleção antes de salvar */}
                      {isNewLogoSelected && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 text-muted-foreground"
                          onClick={handleCancelLogo}
                          disabled={isBusy}
                        >
                          Cancelar
                        </Button>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Recomendado: Imagem quadrada em PNG com fundo transparente. Máx 2MB.
                    </p>

                    {isNewLogoSelected && (
                      <p className="text-xs text-primary font-medium flex items-center gap-1">
                        <UploadCloud className="h-3 w-3" />
                        Nova imagem selecionada: {logoFile!.name}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* WhatsApp Message Templates Section (Only for Arena) */}
              {selectedBusinessType === 'arena' && (
                <div className="border-t border-border/30 pt-4 space-y-4">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Modelos de Mensagem do WhatsApp</p>
                  
                  <div className="space-y-4">
                    {/* Template Option A */}
                    <div className="space-y-2">
                      <Label htmlFor="booking-confirmation-template" className="font-bold">1. Confirmação de Horário (Opção A)</Label>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Enviado ao fechar uma reserva. Variáveis: <code className="bg-muted px-1 py-0.5 rounded text-primary">{`{nome}`}</code>, <code className="bg-muted px-1 py-0.5 rounded text-primary">{`{escola}`}</code>, <code className="bg-muted px-1 py-0.5 rounded text-primary">{`{quadra}`}</code>, <code className="bg-muted px-1 py-0.5 rounded text-primary">{`{data}`}</code>, <code className="bg-muted px-1 py-0.5 rounded text-primary">{`{hora}`}</code>, <code className="bg-muted px-1 py-0.5 rounded text-primary">{`{valor}`}</code>.
                      </p>
                      <Textarea
                        id="booking-confirmation-template"
                        placeholder={DEFAULT_ARENA_BOOKING_CONFIRMATION_TEMPLATE}
                        className="min-h-[100px] resize-none bg-background border-border/50"
                        value={bookingConfirmationTemplate}
                        onChange={(e) => setBookingConfirmationTemplate(e.target.value)}
                        disabled={!canUpdateSettings}
                      />
                    </div>

                    {/* Template Option B */}
                    <div className="space-y-2">
                      <Label htmlFor="payment-reminder-template" className="font-bold">2. Lembrete de Cobrança / Recebimentos (Opção B)</Label>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Enviado para faturas pendentes. Variáveis: <code className="bg-muted px-1 py-0.5 rounded text-primary">{`{nome}`}</code>, <code className="bg-muted px-1 py-0.5 rounded text-primary">{`{escola}`}</code>, <code className="bg-muted px-1 py-0.5 rounded text-primary">{`{valor}`}</code>, <code className="bg-muted px-1 py-0.5 rounded text-primary">{`{chave_pix}`}</code>, <code className="bg-muted px-1 py-0.5 rounded text-primary">{`{beneficiario_pix}`}</code>.
                      </p>
                      <Textarea
                        id="payment-reminder-template"
                        placeholder={DEFAULT_ARENA_PAYMENT_REMINDER_TEMPLATE}
                        className="min-h-[100px] resize-none bg-background border-border/50"
                        value={paymentReminderTemplate}
                        onChange={(e) => setPaymentReminderTemplate(e.target.value)}
                        disabled={!canUpdateSettings}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-4 flex justify-end border-t">
                <Button
                  onClick={handleSave}
                  disabled={isBusy || !ctName.trim() || !canUpdateSettings}
                  className="btn-primary-gradient"
                >
                  {isBusy ? 'Salvando...' : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Salvar Alterações
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-3 pt-6 border-t">
          <div className="md:col-span-1 space-y-1">
            <h3 className="font-medium">Integrações Profissionais</h3>
            <p className="text-sm text-muted-foreground">
              Conecte o Esportiz com as ferramentas que você já usa no dia a dia.
            </p>
          </div>

          <div className="md:col-span-2 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Tag className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-xl font-display font-bold">Organização e Modalidades</h2>
            </div>
            
            <ModalityManager />

            {/* Google Calendar Card */}
            <Card className="overflow-hidden border-primary/10 shadow-sm hover:shadow-md transition-shadow">
              <div className="h-1 bg-gradient-to-r from-[#4285F4] via-[#EA4335] to-[#FBBC05]" />
              <CardHeader className="flex flex-col gap-3 space-y-0 pb-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1 min-w-0">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Calendar className="h-5 w-5 text-[#4285F4]" />
                    Google Agenda
                  </CardTitle>
                  <CardDescription>Sincronize agenda e analise contatos sem cadastro automático.</CardDescription>
                </div>
                {isGoogleConnected ? (
                  <div className="flex w-fit items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                    <CheckCircle2 className="h-3 w-3" />
                    Conectado
                  </div>
                ) : (
                  <div className="flex w-fit items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                    <AlertCircle className="h-3 w-3" />
                    Não conectado
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Ao conectar, seus(as) {labels.trainingLabel.toLowerCase()} do Esportiz aparecerão na sua agenda do Google e vice-versa.
                  Os contatos do Google Agenda são analisados com segurança, sem criar {labels.studentLabel.toLowerCase()} automaticamente.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  {isGoogleConnected && (
                    <Button 
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto"
                      onClick={async () => {
                        const tid = toast.loading('Analisando contatos do Google Agenda...');
                        try {
                          const { data, error } = await supabase.functions.invoke('google-sync', {
                            body: { user_id: user?.id }
                          });
                          if (error) throw error;
                          const contactsFound = Number(data?.contactsFound ?? data?.count ?? 0);
                          const existingCount = Number(data?.existingCount ?? 0);
                          const skippedCount = Number(data?.skippedCount ?? Math.max(contactsFound - existingCount, 0));
                          toast.success(`${contactsFound} contato${contactsFound !== 1 ? 's' : ''} analisado${contactsFound !== 1 ? 's' : ''}. ${existingCount} já existente${existingCount !== 1 ? 's' : ''}; ${skippedCount} sem importação automática.`, { id: tid });
                        } catch (err: unknown) {
                          toast.error('Erro na sincronização: ' + getErrorMessage(err), { id: tid });
                        }
                      }}
                    >
                      Analisar Contatos
                    </Button>
                  )}
                  <Button 
                    variant={isGoogleConnected ? "outline" : "default"}
                    className={cn(
                      "w-full sm:w-auto",
                      !isGoogleConnected && "bg-[#4285F4] hover:bg-[#4285F4]/90 text-white border-none"
                    )}
                    onClick={handleConnectGoogle}
                    disabled={isConnectingGoogle}
                  >
                    {isConnectingGoogle ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Conectando...
                      </>
                    ) : (
                      isGoogleConnected ? 'Reconectar Google Agenda' : 'Conectar Google Agenda'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Excel / Google Sheets Card */}
            <Card className="overflow-hidden border-primary/10 shadow-sm hover:shadow-md transition-shadow">
              <div className="h-1 bg-gradient-to-r from-[#1D723A] to-[#217346]" />
              <CardHeader className="flex flex-col gap-3 space-y-0 pb-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1 min-w-0">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileSpreadsheet className="h-5 w-5 text-[#1D723A]" />
                    Controle Financeiro (Planilhas)
                  </CardTitle>
                  <CardDescription>Sincronize pagamentos via Excel ou Google Sheets.</CardDescription>
                </div>
                {isGoogleConnected ? (
                  <div
                    className={cn(
                      "flex w-fit items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
                      hasGoogleSpreadsheetId
                        ? "text-green-600 bg-green-50"
                        : "text-amber-600 bg-amber-50"
                    )}
                  >
                    {hasGoogleSpreadsheetId ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      <AlertCircle className="h-3 w-3" />
                    )}
                    {hasGoogleSpreadsheetId ? 'Planilha configurada' : 'Planilha pendente'}
                  </div>
                ) : (
                  <div className="flex w-fit items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                    <AlertCircle className="h-3 w-3" />
                    Inativo
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Dê baixa em mensalidades diretamente da sua planilha na nuvem (Google Sheets). 
                  O sistema reconhece as atualizações e atualiza o financeiro do Esportiz em tempo real.
                </p>
                
                {isGoogleConnected && (
                  <div className="space-y-2 pt-2 border-t">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="inline-flex items-center gap-1 font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                        <CheckCircle2 className="h-3 w-3" />
                        Google conectado
                      </span>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 font-medium px-2 py-1 rounded-full",
                          hasGoogleSpreadsheetId
                            ? "text-green-600 bg-green-50"
                            : "text-amber-600 bg-amber-50"
                        )}
                      >
                        {hasGoogleSpreadsheetId ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <AlertCircle className="h-3 w-3" />
                        )}
                        {hasGoogleSpreadsheetId ? 'ID da planilha salvo' : 'Informe o ID da planilha'}
                      </span>
                    </div>
                    <Label htmlFor="spreadsheet-id">ID da Planilha Google</Label>
                    <div className="flex gap-2">
                      <Input 
                        id="spreadsheet-id"
                        placeholder="Cole o ID da sua planilha aqui"
                        defaultValue={profile?.sheets_spreadsheet_id || ''}
                        disabled={!canUpdateSettings}
                        onBlur={async (e) => {
                          if (!canUpdateSettings) return;
                          const spreadsheetId = e.target.value.trim();
                          if (spreadsheetId !== (profile?.sheets_spreadsheet_id || '')) {
                            try {
                              await updateProfile({ sheets_spreadsheet_id: spreadsheetId });
                              toast.success(
                                spreadsheetId
                                  ? 'ID da planilha salvo. Sheets pronto para sincronização.'
                                  : 'ID da planilha removido. Google segue conectado; Sheets fica pendente.'
                              );
                            } catch (error) {
                              toast.error('Erro ao salvar ID da planilha.');
                            }
                          }
                        }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground italic">
                      O ID fica na URL da sua planilha: docs.google.com/spreadsheets/d/<span className="text-primary font-bold">ESTE_CODIGO</span>/edit
                    </p>
                  </div>
                )}

                <div className="flex justify-end">
                  {!isGoogleConnected ? (
                    <Button 
                      variant="default"
                      className="w-full bg-[#1D723A] hover:bg-[#1D723A]/90 text-white border-none sm:w-auto"
                      onClick={handleConnectGoogle}
                      disabled={isConnectingGoogle || !canUpdateSettings}
                    >
                      {isConnectingGoogle ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Conectando...
                        </>
                      ) : (
                        'Conectar via Google Sheets'
                      )}
                    </Button>
                  ) : (
                    <div
                      className={cn(
                        "text-xs flex items-center gap-1",
                        hasGoogleSpreadsheetId ? "text-green-600" : "text-amber-600"
                      )}
                    >
                      {hasGoogleSpreadsheetId ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <AlertCircle className="h-4 w-4" />
                      )}
                      {hasGoogleSpreadsheetId
                        ? 'Pronto para sincronizar pagamentos'
                        : 'Aguardando ID da planilha'}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Modal de Confirmação de Mudança de Segmento (Nicho) */}
      <AlertDialog open={showNicheConfirmation} onOpenChange={(open) => { if (!open) handleCancelNicheChange(); }}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-xl font-bold">
              <AlertCircle className="h-6 w-6 text-amber-500 shrink-0" />
              Confirmar Alteração de Segmento?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4 pt-2">
              <p className="text-sm leading-relaxed text-foreground">
                Você está alterando o segmento do seu negócio de{' '}
                <strong className="font-semibold text-primary">
                  {getBusinessTypeLabel(rawProfile?.business_type)}
                </strong>{' '}
                para{' '}
                <strong className="font-semibold text-primary">
                  {getBusinessTypeLabel(pendingBusinessType)}
                </strong>.
              </p>
              <div className="space-y-2 text-muted-foreground text-xs leading-relaxed">
                <p>
                  • Os dados cadastrados no segmento anterior (como alunos, turmas ou reservas){' '}
                  <span className="font-semibold text-foreground">continuam 100% salvos e seguros</span> no banco de dados.
                </p>
                <p>
                  • Eles ficarão ocultos sob o novo segmento para evitar confusões operacionais e manter as gavetas de dados perfeitamente organizadas.
                </p>
                <p>
                  • Se decidir voltar ao segmento anterior no futuro, tudo estará exatamente do jeito que deixou.
                </p>
              </div>
              <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200/60 p-3 rounded-lg flex items-start gap-2 leading-normal">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                <span>
                  Para evitar conflitos de cache e garantir sincronia total nas telas e relatórios, toda a aplicação será limpa e reiniciada no Painel Principal após a confirmação.
                </span>
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel onClick={handleCancelNicheChange} disabled={isBusy} className="h-10">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmNicheChange}
              disabled={isBusy}
              className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 font-medium"
            >
              {isBusy ? 'Salvando...' : 'Confirmar e Reiniciar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

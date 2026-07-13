import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AppPage } from '@/components/layout/AppPage';
import { PageHeader } from '@/components/layout/PageHeader';
import { SettingsCardHeader } from '@/components/layout/SettingsCardHeader';
import { SettingsField } from '@/components/layout/SettingsField';
import { SettingsGroupTitle } from '@/components/layout/SettingsGroupTitle';
import { SettingsSection } from '@/components/layout/SettingsSection';
import { TeamSettingsSection } from '@/components/settings/TeamSettingsSection';
import { IconAlertDialogTitle } from '@/components/layout/IconAlertDialogTitle';
import { StatusPill } from '@/components/ui/status-pill';
import { useProfile } from '@/hooks/queries/useProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
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
import { UploadCloud, Save, Building, Trash2, Calendar, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, Tag, GraduationCap, CheckCircle, Copy, ExternalLink } from 'lucide-react';
import { useAuth } from '@/contexts/auth';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { ModalityManager } from '@/components/ModalityManager';
import { supabase, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/integrations/supabase/client';
import { type BusinessType } from '@/hooks/queries/useProfile';
import { cn } from '@/lib/utils';
import { getErrorMessage } from '@/lib/errorUtils';
import { getDefaultCommunicationTemplate } from '@/lib/communicationContracts';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { buildStudentPortalUrl } from '@/lib/publicAccessContracts';
import { formatBrazilPhone, isValidBrazilPhone } from '@/lib/publicPortalSecurity';

const BUSINESS_OPTIONS: { type: BusinessType; title: string; description: string; emoji: string }[] = [
  { type: 'sport_school', title: 'Escola Esportiva', description: 'Esportiz Sport — Futevôlei, Vôlei, Futebol, Artes Marciais...', emoji: '🏐' },
  { type: 'arena', title: 'Arena / CT de Quadras', description: 'Esportiz Arena — Locação de quadras, Day Use, Eventos esportivos...', emoji: '🏟️' },
];

function getBusinessTypeLabel(type: BusinessType | null | undefined) {
  return type === 'arena' ? 'Arena / CT de Quadras' : 'Escola Esportiva';
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
  const { labels } = useBusinessContext();
  const rolePermissions = useRolePermissions();
  const canUpdateSettings = rolePermissions.can('settings', 'update');
  const canManageSensitiveSettings = rolePermissions.can('settings', 'manage_settings');
  const [selectedBusinessType, setSelectedBusinessType] = useState<BusinessType>('sport_school');
  const [ctName, setCtName] = useState('');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isDeletingLogo, setIsDeletingLogo] = useState(false);
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const [pixKey, setPixKey] = useState('');
  const [pixReceiver, setPixReceiver] = useState('');
  const [bookingConfirmationTemplate, setBookingConfirmationTemplate] = useState('');
  const [paymentReminderTemplate, setPaymentReminderTemplate] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const processedGoogleCodeRef = useRef<string | null>(null);

  const dynamicCtLabel = selectedBusinessType === 'sport_school' ? 'Escola Esportiva' : 'Arena';
  const dynamicCtLabelShort = selectedBusinessType === 'sport_school' ? 'Escola' : 'CT';
  const ctPreposition = selectedBusinessType === 'sport_school' ? 'da' : 'do';
  const ctGenderedPronoun = selectedBusinessType === 'sport_school' ? 'sua' : 'seu';
  const isGoogleConnected = Boolean(profile?.google_access_token);
  const hasGoogleSpreadsheetId = Boolean(profile?.sheets_spreadsheet_id?.trim());
  const studentPortalUrl = buildStudentPortalUrl(
    window.location.origin,
    profile?.owner_user_id || user?.id,
  );

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
      setWhatsapp(activeNiche.whatsapp !== undefined && activeNiche.whatsapp !== null ? formatBrazilPhone(activeNiche.whatsapp) : '');

      const templates = activeNiche.templates || {};
      setBookingConfirmationTemplate(templates.booking_confirmation || '');
      setPaymentReminderTemplate(templates.payment_reminder || '');
    }
  }, [rawProfile, selectedBusinessType]);

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

    if (whatsapp && !isValidBrazilPhone(whatsapp)) {
      toast.error('Informe um WhatsApp válido com DDD (Ex: (11) 99999-9999)');
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

      const cleanWhatsapp = whatsapp ? whatsapp.replace(/\D/g, '') : null;
      const currentNicheSettings = rawProfile?.niche_settings || {};
      const updatedNicheSettings = {
        ...currentNicheSettings,
        [targetBusinessType]: {
          ct_name: ctName,
          logo_url: logoUrl,
          pix_key: pixKey,
          pix_receiver: pixReceiver,
          whatsapp: cleanWhatsapp,
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
          whatsapp: targetNicheSettings.whatsapp || (whatsapp ? whatsapp.replace(/\D/g, '') : null) || null,
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
      <AppPage contentClassName="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-medium">Carregando configurações...</p>
        </div>
      </AppPage>
    );
  }

  const hasLogo = !!logoPreview;
  const isNewLogoSelected = !!logoFile;
  const isBusy = isUpdatingProfile || isUploadingLogo || isDeletingLogo;

  return (
    <>
      <AppPage contentClassName="max-w-4xl">
        <PageHeader
          title={`Configurações ${ctPreposition} ${dynamicCtLabelShort}`}
          description={`Gerencie as informações da sua conta e ${ctPreposition === 'da' ? 'da sua' : 'do seu'} ${dynamicCtLabel}.`}
          icon={Building}
        />

        {/* Business Type Card */}
        {rolePermissions.organizationRole === 'owner' && (
          <SettingsSection
            title="Tipo de Negócio"
            description="O sistema adapta a interface e termos automaticamente ao seu tipo de negócio."
            className="animate-fade-in"
          >
            <Card>
              <SettingsCardHeader
                icon={Building}
                title="Segmento do Negócio"
                description="Escolha o tipo que melhor representa sua atividade."
              />
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
          </SettingsSection>
        )}

        {selectedBusinessType === 'sport_school' && (
          <SettingsSection
            title="Portal do Aluno"
            description="Link oficial da sua escola para acesso de alunos e responsáveis."
          >
            <Card className="border-primary/10">
              <SettingsCardHeader
                className="pb-3"
                icon={GraduationCap}
                title="Portal do Aluno"
                description="Envie este acesso para o aluno consultar pagamentos, turmas e presenças."
              />
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
          </SettingsSection>
        )}

        <TeamSettingsSection businessType={selectedBusinessType} />

        <SettingsSection
          title="Perfil e Marca"
          description="Estas informações aparecem no cabeçalho do sistema e em relatórios."
        >
          <Card>
            <SettingsCardHeader
              icon={Building}
              title={<>Dados {ctPreposition} {dynamicCtLabel}</>}
              description="Personalize sua experiência no Esportiz."
            />
            <CardContent className="space-y-6">
              <SettingsField htmlFor="email" label="E-mail da Conta (Acesso)">
                <Input id="email" value={user?.email || ''} disabled className="bg-muted" />
              </SettingsField>

              <SettingsField
                htmlFor="ct-name"
                label={<>Nome {ctPreposition === 'da' ? 'da' : 'do'} {dynamicCtLabelShort}</>}
              >
                <Input
                  id="ct-name"
                  placeholder={`Ex: ${dynamicCtLabel} Exemplo`}
                  value={ctName}
                  onChange={(e) => setCtName(e.target.value)}
                  disabled={!canUpdateSettings}
                />
              </SettingsField>

              <SettingsField
                htmlFor="whatsapp"
                label={<>WhatsApp de Contato {ctPreposition} {dynamicCtLabelShort} (Opcional)</>}
                description="Se configurado, seus clientes poderão entrar em contato direto com você via WhatsApp a partir do Portal do Aluno ou da página de agendamentos."
              >
                <div className="flex gap-2">
                  <Input
                    id="whatsapp"
                    placeholder="Ex: (11) 99999-9999"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(formatBrazilPhone(e.target.value))}
                    disabled={!canUpdateSettings}
                    className="flex-1"
                  />
                  {whatsapp && isValidBrazilPhone(whatsapp) && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const digits = whatsapp.replace(/\D/g, '');
                        window.open(`https://wa.me/55${digits}?text=Ol%C3%A1%21%20Este%20%C3%A9%20um%20teste%20de%20conex%C3%A3o%20do%20WhatsApp%20da%20minha%20escola%20no%20Esportiz.`, '_blank');
                      }}
                      className="border-green-500/30 text-green-600 dark:text-green-400 hover:bg-green-500/10 font-medium shrink-0"
                    >
                      Testar Número
                    </Button>
                  )}
                </div>
              </SettingsField>

              {canManageSensitiveSettings && (
              <div className="border-t border-border/30 pt-4 space-y-4">
                <SettingsGroupTitle>Configuração de Recebimentos (Pix)</SettingsGroupTitle>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SettingsField
                    htmlFor="pix-key"
                    label={<>Chave Pix {ctPreposition === 'da' ? 'da' : 'do'} {dynamicCtLabelShort} (Opcional)</>}
                  >
                    <Input
                      id="pix-key"
                      placeholder="Ex: CNPJ, E-mail, Celular, etc."
                      value={pixKey}
                      onChange={(e) => setPixKey(e.target.value)}
                      disabled={!canManageSensitiveSettings}
                    />
                  </SettingsField>
                  <SettingsField htmlFor="pix-receiver" label="Beneficiário do Pix (Nome Completo)">
                    <Input
                      id="pix-receiver"
                      placeholder="Ex: Nome do Dono ou Razão Social"
                      value={pixReceiver}
                      onChange={(e) => setPixReceiver(e.target.value)}
                      disabled={!canManageSensitiveSettings}
                    />
                  </SettingsField>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Se configurados, estes dados serão incluídos automaticamente nas mensagens de cobrança enviadas aos clientes.
                </p>
              </div>
              )}

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
                  <SettingsGroupTitle>Modelos de Mensagem do WhatsApp</SettingsGroupTitle>

                  <div className="space-y-4">
                    {/* Template Option A */}
                    <SettingsField
                      htmlFor="booking-confirmation-template"
                      label="1. Confirmação de Horário (Opção A)"
                      labelClassName="font-bold"
                      descriptionClassName="text-xs leading-relaxed"
                      description={<>Enviado ao fechar uma reserva. Variáveis: <code className="bg-muted px-1 py-0.5 rounded text-primary">{`{nome}`}</code>, <code className="bg-muted px-1 py-0.5 rounded text-primary">{`{escola}`}</code>, <code className="bg-muted px-1 py-0.5 rounded text-primary">{`{quadra}`}</code>, <code className="bg-muted px-1 py-0.5 rounded text-primary">{`{data}`}</code>, <code className="bg-muted px-1 py-0.5 rounded text-primary">{`{hora}`}</code>, <code className="bg-muted px-1 py-0.5 rounded text-primary">{`{valor}`}</code>.</>}
                    >
                      <Textarea
                        id="booking-confirmation-template"
                        placeholder={DEFAULT_ARENA_BOOKING_CONFIRMATION_TEMPLATE}
                        className="min-h-[100px] resize-none bg-background border-border/50"
                        value={bookingConfirmationTemplate}
                        onChange={(e) => setBookingConfirmationTemplate(e.target.value)}
                        disabled={!canUpdateSettings}
                      />
                    </SettingsField>

                    {/* Template Option B */}
                    <SettingsField
                      htmlFor="payment-reminder-template"
                      label="2. Lembrete de Cobrança / Recebimentos (Opção B)"
                      labelClassName="font-bold"
                      descriptionClassName="text-xs leading-relaxed"
                      description={<>Enviado para faturas pendentes. Variáveis: <code className="bg-muted px-1 py-0.5 rounded text-primary">{`{nome}`}</code>, <code className="bg-muted px-1 py-0.5 rounded text-primary">{`{escola}`}</code>, <code className="bg-muted px-1 py-0.5 rounded text-primary">{`{valor}`}</code>, <code className="bg-muted px-1 py-0.5 rounded text-primary">{`{chave_pix}`}</code>, <code className="bg-muted px-1 py-0.5 rounded text-primary">{`{beneficiario_pix}`}</code>.</>}
                    >
                      <Textarea
                        id="payment-reminder-template"
                        placeholder={DEFAULT_ARENA_PAYMENT_REMINDER_TEMPLATE}
                        className="min-h-[100px] resize-none bg-background border-border/50"
                        value={paymentReminderTemplate}
                        onChange={(e) => setPaymentReminderTemplate(e.target.value)}
                        disabled={!canUpdateSettings}
                      />
                    </SettingsField>
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
        </SettingsSection>

        {canManageSensitiveSettings && (
        <SettingsSection
          title="Integrações Profissionais"
          description="Conecte o Esportiz com as ferramentas que você já usa no dia a dia."
          className="pt-6 border-t"
          contentClassName="space-y-6"
        >
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
              <SettingsCardHeader
                className="pb-2"
                icon={Calendar}
                iconClassName="text-[#4285F4]"
                title="Google Agenda"
                description="Sincronize agenda e analise contatos sem cadastro automático."
                action={isGoogleConnected ? (
                  <StatusPill tone="success" icon={CheckCircle2}>
                    Conectado
                  </StatusPill>
                ) : (
                  <StatusPill tone="warning" icon={AlertCircle}>
                    Não conectado
                  </StatusPill>
                )}
              />
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
              <SettingsCardHeader
                className="pb-2"
                icon={FileSpreadsheet}
                iconClassName="text-[#1D723A]"
                title="Controle Financeiro (Planilhas)"
                description="Sincronize pagamentos via Excel ou Google Sheets."
                action={isGoogleConnected ? (
                  <StatusPill
                    tone={hasGoogleSpreadsheetId ? 'success' : 'warning'}
                    icon={hasGoogleSpreadsheetId ? CheckCircle2 : AlertCircle}
                  >
                    {hasGoogleSpreadsheetId ? 'Planilha configurada' : 'Planilha pendente'}
                  </StatusPill>
                ) : (
                  <StatusPill tone="warning" icon={AlertCircle}>
                    Inativo
                  </StatusPill>
                )}
              />
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Dê baixa em mensalidades diretamente da sua planilha na nuvem (Google Sheets).
                  O sistema reconhece as atualizações e atualiza o financeiro do Esportiz em tempo real.
                </p>

                {isGoogleConnected && (
                  <div className="space-y-2 pt-2 border-t">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <StatusPill tone="success" icon={CheckCircle2}>
                        Google conectado
                      </StatusPill>
                      <StatusPill
                        tone={hasGoogleSpreadsheetId ? 'success' : 'warning'}
                        icon={hasGoogleSpreadsheetId ? CheckCircle2 : AlertCircle}
                      >
                        {hasGoogleSpreadsheetId ? 'ID da planilha salvo' : 'Informe o ID da planilha'}
                      </StatusPill>
                    </div>
                    <SettingsField
                      htmlFor="spreadsheet-id"
                      label="ID da Planilha Google"
                      descriptionClassName="italic"
                      description={<>O ID fica na URL da sua planilha: docs.google.com/spreadsheets/d/<span className="text-primary font-bold">ESTE_CODIGO</span>/edit</>}
                    >
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
                    </SettingsField>
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
        </SettingsSection>
        )}
      </AppPage>

      {/* Modal de Confirmação de Mudança de Segmento (Nicho) */}
      <AlertDialog open={showNicheConfirmation} onOpenChange={(open) => { if (!open) handleCancelNicheChange(); }}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <IconAlertDialogTitle icon={AlertCircle} iconClassName="text-amber-500">
              Confirmar Alteração de Segmento?
            </IconAlertDialogTitle>
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
    </>
  );
}
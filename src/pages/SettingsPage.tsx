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
import { UploadCloud, Save, Building, Trash2, Calendar, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, Tag, Volleyball, Landmark, GraduationCap, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { ModalityManager } from '@/components/ModalityManager';
import { supabase } from '@/integrations/supabase/client';
import { type BusinessType } from '@/hooks/queries/useProfile';
import { cn } from '@/lib/utils';
import { getErrorMessage } from '@/lib/errorUtils';
import { getDefaultCommunicationTemplate } from '@/lib/communicationContracts';

const BUSINESS_OPTIONS: { type: BusinessType; title: string; description: string; emoji: string }[] = [
  { type: 'sport_school', title: 'Escola Esportiva', description: 'Esportiz Sport — Futevôlei, Vôlei, Futebol, Artes Marciais...', emoji: '🏐' },
  { type: 'arena', title: 'Arena / CT de Quadras', description: 'Esportiz Arena — Locação de quadras, Day Use, Eventos esportivos...', emoji: '🏟️' },
];

const GOOGLE_CLIENT_ID = '101916210739-8dd7avpijkt4oc5t053fg7tqtahfakdr.apps.googleusercontent.com';
const GOOGLE_REDIRECT_URI = window.location.origin + '/configuracoes';
const GOOGLE_SCOPES = 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/spreadsheets';
const GOOGLE_OAUTH_STATE_KEY = 'esportiz_google_oauth_state';
const DEFAULT_ARENA_BOOKING_CONFIRMATION_TEMPLATE = getDefaultCommunicationTemplate('arena', 'booking_confirmation') || '';
const DEFAULT_ARENA_PAYMENT_REMINDER_TEMPLATE = getDefaultCommunicationTemplate('arena', 'payment_reminder') || '';

function createGoogleOAuthState() {
  const bytes = new Uint8Array(24);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function saveGoogleOAuthState(state: string) {
  try {
    window.sessionStorage.setItem(GOOGLE_OAUTH_STATE_KEY, state);
    return true;
  } catch {
    return false;
  }
}

function getGoogleOAuthState() {
  try {
    return window.sessionStorage.getItem(GOOGLE_OAUTH_STATE_KEY);
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
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { profile, rawProfile, updateProfile, uploadLogo, isUpdatingProfile, isUploadingLogo } = useProfile();
  const [showNicheConfirmation, setShowNicheConfirmation] = useState(false);
  const [pendingBusinessType, setPendingBusinessType] = useState<BusinessType | null>(null);
  const { user } = useAuth();
  const { labels } = useBusinessContext();
  const [selectedBusinessType, setSelectedBusinessType] = useState<BusinessType>('sport_school');
  const [businessTypeInitialized, setBusinessTypeInitialized] = useState(false);

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

  // Initialize active business type once from raw profile
  useEffect(() => {
    if (rawProfile && !businessTypeInitialized) {
      setSelectedBusinessType(rawProfile.business_type || 'sport_school');
      setBusinessTypeInitialized(true);
    }
  }, [rawProfile, businessTypeInitialized]);

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
      const { error } = await supabase.functions.invoke('google-auth', {
        body: { code, user_id: user?.id, redirect_uri: GOOGLE_REDIRECT_URI }
      });

      if (error) throw error;

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
        toast.error('Falha na validação de segurança do Google. Tente conectar novamente.');
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
      toast.error('Nao foi possivel iniciar a conexao segura com Google. Tente novamente.');
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
      toast.error('O nome do CT é obrigatório.');
      return;
    }

    try {
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
        [selectedBusinessType]: {
          ct_name: ctName,
          logo_url: logoUrl,
          pix_key: pixKey,
          pix_receiver: pixReceiver,
          templates: {
            ...(currentNicheSettings[selectedBusinessType]?.templates || {}),
            booking_confirmation: bookingConfirmationTemplate,
            payment_reminder: paymentReminderTemplate
          }
        }
      };

      await updateProfile({
        business_type: selectedBusinessType,
        ct_name: ctName,
        logo_url: logoUrl,
        pix_key: pixKey,
        pix_receiver: pixReceiver,
        niche_settings: updatedNicheSettings
      });

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
    const activeNiche = rawProfile?.business_type || 'sport_school';
    if (type !== activeNiche) {
      setPendingBusinessType(type);
      setShowNicheConfirmation(true);
    }
  };

  const handleConfirmNicheChange = async () => {
    if (!pendingBusinessType) return;

    setShowNicheConfirmation(false);

    try {
      const logoUrl = logoPreview;
      const currentNicheSettings = rawProfile?.niche_settings || {};

      const targetNicheSettings = currentNicheSettings[pendingBusinessType] || {};
      const updatedNicheSettings = {
        ...currentNicheSettings,
        [pendingBusinessType]: {
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
        business_type: pendingBusinessType,
        ct_name: updatedNicheSettings[pendingBusinessType].ct_name,
        logo_url: updatedNicheSettings[pendingBusinessType].logo_url,
        pix_key: updatedNicheSettings[pendingBusinessType].pix_key,
        pix_receiver: updatedNicheSettings[pendingBusinessType].pix_receiver,
        niche_settings: updatedNicheSettings
      });

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

  const hasLogo = !!logoPreview;
  const isNewLogoSelected = !!logoFile;
  const isBusy = isUpdatingProfile || isUploadingLogo || isDeletingLogo;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-6 md:py-8 space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-display font-bold">Configurações {ctPreposition} {dynamicCtLabelShort}</h1>
          <p className="text-muted-foreground mt-1">Gerencie as informações da sua conta e {ctPreposition === 'da' ? 'da sua' : 'do seu'} {dynamicCtLabel}.</p>
        </div>

        {/* Business Type Card */}
        <div className="grid gap-6 md:grid-cols-3">
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
                    disabled={isBusy}
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
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pix-receiver">Beneficiário do Pix (Nome Completo)</Label>
                    <Input
                      id="pix-receiver"
                      placeholder="Ex: Nome do Dono ou Razão Social"
                      value={pixReceiver}
                      onChange={(e) => setPixReceiver(e.target.value)}
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
                <div className="flex items-start gap-4">

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
                        />
                      </label>

                      {/* Remove logo button — só aparece se há logo salva no perfil */}
                      {profile?.logo_url && !isNewLogoSelected && (
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
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-4 flex justify-end border-t">
                <Button
                  onClick={handleSave}
                  disabled={isBusy || !ctName.trim()}
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
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Calendar className="h-5 w-5 text-[#4285F4]" />
                    Google Agenda
                  </CardTitle>
                  <CardDescription>Sincronize agenda e analise contatos sem cadastro automático.</CardDescription>
                </div>
                {profile?.google_access_token ? (
                  <div className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                    <CheckCircle2 className="h-3 w-3" />
                    Conectado
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
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
                <div className="flex justify-end gap-2">
                  {profile?.google_access_token && (
                    <Button 
                      variant="outline"
                      size="sm"
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
                    variant={profile?.google_access_token ? "outline" : "default"}
                    className={!profile?.google_access_token ? "bg-[#4285F4] hover:bg-[#4285F4]/90 text-white border-none" : ""}
                    onClick={handleConnectGoogle}
                    disabled={isConnectingGoogle}
                  >
                    {isConnectingGoogle ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Conectando...
                      </>
                    ) : (
                      profile?.google_access_token ? 'Reconectar Google Agenda' : 'Conectar Google Agenda'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Excel / Google Sheets Card */}
            <Card className="overflow-hidden border-primary/10 shadow-sm hover:shadow-md transition-shadow">
              <div className="h-1 bg-gradient-to-r from-[#1D723A] to-[#217346]" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileSpreadsheet className="h-5 w-5 text-[#1D723A]" />
                    Controle Financeiro (Planilhas)
                  </CardTitle>
                  <CardDescription>Sincronize pagamentos via Excel ou Google Sheets.</CardDescription>
                </div>
                {profile?.google_access_token ? (
                  <div className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                    <CheckCircle2 className="h-3 w-3" />
                    Google Conectado
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
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
                
                {profile?.google_access_token && (
                  <div className="space-y-2 pt-2 border-t">
                    <Label htmlFor="spreadsheet-id">ID da Planilha Google</Label>
                    <div className="flex gap-2">
                      <Input 
                        id="spreadsheet-id"
                        placeholder="Cole o ID da sua planilha aqui"
                        defaultValue={profile.sheets_spreadsheet_id || ''}
                        onBlur={async (e) => {
                          if (e.target.value !== profile.sheets_spreadsheet_id) {
                            try {
                              await updateProfile({ sheets_spreadsheet_id: e.target.value });
                              toast.success('ID da planilha atualizado!');
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
                  {!profile?.google_access_token ? (
                    <Button 
                      variant="default"
                      className="bg-[#1D723A] hover:bg-[#1D723A]/90 text-white border-none"
                      onClick={handleConnectGoogle}
                      disabled={isConnectingGoogle}
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
                    <div className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4" />
                      Pronto para sincronizar
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
                  {rawProfile?.business_type === 'sport_school' ? 'Escola Esportiva' : 'Arena / CT de Quadras'}
                </strong>{' '}
                para{' '}
                <strong className="font-semibold text-primary">
                  {pendingBusinessType === 'sport_school' ? 'Escola Esportiva' : 'Arena / CT de Quadras'}
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

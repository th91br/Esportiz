import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { useProfile } from '@/hooks/queries/useProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

const BUSINESS_OPTIONS: { type: BusinessType; title: string; description: string; emoji: string }[] = [
  { type: 'sport_school', title: 'Escola Esportiva', description: 'Esportiz Sport — Futevôlei, Vôlei, Futebol, Artes Marciais...', emoji: '🏐' },
  { type: 'arena', title: 'Arena / CT de Quadras', description: 'Esportiz Arena — Locação de quadras, Day Use, Eventos esportivos...', emoji: '🏟️' },
  { type: 'other', title: 'Escola / Curso Livre', description: 'Esportiz Club — Idiomas, Música, Cursos livres, Dança...', emoji: '📚' },
];

const GOOGLE_CLIENT_ID = '101916210739-8dd7avpijkt4oc5t053fg7tqtahfakdr.apps.googleusercontent.com';
const GOOGLE_REDIRECT_URI = window.location.origin + '/configuracoes';
const GOOGLE_SCOPES = 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/spreadsheets';

export default function SettingsPage() {
  const { profile, updateProfile, uploadLogo, isUpdatingProfile, isUploadingLogo } = useProfile();
  const { user } = useAuth();
  const { labels } = useBusinessContext();
  const [selectedBusinessType, setSelectedBusinessType] = useState<BusinessType>('sport_school');

  const [ctName, setCtName] = useState('');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isDeletingLogo, setIsDeletingLogo] = useState(false);
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);

  useEffect(() => {
    if (profile) {
      setCtName(profile.ct_name || '');
      setLogoPreview(profile.logo_url || null);
      setSelectedBusinessType(profile.business_type || 'sport_school');
    }
  }, [profile]);

  // Handle Google OAuth Redirect
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code && user && !isConnectingGoogle) {
      handleGoogleCallback(code);
    }
  }, [user]);

  const handleGoogleCallback = async (code: string) => {
    setIsConnectingGoogle(true);
    const toastId = toast.loading('Finalizando conexão com Google...');
    
    try {
      const { data, error } = await supabase.functions.invoke('google-auth', {
        body: { code, user_id: user?.id }
      });

      if (error) throw error;

      // Trigger initial sync
      try {
        await supabase.functions.invoke('google-sync', {
          body: { user_id: user?.id }
        });
        toast.success(`Sincronização de ${labels.studentLabel.toLowerCase()} concluída!`);
      } catch (syncErr) {
        console.error('Initial sync error:', syncErr);
      }

      toast.success('Google Agenda conectado com sucesso!', { id: toastId });
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (error: any) {
      console.error('OAuth Error:', error);
      toast.error('Erro ao conectar com Google: ' + error.message, { id: toastId });
    } finally {
      setIsConnectingGoogle(false);
    }
  };

  const handleConnectGoogle = () => {
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + 
      `client_id=${GOOGLE_CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(GOOGLE_REDIRECT_URI)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(GOOGLE_SCOPES)}&` +
      `access_type=offline&` +
      `prompt=consent`;
    
    window.location.href = authUrl;
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
      await updateProfile({ ct_name: ctName, logo_url: null });
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
    setLogoPreview(profile?.logo_url || null);
    const input = document.getElementById('logo-input') as HTMLInputElement;
    if (input) input.value = '';
  };

  const handleSave = async () => {
    if (!ctName.trim()) {
      toast.error('O nome do CT é obrigatório.');
      return;
    }

    try {
      let logoUrl = profile?.logo_url || null;

      if (logoFile) {
        try {
          logoUrl = await uploadLogo(logoFile);
        } catch (uploadErr) {
          console.error("Failed to upload logo inside settings:", uploadErr);
          toast.warning("Não foi possível salvar o arquivo da logo, mas estamos atualizando os outros dados!");
        }
      }

      await updateProfile({
        ct_name: ctName,
        logo_url: logoUrl,
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

  const hasLogo = !!logoPreview;
  const isNewLogoSelected = !!logoFile;
  const isBusy = isUpdatingProfile || isUploadingLogo || isDeletingLogo;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-6 md:py-8 space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-display font-bold">Configurações do {labels.ctLabelShort}</h1>
          <p className="text-muted-foreground mt-1">Gerencie as informações da sua conta e do seu {labels.ctLabel}.</p>
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
                    onClick={async () => {
                      setSelectedBusinessType(option.type);
                      try {
                        await updateProfile({ business_type: option.type });
                        toast.success(`Tipo de negócio alterado para ${option.title}!`);
                      } catch (err) {
                        toast.error('Erro ao alterar tipo de negócio.');
                      }
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
                Dados do {labels.ctLabel}
              </CardTitle>
              <CardDescription>Personalize sua experiência no Esportiz.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail da Conta (Acesso)</Label>
                <Input id="email" value={user?.email || ''} disabled className="bg-muted" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ct-name">Nome do {labels.ctLabelShort}</Label>
                <Input
                  id="ct-name"
                  placeholder={`Ex: ${labels.ctLabel} Exemplo`}
                  value={ctName}
                  onChange={(e) => setCtName(e.target.value)}
                />
              </div>

              {/* Logo Section */}
              <div className="space-y-3">
                <Label>Logo do CT (Opcional)</Label>
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
                              <AlertDialogTitle>Remover logo do CT?</AlertDialogTitle>
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
                  <CardDescription>Sincronize {labels.trainingLabel.toLowerCase()} e {labels.studentLabel.toLowerCase()} automaticamente.</CardDescription>
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
                  Adicione {labels.studentLabel.toLowerCase()} pelo e-mail no Google Agenda e eles serão registrados aqui.
                </p>
                <div className="flex justify-end gap-2">
                  {profile?.google_access_token && (
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        const tid = toast.loading(`Sincronizando ${labels.studentLabel.toLowerCase()}...`);
                        try {
                          const { data, error } = await supabase.functions.invoke('google-sync', {
                            body: { user_id: user?.id }
                          });
                          if (error) throw error;
                          toast.success(`${data.count} contatos analisados e sincronizados!`, { id: tid });
                        } catch (err: any) {
                          toast.error('Erro na sincronização: ' + err.message, { id: tid });
                        }
                      }}
                    >
                      Sincronizar {labels.studentLabel} Agora
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
    </div>
  );
}

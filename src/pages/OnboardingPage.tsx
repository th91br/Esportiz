import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfile, type BusinessType } from '@/hooks/queries/useProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Logo } from '@/components/Logo';
import { toast } from 'sonner';
import { UploadCloud, CheckCircle, ArrowRight, Volleyball, Landmark, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';

const BUSINESS_OPTIONS: { type: BusinessType; icon: typeof Volleyball; title: string; description: string; emoji: string }[] = [
  {
    type: 'sport_school',
    icon: Volleyball,
    title: 'Escola de Esportes',
    description: 'Futevôlei, Vôlei, Beach Tennis, Futebol, Artes Marciais...',
    emoji: '🏐',
  },
  {
    type: 'arena',
    icon: Landmark,
    title: 'Arena / CT de Locação',
    description: 'Locação de quadras, Day Use, Eventos esportivos...',
    emoji: '🏟️',
  },
  {
    type: 'other',
    icon: GraduationCap,
    title: 'Escola / Outros',
    description: 'Idiomas, Música, Cursos livres, Dança...',
    emoji: '📚',
  },
];

export default function OnboardingPage() {
  const { updateProfile, uploadLogo, isUpdatingProfile, isUploadingLogo } = useProfile();
  const navigate = useNavigate();
  
  const [step, setStep] = useState(1);
  const [ctName, setCtName] = useState('');
  const [businessType, setBusinessType] = useState<BusinessType>('sport_school');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const totalSteps = 3;

  const handleNextStep = () => {
    if (step === 1) {
      if (!ctName.trim()) {
        toast.error('Por favor, informe o nome do seu negócio.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      setStep(3);
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

  const handleComplete = async () => {
    try {
      let logoUrl = null;
      if (logoFile) {
        logoUrl = await uploadLogo(logoFile);
      }

      await updateProfile({
        ct_name: ctName,
        logo_url: logoUrl,
        business_type: businessType,
        onboarding_completed: true,
      });

      toast.success('Configuração concluída com sucesso!');
      navigate('/');
    } catch (error) {
      console.error(error);
      toast.error('Ocorreu um erro ao finalizar a configuração.');
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 1: return 'Bem-vindo ao Esportiz!';
      case 2: return 'Qual é o seu negócio?';
      case 3: return 'Adicione sua logo';
      default: return '';
    }
  };

  const getStepDescription = () => {
    switch (step) {
      case 1: return 'Para começarmos, qual é o nome do seu negócio?';
      case 2: return 'Escolha o tipo que melhor representa sua atividade. O sistema se adaptará automaticamente.';
      case 3: return 'Personalize o sistema com a marca do seu negócio (opcional)';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="absolute top-8 left-8">
        <Logo size="lg" />
      </div>

      <Card className="w-full max-w-md animate-fade-up shadow-xl border-primary/10">
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Etapa {step} de {totalSteps}</span>
            <div className="flex gap-1">
              {Array.from({ length: totalSteps }, (_, i) => (
                <div
                  key={i}
                  className={`h-1.5 w-6 rounded-full transition-colors duration-300 ${step >= i + 1 ? 'bg-primary' : 'bg-muted'}`}
                />
              ))}
            </div>
          </div>
          
          <CardTitle className="text-2xl font-display">
            {getStepTitle()}
          </CardTitle>
          <CardDescription className="text-base">
            {getStepDescription()}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4">
          {step === 1 ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ct-name">Nome do Negócio</Label>
                <Input
                  id="ct-name"
                  placeholder="Ex: CT Futuro Craque, Arena Beach Park..."
                  value={ctName}
                  onChange={(e) => setCtName(e.target.value)}
                  className="h-12 text-lg"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleNextStep()}
                />
              </div>
            </div>
          ) : step === 2 ? (
            <div className="space-y-3">
              {BUSINESS_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isSelected = businessType === option.type;
                return (
                  <button
                    key={option.type}
                    onClick={() => setBusinessType(option.type)}
                    className={cn(
                      'w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200 text-left group',
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
                        : 'border-border hover:border-primary/40 hover:bg-muted/50'
                    )}
                  >
                    <div className={cn(
                      'flex items-center justify-center h-12 w-12 rounded-xl text-2xl shrink-0 transition-all',
                      isSelected ? 'bg-primary/10 scale-110' : 'bg-muted group-hover:bg-primary/5'
                    )}>
                      {option.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        'font-semibold text-sm transition-colors',
                        isSelected ? 'text-primary' : 'text-foreground'
                      )}>
                        {option.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {option.description}
                      </p>
                    </div>
                    <div className={cn(
                      'h-5 w-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all',
                      isSelected
                        ? 'border-primary bg-primary'
                        : 'border-muted-foreground/30'
                    )}>
                      {isSelected && (
                        <CheckCircle className="h-3 w-3 text-primary-foreground" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : step === 3 ? (
            <div className="space-y-6">
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded-xl p-8 transition-colors hover:border-primary/50 bg-muted/10">
                {logoPreview ? (
                  <div className="relative group">
                    <img src={logoPreview} alt="Preview" className="h-32 w-32 object-contain rounded-lg" />
                    <button 
                      onClick={() => { setLogoFile(null); setLogoPreview(null); }}
                      className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 shadow-md hover:bg-destructive/90"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center cursor-pointer w-full text-center">
                    <div className="bg-primary/10 p-4 rounded-full text-primary mb-4">
                      <UploadCloud className="h-8 w-8" />
                    </div>
                    <span className="text-sm font-medium">Clique para fazer upload</span>
                    <span className="text-xs text-muted-foreground mt-1">PNG, JPG ou WEBP (Max 2MB)</span>
                    <input type="file" className="hidden" accept="image/*" onChange={handleLogoChange} />
                  </label>
                )}
              </div>
            </div>
          ) : null}
        </CardContent>

        <CardFooter className="pt-2 flex justify-between">
          {step > 1 && (
            <Button variant="ghost" onClick={() => setStep(step - 1)} disabled={isUpdatingProfile || isUploadingLogo}>
              Voltar
            </Button>
          )}
          
          <div className={`flex gap-3 ${step === 1 ? 'w-full' : 'ml-auto'}`}>
            {step < totalSteps ? (
              <Button onClick={handleNextStep} className="w-full h-11 text-base btn-primary-gradient" disabled={step === 1 && !ctName.trim()}>
                Continuar
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={handleComplete} disabled={isUpdatingProfile || isUploadingLogo}>
                  Pular
                </Button>
                <Button onClick={handleComplete} className="btn-primary-gradient" disabled={isUpdatingProfile || isUploadingLogo}>
                  {isUpdatingProfile || isUploadingLogo ? 'Salvando...' : (
                    <>Concluir <CheckCircle className="ml-2 h-4 w-4" /></>
                  )}
                </Button>
              </>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

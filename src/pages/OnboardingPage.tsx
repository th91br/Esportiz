import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '@/hooks/queries/useProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Logo } from '@/components/Logo';
import { toast } from 'sonner';
import { UploadCloud, CheckCircle, ArrowRight } from 'lucide-react';

export default function OnboardingPage() {
  const { updateProfile, uploadLogo, isUpdatingProfile, isUploadingLogo } = useProfile();
  const navigate = useNavigate();
  
  const [step, setStep] = useState(1);
  const [ctName, setCtName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#1DB874');
  const [secondaryColor, setSecondaryColor] = useState('#0A1628');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const handleNextStep = () => {
    if (step === 1) {
      if (!ctName.trim()) {
        toast.error('Por favor, informe o nome do seu CT.');
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
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        onboarding_completed: true,
      });

      toast.success('Configuração concluída com sucesso!');
      navigate('/');
    } catch (error) {
      console.error(error);
      toast.error('Ocorreu um erro ao finalizar a configuração.');
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
            <span className="text-sm font-medium text-muted-foreground">Etapa {step} de 3</span>
            <div className="flex gap-1">
              <div className={`h-1.5 w-6 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-muted'}`} />
              <div className={`h-1.5 w-6 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
              <div className={`h-1.5 w-6 rounded-full ${step >= 3 ? 'bg-primary' : 'bg-muted'}`} />
            </div>
          </div>
          
          <CardTitle className="text-2xl font-display">
            {step === 1 ? 'Bem-vindo ao Esportiz!' : step === 2 ? 'Adicione sua logo' : 'Escolha suas cores'}
          </CardTitle>
          <CardDescription className="text-base">
            {step === 1 
              ? 'Para começarmos, qual é o nome do seu Centro de Treinamento?' 
              : step === 2
                ? 'Personalize o sistema com a marca do seu CT (opcional)'
                : 'Defina as cores que representam sua marca'}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4">
          {step === 1 ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ct-name">Nome do CT</Label>
                <Input
                  id="ct-name"
                  placeholder="Ex: CT Futuro Craque"
                  value={ctName}
                  onChange={(e) => setCtName(e.target.value)}
                  className="h-12 text-lg"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleNextStep()}
                />
              </div>
            </div>
          ) : step === 2 ? (
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
          ) : (
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cor Primária</Label>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded border shadow-sm" style={{ backgroundColor: primaryColor }} />
                      <Input 
                        type="color" 
                        value={primaryColor} 
                        onChange={(e) => setPrimaryColor(e.target.value)} 
                        className="h-10 cursor-pointer"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Cor Secundária</Label>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded border shadow-sm" style={{ backgroundColor: secondaryColor }} />
                      <Input 
                        type="color" 
                        value={secondaryColor} 
                        onChange={(e) => setSecondaryColor(e.target.value)} 
                        className="h-10 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
                <div className="p-4 rounded-lg border bg-primary/5 border-primary/20">
                  <p className="text-sm text-center font-medium">
                    Veja como ficará o seu sistema!
                  </p>
                  <div className="mt-3 flex justify-center gap-2">
                    <div className="h-8 w-20 rounded shadow-sm flex items-center justify-center text-[10px] text-white font-bold" style={{ backgroundColor: primaryColor }}>
                      BOTAO
                    </div>
                    <div className="h-8 w-20 rounded shadow-sm flex items-center justify-center text-[10px] text-white font-bold" style={{ backgroundColor: secondaryColor }}>
                      MENU
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="pt-2 flex justify-between">
          {step > 1 && (
            <Button variant="ghost" onClick={() => setStep(step - 1)} disabled={isUpdatingProfile || isUploadingLogo}>
              Voltar
            </Button>
          )}
          
          <div className={`flex gap-3 ${step === 1 ? 'w-full' : 'ml-auto'}`}>
            {step < 3 ? (
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

import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function EnrollmentUnavailablePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md border-border/80 card-elevated">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <ShieldOff className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl font-bold font-display text-foreground">
            Inscrição pública indisponível
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-sm leading-6 text-muted-foreground">
            Este link público não está ativo. Para cadastrar alunos no Sportiz Sport,
            utilize o painel administrativo ou fale diretamente com a secretaria.
          </p>
        </CardContent>
        <CardFooter>
          <Button className="w-full btn-primary-gradient" onClick={() => navigate('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao Esportiz
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Home, ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.warn("404: Rota não encontrada:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background elements for premium feel */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="max-w-md w-full text-center space-y-8 animate-fade-up">
        <div className="relative inline-block">
          <div className="bg-primary/10 p-6 rounded-3xl mb-4">
            <Search className="h-16 w-16 text-primary animate-pulse" />
          </div>
          <span className="absolute -top-2 -right-2 bg-destructive text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
            Erro 404
          </span>
        </div>
        
        <div className="space-y-3">
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground font-display">Página perdida?</h1>
          <p className="text-muted-foreground text-lg">
            Parece que o caminho que você tentou acessar não existe ou foi movido.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          <Button asChild variant="outline" className="w-full sm:w-auto rounded-xl">
            <Link to="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao Início
            </Link>
          </Button>
          <Button asChild className="w-full sm:w-auto rounded-xl btn-primary-gradient">
            <Link to="/dashboard">
              <Home className="mr-2 h-4 w-4" />
              Ir para o Dashboard
            </Link>
          </Button>
        </div>

        <p className="text-xs text-muted-foreground/60 pt-8">
          Tentativa de acesso em: <code className="bg-muted px-1.5 py-0.5 rounded">{location.pathname}</code>
        </p>
      </div>
    </div>
  );
};

export default NotFound;

import { useRegisterSW } from "virtual:pwa-register/react";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { toast } from "sonner";
import { RefreshCw, X, DownloadCloud } from "lucide-react";

export function PWABadge() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, r) {
      if (r) {
        // Checar por atualizações a cada 1 hora (60 * 60 * 1000 ms)
        setInterval(() => {
          if (!(!r.installing && navigator)) return;
          if (('connection' in navigator) && !navigator.onLine) return;
          r.update().catch(err => console.error("SW update error", err));
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error("SW registration error", error);
    },
  });

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  useEffect(() => {
    if (offlineReady) {
      toast.success("App pronto para funcionar offline.", {
        action: {
          label: "OK",
          onClick: close,
        },
      });
    }
  }, [offlineReady]);

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 sm:bottom-6 sm:right-6 sm:left-auto sm:w-[400px] z-[100] animate-in slide-in-from-bottom-8 fade-in duration-500">
      <div className="m-4 sm:m-0 bg-background/90 backdrop-blur-xl border border-primary/20 shadow-2xl rounded-2xl p-5 overflow-hidden relative">
        {/* Linha colorida no topo */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-accent"></div>
        
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
            <DownloadCloud className="h-6 w-6 text-primary" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-bold text-lg leading-tight mb-1">Nova Atualização!</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Uma nova versão do Esportiz, mais rápida e com melhorias, acabou de chegar. Atualize para sincronizar.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <Button 
                onClick={() => updateServiceWorker(true)} 
                className="w-full sm:flex-1 btn-primary-gradient gap-2 shadow-lg hover:shadow-primary/20"
              >
                <RefreshCw className="h-4 w-4" />
                Atualizar Agora
              </Button>
              <Button 
                variant="ghost" 
                onClick={close}
                className="w-full sm:w-auto px-3"
              >
                Depois
              </Button>
            </div>
          </div>
          
          <button onClick={close} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors p-1">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

import { useRegisterSW } from "virtual:pwa-register/react";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { toast } from "sonner";

export function PWABadge() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
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
    } else if (needRefresh) {
      toast("Nova atualização disponível!", {
        description: "Clique em recarregar para atualizar.",
        action: {
          label: "Recarregar",
          onClick: () => updateServiceWorker(true),
        },
        cancel: {
          label: "Fechar",
          onClick: close,
        },
        duration: Infinity,
      });
    }
  }, [offlineReady, needRefresh, updateServiceWorker]);

  return null;
}

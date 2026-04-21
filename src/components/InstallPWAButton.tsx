import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { EsportizIcon } from "@/components/Logo";
import { toast } from "sonner";

export function InstallPWAButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    // Check if device is iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    
    // Check if already installed (standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                        ('standalone' in window.navigator && (window.navigator as any).standalone);

    if (isIosDevice && !isStandalone) {
      setIsIos(true);
      setIsInstallable(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Optionally check if already installed
    window.addEventListener("appinstalled", () => {
      setIsInstallable(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIos) {
      toast.info("Para instalar no iPhone:", {
        description: "Toque no botão 'Compartilhar' (quadrado com seta para cima) na barra inferior e depois em 'Adicionar à Tela de Início'.",
        duration: 8000,
      });
      return;
    }

    if (!deferredPrompt) {
      toast.info("Instruções de Instalação", {
        description: "Acesse as configurações do seu navegador e procure por 'Adicionar à Tela Inicial' ou 'Instalar Aplicativo'.",
        duration: 8000,
      });
      return;
    }

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      setIsInstallable(false);
    }
    
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
  };

  // If we are not installable and it's not iOS, don't show the button.
  // Wait, actually let's ALWAYS show it if we are not standalone, just so users can click it and get instructions.
  // Many browsers block beforeinstallprompt until certain heuristics are met.
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  if (isStandalone) return null;

  return (
    <Button 
      onClick={handleInstallClick} 
      className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-full font-medium"
      size="sm"
    >
      <EsportizIcon size={16} variant="light" />
      Baixar App
    </Button>
  );
}

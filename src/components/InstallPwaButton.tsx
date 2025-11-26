"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Extende a interface de Event para incluir as propriedades do BeforeInstallPromptEvent
interface CustomBeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function InstallPwaButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<CustomBeforeInstallPromptEvent | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Previne que o Chrome 67 e anteriores mostrem o prompt automaticamente
      e.preventDefault();
      // Guarda o evento para que possa ser acionado mais tarde.
      setDeferredPrompt(e as CustomBeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Limpeza do listener quando o componente é desmontado
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }
    // Mostra o prompt de instalação
    deferredPrompt.prompt();
    // Espera o usuário responder ao prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
        toast({
            title: "Aplicação Instalada!",
            description: "O Agenda Alego foi adicionado à sua tela inicial.",
        });
    } else {
         console.log('User dismissed the install prompt');
    }

    // O prompt só pode ser usado uma vez. Limpamos o estado.
    setDeferredPrompt(null);
  };

  if (!deferredPrompt) {
    return null;
  }

  return (
    <Button
      variant="outline"
      onClick={handleInstallClick}
    >
      <Download className="mr-2 h-4 w-4" />
      Instalar App
    </Button>
  );
}

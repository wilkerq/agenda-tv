"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";
import { useState, useEffect } from "react";

export default function SettingsPage() {
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Note: This is NOT secure for production.
    // API keys should be managed on a server and not exposed client-side.
    // This is for demonstration purposes only.
    const storedKey = localStorage.getItem("OPENAI_API_KEY");
    if (storedKey) {
      setApiKey(storedKey);
    }
  }, []);


  const handleSave = async () => {
    setIsSaving(true);
    // In a real app, you would send this to a secure backend.
    // For this demo, we'll just use localStorage.
    localStorage.setItem("OPENAI_API_KEY", apiKey);
    await new Promise(resolve => setTimeout(resolve, 500)); // Simula salvamento
    
    // We need to reload to apply the new key to the Genkit server environment
    toast({
      title: "Configurações Salvas",
      description: "Sua chave de API da OpenAI foi salva. A página será recarregada para aplicar as alterações.",
    });

    setTimeout(() => {
        window.location.reload();
    }, 2000);
    
    setIsSaving(false);
  };
  
  return (
    <div className="grid gap-6">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Configurações da OpenAI</CardTitle>
          <CardDescription>
            Gerencie sua chave de API da OpenAI. A chave é salva localmente no seu navegador e usada para todas as chamadas de IA.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="space-y-2">
            <Label htmlFor="openai-api-key">OpenAI API Key</Label>
            <Input
                id="openai-api-key"
                type="password"
                placeholder="Cole sua API Key da OpenAI aqui"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
            />
             <p className="text-sm text-muted-foreground pt-2">
                Sua chave será salva no `localStorage` do seu navegador. Para produção, considere uma abordagem mais segura.
            </p>
            </div>
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <Button onClick={handleSave} disabled={isSaving || !apiKey}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Salvar e Recarregar
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAIConfig } from "@/lib/ai-config";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";
import { useState } from "react";

// Lista de modelos Gemini disponíveis
const geminiModels = [
    { value: 'gemini-pro', label: 'Gemini Pro (Texto)' },
    { value: 'gemini-pro-vision', label: 'Gemini Pro Vision (Imagem)' },
    { value: 'gemini-1.5-flash-latest', label: 'Gemini 1.5 Flash (Rápido)' },
    { value: 'gemini-1.5-pro-latest', label: 'Gemini 1.5 Pro (Avançado)' },
];

export default function SettingsPage() {
  const [config, setConfig] = useAIConfig();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    // A configuração já é salva automaticamente pelo hook `useAIConfig` no localStorage
    await new Promise(resolve => setTimeout(resolve, 500)); // Simula um salvamento assíncrono
    toast({
      title: "Configurações Salvas",
      description: "Suas configurações de IA foram atualizadas com sucesso.",
    });
    setIsSaving(false);
  };
  
  // Assegura que o modelo selecionado seja um dos disponíveis na lista
  const currentModel = geminiModels.some(m => m.value === config.google.model) 
    ? config.google.model 
    : 'gemini-pro';

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Configurações do Provedor de IA</CardTitle>
          <CardDescription>
            Gerencie qual modelo de linguagem será usado nos recursos de IA do sistema.
            A chave de API é salva localmente no seu navegador e não é enviada para nossos servidores.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Google Gemini</CardTitle>
                <CardDescription>
                  Selecione o modelo desejado e insira sua chave de API para habilitar as funcionalidades.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="google-api-key">Gemini API Key</Label>
                  <Input
                    id="google-api-key"
                    type="password"
                    placeholder="Cole sua API Key do Google AI Studio aqui"
                    value={config.google.apiKey || ""}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        google: { ...prev.google, apiKey: e.target.value },
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="google-model">Modelo Padrão</Label>
                  <Select
                    value={currentModel}
                    onValueChange={(value) =>
                      setConfig((prev) => ({
                        ...prev,
                        google: { ...prev.google, model: value },
                      }))
                    }
                  >
                    <SelectTrigger id="google-model">
                      <SelectValue placeholder="Selecione um modelo" />
                    </SelectTrigger>
                    <SelectContent>
                       {geminiModels.map((model) => (
                           <SelectItem key={model.value} value={model.value}>
                               {model.label}
                           </SelectItem>
                       ))}
                    </SelectContent>
                  </Select>
                   <p className="text-sm text-muted-foreground pt-2">
                    Lembre-se que o modelo `gemini-pro-vision` é o único que aceita imagens. Os outros são para tarefas de texto.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Salvar Configurações
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

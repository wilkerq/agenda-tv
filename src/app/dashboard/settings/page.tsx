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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

// Lista de modelos disponíveis
const geminiModels = [
    { value: 'gemini-pro', label: 'Gemini Pro (Texto, Padrão)' },
    { value: 'gemini-1.5-flash-latest', label: 'Gemini 1.5 Flash (Rápido)' },
    { value: 'gemini-1.5-pro-latest', label: 'Gemini 1.5 Pro (Avançado)' },
];

const openAIModels = [
    { value: 'gpt-4o', label: 'GPT-4o (Mais Recente)' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (Econômico)' },
]

export default function SettingsPage() {
  const [config, setConfig] = useAIConfig();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500)); // Simula salvamento
    toast({
      title: "Configurações Salvas",
      description: "Suas configurações de IA foram atualizadas com sucesso.",
    });
    setIsSaving(false);
  };
  
  const currentProvider = config.provider || 'google';

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Configurações do Provedor de IA</CardTitle>
          <CardDescription>
            Gerencie qual provedor e modelo de linguagem será usado nos recursos de IA do sistema.
            As chaves de API são salvas localmente no seu navegador.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div>
                 <Label className="text-base">Provedor de IA</Label>
                 <RadioGroup
                    value={currentProvider}
                    onValueChange={(value) => {
                        if (value === 'google' || value === 'openai') {
                            setConfig(prev => ({...prev, provider: value}))
                        }
                    }}
                    className="grid sm:grid-cols-2 gap-4 mt-2"
                >
                    <div>
                        <RadioGroupItem value="google" id="google" className="peer sr-only" />
                        <Label htmlFor="google" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                            Google Gemini
                        </Label>
                    </div>
                     <div>
                        <RadioGroupItem value="openai" id="openai" className="peer sr-only" />
                        <Label htmlFor="openai" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                           OpenAI
                        </Label>
                    </div>
                </RadioGroup>
            </div>

            {currentProvider === 'google' && (
                <Card>
                    <CardHeader>
                        <CardTitle>Google Gemini</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                        <Label htmlFor="google-api-key">Gemini API Key</Label>
                        <Input
                            id="google-api-key"
                            type="password"
                            placeholder="Cole sua API Key do Google AI Studio aqui"
                            value={config.google?.apiKey || ""}
                            onChange={(e) =>
                            setConfig((prev) => ({
                                ...prev,
                                google: { ...prev.google, apiKey: e.target.value },
                            }))
                            }
                        />
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="google-model">Modelo de Texto</Label>
                        <Select
                            value={config.google?.model || 'gemini-pro'}
                            onValueChange={(value) =>
                            setConfig((prev) => ({
                                ...prev,
                                google: { ...prev.google, model: value },
                            }))
                            }
                        >
                            <SelectTrigger id="google-model">
                            <SelectValue placeholder="Selecione um modelo Gemini" />
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
                            O modelo 'Gemini Pro Vision' será usado automaticamente para tarefas de imagem.
                        </p>
                        </div>
                    </CardContent>
                </Card>
            )}

             {currentProvider === 'openai' && (
                <Card>
                    <CardHeader>
                        <CardTitle>OpenAI</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                        <Label htmlFor="openai-api-key">OpenAI API Key</Label>
                        <Input
                            id="openai-api-key"
                            type="password"
                            placeholder="Cole sua API Key da OpenAI aqui"
                            value={config.openai?.apiKey || ""}
                            onChange={(e) =>
                            setConfig((prev) => ({
                                ...prev,
                                openai: { ...prev.openai, apiKey: e.target.value },
                            }))
                            }
                        />
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="openai-model">Modelo</Label>
                        <Select
                            value={config.openai?.model || 'gpt-4o'}
                            onValueChange={(value) =>
                            setConfig((prev) => ({
                                ...prev,
                                openai: { ...prev.openai, model: value },
                            }))
                            }
                        >
                            <SelectTrigger id="openai-model">
                            <SelectValue placeholder="Selecione um modelo OpenAI" />
                            </SelectTrigger>
                            <SelectContent>
                            {openAIModels.map((model) => (
                                <SelectItem key={model.value} value={model.value}>
                                    {model.label}
                                </SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                        </div>
                    </CardContent>
                </Card>
            )}
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

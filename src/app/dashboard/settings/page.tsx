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
import { AIConfig } from "@/lib/types";

export default function SettingsPage() {
  const [config, setConfig] = useAIConfig();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  // Since we only have one provider now, we can simplify this.
  const activeProvider: AIConfig['provider'] = 'google';

  const handleSave = async () => {
    setIsSaving(true);
    // The useAIConfig hook handles saving to localStorage automatically.
    // We just need to show a toast.
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate async save
    toast({
      title: "Configurações Salvas",
      description: "Suas configurações de IA foram atualizadas com sucesso.",
    });
    setIsSaving(false);
  };

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Configurações do Provedor de IA</CardTitle>
          <CardDescription>
            Gerencie qual modelo de linguagem será usado nos recursos de IA do
            sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Google Gemini</CardTitle>
                <CardDescription>
                  Configure os modelos do Google. É necessário uma API Key para
                  usar.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="google-api-key">Gemini API Key</Label>
                  <Input
                    id="google-api-key"
                    type="password"
                    placeholder="Cole sua API Key aqui"
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
                  <Label htmlFor="google-model">Modelo</Label>
                  <Select
                    value={config.google.model || "gemini-1.5-flash-latest"}
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
                      <SelectItem value="gemini-1.5-flash-latest">
                        Gemini 1.5 Flash (Recomendado)
                      </SelectItem>
                      <SelectItem value="gemini-1.0-pro">Gemini 1.0 Pro</SelectItem>
                      <SelectItem value="gemini-pro">Gemini Pro (Legacy)</SelectItem>
                    </SelectContent>
                  </Select>
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

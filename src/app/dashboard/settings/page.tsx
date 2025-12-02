
"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Users, History, UserPlus, Tv, Home, Wrench, Sparkles, BrainCircuit, Bug } from "lucide-react";
import { useAtom } from "jotai";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { OperationMode } from "@/lib/state";
import { atomWithStorage, createJSONStorage } from 'jotai/utils';
import { cn } from "@/lib/utils";

const settingsLinks = [
  {
    href: "/dashboard/operators",
    title: "Gerenciar Pessoal",
    description: "Adicione, edite ou remova operadores, repórteres e produtores.",
    icon: Users,
    isInternal: true,
  },
   {
    href: "/dashboard/users",
    title: "Gerenciar Usuários",
    description: "Adicione, edite ou remova usuários do painel administrativo.",
    icon: UserPlus,
    isInternal: true,
  },
  {
    href: "/dashboard/tv-settings",
    title: "Configurações da TV",
    description: "Gerencie o nome, endereço e logo para os relatórios.",
    icon: Wrench,
    isInternal: true,
  },
  {
    href: "/dashboard/logs",
    title: "Logs de Auditoria",
    description: "Visualize todas as ações realizadas no sistema.",
    icon: History,
    isInternal: true,
  },
    {
    href: "/dashboard/debug",
    title: "Debug",
    description: "Verifique variáveis de ambiente e o estado do servidor.",
    icon: Bug,
    isInternal: true,
  },
  {
    href: "/",
    title: "Página Pública",
    description: "Acesse a visualização do calendário público de eventos.",
    icon: Home,
    isInternal: false,
  },
  {
    href: "/panel",
    title: "Painel de TV",
    description: "Acesse a visualização da agenda da semana para as TVs.",
    icon: Tv,
    isInternal: false,
  },
];

// Client-side atom with localStorage persistence
export const operationModeAtom = atomWithStorage<OperationMode>(
    'operationMode', // Key for localStorage
    'logic',         // Default value
    createJSONStorage(() => localStorage)
);


export default function SettingsPage() {
  const [operationMode, setOperationMode] = useAtom(operationModeAtom);

  const handleModeChange = (checked: boolean) => {
    const newMode = checked ? 'ai' : 'logic';
    // Update client-side state, which is persisted to localStorage
    setOperationMode(newMode);
  };


  return (
    <div className="space-y-6">
      <CardHeader className="p-0">
        <CardTitle>Configurações</CardTitle>
        <CardDescription>
          Gerencie as configurações e funcionalidades administrativas do sistema.
        </CardDescription>
      </CardHeader>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Modo de Operação
          </CardTitle>
          <CardDescription>
            Escolha se as operações como sugestão de equipe e resumo de relatórios devem usar Inteligência Artificial ou a lógica programada padrão. O modo "Lógica Padrão" é o recomendado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 rounded-md border p-4 transition-colors">
            <div className={cn(
                "flex-1 flex items-center gap-3 transition-opacity",
                operationMode === 'logic' ? 'opacity-100' : 'opacity-50'
              )}>
              <BrainCircuit className={cn("h-6 w-6", operationMode === 'logic' && 'text-primary')} />
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">
                  Lógica Padrão (Recomendado)
                </p>
                <p className="text-sm text-muted-foreground">
                  Operações rápidas e previsíveis baseadas em regras.
                </p>
              </div>
            </div>

            <Switch
              checked={operationMode === 'ai'}
              onCheckedChange={handleModeChange}
              aria-readonly
            />

            <div className={cn(
                "flex-1 flex items-center justify-end gap-3 text-right transition-opacity",
                operationMode === 'ai' ? 'opacity-100' : 'opacity-50'
              )}>
               <div className="space-y-1">
                 <p className="text-sm font-medium leading-none">
                  Inteligência Artificial
                </p>
                <p className="text-sm text-muted-foreground">
                  Respostas dinâmicas (pode ser mais lento/caro).
                </p>
              </div>
               <Sparkles className={cn("h-6 w-6", operationMode === 'ai' && 'text-primary')} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {settingsLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Card key={link.href}>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <Icon className="h-8 w-8 text-primary" />
                  <CardTitle>{link.title}</CardTitle>
                </div>
                <CardDescription>{link.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href={link.href} target={link.isInternal ? '_self' : '_blank'}>
                  <Button variant="outline" className="w-full">
                    Acessar <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

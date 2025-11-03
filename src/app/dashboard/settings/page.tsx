
"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Users, History, UserPlus, Tv, Home, Wrench, Sparkles, BrainCircuit } from "lucide-react";
import { useAtom } from "jotai";
import { operationModeAtom } from "@/lib/state";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const settingsLinks = [
  {
    href: "/dashboard/operators",
    title: "Gerenciar Pessoal",
    description: "Adicione, edite ou remova operadores, repórteres e produtores.",
    icon: Users,
    isInternal: true,
  },
  {
    href: "/dashboard/users/create",
    title: "Criar Usuários",
    description: "Adicione novos usuários com permissão para acessar o painel administrativo.",
    icon: UserPlus,
    isInternal: true,
  },
  {
    href: "/dashboard/logs",
    title: "Logs de Auditoria",
    description: "Visualize o histórico de todas as alterações feitas no sistema.",
    icon: History,
    isInternal: true,
  },
    {
    href: "/dashboard/debug",
    title: "Depuração de Ambiente",
    description: "Verifique as variáveis de ambiente do servidor.",
    icon: Wrench,
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

export default function SettingsPage() {
  const [operationMode, setOperationMode] = useAtom(operationModeAtom);

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
            Escolha se as operações como sugestão de equipe e resumo de relatórios devem usar Inteligência Artificial ou a lógica programada padrão.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 rounded-md border p-4">
            <BrainCircuit className="h-6 w-6 text-muted-foreground" />
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium leading-none">
                Usar Lógica Padrão
              </p>
              <p className="text-sm text-muted-foreground">
                Operações rápidas e previsíveis baseadas em regras fixas.
              </p>
            </div>
            <Switch
              checked={operationMode === 'ai'}
              onCheckedChange={(checked) => setOperationMode(checked ? 'ai' : 'logic')}
              aria-readonly
            />
            <div className="flex-1 space-y-1 text-right">
               <p className="text-sm font-medium leading-none">
                Usar Inteligência Artificial
              </p>
              <p className="text-sm text-muted-foreground">
                Respostas mais dinâmicas e inteligentes, mas pode ser mais lento.
              </p>
            </div>
             <Sparkles className="h-6 w-6 text-muted-foreground" />
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

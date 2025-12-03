
"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Users, History, UserPlus, Tv, Home, Wrench, Sparkles, BrainCircuit, Bug } from "lucide-react";

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

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <CardHeader className="p-0">
        <CardTitle>Configurações</CardTitle>
        <CardDescription>
          Gerencie as configurações e funcionalidades administrativas do sistema.
        </CardDescription>
      </CardHeader>
      
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

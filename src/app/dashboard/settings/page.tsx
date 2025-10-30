
"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Users, History, UserPlus, Tv, Home } from "lucide-react";

const settingsLinks = [
  {
    href: "/dashboard/operators",
    title: "Gerenciar Pessoal",
    description: "Adicione, edite ou remova operadores, repórteres e produtores.",
    icon: Users,
  },
  {
    href: "/dashboard/users/create",
    title: "Criar Usuários",
    description: "Adicione novos usuários com permissão para acessar o painel administrativo.",
    icon: UserPlus,
  },
  {
    href: "/dashboard/logs",
    title: "Logs de Auditoria",
    description: "Visualize o histórico de todas as alterações feitas no sistema.",
    icon: History,
  },
  {
    href: "/",
    title: "Página Pública",
    description: "Acesse a visualização do calendário público de eventos.",
    icon: Home,
  },
  {
    href: "/panel",
    title: "Painel de TV",
    description: "Acesse a visualização da agenda da semana para as TVs.",
    icon: Tv,
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
                <Link href={link.href} target={link.href.startsWith('/') ? '_blank' : '_self'}>
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

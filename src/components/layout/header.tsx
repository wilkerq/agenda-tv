"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Package2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "../theme-toggle";
import { InstallPwaButton } from "../InstallPwaButton";

export function Header() {
  const router = useRouter();

  return (
    <header className="bg-slate-900 text-white shadow-md">
      <div className="container mx-auto flex h-20 items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <Package2 className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight">Agenda Alego</h1>
            <p className="hidden sm:block text-sm text-slate-400">
              Sistema de gerenciamento de eventos
            </p>
          </div>
        </Link>
        <nav className="flex items-center gap-4">
           <InstallPwaButton />
           <ThemeToggle />
           <Button 
            variant="default"
            onClick={() => router.push('/login')}
          >
            Acesso Restrito
          </Button>
        </nav>
      </div>
    </header>
  );
}

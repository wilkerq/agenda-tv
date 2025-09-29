
"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Calendar,
  CircleUser,
  LineChart,
  Menu,
  Package2,
  LogOut,
  LayoutDashboard,
  Home,
  Share2,
  ListTodo,
  Import,
  Users,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, VisuallyHidden } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { getAuth, signOut, onAuthStateChanged, type User } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { app } from "@/lib/firebase";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const auth = getAuth(app);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
       if (!currentUser) {
        router.push("/login");
      }
    });
    return () => unsubscribe();
  }, [auth, router]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({
        title: "Logout realizado com sucesso!",
        description: "Você será redirecionado para a página de login.",
      });
      router.push("/login");
    } catch (error) {
      console.error("Erro ao fazer logout: ", error);
      toast({
        title: "Erro!",
        description: "Não foi possível fazer o logout.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-slate-900 text-white md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b border-slate-700 px-4 lg:h-[60px] lg:px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <Package2 className="h-6 w-6" />
              <span className="">Agenda Alego</span>
            </Link>
          </div>
          <div className="flex-1">
            <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
               <Link
                href="/"
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-slate-300 transition-all hover:text-white hover:bg-slate-700"
                )}
              >
                <Home className="h-4 w-4" />
                Página Pública
              </Link>
              <Link
                href="/dashboard"
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-slate-300 transition-all hover:text-white hover:bg-slate-700",
                  pathname === "/dashboard" && "bg-slate-700 text-white"
                )}
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
              <Link
                href="/dashboard/operators"
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-slate-300 transition-all hover:text-white hover:bg-slate-700",
                  pathname === "/dashboard/operators" && "bg-slate-700 text-white"
                )}
              >
                <Users className="h-4 w-4" />
                Gerenciar Operadores
              </Link>
              <Link
                href="/dashboard/reports"
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-slate-300 transition-all hover:text-white hover:bg-slate-700",
                  pathname === "/dashboard/reports" && "bg-slate-700 text-white"
                )}
              >
                <LineChart className="h-4 w-4" />
                Relatórios
              </Link>
              <Link
                href="/dashboard/share"
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-slate-300 transition-all hover:text-white hover:bg-slate-700",
                  pathname === "/dashboard/share" && "bg-slate-700 text-white"
                )}
              >
                <Share2 className="h-4 w-4" />
                Compartilhar Agenda
              </Link>
              <Link
                href="/dashboard/daily-agenda"
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-slate-300 transition-all hover:text-white hover:bg-slate-700",
                  pathname === "/dashboard/daily-agenda" && "bg-slate-700 text-white"
                )}
              >
                <ListTodo className="h-4 w-4" />
                Pauta do Dia
              </Link>
              <Link
                href="/dashboard/import"
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-slate-300 transition-all hover:text-white hover:bg-slate-700",
                  pathname === "/dashboard/import" && "bg-slate-700 text-white"
                )}
              >
                <Import className="h-4 w-4" />
                Importar Agenda
              </Link>
            </nav>
          </div>
          <div className="mt-auto p-4">
            <Button variant="destructive" className="w-full" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Encerrar Sessão
            </Button>
          </div>
        </div>
      </div>
      <div className="flex flex-col bg-slate-50">
        <header className="flex h-14 items-center gap-4 border-b bg-white px-4 lg:h-[60px] lg:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 md:hidden"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col bg-slate-900 text-white border-r-0">
               <SheetHeader>
                <SheetTitle>
                  <VisuallyHidden>Menu de Navegação</VisuallyHidden>
                </SheetTitle>
              </SheetHeader>
              <nav className="grid gap-2 text-lg font-medium">
                <Link
                  href="/"
                  className="flex items-center gap-2 text-lg font-semibold text-white mb-4"
                >
                  <Package2 className="h-6 w-6" />
                  <span>Agenda Alego</span>
                </Link>
                <Link
                  href="/"
                  className="mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-700"
                >
                  <Home className="h-5 w-5" />
                  Página Pública
                </Link>
                <Link
                  href="/dashboard"
                  className={cn(
                    "mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-700",
                    pathname === "/dashboard" && "bg-slate-700 text-white"
                  )}
                >
                  <LayoutDashboard className="h-5 w-5" />
                  Dashboard
                </Link>
                 <Link
                  href="/dashboard/operators"
                  className={cn(
                    "mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-700",
                    pathname === "/dashboard/operators" && "bg-slate-700 text-white"
                  )}
                >
                  <Users className="h-5 w-5" />
                  Gerenciar Operadores
                </Link>
                <Link
                  href="/dashboard/reports"
                  className={cn(
                    "mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-700",
                    pathname === "/dashboard/reports" && "bg-slate-700 text-white"
                  )}
                >
                  <LineChart className="h-5 w-5" />
                  Relatórios
                </Link>
                <Link
                  href="/dashboard/share"
                  className={cn(
                    "mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-700",
                     pathname === "/dashboard/share" && "bg-slate-700 text-white"
                  )}
                >
                  <Share2 className="h-5 w-5" />
                  Compartilhar Agenda
                </Link>
                 <Link
                  href="/dashboard/daily-agenda"
                  className={cn(
                    "mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-700",
                     pathname === "/dashboard/daily-agenda" && "bg-slate-700 text-white"
                  )}
                >
                  <ListTodo className="h-5 w-5" />
                  Pauta do Dia
                </Link>
                <Link
                  href="/dashboard/import"
                  className={cn(
                    "mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-700",
                     pathname === "/dashboard/import" && "bg-slate-700 text-white"
                  )}
                >
                  <Import className="h-5 w-5" />
                  Importar Agenda
                </Link>
              </nav>
              <div className="mt-auto">
                <Button variant="destructive" className="w-full" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Encerrar Sessão
                </Button>
              </div>
            </SheetContent>
          </Sheet>
          <div className="w-full flex-1">
            <h1 className="text-lg font-semibold md:text-xl">Painel Administrativo</h1>
          </div>
          <Button variant="ghost" size="icon" className="rounded-full" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
            <span className="sr-only">Encerrar sessão</span>
          </Button>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

    

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
  Users,
  Tv,
  History,
  Settings,
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, VisuallyHidden, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { getAuth, signOut, type User } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme-toggle";
import { useUser } from "@/firebase";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const auth = getAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    // Se o carregamento do usuário terminou e não há usuário, redirecione
    if (!isUserLoading && !user) {
      router.push("/login");
    }
  }, [user, isUserLoading, router]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({
        title: "Logout realizado com sucesso!",
        description: "Você será redirecionado para a página de login.",
      });
      router.push("/login");
    } catch (error: any) {
      console.error("Erro ao fazer logout: ", error.message);
      toast({
        title: "Erro!",
        description: "Não foi possível fazer o logout.",
        variant: "destructive",
      });
    }
  };

  const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/reports", label: "Relatórios", icon: LineChart },
    { href: "/dashboard/share", label: "Compartilhar Agenda", icon: Share2 },
    { href: "/dashboard/daily-agenda", label: "Pauta do Dia", icon: ListTodo },
    { href: "/dashboard/settings", label: "Configurações", icon: Settings },
  ];

  const handleLinkClick = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-slate-900 text-white md:block">
        <div className="flex h-full max-h-screen flex-col">
          <div className="flex h-14 items-center border-b border-slate-700 px-4 lg:h-[60px] lg:px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <Package2 className="h-6 w-6" />
              <span className="">Agenda da TV Alego</span>
            </Link>
          </div>
          <div className="flex-1 overflow-auto py-2">
            <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
              {navLinks.map(({ href, label, icon: Icon }) => (
                 <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-slate-300 transition-all hover:text-white hover:bg-slate-700",
                    pathname === href && "bg-slate-700 text-white"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="mt-auto p-4 border-t border-slate-700">
            <Button variant="destructive" className="w-full" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Encerrar Sessão
            </Button>
          </div>
        </div>
      </div>
      <div className="flex flex-col bg-slate-50 dark:bg-slate-950">
        <header className="flex h-14 items-center gap-4 border-b bg-white dark:bg-slate-900 px-4 lg:h-[60px] lg:px-6">
          {isClient && (
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
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
              <SheetContent side="left" className="flex flex-col bg-slate-900 text-white border-r-0 p-0">
                 <SheetHeader className="p-4 border-b border-slate-700">
                   <Link
                    href="/"
                    className="flex items-center gap-2 text-lg font-semibold text-white"
                    onClick={handleLinkClick}
                  >
                    <Package2 className="h-6 w-6" />
                    <span>Agenda da TV Alego</span>
                  </Link>
                  <SheetTitle>
                    <VisuallyHidden>Menu de Navegação</VisuallyHidden>
                  </SheetTitle>
                </SheetHeader>
                <nav className="flex-1 grid gap-2 p-4 text-lg font-medium overflow-auto">
                   {navLinks.map(({ href, label, icon: Icon }) => (
                      <Link
                        key={href}
                        href={href}
                        onClick={handleLinkClick}
                        className={cn(
                          "flex items-center gap-4 rounded-xl px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-700",
                          pathname === href && "bg-slate-700 text-white"
                        )}
                      >
                        <Icon className="h-5 w-5" />
                        {label}
                      </Link>
                    ))}
                </nav>
                <div className="mt-auto p-4 border-t border-slate-700">
                  <Button variant="destructive" className="w-full" onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Encerrar Sessão
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          )}
          <div className="w-full flex-1">
            <h1 className="text-lg font-semibold md:text-xl">Painel Administrativo</h1>
          </div>
          {isClient && (
            <>
              <ThemeToggle />
              <Button variant="ghost" size="icon" className="rounded-full text-foreground hover:text-foreground/80" onClick={handleLogout}>
                <LogOut className="h-5 w-5" />
                <span className="sr-only">Encerrar sessão</span>
              </Button>
            </>
          )}
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
